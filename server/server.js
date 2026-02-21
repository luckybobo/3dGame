const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// PostgreSQL 连接池配置
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Render 需要这个配置
    }
});

// 游戏状态（内存缓存）
const gameState = {
    players: new Map(),      // 在线玩家
    blocks: new Map(),       // 方块缓存
    lastSaveTime: Date.now()
};

// 初始化数据库
async function initDatabase() {
    try {
        console.log('正在初始化数据库...');
        
        // 创建方块表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS blocks (
                id SERIAL PRIMARY KEY,
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                z INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(x, y, z)
            )
        `);

        // 创建玩家表（用于记录历史玩家）
        await pool.query(`
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY,
                player_id INTEGER NOT NULL,
                name VARCHAR(50),
                color VARCHAR(50),
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 创建索引以提高查询性能
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_blocks_coords 
            ON blocks(x, y, z)
        `);

        console.log('数据库初始化完成');
        
        // 加载所有方块到内存缓存
        await loadBlocksToCache();
        
    } catch (error) {
        console.error('数据库初始化失败:', error);
        throw error;
    }
}

// 加载所有方块到内存缓存
async function loadBlocksToCache() {
    try {
        const result = await pool.query('SELECT x, y, z, type FROM blocks');
        gameState.blocks.clear();
        
        result.rows.forEach(row => {
            const key = `${row.x},${row.y},${row.z}`;
            gameState.blocks.set(key, {
                x: row.x,
                y: row.y,
                z: row.z,
                type: row.type
            });
        });
        
        console.log(`已加载 ${gameState.blocks.size} 个方块到缓存`);
        
        // 如果没有方块，生成初始世界
        if (gameState.blocks.size === 0) {
            console.log('数据库为空，生成初始世界...');
            await generateInitialWorld();
        }
    } catch (error) {
        console.error('加载方块失败:', error);
    }
}

// 生成初始世界
async function generateInitialWorld() {
    const size = 30;
    const blocks = [];
    
    console.log('开始生成初始世界...');
    
    // 地面层
    for (let x = -size; x < size; x++) {
        for (let z = -size; z < size; z++) {
            blocks.push({
                x, y: -1, z,
                type: 'grass'
            });
        }
    }
    
    // 添加一些地形起伏
    for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * 20 - 10);
        const z = Math.floor(Math.random() * 20 - 10);
        
        for (let y = 0; y < 2; y++) {
            blocks.push({
                x, y, z,
                type: y === 1 ? 'grass' : 'dirt'
            });
        }
    }
    
    // 添加树木
    for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * 20 - 10);
        const z = Math.floor(Math.random() * 20 - 10);
        
        // 树干
        for (let y = 0; y < 4; y++) {
            blocks.push({
                x, y, z,
                type: 'wood'
            });
        }
        
        // 树叶
        const leafPositions = [
            [x, 4, z],
            [x + 1, 3, z],
            [x - 1, 3, z],
            [x, 3, z + 1],
            [x, 3, z - 1]
        ];
        
        leafPositions.forEach(([lx, ly, lz]) => {
            if (Math.random() > 0.3) {
                blocks.push({
                    x: lx, y: ly, z: lz,
                    type: 'leaf'
                });
            }
        });
    }
    
    // 测试结构
    const testBlocks = [
        { x: 5, y: 0, z: 5, type: 'brick' },
        { x: 5, y: 1, z: 5, type: 'brick' },
        { x: 5, y: 2, z: 5, type: 'brick' },
        { x: 8, y: 0, z: 8, type: 'glass' },
        { x: 8, y: 1, z: 8, type: 'glass' },
        { x: -5, y: 0, z: -5, type: 'stone' },
        { x: -5, y: 1, z: -5, type: 'stone' }
    ];
    
    testBlocks.forEach(block => blocks.push(block));
    
    // 批量插入到数据库
    const values = [];
    const valueStrings = [];
    
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        valueStrings.push(`($${i*3 + 1}, $${i*3 + 2}, $${i*3 + 3}, $${i*3 + 4})`);
        values.push(block.x, block.y, block.z, block.type);
    }
    
    try {
        await pool.query(
            `INSERT INTO blocks (x, y, z, type) VALUES ${valueStrings.join(',')} ON CONFLICT DO NOTHING`,
            values
        );
        console.log(`初始世界生成完成，插入了 ${blocks.length} 个方块`);
        
        // 重新加载缓存
        await loadBlocksToCache();
    } catch (error) {
        console.error('生成初始世界失败:', error);
    }
}

// 保存单个方块到数据库
async function saveBlockToDB(x, y, z, type) {
    try {
        await pool.query(
            `INSERT INTO blocks (x, y, z, type) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (x, y, z) DO UPDATE SET type = $4`,
            [x, y, z, type]
        );
        return true;
    } catch (error) {
        console.error('保存方块失败:', error);
        return false;
    }
}

// 从数据库删除方块
async function deleteBlockFromDB(x, y, z) {
    try {
        await pool.query(
            'DELETE FROM blocks WHERE x = $1 AND y = $2 AND z = $3',
            [x, y, z]
        );
        return true;
    } catch (error) {
        console.error('删除方块失败:', error);
        return false;
    }
}

// 保存玩家到数据库
async function savePlayerToDB(player) {
    try {
        await pool.query(
            `INSERT INTO players (player_id, name, color, last_seen) 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (id) DO UPDATE SET last_seen = CURRENT_TIMESTAMP`,
            [player.id, player.name, player.color]
        );
    } catch (error) {
        console.error('保存玩家失败:', error);
    }
}

// 初始化数据库
initDatabase().catch(console.error);

// 存储在线客户端
const clients = new Map();
let nextClientId = 1;

// 定期清理缓存（可选）
setInterval(() => {
    // 可以在这里添加缓存清理逻辑
}, 5 * 60 * 1000);

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 根路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 健康检查端点
app.get('/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT COUNT(*) FROM blocks');
        res.status(200).json({ 
            status: 'ok', 
            onlinePlayers: gameState.players.size,
            totalBlocks: parseInt(dbResult.rows[0].count),
            cachedBlocks: gameState.blocks.size,
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// WebSocket 连接处理
wss.on('connection', (ws) => {
    const clientId = nextClientId++;
    console.log(`玩家 ${clientId} 加入了游戏，当前在线: ${clients.size + 1}`);

    // 随机生成出生点
    const spawnPoint = {
        x: Math.floor(Math.random() * 10 - 5),
        y: 2,
        z: Math.floor(Math.random() * 10 - 5)
    };
    
    // 初始化玩家
    const player = {
        id: clientId,
        x: spawnPoint.x,
        y: spawnPoint.y,
        z: spawnPoint.z,
        rotation: 0,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        name: `玩家${clientId}`
    };

    clients.set(clientId, { ws, player });
    gameState.players.set(clientId, player);
    
    // 异步保存玩家到数据库
    savePlayerToDB(player);

    // 发送初始化数据
    const blocksArray = Array.from(gameState.blocks.values());
    ws.send(JSON.stringify({
        type: 'init',
        clientId: clientId,
        players: Array.from(gameState.players.values()),
        blocks: blocksArray
    }));

    // 广播新玩家加入
    broadcast({
        type: 'playerJoined',
        player: player
    }, clientId);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'playerMove':
                    const player = gameState.players.get(clientId);
                    if (player) {
                        player.x = data.x;
                        player.y = data.y;
                        player.z = data.z;
                        player.rotation = data.rotation;
                        
                        broadcast({
                            type: 'playerMoved',
                            clientId: clientId,
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            rotation: data.rotation
                        }, clientId);
                    }
                    break;
                    
                case 'placeBlock':
                    const blockKey = `${data.x},${data.y},${data.z}`;
                    if (!gameState.blocks.has(blockKey)) {
                        console.log(`玩家 ${clientId} 放置方块 at ${data.x},${data.y},${data.z} 类型: ${data.blockType}`);
                        
                        // 先保存到数据库
                        const saved = await saveBlockToDB(data.x, data.y, data.z, data.blockType);
                        
                        if (saved) {
                            // 更新缓存
                            gameState.blocks.set(blockKey, {
                                x: data.x,
                                y: data.y,
                                z: data.z,
                                type: data.blockType
                            });
                            
                            // 广播给所有客户端
                            const message = {
                                type: 'blockPlaced',
                                clientId: clientId,
                                x: data.x,
                                y: data.y,
                                z: data.z,
                                blockType: data.blockType
                            };
                            
                            clients.forEach((client) => {
                                if (client.ws.readyState === WebSocket.OPEN) {
                                    client.ws.send(JSON.stringify(message));
                                }
                            });
                        }
                    }
                    break;
                    
                case 'removeBlock':
                    const removeKey = `${data.x},${data.y},${data.z}`;
                    if (gameState.blocks.has(removeKey)) {
                        console.log(`玩家 ${clientId} 移除方块 at ${data.x},${data.y},${data.z}`);
                        
                        // 先从数据库删除
                        const deleted = await deleteBlockFromDB(data.x, data.y, data.z);
                        
                        if (deleted) {
                            // 更新缓存
                            gameState.blocks.delete(removeKey);
                            
                            // 广播给所有客户端
                            const message = {
                                type: 'blockRemoved',
                                clientId: clientId,
                                x: data.x,
                                y: data.y,
                                z: data.z
                            };
                            
                            clients.forEach((client) => {
                                if (client.ws.readyState === WebSocket.OPEN) {
                                    client.ws.send(JSON.stringify(message));
                                }
                            });
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('消息处理错误:', error);
        }
    });

    ws.on('close', () => {
        console.log(`玩家 ${clientId} 离开了游戏`);
        clients.delete(clientId);
        gameState.players.delete(clientId);
        
        broadcast({
            type: 'playerLeft',
            clientId: clientId
        });
    });
});

// 广播消息给所有客户端（除了指定的排除客户端）
function broadcast(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client, id) => {
        if (id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(messageStr);
        }
    });
}

// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('收到 SIGTERM 信号，正在关闭...');
    wss.close();
    await pool.end();
    process.exit(0);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`静态文件目录: ${path.join(__dirname, '../public')}`);
});
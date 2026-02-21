const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// 游戏状态
const gameState = {
    players: new Map(),
    blocks: new Map()
};

// 数据库相关
let useDatabase = false;
let pool = null;

// 尝试加载 pg 模块
try {
    const { Pool } = require('pg');
    if (process.env.DATABASE_URL) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 10000
        });
        useDatabase = true;
        console.log('PostgreSQL 模块加载成功，将使用数据库');
    } else {
        console.log('未设置 DATABASE_URL，使用内存存储');
    }
} catch (error) {
    console.log('PostgreSQL 模块未安装，使用内存存储');
}

// 生成世界方块数据
function generateWorldBlocks() {
    const blocks = [];
    const size = 20;
    
    console.log('生成世界方块...');
    
    // 地面层 - 确保有足够的方块
    for (let x = -size; x < size; x++) {
        for (let z = -size; z < size; z++) {
            blocks.push({
                x, y: -1, z,
                type: 'grass'
            });
        }
    }
    
    // 添加一个平台让玩家站立
    for (let x = -3; x <= 3; x++) {
        for (let z = -3; z <= 3; z++) {
            blocks.push({
                x, y: 0, z,
                type: 'stone'
            });
        }
    }
    
    // 添加一些柱子
    for (let y = 1; y <= 3; y++) {
        blocks.push({ x: 5, y, z: 5, type: 'brick' });
        blocks.push({ x: -5, y, z: -5, type: 'stone' });
        blocks.push({ x: 8, y, z: 8, type: 'wood' });
    }
    
    // 添加一些随机方块
    for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * 10 - 5);
        const z = Math.floor(Math.random() * 10 - 5);
        const y = Math.floor(Math.random() * 3);
        const types = ['grass', 'stone', 'wood', 'brick', 'glass', 'dirt'];
        const type = types[Math.floor(Math.random() * types.length)];
        blocks.push({ x, y, z, type });
    }
    
    console.log(`生成了 ${blocks.length} 个方块`);
    return blocks;
}

// 初始化数据库
async function initDatabase() {
    if (!useDatabase || !pool) {
        console.log('使用内存存储模式，生成默认世界');
        const blocks = generateWorldBlocks();
        blocks.forEach(block => {
            const key = `${block.x},${block.y},${block.z}`;
            gameState.blocks.set(key, block);
        });
        console.log(`内存模式：当前有 ${gameState.blocks.size} 个方块`);
        return;
    }

    try {
        console.log('正在连接数据库...');
        
        // 测试连接
        await pool.query('SELECT NOW()');
        console.log('数据库连接成功');

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

        // 检查是否有方块数据
        const result = await pool.query('SELECT COUNT(*) FROM blocks');
        const count = parseInt(result.rows[0].count);
        
        if (count === 0) {
            console.log('数据库为空，生成初始世界...');
            const blocks = generateWorldBlocks();
            
            // 批量插入
            for (const block of blocks) {
                try {
                    await pool.query(
                        'INSERT INTO blocks (x, y, z, type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                        [block.x, block.y, block.z, block.type]
                    );
                } catch (err) {
                    console.error('插入方块失败:', err.message);
                }
            }
            console.log(`数据库插入完成`);
        }
        
        // 加载所有方块到内存
        const loadResult = await pool.query('SELECT x, y, z, type FROM blocks');
        gameState.blocks.clear();
        
        loadResult.rows.forEach(row => {
            const key = `${row.x},${row.y},${row.z}`;
            gameState.blocks.set(key, {
                x: row.x,
                y: row.y,
                z: row.z,
                type: row.type
            });
        });
        
        console.log(`从数据库加载了 ${gameState.blocks.size} 个方块`);
        
    } catch (error) {
        console.error('数据库初始化失败:', error.message);
        console.log('切换到内存存储模式');
        useDatabase = false;
        
        const blocks = generateWorldBlocks();
        blocks.forEach(block => {
            const key = `${block.x},${block.y},${block.z}`;
            gameState.blocks.set(key, block);
        });
        console.log(`内存模式：当前有 ${gameState.blocks.size} 个方块`);
    }
}

// 初始化
initDatabase();

// 存储客户端
const clients = new Map();
let nextClientId = 1;

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 根路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 健康检查端点
app.get('/health', async (req, res) => {
    let dbStatus = 'not used';
    let dbCount = 0;
    
    if (useDatabase && pool) {
        try {
            const result = await pool.query('SELECT COUNT(*) FROM blocks');
            dbCount = parseInt(result.rows[0].count);
            dbStatus = 'connected';
        } catch (error) {
            dbStatus = 'error';
        }
    }
    
    res.json({
        status: 'ok',
        onlinePlayers: clients.size,
        memoryBlocks: gameState.blocks.size,
        database: {
            status: dbStatus,
            count: dbCount
        },
        mode: useDatabase ? 'database' : 'memory'
    });
});

// WebSocket 连接处理
wss.on('connection', (ws) => {
    const clientId = nextClientId++;
    console.log(`玩家 ${clientId} 加入游戏，当前在线: ${clients.size + 1}`);

    // 生成安全的出生点（确保在地面之上）
    const spawnPoint = {
        x: Math.floor(Math.random() * 5 - 2),
        y: 3, // 提高出生点，确保不会掉下去
        z: Math.floor(Math.random() * 5 - 2)
    };
    
    // 玩家数据
    const player = {
        id: clientId,
        x: spawnPoint.x,
        y: spawnPoint.y,
        z: spawnPoint.z,
        rotation: 0,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };

    clients.set(clientId, { ws, player });
    gameState.players.set(clientId, player);

    // 发送初始化数据
    const blocksArray = Array.from(gameState.blocks.values());
    console.log(`发送给玩家 ${clientId}: ${blocksArray.length} 个方块`);
    
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
                        
                        // 保存到数据库（如果启用）
                        if (useDatabase && pool) {
                            try {
                                await pool.query(
                                    'INSERT INTO blocks (x, y, z, type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                                    [data.x, data.y, data.z, data.blockType]
                                );
                            } catch (err) {
                                console.error('数据库保存失败:', err.message);
                            }
                        }
                        
                        // 更新内存缓存
                        gameState.blocks.set(blockKey, {
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            type: data.blockType
                        });
                        
                        // 广播给所有客户端
                        broadcast({
                            type: 'blockPlaced',
                            clientId: clientId,
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            blockType: data.blockType
                        });
                    }
                    break;
                    
                case 'removeBlock':
                    const removeKey = `${data.x},${data.y},${data.z}`;
                    if (gameState.blocks.has(removeKey)) {
                        console.log(`玩家 ${clientId} 移除方块 at ${data.x},${data.y},${data.z}`);
                        
                        // 从数据库删除（如果启用）
                        if (useDatabase && pool) {
                            try {
                                await pool.query(
                                    'DELETE FROM blocks WHERE x = $1 AND y = $2 AND z = $3',
                                    [data.x, data.y, data.z]
                                );
                            } catch (err) {
                                console.error('数据库删除失败:', err.message);
                            }
                        }
                        
                        // 更新内存缓存
                        gameState.blocks.delete(removeKey);
                        
                        // 广播给所有客户端
                        broadcast({
                            type: 'blockRemoved',
                            clientId: clientId,
                            x: data.x,
                            y: data.y,
                            z: data.z
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('消息处理错误:', error);
        }
    });

    ws.on('close', () => {
        console.log(`玩家 ${clientId} 离开游戏`);
        clients.delete(clientId);
        gameState.players.delete(clientId);
        
        broadcast({
            type: 'playerLeft',
            clientId: clientId
        });
    });
});

// 广播消息给所有客户端
function broadcast(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client, id) => {
        if (id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(messageStr);
        }
    });
}

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`当前方块数量: ${gameState.blocks.size}`);
    console.log(`数据库模式: ${useDatabase ? '启用' : '禁用'}`);
});
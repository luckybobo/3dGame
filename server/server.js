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
    ssl: process.env.DATABASE_URL ? {
        rejectUnauthorized: false
    } : false
});

// 游戏状态
const gameState = {
    players: new Map(),
    blocks: new Map()
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

        console.log('数据库初始化完成');
        
        // 加载所有方块
        await loadBlocks();
        
    } catch (error) {
        console.error('数据库初始化失败:', error);
    }
}

// 加载所有方块
async function loadBlocks() {
    try {
        const result = await pool.query('SELECT x, y, z, type FROM blocks');
        gameState.blocks.clear();
        
        result.rows.forEach(row => {
            const key = `${row.x},${row.y},${row.z}`;
            gameState.blocks.set(key, row);
        });
        
        console.log(`已加载 ${gameState.blocks.size} 个方块`);
        
        // 如果没有方块，生成初始世界
        if (gameState.blocks.size === 0) {
            await generateWorld();
        }
    } catch (error) {
        console.error('加载方块失败:', error);
    }
}

// 生成初始世界
async function generateWorld() {
    console.log('生成初始世界...');
    const size = 20;
    const blocks = [];
    
    // 地面层
    for (let x = -size; x < size; x++) {
        for (let z = -size; z < size; z++) {
            blocks.push([x, -1, z, 'grass']);
        }
    }
    
    // 测试方块
    blocks.push([5, 0, 5, 'brick']);
    blocks.push([5, 1, 5, 'brick']);
    blocks.push([5, 2, 5, 'brick']);
    blocks.push([-5, 0, -5, 'stone']);
    
    // 批量插入
    for (const block of blocks) {
        try {
            await pool.query(
                'INSERT INTO blocks (x, y, z, type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                block
            );
        } catch (err) {
            console.error('插入方块失败:', err);
        }
    }
    
    console.log(`生成了 ${blocks.length} 个方块`);
    await loadBlocks();
}

// 保存方块
async function saveBlock(x, y, z, type) {
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

// 删除方块
async function deleteBlock(x, y, z) {
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

// 初始化数据库
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

// 健康检查
app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM blocks');
        res.json({
            status: 'ok',
            players: clients.size,
            blocks: parseInt(result.rows[0].count),
            cached: gameState.blocks.size
        });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

wss.on('connection', (ws) => {
    const clientId = nextClientId++;
    console.log(`玩家 ${clientId} 加入`);

    // 玩家数据
    const player = {
        id: clientId,
        x: Math.random() * 10 - 5,
        y: 2,
        z: Math.random() * 10 - 5,
        rotation: 0,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
    };

    clients.set(clientId, { ws, player });
    gameState.players.set(clientId, player);

    // 发送初始化数据
    ws.send(JSON.stringify({
        type: 'init',
        clientId: clientId,
        players: Array.from(gameState.players.values()),
        blocks: Array.from(gameState.blocks.values())
    }));

    // 广播新玩家
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
                    const key = `${data.x},${data.y},${data.z}`;
                    if (!gameState.blocks.has(key)) {
                        // 保存到数据库
                        await saveBlock(data.x, data.y, data.z, data.blockType);
                        
                        // 更新缓存
                        gameState.blocks.set(key, {
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            type: data.blockType
                        });
                        
                        // 广播给所有人
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
                        // 从数据库删除
                        await deleteBlock(data.x, data.y, data.z);
                        
                        // 更新缓存
                        gameState.blocks.delete(removeKey);
                        
                        // 广播给所有人
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
            console.error('消息错误:', error);
        }
    });

    ws.on('close', () => {
        console.log(`玩家 ${clientId} 离开`);
        clients.delete(clientId);
        gameState.players.delete(clientId);
        
        broadcast({
            type: 'playerLeft',
            clientId: clientId
        });
    });
});

function broadcast(message, excludeId = null) {
    const msg = JSON.stringify(message);
    clients.forEach((client, id) => {
        if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(msg);
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
});
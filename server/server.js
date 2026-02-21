const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 存储所有连接的客户端
const clients = new Map();
let nextClientId = 1;

// 游戏状态
const gameState = {
    players: new Map(),
    blocks: new Map() // 存储所有方块
};

// 生成初始世界
function generateWorld() {
    console.log('生成世界...');
    const size = 30;
    let blockCount = 0;
    
    // 地面层
    for (let x = -size; x < size; x++) {
        for (let z = -size; z < size; z++) {
            const key = `${x},${-1},${z}`;
            gameState.blocks.set(key, {
                x, y: -1, z,
                type: 'grass'
            });
            blockCount++;
        }
    }
    
    // 添加一些地形起伏
    for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * 20 - 10);
        const z = Math.floor(Math.random() * 20 - 10);
        
        for (let y = 0; y < 2; y++) {
            const key = `${x},${y},${z}`;
            if (!gameState.blocks.has(key)) {
                gameState.blocks.set(key, {
                    x, y, z,
                    type: y === 1 ? 'grass' : 'dirt'
                });
                blockCount++;
            }
        }
    }
    
    // 添加树木
    for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * 20 - 10);
        const z = Math.floor(Math.random() * 20 - 10);
        
        // 树干
        for (let y = 0; y < 4; y++) {
            const key = `${x},${y},${z}`;
            if (!gameState.blocks.has(key)) {
                gameState.blocks.set(key, {
                    x, y: y, z,
                    type: 'wood'
                });
                blockCount++;
            }
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
            const key = `${lx},${ly},${lz}`;
            if (!gameState.blocks.has(key) && Math.random() > 0.3) {
                gameState.blocks.set(key, {
                    x: lx, y: ly, z: lz,
                    type: 'leaf'
                });
                blockCount++;
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
    
    testBlocks.forEach(block => {
        const key = `${block.x},${block.y},${block.z}`;
        gameState.blocks.set(key, block);
        blockCount++;
    });
    
    console.log(`世界生成完成，共 ${blockCount} 个方块`);
}

// 生成世界
generateWorld();

wss.on('connection', (ws) => {
    const clientId = nextClientId++;
    console.log(`玩家 ${clientId} 加入了游戏`);

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

    // 转换blocks Map为数组
    const blocksArray = Array.from(gameState.blocks.values());
    console.log(`发送初始化数据给玩家 ${clientId}，包含 ${blocksArray.length} 个方块`);

    // 发送初始化数据给新连接的客户端
    ws.send(JSON.stringify({
        type: 'init',
        clientId: clientId,
        players: Array.from(gameState.players.values()),
        blocks: blocksArray
    }));

    // 广播新玩家加入给所有其他客户端
    broadcast({
        type: 'playerJoined',
        player: player
    }, clientId);

    ws.on('message', (message) => {
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
                    // 添加方块到世界
                    const blockKey = `${data.x},${data.y},${data.z}`;
                    if (!gameState.blocks.has(blockKey)) {
                        console.log(`玩家 ${clientId} 放置方块 at ${data.x},${data.y},${data.z} 类型: ${data.blockType}`);
                        
                        gameState.blocks.set(blockKey, {
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            type: data.blockType
                        });
                        
                        // 广播给所有客户端（包括自己）
                        const message = {
                            type: 'blockPlaced',
                            clientId: clientId,
                            x: data.x,
                            y: data.y,
                            z: data.z,
                            blockType: data.blockType
                        };
                        
                        clients.forEach((client, id) => {
                            if (client.ws.readyState === WebSocket.OPEN) {
                                client.ws.send(JSON.stringify(message));
                            }
                        });
                    }
                    break;
                    
                case 'removeBlock':
                    // 从世界移除方块
                    const removeKey = `${data.x},${data.y},${data.z}`;
                    if (gameState.blocks.has(removeKey)) {
                        console.log(`玩家 ${clientId} 移除方块 at ${data.x},${data.y},${data.z}`);
                        
                        gameState.blocks.delete(removeKey);
                        
                        // 广播给所有客户端（包括自己）
                        const message = {
                            type: 'blockRemoved',
                            clientId: clientId,
                            x: data.x,
                            y: data.y,
                            z: data.z
                        };
                        
                        clients.forEach((client, id) => {
                            if (client.ws.readyState === WebSocket.OPEN) {
                                client.ws.send(JSON.stringify(message));
                            }
                        });
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

// 提供静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
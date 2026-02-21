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
    players: new Map()
};

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

    // 发送初始化数据给新连接的客户端
    ws.send(JSON.stringify({
        type: 'init',
        clientId: clientId,
        players: Array.from(gameState.players.values())
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
                        
                        // 广播玩家移动给其他客户端
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
            }
        } catch (error) {
            console.error('消息处理错误:', error);
        }
    });

    ws.on('close', () => {
        console.log(`玩家 ${clientId} 离开了游戏`);
        clients.delete(clientId);
        gameState.players.delete(clientId);
        
        // 广播玩家离开
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
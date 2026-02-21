// ==================== 性能优化配置 ====================
const CONFIG = {
    RENDER_DISTANCE: 30,
    CHUNK_SIZE: 16,
    UPDATE_FREQUENCY: 4,
    
    PLAYER_HEIGHT: 1.8,
    PLAYER_WIDTH: 0.6,
    MOVE_SPEED: 0.12,
    JUMP_POWER: 0.22,
    GRAVITY: -0.018,
    
    INTERACTION_DISTANCE: 8,
    WORLD_SIZE: 40
};

// ==================== 物品系统 ====================
const ItemTypes = {
    STONE: { id: 'stone', name: '石头', color: '#888888', pattern: 'stone', emoji: '⛰️' },
    GRASS: { id: 'grass', name: '草地', color: '#7c9c7c', pattern: 'grass', emoji: '🌿' },
    WOOD: { id: 'wood', name: '木头', color: '#8b5a2b', pattern: 'wood', emoji: '🪵' },
    LEAF: { id: 'leaf', name: '树叶', color: '#2d6a2d', pattern: 'leaf', emoji: '🍃' },
    DIRT: { id: 'dirt', name: '泥土', color: '#8b4513', pattern: 'solid', emoji: '🟫' },
    SAND: { id: 'sand', name: '沙子', color: '#f4e4c1', pattern: 'solid', emoji: '⏳' },
    BRICK: { id: 'brick', name: '砖块', color: '#b85a38', pattern: 'stone', emoji: '🧱' },
    GLASS: { id: 'glass', name: '玻璃', color: '#e0f0ff', pattern: 'solid', emoji: '🔮' }
};

// ==================== 纹理生成器 ====================
class TextureGenerator {
    constructor() {
        this.cache = new Map();
    }
    
    createBlockTexture(baseColor, pattern = 'solid') {
        const key = `${baseColor}-${pattern}`;
        
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 16, 16);

        if (pattern === 'grass') {
            ctx.fillStyle = '#3a5e3a';
            for (let i = 0; i < 10; i++) {
                ctx.fillRect(Math.floor(Math.random() * 14), Math.floor(Math.random() * 14), 2, 2);
            }
        } else if (pattern === 'stone') {
            ctx.fillStyle = '#555555';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(Math.floor(Math.random() * 14), Math.floor(Math.random() * 14), 3, 2);
            }
        } else if (pattern === 'wood') {
            ctx.strokeStyle = '#5d3a1a';
            ctx.lineWidth = 2;
            for (let i = 2; i < 16; i += 4) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 16);
                ctx.stroke();
            }
        } else if (pattern === 'leaf') {
            ctx.fillStyle = '#2a5a2a';
            for (let i = 0; i < 20; i++) {
                ctx.fillRect(Math.floor(Math.random() * 14), Math.floor(Math.random() * 14), 2, 2);
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        this.cache.set(key, texture);
        return texture;
    }

    createPlayerTexture(color) {
        const key = `player-${color}`;
        
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.fillRect(4, 4, 8, 8);
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(6, 6, 2, 2);
        ctx.fillRect(10, 6, 2, 2);
        
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(8, 10, 2, 1);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        this.cache.set(key, texture);
        return texture;
    }
}

// ==================== 方块管理 ====================
class BlockManager {
    constructor(scene, textureGen) {
        this.scene = scene;
        this.textureGen = textureGen;
        this.blocks = new Map();
        this.blockMeshes = new Map();
    }
    
    getKey(x, y, z) {
        return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    }
    
    createBlock(x, y, z, type) {
        const key = this.getKey(x, y, z);
        
        // 检查是否已有方块
        if (this.blocks.has(key)) {
            return null;
        }
        
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const item = Object.values(ItemTypes).find(i => i.id === type) || ItemTypes.STONE;
        const material = new THREE.MeshStandardMaterial({
            map: this.textureGen.createBlockTexture(item.color, item.pattern),
            emissive: 0x000000
        });
        
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        
        this.scene.add(block);
        this.blocks.set(key, { x, y, z, type, mesh: block });
        this.blockMeshes.set(block, key);
        
        return block;
    }
    
    removeBlock(x, y, z) {
        const key = this.getKey(x, y, z);
        const block = this.blocks.get(key);
        
        if (block && block.mesh) {
            this.scene.remove(block.mesh);
            this.blockMeshes.delete(block.mesh);
            this.blocks.delete(key);
            
            // 清理资源
            block.mesh.geometry.dispose();
            block.mesh.material.dispose();
            
            return block;
        }
        
        return null;
    }
    
    getBlock(x, y, z) {
        const key = this.getKey(x, y, z);
        return this.blocks.get(key);
    }
    
    getBlockByMesh(mesh) {
        const key = this.blockMeshes.get(mesh);
        return key ? this.blocks.get(key) : null;
    }
    
    getAllBlocks() {
        return Array.from(this.blocks.values());
    }
    
    getNearbyBlocks(pos, radius = 3) {
        const result = [];
        const minX = Math.floor(pos.x - radius);
        const maxX = Math.ceil(pos.x + radius);
        const minY = Math.floor(pos.y - radius);
        const maxY = Math.ceil(pos.y + radius);
        const minZ = Math.floor(pos.z - radius);
        const maxZ = Math.ceil(pos.z + radius);
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.getBlock(x, y, z);
                    if (block) {
                        result.push(block);
                    }
                }
            }
        }
        
        return result;
    }
    
    checkCollision(playerBox) {
        const blocks = this.getAllBlocks();
        
        for (const block of blocks) {
            const blockBox = {
                minX: block.x - 0.5,
                maxX: block.x + 0.5,
                minY: block.y - 0.5,
                maxY: block.y + 0.5,
                minZ: block.z - 0.5,
                maxZ: block.z + 0.5
            };
            
            if (this.boxesIntersect(playerBox, blockBox)) {
                return true;
            }
        }
        
        return false;
    }
    
    boxesIntersect(box1, box2) {
        return !(box2.maxX <= box1.minX || 
                 box2.minX >= box1.maxX || 
                 box2.maxY <= box1.minY || 
                 box2.minY >= box1.maxY || 
                 box2.maxZ <= box1.minZ || 
                 box2.minZ >= box1.maxZ);
    }
    
    syncBlocks(blocksData) {
        console.log(`同步 ${blocksData.length} 个方块`);
        
        // 清除所有现有方块
        this.blocks.forEach((block, key) => {
            if (block.mesh) {
                this.scene.remove(block.mesh);
                block.mesh.geometry.dispose();
                block.mesh.material.dispose();
            }
        });
        
        this.blocks.clear();
        this.blockMeshes.clear();
        
        // 重新创建所有方块
        blocksData.forEach(blockData => {
            this.createBlock(blockData.x, blockData.y, blockData.z, blockData.type);
        });
        
        console.log(`同步完成，当前有 ${this.blocks.size} 个方块`);
    }
}

// ==================== 玩家管理 ====================
class PlayerManager {
    constructor(scene, textureGen) {
        this.scene = scene;
        this.textureGen = textureGen;
        this.players = new Map();
        this.localPlayerId = null;
    }
    
    createPlayer(playerData) {
        const group = new THREE.Group();
        
        // 身体
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({
            map: this.textureGen.createPlayerTexture(playerData.color)
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        group.add(body);
        
        // 头
        const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMat = new THREE.MeshStandardMaterial({ color: '#ffdbac' });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.5;
        group.add(head);
        
        // 手臂
        const armGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
        const armMat = new THREE.MeshStandardMaterial({ color: '#ffdbac' });
        
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.6, 0.9, 0);
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.6, 0.9, 0);
        group.add(rightArm);
        
        // 腿
        const legGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
        const legMat = new THREE.MeshStandardMaterial({ color: '#4a4a4a' });
        
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.25, 0.2, 0);
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.25, 0.2, 0);
        group.add(rightLeg);
        
        group.position.set(playerData.x, playerData.y, playerData.z);
        group.rotation.y = playerData.rotation || 0;
        
        this.scene.add(group);
        
        this.players.set(playerData.id, {
            mesh: group,
            data: playerData
        });
        
        return group;
    }
    
    updatePlayer(playerId, data) {
        const player = this.players.get(playerId);
        if (player) {
            player.mesh.position.set(data.x, data.y, data.z);
            player.mesh.rotation.y = data.rotation;
            player.data = { ...player.data, ...data };
        }
    }
    
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.scene.remove(player.mesh);
            this.players.delete(playerId);
        }
    }
    
    getAllPlayers() {
        return Array.from(this.players.values());
    }
}

// ==================== 游戏主类 ====================
class MultiplayerGame {
    constructor() {
        // 初始化
        this.textureGen = new TextureGenerator();
        this.blockManager = null;
        this.playerManager = null;
        this.keys = {};
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.pitch = 0;
        this.yaw = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.clientId = null;
        
        // 物品栏
        this.hotbar = [
            { type: 'stone', count: 64 },
            { type: 'grass', count: 64 },
            { type: 'wood', count: 64 },
            { type: 'leaf', count: 64 },
            { type: 'dirt', count: 64 },
            { type: 'sand', count: 64 },
            { type: 'brick', count: 64 },
            { type: 'glass', count: 64 }
        ];
        this.selectedSlot = 0;
        this.heldBlock = 'stone';
        
        // 射线检测
        this.raycaster = new THREE.Raycaster();
        this.clock = new THREE.Clock();
        
        // 网络
        this.lastNetworkUpdate = 0;
        
        this.init();
    }

    init() {
        this.initThree();
        this.initWebSocket();
        this.initEventListeners();
        this.updateHotbarDisplay();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, CONFIG.PLAYER_HEIGHT, 0);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);

        // 光照
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(1, 2, 1);
        this.scene.add(dirLight);
        
        // 初始化管理器
        this.blockManager = new BlockManager(this.scene, this.textureGen);
        this.playerManager = new PlayerManager(this.scene, this.textureGen);
    }

    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to server');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
        };
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'init':
                this.clientId = data.clientId;
                document.getElementById('playerId').textContent = this.clientId;
                this.playerManager.localPlayerId = this.clientId;
                
                console.log(`收到初始化数据，${data.blocks.length} 个方块`);
                
                // 同步所有方块
                if (data.blocks && data.blocks.length > 0) {
                    this.blockManager.syncBlocks(data.blocks);
                }
                
                // 创建所有其他玩家
                if (data.players) {
                    data.players.forEach(playerData => {
                        if (playerData.id !== this.clientId) {
                            this.playerManager.createPlayer(playerData);
                        }
                    });
                }
                break;
                
            case 'playerJoined':
                if (data.player.id !== this.clientId) {
                    this.playerManager.createPlayer(data.player);
                }
                break;
                
            case 'playerLeft':
                this.playerManager.removePlayer(data.clientId);
                break;
                
            case 'playerMoved':
                if (data.clientId !== this.clientId) {
                    this.playerManager.updatePlayer(data.clientId, {
                        x: data.x,
                        y: data.y,
                        z: data.z,
                        rotation: data.rotation
                    });
                }
                break;
                
            case 'blockPlaced':
                console.log(`其他玩家放置方块: ${data.x},${data.y},${data.z} 类型: ${data.blockType}`);
                // 其他玩家放置方块 - 总是创建，不管是谁
                this.blockManager.createBlock(data.x, data.y, data.z, data.blockType);
                break;
                
            case 'blockRemoved':
                console.log(`其他玩家移除方块: ${data.x},${data.y},${data.z}`);
                // 其他玩家破坏方块 - 总是移除，不管是谁
                this.blockManager.removeBlock(data.x, data.y, data.z);
                break;
        }
    }

    updateHotbarDisplay() {
        const slots = document.querySelectorAll('.hotbar-slot');
        slots.forEach((slot, index) => {
            if (index < this.hotbar.length) {
                const item = this.hotbar[index];
                const itemData = Object.values(ItemTypes).find(i => i.id === item.type);
                slot.innerHTML = `${itemData.emoji}<br><small>${item.count}</small>`;
                slot.classList.toggle('selected', index === this.selectedSlot);
            }
        });
    }

    initEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code >= 'Digit1' && e.code <= 'Digit8') {
                const slot = parseInt(e.code.replace('Digit', '')) - 1;
                if (slot < this.hotbar.length) {
                    this.selectedSlot = slot;
                    this.heldBlock = this.hotbar[slot].type;
                    this.updateHotbarDisplay();
                }
            }
            
            if (e.code === 'Space') e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        document.addEventListener('click', (e) => {
            if (e.target === this.renderer.domElement) {
                this.renderer.domElement.requestPointerLock();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.renderer.domElement) {
                this.yaw -= e.movementX * 0.002;
                this.pitch -= e.movementY * 0.002;
                this.pitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.pitch));
                
                this.camera.rotation.order = 'YXZ';
                this.camera.rotation.y = this.yaw;
                this.camera.rotation.x = this.pitch;
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement !== this.renderer.domElement) return;
            
            e.preventDefault();
            
            this.raycaster.ray.origin.copy(this.camera.position);
            this.raycaster.ray.direction.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
            
            const blocks = this.blockManager.getAllBlocks().map(b => b.mesh);
            const intersects = this.raycaster.intersectObjects(blocks);
            
            if (intersects.length > 0) {
                const hitMesh = intersects[0].object;
                const hitBlock = this.blockManager.getBlockByMesh(hitMesh);
                
                if (!hitBlock) return;
                
                const distance = this.camera.position.distanceTo(hitMesh.position);
                
                if (distance > CONFIG.INTERACTION_DISTANCE) return;
                
                if (e.button === 0) { // 左键破坏
                    console.log(`破坏方块: ${hitBlock.x},${hitBlock.y},${hitBlock.z}`);
                    
                    // 本地删除
                    this.blockManager.removeBlock(hitBlock.x, hitBlock.y, hitBlock.z);
                    
                    // 添加到物品栏
                    const slot = this.hotbar.findIndex(s => s.type === hitBlock.type);
                    if (slot >= 0) {
                        this.hotbar[slot].count = Math.min(64, this.hotbar[slot].count + 1);
                        this.updateHotbarDisplay();
                    }
                    
                    // 发送到服务器
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({
                            type: 'removeBlock',
                            x: hitBlock.x,
                            y: hitBlock.y,
                            z: hitBlock.z
                        }));
                    }
                    
                } else if (e.button === 2) { // 右键放置
                    const normal = intersects[0].face.normal;
                    const placeX = Math.round(hitBlock.x + normal.x);
                    const placeY = Math.round(hitBlock.y + normal.y);
                    const placeZ = Math.round(hitBlock.z + normal.z);
                    
                    const placePos = new THREE.Vector3(placeX, placeY, placeZ);
                    if (this.camera.position.distanceTo(placePos) > CONFIG.INTERACTION_DISTANCE) return;
                    
                    // 检查位置是否被占用
                    if (this.blockManager.getBlock(placeX, placeY, placeZ)) return;
                    
                    // 检查是否与玩家重叠
                    const playerBox = {
                        minX: this.camera.position.x - CONFIG.PLAYER_WIDTH/2,
                        maxX: this.camera.position.x + CONFIG.PLAYER_WIDTH/2,
                        minY: this.camera.position.y - CONFIG.PLAYER_HEIGHT,
                        maxY: this.camera.position.y,
                        minZ: this.camera.position.z - CONFIG.PLAYER_WIDTH/2,
                        maxZ: this.camera.position.z + CONFIG.PLAYER_WIDTH/2
                    };
                    
                    const blockBox = {
                        minX: placeX - 0.5,
                        maxX: placeX + 0.5,
                        minY: placeY - 0.5,
                        maxY: placeY + 0.5,
                        minZ: placeZ - 0.5,
                        maxZ: placeZ + 0.5
                    };
                    
                    const intersects_player = this.blockManager.boxesIntersect(playerBox, blockBox);
                    
                    if (intersects_player) return;
                    
                    const selectedItem = this.hotbar[this.selectedSlot];
                    if (selectedItem.count > 0) {
                        console.log(`放置方块: ${placeX},${placeY},${placeZ} 类型: ${selectedItem.type}`);
                        
                        // 本地放置
                        this.blockManager.createBlock(placeX, placeY, placeZ, selectedItem.type);
                        selectedItem.count--;
                        this.updateHotbarDisplay();
                        
                        // 发送到服务器
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({
                                type: 'placeBlock',
                                x: placeX,
                                y: placeY,
                                z: placeZ,
                                blockType: selectedItem.type
                            }));
                        }
                    }
                }
            }
        });

        document.addEventListener('contextmenu', (e) => {
            if (e.target === this.renderer.domElement) e.preventDefault();
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    handleMovement() {
        const delta = Math.min(this.clock.getDelta(), 0.1);
        
        // 检查是否站在地面上
        const feetPos = this.camera.position.clone();
        feetPos.y -= CONFIG.PLAYER_HEIGHT;
        
        const groundCheckBox = {
            minX: this.camera.position.x - CONFIG.PLAYER_WIDTH/2,
            maxX: this.camera.position.x + CONFIG.PLAYER_WIDTH/2,
            minY: feetPos.y - 0.1,
            maxY: feetPos.y + 0.1,
            minZ: this.camera.position.z - CONFIG.PLAYER_WIDTH/2,
            maxZ: this.camera.position.z + CONFIG.PLAYER_WIDTH/2
        };
        
        this.onGround = this.blockManager.checkCollision(groundCheckBox);
        
        // 应用重力
        if (!this.onGround) {
            this.velocity.y += CONFIG.GRAVITY;
            if (this.velocity.y < -0.3) this.velocity.y = -0.3;
        } else {
            if (this.velocity.y < 0) this.velocity.y = 0;
        }
        
        // 跳跃
        if (this.keys['Space'] && this.onGround) {
            this.velocity.y = CONFIG.JUMP_POWER;
            this.onGround = false;
        }
        
        // 垂直移动
        if (this.velocity.y !== 0) {
            const newY = this.camera.position.y + this.velocity.y;
            
            const verticalBox = {
                minX: this.camera.position.x - CONFIG.PLAYER_WIDTH/2,
                maxX: this.camera.position.x + CONFIG.PLAYER_WIDTH/2,
                minY: newY - CONFIG.PLAYER_HEIGHT,
                maxY: newY,
                minZ: this.camera.position.z - CONFIG.PLAYER_WIDTH/2,
                maxZ: this.camera.position.z + CONFIG.PLAYER_WIDTH/2
            };
            
            if (!this.blockManager.checkCollision(verticalBox)) {
                this.camera.position.y = newY;
            } else {
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                    this.onGround = true;
                } else {
                    this.velocity.y = 0;
                }
            }
        }
        
        // 水平移动
        const moveX = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
        const moveZ = (this.keys['KeyS'] ? 1 : 0) - (this.keys['KeyW'] ? 1 : 0);
        
        let moved = false;
        
        if (moveX !== 0 || moveZ !== 0) {
            const moveDir = new THREE.Vector3(moveX, 0, moveZ);
            moveDir.normalize();
            moveDir.applyQuaternion(this.camera.quaternion);
            moveDir.y = 0;
            
            if (moveDir.length() > 0.1) {
                moveDir.normalize();
                
                // X轴移动
                if (moveDir.x !== 0) {
                    const newX = this.camera.position.x + moveDir.x * CONFIG.MOVE_SPEED;
                    const horizontalBoxX = {
                        minX: newX - CONFIG.PLAYER_WIDTH/2,
                        maxX: newX + CONFIG.PLAYER_WIDTH/2,
                        minY: this.camera.position.y - CONFIG.PLAYER_HEIGHT,
                        maxY: this.camera.position.y,
                        minZ: this.camera.position.z - CONFIG.PLAYER_WIDTH/2,
                        maxZ: this.camera.position.z + CONFIG.PLAYER_WIDTH/2
                    };
                    
                    if (!this.blockManager.checkCollision(horizontalBoxX)) {
                        this.camera.position.x = newX;
                        moved = true;
                    }
                }
                
                // Z轴移动
                if (moveDir.z !== 0) {
                    const newZ = this.camera.position.z + moveDir.z * CONFIG.MOVE_SPEED;
                    const horizontalBoxZ = {
                        minX: this.camera.position.x - CONFIG.PLAYER_WIDTH/2,
                        maxX: this.camera.position.x + CONFIG.PLAYER_WIDTH/2,
                        minY: this.camera.position.y - CONFIG.PLAYER_HEIGHT,
                        maxY: this.camera.position.y,
                        minZ: newZ - CONFIG.PLAYER_WIDTH/2,
                        maxZ: newZ + CONFIG.PLAYER_WIDTH/2
                    };
                    
                    if (!this.blockManager.checkCollision(horizontalBoxZ)) {
                        this.camera.position.z = newZ;
                        moved = true;
                    }
                }
            }
        }

        // 发送位置更新到服务器
        const now = Date.now();
        if (this.ws && this.ws.readyState === WebSocket.OPEN && (moved || this.velocity.y !== 0)) {
            if (now - this.lastNetworkUpdate > 50) {
                this.ws.send(JSON.stringify({
                    type: 'playerMove',
                    x: this.camera.position.x,
                    y: this.camera.position.y - CONFIG.PLAYER_HEIGHT,
                    z: this.camera.position.z,
                    rotation: this.yaw
                }));
                this.lastNetworkUpdate = now;
            }
        }

        // 更新坐标显示
        document.getElementById('coordinates').textContent = 
            `${Math.round(this.camera.position.x)}, ${Math.round(this.camera.position.y - CONFIG.PLAYER_HEIGHT)}, ${Math.round(this.camera.position.z)}`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // FPS计数
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            document.getElementById('fps-counter').textContent = `FPS: ${this.frameCount}`;
            this.frameCount = 0;
            this.lastTime = now;
        }

        // 游戏逻辑
        this.handleMovement();

        // 渲染
        this.renderer.render(this.scene, this.camera);
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new MultiplayerGame();
});
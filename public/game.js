// ==================== 配置 ====================
const CONFIG = {
    PLAYER_HEIGHT: 1.8,
    PLAYER_WIDTH: 0.6,
    MOVE_SPEED: 0.15,
    JUMP_POWER: 0.22,
    GRAVITY: -0.018,
    INTERACTION_DISTANCE: 5,
    
    // 光照配置
    SUN_INTENSITY: 1.2,
    AMBIENT_INTENSITY: 0.3,
    SHADOW_MAP_SIZE: 2048,
    
    // 材质配置
    ROUGHNESS: 0.6,
    METALNESS: 0.1
};

// ==================== 物品类型 ====================
const ItemTypes = {
    STONE: { 
        id: 'stone', 
        name: '石头', 
        color: '#888888', 
        roughness: 0.7,
        metalness: 0.1,
        emoji: '⛰️' 
    },
    GRASS: { 
        id: 'grass', 
        name: '草地', 
        color: '#7c9c7c', 
        roughness: 0.8,
        metalness: 0.0,
        emoji: '🌿' 
    },
    WOOD: { 
        id: 'wood', 
        name: '木头', 
        color: '#8b5a2b', 
        roughness: 0.7,
        metalness: 0.0,
        emoji: '🪵' 
    },
    LEAF: { 
        id: 'leaf', 
        name: '树叶', 
        color: '#2d6a2d', 
        roughness: 0.9,
        metalness: 0.0,
        emoji: '🍃',
        transparent: true,
        opacity: 0.9
    },
    DIRT: { 
        id: 'dirt', 
        name: '泥土', 
        color: '#8b4513', 
        roughness: 0.9,
        metalness: 0.0,
        emoji: '🟫' 
    },
    BRICK: { 
        id: 'brick', 
        name: '砖块', 
        color: '#b85a38', 
        roughness: 0.6,
        metalness: 0.1,
        emoji: '🧱' 
    },
    GLASS: { 
        id: 'glass', 
        name: '玻璃', 
        color: '#e0f0ff', 
        roughness: 0.1,
        metalness: 0.0,
        emoji: '🔮',
        transparent: true,
        opacity: 0.3
    },
    SAND: { 
        id: 'sand', 
        name: '沙子', 
        color: '#f4e4c1', 
        roughness: 0.9,
        metalness: 0.0,
        emoji: '⏳' 
    },
    GRAVEL: { 
        id: 'gravel', 
        name: '砾石', 
        color: '#a0a0a0', 
        roughness: 0.8,
        metalness: 0.0,
        emoji: '🪨' 
    }
};

// ==================== 真实纹理生成器 ====================
class RealisticTextureGenerator {
    constructor() {
        this.cache = new Map();
    }
    
    createBlockTexture(item) {
        const key = item.id;
        
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // 基础颜色
        ctx.fillStyle = item.color;
        ctx.fillRect(0, 0, 64, 64);

        // 添加真实感噪点
        this.addNoise(ctx, item.color);
        
        // 添加微妙的纹理变化
        this.addTextureVariation(ctx, item);
        
        // 添加环境光遮蔽效果（边缘变暗）
        this.addAmbientOcclusion(ctx);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        this.cache.set(key, texture);
        return texture;
    }
    
    addNoise(ctx, baseColor) {
        const imageData = ctx.getImageData(0, 0, 64, 64);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // 添加微小噪点 (±5)
            data[i] = Math.min(255, Math.max(0, data[i] + (Math.random() * 10 - 5)));
            data[i+1] = Math.min(255, Math.max(0, data[i+1] + (Math.random() * 10 - 5)));
            data[i+2] = Math.min(255, Math.max(0, data[i+2] + (Math.random() * 10 - 5)));
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    addTextureVariation(ctx, item) {
        // 根据方块类型添加细微的纹理变化
        if (item.id === 'grass') {
            // 草地 - 随机绿色斑点
            for (let i = 0; i < 50; i++) {
                const x = Math.floor(Math.random() * 60) + 2;
                const y = Math.floor(Math.random() * 60) + 2;
                ctx.fillStyle = `rgba(60, 100, 60, ${Math.random() * 0.3})`;
                ctx.fillRect(x, y, 3, 3);
            }
        } else if (item.id === 'stone') {
            // 石头 - 灰色斑点
            for (let i = 0; i < 40; i++) {
                const x = Math.floor(Math.random() * 60) + 2;
                const y = Math.floor(Math.random() * 60) + 2;
                ctx.fillStyle = `rgba(100, 100, 100, ${Math.random() * 0.4})`;
                ctx.fillRect(x, y, 4, 4);
            }
        } else if (item.id === 'wood') {
            // 木头 - 木纹线条
            ctx.strokeStyle = `rgba(70, 40, 20, 0.3)`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 12, 0);
                ctx.lineTo(i * 12 + 10, 64);
                ctx.stroke();
            }
        } else if (item.id === 'brick') {
            // 砖块 - 砖缝
            ctx.fillStyle = 'rgba(50, 30, 20, 0.5)';
            ctx.fillRect(0, 20, 64, 2);
            ctx.fillRect(0, 40, 64, 2);
            ctx.fillRect(30, 0, 2, 20);
            ctx.fillRect(30, 22, 2, 18);
        }
    }
    
    addAmbientOcclusion(ctx) {
        // 添加边缘暗角效果
        const gradient = ctx.createRadialGradient(32, 32, 20, 32, 32, 40);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
        
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(0, 0, 64, 64);
        ctx.globalCompositeOperation = 'source-over';
    }
}

// ==================== 真实光照系统 ====================
class RealisticLighting {
    constructor(scene) {
        this.scene = scene;
        this.lights = {};
        
        this.initLights();
    }
    
    initLights() {
        // 环境光 - 基础照明
        this.lights.ambient = new THREE.AmbientLight(0x404060, CONFIG.AMBIENT_INTENSITY);
        this.scene.add(this.lights.ambient);
        
        // 主光源 - 太阳
        this.lights.sun = new THREE.DirectionalLight(0xfff5e6, CONFIG.SUN_INTENSITY);
        this.lights.sun.position.set(30, 40, 20);
        this.lights.sun.castShadow = true;
        this.lights.sun.receiveShadow = true;
        
        // 优化阴影质量
        this.lights.sun.shadow.mapSize.width = CONFIG.SHADOW_MAP_SIZE;
        this.lights.sun.shadow.mapSize.height = CONFIG.SHADOW_MAP_SIZE;
        this.lights.sun.shadow.camera.near = 0.5;
        this.lights.sun.shadow.camera.far = 100;
        this.lights.sun.shadow.camera.left = -40;
        this.lights.sun.shadow.camera.right = 40;
        this.lights.sun.shadow.camera.top = 40;
        this.lights.sun.shadow.camera.bottom = -40;
        this.lights.sun.shadow.bias = -0.0005;
        this.lights.sun.shadow.normalBias = 0.02;
        
        this.scene.add(this.lights.sun);
        
        // 辅助点光源 - 增加立体感
        this.lights.fill = new THREE.PointLight(0x5577aa, 0.2);
        this.lights.fill.position.set(-20, 10, -20);
        this.scene.add(this.lights.fill);
        
        // 背光
        this.lights.back = new THREE.DirectionalLight(0x446688, 0.15);
        this.lights.back.position.set(-10, 0, -20);
        this.scene.add(this.lights.back);
    }
}

// ==================== 方块管理器（修复歪斜问题）====================
class FixedBlockManager {
    constructor(scene, textureGen) {
        this.scene = scene;
        this.textureGen = textureGen;
        this.blocks = new Map();
        this.blockMeshes = new Map();
        this.materialCache = new Map();
        
        // 使用标准几何体，确保方正
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    
    getKey(x, y, z) {
        return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    }
    
    getMaterial(item) {
        if (this.materialCache.has(item.id)) {
            return this.materialCache.get(item.id);
        }
        
        const material = new THREE.MeshStandardMaterial({
            map: this.textureGen.createBlockTexture(item),
            color: 0xffffff,
            roughness: item.roughness || 0.6,
            metalness: item.metalness || 0.1,
            emissive: 0x000000,
            transparent: item.transparent || false,
            opacity: item.opacity || 1
        });
        
        this.materialCache.set(item.id, material);
        return material;
    }
    
    createBlock(x, y, z, type) {
        // 确保坐标是整数
        const blockX = Math.round(x);
        const blockY = Math.round(y);
        const blockZ = Math.round(z);
        
        const key = this.getKey(blockX, blockY, blockZ);
        
        if (this.blocks.has(key)) {
            return null;
        }
        
        const item = Object.values(ItemTypes).find(i => i.id === type) || ItemTypes.STONE;
        const material = this.getMaterial(item);
        
        // 使用标准几何体，不添加任何变形
        const block = new THREE.Mesh(this.geometry, material);
        
        // 精确设置位置到整数坐标
        block.position.set(blockX, blockY, blockZ);
        block.castShadow = true;
        block.receiveShadow = true;
        
        // 确保没有旋转
        block.rotation.set(0, 0, 0);
        
        this.scene.add(block);
        this.blocks.set(key, { x: blockX, y: blockY, z: blockZ, type, mesh: block, item });
        this.blockMeshes.set(block, key);
        
        return block;
    }
    
    removeBlock(x, y, z) {
        const blockX = Math.round(x);
        const blockY = Math.round(y);
        const blockZ = Math.round(z);
        const key = this.getKey(blockX, blockY, blockZ);
        const block = this.blocks.get(key);
        
        if (block && block.mesh) {
            this.scene.remove(block.mesh);
            this.blockMeshes.delete(block.mesh);
            this.blocks.delete(key);
            
            return block;
        }
        
        return null;
    }
    
    getBlock(x, y, z) {
        const blockX = Math.round(x);
        const blockY = Math.round(y);
        const blockZ = Math.round(z);
        const key = this.getKey(blockX, blockY, blockZ);
        return this.blocks.get(key);
    }
    
    getBlockByMesh(mesh) {
        const key = this.blockMeshes.get(mesh);
        return key ? this.blocks.get(key) : null;
    }
    
    getAllBlocks() {
        return Array.from(this.blocks.values());
    }
    
    syncBlocks(blocksData) {
        console.log(`同步 ${blocksData.length} 个方块`);
        
        // 清除所有现有方块
        this.blocks.forEach((block, key) => {
            if (block.mesh) {
                this.scene.remove(block.mesh);
            }
        });
        
        this.blocks.clear();
        this.blockMeshes.clear();
        
        // 创建新方块
        blocksData.forEach(blockData => {
            this.createBlock(blockData.x, blockData.y, blockData.z, blockData.type);
        });
        
        console.log(`同步完成，当前有 ${this.blocks.size} 个方块`);
    }
    
    checkCollision(playerBox) {
        for (const block of this.blocks.values()) {
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
}

// ==================== 玩家管理器 ====================
class PlayerManager {
    constructor(scene, textureGen) {
        this.scene = scene;
        this.players = new Map();
    }
    
    createPlayer(playerData) {
        const group = new THREE.Group();
        
        // 身体
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: playerData.color,
            roughness: 0.4,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // 头
        const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMat = new THREE.MeshStandardMaterial({ 
            color: '#ffdbac',
            roughness: 0.3
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.5;
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);
        
        // 眼睛
        const eyeGeo = new THREE.SphereGeometry(0.1, 6);
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#000000' });
        
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 1.6, 0.4);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 1.6, 0.4);
        group.add(rightEye);
        
        group.position.set(playerData.x, playerData.y, playerData.z);
        group.rotation.y = playerData.rotation || 0;
        
        this.scene.add(group);
        this.players.set(playerData.id, group);
        
        return group;
    }
    
    updatePlayer(playerId, data) {
        const player = this.players.get(playerId);
        if (player) {
            player.position.set(data.x, data.y, data.z);
            player.rotation.y = data.rotation;
        }
    }
    
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.scene.remove(player);
            this.players.delete(playerId);
        }
    }
}

// ==================== 游戏主类 ====================
class RealisticMultiplayerGame {
    constructor() {
        this.textureGen = new RealisticTextureGenerator();
        this.lighting = null;
        this.blockManager = null;
        this.playerManager = null;
        this.keys = {};
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.onGround = false;
        this.pitch = 0;
        this.yaw = 0;
        this.clientId = null;
        this.lastMoveTime = 0;
        
        // 物品栏
        this.hotbar = [
            { type: 'stone', count: 64 },
            { type: 'grass', count: 64 },
            { type: 'wood', count: 64 },
            { type: 'leaf', count: 64 },
            { type: 'dirt', count: 64 },
            { type: 'brick', count: 64 },
            { type: 'glass', count: 64 },
            { type: 'sand', count: 64 },
            { type: 'gravel', count: 64 }
        ];
        this.selectedSlot = 0;
        this.heldBlock = 'stone';
        
        // 工具
        this.raycaster = new THREE.Raycaster();
        this.clock = new THREE.Clock();
        
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
        this.scene.fog = new THREE.Fog(0x87CEEB, 40, 120);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, CONFIG.PLAYER_HEIGHT, 0);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);
        
        // 初始化光照
        this.lighting = new RealisticLighting(this.scene);
        
        // 初始化管理器
        this.blockManager = new FixedBlockManager(this.scene, this.textureGen);
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
                
                console.log(`收到初始化数据: ${data.blocks ? data.blocks.length : 0} 个方块`);
                
                if (data.blocks && data.blocks.length > 0) {
                    this.blockManager.syncBlocks(data.blocks);
                }
                
                const myPlayer = data.players.find(p => p.id === this.clientId);
                if (myPlayer) {
                    this.camera.position.set(myPlayer.x, myPlayer.y + CONFIG.PLAYER_HEIGHT, myPlayer.z);
                    this.yaw = myPlayer.rotation;
                }
                
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
                this.blockManager.createBlock(data.x, data.y, data.z, data.blockType);
                break;
                
            case 'blockRemoved':
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
            
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
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
                    this.blockManager.removeBlock(hitBlock.x, hitBlock.y, hitBlock.z);
                    
                    const slot = this.hotbar.findIndex(s => s.type === hitBlock.type);
                    if (slot >= 0) {
                        this.hotbar[slot].count = Math.min(64, this.hotbar[slot].count + 1);
                        this.updateHotbarDisplay();
                    }
                    
                    this.ws.send(JSON.stringify({
                        type: 'removeBlock',
                        x: hitBlock.x,
                        y: hitBlock.y,
                        z: hitBlock.z
                    }));
                    
                } else if (e.button === 2) { // 右键放置
                    const normal = intersects[0].face.normal;
                    const placeX = Math.round(hitBlock.x + normal.x);
                    const placeY = Math.round(hitBlock.y + normal.y);
                    const placeZ = Math.round(hitBlock.z + normal.z);
                    
                    if (this.blockManager.getBlock(placeX, placeY, placeZ)) return;
                    
                    const selectedItem = this.hotbar[this.selectedSlot];
                    if (selectedItem.count > 0) {
                        this.blockManager.createBlock(placeX, placeY, placeZ, selectedItem.type);
                        selectedItem.count--;
                        this.updateHotbarDisplay();
                        
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
        const delta = this.clock.getDelta();
        
        // 地面检测
        const groundCheck = {
            minX: this.camera.position.x - CONFIG.PLAYER_WIDTH/2,
            maxX: this.camera.position.x + CONFIG.PLAYER_WIDTH/2,
            minY: this.camera.position.y - CONFIG.PLAYER_HEIGHT - 0.1,
            maxY: this.camera.position.y - CONFIG.PLAYER_HEIGHT + 0.1,
            minZ: this.camera.position.z - CONFIG.PLAYER_WIDTH/2,
            maxZ: this.camera.position.z + CONFIG.PLAYER_WIDTH/2
        };
        
        this.onGround = this.blockManager.checkCollision(groundCheck);
        
        // 重力
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
            const playerBox = {
                minX: this.camera.position.x - CONFIG.PLAYER_WIDTH/2,
                maxX: this.camera.position.x + CONFIG.PLAYER_WIDTH/2,
                minY: newY - CONFIG.PLAYER_HEIGHT,
                maxY: newY,
                minZ: this.camera.position.z - CONFIG.PLAYER_WIDTH/2,
                maxZ: this.camera.position.z + CONFIG.PLAYER_WIDTH/2
            };
            
            if (!this.blockManager.checkCollision(playerBox)) {
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
                    const playerBox = {
                        minX: newX - CONFIG.PLAYER_WIDTH/2,
                        maxX: newX + CONFIG.PLAYER_WIDTH/2,
                        minY: this.camera.position.y - CONFIG.PLAYER_HEIGHT,
                        maxY: this.camera.position.y,
                        minZ: this.camera.position.z - CONFIG.PLAYER_WIDTH/2,
                        maxZ: this.camera.position.z + CONFIG.PLAYER_WIDTH/2
                    };
                    
                    if (!this.blockManager.checkCollision(playerBox)) {
                        this.camera.position.x = newX;
                    }
                }
                
                // Z轴移动
                if (moveDir.z !== 0) {
                    const newZ = this.camera.position.z + moveDir.z * CONFIG.MOVE_SPEED;
                    const playerBox = {
                        minX: this.camera.position.x - CONFIG.PLAYER_WIDTH/2,
                        maxX: this.camera.position.x + CONFIG.PLAYER_WIDTH/2,
                        minY: this.camera.position.y - CONFIG.PLAYER_HEIGHT,
                        maxY: this.camera.position.y,
                        minZ: newZ - CONFIG.PLAYER_WIDTH/2,
                        maxZ: newZ + CONFIG.PLAYER_WIDTH/2
                    };
                    
                    if (!this.blockManager.checkCollision(playerBox)) {
                        this.camera.position.z = newZ;
                    }
                }
            }
        }

        // 发送位置更新
        const now = Date.now();
        if (this.ws && this.ws.readyState === WebSocket.OPEN && now - this.lastMoveTime > 50) {
            this.ws.send(JSON.stringify({
                type: 'playerMove',
                x: this.camera.position.x,
                y: this.camera.position.y - CONFIG.PLAYER_HEIGHT,
                z: this.camera.position.z,
                rotation: this.yaw
            }));
            this.lastMoveTime = now;
        }

        // 更新坐标显示
        document.getElementById('coordinates').textContent = 
            `${Math.round(this.camera.position.x)}, ${Math.round(this.camera.position.y - CONFIG.PLAYER_HEIGHT)}, ${Math.round(this.camera.position.z)}`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.handleMovement();

        this.renderer.render(this.scene, this.camera);
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new RealisticMultiplayerGame();
});
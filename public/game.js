// ==================== 配置 ====================
const CONFIG = {
    PLAYER_HEIGHT: 1.8,
    PLAYER_WIDTH: 0.6,
    MOVE_SPEED: 0.15,
    JUMP_POWER: 0.22,
    GRAVITY: -0.018,
    INTERACTION_DISTANCE: 5,
    
    // 光照配置
    SUN_INTENSITY: 1.5,
    AMBIENT_INTENSITY: 0.4,
    SHADOW_MAP_SIZE: 2048,
    TIME_SPEED: 0.001, // 时间流逝速度
    
    // 材质配置
    ROUGHNESS: 0.4,
    METALNESS: 0.1,
    EMISSIVE_INTENSITY: 0.2
};

// ==================== 物品类型 ====================
const ItemTypes = {
    STONE: { 
        id: 'stone', 
        name: '石头', 
        color: '#888888', 
        specular: '#444444',
        roughness: 0.6,
        metalness: 0.2,
        pattern: 'stone', 
        emoji: '⛰️' 
    },
    GRASS: { 
        id: 'grass', 
        name: '草地', 
        color: '#7c9c7c', 
        specular: '#3a5e3a',
        roughness: 0.8,
        metalness: 0.0,
        pattern: 'grass', 
        emoji: '🌿' 
    },
    WOOD: { 
        id: 'wood', 
        name: '木头', 
        color: '#8b5a2b', 
        specular: '#5d3a1a',
        roughness: 0.7,
        metalness: 0.0,
        pattern: 'wood', 
        emoji: '🪵' 
    },
    LEAF: { 
        id: 'leaf', 
        name: '树叶', 
        color: '#2d6a2d', 
        specular: '#1a3f1a',
        roughness: 0.9,
        metalness: 0.0,
        pattern: 'leaf', 
        emoji: '🍃',
        transparent: true,
        opacity: 0.9
    },
    DIRT: { 
        id: 'dirt', 
        name: '泥土', 
        color: '#8b4513', 
        specular: '#5d2e0d',
        roughness: 0.9,
        metalness: 0.0,
        pattern: 'solid', 
        emoji: '🟫' 
    },
    BRICK: { 
        id: 'brick', 
        name: '砖块', 
        color: '#b85a38', 
        specular: '#8b3a1a',
        roughness: 0.5,
        metalness: 0.1,
        pattern: 'brick', 
        emoji: '🧱' 
    },
    GLASS: { 
        id: 'glass', 
        name: '玻璃', 
        color: '#e0f0ff', 
        specular: '#ffffff',
        roughness: 0.1,
        metalness: 0.0,
        pattern: 'solid', 
        emoji: '🔮',
        transparent: true,
        opacity: 0.3
    },
    GOLD: { 
        id: 'gold', 
        name: '金块', 
        color: '#ffd700', 
        specular: '#ffff00',
        roughness: 0.2,
        metalness: 0.9,
        pattern: 'metal', 
        emoji: '🪙' 
    },
    DIAMOND: { 
        id: 'diamond', 
        name: '钻石', 
        color: '#b9f2ff', 
        specular: '#ffffff',
        roughness: 0.1,
        metalness: 0.0,
        emissive: '#88ccff',
        pattern: 'gem', 
        emoji: '💎' 
    },
    OBSIDIAN: { 
        id: 'obsidian', 
        name: '黑曜石', 
        color: '#2a1e1e', 
        specular: '#4a3a3a',
        roughness: 0.3,
        metalness: 0.4,
        pattern: 'stone', 
        emoji: '⚫' 
    }
};

// ==================== 增强纹理生成器 ====================
class EnhancedTextureGenerator {
    constructor() {
        this.cache = new Map();
    }
    
    createBlockTexture(item, type) {
        const key = `${item.id}-${type}`;
        
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

        // 添加法线贴图效果（通过阴影）
        this.addShading(ctx, item);
        
        // 根据类型添加特殊纹理
        switch (item.pattern) {
            case 'grass':
                this.addGrassTexture(ctx, item);
                break;
            case 'stone':
                this.addStoneTexture(ctx, item);
                break;
            case 'wood':
                this.addWoodTexture(ctx, item);
                break;
            case 'leaf':
                this.addLeafTexture(ctx, item);
                break;
            case 'brick':
                this.addBrickTexture(ctx, item);
                break;
            case 'metal':
                this.addMetalTexture(ctx, item);
                break;
            case 'gem':
                this.addGemTexture(ctx, item);
                break;
            default:
                this.addDefaultTexture(ctx, item);
        }

        // 添加环境光遮蔽效果
        this.addAmbientOcclusion(ctx);
        
        // 添加边缘高光
        this.addEdgeHighlight(ctx, item);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        this.cache.set(key, texture);
        return texture;
    }
    
    addShading(ctx, item) {
        // 添加上下渐变模拟光照
        const gradient = ctx.createLinearGradient(0, 0, 0, 64);
        gradient.addColorStop(0, this.lightenColor(item.color, 30));
        gradient.addColorStop(0.5, item.color);
        gradient.addColorStop(1, this.darkenColor(item.color, 30));
        
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillRect(0, 0, 64, 64);
        ctx.globalCompositeOperation = 'source-over';
    }
    
    addGrassTexture(ctx, item) {
        // 草地纹理 - 随机绿色斑点
        for (let i = 0; i < 100; i++) {
            const x = Math.floor(Math.random() * 60) + 2;
            const y = Math.floor(Math.random() * 60) + 2;
            const size = Math.random() * 4 + 2;
            
            ctx.fillStyle = this.lightenColor('#3a5e3a', Math.random() * 20);
            ctx.beginPath();
            ctx.arc(x, y, size/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 添加小草
            ctx.strokeStyle = '#2a4a2a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
    
    addStoneTexture(ctx, item) {
        // 石头纹理 - 随机裂纹和斑点
        ctx.fillStyle = this.darkenColor(item.color, 20);
        for (let i = 0; i < 30; i++) {
            const x = Math.floor(Math.random() * 60) + 2;
            const y = Math.floor(Math.random() * 60) + 2;
            ctx.fillRect(x, y, 4, 4);
        }
        
        // 添加裂纹
        ctx.strokeStyle = this.darkenColor(item.color, 40);
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 64, Math.random() * 64);
            ctx.lineTo(Math.random() * 64, Math.random() * 64);
            ctx.stroke();
        }
    }
    
    addWoodTexture(ctx, item) {
        // 木头纹理 - 年轮
        ctx.strokeStyle = this.darkenColor(item.color, 30);
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.ellipse(32, 32, 20 - i * 3, 30 - i * 4, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 添加木纹线条
        ctx.strokeStyle = this.lightenColor(item.color, 20);
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(10 + i * 5, 0);
            ctx.lineTo(10 + i * 5, 64);
            ctx.stroke();
        }
    }
    
    addLeafTexture(ctx, item) {
        // 树叶纹理 - 半透明斑点
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * 60) + 2;
            const y = Math.floor(Math.random() * 60) + 2;
            
            ctx.fillStyle = this.lightenColor(item.color, Math.random() * 30);
            ctx.beginPath();
            ctx.ellipse(x, y, 3, 5, Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
    
    addBrickTexture(ctx, item) {
        // 砖块纹理
        ctx.fillStyle = this.darkenColor(item.color, 15);
        
        // 绘制砖缝
        ctx.fillRect(0, 20, 64, 2);
        ctx.fillRect(0, 40, 64, 2);
        
        ctx.fillStyle = this.lightenColor(item.color, 15);
        ctx.fillRect(30, 0, 2, 20);
        ctx.fillRect(30, 22, 2, 18);
        ctx.fillRect(30, 42, 2, 22);
    }
    
    addMetalTexture(ctx, item) {
        // 金属纹理 - 光泽效果
        const gradient = ctx.createLinearGradient(0, 0, 64, 64);
        gradient.addColorStop(0, this.lightenColor(item.color, 40));
        gradient.addColorStop(0.3, item.color);
        gradient.addColorStop(0.6, this.darkenColor(item.color, 30));
        gradient.addColorStop(1, this.lightenColor(item.color, 20));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        // 添加划痕
        ctx.strokeStyle = this.lightenColor(item.color, 30);
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 64, Math.random() * 64);
            ctx.lineTo(Math.random() * 64, Math.random() * 64);
            ctx.stroke();
        }
    }
    
    addGemTexture(ctx, item) {
        // 宝石纹理 - 发光效果
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, this.lightenColor(item.color, 50));
        gradient.addColorStop(0.3, item.color);
        gradient.addColorStop(0.6, this.darkenColor(item.color, 30));
        gradient.addColorStop(1, this.darkenColor(item.color, 50));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        // 添加闪光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(20, 10);
        ctx.lineTo(15, 5);
        ctx.fill();
    }
    
    addDefaultTexture(ctx, item) {
        // 默认纹理 - 简单噪点
        for (let i = 0; i < 50; i++) {
            const x = Math.floor(Math.random() * 60) + 2;
            const y = Math.floor(Math.random() * 60) + 2;
            
            ctx.fillStyle = this.lightenColor(item.color, Math.random() * 30);
            ctx.fillRect(x, y, 2, 2);
        }
    }
    
    addAmbientOcclusion(ctx) {
        // 添加边缘暗角
        const gradient = ctx.createRadialGradient(32, 32, 20, 32, 32, 40);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
        
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(0, 0, 64, 64);
        ctx.globalCompositeOperation = 'source-over';
    }
    
    addEdgeHighlight(ctx, item) {
        // 添加边缘高光
        ctx.strokeStyle = this.lightenColor(item.color, 30);
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, 63, 63);
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R>0?R<255?R:255:0)*0x10000 + (G>0?G<255?G:255:0)*0x100 + (B>0?B<255?B:255:0)).toString(16).slice(1);
    }
}

// ==================== 增强光照系统 ====================
class EnhancedLighting {
    constructor(scene) {
        this.scene = scene;
        this.time = 0;
        this.lights = {};
        
        this.initLights();
    }
    
    initLights() {
        // 环境光 - 基础照明
        this.lights.ambient = new THREE.AmbientLight(0x404060, CONFIG.AMBIENT_INTENSITY);
        this.scene.add(this.lights.ambient);
        
        // 主光源 - 太阳
        this.lights.sun = new THREE.DirectionalLight(0xfff5d1, CONFIG.SUN_INTENSITY);
        this.lights.sun.position.set(50, 50, 50);
        this.lights.sun.castShadow = true;
        this.lights.sun.receiveShadow = true;
        
        // 阴影配置
        this.lights.sun.shadow.mapSize.width = CONFIG.SHADOW_MAP_SIZE;
        this.lights.sun.shadow.mapSize.height = CONFIG.SHADOW_MAP_SIZE;
        this.lights.sun.shadow.camera.near = 0.5;
        this.lights.sun.shadow.camera.far = 200;
        this.lights.sun.shadow.camera.left = -50;
        this.lights.sun.shadow.camera.right = 50;
        this.lights.sun.shadow.camera.top = 50;
        this.lights.sun.shadow.camera.bottom = -50;
        this.lights.sun.shadow.bias = -0.0005;
        
        this.scene.add(this.lights.sun);
        
        // 辅助点光源 - 创建立体感
        this.lights.fill1 = new THREE.PointLight(0x4466aa, 0.3);
        this.lights.fill1.position.set(-20, 10, -20);
        this.scene.add(this.lights.fill1);
        
        this.lights.fill2 = new THREE.PointLight(0xaa6644, 0.2);
        this.lights.fill2.position.set(20, 5, 20);
        this.scene.add(this.lights.fill2);
        
        // 背光
        this.lights.back = new THREE.DirectionalLight(0x5577aa, 0.2);
        this.lights.back.position.set(-10, 0, -20);
        this.scene.add(this.lights.back);
        
        // 添加体积光效果（使用点光源）
        this.lights.volume = new THREE.PointLight(0x88aaff, 0.1);
        this.lights.volume.position.set(0, 30, 0);
        this.scene.add(this.lights.volume);
        
        // 添加可见光源（用于效果）
        this.addVisibleSun();
    }
    
    addVisibleSun() {
        // 创建一个可见的太阳球体
        const sunGeometry = new THREE.SphereGeometry(2, 16, 16);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa33,
            emissive: 0xff5500
        });
        this.lights.sunSphere = new THREE.Mesh(sunGeometry, sunMaterial);
        this.lights.sunSphere.position.set(50, 50, 50);
        this.scene.add(this.lights.sunSphere);
    }
    
    update(delta) {
        // 更新时间
        this.time += delta * CONFIG.TIME_SPEED;
        
        // 模拟太阳运动
        const radius = 80;
        const angle = this.time;
        
        // 计算太阳位置
        const sunX = Math.sin(angle) * radius;
        const sunY = Math.cos(angle) * radius + 20;
        const sunZ = Math.cos(angle) * radius;
        
        this.lights.sun.position.set(sunX, sunY, sunZ);
        this.lights.sunSphere.position.set(sunX, sunY, sunZ);
        
        // 根据太阳高度调整光照强度
        const heightFactor = Math.max(0, (sunY + 20) / 100);
        this.lights.sun.intensity = CONFIG.SUN_INTENSITY * heightFactor;
        
        // 调整环境光颜色模拟日出日落
        if (sunY < 30) {
            // 日出/日落效果
            this.lights.sun.color.setHSL(0.08, 1, 0.5);
            this.lights.ambient.color.setHSL(0.05, 0.5, 0.1);
        } else {
            // 白天效果
            this.lights.sun.color.setHSL(0.1, 1, 0.7);
            this.lights.ambient.color.setHSL(0.6, 0.3, 0.3);
        }
    }
}

// ==================== 增强方块管理器 ====================
class EnhancedBlockManager {
    constructor(scene, textureGen) {
        this.scene = scene;
        this.textureGen = textureGen;
        this.blocks = new Map();
        this.blockMeshes = new Map();
        this.materialCache = new Map();
    }
    
    getKey(x, y, z) {
        return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
    }
    
    getMaterial(item) {
        if (this.materialCache.has(item.id)) {
            return this.materialCache.get(item.id);
        }
        
        const material = new THREE.MeshStandardMaterial({
            map: this.textureGen.createBlockTexture(item, 'albedo'),
            roughness: item.roughness || 0.5,
            metalness: item.metalness || 0.1,
            emissive: item.emissive ? new THREE.Color(item.emissive) : 0x000000,
            emissiveIntensity: item.emissive ? CONFIG.EMISSIVE_INTENSITY : 0,
            transparent: item.transparent || false,
            opacity: item.opacity || 1,
            emissive: item.emissive ? new THREE.Color(item.emissive) : 0x000000,
            emissiveIntensity: 0.5
        });
        
        this.materialCache.set(item.id, material);
        return material;
    }
    
    createBlock(x, y, z, type) {
        const key = this.getKey(x, y, z);
        
        if (this.blocks.has(key)) {
            return null;
        }
        
        const item = Object.values(ItemTypes).find(i => i.id === type) || ItemTypes.STONE;
        const material = this.getMaterial(item);
        
        // 创建带有细节的几何体
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // 为某些方块添加边缘圆角效果
        if (item.id === 'glass' || item.id === 'diamond') {
            geometry.vertices.forEach(v => {
                v.x *= 0.98;
                v.y *= 0.98;
                v.z *= 0.98;
            });
        }
        
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        
        // 添加随机旋转增加细节
        if (item.id === 'wood' || item.id === 'leaf') {
            block.rotation.y = Math.random() * Math.PI;
        }
        
        this.scene.add(block);
        this.blocks.set(key, { x, y, z, type, mesh: block, item });
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
            
            // 可选：延迟清理材质
            setTimeout(() => {
                block.mesh.geometry.dispose();
            }, 100);
            
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

// ==================== 粒子效果系统 ====================
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }
    
    createBlockBreakEffect(x, y, z, color) {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i*3] = x + (Math.random() - 0.5);
            positions[i*3+1] = y + (Math.random() - 0.5);
            positions[i*3+2] = z + (Math.random() - 0.5);
            
            const c = new THREE.Color(color);
            colors[i*3] = c.r;
            colors[i*3+1] = c.g;
            colors[i*3+2] = c.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({ 
            size: 0.1, 
            vertexColors: true,
            map: this.createParticleTexture()
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        // 动画
        const velocities = [];
        for (let i = 0; i < particleCount; i++) {
            velocities.push({
                x: (Math.random() - 0.5) * 0.1,
                y: Math.random() * 0.1,
                z: (Math.random() - 0.5) * 0.1
            });
        }
        
        let age = 0;
        const animate = () => {
            age += 0.016;
            if (age > 1) {
                this.scene.remove(particles);
                return;
            }
            
            const positions = particles.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                positions[i*3] += velocities[i].x;
                positions[i*3+1] += velocities[i].y;
                positions[i*3+2] += velocities[i].z;
                velocities[i].y -= 0.005;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            particles.material.opacity = 1 - age;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(4, 4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        return new THREE.CanvasTexture(canvas);
    }
}

// ==================== 增强玩家管理器 ====================
class EnhancedPlayerManager {
    constructor(scene, textureGen) {
        this.scene = scene;
        this.textureGen = textureGen;
        this.players = new Map();
    }
    
    createPlayer(playerData) {
        const group = new THREE.Group();
        
        // 身体 - 使用标准材质
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: playerData.color,
            roughness: 0.4,
            metalness: 0.1,
            emissive: 0x000000
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // 头 - 带光照的皮肤材质
        const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const headMat = new THREE.MeshStandardMaterial({ 
            color: '#ffdbac',
            roughness: 0.3,
            emissive: 0x000000
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.5;
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);
        
        // 眼睛
        const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: '#000000' });
        
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 1.6, 0.4);
        leftEye.castShadow = true;
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 1.6, 0.4);
        rightEye.castShadow = true;
        group.add(rightEye);
        
        // 手臂
        const armGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
        const armMat = new THREE.MeshStandardMaterial({ 
            color: playerData.color,
            roughness: 0.4 
        });
        
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.6, 0.9, 0);
        leftArm.castShadow = true;
        leftArm.receiveShadow = true;
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.6, 0.9, 0);
        rightArm.castShadow = true;
        rightArm.receiveShadow = true;
        group.add(rightArm);
        
        // 腿
        const legGeo = new THREE.BoxGeometry(0.3, 1.0, 0.3);
        const legMat = new THREE.MeshStandardMaterial({ 
            color: '#4a4a4a',
            roughness: 0.6 
        });
        
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.25, 0.2, 0);
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.25, 0.2, 0);
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        group.add(rightLeg);
        
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
            
            // 添加行走动画
            if (data.moving) {
                const time = Date.now() * 0.01;
                player.children[2].rotation.x = Math.sin(time) * 0.2; // 左臂
                player.children[3].rotation.x = Math.sin(time + Math.PI) * 0.2; // 右臂
                player.children[4].rotation.x = Math.sin(time + Math.PI) * 0.2; // 左腿
                player.children[5].rotation.x = Math.sin(time) * 0.2; // 右腿
            }
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

// ==================== 增强游戏主类 ====================
class EnhancedMultiplayerGame {
    constructor() {
        this.textureGen = new EnhancedTextureGenerator();
        this.lighting = null;
        this.blockManager = null;
        this.playerManager = null;
        this.particleSystem = null;
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
            { type: 'gold', count: 64 },
            { type: 'diamond', count: 64 },
            { type: 'obsidian', count: 64 }
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
        this.initWorld();
        this.initWebSocket();
        this.initEventListeners();
        this.updateHotbarDisplay();
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 30, 100);

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
        
        // 初始化光照系统
        this.lighting = new EnhancedLighting(this.scene);
        
        // 初始化粒子系统
        this.particleSystem = new ParticleSystem(this.scene);
        
        // 初始化管理器
        this.blockManager = new EnhancedBlockManager(this.scene, this.textureGen);
        this.playerManager = new EnhancedPlayerManager(this.scene, this.textureGen);
        
        // 添加环境效果
        this.addSkyEffects();
    }
    
    addSkyEffects() {
        // 添加云朵
        const cloudGeometry = new THREE.BufferGeometry();
        const cloudCount = 50;
        const cloudPositions = new Float32Array(cloudCount * 3);
        
        for (let i = 0; i < cloudCount; i++) {
            cloudPositions[i*3] = (Math.random() - 0.5) * 200;
            cloudPositions[i*3+1] = 30 + Math.random() * 20;
            cloudPositions[i*3+2] = (Math.random() - 0.5) * 200;
        }
        
        cloudGeometry.setAttribute('position', new THREE.BufferAttribute(cloudPositions, 3));
        
        const cloudMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 5,
            transparent: true,
            opacity: 0.4,
            blending: THREE.NormalBlending,
            map: this.createCloudTexture()
        });
        
        this.clouds = new THREE.Points(cloudGeometry, cloudMaterial);
        this.scene.add(this.clouds);
    }
    
    createCloudTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#eeeeee';
        ctx.beginPath();
        ctx.arc(24, 16, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(8, 16, 8, 0, Math.PI * 2);
        ctx.fill();
        
        return new THREE.CanvasTexture(canvas);
    }

    initWorld() {
        // 世界生成将由服务器处理
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
                
                // 设置玩家位置
                const myPlayer = data.players.find(p => p.id === this.clientId);
                if (myPlayer) {
                    this.camera.position.set(myPlayer.x, myPlayer.y + CONFIG.PLAYER_HEIGHT, myPlayer.z);
                    this.yaw = myPlayer.rotation;
                }
                
                // 创建其他玩家
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
                    const moving = data.x !== this.lastX || data.z !== this.lastZ;
                    this.playerManager.updatePlayer(data.clientId, {
                        x: data.x,
                        y: data.y,
                        z: data.z,
                        rotation: data.rotation,
                        moving: moving
                    });
                    this.lastX = data.x;
                    this.lastZ = data.z;
                }
                break;
                
            case 'blockPlaced':
                this.blockManager.createBlock(data.x, data.y, data.z, data.blockType);
                break;
                
            case 'blockRemoved':
                const block = this.blockManager.getBlock(data.x, data.y, data.z);
                if (block && block.item) {
                    this.particleSystem.createBlockBreakEffect(data.x, data.y, data.z, block.item.color);
                }
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
                    // 粒子效果
                    this.particleSystem.createBlockBreakEffect(hitBlock.x, hitBlock.y, hitBlock.z, hitBlock.item.color);
                    
                    this.blockManager.removeBlock(hitBlock.x, hitBlock.y, hitBlock.z);
                    
                    // 添加到物品栏
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
            
            // 跳跃粒子效果
            this.particleSystem.createBlockBreakEffect(
                this.camera.position.x, 
                this.camera.position.y - 1, 
                this.camera.position.z, 
                '#ffffff'
            );
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
        
        let moving = false;
        
        if (moveX !== 0 || moveZ !== 0) {
            moving = true;
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
                rotation: this.yaw,
                moving: moving
            }));
            this.lastMoveTime = now;
        }

        // 更新坐标显示
        document.getElementById('coordinates').textContent = 
            `${Math.round(this.camera.position.x)}, ${Math.round(this.camera.position.y - CONFIG.PLAYER_HEIGHT)}, ${Math.round(this.camera.position.z)}`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        
        // 更新光照
        if (this.lighting) {
            this.lighting.update(delta);
        }
        
        // 移动云朵
        if (this.clouds) {
            this.clouds.rotation.y += 0.0001;
        }
        
        // 游戏逻辑
        this.handleMovement();

        // 渲染
        this.renderer.render(this.scene, this.camera);
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new EnhancedMultiplayerGame();
});
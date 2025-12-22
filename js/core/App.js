import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputManager } from '../inputs/InputManager.js';
import { CONFIG } from '../config.js';
import { STATE } from '../state.js';
import { AssetFactory } from '../utils/AssetFactory.js';
import { Particle } from '../entities/Particle.js';
import { VisionManager } from '../vision/VisionManager.js';

export class App {
    constructor() {
        this.container = document.body;
        this.particles = [];
        this.photos = [];
        
        this.inputManager = null;
        this.setupThree();
        this.createWorld();
        this.setupInputs();
        this.vision = new VisionManager(this.handleGesture.bind(this));
        this.setupModeSwitch();
        
        // Start loading sequence
        this.init();
    }

    async init() {
        await this.vision.init();
        // Add default photo
        this.addPhoto(AssetFactory.createDefaultPhoto());
        
        // Hide loader
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = 0;
            setTimeout(() => loader.remove(), 1000);
        }
        
        STATE.isLoaded = true;
        this.animate();
    }

    setupThree() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.renderer.toneMappingExposure = 2.2;
        this.container.appendChild(this.renderer.domElement);

        // Scene & Camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 2, 50);

        // Environment
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const centerLight = new THREE.PointLight(0xffaa00, 2, 50);
        this.scene.add(centerLight);

        const spotGold = new THREE.SpotLight(CONFIG.colors.gold, 1200);
        spotGold.position.set(30, 40, 40);
        spotGold.angle = 0.5;
        spotGold.penumbra = 0.5;
        this.scene.add(spotGold);

        const spotBlue = new THREE.SpotLight(0x4444ff, 600);
        spotBlue.position.set(-30, 20, -30);
        this.scene.add(spotBlue);

        // Post Processing
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0.7;
        bloomPass.strength = 0.45;
        bloomPass.radius = 0.4;
        this.composer.addPass(bloomPass);
        
        this.composer.addPass(new OutputPass()); // Handles color space conversion
    }

    createWorld() {
        this.mainGroup = new THREE.Group();
        this.scene.add(this.mainGroup);

        // 1. 创建星星 (保持之前的封装)
        this.createStar();

        // 2. 准备几何体 (Shared Geometries)
        const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
        
        // 拐杖糖几何体
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0.5, 0),
            new THREE.Vector3(0.2, 0.8, 0), new THREE.Vector3(0.5, 0.6, 0)
        ]);
        const caneGeo = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);

        // 3. 准备材质 (Materials) - 拆分为独立变量
        const goldMat = new THREE.MeshStandardMaterial({ 
            color: CONFIG.colors.gold, metalness: 0.8, roughness: 0.2 
        });
        const greenMat = new THREE.MeshStandardMaterial({ 
            color: CONFIG.colors.green, roughness: 0.8 
        });
        const redMat = new THREE.MeshPhysicalMaterial({ 
            color: CONFIG.colors.red, metalness: 0.1, roughness: 0.1, clearcoat: 1.0 
        });
        const caneMat = new THREE.MeshStandardMaterial({ 
            map: AssetFactory.createCandyCaneTexture(),
            roughness: 0.3, metalness: 0.1 
        });

        // 4. [核心修改] 批量生成函数
        const createBatch = (count, geometry, material, type) => {
            for (let i = 0; i < count; i++) {
                const mesh = new THREE.Mesh(geometry, material);
                
                // 初始随机位置 (用于 scatter 状态或初始散落)
                mesh.position.set(
                    (Math.random() - 0.5) * 50, 
                    (Math.random() - 0.5) * 50, 
                    (Math.random() - 0.5) * 50
                );
                
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                this.mainGroup.add(mesh);
                // 传入 type 以便 Particle 类可能有特殊处理 (如 'CANE' 或 'ORNAMENT')
                this.particles.push(new Particle(mesh, type));
            }
        };

        // 5. 根据配置生成各类粒子
        const counts = CONFIG.particles.counts;
        createBatch(counts.gold, boxGeo, goldMat, 'ORNAMENT'); // 金色方块
        createBatch(counts.green, boxGeo, greenMat, 'ORNAMENT'); // 绿色方块
        createBatch(counts.red, sphereGeo, redMat, 'ORNAMENT'); // 红色圆球
        createBatch(counts.cane, caneGeo, caneMat, 'CANE');     // 拐杖糖

        // 6. 创建灰尘 (Dust Particles) - 保持原逻辑
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = [];
        for(let i=0; i < CONFIG.particles.dustCount; i++) {
            dustPos.push((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
        }
        dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
        const dustMat = new THREE.PointsMaterial({ 
            color: CONFIG.colors.gold, size: 0.1, transparent: true, opacity: 0.6 
        });
        const dustSystem = new THREE.Points(dustGeo, dustMat);
        this.scene.add(dustSystem);
        this.dustSystem = dustSystem;

        this.inputManager = new InputManager(
            this.camera, 
            this.scene, 
            this.mainGroup, 
            this.particles // 将粒子数组传过去做点击检测
        );
    }

    setupModeSwitch() {
        const toggle = document.getElementById('mode-toggle');
        const statusText = document.getElementById('status-text');
        
        // 默认状态设置 (Mouse)
        toggle.checked = false; 
        STATE.inputMode = 'MOUSE';
        statusText.innerText = "MODE: MOUSE / TOUCH";

        toggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                STATE.inputMode = 'HAND';
                statusText.innerText = "INITIALIZING CAMERA...";
                // 只有切换到 Hand 模式才去激活摄像头，节省性能
                if (!this.vision.isActive) {
                    this.vision.init().then(success => {
                        if(success) this.vision.isActive = true;
                    });
                }
            } else {
                STATE.inputMode = 'MOUSE';
                statusText.innerText = "MODE: MOUSE / TOUCH";
                // 摄像头不需要关闭，但我们会忽略它的数据
            }
        });
    }

    // [新增] 独立的创建星星方法
    createStar() {
        // 1. 从配置读取参数
        const { outerRadius, innerRadius, thickness, bevelSize, bevelThickness } = CONFIG.star;

        const starShape = new THREE.Shape();
        const points = 5;

        // 绘制五角星路径
        for (let i = 0; i < points * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            // 计算角度
            const a = (i / points) * Math.PI; 
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) starShape.moveTo(x, y);
            else starShape.lineTo(x, y);
        }
        starShape.closePath();

        // 2. 挤压设置 (让它变圆润的关键)
        const extrudeSettings = {
            steps: 1,
            depth: thickness,
            bevelEnabled: true, 
            bevelThickness: bevelThickness, // [配置] 控制侧面圆弧深度
            bevelSize: bevelSize,           // [配置] 控制向外膨胀程度
            bevelSegments: 10               // [硬编码] 增加分段数，让圆角非常光滑，不再有棱角感
        };
        const starGeo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);

        // 3. 材质 (自发光)
        const starMat = new THREE.MeshStandardMaterial({ 
            color: CONFIG.colors.gold,      
            emissive: CONFIG.colors.gold,   
            emissiveIntensity: 1.0,         
            metalness: 0.9,
            roughness: 0.1,
        });

        this.starMesh = new THREE.Mesh(starGeo, starMat);
        
        // 4. 放置位置与旋转修正
        const topY = CONFIG.particles.treeHeight / 2 + 0.9;
        this.starMesh.position.set(0, topY, 0); 
        
        // [修复倒置] 
        // 几何体生成时可能是倒着的，绕 Z 轴旋转 180 度 (PI) 即可摆正
        this.starMesh.rotation.z = Math.PI*20/180; 
        
        // 5. 添加到场景
        this.mainGroup.add(this.starMesh);
        
        // 6. 伴随光源
        const starLight = new THREE.PointLight(CONFIG.colors.gold, 5, 20);
        starLight.position.set(0, topY, 1);
        this.mainGroup.add(starLight);
    }

    addPhoto(texture) {
        // Photo Frame
        const frameGeo = new THREE.BoxGeometry(3, 3, 0.1);
        const frameMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.gold, metalness: 0.9, roughness: 0.1 });
        const photoMat = new THREE.MeshBasicMaterial({ map: texture });
        
        const mesh = new THREE.Mesh(frameGeo, [
            frameMat, frameMat, frameMat, frameMat, photoMat, frameMat
        ]); // Face 4 is front Z+

        mesh.position.set(0,0,0);
        this.mainGroup.add(mesh);
        
        const p = new Particle(mesh, 'PHOTO');
        this.particles.push(p);
        this.photos.push(mesh);
    }

    handleGesture(type) {
        if (!STATE.isLoaded) return;
        
        const st = document.getElementById('status-text');
        
        if (type === 'FIST') {
            if (STATE.mode !== CONFIG.modes.TREE) {
                STATE.mode = CONFIG.modes.TREE;
                st.innerText = "MODE: CHRISTMAS TREE";
            }
        } else if (type === 'OPEN') {
            if (STATE.mode !== CONFIG.modes.SCATTER) {
                STATE.mode = CONFIG.modes.SCATTER;
                st.innerText = "MODE: SCATTER STARS";
            }
        } else if (type === 'PINCH') {
            if (STATE.mode !== CONFIG.modes.FOCUS && this.photos.length > 0) {
                STATE.mode = CONFIG.modes.FOCUS;
                // Select random photo
                this.photos.forEach(p => p.userData.isFocusTarget = false);
                const target = this.photos[Math.floor(Math.random() * this.photos.length)];
                target.userData.isFocusTarget = true;
                st.innerText = "MODE: MEMORY FOCUS";
            }
        }
    }

    setupInputs() {
        // File Upload
        const input = document.getElementById('file-input');
        input.addEventListener('change', (e) => {
            if(e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    new THREE.TextureLoader().load(ev.target.result, (t) => {
                        t.colorSpace = THREE.SRGBColorSpace;
                        this.addPhoto(t);
                    });
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        // H Key to hide
        window.addEventListener('keydown', (e) => {
            if(e.key.toLowerCase() === 'h') {
                document.getElementById('ui-container').classList.toggle('ui-hidden');
            }
        });

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const time = performance.now() * 0.001;
        const dt = 0.016;

        // [修改] 视觉识别只有在 HAND 模式下才运行
        if (STATE.inputMode === 'HAND') {
            this.vision.detect();
            // ... 原有的根据手势旋转 mainGroup 的逻辑 ...
            if (STATE.hand.present) {
                const targetRotY = (STATE.hand.x - 0.5) * 2;
                const targetRotX = (STATE.hand.y - 0.5) * 1; 
                this.mainGroup.rotation.y = THREE.MathUtils.lerp(this.mainGroup.rotation.y, targetRotY, 0.1);
                this.mainGroup.rotation.x = THREE.MathUtils.lerp(this.mainGroup.rotation.x, targetRotX, 0.1);
            }
        } else {
            // MOUSE 模式：InputManager 已经在处理事件回调了
            // 这里只需要处理自动空闲旋转 (可选)
            if (!this.inputManager.isDragging && STATE.mode === CONFIG.modes.TREE) {
                this.mainGroup.rotation.y += 0.001; // 缓慢自转
            }
        }

        // 粒子更新逻辑 (这部分不需要变，Particle.js 会根据 STATE.mode 自动处理)
        this.particles.forEach(p => p.update(dt, time));

        if(this.dustSystem) {
            this.dustSystem.rotation.y = -time * 0.05;
        }

        this.composer.render();
    }
}
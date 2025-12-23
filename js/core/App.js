import * as THREE from 'three';
import { QUOTES } from '../data/quotes.js';
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
        // 1. 隐藏 Loading (移到这里，确保无论摄像头成功与否都会执行)
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = 0;
            setTimeout(() => loader.remove(), 1000);
        }
        
        // 2. 绑定开始按钮
        const startBtn = document.getElementById('start-btn');
        const overlay = document.getElementById('instruction-overlay');
        
        if (startBtn && overlay) {
            startBtn.addEventListener('click', () => {
                overlay.style.opacity = 0;
                overlay.style.pointerEvents = 'none';
                setTimeout(() => overlay.remove(), 1500); 
            });

            // 延迟浮现
            setTimeout(() => {
                // [核心修复 2] 配合 display: none 使用
                overlay.style.display = 'flex'; // 先把它摆出来
                
                // 强制浏览器重绘 (Reflow)，确保 opacity 动画能触发
                void overlay.offsetWidth; 
                
                overlay.style.opacity = 1;
                overlay.style.pointerEvents = 'auto';
            }, 2500);
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
        // [核心修改 1] 初始相机位置：放得非常远和高，制造宏大的入场感
        // this.camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 200);
        // this.camera.position.set(0, 60, 120); // <--- 起始位置
        // this.camera.lookAt(0, 15, 0);

        // Environment
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.1);
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
    // setupThree() {
    //     // Renderer
    //     this.renderer = new THREE.WebGLRenderer({ antialias: true });
    //     this.renderer.setSize(window.innerWidth, window.innerHeight);
    //     this.renderer.setPixelRatio(window.devicePixelRatio);
    //     this.renderer.toneMapping = THREE.ReinhardToneMapping;
        
    //     // [修改] 从配置读取曝光度
    //     this.renderer.toneMappingExposure = CONFIG.lighting.exposure;
        
    //     this.container.appendChild(this.renderer.domElement);

    //     // Scene
    //     this.scene = new THREE.Scene();
    //     this.scene.background = new THREE.Color(0x000000);
    //     this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

    //     this.camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 200);
    //     this.camera.position.set(0, 2, 50);

    //     // [已删除] RoomEnvironment (为了宝石质感必须删除)

    //     // Lighting ==========================================
        
    //     // 1. 环境光
    //     const ambient = new THREE.AmbientLight(
    //         CONFIG.lighting.ambient.color, 
    //         CONFIG.lighting.ambient.intensity
    //     );
    //     this.scene.add(ambient);

    //     // 2. 中心暖光
    //     const centerLight = new THREE.PointLight(
    //         CONFIG.lighting.center.color, 
    //         CONFIG.lighting.center.intensity, 
    //         CONFIG.lighting.center.distance
    //     );
    //     this.scene.add(centerLight);

    //     // 3. 金色聚光灯 (主光)
    //     const cfgGold = CONFIG.lighting.spotGold;
    //     const spotGold = new THREE.SpotLight(CONFIG.colors.gold, cfgGold.intensity);
    //     spotGold.position.set(cfgGold.x, cfgGold.y, cfgGold.z);
    //     spotGold.angle = cfgGold.angle;
    //     spotGold.penumbra = cfgGold.penumbra;
    //     this.scene.add(spotGold);

    //     // 4. 蓝色聚光灯 (辅光)
    //     const cfgBlue = CONFIG.lighting.spotBlue;
    //     const spotBlue = new THREE.SpotLight(CONFIG.colors.blueLight, cfgBlue.intensity);
    //     spotBlue.position.set(cfgBlue.x, cfgBlue.y, cfgBlue.z);
    //     this.scene.add(spotBlue);

    //     // Post Processing (保持不变)
    //     this.composer = new EffectComposer(this.renderer);
    //     this.composer.addPass(new RenderPass(this.scene, this.camera));
        
    //     const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    //     bloomPass.threshold = 0.7;
    //     bloomPass.strength = 0.45;
    //     bloomPass.radius = 0.4;
    //     this.composer.addPass(bloomPass);
        
    //     this.composer.addPass(new OutputPass());
    // }

    createWorld() {
        this.mainGroup = new THREE.Group();
        this.scene.add(this.mainGroup);

        // 1. 创建星星 (保持之前的封装)
        this.createStar();
        // this.createRibbon(); // 光带

        // 2. 准备几何体 (Shared Geometries)
        const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const gemGeo = new THREE.OctahedronGeometry(0.3, 0);  // 四面体
        const goldGeo = new THREE.DodecahedronGeometry(0.35, 0); // 十二面体
        //const goldGeo = new THREE.IcosahedronGeometry(0.35, 0);  // 二十面体
        const bulbGeo = new THREE.SphereGeometry(0.25, 16, 16);

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
        const gemMat = new THREE.MeshStandardMaterial({
            // color: CONFIG.colors.ice,   // 冰蓝色
            color: 0xffffff,
            metalness: 0.8,             // 极高的金属感反射
            roughness: 0.2,             // 极低的粗糙度 (参考工程是0.3，0.1会更像宝石)
            // emissive: 0x001133,         // 微弱的深蓝自发光，增加通透感
            // emissiveIntensity: 0.5
        });
        const bulbMat = new THREE.MeshStandardMaterial({ 
            color: CONFIG.colors.warmWhite, 
            emissive: CONFIG.colors.warmWhite,
            emissiveIntensity: 0.8, // 强度高一点，制造发光感
            roughness: 0.4,
            metalness: 0.0
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
        createBatch(counts.gold, goldGeo, goldMat, 'ORNAMENT');
        createBatch(counts.green, boxGeo, greenMat, 'ORNAMENT'); // 绿色方块
        createBatch(counts.red, sphereGeo, redMat, 'ORNAMENT'); // 红色圆球
        createBatch(counts.cane, caneGeo, caneMat, 'CANE');     // 拐杖糖
        createBatch(counts.gem, gemGeo, gemMat, 'GEM');
        createBatch(counts.bulb, bulbGeo, bulbMat, 'BULB');

        this.createCards();

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

        // ===========================
        // [新增] 飘雪系统 (Snow System)
        // ===========================
        const snowConfig = CONFIG.particles.snow;
        const snowGeo = new THREE.BufferGeometry();
        const snowPos = [];
        const snowVelocities = []; // 存储每个雪花的下落速度
        const snowPhase = [];      // 存储每个雪花的横向摇摆相位

        for(let i=0; i < snowConfig.count; i++) {
            const range = snowConfig.range;
            // 随机分布在场景中
            const x = (Math.random() - 0.5) * range;
            const y = (Math.random() - 0.5) * range; 
            const z = (Math.random() - 0.5) * range;
            snowPos.push(x, y, z);

            // 速度：基础速度 + 随机差异
            snowVelocities.push(Math.random() * 0.5 + 0.5); 
            // 相位：0 到 2PI，保证摇摆不同步
            snowPhase.push(Math.random() * Math.PI * 2);
        }

        snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPos, 3));
        
        // 我们利用 attributes 把速度和相位存进 geometry (虽然这里用 CPU 动画，存数组也行，但存 attribute 方便管理)
        // 为了方便 CPU 访问，我这里还是直接把数组挂在 geometry 的 userData 上，或者直接作为类属性
        snowGeo.userData = { velocities: snowVelocities, phases: snowPhase };

        const snowMat = new THREE.PointsMaterial({ 
            color: 0xffffff, 
            map: AssetFactory.createSnowTexture(), // 使用刚才写的纹理
            size: snowConfig.size, 
            transparent: true, 
            opacity: 0.8,
            blending: THREE.AdditiveBlending, // 加亮混合，像发光的雪
            depthWrite: false // 关键：防止遮挡产生的黑边问题
        });

        this.snowSystem = new THREE.Points(snowGeo, snowMat);
        this.scene.add(this.snowSystem);

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
        
        // 默认状态
        toggle.checked = false; 
        STATE.inputMode = 'MOUSE';
        statusText.innerText = "MODE: MOUSE / TOUCH";

        toggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                // [核心修改] 用户切换到 HAND 模式了，现在才开始请求权限
                STATE.inputMode = 'HAND';
                statusText.innerText = "INITIALIZING CAMERA...";
                
                // 检查是否已经初始化过
                if (!this.vision.isActive) {
                    try {
                        // 动态请求权限
                        await this.vision.init();
                        this.vision.isActive = true;
                        statusText.innerText = "MODE: HAND GESTURES";
                    } catch (error) {
                        console.error("Camera denied:", error);
                        statusText.innerText = "CAMERA ERROR - CHECK PERMISSIONS";
                        // 失败了就把开关拨回去
                        e.target.checked = false;
                        STATE.inputMode = 'MOUSE';
                        alert("Please allow camera access to use Hand Gestures.");
                    }
                } else {
                    // 已经初始化过了，直接切状态
                    statusText.innerText = "MODE: HAND GESTURES";
                }

            } else {
                // 切回鼠标
                STATE.inputMode = 'MOUSE';
                statusText.innerText = "MODE: MOUSE / TOUCH";
                // 我们不关闭摄像头流，为了下次切换能秒开，但会停止处理数据
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

    createCards() {
        const cardCount = CONFIG.particles.counts.card;
        const cardDims = CONFIG.cardConfig; // { width, height, thickness }
        // 背景色配置表 (对应 AssetFactory 里的 6 种样式)
        // 我们用这些颜色来制作卡片的背面和侧面，做到“表里如一”
        const styleColors = [
            0x0f1215, // 0: Deco (黑金)
            // 0xe6e4dc, // 1: Scroll (米色)
            0x192a40, // 2: Magic (深蓝 - 取渐变中间色)
            // 0xe8e8e8, // 3: Floral (灰白)
            0x222831, // 4: Dark Scroll (深灰)
            0x0f1a15  // 5: Dark Floral (墨绿)
        ];

        // 贺卡几何体 (横版)
        const cardGeo = new THREE.BoxGeometry(cardDims.width, cardDims.height, cardDims.thickness);

        // --- 1. 准备句子队列 (洗牌算法) ---
        // 复制一份引用，避免修改原数据
        let availableQuotes = [...QUOTES];
        
        // Fisher-Yates 洗牌算法
        for (let i = availableQuotes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableQuotes[i], availableQuotes[j]] = [availableQuotes[j], availableQuotes[i]];
        }

        for (let i = 0; i < cardCount; i++) {
            // --- 2. 选取句子 (如果不一够了，就从头循环) ---
            const quoteData = availableQuotes[i % availableQuotes.length];

            // --- 3. 随机分配模板 (0-3) ---
            const styleIndex = Math.floor(Math.random() * 4);

            // --- 4. 生成纹理 ---
            const texture = AssetFactory.createCardTexture(quoteData.text, quoteData.author, styleIndex);

            // --- 5. 创建材质 ---
            // 侧面：纯哑光纸张
            const sideMat = new THREE.MeshStandardMaterial({ 
                color: 0xeeece0, // 米白色纸芯
                roughness: 1.0,  // [修改] 粗糙度拉满，完全不反光
                metalness: 0.0   // [修改] 非金属
            });

            // 正面：印刷品质感
            const faceMat = new THREE.MeshStandardMaterial({ 
                map: texture, 
                roughness: 1.0,      // [修改] 很高粗糙度，像铜版纸或卡纸
                metalness: 0.0,      // [修改] 0 金属度
                emissive: 0x000000,  // [修改] 彻底关掉自发光，只靠灯光照亮
                emissiveIntensity: 0 // 确保不发光
            });

            // 2. [核心修改] 背面与侧面材质 (Back & Side)
            // 直接从配色表中取色，不再是一刀切的白色或黑色
            const bgColor = styleColors[styleIndex];
            const bodyMat = new THREE.MeshStandardMaterial({ 
                color: bgColor, 
                roughness: 1.0, 
                metalness: 0.0 
            });

            // Front 用 faceMat (有字), 其他面全部用 bodyMat (同色系纯色)
            const materials = [bodyMat, bodyMat, bodyMat, bodyMat, faceMat, bodyMat];

            const mesh = new THREE.Mesh(cardGeo, materials);

            // [新增] 进场动画初始化
            // 先把尺寸设为 0
            mesh.scale.set(0, 0, 0);
            
            // 随机位置
            mesh.position.set((Math.random()-0.5)*50, (Math.random()-0.5)*50, (Math.random()-0.5)*50);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            this.mainGroup.add(mesh);
            
            const p = new Particle(mesh, 'CARD');
            
            // [关键] 强制重置 baseScale 为 1.0 (因为刚才 mesh.scale 是 0，Particle 构造函数可能把 baseScale 设为了 0)
            p.baseScale = 1.0; 
            
            this.particles.push(p);
            // // --- 6. 随机位置 ---
            // mesh.position.set((Math.random()-0.5)*50, (Math.random()-0.5)*50, (Math.random()-0.5)*50);
            // mesh.castShadow = true;
            // mesh.receiveShadow = true;

            // this.mainGroup.add(mesh);
            
            // // 加入粒子系统
            // this.particles.push(new Particle(mesh, 'CARD'));
            
            // 标记用于点击聚焦
            mesh.userData.isFocusTarget = false; 
        }
    }

    // [新增] 创建螺旋光带的方法
    createRibbon() {
        const cfg = CONFIG.ribbon;
        if (!cfg.show) return;

        const points = [];
        const heightHalf = cfg.height / 2;
        const count = cfg.segments;

        // 生成螺旋路径点
        for (let i = 0; i <= count; i++) {
            // t 从 0 (底部) 到 1 (顶部)
            const t = i / count;
            
            // 角度：随 t 增加而旋转 turns 圈
            const angle = t * cfg.turns * Math.PI * 2;
            
            // 半径：从底部的宽半径线性插值到顶部的窄半径
            const radius = THREE.MathUtils.lerp(cfg.radiusBottom, cfg.radiusTop, t);
            
            // 高度：从下到上
            const y = THREE.MathUtils.lerp(-heightHalf, heightHalf, t);
            
            // 计算 X 和 Z 坐标
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            
            points.push(new THREE.Vector3(x, y, z));
        }

        // 1. 创建 3D 曲线
        const curve = new THREE.CatmullRomCurve3(points);
        
        // 2. 沿着曲线生成管道几何体
        // TubeGeometry(path, tubularSegments, radius, radialSegments, closed)
        const tubeGeo = new THREE.TubeGeometry(curve, count, cfg.thickness, 8, false);

        // 3. 创建发光材质
        const tubeMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.emissive,
            emissiveIntensity: cfg.intensity, // 高强度发光
            roughness: 0.3,
            metalness: 0.8, // 稍微带点金属质感，反光更好看
            side: THREE.DoubleSide
        });

        this.ribbonMesh = new THREE.Mesh(tubeGeo, tubeMat);
        
        // 光带也可以投射和接收阴影，增加立体感
        this.ribbonMesh.castShadow = true;
        this.ribbonMesh.receiveShadow = true;

        // 将光带加入到 mainGroup，这样它会随着树一起旋转
        this.mainGroup.add(this.ribbonMesh);
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

        // [新增] 绑定刷新按钮
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshWishes();
            });
        }

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // [新增] 刷新贺卡逻辑
    refreshWishes() {
        const cards = this.particles.filter(p => p.type === 'CARD');
        if (cards.length === 0) return;

        // 1. 离场动画
        cards.forEach(p => {
            p.baseScale = 0;
            p.type = 'DYING_CARD';
        });

        // 2. 清理与重生
        setTimeout(() => {
            // 清理 Three.js 资源
            cards.forEach(p => {
                this.mainGroup.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();

                // [核心修复] 正确处理材质数组和纹理清理
                if (p.mesh.material) {
                    // 统一转成数组处理，兼容单个材质和材质数组
                    const materials = Array.isArray(p.mesh.material) ? p.mesh.material : [p.mesh.material];
                    
                    materials.forEach(m => {
                        // 先释放纹理 (如果有)
                        if (m.map) m.map.dispose();
                        // 再释放材质
                        m.dispose();
                    });
                }
            });

            // 过滤数组 (这一步生成了新数组，导致 InputManager 引用失效)
            this.particles = this.particles.filter(p => p.type !== 'DYING_CARD');

            // 生成新卡片
            this.createCards();

            // ===============================================
            // [核心修复] 更新 InputManager 中的粒子列表引用
            // ===============================================
            // 之前因为上面报错崩溃，这一行没执行，所以点不中
            if (this.inputManager) {
                this.inputManager.particles = this.particles;
            }
            
        }, 600);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const time = performance.now() * 0.001;
        const dt = 0.016;

        // // ===========================
        // // [新增] 开场动画逻辑 (Intro Sequence)
        // // ===========================
        // if (STATE.isIntro) {
        //     // 1. 目标位置：(0, 12, 50) 
        //     // y=12 比原来的 y=2 更舒服，正对树干中心
        //     const targetPos = new THREE.Vector3(0, 2, 50);
            
        //     // 2. 运镜速度：0.05 (比之前的 0.02 快一倍多，更加果断)
        //     this.camera.position.lerp(targetPos, 0.04);
            
        //     // 3. [核心修复] 实时跟焦
        //     // 每一帧都让相机盯着树的中心 (高度 15 的位置)
        //     // 这样相机会随着下降自动抬头，解决“看歪/看地”的问题
        //     this.camera.lookAt(0, 15, 0);
            
        //     // 4. 自转展示
        //     this.mainGroup.rotation.y += 0.015;

        //     // 5. [优化] 结束判断
        //     // 放宽阈值到 55 (只要接近了就直接吸附)，避免最后几毫米的漫长等待
        //     if (this.camera.position.z < 55) {
        //         STATE.isIntro = false;
                
        //         // 强制吸附到完美的最终位置
        //         this.camera.position.copy(targetPos);
        //         this.camera.lookAt(0, 15, 0);
        //         this.mainGroup.rotation.y = 0;
                
        //         // 立即显示菜单
        //         const overlay = document.getElementById('instruction-overlay');
        //         if (overlay) overlay.classList.remove('hidden');
        //     }
            
        //     this.composer.render();
        //     return; 
        // }

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
        this.particles.forEach(p => p.update(dt, time, this.camera));

        if(this.dustSystem) {
            this.dustSystem.rotation.y = -time * 0.05;
        }
        
        // ===========================
        // [新增] 雪花动画逻辑
        // ===========================
        if (this.snowSystem) {
            const geo = this.snowSystem.geometry;
            const positions = geo.attributes.position.array;
            const velocities = geo.userData.velocities;
            const phases = geo.userData.phases;
            
            // [新增] 读取配置
            const snowConfig = CONFIG.particles.snow;
            const range = snowConfig.range;
            const halfRange = range / 2;

            for (let i = 0; i < snowConfig.count; i++) {
                const i3 = i * 3;
                
                // 1. 下落逻辑 (保持不变)
                positions[i3 + 1] -= snowConfig.speed * velocities[i] * dt * 5; 

                // 2. 边界检查 (保持不变)
                if (positions[i3 + 1] < -halfRange) {
                    positions[i3 + 1] = halfRange; 
                    positions[i3] = (Math.random() - 0.5) * range;
                    positions[i3 + 2] = (Math.random() - 0.5) * range;
                }

                // 3. [核心修改] 横向摇摆 (模拟风)
                // time * swayFreq: 控制变换的快慢 (频率)
                // * swayAmp: 控制单次移动的距离 (幅度)
                const sway = Math.sin(time * snowConfig.swayFreq + phases[i]) * snowConfig.swayAmp;
                
                positions[i3] += sway;      
                positions[i3 + 2] += sway;  
            }

            geo.attributes.position.needsUpdate = true;
        }

        this.composer.render();
    }
}
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

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
        
        this.setupThree();
        this.createWorld();
        this.setupInputs();
        
        this.vision = new VisionManager(this.handleGesture.bind(this));
        
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

        // Shared Geometries & Materials
        const boxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
        
        // Candy Cane Geometry (Tube)
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0.5, 0),
            new THREE.Vector3(0.2, 0.8, 0),
            new THREE.Vector3(0.5, 0.6, 0)
        ]);
        const caneGeo = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
        const caneMat = new THREE.MeshStandardMaterial({ 
            map: AssetFactory.createCandyCaneTexture(),
            roughness: 0.3, metalness: 0.1 
        });

        const materials = [
            new THREE.MeshStandardMaterial({ color: CONFIG.colors.gold, metalness: 0.8, roughness: 0.2 }),
            new THREE.MeshStandardMaterial({ color: CONFIG.colors.green, roughness: 0.8 }),
            new THREE.MeshPhysicalMaterial({ color: CONFIG.colors.red, metalness: 0.1, roughness: 0.1, clearcoat: 1.0 })
        ];

        // Create Particles
        for(let i=0; i<CONFIG.count.main; i++) {
            let mesh;
            const r = Math.random();
            if(r < 0.6) {
                mesh = new THREE.Mesh(boxGeo, materials[Math.floor(Math.random()*2)]);
            } else if(r < 0.9) {
                mesh = new THREE.Mesh(sphereGeo, materials[2]);
            } else {
                mesh = new THREE.Mesh(caneGeo, caneMat);
            }
            
            mesh.position.set((Math.random()-0.5)*50, (Math.random()-0.5)*50, (Math.random()-0.5)*50);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            this.mainGroup.add(mesh);
            this.particles.push(new Particle(mesh));
        }

        // Dust Particles
        const dustGeo = new THREE.BufferGeometry();
        const dustPos = [];
        for(let i=0; i<CONFIG.count.dust; i++) {
            dustPos.push((Math.random()-0.5)*60, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
        }
        dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
        const dustMat = new THREE.PointsMaterial({ 
            color: CONFIG.colors.gold, size: 0.1, transparent: true, opacity: 0.6 
        });
        const dustSystem = new THREE.Points(dustGeo, dustMat);
        this.scene.add(dustSystem);
        this.dustSystem = dustSystem;
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
        const dt = 0.016; // Approx fixed delta for smoothness

        // Vision
        this.vision.detect();

        // Group Rotation based on Hand or Auto
        if (STATE.hand.present) {
            // Map Hand X/Y (0-1) to Rotation angles
            const targetRotY = (STATE.hand.x - 0.5) * 2; // -1 to 1 rad
            const targetRotX = (STATE.hand.y - 0.5) * 1; 
            this.mainGroup.rotation.y = THREE.MathUtils.lerp(this.mainGroup.rotation.y, targetRotY, 0.1);
            this.mainGroup.rotation.x = THREE.MathUtils.lerp(this.mainGroup.rotation.x, targetRotX, 0.1);
        } else {
            // Auto idle rotation
            this.mainGroup.rotation.y += 0.001;
            this.mainGroup.rotation.x = THREE.MathUtils.lerp(this.mainGroup.rotation.x, 0, 0.05);
        }

        // Update Particles
        this.particles.forEach(p => p.update(dt, time));

        // Animate Dust
        if(this.dustSystem) {
            this.dustSystem.rotation.y = -time * 0.05;
        }

        this.composer.render();
    }
}
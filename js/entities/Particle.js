import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { STATE } from '../state.js';

export class Particle {
    constructor(mesh, type, isDust = false) {
        this.mesh = mesh;
        this.type = type; // 'ORNAMENT', 'PHOTO', 'DUST' 等
        this.isDust = isDust;
        
        this.posTree = new THREE.Vector3();
        this.posScatter = new THREE.Vector3();
        this.baseScale = mesh.scale.x; 

        // [新增] 随机偏移量，控制漂浮的“相位”，让大家不要一起上下动
        this.floatOffset = Math.random() * 100;
        this.floatSpeed = 0.8 + Math.random() * 1.0; // 漂浮速度差异

        // 自转速度
        let speedMult = 2.0; 
        if (type === 'PHOTO' || type === 'CARD') speedMult = 0.3;
        else if (type === 'GEM') speedMult = 8; // 宝石转得快，bling bling

        this.spinSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * speedMult,
            (Math.random() - 0.5) * speedMult,
            (Math.random() - 0.5) * speedMult
        );

        this.calculatePositions();
    }

    calculatePositions() {
        const h = CONFIG.particles.treeHeight;
        const rBase = CONFIG.particles.treeRadius;
        const halfH = h / 2;
        
        // [修改核心] 垂直分布逻辑 (Y Axis Distribution)
        // 获取均匀度参数，默认为 0.5
        const uniformity = (CONFIG.particles.treeUniformity !== undefined) ? CONFIG.particles.treeUniformity : 0.5;
        
        // 计算指数：
        // u=0 -> exp=0.8 (顶部密集，你之前的版本)
        // u=1 -> exp=1.8 (底部密集，填充宽大区域)
        const exponent = 0.8 + (uniformity * 1.0);

        let t = Math.random(); 
        t = Math.pow(t, exponent); // 应用指数分布

        if (this.type === 'CARD') {
            // 强制 t 的范围在 0.0 (底部) 到 0.6 (中部) 之间
            // 这样卡片绝不会出现在树的顶端 (0.6 ~ 1.0)
            t = t * 0.5; 
        }

        const y = (t * h) - halfH;

        // 半径计算：越往上越窄
        let rMax = rBase * (1.0 - t); 
        if (rMax < 0.2) rMax = 0.2;

        // 角度完全随机
        const angle = Math.random() * Math.PI * 2; 
                
        // 半径随机扰动
        const r = rMax * (0.6 + Math.random() * 0.4); 

        this.posTree.set(Math.cos(angle) * r, y, Math.sin(angle) * r);

        // SCATTER: 保持原样
        let rScatter = this.isDust ? (12 + Math.random()*20) : (8 + Math.random()*12);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        this.posScatter.set(
            rScatter * Math.sin(phi) * Math.cos(theta),
            rScatter * Math.sin(phi) * Math.sin(theta),
            rScatter * Math.cos(phi)
        );
    }

    update(dt, time, camera) {
        let target = new THREE.Vector3();

        const currentMode = STATE.mode;
        
        // 判断当前粒子是否是聚焦目标
        // 兼容 mesh.userData (InputManager 设置) 和 STATE.focusTarget
        const isTarget = (this.mesh.userData.isFocusTarget || STATE.focusTarget === this.mesh);

        // ===========================
        // 1. 目标位置计算 (Position Logic)
        // ===========================
        if (currentMode === CONFIG.modes.TREE) {
            target.copy(this.posTree);
            
            // 树模式漂浮呼吸效果
            const floatY = Math.sin(time * this.floatSpeed + this.floatOffset) * 0.2; 
            const floatX = Math.cos(time * this.floatSpeed * 0.5 + this.floatOffset) * 0.05; 
            
            target.y += floatY;
            target.x += floatX;
            target.z += floatX;

            // 树模式微弱自转
            this.mesh.rotation.x += this.spinSpeed.x * 0.1 * dt;
            this.mesh.rotation.y += this.spinSpeed.y * 0.1 * dt;

        } else if (currentMode === CONFIG.modes.SCATTER) {
            target.copy(this.posScatter);
            
            // 散开模式快速自转
            this.mesh.rotation.x += this.spinSpeed.x * dt;
            this.mesh.rotation.y += this.spinSpeed.y * dt;
            this.mesh.rotation.z += this.spinSpeed.z * dt;

        } else if (currentMode === CONFIG.modes.FOCUS) {
            if (isTarget && camera) {
                // 1. 计算【世界坐标】下的目标点：相机前方 12 米
                const direction = new THREE.Vector3();
                camera.getWorldDirection(direction);
                const distance = 12.0;
                const worldTarget = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(distance));
                
                // 2. [核心修复] 将【世界坐标】转换为父容器（mainGroup）的【局部坐标】
                // 这样无论树怎么旋转，卡片都会准确飞到相机眼前
                if (this.mesh.parent) {
                    this.mesh.parent.updateMatrixWorld(); // 确保父容器矩阵是最新的
                    const invMatrix = new THREE.Matrix4().copy(this.mesh.parent.matrixWorld).invert();
                    target.copy(worldTarget).applyMatrix4(invMatrix);
                } else {
                    target.copy(worldTarget);
                }

                // 3. 让卡片始终正对相机
                // lookAt 默认接受世界坐标，Three.js 会自动处理父容器旋转的抵消
                this.mesh.lookAt(camera.position);

            } else {
                target.copy(this.posScatter);
            }
        }

        // ===========================
        // 2. 移动插值 (Lerp)
        // ===========================
        // 聚焦时飞得快一点 (4.0)，平时慢一点 (2.5)
        const lerpSpeed = (currentMode === CONFIG.modes.FOCUS && isTarget) ? 4.0 : 2.5; 
        this.mesh.position.lerp(target, lerpSpeed * dt);

        // ===========================
        // 3. 缩放逻辑 (Scale)
        // ===========================
        let s = this.baseScale || 1.0;
        
        if (currentMode === CONFIG.modes.FOCUS) {
             if (isTarget) {
                 // 聚焦目标放大
                 s = 2.5; 
             } else {
                 // 背景物体缩小，突出主体
                 s = (this.baseScale || 1.0) * 0.5;
             }
        } else if (currentMode === CONFIG.modes.SCATTER && (this.type === 'PHOTO' || this.type === 'CARD')) {
             // 散开时，卡片和照片稍微放大方便寻找
             s = (this.baseScale || 1.0) * 2.5;
        }
        
        this.mesh.scale.lerp(new THREE.Vector3(s,s,s), 4*dt);
        
    }
}
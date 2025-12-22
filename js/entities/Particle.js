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
        const speedMult = (type === 'PHOTO') ? 0.3 : 2.0;
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

    // 注意：update 方法现在多接收一个 time 参数用于计算漂浮
    update(dt, time) {
        let target = new THREE.Vector3();

        // 读取全局状态
        const currentMode = STATE.mode;
        // 如果你的 STATE.focusTarget 还没实现，暂时可以忽略，或者在 STATE 里加一个
        const focusTargetMesh = STATE.focusTarget || null;

        if (currentMode === CONFIG.modes.TREE) {
            target.copy(this.posTree);
            
            // [核心修改 3] 新增漂浮呼吸效果
            // 只有在树模式下才漂浮
            const floatY = Math.sin(time * this.floatSpeed + this.floatOffset) * 0.2; // 上下浮动
            const floatX = Math.cos(time * this.floatSpeed * 0.5 + this.floatOffset) * 0.05; // 微小水平摆动
            
            target.y += floatY;
            target.x += floatX;
            target.z += floatX;

            // 树模式下微弱自转
            this.mesh.rotation.x += this.spinSpeed.x * 0.1 * dt;
            this.mesh.rotation.y += this.spinSpeed.y * 0.1 * dt;

        } else if (currentMode === CONFIG.modes.SCATTER) {
            target.copy(this.posScatter);
            
            // 散开模式下快速自转
            this.mesh.rotation.x += this.spinSpeed.x * dt;
            this.mesh.rotation.y += this.spinSpeed.y * dt;
            this.mesh.rotation.z += this.spinSpeed.z * dt;

        } else if (currentMode === CONFIG.modes.FOCUS) {
            if (this.mesh.userData.isFocusTarget) { 
                // 简单的聚焦逻辑：飞到相机前
                target.set(0, 2, 35); 
                this.mesh.lookAt(0, 2, 50); // 假设相机在 (0, 2, 50)
            } else {
                target.copy(this.posScatter); // 其他人散开
            }
        }

        // 移动插值
        const lerpSpeed = (currentMode === CONFIG.modes.FOCUS && this.mesh.userData.isFocusTarget) ? 5.0 : 2.5; 
        this.mesh.position.lerp(target, lerpSpeed * dt);

        // 缩放逻辑
        let s = this.baseScale || 1.0;
        
        if (currentMode === CONFIG.modes.FOCUS) {
             if (this.mesh.userData.isFocusTarget) s = 4.5;
             else s = (this.baseScale || 1.0) * 0.8;
        } else if (currentMode === CONFIG.modes.SCATTER && this.type === 'PHOTO') {
             s = (this.baseScale || 1.0) * 2.5;
        }
        
        // 简单的缩放插值
        this.mesh.scale.lerp(new THREE.Vector3(s,s,s), 4*dt);
    }
}
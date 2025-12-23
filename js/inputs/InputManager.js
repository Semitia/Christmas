// js/inputs/InputManager.js
import * as THREE from 'three';
import { STATE } from '../state.js';
import { CONFIG } from '../config.js';

export class InputManager {
    constructor(camera, scene, mainGroup, particles) {
        this.camera = camera;
        this.scene = scene;
        this.mainGroup = mainGroup;
        this.particles = particles; // 需要访问粒子列表来进行射线检测
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // 拖拽状态
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        // 触摸缩放状态
        this.touchStartDist = 0;

        this.initListeners();
    }

    initListeners() {
        // 绑定事件处理器
        window.addEventListener('pointerdown', this.onPointerDown.bind(this));
        window.addEventListener('pointermove', this.onPointerMove.bind(this));
        window.addEventListener('pointerup', this.onPointerUp.bind(this));
        window.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        
        // 触摸手势 (简单的双指缩放)
        window.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    }

    onPointerDown(e) {
        if (STATE.inputMode !== 'MOUSE') return;
        
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        
        // 记录点击位置用于 Raycast (转为标准设备坐标 -1 到 1)
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    onPointerUp(e) {
        if (STATE.inputMode !== 'MOUSE') return;
        this.isDragging = false;

        // 检测是否是一次点击（而非拖拽）
        const dist = Math.hypot(e.clientX - this.previousMousePosition.x, e.clientY - this.previousMousePosition.y);
        
        if (dist < 5) { // 几乎没有移动，视为点击
            this.handleClick();
        }
    }

    onPointerMove(e) {
        if (STATE.inputMode !== 'MOUSE' || !this.isDragging) return;

        const deltaMove = {
            x: e.clientX - this.previousMousePosition.x,
            y: e.clientY - this.previousMousePosition.y
        };

        // 旋转树
        const rotateSpeed = 0.005;
        this.mainGroup.rotation.y += deltaMove.x * rotateSpeed;
        this.mainGroup.rotation.x += deltaMove.y * rotateSpeed;

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    onWheel(e) {
        if (STATE.inputMode !== 'MOUSE') return;
        
        // 滚轮控制聚散
        // 向下滚动 (deltaY > 0) -> 聚合 (TREE)
        // 向上滚动 (deltaY < 0) -> 散开 (SCATTER)
        
        if (e.deltaY < -10) {
            STATE.mode = CONFIG.modes.SCATTER;
            // 如果从 FOCUS 退出，清除聚焦目标
            if (STATE.focusTarget) {
                 STATE.focusTarget.userData.isFocusTarget = false;
                 STATE.focusTarget = null;
            }
        } else if (e.deltaY > 10) {
            STATE.mode = CONFIG.modes.TREE;
            if (STATE.focusTarget) {
                 STATE.focusTarget.userData.isFocusTarget = false;
                 STATE.focusTarget = null;
            }
        }
    }

    // 处理触摸缩放
    onTouchStart(e) {
        if (STATE.inputMode !== 'MOUSE' || e.touches.length !== 2) return;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.touchStartDist = Math.hypot(dx, dy);
    }

    onTouchMove(e) {
        if (STATE.inputMode !== 'MOUSE' || e.touches.length !== 2) return;
        e.preventDefault(); // 防止页面滚动

        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);

        // 捏合 (变小) -> 聚合 (TREE)
        // 张开 (变大) -> 散开 (SCATTER)
        if (dist - this.touchStartDist > 50) {
            STATE.mode = CONFIG.modes.SCATTER;
        } else if (dist - this.touchStartDist < -50) {
            STATE.mode = CONFIG.modes.TREE;
        }
    }

    handleClick() {
        // 射线检测
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 收集所有 Mesh 用于检测 (从粒子系统中提取)
        // 注意：这里我们假设 particles 数组里存的是 Particle 对象，对象里有 mesh 属性
        const intersectObjects = [];
        this.particles.forEach(p => {
            // 只检测照片，或者你可以检测所有物体
            if (p.type === 'PHOTO' || p.type === 'CARD') intersectObjects.push(p.mesh);
        });

        const intersects = this.raycaster.intersectObjects(intersectObjects);

        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            // 找到对应的 Group (因为 Photo 是由 Frame+Mesh 组成的 Group)
            // 向上遍历直到找到有 userData 的那一层
            let targetGroup = hitObject;
            while(targetGroup.parent && targetGroup.parent !== this.mainGroup) {
                targetGroup = targetGroup.parent;
            }

            // 触发聚焦
            this.toggleFocus(targetGroup);
        } else {
            // 点击空白处，取消聚焦
            if (STATE.mode === CONFIG.modes.FOCUS) {
                STATE.mode = CONFIG.modes.TREE; // 或者 SCATTER，看你偏好
                if (STATE.focusTarget) {
                    STATE.focusTarget.userData.isFocusTarget = false;
                    STATE.focusTarget = null;
                }
            }
        }
    }

    toggleFocus(mesh) {
        // 如果点的就是当前聚焦的，取消聚焦
        if (STATE.focusTarget === mesh) {
            STATE.mode = CONFIG.modes.TREE; // 返回默认模式
            mesh.userData.isFocusTarget = false;
            STATE.focusTarget = null;
        } else {
            // 聚焦新物体
            STATE.mode = CONFIG.modes.FOCUS;
            
            // 清除旧的
            if (STATE.focusTarget) STATE.focusTarget.userData.isFocusTarget = false;
            
            // 设置新的
            STATE.focusTarget = mesh;
            mesh.userData.isFocusTarget = true;
        }
    }
}
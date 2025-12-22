import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { STATE } from '../state.js';

export class Particle {
    constructor(mesh, type = 'ORNAMENT') {
        this.mesh = mesh;
        this.type = type; // 'ORNAMENT' or 'PHOTO'
        this.basePos = new THREE.Vector3();
        this.targetPos = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.rotationAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
        this.rotationSpeed = Math.random() * 0.02 + 0.01;
        
        // Unique randoms for tree formation
        this.treeParam = Math.random(); 
        this.scatterDir = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize();
        this.scatterRadius = 10 + Math.random() * 15;
    }

    update(dt, time) {
        // Logic based on global STATE.mode
        if (STATE.mode === CONFIG.modes.TREE) {
            // Spiral Cone: y from -10 to 10
            // radius shrinks as y goes up
            const h = (this.treeParam * 25) - 10; // Height -10 to 15
            const angle = this.treeParam * 25 * Math.PI; // many turns
            const maxR = 12 * (1 - this.treeParam); // Taper
            
            this.targetPos.set(
                Math.cos(angle + time * 0.1) * maxR,
                h,
                Math.sin(angle + time * 0.1) * maxR
            );
            
            // Gentle rotation align
            this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, 0, dt);
            this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, dt);
            
        } else if (STATE.mode === CONFIG.modes.SCATTER) {
            // Exploded Sphere
            this.targetPos.copy(this.scatterDir).multiplyScalar(this.scatterRadius);
            
            // Self Rotation in scatter mode
            this.mesh.rotateOnAxis(this.rotationAxis, this.rotationSpeed);
            
        } else if (STATE.mode === CONFIG.modes.FOCUS) {
            if (this.type === 'PHOTO' && this.mesh.userData.isFocusTarget) {
                this.targetPos.set(0, 2, 35); // Close to camera
                this.mesh.rotation.set(0, 0, 0);
                this.mesh.scale.setScalar(THREE.MathUtils.lerp(this.mesh.scale.x, 4.5, dt * 2));
                return; // Skip normal lerp for special scale handling
            } else {
                // Repel others
                this.targetPos.copy(this.scatterDir).multiplyScalar(40); // Push far away
            }
        }

        // Physics/Smoothing
        this.mesh.position.lerp(this.targetPos, dt * 2.5);
        
        if (STATE.mode !== CONFIG.modes.FOCUS || (this.type === 'PHOTO' && !this.mesh.userData.isFocusTarget)) {
            this.mesh.scale.lerp(new THREE.Vector3(1,1,1), dt * 2);
        }
    }
}
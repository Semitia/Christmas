import * as THREE from 'three';

export class AssetFactory {
    static createCandyCaneTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        for(let i=-64; i<128; i+=16) {
            ctx.moveTo(i, 0); ctx.lineTo(i+8, 0); ctx.lineTo(i-56, 64); ctx.lineTo(i-64, 64);
        }
        ctx.fill();
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    static createDefaultPhoto() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Background
        const grad = ctx.createLinearGradient(0,0,512,512);
        grad.addColorStop(0, '#001100'); grad.addColorStop(1, '#003300');
        ctx.fillStyle = grad; ctx.fillRect(0,0,512,512);
        
        // Border
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 20;
        ctx.strokeRect(10,10,492,492);
        
        // Text
        ctx.font = 'bold 60px Times New Roman';
        ctx.fillStyle = '#fceea7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('JOYEUX', 256, 200);
        ctx.fillText('NOEL', 256, 280);
        
        // Sparkles
        ctx.fillStyle = '#fff';
        for(let i=0; i<30; i++) {
            ctx.beginPath();
            ctx.arc(Math.random()*512, Math.random()*512, Math.random()*3, 0, Math.PI*2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }
}
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

// [修改] 创建六角星形雪花纹理
    static createSnowTexture() {
        const canvas = document.createElement('canvas');
        // 增加画布尺寸以容纳更复杂的细节，保持为 2 的幂次方
        const size = 128; 
        canvas.width = size; 
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size * 0.4; // 雪花半径，留点边距

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = size * 0.05; // 线条宽度
        ctx.lineCap = 'round'; // 圆角线头，更柔和

        // 绘制六角星图案
        // 核心思路：画三条交叉的线段，然后在每条线的末端画小分叉
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;

            // 1. 绘制主干
            ctx.moveTo(center, center);
            ctx.lineTo(x, y);

            // 2. 绘制分叉 (每条主干末端加两个小短线)
            const forkRadius = radius * 0.6; // 分叉点位置
            const forkX = center + Math.cos(angle) * forkRadius;
            const forkY = center + Math.sin(angle) * forkRadius;
            const forkLen = radius * 0.25; // 分叉长度
            const forkAngleOffset = Math.PI / 4; // 分叉角度 (45度)

            // 左分叉
            ctx.moveTo(forkX, forkY);
            ctx.lineTo(
                forkX + Math.cos(angle - forkAngleOffset) * forkLen,
                forkY + Math.sin(angle - forkAngleOffset) * forkLen
            );
            // 右分叉
            ctx.moveTo(forkX, forkY);
            ctx.lineTo(
                forkX + Math.cos(angle + forkAngleOffset) * forkLen,
                forkY + Math.sin(angle + forkAngleOffset) * forkLen
            );
        }
        ctx.stroke();

        // 可选：在中心点一个圆点，增加细节
        ctx.beginPath();
        ctx.arc(center, center, size * 0.08, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    }

    /**
     * 创建贺卡纹理
     * @param {string} text - 正文内容
     * @param {string} author - 作者/出处
     * @param {object} style - 配色样式 {bg, text, border}
     */
    static createCardTexture(text, author, style) {
        const width = 512;
        const height = 768; // 2:3 纵向比例
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 1. 绘制背景
        ctx.fillStyle = style.bg;
        ctx.fillRect(0, 0, width, height);

        // 2. 绘制边框
        ctx.strokeStyle = style.border;
        ctx.lineWidth = 20;
        ctx.strokeRect(20, 20, width - 40, height - 40);
        
        // 内细线
        ctx.lineWidth = 4;
        ctx.strokeRect(35, 35, width - 70, height - 70);

        // 3. 绘制装饰元素 (顶部和底部的花纹)
        ctx.fillStyle = style.border;
        ctx.beginPath();
        ctx.arc(width/2, 60, 10, 0, Math.PI*2); // 顶部圆点
        ctx.fill();

        // 4. 文字设置
        ctx.fillStyle = style.text;
        ctx.textAlign = 'center';
        
        // --- 绘制正文 (自动换行) ---
        const fontSize = 36;
        const lineHeight = 50;
        ctx.font = `italic ${fontSize}px "Times New Roman", serif`;
        
        const maxWidth = width - 120; // 左右留边距
        const words = text.split(''); // 对于中文，我们按字符分割；英文按单词分割逻辑会更复杂，这里简单处理
        // 简单的中英文混排换行逻辑
        let line = '';
        let lines = [];
        
        // 稍微智能一点的分割：先按空格分词，如果单词太长再强行切断（针对英文），中文直接切
        // 为了简化，这里使用“按字符逐个累加测量”的方法，通用性最强
        let currentLine = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);

        // 计算垂直居中
        const totalTextHeight = lines.length * lineHeight;
        let startY = (height - totalTextHeight) / 2 - 40; // 稍微偏上一点

        lines.forEach((l, i) => {
            ctx.fillText(l, width / 2, startY + i * lineHeight);
        });

        // --- 绘制作者 ---
        ctx.font = `bold 24px "Times New Roman", serif`;
        ctx.fillText(`— ${author}`, width / 2, startY + lines.length * lineHeight + 60);

        // 生成纹理
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        // 稍微降低各向异性过滤，避免文字闪烁，或者根据需要开启
        // tex.anisotropy = 16; 
        return tex;
    }
}
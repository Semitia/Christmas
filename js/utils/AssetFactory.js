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

    // =========================================================
    // 贺卡绘制工厂
    // =========================================================
    static createCardTexture(text, author, styleIndex) {
        // 高清画布 (宽:高 = 4:2.6 => 约 1.5倍)
        const width = 800;
        const height = 520; 
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 根据索引选择模板
        switch(styleIndex % 4) {
            case 0: this.drawDecoStyle(ctx, width, height, text, author); break;
            // case 1: this.drawScrollStyle(ctx, width, height, text, author); break;
            case 1: this.drawDarkScrollStyle(ctx, width, height, text, author); break;
            case 2: this.drawMagicStyle(ctx, width, height, text, author); break;
            // case 3: this.drawFloralStyle(ctx, width, height, text, author); break;
            case 3: this.drawDarkFloralStyle(ctx, width, height, text, author); break;
        }
        

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    // --- 辅助：文字换行 ---
    static wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        // 简单处理：中英文分开逻辑太复杂，这里按字符测量，虽然对英文单词切分不完美，但兼容性好
        // 如果想完美支持英文单词不切断，需要 split(' ')，但这里有中文混合，暂按字处理
        const words = text.split('');
        let line = '';
        const lines = [];

        for(let n = 0; n < words.length; n++) {
            // 简单处理：如果是英文单词，尝试向后预读直到空格
            // 这里为了代码简洁，使用字符级换行
            const testLine = line + words[n];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n];
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // 垂直居中偏移
        const totalHeight = lines.length * lineHeight;
        const startY = y - totalHeight / 2;

        for(let k = 0; k < lines.length; k++) {
            ctx.fillText(lines[k], x, startY + k * lineHeight);
        }
    }

    // --- 模板 1: 奢华流金 (The Great Gatsby) ---
    static drawDecoStyle(ctx, w, h, text, author) {
        // BG
        ctx.fillStyle = '#0f1215';
        ctx.fillRect(0, 0, w, h);
        
        // Borders
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, w-40, h-40);
        
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(35, 35, w-70, h-70);

        // Corners (Gold Triangles)
        ctx.fillStyle = '#d4af37';
        const cSize = 60;
        // TL
        ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(20+cSize, 20); ctx.lineTo(20, 20+cSize); ctx.fill();
        // TR
        ctx.beginPath(); ctx.moveTo(w-20, 20); ctx.lineTo(w-20-cSize, 20); ctx.lineTo(w-20, 20+cSize); ctx.fill();
        // BR
        ctx.beginPath(); ctx.moveTo(w-20, h-20); ctx.lineTo(w-20-cSize, h-20); ctx.lineTo(w-20, h-20-cSize); ctx.fill();
        // BL
        ctx.beginPath(); ctx.moveTo(20, h-20); ctx.lineTo(20+cSize, h-20); ctx.lineTo(20, h-20-cSize); ctx.fill();

        // Text (Gradient Gold)
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#cfc09f'); grad.addColorStop(0.5, '#ffecb3'); grad.addColorStop(1, '#b3a076');
        ctx.fillStyle = grad;
        
        ctx.font = '36px "Cinzel Decorative", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.wrapText(ctx, text, w/2, h/2 - 20, w - 160, 50);

        // Author
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText(author.toUpperCase(), w/2, h - 60);
    }

    // --- 模板 2: 远山淡影 (Oriental Scroll) ---
    static drawScrollStyle(ctx, w, h, text, author) {
        // BG
        ctx.fillStyle = '#e6e4dc';
        ctx.fillRect(0, 0, w, h);

        // Mountains (Simple Curves)
        ctx.fillStyle = '#dcdcdc';
        ctx.beginPath(); ctx.arc(w*0.2, h+50, 150, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath(); ctx.arc(w*0.8, h+80, 200, 0, Math.PI*2); ctx.fill();
        
        // Text
        ctx.fillStyle = '#2c2c2c';
        ctx.font = '40px "Zhi Mang Xing", cursive'; // 毛笔字体
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.wrapText(ctx, text, w/2, h/2 - 20, w - 120, 60);

        // Author & Chop
        ctx.font = '24px "Zhi Mang Xing", cursive';
        ctx.fillStyle = '#8b4513';
        ctx.fillText(author, w/2, h - 50);
        
        // Chop (Red Stamp)
        ctx.strokeStyle = '#b22222';
        ctx.lineWidth = 2;
        ctx.strokeRect(w/2 + ctx.measureText(author).width/2 + 10, h-65, 24, 24);
        ctx.font = '14px serif';
        ctx.fillStyle = '#b22222';
        ctx.fillText('阅', w/2 + ctx.measureText(author).width/2 + 22, h-53);
    }

    // --- 模板 3: 魔法车票 (Magic Ticket) ---
    static drawMagicStyle(ctx, w, h, text, author) {
        // BG Gradient
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#141E30'); grad.addColorStop(1, '#243B55');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Dashed Border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.strokeRect(15, 15, w-30, h-30);
        ctx.setLineDash([]);

        // Sparkles
        ctx.fillStyle = 'white';
        for(let i=0; i<10; i++) {
            const r = Math.random() * 2 + 1;
            const x = Math.random() * w;
            const y = Math.random() * h;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        }

        // Text
        ctx.fillStyle = '#e0e0e0';
        ctx.shadowColor = '#a8c0ff';
        ctx.shadowBlur = 10;
        ctx.font = 'italic 32px "Playfair Display", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.wrapText(ctx, text, w/2, h/2 - 20, w - 140, 45);
        
        ctx.shadowBlur = 0;
        ctx.font = '18px "Cinzel Decorative", cursive';
        ctx.fillStyle = '#d1d8e0';
        ctx.fillText('— ' + author, w/2, h - 60);
    }

    // --- 模板 4: 复古花园 (Vintage Floral) ---
    static drawFloralStyle(ctx, w, h, text, author) {
        // BG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Double Border
        ctx.strokeStyle = '#8fbc8f'; // Sage Green
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, w-20, h-20);
        
        ctx.strokeStyle = '#d8bfd8'; // Pale Purple
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, w-40, h-40);

        // Corners (Floral circles)
        ctx.fillStyle = 'rgba(255, 183, 178, 0.4)'; // Pinkish
        ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(w, h, 100, 0, Math.PI*2); ctx.fill();

        // Text
        ctx.fillStyle = '#556b2f';
        ctx.font = '40px "Great Vibes", cursive'; // Handwriting
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.wrapText(ctx, text, w/2, h/2 - 20, w - 150, 55);

        // Author
        ctx.font = '16px serif';
        ctx.fillStyle = '#999';
        ctx.fillText(author.toUpperCase(), w/2, h - 50);
    }

    // ==========================================
    // [新增] 模板 5: 远山淡影·月夜 (Dark Scroll + Moon)
    // ==========================================
    static drawDarkScrollStyle(ctx, w, h, text, author) {
        // 1. 深炭灰背景
        ctx.fillStyle = '#222831';
        ctx.fillRect(0, 0, w, h);

        // 2. [新增] 绘制月亮 (右上角)
        ctx.save();
        ctx.shadowColor = '#fdfbd3';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fdfbd3'; // 暖白月光
        ctx.beginPath();
        // 在右上角画圆
        ctx.arc(w - 80, 80, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. 夜晚山峦 (深蓝灰层次)
        // 远山 (模糊)
        ctx.fillStyle = 'rgba(79, 111, 143, 0.6)'; // #4f6f8f + opacity
        ctx.beginPath(); ctx.arc(w*0.2, h+50, 150, 0, Math.PI*2); ctx.fill();
        
        // 中山
        ctx.fillStyle = '#395b78';
        ctx.beginPath(); ctx.arc(w*0.8, h+80, 200, 0, Math.PI*2); ctx.fill();
        
        // 近山
        ctx.fillStyle = '#30475e';
        ctx.beginPath(); ctx.arc(w*0.3, h+100, 180, 0, Math.PI*2); ctx.fill();
        
        // 4. 文字 (浅灰白)
        ctx.fillStyle = '#e0e0e0';
        ctx.shadowColor = 'rgba(255,255,255,0.2)';
        ctx.shadowBlur = 5;
        ctx.font = '40px "Zhi Mang Xing", cursive'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.wrapText(ctx, text, w/2, h/2 - 20, w - 120, 60);
        ctx.shadowBlur = 0; // 重置阴影

        // 5. 作者与印章
        ctx.font = '24px "Zhi Mang Xing", cursive';
        ctx.fillStyle = '#b0c4de'; // 灰蓝
        ctx.fillText(author, w/2, h - 50);
        
        // 暗色印章
        const chopX = w/2 + ctx.measureText(author).width/2 + 10;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; // 背景深色半透
        ctx.fillRect(chopX, h-65, 24, 24);
        
        ctx.strokeStyle = '#d9534f';
        ctx.lineWidth = 2;
        ctx.strokeRect(chopX, h-65, 24, 24);
        
        ctx.font = '14px serif';
        ctx.fillStyle = '#d9534f';
        ctx.textAlign = 'center';
        ctx.fillText('冬', chopX + 12, h-53 + 5); // 稍微居中修正
    }

    // ==========================================
    // [新增] 模板 6: 复古花园·午夜 (Dark Floral)
    // ==========================================
    static drawDarkFloralStyle(ctx, w, h, text, author) {
        // 1. 墨绿背景
        ctx.fillStyle = '#0f1a15';
        ctx.fillRect(0, 0, w, h);

        // 2. 双层边框
        // 外框：暗金
        ctx.strokeStyle = '#c0b283'; 
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, w-20, h-20);
        
        // 内框：深绿
        ctx.strokeStyle = '#2c4c3b';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, w-40, h-40);

        // 3. 花卉装饰 (模拟模糊光点)
        // 左上
        const grad1 = ctx.createRadialGradient(0, 0, 5, 0, 0, 80);
        grad1.addColorStop(0, 'rgba(75,0,130,0.6)'); // Indigo
        grad1.addColorStop(1, 'transparent');
        ctx.fillStyle = grad1;
        ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI*2); ctx.fill();
        
        // 右下
        const grad2 = ctx.createRadialGradient(w, h, 5, w, h, 80);
        grad2.addColorStop(0, 'rgba(0,0,128,0.6)'); // Navy
        grad2.addColorStop(1, 'transparent');
        ctx.fillStyle = grad2;
        ctx.beginPath(); ctx.arc(w, h, 80, 0, Math.PI*2); ctx.fill();

        // 4. 内容区域背景 (比背景稍亮)
        ctx.fillStyle = '#1a2620';
        ctx.fillRect(w/2 - (w*0.7)/2, h/2 - 100, w*0.7, 200); // 简单模拟中间区域
        ctx.strokeStyle = '#2c4c3b';
        ctx.strokeRect(w/2 - (w*0.7)/2, h/2 - 100, w*0.7, 200);

        // 5. 文字 (奶油金)
        ctx.fillStyle = '#f0e6d2';
        ctx.font = '40px "Great Vibes", cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 阴影增加立体感
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        this.wrapText(ctx, text, w/2, h/2 - 20, w - 160, 55);
        ctx.shadowBlur = 0;

        // 6. 作者
        ctx.font = '16px serif';
        ctx.fillStyle = '#888';
        ctx.fillText(author.toUpperCase(), w/2, h - 50);
    }
}
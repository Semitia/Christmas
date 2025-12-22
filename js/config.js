// export const CONFIG = {
//     colors: { gold: 0xd4af37, cream: 0xfceea7, red: 0xaa0000, green: 0x003300 },
//     count: { main: 1500, dust: 2500 },
//     modes: { TREE: 'TREE', SCATTER: 'SCATTER', FOCUS: 'FOCUS' }
// };

// 文件路径: js/config.js
export const CONFIG = {
    // 1. 颜色：保留原工程的命名 (gold, cream, red, green)，防止材质报错
    colors: { 
        gold: 0xd4af37, 
        cream: 0xfceea7, 
        red: 0xaa0000, 
        green: 0x003300 
    },

    // 2. 粒子参数：采用新结构，包含数量和树的形状
    particles: {
        counts: {
            gold: 200,      // 金色方块数量
            green: 300,     // 绿色方块数量
            red: 100,       // 红色圆球数量
            cane: 50       // 拐杖糖数量
        },
        dustCount: 3000,  // 灰尘数量
        treeHeight: 24,   // [新] 高度，让树变修长
        treeRadius: 9,   // [新] 半径，让树变瘦
        // [新增参数] 树的分布均匀度
        // 0.0 = 顶部密集 (旧版效果)
        // 0.5 = 比较平衡
        // 1.0 = 底部密集 (视觉上更均匀)
        treeUniformity: 0.5
    },
    star: {
        outerRadius: 1.2,   // 外半径 (大小)
        innerRadius: 0.5,   // 内半径 (胖瘦)
        thickness: 0.5,     // 挤压厚度
        bevelSize: 0.2,     // 倒角大小 (越大越圆润/蓬松)
        bevelThickness: 0.4 // 倒角深度 (越大侧面越圆)
    },

    modes: { TREE: 'TREE', SCATTER: 'SCATTER', FOCUS: 'FOCUS' },
};
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
        green: 0x003300,
        ice: 0xaaddff,
        warmWhite: 0xffedcc//0xfff4e0
    },

    // 2. 粒子参数：采用新结构，包含数量和树的形状
    particles: {
        counts: {
            gold: 150,      // 金色方块数量
            green: 300,     // 绿色方块数量
            red: 100,       // 红色圆球数量
            gem: 40,
            cane: 25,       // 拐杖糖数量
            bulb: 20,
            card:10,
        },
        dustCount: 2000,  // 灰尘数量
        snow: {
            count: 400,     // 雪花数量
            size: 0.7,       // 粒子大小
            speed: 0.15,      // 下落速度系数
            range: 60,        // 飘雪范围 (宽/高)
            // [新增] 摇摆控制
            // 频率 (Frequency): 默认是 1.0。改小(如 0.3)会让左右飘荡的周期变长，看起来更悠闲。
            swayFreq: 0.3, 
            
            // 幅度 (Amplitude): 默认是 0.02。改小(如 0.01)会让每次移动的距离变短，看起来更轻盈。
            swayAmp: 0.01
        },
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
    // [新增] 贺卡样式模板
    cardStyles: [
        // 样式 1: 经典米白 (Cream) + 金字
        { bg: '#FFF8DC', text: '#8B4513', border: '#D4AF37' },
        // 样式 2: 圣诞红 (Festive Red) + 金字
        { bg: '#800020', text: '#FFD700', border: '#FFFFFF' },
        // 样式 3: 午夜蓝 (Midnight Blue) + 银字
        { bg: '#191970', text: '#E0E0E0', border: '#C0C0C0' },
        // 样式 4: 森绿 (Forest Green) + 米白字
        { bg: '#004225', text: '#F5F5DC', border: '#D4AF37' }
    ],

    // [新增] 光照系统配置
    // lighting: {
    //     // 曝光度：控制整体画面明暗。
    //     exposure: 1.0, 

    //     // 环境光：极低强度，保留黑色背景，只照亮轮廓
    //     ambient: { 
    //         color: 0xffffff, 
    //         intensity: 0.02 
    //     },
    //     // 中心点光源：照亮树的内部
    //     center: {
    //         color: 0xffaa00,
    //         intensity: 2,
    //         distance: 50
    //     },
    //     // 金色聚光灯 (主光)：制造高光和阴影
    //     spotGold: {
    //         intensity: 1200,
    //         x: 30, y: 40, z: 40,
    //         angle: 0.5,
    //         penumbra: 0.5
    //     },
    //     // 蓝色补光灯 (辅光)：增加冷暖对比
    //     spotBlue: {
    //         intensity: 600,
    //         x: -30, y: 20, z: -30
    //     }
    // },

    // lighting: {
    //     // 关键点 1: 开启 HDR 环境光，照亮所有角落
    //     useHDR: true, 
    //     exposure: 2.2, // 关键点 2: 高曝光，模拟高 ISO 拍摄
    //     ambient: { color: 0xffffff, intensity: 0.6 },// 关键点 3: 这里的环境光强度其实不重要了，因为会被 HDR 覆盖，但保持原值 0.6
    //     center: { color: 0xffaa00, intensity: 2, distance: 50 },

    //     // 聚光灯：在明亮环境下，它们主要负责制造阴影，而不是照亮物体
    //     spotGold: {
    //         intensity: 1200,
    //         x: 30, y: 40, z: 40,
    //         angle: 0.5, penumbra: 0.5
    //     },
    //     spotBlue: {
    //         intensity: 600,
    //         x: -30, y: 20, z: -30
    //     }
    // },

    modes: { TREE: 'TREE', SCATTER: 'SCATTER', FOCUS: 'FOCUS' },
};
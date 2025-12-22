// js/state.js
import { CONFIG } from './config.js';

export const STATE = {
    mode: CONFIG.modes.TREE,
    // [新增] 输入模式：MOUSE (默认) 或 HAND
    inputMode: 'MOUSE', 
    targetPhotoIndex: -1,
    focusTarget: null, // [新增] 存储当前聚焦的物体引用
    hand: { x: 0.5, y: 0.5, present: false },
    isLoaded: false
};
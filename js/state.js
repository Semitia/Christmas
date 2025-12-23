// js/state.js
import { CONFIG } from './config.js';

export const STATE = {
    mode: CONFIG.modes.TREE,
    inputMode: 'MOUSE', 
    targetPhotoIndex: -1,
    focusTarget: null, 
    hand: { x: 0.5, y: 0.5, present: false },
    isLoaded: false,
    
    // // [新增] 开场动画状态
    // isIntro: true 
};
import { CONFIG } from './config.js';

export const STATE = {
    mode: CONFIG.modes.TREE,
    targetPhotoIndex: -1,
    hand: { x: 0.5, y: 0.5, present: false },
    isLoaded: false
};
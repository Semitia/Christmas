import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { STATE } from '../state.js';

export class VisionManager {
    constructor(onGesture) {
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('cv-canvas');
        this.onGesture = onGesture;
        this.lastVideoTime = -1;
        this.statusText = document.getElementById('status-text');
    }

    async init() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
            );
            
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 1
            });

            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.video.srcObject = stream;
            await new Promise(r => this.video.onloadedmetadata = r);
            this.video.play();
            this.statusText.innerText = "AI ACTIVE: WAVE TO CONTROL";
            return true;
        } catch (e) {
            console.error(e);
            this.statusText.innerText = "AI ERROR (Check Camera)";
            return false;
        }
    }

    detect() {
        // [新增] 安全检查 1: 确保 AI 模型已加载
        if (!this.handLandmarker) return;

        // [新增] 安全检查 2: 关键修复！确保视频有合法的宽高
        // 如果摄像头刚打开还没画面，videoWidth 会是 0，强行处理就会导致 crash
        if (!this.video || this.video.videoWidth === 0 || this.video.videoHeight === 0) {
            return; 
        }

        // [原有逻辑] 检查是否是同一帧
        if (this.video.currentTime === this.lastVideoTime) return;
        this.lastVideoTime = this.video.currentTime;
        
        try {
            // AI 检测
            const result = this.handLandmarker.detectForVideo(this.video, performance.now());
            
            if (result.landmarks && result.landmarks.length > 0) {
                // ... (原有的手势处理代码保持不变) ...
                STATE.hand.present = true;
                const lm = result.landmarks[0]; 
                
                // Mirroring & Update
                STATE.hand.x = 1 - lm[9].x; 
                STATE.hand.y = lm[9].y;

                // Gestures logic ...
                const pinchDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
                
                const tips = [8, 12, 16, 20];
                let avgDist = 0;
                tips.forEach(t => {
                    avgDist += Math.hypot(lm[t].x - lm[0].x, lm[t].y - lm[0].y);
                });
                avgDist /= 4;

                if (pinchDist < 0.05) {
                    this.onGesture('PINCH');
                } else if (avgDist < 0.25) { 
                    this.onGesture('FIST'); 
                } else if (avgDist > 0.4) {
                    this.onGesture('OPEN');
                }
            } else {
                STATE.hand.present = false;
            }
        } catch (e) {
            // 捕获偶发的检测错误，防止整个程序崩溃
            console.warn("MediaPipe Detect Error:", e);
        }
    }
}
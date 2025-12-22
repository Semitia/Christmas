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
        if (!this.handLandmarker || this.video.currentTime === this.lastVideoTime) return;
        this.lastVideoTime = this.video.currentTime;
        
        const result = this.handLandmarker.detectForVideo(this.video, performance.now());
        
        if (result.landmarks && result.landmarks.length > 0) {
            STATE.hand.present = true;
            const lm = result.landmarks[0]; // 21 landmarks
            
            // Update Cursor (Landmark 9 is middle finger MCP / palm center approx)
            // MediaPipe X is inverted for mirror effect usually, but let's keep raw
            STATE.hand.x = 1 - lm[9].x; // Mirroring logic
            STATE.hand.y = lm[9].y;

            // Gestures
            // 1. Pinch (Thumb tip 4 vs Index tip 8)
            const pinchDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y);
            
            // 2. Fist vs Open (Avg distance of tips to wrist 0)
            const tips = [8, 12, 16, 20];
            let avgDist = 0;
            tips.forEach(t => {
                avgDist += Math.hypot(lm[t].x - lm[0].x, lm[t].y - lm[0].y);
            });
            avgDist /= 4;

            if (pinchDist < 0.05) {
                this.onGesture('PINCH');
            } else if (avgDist < 0.25) { // Thresholds depend on coordinate space, usually 0-1
                this.onGesture('FIST'); 
            } else if (avgDist > 0.4) {
                this.onGesture('OPEN');
            }
        } else {
            STATE.hand.present = false;
        }
    }
}
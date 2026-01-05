import { AppState } from './state.js';

export class Effects {
    static init() {
        // Create overlay elements if they don't exist
        if (!document.getElementById('fx-overlay')) {
            const div = document.createElement('div');
            div.id = 'fx-overlay';
            div.style.position = 'absolute';
            div.style.top = '0';
            div.style.left = '0';
            div.style.width = '100%';
            div.style.height = '100%';
            div.style.pointerEvents = 'none';
            div.style.zIndex = '20';
            document.getElementById('game-container').appendChild(div);
        }
    }

    static flashColor(color) {
        const el = document.getElementById('fx-overlay');
        el.className = '';
        void el.offsetWidth; // Trigger reflow
        el.style.backgroundColor = color;
        el.style.animation = 'flashFade 0.5s ease-out forwards';
    }

    static showFloatingIcon(icon, text, color = 'white', cssClass = '') {
        const container = document.getElementById('game-container');
        const el = document.createElement('div');
        el.className = 'floating-icon';
        el.innerHTML = `
            <div style="font-size: 5rem;" class="${cssClass}">${icon}</div>
            <div style="font-size: 2rem; font-weight:bold; color: ${color}; text-shadow: 0 2px 4px #000, 0 0 10px ${color}; white-space: nowrap;">${text}</div>
        `;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    static spawnDebris(x, y) {
        const container = document.getElementById('game-container');
        // Create 100 particles for a HUGE explosion
        for (let i = 0; i < 100; i++) {
            const p = document.createElement('div');
            p.className = 'debris-particle';
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * 400; // Wider spread

            p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
            p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);

            container.appendChild(p);
            setTimeout(() => p.remove(), 1500);
        }
    }

    static showVictory() {
        const container = document.getElementById('game-container');
        const div = document.createElement('div');
        div.className = 'victory-screen';
        div.innerHTML = `
            <h1 class="victory-text">축하합니다!<br>모든 보석을 찾았어요!</h1>
            <div class="firework"></div>
            <div class="firework"></div>
            <div class="firework"></div>
            
            <div style="margin-top: 20px; z-index: 100; position: relative; display: flex; gap: 10px; justify-content: center;">
                <button class="v-btn" onclick="restartLevel()">🔄 다시 하기 (Restart)</button>
                <button class="v-btn" onclick="generateRandomMap()">🎲 같은 크기 (Regenerate)</button>
            </div>
            
            <div style="margin-top: 10px; z-index: 100; position: relative; display: flex; gap: 10px; justify-content: center;">
                <button id="btn-smaller" class="v-btn" onclick="resizeMap(-5)">⬇️ 작게 (-5)</button>
                <button id="btn-larger" class="v-btn" onclick="resizeMap(5)">⬆️ 크게 (+5)</button>
            </div>
        `;
        container.appendChild(div);

        // Button State Logic
        const size = AppState.mapSize;
        const btnSmall = div.querySelector('#btn-smaller');
        const btnLarge = div.querySelector('#btn-larger');

        if (size <= 10) {
            btnSmall.disabled = true;
            btnSmall.style.opacity = 0.5;
            btnSmall.style.cursor = 'not-allowed';
        }
        if (size >= 25) { // User said "max size" (20? 25?). Let's cap at 25 essentially.
            btnLarge.disabled = true;
            btnLarge.style.opacity = 0.5;
            btnLarge.style.cursor = 'not-allowed';
        }
    }
}

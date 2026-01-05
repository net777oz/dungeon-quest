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
        `;
        container.appendChild(div);

        // Add click to dismiss/restart? 
        // For now just show it.
    }
}

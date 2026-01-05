
// Procedural Texture Generator
// Creates 64x64 textures for the Raycaster

const TEX_SIZE = 64;
export const TEXTURES = {};

function createTexture(name, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, TEX_SIZE);
    TEXTURES[name] = canvas;
}

export function initTextures() {
    // 1. STONE WALL (Mossy & Brighter)
    createTexture('WALL', (ctx, s) => {
        // Base - Lighter Grey
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(0, 0, s, s);

        // Noise
        for (let i = 0; i < 400; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)';
            ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
        }

        // Brick Pattern
        ctx.fillStyle = '#555'; // Lighter Grid
        // ... (Grid logic same as before) ...
        // Horizontal lines
        for (let y = 0; y < s; y += 16) {
            ctx.fillRect(0, y, s, 2);
        }
        // Vertical lines (staggered)
        for (let y = 0; y < s; y += 16) {
            let offset = (y / 16) % 2 === 0 ? 0 : 8;
            for (let x = offset; x < s; x += 32) {
                ctx.fillRect(x, y, 2, 16);
            }
        }

        // Highlights/Shadows (Same as before)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let y = 0; y < s; y += 16) {
            let offset = (y / 16) % 2 === 0 ? 0 : 8;
            for (let x = offset; x < s; x += 32) {
                ctx.fillRect(x + 2, y + 14, 28, 2);
            }
        }
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let y = 0; y < s; y += 16) {
            let offset = (y / 16) % 2 === 0 ? 0 : 8;
            for (let x = offset; x < s; x += 32) {
                ctx.fillRect(x + 2, y + 2, 28, 2);
                ctx.fillRect(x + 2, y + 2, 2, 12);
            }
        }

        // --- MOSS EFFECT ---
        // Random patches of green
        for (let k = 0; k < 8; k++) {
            const mx = Math.random() * s;
            const my = Math.random() * s;
            const size = 5 + Math.random() * 10;
            ctx.fillStyle = `rgba(${50 + Math.random() * 50}, ${150 + Math.random() * 50}, ${50 + Math.random() * 50}, 0.6)`;
            for (let p = 0; p < 20; p++) {
                ctx.fillRect(mx + (Math.random() - 0.5) * size, my + (Math.random() - 0.5) * size, 2, 2);
            }
        }
    });

    // 2. DOORS (Variable Colors + Wear)
    const createDoor = (name, color, knobColor = '#f1c40f') => {
        createTexture(name, (ctx, s) => {
            // Base Color
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, s, s);

            // Add Texture Noise
            for (let i = 0; i < 300; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
                ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
            }

            // Shading/Grain (Metal plate look - Inner Recess)
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(4, 4, s - 8, s - 8);

            ctx.fillStyle = color; // Restore center
            ctx.fillRect(8, 8, s - 16, s - 16);

            // Inner Noise
            for (let i = 0; i < 150; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';
                ctx.fillRect(8 + Math.random() * (s - 16), 8 + Math.random() * (s - 16), 2, 2);
            }

            // SCRATCHES (Wear)
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                const sx = Math.random() * s;
                const sy = Math.random() * s;
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + (Math.random() - 0.5) * 10, sy + (Math.random() - 0.5) * 10);
                ctx.stroke();
            }

            // RUST (For all doors to some degree, heavier on Copper if we wanted logic, but random is fine)
            // Orange/Brown speckles
            for (let i = 0; i < 50; i++) {
                ctx.fillStyle = 'rgba(139, 69, 19, 0.4)'; // SaddleBrown transparent
                ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
            }


            // Rivets
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            [12, s - 12].forEach(x => {
                [12, s - 12].forEach(y => {
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
            });

            // Handle
            ctx.fillStyle = knobColor;
            ctx.beginPath();
            ctx.arc(s - 12, s / 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 2;
        });
    };

    // Iron Door (Silver/Grey)
    createDoor('DOOR_1', '#bdc3c7', '#2c3e50');

    // Copper Door (Rust/Orange)
    createDoor('DOOR_2', '#d35400', '#f1c40f');

    // Cobalt Door (Deep Blue)
    createDoor('DOOR_3', '#0047ab', '#bdc3c7');

    // 3. SECRET WALL (Identical to Wall)
    createTexture('SECRET_V2', (ctx, s) => {
        if (TEXTURES['WALL']) {
            ctx.drawImage(TEXTURES['WALL'], 0, 0);
        }
    });
}

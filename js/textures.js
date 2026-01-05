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
    updateWallTexture(0); // Default Wall
    initDoors();
}

export function updateWallTexture(hue) {
    // Default hue = 0 (or undefined)
    const h = hue || 0;

    createTexture('WALL', (ctx, s) => {
        // Base Color - varied by Hue
        // Default was lighter grey ~hsl(200, 5%, 52%)
        const baseSat = (h === 0) ? '5%' : '25%';
        const baseLight = '50%';

        ctx.fillStyle = `hsl(${h}, ${baseSat}, ${baseLight})`;
        ctx.fillRect(0, 0, s, s);

        // Noise
        for (let i = 0; i < 400; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)';
            ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
        }

        // Brick Pattern (Filter overlay)
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
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

        // Moss/Grit (Random colored noise based on hue)
        // Complementary or Analogous hue for moss
        const mossHue = (h + 120) % 360;
        for (let i = 0; i < 25; i++) {
            let mx = Math.random() * s;
            let my = Math.random() * s;
            const size = 3 + Math.random() * 8;
            ctx.fillStyle = `hsla(${mossHue}, 40%, 40%, 0.3)`;
            ctx.beginPath();
            ctx.arc(mx, my, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Highlights/Shadows (Relief effect)
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
    });

    // Update Secret Wall to match new Wall
    createTexture('SECRET_V2', (ctx, s) => {
        if (TEXTURES['WALL']) {
            ctx.drawImage(TEXTURES['WALL'], 0, 0);
        }
    });
}

function initDoors() {
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

            // RUST
            for (let i = 0; i < 50; i++) {
                ctx.fillStyle = 'rgba(139, 69, 19, 0.4)';
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

    // Copper Door (Rust/Orange) (Darker orange for better contrast?)
    createDoor('DOOR_2', '#d35400', '#f1c40f');

    // Cobalt Door (Deep Blue)
    createDoor('DOOR_3', '#0047ab', '#bdc3c7');
}

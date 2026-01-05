
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
    // 1. STONE WALL (Brighter)
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

        // Highlights/Shadows
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; // Softer shadow
        for (let y = 0; y < s; y += 16) {
            let offset = (y / 16) % 2 === 0 ? 0 : 8;
            for (let x = offset; x < s; x += 32) {
                ctx.fillRect(x + 2, y + 14, 28, 2);
            }
        }
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; // Stronger Highlight
        for (let y = 0; y < s; y += 16) {
            let offset = (y / 16) % 2 === 0 ? 0 : 8;
            for (let x = offset; x < s; x += 32) {
                ctx.fillRect(x + 2, y + 2, 28, 2);
                ctx.fillRect(x + 2, y + 2, 2, 12);
            }
        }
    });

    // 2. DOORS (Variable Colors)
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

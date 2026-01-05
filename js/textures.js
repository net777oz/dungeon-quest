
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

    // 2. WOODEN DOOR (Brighter)
    createTexture('DOOR', (ctx, s) => {
        // Base Wood - Lighter Brown
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(0, 0, s, s);

        // Wood Grain
        for (let i = 0; i < s; i += 4) {
            ctx.fillStyle = (i / 4) % 2 === 0 ? '#795548' : '#6d4c41';
            ctx.fillRect(i, 0, 4, s);
        }

        // Iron Frame (Blue-ish Grey)
        ctx.fillStyle = '#707b7c';
        ctx.fillRect(0, 0, 4, s);
        ctx.fillRect(s - 4, 0, 4, s);
        ctx.fillRect(0, 0, s, 4);
        ctx.fillRect(0, s - 4, s, 4);

        // Crossbars
        ctx.fillRect(0, 20, s, 4);
        ctx.fillRect(0, 40, s, 4);

        // Rivets
        ctx.fillStyle = '#bdc3c7';
        [22, 42].forEach(y => {
            ctx.fillRect(2, y, 2, 2);
            ctx.fillRect(s - 4, y, 2, 2);
            ctx.fillRect(s / 2, y, 2, 2);
        });

        // Handle
        ctx.fillStyle = '#f1c40f'; // Gold handle
        ctx.beginPath();
        ctx.arc(s - 10, s / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 2;
    });

    // 3. SECRET WALL (Identical to Wall)
    createTexture('SECRET_V2', (ctx, s) => {
        // Just draw the Wall texture exactly
        // We ensure WALL exists in TEXTURES
        if (TEXTURES['WALL']) {
            ctx.drawImage(TEXTURES['WALL'], 0, 0);
        }
    });
}

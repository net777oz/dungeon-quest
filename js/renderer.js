import { AppState, TILES, WALL_COLORS, TILE_COLORS, TILE_ICONS } from './state.js';
import { TEXTURES } from './textures.js';

export function renderGame(dt) {
    const canvas = document.getElementById('screen');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // View Bobbing Calculation
    const time = Date.now() / 1000;
    const bobOffset = Math.sin(time * 2) * 5;

    // 1. Sky Gradient
    // 1. Sky Gradient (Magical/Child-friendly)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, h / 2 + bobOffset);
    skyGradient.addColorStop(0, '#6dd5fa'); // Light Blue
    skyGradient.addColorStop(1, '#2980b9'); // Deep Blue
    // Or maybe a magical purple? Let's go with Bright Blue Sky as it's safe and "pretty"
    // Actually user said "Dungeon but make roof pretty". 
    // Let's try a "Starry Night" purple/blue but brighter.
    // Let's stick to the Bright Blue/White cloud feel.
    // Actually, let's do #a18cd1 (Love Kiss) to #fbc2eb (Piggy Pink)? No, too pink.
    // Let's do #8E2DE2 to #4A00E0 ? Magical. 
    // Let's go with the current edit below:
    skyGradient.addColorStop(0, '#a18cd1'); // Soft Purple
    skyGradient.addColorStop(1, '#fbc2eb'); // Soft Pink (Pastel Sunset look)

    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, h / 2 + bobOffset);

    // 2. Floor Gradient
    const floorGradient = ctx.createLinearGradient(0, h / 2 + bobOffset, 0, h);
    floorGradient.addColorStop(0, '#2c3e50'); // Dark Blue Grey
    floorGradient.addColorStop(1, '#000000'); // Black
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, h / 2 + bobOffset, w, h / 2 - bobOffset);

    // 3. Raycasting Parameters
    const fov = Math.PI / 3;
    const numRays = w;
    const deltaAngle = fov / numRays;
    let currentAngle = AppState.player.dir - fov / 2;
    const maxDepth = 20;

    const zBuffer = new Array(numRays).fill(maxDepth);

    // CAST RAYS
    for (let r = 0; r < numRays; r++) {
        let rayAngle = currentAngle;
        let sinA = Math.sin(rayAngle);
        let cosA = Math.cos(rayAngle);

        let distance = 0;
        let hitObject = TILES.EMPTY;
        let hitSide = 0;

        let mapX = Math.floor(AppState.player.x);
        let mapY = Math.floor(AppState.player.y);

        let deltaDistX = Math.abs(1 / cosA);
        let deltaDistY = Math.abs(1 / sinA);

        let stepX, stepY;
        let sideDistX, sideDistY;

        if (cosA < 0) {
            stepX = -1;
            sideDistX = (AppState.player.x - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - AppState.player.x) * deltaDistX;
        }

        if (sinA < 0) {
            stepY = -1;
            sideDistY = (AppState.player.y - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - AppState.player.y) * deltaDistY;
        }

        let hit = false;
        while (!hit && distance < maxDepth) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                hitSide = 0;
                distance = (mapX - AppState.player.x + (1 - stepX) / 2) / cosA;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                hitSide = 1;
                distance = (mapY - AppState.player.y + (1 - stepY) / 2) / sinA;
            }

            if (mapX >= 0 && mapX < AppState.mapSize && mapY >= 0 && mapY < AppState.mapSize) {
                const tile = AppState.map[mapY][mapX];
                if (tile === TILES.WALL || tile === TILES.SECRET_WALL ||
                    (tile >= TILES.DOOR_1 && tile <= TILES.DOOR_3)) {
                    hit = true;
                    hitObject = tile;
                }
            } else {
                hit = true;
                distance = maxDepth;
            }
        }

        // Store Z-Buffer
        let perpWallDist = distance * Math.cos(rayAngle - AppState.player.dir);
        zBuffer[r] = perpWallDist;

        if (hit) {
            let lineHeight = Math.floor(h / perpWallDist);
            let drawStart = (-lineHeight / 2 + h / 2) + bobOffset;

            // --- TEXTURE MAPPING ---
            let wallX;
            if (hitSide === 0) wallX = AppState.player.y + perpWallDist * sinA;
            else wallX = AppState.player.x + perpWallDist * cosA;
            wallX -= Math.floor(wallX);

            // Texture Selection
            let texName = 'WALL';
            if (hitObject === TILES.SECRET_WALL) texName = 'SECRET_V2'; // Or default wall if secret shouldn't show
            if (hitObject >= TILES.DOOR_1 && hitObject <= TILES.DOOR_3) texName = 'DOOR';

            const texture = TEXTURES[texName];

            if (texture) {
                // Determine X coordinate on the texture
                let texX = Math.floor(wallX * texture.width);
                if (hitSide === 0 && cosA > 0) texX = texture.width - texX - 1;
                if (hitSide === 1 && sinA < 0) texX = texture.width - texX - 1;

                // Lighting intensity
                let shadow = hitSide === 1 ? 0.7 : 1.0;
                let fog = Math.max(0, 1 - (distance / maxDepth));
                fog = Math.pow(fog, 1.5);

                // Draw Texture Slice
                // ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
                ctx.drawImage(texture, texX, 0, 1, texture.height, r, drawStart, 1, lineHeight);

                // Apply Darkening Overlay for shadow/fog
                // (Since we can't tint the image easily without per-pixel or composition, 
                // we draw a semi-transparent black rect over it based on lighting)

                // 1. Shadow (Side wall)
                if (hitSide === 1) {
                    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                    ctx.fillRect(r, drawStart, 1, lineHeight);
                }

                // 2. Distance Fog (black overlay)
                let fogAlpha = 1.0 - fog; // fog is 1 near, 0 far. So alpha 0 near, 1 far
                if (fogAlpha > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${fogAlpha})`;
                    ctx.fillRect(r, drawStart, 1, lineHeight);
                }

            } else {
                // Fallback to old solid color logic (Error handling)
                let wallColor = WALL_COLORS[hitObject] || WALL_COLORS[TILES.WALL];
                let rCol = wallColor ? wallColor.r : 100;
                let gCol = wallColor ? wallColor.g : 100;
                let bCol = wallColor ? wallColor.b : 100;
                ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
                ctx.fillRect(r, drawStart, 1, lineHeight);
            }
        }

        currentAngle += deltaAngle;
    }

    // 4. SPRITE RENDERING
    const sprites = [];
    for (let y = 0; y < AppState.mapSize; y++) {
        for (let x = 0; x < AppState.mapSize; x++) {
            const tile = AppState.map[y][x];
            // Render Items
            // IDs: TREASURE(4), HAMMER(5), MAP_BASIC(6), KEY_1..3(7..9), MAP_ADVANCED(13), MAP_LEGENDARY(14)
            if ((tile >= TILES.TREASURE && tile <= TILES.KEY_3) || tile === TILES.MAP_ADVANCED || tile === TILES.MAP_LEGENDARY) {
                const spX = x + 0.5;
                const spY = y + 0.5;
                const dx = spX - AppState.player.x;
                const dy = spY - AppState.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                sprites.push({ x: spX, y: spY, dist: dist, tile: tile });
            }
        }
    }

    sprites.sort((a, b) => b.dist - a.dist);

    for (const sprite of sprites) {
        const spriteX = sprite.x - AppState.player.x;
        const spriteY = sprite.y - AppState.player.y;

        const invDet = 1.0 / (Math.cos(AppState.player.dir) * Math.cos(AppState.player.dir - Math.PI / 2) - Math.sin(AppState.player.dir) * Math.sin(AppState.player.dir - Math.PI / 2));

        const dirX = Math.cos(AppState.player.dir);
        const dirY = Math.sin(AppState.player.dir);
        const planeX = -dirY * 0.66;
        const planeY = dirX * 0.66;

        const invDetVal = 1.0 / (planeX * dirY - dirX * planeY);

        const transformX = invDetVal * (dirY * spriteX - dirX * spriteY);
        const transformY = invDetVal * (-planeY * spriteX + planeX * spriteY);

        if (transformY > 0) {
            const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));
            const spriteHeight = Math.abs(Math.floor(h / transformY));

            const drawHeight = Math.min(h * 2, spriteHeight);
            const drawWidth = drawHeight;

            const drawStartY = -drawHeight / 2 + h / 2 + bobOffset;

            if (spriteScreenX > 0 && spriteScreenX < w) {
                if (transformY < zBuffer[Math.floor(spriteScreenX)]) {
                    ctx.font = `${drawHeight * 0.6}px serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    // Default Style
                    ctx.fillStyle = "white";
                    ctx.shadowColor = "rgba(0,0,0,0.8)";
                    ctx.shadowBlur = 10;

                    // GLOW EFFECTS for MAPS
                    if (sprite.tile === TILES.MAP_ADVANCED) {
                        ctx.shadowColor = "#d35400"; // Rusty Brown Glow
                        ctx.shadowBlur = 20;
                    } else if (sprite.tile === TILES.MAP_LEGENDARY) {
                        ctx.shadowColor = "#f1c40f"; // Gold Glow
                        ctx.shadowBlur = 30;
                    }

                    ctx.fillText(TILE_ICONS[sprite.tile], spriteScreenX, drawStartY + drawHeight / 2);
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    if (AppState.inventory.mapLevel > 0) {
        drawMinimap(ctx, w);
    }
}

function drawMinimap(ctx, screenWidth) {
    const mapLevel = AppState.inventory.mapLevel;
    if (mapLevel === 0) return;

    const size = 150;
    const cellSize = size / AppState.mapSize;
    const margin = 20;
    const startX = screenWidth - size - margin;
    const startY = margin;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    if (mapLevel === 2) ctx.fillStyle = "rgba(60, 40, 20, 0.8)";
    if (mapLevel === 3) ctx.fillStyle = "rgba(20, 20, 0, 0.8)";

    ctx.fillRect(startX, startY, size, size);

    ctx.strokeStyle = (mapLevel === 2 ? "#d35400" : (mapLevel === 3 ? "#f1c40f" : "#fff"));
    ctx.lineWidth = 2;
    ctx.strokeRect(startX, startY, size, size);

    // Map content
    for (let y = 0; y < AppState.mapSize; y++) {
        for (let x = 0; x < AppState.mapSize; x++) {
            const tile = AppState.map[y][x];

            // --- Wall Rendering ---
            const isSecret = (tile === TILES.SECRET_WALL);
            let drawTile = tile;

            // Basic (1) & Advanced (2): Secret Walls look EXACTLY like Regular Walls
            if (mapLevel < 3 && isSecret) {
                drawTile = TILES.WALL;
            }

            if (drawTile === TILES.WALL || drawTile === TILES.SECRET_WALL) {
                let color = TILE_COLORS[drawTile] || "#555";

                // FORCE WALL COLOR for Basic/Advanced Map Secret Walls
                if (mapLevel < 3 && isSecret) {
                    color = TILE_COLORS[TILES.WALL];
                }

                ctx.fillStyle = color;
                ctx.fillRect(startX + x * cellSize, startY + y * cellSize, cellSize, cellSize);
            }



            // --- Icon Rendering ---
            if (tile >= TILES.START) {
                let showIcon = true;
                let icon = TILE_ICONS[tile];
                let color = "white";

                // FILTERING LOGIC
                if (mapLevel === 1) {
                    // Basic: Terrain only. Hide items.
                    if ((tile >= TILES.TREASURE && tile <= TILES.KEY_3) || (tile >= TILES.MAP_BASIC)) showIcon = false;
                }
                else if (mapLevel === 2) {
                    // Advanced: No Treasure. Generic Key.
                    if (tile === TILES.TREASURE) showIcon = false;

                    if (tile >= TILES.KEY_1 && tile <= TILES.KEY_3) {
                        icon = "🔑"; // Generic Key
                    }
                    if (tile >= TILES.DOOR_1 && tile <= TILES.DOOR_3) {
                        icon = "🚪"; // Generic Door
                    }
                    color = "#ecf0f1"; // Default text color
                }
                else if (mapLevel === 3) {
                    // Legendary: Show All + Gold Tone
                    color = "#f1c40f";
                }

                if (showIcon) {
                    ctx.font = `${cellSize * 0.7}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = color;

                    const tx = startX + x * cellSize + cellSize / 2;
                    const ty = startY + y * cellSize + cellSize / 2;

                    ctx.shadowColor = "black";
                    ctx.shadowBlur = 2;
                    ctx.fillText(icon, tx, ty);
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    // Player
    const px = startX + AppState.player.x * cellSize;
    const py = startY + AppState.player.y * cellSize;

    ctx.fillStyle = (mapLevel === 3 ? "#e74c3c" : "red");
    ctx.beginPath();
    ctx.arc(px, py, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();

    // Direction
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(AppState.player.dir) * (cellSize / 1.5), py + Math.sin(AppState.player.dir) * (cellSize / 1.5));
    ctx.stroke();
}

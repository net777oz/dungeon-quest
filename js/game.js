// Game Logic Module

import { AppState, TILES, TILE_ICONS } from './state.js';
import { Effects } from './effects.js';

let actionCooldown = false;
let moveCooldown = false;

// Rotation Logic
let targetDir = AppState.player.dir;
let isRotating = false;

export function updateGame(dt) {
    if (isRotating) {
        const speed = 5.0 * dt; // Rotation speed
        const diff = targetDir - AppState.player.dir;

        if (Math.abs(diff) < 0.05) {
            AppState.player.dir = targetDir;
            isRotating = false;
        } else {
            AppState.player.dir += Math.sign(diff) * speed;
        }
    }
}

export function handleGameInput(dx, dy, dt, gp) {
    // Sync logic state if not rotating
    if (!isRotating && Math.abs(AppState.player.dir - targetDir) > 0.1) {
        // This handles external drifts or initial load mismatches
        targetDir = AppState.player.dir;
    }

    // --- ROTATION (Discrete 90 degrees with Animation) ---
    const leftPressed = AppState.keysPressed['ArrowLeft'] || AppState.keysPressed['KeyA'] || (gp && gp.buttons[14].pressed) || dx < -0.5;
    const rightPressed = AppState.keysPressed['ArrowRight'] || AppState.keysPressed['KeyD'] || (gp && gp.buttons[15].pressed) || dx > 0.5;

    if (!isRotating) {
        if (leftPressed) {
            targetDir -= Math.PI / 2;
            isRotating = true;
        } else if (rightPressed) {
            targetDir += Math.PI / 2;
            isRotating = true;
        }
    }

    // --- MOVEMENT (Grid Based) ---
    // Initialize movement state if missing
    if (typeof AppState.player.isMoving === 'undefined') {
        AppState.player.isMoving = false;
        AppState.player.targetX = AppState.player.x;
        AppState.player.targetY = AppState.player.y;
    }

    if (!isRotating) {
        if (AppState.player.isMoving) {
            // Interpolate to target
            const speed = 6.0 * dt; // Tiles per second
            const tx = AppState.player.targetX;
            const ty = AppState.player.targetY;

            const dx = tx - AppState.player.x;
            const dy = ty - AppState.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.05) {
                // Snap to target
                AppState.player.x = tx;
                AppState.player.y = ty;
                AppState.player.isMoving = false;
            } else {
                // Move towards
                AppState.player.x += (dx / dist) * speed;
                AppState.player.y += (dy / dist) * speed;
            }

        } else {
            // Input Check (Only if not moving)
            const upPressed = AppState.keysPressed['ArrowUp'] || AppState.keysPressed['KeyW'] || (gp && gp.buttons[12].pressed) || dy < -0.5;
            const downPressed = AppState.keysPressed['ArrowDown'] || AppState.keysPressed['KeyS'] || (gp && gp.buttons[13].pressed) || dy > 0.5;

            if (upPressed || downPressed) {
                const moveDir = downPressed ? -1 : 1;

                // Calculate target tile based on direction (snap to nearest integer grid)
                // Assuming Cardinal Directions for simplicity or existing free angle?
                // The User asked for "Forward/Backward 1 block".

                // Get current facing vector rounded to nearest cardinal
                // This ensures we move perfectly on grid axes even if dir is slightly off
                const cos = Math.round(Math.cos(AppState.player.dir));
                const sin = Math.round(Math.sin(AppState.player.dir));

                const targetX = Math.floor(AppState.player.x) + 0.5 + (cos * moveDir);
                const targetY = Math.floor(AppState.player.y) + 0.5 + (sin * moveDir);

                if (!isSolid(targetX, targetY)) {
                    AppState.player.targetX = targetX;
                    AppState.player.targetY = targetY;
                    AppState.player.isMoving = true;
                }
            }
        }
    }

    // --- INTERACTION ---
    checkTileInteraction();

    const btnA = (gp && gp.buttons[0].pressed) || AppState.keysPressed['Space'] || AppState.keysPressed['Enter'];
    if (btnA && !actionCooldown) {
        performInteraction();
        actionCooldown = true;
        setTimeout(() => actionCooldown = false, 300);
    }
}

function isSolid(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    // Boundary check
    if (tx < 0 || tx >= AppState.mapSize || ty < 0 || ty >= AppState.mapSize) return true;

    const tile = AppState.map[ty][tx];
    // Walls and Closed Doors are solid
    return tile === TILES.WALL || tile === TILES.SECRET_WALL ||
        (tile >= TILES.DOOR_1 && tile <= TILES.DOOR_3);
}

function checkTileInteraction() {
    const px = Math.floor(AppState.player.x);
    const py = Math.floor(AppState.player.y);

    // Bounds check
    if (px < 0 || px >= AppState.mapSize || py < 0 || py >= AppState.mapSize) return;

    const tile = AppState.map[py][px];

    if (tile === TILES.EMPTY) return;

    let picked = false;

    if (tile === TILES.HAMMER) {
        AppState.inventory.hammer = true;
        picked = true;
    } else if (tile === TILES.MAP_BASIC) {
        AppState.inventory.mapLevel = Math.max(AppState.inventory.mapLevel, 1);
        picked = true;
    } else if (tile === TILES.MAP_ADVANCED) {
        AppState.inventory.mapLevel = Math.max(AppState.inventory.mapLevel, 2);
        picked = true;
    } else if (tile === TILES.MAP_LEGENDARY) {
        AppState.inventory.mapLevel = Math.max(AppState.inventory.mapLevel, 3);
        picked = true;
    } else if (tile === TILES.KEY_1) {
        AppState.inventory.keys[0] = true;
        picked = true;
    } else if (tile === TILES.KEY_2) {
        AppState.inventory.keys[1] = true;
        picked = true;
    } else if (tile === TILES.KEY_3) {
        AppState.inventory.keys[2] = true;
        picked = true;
    } else if (tile === TILES.TREASURE) {
        AppState.inventory.treasures++;
        picked = true;
    }

    if (picked) {
        AppState.map[py][px] = TILES.EMPTY;

        // Visual FX
        Effects.init(); // Ensure layer exists

        let msg = "찾았다!";
        let color = "#ffd700";

        let cssClass = '';
        if (tile === TILES.MAP_BASIC || tile === TILES.MAP_ADVANCED || tile === TILES.MAP_LEGENDARY) {
            msg = "지도를 넓혔다!";
            color = "#3498db";
            Effects.flashColor('#3498db'); // Blue
        } else if (tile === TILES.TREASURE) {
            Effects.flashColor('#f1c40f'); // Gold
        } else if (tile === TILES.KEY_1) {
            cssClass = 'filter-iron';
            Effects.flashColor('#bdc3c7');
        } else if (tile === TILES.KEY_2) {
            cssClass = 'filter-copper';
            Effects.flashColor('#d35400');
        } else if (tile === TILES.KEY_3) {
            cssClass = 'filter-cobalt';
            Effects.flashColor('#0047ab');
        } else {
            Effects.flashColor('#ffffff'); // White
        }

        // Show Notification ONCE
        Effects.showFloatingIcon(TILE_ICONS[tile], msg, color, cssClass);

        if (tile === TILES.TREASURE) {
            if (AppState.inventory.treasures >= AppState.inventory.totalTreasures) {
                setTimeout(() => Effects.showVictory(), 1000);
            }
        }

        updateInventoryUI();
    }
}

export function performInteraction() {
    // Check tile in front of player
    const dist = 1.0;
    const fx = AppState.player.x + Math.cos(AppState.player.dir) * dist;
    const fy = AppState.player.y + Math.sin(AppState.player.dir) * dist;

    const mapX = Math.floor(fx);
    const mapY = Math.floor(fy);

    if (mapX >= 0 && mapX < AppState.mapSize && mapY >= 0 && mapY < AppState.mapSize) {
        const tile = AppState.map[mapY][mapX];

        // Door Interaction
        if (tile >= TILES.DOOR_1 && tile <= TILES.DOOR_3) {
            // Check Key
            const doorIdx = tile - TILES.DOOR_1;
            if (AppState.inventory.keys[doorIdx]) {
                AppState.map[mapY][mapX] = TILES.EMPTY;
                Effects.showFloatingIcon("🔓", "문이 열렸다!", "#2ecc71");
            } else {
                Effects.showFloatingIcon("🔒", "잠겨있다...", "red");
            }
        }
        // Secret Wall Interaction
        else if (tile === TILES.SECRET_WALL) {
            if (AppState.inventory.hammer) {
                AppState.map[mapY][mapX] = TILES.EMPTY;
                Effects.spawnDebris(mapX, mapY); // Particle FX
                Effects.showFloatingIcon("💥", "쾅!", "orange");
            } else {
                Effects.showFloatingIcon("🧱", "망치가 필요해.", "gray");
            }
        }
    }
}

function showNotification(msg) {
    const overlay = document.getElementById('message-overlay');
    if (overlay) {
        overlay.innerText = msg;
        overlay.style.opacity = 1;
        setTimeout(() => overlay.style.opacity = 0, 2000);
    }
}

function updateInventoryUI() {
    const inv = AppState.inventory;

    // Determine Map Icon
    const slotMap = document.getElementById('slot-map');
    slotMap.innerText = "🗺️"; // Always standard icon

    // Reset Classes
    slotMap.className = 'inv-slot';
    if (inv.mapLevel > 0) {
        setSlot('slot-map', true);
        if (inv.mapLevel === 2) slotMap.classList.add('map-advanced');
        if (inv.mapLevel === 3) slotMap.classList.add('map-legendary');
    } else {
        setSlot('slot-map', false);
    }

    setSlot('slot-hammer', inv.hammer);
    setSlot('slot-key1', inv.keys[0], 'key-iron');
    setSlot('slot-key2', inv.keys[1], 'key-copper');
    setSlot('slot-key3', inv.keys[2], 'key-cobalt');

    const tCount = document.getElementById('treasure-count');
    if (tCount) tCount.innerText = inv.treasures;
}

function setSlot(id, hasItem, className = '') {
    const el = document.getElementById(id);
    if (el) {
        if (hasItem) {
            el.classList.add('has-item');
            if (className) el.classList.add(className);
        } else {
            el.classList.remove('has-item');
            if (className) el.classList.remove(className);
        }
    }
}

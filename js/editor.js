import { AppState, TILES, TILE_COLORS, TILE_ICONS } from './state.js';

export function createEmptyMap(size) {
    AppState.mapSize = size;
    AppState.map = [];
    for (let y = 0; y < size; y++) {
        let row = [];
        for (let x = 0; x < size; x++) {
            row.push(TILES.WALL);
        }
        AppState.map.push(row);
    }
    AppState.map[1][1] = TILES.EMPTY;
}

export function loadLevel(levelData) {
    if (!levelData) return;

    AppState.mapSize = levelData.size;
    // Deep copy the map to avoid editing the original reference in LEVELS
    AppState.map = JSON.parse(JSON.stringify(levelData.map));

    // Reset Player State
    AppState.player = { x: 1.5, y: 1.5, dir: 0 };
    AppState.inventory = {
        hammer: false,
        mapLevel: 0,
        keys: [false, false, false],
        treasures: 0,
        totalTreasures: 0
    };

    // Count Total Treasures in the new level
    for (let y = 0; y < AppState.mapSize; y++) {
        for (let x = 0; x < AppState.mapSize; x++) {
            if (AppState.map[y][x] === TILES.TREASURE) {
                AppState.inventory.totalTreasures++;
            }
        }
    }

    // Set UI slider
    const slider = document.getElementById('size-slider');
    if (slider) {
        slider.value = AppState.mapSize;
        const label = document.getElementById('size-label');
        if (label) label.innerText = `${AppState.mapSize}x${AppState.mapSize}`;
    }
}

export function exportMapData() {
    const data = {
        name: "Custom Level",
        size: AppState.mapSize,
        map: AppState.map
    };
    return JSON.stringify(data, null, 4);
}

export function renderEditor() {
    const canvas = document.getElementById('screen');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    // Calculate Grid Scaling
    const cellSize = Math.min(w, h) / AppState.mapSize;
    const offsetX = (w - (cellSize * AppState.mapSize)) / 2;
    const offsetY = (h - (cellSize * AppState.mapSize)) / 2;

    // Draw Map
    for (let y = 0; y < AppState.mapSize; y++) {
        for (let x = 0; x < AppState.mapSize; x++) {
            const tile = AppState.map[y][x];
            // Determine Background Color
            let bgColor = TILE_COLORS[tile] || '#000';
            // Items should have dark background so icon pops
            if (tile >= TILES.START) {
                bgColor = 'rgba(0,0,0,0.5)';
            }
            ctx.fillStyle = bgColor;
            ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize - 1, cellSize - 1);

            // Icon
            if (TILE_ICONS[tile] && tile !== TILES.EMPTY && tile !== TILES.WALL) {
                ctx.font = `${cellSize / 1.5}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Icon Color
                ctx.fillStyle = "white";
                if (tile >= TILES.START) {
                    ctx.fillStyle = TILE_COLORS[tile]; // Use the specific color for the icon
                    // Treasure override
                    if (tile === TILES.TREASURE) ctx.fillStyle = "#e74c3c"; // Ruby
                }

                ctx.fillText(TILE_ICONS[tile], offsetX + x * cellSize + cellSize / 2, offsetY + y * cellSize + cellSize / 2);
            }
        }
    }

    // Draw Cursor
    const cx = AppState.editorCursor.x;
    const cy = AppState.editorCursor.y;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX + cx * cellSize, offsetY + cy * cellSize, cellSize, cellSize);

    // Cursor Blink
    if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(offsetX + cx * cellSize, offsetY + cy * cellSize, cellSize, cellSize);
    }
}

let actionCooldown = false;
let movementTimer = 0;

export function handleEditorInput(dx, dy, gp) {
    // Cursor Movement (throttled)
    movementTimer += 1;
    if (movementTimer > 5) {
        if (Math.abs(dx) > 0.5) AppState.editorCursor.x += Math.sign(dx);
        if (Math.abs(dy) > 0.5) AppState.editorCursor.y += Math.sign(dy);

        // Clamp
        AppState.editorCursor.x = Math.max(0, Math.min(AppState.mapSize - 1, AppState.editorCursor.x));
        AppState.editorCursor.y = Math.max(0, Math.min(AppState.mapSize - 1, AppState.editorCursor.y));

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) movementTimer = 0;
    }

    // Action: A Button (Place Tile)
    const btnA = (gp && gp.buttons[0].pressed) || AppState.keysPressed['Space'];

    if (btnA && !actionCooldown) {
        placeTileAtCursor();
        actionCooldown = true;
        setTimeout(() => actionCooldown = false, 200);
    }
}

export function placeTileAtCursor() {
    const { x, y } = AppState.editorCursor;
    const tileToPlace = AppState.selectedTile;
    const currentTile = AppState.map[y][x];

    if (tileToPlace === TILES.EMPTY) {
        AppState.map[y][x] = tileToPlace;
        return;
    }

    // Must be path or existing item
    const isPath = currentTile === TILES.EMPTY;
    const isItem = currentTile > TILES.WALL;

    if (isPath || isItem || currentTile === TILES.SECRET_WALL) {
        AppState.map[y][x] = tileToPlace;
    } else {
        // trying to place on wall -> Error Feedback?
        // showNotification is global logic, might need to import or dispatch event
        console.log("Cannot place here");
    }
}

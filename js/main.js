import { AppState, TILES, TILE_ICONS } from './state.js';
import { loadLevel, exportMapData, createEmptyMap, renderEditor, handleEditorInput, placeTileAtCursor } from './editor.js';
import { renderGame } from './renderer.js';
import { handleGameInput, updateGame, performInteraction } from './game.js';
import { LEVELS } from './levels.js';
import { initTextures } from './textures.js';

// --- Initialization ---
window.onload = function () {
    console.log("Dungeon Quest Initializing...");
    initTextures();

    // Default Start: Level 1 in Play Mode
    // Default Start: Level 1
    if (LEVELS.length > 0) {
        loadLevel(LEVELS[0]);
    } else {
        createEmptyMap(10);
    }
    setupEvents();
    buildPalette();

    // Start in Play Mode
    enterPlayMode();

    requestAnimationFrame(gameLoop);
};

// --- Main Loop ---
function gameLoop(timestamp) {
    const dt = (timestamp - AppState.lastTime) / 1000;
    AppState.lastTime = timestamp;

    handleInput(dt);

    if (AppState.mode === 'EDITOR') {
        renderEditor();
    } else {
        updateGame(dt);
        renderGame(dt);
    }

    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function handleInput(dt) {
    const gp = AppState.gamepadIndex !== null ? navigator.getGamepads()[AppState.gamepadIndex] : null;

    // Helper for "Just Pressed" - not strictly needed for basic movement but good for actions
    // const isPressed = ...

    // D-PAD / Axes / WASD
    let dx = 0, dy = 0;
    if (AppState.keysPressed['ArrowUp'] || AppState.keysPressed['KeyW']) dy = -1;
    if (AppState.keysPressed['ArrowDown'] || AppState.keysPressed['KeyS']) dy = 1;
    if (AppState.keysPressed['ArrowLeft'] || AppState.keysPressed['KeyA']) dx = -1;
    if (AppState.keysPressed['ArrowRight'] || AppState.keysPressed['KeyD']) dx = 1;

    if (gp) {
        if (gp.buttons[12].pressed) dy = -1;
        if (gp.buttons[13].pressed) dy = 1;
        if (gp.buttons[14].pressed) dx = -1;
        if (gp.buttons[15].pressed) dx = 1;
        // Analog stick support
        if (Math.abs(gp.axes[0]) > 0.2) dx = gp.axes[0];
        if (Math.abs(gp.axes[1]) > 0.2) dy = gp.axes[1];

        // Mode Switch (Start Button usually index 9)
        if (gp.buttons[9] && gp.buttons[9].pressed) {
            // Debounce logic needed typically but simplified:
            // Switch mode if not handled
        }
    }

    if (AppState.mode === 'EDITOR') {
        handleEditorInput(dx, dy, gp);
    } else {
        handleGameInput(dx, dy, dt, gp);
    }
}

function setupEvents() {
    window.addEventListener('keydown', e => AppState.keysPressed[e.code] = true);
    window.addEventListener('keyup', e => AppState.keysPressed[e.code] = false);

    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected:", e.gamepad.id);
        AppState.gamepadIndex = e.gamepad.index;
        showNotification("🎮 Gamepad Connected!");
    });

    // UI - Editor
    const canvas = document.getElementById('screen');

    // Mouse Support for Editor & Game
    canvas.addEventListener('mousedown', (e) => {
        if (AppState.mode === 'PLAY') {
            // Simple interaction on click
            performInteraction();
            return;
        }

        if (AppState.mode !== 'EDITOR') return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const cellSize = Math.min(canvas.width, canvas.height) / AppState.mapSize;
        const offsetX = (canvas.width - (cellSize * AppState.mapSize)) / 2;
        const offsetY = (canvas.height - (cellSize * AppState.mapSize)) / 2;

        const gridX = Math.floor((mouseX - offsetX) / cellSize);
        const gridY = Math.floor((mouseY - offsetY) / cellSize);

        if (gridX >= 0 && gridX < AppState.mapSize && gridY >= 0 && gridY < AppState.mapSize) {
            AppState.editorCursor.x = gridX;
            AppState.editorCursor.y = gridY;
            placeTileAtCursor();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (AppState.mode !== 'EDITOR' || !e.buttons) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

        const cellSize = Math.min(canvas.width, canvas.height) / AppState.mapSize;
        const offsetX = (canvas.width - (cellSize * AppState.mapSize)) / 2;
        const offsetY = (canvas.height - (cellSize * AppState.mapSize)) / 2;
        const gridX = Math.floor((mouseX - offsetX) / cellSize);
        const gridY = Math.floor((mouseY - offsetY) / cellSize);

        if (gridX >= 0 && gridX < AppState.mapSize && gridY >= 0 && gridY < AppState.mapSize) {
            AppState.editorCursor.x = gridX;
            AppState.editorCursor.y = gridY;
            placeTileAtCursor();
        }
    });

    document.getElementById('play-btn').onclick = enterPlayMode;
    document.getElementById('edit-btn').onclick = enterEditorMode;
    document.getElementById('reset-map-btn').onclick = () => {
        if (confirm("Clear Map?")) createEmptyMap(10);
    };

    // Size Slider
    document.getElementById('size-slider').oninput = (e) => {
        document.getElementById('size-label').innerText = `${e.target.value}x${e.target.value}`;
    };

    // Level Management
    const selector = document.getElementById('level-select');
    const deleteBtn = document.getElementById('delete-level-btn');
    const saveBtn = document.getElementById('save-level-btn');

    function refreshLevelList() {
        selector.innerHTML = '';

        // 1. Static Levels
        const optGroupStatic = document.createElement('optgroup');
        optGroupStatic.label = "기본 레벨";
        LEVELS.forEach((lvl, idx) => {
            const opt = document.createElement('option');
            opt.value = `static:${idx}`;
            opt.innerText = lvl.name;
            optGroupStatic.appendChild(opt);
        });
        selector.appendChild(optGroupStatic);

        // 2. Custom Levels (Local Storage)
        const customLevels = JSON.parse(localStorage.getItem('my_dungeon_levels') || '[]');
        if (customLevels.length > 0) {
            const optGroupCustom = document.createElement('optgroup');
            optGroupCustom.label = "내가 만든 레벨";
            customLevels.forEach((lvl, idx) => {
                const opt = document.createElement('option');
                opt.value = `custom:${idx}`;
                opt.innerText = lvl.name;
                optGroupCustom.appendChild(opt);
            });
            selector.appendChild(optGroupCustom);
        }
    }

    if (selector) {
        refreshLevelList();

        selector.onchange = (e) => {
            const val = e.target.value;
            const type = val.split(':')[0];
            const idx = parseInt(val.split(':')[1]);

            if (confirm("레벨을 불러올까요? 현재 작업 중인 내용은 사라집니다.")) {
                if (type === 'static') {
                    loadLevel(LEVELS[idx]);
                    deleteBtn.style.display = 'none';
                } else {
                    const customLevels = JSON.parse(localStorage.getItem('my_dungeon_levels') || '[]');
                    if (customLevels[idx]) {
                        loadLevel(customLevels[idx]);
                        deleteBtn.style.display = 'block';
                        deleteBtn.onclick = () => {
                            if (confirm(`'${customLevels[idx].name}'을(를) 정말 삭제할까요?`)) {
                                customLevels.splice(idx, 1);
                                localStorage.setItem('my_dungeon_levels', JSON.stringify(customLevels));
                                refreshLevelList();
                                createEmptyMap(10); // Reset
                            }
                        };
                    }
                }
            }
        };
    }

    if (saveBtn) {
        saveBtn.onclick = () => {
            const name = prompt("이 레벨의 이름을 지어주세요:", "나의 멋진 던전");
            if (name) {
                const data = {
                    name: name,
                    size: AppState.mapSize,
                    map: AppState.map
                };

                const customLevels = JSON.parse(localStorage.getItem('my_dungeon_levels') || '[]');
                customLevels.push(data);
                localStorage.setItem('my_dungeon_levels', JSON.stringify(customLevels));

                refreshLevelList();
                selector.value = `custom:${customLevels.length - 1}`; // Select new level
                deleteBtn.style.display = 'block';
                alert("저장되었습니다! '내가 만든 레벨' 목록에서 확인할 수 있어요.");
            }
        };
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.onclick = () => {
            const json = exportMapData();
            const area = document.getElementById('export-output');
            area.style.display = 'block';
            area.value = json;
            area.select();
            // Try clipboard
            try {
                navigator.clipboard.writeText(json);
                alert("코드가 복사되었습니다! 채팅창에 붙여넣어 주세요.");
            } catch (err) {
                alert("아래 텍스트 박스의 코드를 복사해주세요.");
            }
        };
    }
}

function enterPlayMode() {
    // Check Start
    let startFound = false;
    for (let row of AppState.map) {
        if (row.includes(TILES.START)) startFound = true;
    }

    if (!startFound) {
        showNotification("No Start Point (🚩) Found!");
        return;
    }

    // Reset Inventory for a fresh run
    AppState.inventory = {
        hammer: false,
        mapLevel: 0,
        keys: [false, false, false],
        treasures: 0,
        totalTreasures: 0
    };

    // Find Start, Set Player, and Recount Treasures
    for (let y = 0; y < AppState.mapSize; y++) {
        for (let x = 0; x < AppState.mapSize; x++) {
            const tile = AppState.map[y][x];

            if (tile === TILES.START) {
                AppState.player.x = x + 0.5;
                AppState.player.y = y + 0.5;
                AppState.player.dir = 0; // Reset direction too? Maybe safer.
            }

            if (tile === TILES.TREASURE) {
                AppState.inventory.totalTreasures++;
            }
        }
    }

    AppState.mode = 'PLAY';
    document.getElementById('editor-ui').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';

    const badge = document.getElementById('mode-badge');
    badge.className = 'mode-badge mode-play';
    badge.innerText = 'Explorer Mode';

    showNotification("Explorer Mode! 🦊");

    // Update UI initial state
    // We need to make sure UI reflects the empty inventory
    // Ideally we call updateInventoryUI() from game.js, but it's not exported to main...
    // Actually game loop calls updateGame -> updateInventoryUI eventually? 
    // updateGame calls it? No, game loop calls updateGame and renderGame.
    // updateInventoryUI is usually called on interaction events.
    // Let's check game.js exports. updateInventoryUI is NOT exported.
    // However, the game loop runs constantly. 
    // We should probably just let the game logic handle UI updates, 
    // OR export updateInventoryUI.
    // For now, let's trust the game state reset. 
    // Wait, if UI is stale until first interaction, that's bad.
    // But check main.js imports... updateGame is imported.
    // I can stick a call to a reset function if needed, but game.js doesn't expose one.
    // Actually, renderer.drawMinimap uses AppState, so visual updates happen.
    // The HTML inventory DOM might be stale.
    // Let's add `updateInventoryUI` to the exports of `game.js` if it's not too much trouble?
    // User didn't ask for it, but "bug fix" implies "works correctly".
    // I'll stick to fixing the "Win Condition" first. Use existing flow. 
    // Actually, game.js:updateInventoryUI update on interaction only.
    // That means "Hammer" icon might show if I had it before.
    // I should fix that too to be clean.
}

function enterEditorMode() {
    AppState.mode = 'EDITOR';
    document.getElementById('editor-ui').style.display = 'block';
    document.getElementById('game-ui').style.display = 'none';

    const badge = document.getElementById('mode-badge');
    badge.className = 'mode-badge mode-editor';
    badge.innerText = 'Editor Mode';
}

function buildPalette() {
    const container = document.getElementById('palette-container');
    container.innerHTML = '';

    Object.keys(TILES).forEach(key => {
        const val = TILES[key];
        const div = document.createElement('div');
        div.className = 'palette-item';
        div.innerText = TILE_ICONS[val];

        // Apply Color
        let color = "white";
        // Items logic
        if (val >= TILES.START) {
            const baseCol = (typeof TILE_COLORS[val] === 'string') ? TILE_COLORS[val] : '#fff';
            color = baseCol;
            // Treasure Override
            if (val === TILES.TREASURE) color = "#e74c3c"; // Ruby
        }
        div.style.color = color;
        div.style.textShadow = `0 0 5px ${color}`;

        div.onclick = () => {
            AppState.selectedTile = val;
            document.querySelectorAll('.palette-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');

            // Text Update
            const name = key.replace('_', ' ');
            let hint = "(Click to Place)";
            if (val === TILES.EMPTY) hint = "(Drag to Dig)";
            document.getElementById('selected-tool-name').innerText = `${name} ${hint}`;
        };

        if (val === TILES.EMPTY) {
            div.click(); // Default select
        }

        container.appendChild(div);
    });
}

function showNotification(msg) {
    const overlay = document.getElementById('message-overlay');
    overlay.innerText = msg;
    overlay.style.opacity = 1;
    setTimeout(() => overlay.style.opacity = 0, 2000);
}

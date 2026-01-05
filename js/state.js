export const TILES = {
    EMPTY: 0,
    WALL: 1,
    SECRET_WALL: 2,
    START: 3,
    TREASURE: 4,
    HAMMER: 5,
    MAP_BASIC: 6,
    MAP_ADVANCED: 13,
    MAP_LEGENDARY: 14,
    KEY_1: 7, KEY_2: 8, KEY_3: 9,
    DOOR_1: 10, DOOR_2: 11, DOOR_3: 12
};

export const TILE_COLORS = {
    [TILES.EMPTY]: "#2c3e50",
    [TILES.WALL]: "#95a5a6",
    [TILES.SECRET_WALL]: "#7f8c8d",
    [TILES.START]: "#2ecc71",
    [TILES.TREASURE]: "#f1c40f",
    [TILES.HAMMER]: "#e67e22",
    [TILES.MAP_BASIC]: "#bdc3c7",     // Basic Grey/White
    [TILES.MAP_ADVANCED]: "#d35400",  // Rusty/Brown
    [TILES.MAP_LEGENDARY]: "#f1c40f", // Gold
    [TILES.KEY_1]: "#e74c3c", [TILES.KEY_2]: "#e74c3c", [TILES.KEY_3]: "#e74c3c",
    [TILES.DOOR_1]: "#8e44ad", [TILES.DOOR_2]: "#8e44ad", [TILES.DOOR_3]: "#8e44ad"
};

export const TILE_ICONS = {
    [TILES.EMPTY]: "⬛",
    [TILES.WALL]: "🧱",
    [TILES.SECRET_WALL]: "🤫",
    [TILES.START]: "🚩",
    [TILES.TREASURE]: "💎",
    [TILES.HAMMER]: "🔨",
    [TILES.MAP_BASIC]: "🗺️",
    [TILES.MAP_ADVANCED]: "🗺️",
    [TILES.MAP_LEGENDARY]: "🗺️",
    [TILES.KEY_1]: "🔑1", [TILES.KEY_2]: "🔑2", [TILES.KEY_3]: "🔑3",
    [TILES.DOOR_1]: "🚪1", [TILES.DOOR_2]: "🚪2", [TILES.DOOR_3]: "🚪3"
};

export const WALL_COLORS = {
    [TILES.WALL]: { r: 100, g: 149, b: 237 },
    [TILES.SECRET_WALL]: { r: 100, g: 149, b: 237 },
    [TILES.DOOR_1]: { r: 231, g: 76, b: 60 },
    [TILES.DOOR_2]: { r: 52, g: 152, b: 219 },
    [TILES.DOOR_3]: { r: 46, g: 204, b: 113 }
};

export const AppState = {
    mode: 'EDITOR',
    mapSize: 10,
    map: [],

    // Editor Cursor
    editorCursor: { x: 1, y: 1 },
    selectedTile: TILES.EMPTY,

    // Game Player
    player: { x: 1.5, y: 1.5, dir: 0 },
    inventory: {
        hammer: false,
        mapLevel: 0, // 0: None, 1: Basic, 2: Advanced, 3: Legendary
        keys: [false, false, false],
        treasures: 0,
        totalTreasures: 0
    },

    gamepadIndex: null,
    keysPressed: {},
    lastTime: 0
};

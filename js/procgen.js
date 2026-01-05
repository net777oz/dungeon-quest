import { TILES } from './state.js';

export class ProcGen {
    static generateLevel(size) {
        // Difficulty Config
        let treasures = 1;
        let doors = 1;

        if (size >= 20) {
            treasures = 3;
            doors = 3;
        } else if (size >= 15) {
            treasures = 2;
            doors = 2;
        }

        // 1. Initialize Solid Map
        const map = [];
        for (let y = 0; y < size; y++) {
            const row = [];
            for (let x = 0; x < size; x++) {
                row.push(TILES.WALL);
            }
            map.push(row);
        }

        // 2. Maze Carving (Recursive Backtracking DFS)
        // Ensure odd coordinates for rooms to have walls between them in a 2x scaled grid logic,
        // but here we are carving 1x1 tiles.
        // For a maze in a grid of size WxH, we usually need odd dimensions or careful step of 2.
        // Let's use a standard step-2 algorithm. 
        // Start at 1,1
        const startX = 1;
        const startY = 1;
        map[startY][startX] = TILES.EMPTY;

        const stack = [{ x: startX, y: startY }];
        const directions = [
            { dx: 0, dy: -2 }, // Up
            { dx: 0, dy: 2 },  // Down
            { dx: -2, dy: 0 }, // Left
            { dx: 2, dy: 0 }   // Right
        ];

        while (stack.length > 0) {
            const current = stack[stack.length - 1];

            // Shuffle directions
            directions.sort(() => Math.random() - 0.5);

            let carved = false;
            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const midX = current.x + (dir.dx / 2);
                const midY = current.y + (dir.dy / 2);

                if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && map[ny][nx] === TILES.WALL) {
                    map[ny][nx] = TILES.EMPTY;
                    map[midY][midX] = TILES.EMPTY;
                    stack.push({ x: nx, y: ny });
                    carved = true;
                    break;
                }
            }

            if (!carved) {
                stack.pop();
            }
        }

        // 3. Analyze Distances (BFS from Start)
        // Returns { dists: grid of distances, maxDist: int, maxPos: {x,y}, paths: {x_y: parent} }
        const analysis = this.analyzeMap(map, size, startX, startY);

        // 4. Place Doors & Keys
        // Strategy: Place Door on the path to the furthest point, then place Key in ANY accessible area.
        // We will do this iteratively.
        // Current accessible map is just the open layout.

        let availableDoors = [TILES.DOOR_1, TILES.DOOR_2, TILES.DOOR_3];
        let availableKeys = [TILES.KEY_1, TILES.KEY_2, TILES.KEY_3];

        // We place doors in REVERSE order (Deepest/Highest Tier to Closest).
        // This ensures that Key N (Deep) is placed in the large accessible area.
        // Then Door N-1 (Medium) is placed closer, and Key N-1 is placed in the *remaining* accessible area (which is smaller).
        // This effectively prevents "Lockout" scenarios where a low-tier door blocks a high-tier key.
        for (let i = doors - 1; i >= 0; i--) {
            // Re-analyze from Start based on CURRENT map state (doors block paths)
            const currentAnalysis = this.analyzeMap(map, size, startX, startY);

            // If we can't reach far enough, stop.
            if (currentAnalysis.maxDist < 5) break;

            // Find valid door spots
            const path = this.getPath(currentAnalysis.paths, currentAnalysis.maxPos);

            if (path.length < 5) continue;

            // Pick a spot for the Door. 
            // Since we are going High -> Low, we want the first doors (High) to be DEEP.
            // And later doors (Low) to be Shallow.
            // Let's vary the "percentage down the path" based on Tier?
            // Actually, just placing it at ~60-80% of current max path works well repeatedly.
            let doorIndex = Math.floor(path.length * 0.7);
            let doorPos = path[doorIndex];

            // Ensure door isn't at start or adjacent
            if (doorIndex < 2) doorPos = path[2];

            // Place Door
            const doorTile = availableDoors[i];
            map[doorPos.y][doorPos.x] = doorTile;

            // Place Key
            // With reverse order, we just need to place the key in the CURRENTLY accessible area.
            // The door we just placed is now a Wall. 
            // The key for THIS door must be reachable *now*.
            const lockedAnalysis = this.analyzeMap(map, size, startX, startY);

            const keyCandidates = [];
            for (let y = 1; y < size - 1; y++) {
                for (let x = 1; x < size - 1; x++) {
                    if (lockedAnalysis.dists[y][x] !== -1 && map[y][x] === TILES.EMPTY) {
                        keyCandidates.push({ x, y, dist: lockedAnalysis.dists[y][x] });
                    }
                }
            }

            // Pick a candidate
            keyCandidates.sort((a, b) => b.dist - a.dist);
            // Take top 50% to allow some variance but safe distance
            const topCandidates = keyCandidates.slice(0, Math.ceil(keyCandidates.length * 0.5));
            const keyPos = topCandidates[Math.floor(Math.random() * topCandidates.length)];

            if (keyPos) {
                map[keyPos.y][keyPos.x] = availableKeys[i];
            } else {
                map[1][2] = availableKeys[i];
            }
        }

        // 5. Place Treasures
        // Re-analyze final map accessibility (assuming all doors openable)
        // But functionally, we want treasures in deep dead ends relative to the full maze.
        // So treat doors as walkable for this calculation? Yes, logical reachable.
        // BUT `analyzeMap` treats doors as Obstacles by default (isSolid check?).
        // Let's pass a flag to walk through doors.
        const finalAnalysis = this.analyzeMap(map, size, startX, startY, true);

        let placedTreasures = 0;
        // Naive: Just pick the N furthest empty tiles.
        const openTiles = [];
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                if (finalAnalysis.dists[y][x] !== -1 && map[y][x] === TILES.EMPTY) {
                    openTiles.push({ x, y, dist: finalAnalysis.dists[y][x] });
                }
            }
        }
        openTiles.sort((a, b) => b.dist - a.dist);

        for (let i = 0; i < treasures; i++) {
            if (openTiles.length > i) {
                const t = openTiles[i];
                map[t.y][t.x] = TILES.TREASURE;
            }
        }

        // 6. Hammer (Reachable from Start)
        // Re-scan with doors BLOCKED to ensure Hammer is in the "Lobby" area (optional, but safer)
        // OR treating doors as closed is fine.
        const lobbyAnalysis = this.analyzeMap(map, size, startX, startY, false);
        const lobbyTiles = [];
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                if (lobbyAnalysis.dists[y][x] !== -1 && map[y][x] === TILES.EMPTY) {
                    lobbyTiles.push({ x, y });
                }
            }
        }
        if (lobbyTiles.length > 0) {
            const hPos = lobbyTiles[Math.floor(Math.random() * lobbyTiles.length)];
            map[hPos.y][hPos.x] = TILES.HAMMER;
        }

        // 7. Secret Walls
        // Find walls that have TWO empty neighbors (connects two areas or dead end extension).
        // Simplification: Randomly pick internal walls and check neighbors.
        for (let y = 2; y < size - 2; y++) {
            for (let x = 2; x < size - 2; x++) {
                if (map[y][x] === TILES.WALL) {
                    // Check horizontal neighbors
                    if (map[y][x - 1] !== TILES.WALL && map[y][x + 1] !== TILES.WALL) {
                        if (Math.random() < 0.05) map[y][x] = TILES.SECRET_WALL;
                    }
                    // Check vertical neighbors
                    else if (map[y - 1][x] !== TILES.WALL && map[y + 1][x] !== TILES.WALL) {
                        if (Math.random() < 0.05) map[y][x] = TILES.SECRET_WALL;
                    }
                }
            }
        }

        // 8. Place Maps (1-3)
        // Basic, Advanced, Legendary
        const mapCount = 1 + Math.floor(Math.random() * 3);
        const mapTypes = [TILES.MAP_BASIC, TILES.MAP_ADVANCED, TILES.MAP_LEGENDARY];

        let placedMaps = 0;
        // Use `openTiles` (sorted by distance) from earlier, but filter out consumed ones.
        // We need fresh check of empty tiles.
        const mapCandidates = [];
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                if (map[y][x] === TILES.EMPTY) { // Must still be empty
                    // Get dist from finalAnalysis
                    const d = finalAnalysis.dists[y][x];
                    if (d > 0) mapCandidates.push({ x, y, dist: d });
                }
            }
        }
        mapCandidates.sort((a, b) => a.dist - b.dist); // Sort Ascending distance

        // Shuffle map types to pick WHICH ones to place
        const typesToPlace = [];
        for (let i = 0; i < mapCount; i++) typesToPlace.push(mapTypes[i]); // Always Basic first? Or random?
        // User said: "Advanced maps should be harder to find". 
        // So Basic -> close, Legendary -> far.

        for (const mType of typesToPlace) {
            let targetIndex = 0;
            if (mType === TILES.MAP_BASIC) targetIndex = Math.floor(Math.random() * (mapCandidates.length * 0.33));
            else if (mType === TILES.MAP_ADVANCED) targetIndex = Math.floor(Math.random() * (mapCandidates.length * 0.33)) + Math.floor(mapCandidates.length * 0.33);
            else targetIndex = Math.floor(Math.random() * (mapCandidates.length * 0.33)) + Math.floor(mapCandidates.length * 0.66);

            // Wrap range
            targetIndex = Math.min(targetIndex, mapCandidates.length - 1);
            const pos = mapCandidates[targetIndex];
            if (pos) {
                map[pos.y][pos.x] = mType;
                // Remove from candidates (splice or just let it overwrite if collision, but overwrite is bad)
                mapCandidates.splice(targetIndex, 1);
            }
        }

        // Final: Ensure Player Start is Clear (it should be, (1,1) was never filled)
        map[1][1] = TILES.START;

        return {
            map: map,
            size: size
        };
    }

    // BFS Helper
    static analyzeMap(map, size, startX, startY, ignoreDoors = false, allowedTiles = []) {
        const dists = Array(size).fill().map(() => Array(size).fill(-1));
        const paths = {}; // To reconstruction
        const queue = [{ x: startX, y: startY, dist: 0 }];
        dists[startY][startX] = 0;

        let maxDist = 0;
        let maxPos = { x: startX, y: startY };

        const isWalkable = (val) => {
            if (val === TILES.EMPTY || val === TILES.START || val === TILES.HAMMER || val === TILES.TREASURE || (val >= TILES.KEY_1 && val <= TILES.KEY_3) || (val >= TILES.MAP_BASIC && val <= TILES.MAP_LEGENDARY)) return true;
            if (ignoreDoors && (val >= TILES.DOOR_1 && val <= TILES.DOOR_3)) return true;
            if (allowedTiles.includes(val)) return true;
            return false;
        };

        while (queue.length > 0) {
            const { x, y, dist } = queue.shift();

            if (dist > maxDist) {
                maxDist = dist;
                maxPos = { x, y };
            }

            const neighbors = [
                { x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }
            ];

            for (const n of neighbors) {
                if (n.x > 0 && n.x < size - 1 && n.y > 0 && n.y < size - 1) {
                    if (dists[n.y][n.x] === -1 && isWalkable(map[n.y][n.x])) {
                        dists[n.y][n.x] = dist + 1;
                        paths[`${n.x}_${n.y}`] = { x, y };
                        queue.push({ x: n.x, y: n.y, dist: dist + 1 });
                    }
                }
            }
        }

        return { dists, maxDist, maxPos, paths };
    }

    // Reconstruct Max Path
    static getPath(paths, endPos) {
        const path = [];
        let curr = endPos;
        while (curr) {
            path.push(curr);
            curr = paths[`${curr.x}_${curr.y}`];
        }
        return path.reverse();
    }
}

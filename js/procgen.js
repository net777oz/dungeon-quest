import { TILES } from './state.js';

export class ProcGen {
    static generateLevel(size) {
        const MAX_ATTEMPTS = 50;
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const result = this.tryGenerateLevel(size);
            // Count actual treasures placed to be sure
            let actualTreasures = 0;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (result.map[y][x] === TILES.TREASURE) actualTreasures++;
                }
            }

            if (this.checkMapSolvable(result.map, size, { x: 1, y: 1 }, actualTreasures)) {
                return result;
            }
        }
        console.warn("Could not generate solvable map, returning last attempt");
        return this.tryGenerateLevel(size);
    }

    static tryGenerateLevel(size) {
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

        // 2. Maze Carving (Growing Tree Algorithm)
        // Mixed selection: 50% Newest (DFS - Winding) / 50% Random (Prim - Branching)
        // This creates a nice balance of corridors and forks.
        const startX = 1;
        const startY = 1;
        map[startY][startX] = TILES.EMPTY;

        const active = [{ x: startX, y: startY }];
        const directions = [
            { dx: 0, dy: -2 }, // Up
            { dx: 0, dy: 2 },  // Down
            { dx: -2, dy: 0 }, // Left
            { dx: 2, dy: 0 }   // Right
        ];

        while (active.length > 0) {
            // Selection Strategy: Mixed
            let currentIndex;
            const selection = Math.random();
            if (selection > 0.5) {
                currentIndex = active.length - 1; // Newest (DFS)
            } else {
                currentIndex = Math.floor(Math.random() * active.length); // Random (Branching)
            }

            const current = active[currentIndex];

            // Available Neighbors
            const neighbors = [];
            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;

                if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && map[ny][nx] === TILES.WALL) {
                    neighbors.push({ x: nx, y: ny, dir });
                }
            }

            if (neighbors.length > 0) {
                const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
                const nx = chosen.x;
                const ny = chosen.y;
                const midX = current.x + (chosen.dir.dx / 2);
                const midY = current.y + (chosen.dir.dy / 2);

                map[ny][nx] = TILES.EMPTY;
                map[midY][midX] = TILES.EMPTY;
                active.push({ x: nx, y: ny });
            } else {
                // No valid neighbors, remove from active
                active.splice(currentIndex, 1);
            }
        }

        // 2.5 Braiding (Loop Generation)
        // Identify Dead Ends (cells with 3 walls) and remove a wall to create loops.
        // This significantly reduces the "linear" feel.
        const deadEnds = [];
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                if (map[y][x] === TILES.EMPTY) {
                    let walls = 0;
                    if (map[y - 1][x] === TILES.WALL) walls++;
                    if (map[y + 1][x] === TILES.WALL) walls++;
                    if (map[y][x - 1] === TILES.WALL) walls++;
                    if (map[y][x + 1] === TILES.WALL) walls++;

                    if (walls === 3) deadEnds.push({ x, y });
                }
            }
        }

        // Connect 50% of dead ends
        for (const de of deadEnds) {
            if (Math.random() < 0.5) {
                // Try to connect to a neighbor that is NOT the one we came from.
                // Actually, just look for ANY neighbor that is EMPTY but separated by a wall?
                // Or just carve valid wall to ANY empty neighbor.
                const validCarves = [];
                const neighborDirs = [
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                ];

                for (const nd of neighborDirs) {
                    const nx = de.x + nd.dx;
                    const ny = de.y + nd.dy;
                    const nnx = de.x + nd.dx * 2;
                    const nny = de.y + nd.dy * 2;

                    // If neighbor is wall (the blockage) AND the cell BEYOND is empty (valid loop target)
                    // Ensuring we don't carve into outer boundary or void
                    if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && map[ny][nx] === TILES.WALL) {
                        if (nnx > 0 && nnx < size - 1 && nny > 0 && nny < size - 1 && map[nny][nnx] === TILES.EMPTY) {
                            validCarves.push({ x: nx, y: ny });
                        }
                    }
                }

                if (validCarves.length > 0) {
                    const carve = validCarves[Math.floor(Math.random() * validCarves.length)];
                    map[carve.y][carve.x] = TILES.EMPTY;
                }
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
        const finalAnalysis = this.analyzeMap(map, size, startX, startY, true);

        let placedTreasures = 0;
        const openTiles = [];
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                if (finalAnalysis.dists[y][x] !== -1 && map[y][x] === TILES.EMPTY) {
                    openTiles.push({ x, y, dist: finalAnalysis.dists[y][x] });
                }
            }
        }

        // Anti-Clumping Logic (Furthest Point Sampling)
        const treasurePositions = [];
        for (let i = 0; i < treasures; i++) {
            if (openTiles.length === 0) break;

            if (i === 0) {
                // First treasure: Furthest from Start
                openTiles.sort((a, b) => b.dist - a.dist);
                const t = openTiles[0];
                map[t.y][t.x] = TILES.TREASURE;
                treasurePositions.push(t);
                placedTreasures++;
                openTiles.splice(0, 1);
            } else {
                // Subsequent: Maximize minimum distance to EXISTING treasures
                let bestTile = null;
                let maxMinDist = -1;
                let bestIdx = -1;

                for (let k = 0; k < openTiles.length; k++) {
                    const candidate = openTiles[k];
                    let minDist = Infinity;

                    for (const placed of treasurePositions) {
                        // Manhattan Distance
                        const d = Math.abs(candidate.x - placed.x) + Math.abs(candidate.y - placed.y);
                        if (d < minDist) minDist = d;
                    }

                    if (minDist > maxMinDist) {
                        maxMinDist = minDist;
                        bestTile = candidate;
                        bestIdx = k;
                    }
                }

                if (bestTile) {
                    map[bestTile.y][bestTile.x] = TILES.TREASURE;
                    treasurePositions.push(bestTile);
                    placedTreasures++;
                    openTiles.splice(bestIdx, 1);
                }
            }
        }

        // 6. Hammer (Reachable from Start)
        // Re-scan with doors BLOCKED to ensure Hammer is in the "Lobby" area (optional, but safer)
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

        // 8. Place Maps (Probabilistic)
        // 50% chance of 0 maps. If spawning, 1-2 maps.
        let mapCount = 0;
        if (Math.random() > 0.5) {
            mapCount = 1 + Math.floor(Math.random() * 2); // 1 or 2
        }

        const mapTypes = [TILES.MAP_BASIC, TILES.MAP_ADVANCED, TILES.MAP_LEGENDARY];

        let placedMaps = 0;
        // Use `openTiles` which has already had treasures removed.
        // Re-filter for consumed tiles? No, splice removed them.

        // We need to re-sort or just use them.
        // Actually, let's just pick from remaining openTiles, preferably far ones for better maps.
        // Sort by distance from start again
        openTiles.sort((a, b) => a.dist - b.dist);

        const typesToPlace = [];
        for (let i = 0; i < mapCount; i++) typesToPlace.push(mapTypes[i]);

        for (const mType of typesToPlace) {
            if (openTiles.length === 0) break;

            let targetIndex = 0;
            if (mType === TILES.MAP_BASIC) targetIndex = Math.floor(Math.random() * (openTiles.length * 0.33));
            else if (mType === TILES.MAP_ADVANCED) targetIndex = Math.floor(Math.random() * (openTiles.length * 0.33)) + Math.floor(openTiles.length * 0.33);
            else targetIndex = Math.floor(Math.random() * (openTiles.length * 0.33)) + Math.floor(openTiles.length * 0.66);

            targetIndex = Math.min(targetIndex, openTiles.length - 1);
            const pos = openTiles[targetIndex];
            if (pos) {
                map[pos.y][pos.x] = mType;
                openTiles.splice(targetIndex, 1);
            }
        }

        // Final: Ensure Player Start is Clear (it should be, (1,1) was never filled)
        map[1][1] = TILES.START;

        return {
            map: map,
            size: size,
            treasures: placedTreasures || treasures // Use actual placed count if tracked, otherwise config
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


    // BFS Solvability Check
    static checkMapSolvable(map, size, startPos, totalTreasures) {
        // Collect all treasures to assign indices
        const treasures = [];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (map[y][x] === TILES.TREASURE) {
                    treasures.push({ x, y });
                }
            }
        }

        const treasureCount = treasures.length;
        if (treasureCount === 0) return true;

        const targetGemMask = (1 << treasureCount) - 1;

        // BFS Helper for State: x, y, itemMask, gemMask
        // itemMask bits: 0:Hammer, 1:Key1, 2:Key2, 3:Key3
        const queue = [];
        const visited = new Set();

        const startState = {
            x: startPos.x,
            y: startPos.y,
            items: 0,
            gems: 0
        };

        queue.push(startState);
        visited.add(`${startState.x},${startState.y},0,0`);

        // Directions
        const dirs = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ];

        while (queue.length > 0) {
            const current = queue.shift();

            // Check Win
            if (current.gems === targetGemMask) return true;

            for (const d of dirs) {
                const nx = current.x + d.x;
                const ny = current.y + d.y;

                // Bounds
                if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;

                const tile = map[ny][nx];

                // Solids
                if (tile === TILES.WALL) continue;

                // Locked Obstacles Check
                if (tile === TILES.SECRET_WALL) {
                    if (!((current.items >> 0) & 1)) continue;
                }
                if (tile === TILES.DOOR_1) {
                    if (!((current.items >> 1) & 1)) continue;
                }
                if (tile === TILES.DOOR_2) {
                    if (!((current.items >> 2) & 1)) continue;
                }
                if (tile === TILES.DOOR_3) {
                    if (!((current.items >> 3) & 1)) continue;
                }

                // Calculate New State
                let nextItems = current.items;
                let nextGems = current.gems;

                // Pickup Items
                if (tile === TILES.HAMMER) nextItems |= (1 << 0);
                if (tile === TILES.KEY_1) nextItems |= (1 << 1);
                if (tile === TILES.KEY_2) nextItems |= (1 << 2);
                if (tile === TILES.KEY_3) nextItems |= (1 << 3);

                // Pickup Treasure
                if (tile === TILES.TREASURE) {
                    const tIdx = treasures.findIndex(t => t.x === nx && t.y === ny);
                    if (tIdx !== -1) {
                        nextGems |= (1 << tIdx);
                    }
                }

                // Add to Queue if not visited
                const stateKey = `${nx},${ny},${nextItems},${nextGems}`;
                if (!visited.has(stateKey)) {
                    visited.add(stateKey);
                    queue.push({
                        x: nx, y: ny, items: nextItems, gems: nextGems
                    });
                }
            }
        }

        return false;
    }
}

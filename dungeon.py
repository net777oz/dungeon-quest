import pygame
import math
import json
import os
import sys

# --- Constants ---
SCREEN_WIDTH = 1024
SCREEN_HEIGHT = 768
FPS = 60

# World
TILE_SIZE = 64
MAP_SIZE = 10 # Default
FOV = math.pi / 3
HALF_FOV = FOV / 2
NUM_RAYS = SCREEN_WIDTH // 2
MAX_DEPTH = 20 * TILE_SIZE
DELTA_ANGLE = FOV / NUM_RAYS
DIST = NUM_RAYS / (2 * math.tan(HALF_FOV))
PROJ_COEFF = 3 * DIST * TILE_SIZE
SCALE = SCREEN_WIDTH // NUM_RAYS

# Colors (Pastel / Child Friendly)
COLOR_BG = (26, 26, 46)
COLOR_FLOOR = (50, 50, 50)
COLOR_CEILING = (30, 30, 30)
COLOR_GRID = (50, 50, 50)
COLOR_TEXT = (255, 255, 255)

# Tile Types
EMPTY = 0
WALL = 1
SECRET_WALL = 2
START = 3
TREASURE = 4
HAMMER = 5
MAP_ITEM = 6
KEY1 = 7
KEY2 = 8
KEY3 = 9
DOOR1 = 10
DOOR2 = 11
DOOR3 = 12

TILE_NAMES = {
    EMPTY: "Path (Floor)",
    WALL: "Wall",
    SECRET_WALL: "Secret Wall (Breakable)",
    START: "Start Point",
    TREASURE: "Treasure",
    HAMMER: "Hammer",
    MAP_ITEM: "Map",
    KEY1: "Red Key", KEY2: "Blue Key", KEY3: "Green Key",
    DOOR1: "Red Door", DOOR2: "Blue Door", DOOR3: "Green Door"
}

TILE_COLORS = {
    EMPTY: (20, 20, 20),
    WALL: (100, 149, 237),       # Cornflower Blue
    SECRET_WALL: (100, 149, 237), # Same as Wall
    START: (46, 204, 113),       # Green
    TREASURE: (241, 196, 15),    # Yellow
    HAMMER: (230, 126, 34),      # Orange
    MAP_ITEM: (52, 152, 219),    # Blue
    KEY1: (231, 76, 60),  DOOR1: (231, 76, 60), # Red
    KEY2: (52, 152, 219), DOOR2: (52, 152, 219), # Blue
    KEY3: (46, 204, 113), DOOR3: (46, 204, 113)  # Green
}

TILE_CHARS = {
    EMPTY: ".", WALL: "#", SECRET_WALL: "S", START: "P",
    TREASURE: "$", HAMMER: "T", MAP_ITEM: "M",
    KEY1: "k", KEY2: "K", KEY3: "g",
    DOOR1: "d", DOOR2: "D", DOOR3: "G"
}

# --- Global State ---
class GameState:
    def __init__(self):
        self.mode = "EDITOR" # EDITOR or PLAY
        self.map_data = [[WALL for _ in range(MAP_SIZE)] for _ in range(MAP_SIZE)]
        self.map_data[1][1] = START
        self.map_data[1][2] = EMPTY
        
        # Player
        self.player_x = 1.5 * TILE_SIZE
        self.player_y = 1.5 * TILE_SIZE
        self.player_angle = 0
        self.inventory = {"hammer": False, "map": False, "keys": [False, False, False], "treasures": 0, "total_treasures": 0}
        
        # Editor
        self.cursor_x = 0
        self.cursor_y = 0
        self.selected_tile = EMPTY
        
        # Input
        self.joystick = None

    def load_default_level(self):
        # 10x10 Default Level (Similar to user image)
        self.map_data = [
            [1,1,1,1,1,1,1,1,1,1],
            [1,3,0,0,1,0,0,0,6,1],
            [1,0,1,0,1,0,1,1,1,1],
            [1,0,1,0,0,0,0,0,0,1],
            [1,0,1,1,10,1,1,1,0,1],
            [1,0,0,0,0,1,5,1,0,1],
            [1,1,1,1,0,1,2,1,0,1],
            [1,7,0,0,0,0,0,1,0,1],
            [1,1,1,1,1,1,1,1,4,1],
            [1,1,1,1,1,1,1,1,1,1]
        ]
        self.find_start_pos()
        self.count_treasures()

    def find_start_pos(self):
        for y, row in enumerate(self.map_data):
            for x, tile in enumerate(row):
                if tile == START:
                    self.player_x = (x + 0.5) * TILE_SIZE
                    self.player_y = (y + 0.5) * TILE_SIZE
                    return

    def count_treasures(self):
        count = 0
        for row in self.map_data:
            for tile in row:
                if tile == TREASURE:
                    count += 1
        self.inventory["total_treasures"] = count

state = GameState()

# --- Engine Functions ---
def raycasting(screen):
    ox, oy = state.player_x, state.player_y
    xm, ym = mapping(ox, oy)
    cur_angle = state.player_angle - HALF_FOV
    
    for ray in range(NUM_RAYS):
        sin_a = math.sin(cur_angle)
        cos_a = math.cos(cur_angle)
        
        # Horizontals
        y_hor, dy = (ym + 1, 1) if sin_a > 0 else (ym - 1e-6, -1)
        depth_hor = (y_hor - oy) / sin_a
        x_hor = ox + depth_hor * cos_a
        
        delta_depth = dy / sin_a
        dx = delta_depth * cos_a
        
        hor_tile = WALL
        for i in range(MAX_DEPTH):
            tile_h = int(x_hor // TILE_SIZE)
            tile_v_idx = int(y_hor // TILE_SIZE)
            if 0 <= tile_h < MAP_SIZE and 0 <= tile_v_idx < MAP_SIZE:
                content = state.map_data[tile_v_idx][tile_h]
                if content in [WALL, SECRET_WALL, DOOR1, DOOR2, DOOR3]:
                    hor_tile = content
                    break
            else:
                break
            x_hor += dx
            y_hor += dy
            depth_hor += delta_depth

        # Verticals
        x_vert, dx = (xm + 1, 1) if cos_a > 0 else (xm - 1e-6, -1)
        depth_vert = (x_vert - ox) / cos_a
        y_vert = oy + depth_vert * sin_a
        
        delta_depth = dx / cos_a
        dy = delta_depth * sin_a
        
        vert_tile = WALL
        for i in range(MAX_DEPTH):
            tile_h_idx = int(x_vert // TILE_SIZE)
            tile_v = int(y_vert // TILE_SIZE)
            if 0 <= tile_h_idx < MAP_SIZE and 0 <= tile_v < MAP_SIZE:
                content = state.map_data[tile_v][tile_h_idx]
                if content in [WALL, SECRET_WALL, DOOR1, DOOR2, DOOR3]:
                    vert_tile = content
                    break
            else:
                break
            x_vert += dx
            y_vert += dy
            depth_vert += delta_depth

        # Depth
        if depth_vert < depth_hor:
            depth = depth_vert
            hit_tile = vert_tile
            color_factor = 1.0
        else:
            depth = depth_hor
            hit_tile = hor_tile
            color_factor = 0.8
            
        # Fish-eye fix
        depth *= math.cos(state.player_angle - cur_angle)
        
        # Draw Wall
        proj_height = PROJ_COEFF / (depth + 0.0001)
        
        # Color
        base_color = TILE_COLORS.get(hit_tile, (255, 255, 255))
        
        # Secret Wall looks like Wall
        if hit_tile == SECRET_WALL:
            base_color = TILE_COLORS[WALL]
            
        color = (
            int(base_color[0] * color_factor),
            int(base_color[1] * color_factor),
            int(base_color[2] * color_factor)
        )
        
        # Fog
        fog_factor = max(0, min(1, 1 - depth / (MAX_DEPTH * 0.8)))
        color = (
            int(color[0] * fog_factor),
            int(color[1] * fog_factor),
            int(color[2] * fog_factor)
        )
        
        pygame.draw.rect(screen, color, (ray * SCALE, SCREEN_HEIGHT // 2 - proj_height // 2, SCALE, proj_height))
        
        cur_angle += DELTA_ANGLE

def mapping(a, b):
    return int(a // TILE_SIZE), int(b // TILE_SIZE)

def draw_minimap(screen):
    mini_size = 200
    cell_size = mini_size // MAP_SIZE
    offset_x = SCREEN_WIDTH - mini_size - 20
    offset_y = 20
    
    # Background
    pygame.draw.rect(screen, (0,0,0), (offset_x, offset_y, mini_size, mini_size))
    
    for y, row in enumerate(state.map_data):
        for x, tile in enumerate(row):
            color = TILE_COLORS.get(tile, (50,50,50))
            if tile == EMPTY: color = (30,30,30)
            pygame.draw.rect(screen, color, (offset_x + x*cell_size, offset_y + y*cell_size, cell_size-1, cell_size-1))
            
    # Player
    px = offset_x + (state.player_x / TILE_SIZE) * cell_size
    py = offset_y + (state.player_y / TILE_SIZE) * cell_size
    pygame.draw.circle(screen, (255, 0, 0), (int(px), int(py)), 4)
    # Dir
    dx = math.cos(state.player_angle) * 10
    dy = math.sin(state.player_angle) * 10
    pygame.draw.line(screen, (255,255,255), (px, py), (px+dx, py+dy), 2)

def draw_editor(screen):
    screen.fill((30, 30, 30))
    
    # Calculate Grid
    grid_render_size = min(SCREEN_WIDTH, SCREEN_HEIGHT) - 100
    cell_size = grid_render_size // MAP_SIZE
    off_x = (SCREEN_WIDTH - grid_render_size) // 2
    off_y = (SCREEN_HEIGHT - grid_render_size) // 2
    
    # Draw Grid
    for y in range(MAP_SIZE):
        for x in range(MAP_SIZE):
            tile = state.map_data[y][x]
            rect = (off_x + x*cell_size, off_y + y*cell_size, cell_size-1, cell_size-1)
            pygame.draw.rect(screen, TILE_COLORS.get(tile, (100,100,100)), rect)
            
            # Icon approximation (Text)
            char = TILE_CHARS.get(tile, "")
            if char:
                font = pygame.font.SysFont('arial', int(cell_size/2))
                text = font.render(char, True, (255,255,255))
                screen.blit(text, (rect[0] + cell_size//4, rect[1] + cell_size//4))

            # Cursor
            if x == state.cursor_x and y == state.cursor_y:
                pygame.draw.rect(screen, (255, 255, 0), rect, 3)

    # UI Overlay
    font = pygame.font.SysFont('arial', 24)
    info = font.render(f"Selected: {TILE_NAMES.get(state.selected_tile, '?')} (Press B to Change)", True, (255,255,255))
    screen.blit(info, (20, 20))
    
    hint = font.render("A: Place | Start: Play | WASD: Move Cursor", True, (200,200,200))
    screen.blit(hint, (20, SCREEN_HEIGHT - 40))

def handle_play_input(dt):
    keys = pygame.key.get_pressed()
    
    speed = 3 * dt
    rot_speed = 2 * dt
    
    # Rotation
    if keys[pygame.K_LEFT]: state.player_angle -= rot_speed
    if keys[pygame.K_RIGHT]: state.player_angle += rot_speed
    
    # Movement
    sin_a = math.sin(state.player_angle)
    cos_a = math.cos(state.player_angle)
    dx = 0
    dy = 0
    
    if keys[pygame.K_w] or keys[pygame.K_UP]:
        dx += cos_a * speed
        dy += sin_a * speed
    if keys[pygame.K_s] or keys[pygame.K_DOWN]:
        dx -= cos_a * speed
        dy -= sin_a * speed
        
    check_collision_and_move(dx, dy)
    
    # Interaction
    if keys[pygame.K_SPACE]:
        interact_front()

def check_collision_and_move(dx, dy):
    new_x = state.player_x + dx
    new_y = state.player_y + dy
    
    # Pickup items
    tx = int(new_x // TILE_SIZE)
    ty = int(new_y // TILE_SIZE)
    
    if 0 <= tx < MAP_SIZE and 0 <= ty < MAP_SIZE:
        tile = state.map_data[ty][tx]
        if tile in [HAMMER, MAP_ITEM, KEY1, KEY2, KEY3, TREASURE]:
            pickup_item(tile, tx, ty)
            state.map_data[ty][tx] = EMPTY
            
    # Wall Collision
    if not is_solid(new_x, state.player_y): state.player_x = new_x
    if not is_solid(state.player_x, new_y): state.player_y = new_y

def is_solid(x, y):
    tx = int(x // TILE_SIZE)
    ty = int(y // TILE_SIZE)
    if tx < 0 or tx >= MAP_SIZE or ty < 0 or ty >= MAP_SIZE: return True
    tile = state.map_data[ty][tx]
    return tile in [WALL, SECRET_WALL, DOOR1, DOOR2, DOOR3]

def pickup_item(tile, tx, ty):
    if tile == HAMMER: state.inventory['hammer'] = True
    elif tile == MAP_ITEM: state.inventory['map'] = True
    elif tile == KEY1: state.inventory['keys'][0] = True
    elif tile == KEY2: state.inventory['keys'][1] = True
    elif tile == KEY3: state.inventory['keys'][2] = True
    elif tile == TREASURE: state.inventory['treasures'] += 1

def interact_front():
    front_x = state.player_x + math.cos(state.player_angle) * (TILE_SIZE * 1.5)
    front_y = state.player_y + math.sin(state.player_angle) * (TILE_SIZE * 1.5)
    tx = int(front_x // TILE_SIZE)
    ty = int(front_y // TILE_SIZE)
    
    if 0 <= tx < MAP_SIZE and 0 <= ty < MAP_SIZE:
        tile = state.map_data[ty][tx]
        
        # Secret Wall
        if tile == SECRET_WALL:
            if state.inventory['hammer']:
                state.map_data[ty][tx] = EMPTY
                print("SMASH! Secret Wall Broken!")
            else:
                print("Need Hammer!")
        
        # Doors
        elif tile in [DOOR1, DOOR2, DOOR3]:
            key_idx = tile - DOOR1
            if state.inventory['keys'][key_idx]:
                 state.map_data[ty][tx] = EMPTY
                 print("Door Opened!")
            else:
                print(f"Locked! Need Key {key_idx+1}")

def run():
    pygame.init()
    pygame.joystick.init()
    
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Dungeon Quest (Python)")
    clock = pygame.time.Clock()
    
    # Joystick
    if pygame.joystick.get_count() > 0:
        state.joystick = pygame.joystick.Joystick(0)
        state.joystick.init()
    
    state.load_default_level()
    state.mode = "PLAY" # Start in Play Mode
    
    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0  # Actually returns milliseconds, convert to seconds logic if needed but mostly used for frame limiting
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            
            # Editor Input
            if state.mode == "EDITOR":
                if event.type == pygame.MOUSEBUTTONDOWN:
                    # Mouse Logic for Editor
                    mx, my = pygame.mouse.get_pos()
                    # Simplify: just click center
                    grid_render_size = min(SCREEN_WIDTH, SCREEN_HEIGHT) - 100
                    cell_size = grid_render_size // MAP_SIZE
                    off_x = (SCREEN_WIDTH - grid_render_size) // 2
                    off_y = (SCREEN_HEIGHT - grid_render_size) // 2
                    
                    if off_x <= mx <= off_x + grid_render_size and off_y <= my <= off_y + grid_render_size:
                        gx = (mx - off_x) // cell_size
                        gy = (my - off_y) // cell_size
                        if event.button == 1: # Left Click
                            state.map_data[gy][gx] = state.selected_tile
                
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_RETURN: # Start
                         state.mode = "PLAY"
                         state.find_start_pos()
                    if event.key == pygame.K_b: # Cycle Palette
                         state.selected_tile = (state.selected_tile + 1) % 13

            # Play Input (Mode Switch)
            elif state.mode == "PLAY":
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        state.mode = "EDITOR"
        
        # Update & Draw
        if state.mode == "EDITOR":
            draw_editor(screen)
        else:
            handle_play_input(1.0) # Simplified dt
            
            # Floor/Ceiling
            pygame.draw.rect(screen, COLOR_CEILING, (0, 0, SCREEN_WIDTH, SCREEN_HEIGHT // 2))
            pygame.draw.rect(screen, COLOR_FLOOR, (0, SCREEN_HEIGHT // 2, SCREEN_WIDTH, SCREEN_HEIGHT // 2))
            
            raycasting(screen)
            
            # UI
            if state.inventory['map']:
                draw_minimap(screen)
                
        pygame.display.flip()

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    run()

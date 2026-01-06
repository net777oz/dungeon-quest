# The Little Explorer's Mysterious Dungeon - Deployment Guide

## 🚀 How to Run Locally (내 컴퓨터에서 실행하기)

This is a static web game (HTML/CSS/JS). You just need a simple web server to serve the files.

### Option 1: Using Python (Recommended for fast testing)
If you have Python installed (Windows/Mac/Linux):
```bash
# In the project folder:
python3 -m http.server 8000
```
Then open your browser and go to: `http://localhost:8000`

### Option 2: Using Node.js/NPM
If you prefer Node.js ecosystem:
```bash
# Install a simple server globally
npm install -g http-server

# Run it
http-server .
```

### Option 3: VS Code "Live Server"
If you use Visual Studio Code, just install the **Live Server** extension and click "Go Live" at the bottom right.

---

## ☁️ How to Deploy to Another Server (다른 서버로 이식하기)

Since this game is purely static frontend code, you can deploy it to **ANY** static file hosting service.

### Checklist (What to copy)
Copy **everything** in this folder EXCEPT:
- `.git/` folder
- `README.md` / `DEPLOY.md` (optional, for documentation)

**Key Files needed:**
- `index.html` (The entry point)
- `style.css`
- `js/` folder (Contains all game logic: `main.js`, `game.js`, `procgen.js`, `state.js`, `renderer.js`, `editor.js`, `textures.js`, `levels.js`, `effects.js`)

### Hosting Options

#### 1. GitHub Pages (Free & Easy)
1. Push this code to a GitHub repository.
2. Go to **Settings** -> **Pages**.
3. Select `main` branch and `/` root folder.
4. Save. It will give you a public URL (e.g., `https://username.github.io/dungeon-master/`).

#### 2. Vercel / Netlify (Fast & Global)
1. Install Vercel CLI (`npm i -g vercel`) or use their website.
2. Run `vercel deploy` in this folder.
3. Or connect your GitHub repo to Vercel/Netlify dashboard.

#### 3. Traditional Web Server (Apache/Nginx/IIS)
1. Upload the files to your server's `public_html` or `www` folder.
2. Ensure the server is configured to verify `.js` files as MIME type `application/javascript` (standard default).

---
**Enjoy the Adventure!** 🦊💎

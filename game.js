/* scene.js
   Pixel medieval scene inspired by Rucoy Online.
   - Fullscreen canvas
   - Tile-based background with "pixel" shapes (no external images)
   - Camera centered on player
   - Movement with WASD / Arrows
   - Simple collisions on trees/houses
*/

(() => {
  const canvas = document.getElementById('sceneCanvas');
  const ctx = canvas.getContext('2d');

  // HiDPI support
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // CONFIG
  const TILE = 24;               // base tile size (pixel grid look)
  const MAP_COLS = 80;
  const MAP_ROWS = 60;

  // create map array (0 grass, 1 path, 2 tree, 3 rock, 4 house)
  const map = Array.from({length: MAP_ROWS}, () => Array(MAP_COLS).fill(0));

  // helper random
  const rnd = (min, max) => Math.floor(Math.random()*(max-min+1))+min;

  // carve a winding main path
  (function makePaths(){
    let r = Math.floor(MAP_ROWS/2);
    for (let c=0; c<MAP_COLS; c++){
      // jitter row occasionally for a winding path
      if (Math.random() < 0.12) r += rnd(-1,1);
      r = Math.max(5, Math.min(MAP_ROWS-6, r));
      map[r][c] = 1;
      if (Math.random() < 0.25) map[r+1][c] = 1;
      if (Math.random() < 0.12) map[r-1][c] = 1;
    }
    // add some vertical connectors
    for (let c=8; c<MAP_COLS; c += 12){
      let rr = rnd(5, MAP_ROWS-6);
      for (let r2=Math.min(rr, Math.floor(MAP_ROWS/2)); r2<=Math.max(rr, Math.floor(MAP_ROWS/2)); r2++){
        map[r2][c] = 1;
      }
    }
  })();

  // scatter trees and rocks avoiding path
  for (let r=0; r<MAP_ROWS; r++){
    for (let c=0; c<MAP_COLS; c++){
      if (map[r][c] === 0){
        const p = Math.random();
        if (p < 0.08) map[r][c] = 2; // tree
        else if (p < 0.10) map[r][c] = 3; // rock
      }
    }
  }

  // place some houses (rectangles)
  const houses = [
    {x:6, y:4, w:5, h:4},
    {x:24, y:8, w:6, h:5},
    {x:48, y:20, w:6, h:4},
    {x:60, y:36, w:7, h:5},
    {x:12, y:32, w:5, h:4}
  ];
  houses.forEach(h=>{
    for (let ry=0; ry<h.h; ry++){
      for (let cx=0; cx<h.w; cx++){
        const rr = h.y+ry, cc = h.x+cx;
        if (rr>=0 && rr<MAP_ROWS && cc>=0 && cc<MAP_COLS) map[rr][cc] = 4;
      }
    }
  });

  // WORLD SIZE in pixels
  const worldW = MAP_COLS * TILE;
  const worldH = MAP_ROWS * TILE;

  // PLAYER
  const player = {
    x: worldW/2,
    y: worldH/2 + 30,
    w: 18,
    h: 22,
    speed: 160, // px/s
    color: '#f0d54a'
  };

  // CAMERA
  const camera = { x: 0, y: 0, w: canvas.width, h: canvas.height };

  // input
  const keys = {};
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  // collision with map solids: trees (2) and houses (4) and rocks (3)
  function solidAt(px, py){
    const c = Math.floor(px / TILE);
    const r = Math.floor(py / TILE);
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
    const v = map[r][c];
    return v === 2 || v === 3 || v === 4;
  }

  function collides(px, py, w, h){
    // sample 4 corners minus small inset
    const inset = 2;
    const pts = [
      {x: px - w/2 + inset, y: py - h/2 + inset},
      {x: px + w/2 - inset, y: py - h/2 + inset},
      {x: px - w/2 + inset, y: py + h/2 - inset},
      {x: px + w/2 - inset, y: py + h/2 - inset},
    ];
    return pts.some(p => solidAt(p.x, p.y));
  }

  // drawing helpers - to create "pixelated" textures we draw small rectangles
  function drawGrassTile(sx, sy){
    // base
    ctx.fillStyle = '#4a8e3a';
    ctx.fillRect(sx, sy, TILE, TILE);
    // texture dots
    for (let i=0;i<6;i++){
      const px = sx + (i*5 + (i%2?2:0)) % TILE;
      const py = sy + ((i*3 + 7) % TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(px, py, 2, 2);
    }
  }

  function drawPathTile(sx, sy){
    ctx.fillStyle = '#bda07f';
    ctx.fillRect(sx, sy, TILE, TILE);
    // rough edge at top/bottom
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(sx+2, sy+2, 4, 1);
  }

  function drawTreeTile(sx, sy){
    // draw grass base
    drawGrassTile(sx, sy);
    // trunk
    ctx.fillStyle = '#5b3a1a';
    ctx.fillRect(sx + TILE/2 - 3, sy + TILE/2, 6, TILE/2 - 4);
    // foliage with layered circles for depth (pixel-esque)
    ctx.fillStyle = '#234a1a';
    ctx.beginPath();
    ctx.arc(sx + TILE/2, sy + TILE/2 - 6, 14, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#2f6b28';
    ctx.beginPath();
    ctx.arc(sx + TILE/2, sy + TILE/2 - 10, 10, 0, Math.PI*2);
    ctx.fill();
  }

  function drawRockTile(sx, sy){
    drawGrassTile(sx, sy);
    ctx.fillStyle = '#8a8a8a';
    ctx.beginPath();
    ctx.ellipse(sx + TILE/2, sy + TILE/2, 10, 8, 0, 0, Math.PI*2);
    ctx.fill();
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(sx + TILE/2 + 3, sy + TILE/2 - 3, 2, 2);
  }

  function drawHouseTile(sx, sy){
    // base house tile color (floor)
    ctx.fillStyle = '#caa78f';
    ctx.fillRect(sx, sy, TILE, TILE);
    // small detail notch
    ctx.fillStyle = '#a06b4a';
    ctx.fillRect(sx + 3, sy + 6, 6, 4);
  }

  // draw whole world region visible
  function render(){
    // center camera on player
    camera.w = canvas.width / (window.devicePixelRatio || 1);
    camera.h = canvas.height / (window.devicePixelRatio || 1);
    camera.x = player.x - camera.w/2;
    camera.y = player.y - camera.h/2;
    // clamp
    camera.x = Math.max(0, Math.min(camera.x, worldW - camera.w));
    camera.y = Math.max(0, Math.min(camera.y, worldH - camera.h));

    // background gradient (sky-ish top subtle)
    const grad = ctx.createLinearGradient(0,0,0,camera.h);
    grad.addColorStop(0, '#6aa96b');
    grad.addColorStop(1, '#3d7b3b');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,camera.w, camera.h);

    // determine visible tile range
    const startC = Math.floor(camera.x / TILE);
    const endC = Math.floor((camera.x + camera.w) / TILE) + 1;
    const startR = Math.floor(camera.y / TILE);
    const endR = Math.floor((camera.y + camera.h) / TILE) + 1;

    // draw tiles
    for (let r = startR; r <= endR; r++){
      for (let c = startC; c <= endC; c++){
        if (r<0||r>=MAP_ROWS||c<0||c>=MAP_COLS) continue;
        const sx = (c*TILE - camera.x);
        const sy = (r*TILE - camera.y);

        const val = map[r][c];
        if (val === 0) drawGrassTile(sx, sy);
        else if (val === 1) drawPathTile(sx, sy);
        else if (val === 2) drawTreeTile(sx, sy);
        else if (val === 3) drawRockTile(sx, sy);
        else if (val === 4) drawHouseTile(sx, sy);
      }
    }

    // draw houses with roof details (overlay for nicer look)
    houses.forEach(h=>{
      // compute center pixel
      const hx = h.x * TILE - camera.x;
      const hy = h.y * TILE - camera.y;
      // roof
      ctx.fillStyle = '#7e2f1f';
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy - 4);
      ctx.lineTo(hx + h.w * TILE + 6, hy - 4);
      ctx.lineTo(hx + (h.w * TILE)/2, hy - (h.h * TILE)/2);
      ctx.closePath();

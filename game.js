const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

function resize() {
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth+'px';
  canvas.style.height = window.innerHeight+'px';
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

// Assets (substitua pelos seus arquivos locais se quiser)
// Tileset exemplo (16x16), personagem (32x32 padrão)
const tileset = new Image();
tileset.src = 'tileset.png'; // seu tileset baixado
const charSheet = new Image();
charSheet.src = 'char.png'; // sheet de personagem em 4 direções

const TILE = 32;
const MAP_W = 40, MAP_H = 25;

// Construir mapa simples com terrenos variados
const map = Array.from({length: MAP_H}, () => Array(MAP_W).fill(0));
for (let y=0; y<MAP_H; y++) for (let x=0; x<MAP_W; x++) {
  if (y === Math.floor(MAP_H/2)) map[y][x] = 1; // caminho terra
  else if (y === Math.floor(MAP_H/2)+1 && x % 5 === 0) map[y][x] = 2; // árvore
}

// Jogador
const player = { x: canvas.width/ (2*dpr), y: canvas.height/(2*dpr), w: TILE, h: TILE, dir:2, anim:0 };
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

function drawMap() {
  for (let y=0; y<MAP_H; y++) {
    for (let x=0; x<MAP_W; x++) {
      const sx = x * TILE;
      const sy = y * TILE;
      const t = map[y][x];
      if (t === 0) ctx.fillStyle = '#3a8e3a';
      else if (t === 1) ctx.fillStyle = '#a57d52';
      else if (t === 2) ctx.drawImage(tileset, 2 * TILE, 0, TILE, TILE, sx, sy, TILE, TILE);
      if (t !== 2) ctx.fillRect(sx, sy, TILE, TILE);
    }
  }
}

function drawPlayer() {
  const frame = Math.floor(player.anim) % 3;
  ctx.drawImage(charSheet,
    frame * 32, player.dir * 32, 32, 32,
    player.x - 16, player.y - 16, 32, 32);
}

function update(dt) {
  let moved = false;
  if (keys['w'] || keys['ArrowUp']) { player.y -= 100 * dt; player.dir = 3; moved = true; }
  if (keys['s'] || keys['ArrowDown']) { player.y += 100 * dt; player.dir = 0; moved = true; }
  if (keys['a'] || keys['ArrowLeft']) { player.x -= 100 * dt; player.dir = 1; moved = true; }
  if (keys['d'] || keys['ArrowRight']) { player.x += 100 * dt; player.dir = 2; moved = true; }
  if (moved) player.anim += 10 * dt; else player.anim = 0;
}

let last = performance.now();
function loop(ts) {
  const dt = (ts - last)/1000;
  last = ts;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawPlayer();
  update(dt);

  requestAnimationFrame(loop);
}
loop();

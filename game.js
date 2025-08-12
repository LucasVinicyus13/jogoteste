const canvas = document.getElementById("rucoyCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// Jogador central
const player = {
  w: 32,
  h: 32,
  color: "#FFFF00", // amarelo
  speed: 120, // px/s
};

// Cenário em grid simples
const elements = [];
// gera grama aleatória
for (let i = 0; i < 150; i++) {
  elements.push({ type: "rock", x: Math.random() * 2000 - 1000, y: Math.random() * 2000 - 1000 });
}
for (let i = 0; i < 100; i++) {
  elements.push({ type: "tree", x: Math.random() * 2000 - 1000, y: Math.random() * 2000 - 1000 });
}
// uma casinha fixa
elements.push({ type: "house", x: -200, y: -150 });

// controles
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

let camX = 0, camY = 0;
let last = 0;

function loop(ts) {
  const dt = (ts - last) / 1000;
  last = ts;

  // input
  let dx = 0, dy = 0;
  if (keys["arrowup"] || keys["w"]) dy -= 1;
  if (keys["arrowdown"] || keys["s"]) dy += 1;
  if (keys["arrowleft"] || keys["a"]) dx -= 1;
  if (keys["arrowright"] || keys["d"]) dx += 1;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;
    camX += dx * player.speed * dt;
    camY += dy * player.speed * dt;
  }

  // desenha
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // grama (fundo)
  ctx.fillStyle = "#4c9f3a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // desenha elementos
  elements.forEach(el => {
    const sx = canvas.width/2 + el.x - camX;
    const sy = canvas.height/2 + el.y - camY;

    if (el.type === "tree") {
      ctx.fillStyle = "#2e4b1f"; ctx.beginPath();
      ctx.arc(sx, sy, 24, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = "#6b4320";
      ctx.fillRect(sx - 4, sy+12, 8, 16);
    }
    else if (el.type === "rock") {
      ctx.fillStyle = "#8a8a8a";
      ctx.beginPath();
      ctx.ellipse(sx, sy, 16, 12, 0, 0, Math.PI*2);
      ctx.fill();
    }
    else if (el.type === "house") {
      ctx.fillStyle = "#a65e2c";
      ctx.fillRect(sx-40, sy-32, 80, 64);
      ctx.fillStyle = "#4b2716";
      ctx.beginPath();
      ctx.moveTo(sx-45, sy-32);
      ctx.lineTo(sx, sy-80);
      ctx.lineTo(sx+45, sy-32);
      ctx.closePath(); ctx.fill();
    }
  });

  // jogador
  ctx.fillStyle = player.color;
  ctx.fillRect(canvas.width/2 - player.w/2, canvas.height/2 - player.h/2, player.w, player.h);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

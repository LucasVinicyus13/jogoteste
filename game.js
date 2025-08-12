const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Carregar imagens
const tileset = new Image();
tileset.src = "https://i.imgur.com/r1wSfF7.png"; // grama + estrada pixelada
const treeImg = new Image();
treeImg.src = "https://i.imgur.com/tuT4gJ3.png"; // árvore pixelada
const houseImg = new Image();
houseImg.src = "https://i.imgur.com/5b2G5kp.png"; // casa pixelada
const playerImg = new Image();
playerImg.src = "https://i.imgur.com/k5kGQ5Q.png"; // sprite do personagem

// Posição do jogador
let player = { x: 200, y: 200, speed: 3 };

// Teclas pressionadas
let keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// Função para desenhar cenário
function drawMap() {
  const tileSize = 64;

  for (let y = 0; y < canvas.height / tileSize + 2; y++) {
    for (let x = 0; x < canvas.width / tileSize + 2; x++) {
      ctx.drawImage(tileset, x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  // Desenha estrada
  ctx.fillStyle = "#a87c4f";
  ctx.fillRect(300, 0, 100, canvas.height);

  // Árvores
  ctx.drawImage(treeImg, 500, 300, 128, 128);
  ctx.drawImage(treeImg, 600, 100, 128, 128);
  ctx.drawImage(treeImg, 800, 400, 128, 128);

  // Casas
  ctx.drawImage(houseImg, 900, 200, 256, 256);
}

// Função para desenhar jogador
function drawPlayer() {
  ctx.drawImage(playerImg, player.x, player.y, 64, 64);
}

// Atualização do jogo
function update() {
  if (keys["w"] || keys["ArrowUp"]) player.y -= player.speed;
  if (keys["s"] || keys["ArrowDown"]) player.y += player.speed;
  if (keys["a"] || keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;
}

// Loop do jogo
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawPlayer();
  update();
  requestAnimationFrame(gameLoop);
}

gameLoop();

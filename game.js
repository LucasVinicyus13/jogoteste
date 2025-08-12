const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Jogador
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 40,
    speed: 5,
    color: "red"
};

// Árvores, casas, caminhos (elementos do cenário)
const trees = [
    { x: 200, y: 200, size: 50 },
    { x: 500, y: 300, size: 50 },
    { x: 800, y: 150, size: 50 }
];

const houses = [
    { x: 600, y: 500, width: 100, height: 100 },
    { x: 1000, y: 400, width: 120, height: 120 }
];

const keys = {};

// Controles
document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});
document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function movePlayer() {
    if (keys["w"] || keys["ArrowUp"]) player.y -= player.speed;
    if (keys["s"] || keys["ArrowDown"]) player.y += player.speed;
    if (keys["a"] || keys["ArrowLeft"]) player.x -= player.speed;
    if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;

    // Limites da tela
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x + player.size > canvas.width) player.x = canvas.width - player.size;
    if (player.y + player.size > canvas.height) player.y = canvas.height - player.size;
}

function drawScene() {
    ctx.fillStyle = "#3e8e41";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha árvores
    ctx.fillStyle = "green";
    trees.forEach(tree => {
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, tree.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });

    // Desenha casas
    ctx.fillStyle = "brown";
    houses.forEach(house => {
        ctx.fillRect(house.x, house.y, house.width, house.height);
    });

    // Caminhos (exemplo)
    ctx.fillStyle = "#d2b48c";
    ctx.fillRect(300, 0, 100, canvas.height);
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.size, player.size);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawScene();
    movePlayer();
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

gameLoop();

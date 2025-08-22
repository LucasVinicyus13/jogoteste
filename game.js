// ===============================
// Configurações do Canvas e Contexto
// ===============================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ===============================
// Variáveis Globais
// ===============================
const keys = {};
let messages = [];
let inventory = [];
let coins = 200;

// Zona Segura
const safeZone = {
    x: 100,
    y: 100,
    width: 500,
    height: 500
};

// Jogador
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 40,
    speed: 4,
    color: "blue",
    inSafeZone: true,
    sprite: null,
    attackCooldown: 0
};

// NPC Ferreiro
const blacksmith = {
    x: 300,
    y: 300,
    size: 50,
    color: "gray",
    sprite: null,
    talking: false
};

// Monstros
let monsters = [];
for (let i = 0; i < 5; i++) {
    monsters.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 30,
        color: "red",
        alive: true,
        hp: 3,
        moveCooldown: 0
    });
}

// ===============================
// Input
// ===============================
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

canvas.addEventListener("click", (e) => {
    if (player.attackCooldown <= 0) {
        attack();
        player.attackCooldown = 30; // cooldown de ataque
    }
});

// ===============================
// Funções do Jogo
// ===============================
function movePlayer() {
    if (keys["w"] || keys["ArrowUp"]) player.y -= player.speed;
    if (keys["s"] || keys["ArrowDown"]) player.y += player.speed;
    if (keys["a"] || keys["ArrowLeft"]) player.x -= player.speed;
    if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;
}

function attack() {
    monsters.forEach((monster) => {
        if (monster.alive &&
            Math.abs(monster.x - player.x) < 50 &&
            Math.abs(monster.y - player.y) < 50) {
            monster.hp -= 1;
            if (monster.hp <= 0) {
                monster.alive = false;
                coins += 10;
                showMessage("+10 moedas");
            }
        }
    });
}

function moveMonsters() {
    monsters.forEach((monster) => {
        if (!monster.alive) return;
        if (monster.moveCooldown <= 0) {
            const dx = Math.floor(Math.random() * 3) - 1;
            const dy = Math.floor(Math.random() * 3) - 1;
            monster.x += dx * 20;
            monster.y += dy * 20;
            monster.moveCooldown = 60; // a cada 1s muda direção
        } else {
            monster.moveCooldown--;
        }
    });
}

function checkSafeZone() {
    player.inSafeZone =
        player.x > safeZone.x &&
        player.x < safeZone.x + safeZone.width &&
        player.y > safeZone.y &&
        player.y < safeZone.y + safeZone.height;
}

function showMessage(text) {
    messages.push({ text, timer: 120 });
}

function updateMessages() {
    messages = messages.filter(m => m.timer > 0);
    messages.forEach(m => m.timer--);
}

function drawMessages() {
    ctx.fillStyle = "yellow";
    ctx.font = "20px Arial";
    messages.forEach((m, i) => {
        ctx.fillText(m.text, 20, 40 + i * 30);
    });
}

// ===============================
// Ferreiro e Compras
// ===============================
function interactWithBlacksmith() {
    const dist = Math.hypot(player.x - blacksmith.x, player.y - blacksmith.y);
    if (dist < 100) {
        if (!blacksmith.talking) {
            showBlacksmithDialog();
            blacksmith.talking = true;
        }
    } else {
        if (blacksmith.talking) {
            hideBlacksmithDialog();
            blacksmith.talking = false;
        }
    }
}

function showBlacksmithDialog() {
    const dialog = document.getElementById("blacksmithDialog");
    dialog.style.display = "flex";
}

function hideBlacksmithDialog() {
    const dialog = document.getElementById("blacksmithDialog");
    dialog.style.display = "none";
}

function buyItem(item) {
    if (item === "espada" && coins >= 50) {
        coins -= 50;
        inventory.push("Espada");
        showPopup("Você comprou uma Espada!");
    } else if (item === "armadura" && coins >= 100) {
        coins -= 100;
        inventory.push("Armadura");
        showPopup("Você comprou uma Armadura!");
    } else {
        showPopup("Moedas insuficientes!");
    }
}

// ===============================
// Popup de Compra
// ===============================
function showPopup(text) {
    const popup = document.getElementById("popup");
    const popupText = document.getElementById("popupText");
    popupText.textContent = text;
    popup.style.display = "block";

    const closeBtn = document.getElementById("popupClose");
    closeBtn.onclick = () => {
        popup.style.display = "none";
    };
}

// ===============================
// Loop Principal
// ===============================
function update() {
    movePlayer();
    checkSafeZone();
    moveMonsters();
    interactWithBlacksmith();

    if (player.attackCooldown > 0) {
        player.attackCooldown--;
    }

    updateMessages();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grama
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Zona Segura
    ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
    ctx.fillRect(safeZone.x, safeZone.y, safeZone.width, safeZone.height);

    // Texto Zona Segura
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        player.inSafeZone ? "VOCÊ ESTÁ NA ZONA SEGURA" : "VOCÊ ESTÁ FORA DA ZONA SEGURA",
        canvas.width / 2,
        50
    );

    // Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.size, player.size);

    // Ferreiro
    ctx.fillStyle = blacksmith.color;
    ctx.fillRect(blacksmith.x, blacksmith.y, blacksmith.size, blacksmith.size);

    // Monstros
    monsters.forEach((monster) => {
        if (monster.alive) {
            ctx.fillStyle = monster.color;
            ctx.fillRect(monster.x, monster.y, monster.size, monster.size);
        }
    });

    // Moedas
    ctx.fillStyle = "yellow";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Moedas: " + coins, 20, 20);

    // Mensagens
    drawMessages();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();

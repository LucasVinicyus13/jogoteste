/*  RPG – Mundo Aberto (foco em jogabilidade + sprites)
    - WASD movimento suave + câmera
    - Ataque com **botão esquerdo do mouse**, mirando o cursor
    - Zona segura maior + texto topo
    - Monstros vagam sempre (ruído aleatório), evitam zona segura
    - Ferreiro com retrato e diálogo (30vh + box 200px) e sistema de compra
    - Popup de compra com botão X
*/

(() => {
  // ===== Canvas / Setup =====
  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');

  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    cvs.width  = w * DPR;
    cvs.height = h * DPR;
    cvs.style.width  = w + 'px';
    cvs.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ===== Input =====
  const keys = {};
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

  let mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false };
  cvs.addEventListener('mousemove', (e) => {
    const rect = cvs.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left);
    mouse.y = (e.clientY - rect.top);
    // worldX/Y atualizados depois da câmera
  });
  cvs.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouse.down = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });

  // ===== Mundo / Constantes =====
  const TILE = 32;
  const WORLD_W = 220 * TILE;
  const WORLD_H = 180 * TILE;

  const SAFE_RADIUS = 18 * TILE; // zona segura maior
  const SPAWN = { x: WORLD_W/2, y: WORLD_H/2 };

  // ===== Player =====
  const player = {
    x: SPAWN.x, y: SPAWN.y,
    w: 20, h: 26,
    speed: 240,
    dir: 0, // 0=B,1=E,2=D,3=C
    anim: 0,
    swing: 0,        // timer golpe
    coins: 60,
    hasSword: false,
    hasArmor: false,
  };

  // ===== Assets (coloque seus arquivos em /assets) =====
  function loadImage(path, onfailColor) {
    const img = new Image();
    img.src = path;
    img.onerror = () => { img._failed = true; img._color = onfailColor || '#ff00ff'; };
    return img;
  }

  const imgGrass  = loadImage('assets/tiles_grass.png', '#3e8e41');
  const imgDirt   = loadImage('assets/tiles_dirt.png',  '#b48a5f');
  const imgStone  = loadImage('assets/tiles_stone.png', '#aeb2b7');
  const imgBush   = loadImage('assets/bush.png',        '#2e7b31');
  const houseImgs = [
    loadImage('assets/house1.png', '#7a2c20'),
    loadImage('assets/house2.png', '#7a2c20'),
    loadImage('assets/house3.png', '#7a2c20'),
  ];
  const imgBlacksmith = loadImage('assets/blacksmith.png', '#666');
  const imgPlayer     = loadImage('assets/player.png',     '#3e6bb0'); // 4x3 frames 32x32
  const imgMonster    = loadImage('assets/monster.png',    '#6a1833');

  // ===== Padrões (fill com pattern) =====
  function drawTiled(img, x, y, w, h) {
    if (!img._failed && img.complete && img.naturalWidth) {
      const pat = ctx.createPattern(img, 'repeat');
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = img._color || '#888';
      ctx.fillRect(x, y, w, h);
    }
  }

  // ===== Câmera =====
  const camera = { x:0, y:0, w:0, h:0 };
  function updateCamera(){
    camera.w = cvs.width / DPR;
    camera.h = cvs.height/ DPR;
    camera.x = player.x - camera.w/2;
    camera.y = player.y - camera.h/2;
    camera.x = Math.max(0, Math.min(WORLD_W - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_H - camera.h, camera.y));

    mouse.worldX = camera.x + mouse.x;
    mouse.worldY = camera.y + mouse.y;
  }
  function worldToScreen(wx,wy){ return { x: wx - camera.x, y: wy - camera.y }; }

  // ===== Ruído para movimento aleatório =====
  const RSEED = 4242;
  function rand(n){ const s = Math.sin(n*7351.123+RSEED)*43758.5453; return s - Math.floor(s); }
  function noise2(x,y){
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi,        yf = y - yi;
    const n00 = rand(xi*57 + yi*131);
    const n10 = rand((xi+1)*57 + yi*131);
    const n01 = rand(xi*57 + (yi+1)*131);
    const n11 = rand((xi+1)*57 + (yi+1)*131);
    const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
    const nx0 = n00*(1-u) + n10*u;
    const nx1 = n01*(1-u) + n11*u;
    return nx0*(1-v) + nx1*v;
  }

  // ===== Caminhos (array de “splines” simples) =====
  const paths = [];
  function addPath(kind, start, len, dx, amp, wav) {
    const pts = [];
    let x = start.x, y = start.y;
    for (let i=0;i<len;i++){
      x += dx;
      y += Math.sin(i*wav)*amp + Math.cos(i*wav*0.5)*amp*0.3;
      pts.push({x,y});
    }
    paths.push({kind, pts, width: TILE*1.5});
  }
  addPath('dirt',  {x: WORLD_W*0.12, y: WORLD_H*0.35}, 200, TILE*1.1, TILE*2.4, 0.16);
  addPath('stone', {x: WORLD_W*0.08, y: WORLD_H*0.65}, 220, TILE*1.0, TILE*2.0, 0.12);

  // ===== Arbustos =====
  const bushes = [];
  for (let i=0;i<240;i++){
    const x = Math.random()*WORLD_W;
    const y = Math.random()*WORLD_H;
    if (Math.hypot(x-SPAWN.x,y-SPAWN.y) < SAFE_RADIUS*0.8) continue;
    bushes.push({x,y, w: 48, h: 48});
  }

  // ===== Casas =====
  const houses = [];
  function addHouse(img, cx, cy, scale=1){
    const w = (img && img.naturalWidth? img.naturalWidth: 224) * scale;
    const h = (img && img.naturalHeight?img.naturalHeight: 200) * scale;
    houses.push({img, x: cx - w/2, y: cy - h/2, w, h});
  }
  addHouse(houseImgs[0], SPAWN.x-10*TILE, SPAWN.y-8*TILE, 1.0);
  addHouse(houseImgs[1], SPAWN.x+12*TILE, SPAWN.y+12*TILE, 1.0);
  addHouse(houseImgs[2], SPAWN.x-20*TILE, SPAWN.y+18*TILE, 1.0);
  addHouse(houseImgs[1], SPAWN.x+24*TILE, SPAWN.y-14*TILE, 1.0);

  // ===== NPC: Ferreiro =====
  const blacksmith = {
    x: SPAWN.x + 4*TILE,
    y: SPAWN.y + 1*TILE,
    r: 22,
    talk: false
  };

  // ===== Monstros =====
  const monsters = [];
  function spawnMonster() {
    for (let k=0;k<200;k++){
      const x = Math.random()*WORLD_W;
      const y = Math.random()*WORLD_H;
      if (Math.hypot(x-SPAWN.x,y-SPAWN.y) > SAFE_RADIUS + TILE*2){
        monsters.push({
          x,y, r: 15, hp: 3,
          t: Math.random()*1000,
          speed: 70 + Math.random()*30
        });
        return;
      }
    }
  }
  for (let i=0;i<55;i++) spawnMonster();

  // ===== Util / Colisão =====
  function collidesRect(ax,ay,aw,ah, bx,by,bw,bh){
    return !(ax+aw<bx || ax>bx+bw || ay+ah<by || ay>by+bh);
  }
  function rectForEntity(ent){ return {x: ent.x-ent.w/2, y: ent.y-ent.h/2, w: ent.w, h: ent.h}; }
  function tryMove(ent, dx, dy) {
    let nx = ent.x + dx, ny = ent.y + dy;
    nx = Math.max(8, Math.min(WORLD_W-8, nx));
    ny = Math.max(8, Math.min(WORLD_H-8, ny));
    const bb = {x:nx-ent.w/2, y:ny-ent.h/2, w:ent.w, h:ent.h};
    for (const h of houses){
      if (collidesRect(bb.x,bb.y,bb.w,bb.h, h.x,h.y,h.w,h.h)) return; // simples
    }
    ent.x = nx; ent.y = ny;
  }

  // ===== Render helpers =====
  function drawImageOrRect(img, x,y,w,h, color){
    if (img && !img._failed && img.complete && img.naturalWidth) {
      ctx.drawImage(img, x,y,w,h);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x,y,w,h);
    }
  }

  function drawBush(b){
    const p = worldToScreen(b.x, b.y);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + b.h*0.42, b.w*0.48, b.h*0.22, 0, 0, Math.PI*2);
    ctx.fill();
    drawImageOrRect(imgBush, p.x-b.w/2, p.y-b.h/2, b.w, b.h, '#2e7b31');
  }

  function drawHouse(h){
    const p = worldToScreen(h.x, h.y);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(p.x, p.y + h.h - 6, h.w, 6);
    drawImageOrRect(h.img, p.x, p.y, h.w, h.h, '#7a2c20');
  }

  function drawNPC(n){
    const p = worldToScreen(n.x, n.y);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y+10, 14, 6, 0, 0, Math.PI*2);
    ctx.fill();
    // sprite
    drawImageOrRect(imgBlacksmith, p.x-16, p.y-28, 32, 32, '#777');
  }

  function drawMonster(m){
    const p = worldToScreen(m.x, m.y);
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y+8, 12, 5, 0, 0, Math.PI*2);
    ctx.fill();
    drawImageOrRect(imgMonster, p.x-16, p.y-16, 32,32, '#6a1833');
  }

  function drawPlayer(){
    const p = worldToScreen(player.x, player.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y+8, 12,5, 0, 0, Math.PI*2);
    ctx.fill();

    // sprite sheet 4 direções × 3 frames (32x32)
    const frame = Math.floor(player.anim) % 3;
    const dirRow = player.dir;
    if (imgPlayer && !imgPlayer._failed && imgPlayer.complete && imgPlayer.naturalWidth) {
      ctx.drawImage(imgPlayer, frame*32, dirRow*32, 32,32, p.x-16, p.y-22, 32,32);
    } else {
      // fallback “armadura”
      ctx.fillStyle = player.hasArmor ? '#7f8c8d' : '#3e6bb0';
      ctx.fillRect(p.x-10, p.y-18, 20, 24);
      ctx.fillStyle = '#e2c892';
      ctx.fillRect(p.x-8, p.y-26, 16, 10);
    }

    // sword swing
    if (player.swing>0 && player.hasSword) {
      ctx.fillStyle = '#cfd3d6';
      const ang = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillRect(10, -2, 18, 4);
      ctx.restore();
    }
  }

  // ===== Diálogo / Popup =====
  const $dialogue   = document.getElementById('dialogue');
  const $portrait   = document.getElementById('npcPortrait');
  const $buySword   = document.getElementById('buySword');
  const $buyArmor   = document.getElementById('buyArmor');
  const $popup      = document.getElementById('popup');
  const $popupMsg   = document.getElementById('popupMsg');
  const $popupClose = document.getElementById('popupClose');
  $portrait.src = 'assets/blacksmith.png';

  function openDialogue(){ $dialogue.classList.remove('hidden'); }
  function closeDialogue(){ $dialogue.classList.add('hidden'); }

  function showPopup(msg){
    $popupMsg.textContent = msg;
    $popup.classList.remove('hidden');
  }
  $popupClose.addEventListener('click', ()=> $popup.classList.add('hidden'));

  $buySword.addEventListener('click', ()=>{
    if (player.coins>=50){
      player.coins -= 50;
      player.hasSword = true;
      showPopup('Você comprou Espada');
    } else showPopup('Moedas insuficientes');
  });
  $buyArmor.addEventListener('click', ()=>{
    if (player.coins>=80){
      player.coins -= 80;
      player.hasArmor = true;
      showPopup('Você comprou Armadura');
    } else showPopup('Moedas insuficientes');
  });

  // ===== Interação =====
  window.addEventListener('keydown', (e)=>{
    if (e.key.toLowerCase()==='e'){
      const d = Math.hypot(player.x - blacksmith.x, player.y - blacksmith.y);
      if (d < TILE*2) { openDialogue(); }
    }
    if (e.key === 'Escape') closeDialogue();
  });

  // ===== Atualização =====
  function update(dt){
    // movimento
    let dx=0, dy=0;
    if (keys['w']||keys['arrowup'])    { dy -= 1; player.dir = 3; }
    if (keys['s']||keys['arrowdown'])  { dy += 1; player.dir = 0; }
    if (keys['a']||keys['arrowleft'])  { dx -= 1; player.dir = 1; }
    if (keys['d']||keys['arrowright']) { dx += 1; player.dir = 2; }

    if (dx || dy) {
      const m = Math.hypot(dx,dy); dx/=m; dy/=m;
      tryMove(player, dx*player.speed*dt, dy*player.speed*dt);
      player.anim += 9*dt;
    } else {
      player.anim = 1; // frame “parado”
    }

    // direção do player mira o mouse
    const ang = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);
    const a = ((ang + Math.PI*2) % (Math.PI*2));
    if (a > Math.PI*1.75 || a <= Math.PI*0.25) player.dir = 2;       // direita
    else if (a <= Math.PI*0.75)               player.dir = 3;         // cima
    else if (a <= Math.PI*1.25)               player.dir = 1;         // esquerda
    else                                       player.dir = 0;         // baixo

    // ataque mouse
    if (mouse.down) player.swing = 0.14;
    if (player.swing>0){
      player.swing -= dt;
      // hit monstros
      const reach = player.hasSword ? 36 : 24;
      for (let i=monsters.length-1;i>=0;i--){
        const m = monsters[i];
        const d = Math.hypot(m.x - player.x, m.y - player.y);
        if (d < reach) {
          m.hp -= 1;
          if (m.hp<=0){
            monsters.splice(i,1);
            player.coins += 10 + (Math.random()*10|0);
            spawnMonster();
          }
        }
      }
    }

    // monstros vagando sempre
    for (const m of monsters){
      m.t += dt;
      const n1 = noise2(m.x*0.005 + m.t*0.8, m.y*0.005);
      const n2 = noise2(m.x*0.005, m.y*0.005 + m.t*0.9);
      let vx = (n1 - 0.5) * m.speed;
      let vy = (n2 - 0.5) * m.speed;

      // levemente atraídos pelo player quando próximo
      const d = Math.hypot(player.x-m.x, player.y-m.y);
      if (d < TILE*10) { vx += (player.x-m.x)/d * 40; vy += (player.y-m.y)/d * 40; }

      // evitam zona segura
      const ds = Math.hypot(m.x - SPAWN.x, m.y - SPAWN.y);
      if (ds < SAFE_RADIUS + 24){ vx += (m.x-SPAWN.x)/ds * 120; vy += (m.y-SPAWN.y)/ds * 120; }

      m.x = Math.max(10, Math.min(WORLD_W-10, m.x + vx*dt));
      m.y = Math.max(10, Math.min(WORLD_H-10, m.y + vy*dt));
    }
  }

  // ===== Desenho =====
  function drawGround(){
    // grama como pattern base
    drawTiled(imgGrass, - (camera.x % TILE), - (camera.y % TILE),
              camera.w + TILE*2, camera.h + TILE*2);

    // caminhos (dirt/stone) – “pincelando” com tiles
    for (const path of paths){
      const step = 18;
      for (let i=0;i<path.pts.length;i++){
        const p = path.pts[i];
        const ps = worldToScreen(p.x, p.y);
        const img = path.kind === 'dirt' ? imgDirt : imgStone;
        drawImageOrRect(img, ps.x - 20, ps.y - 20, 40, 40, path.kind==='dirt' ? '#b48a5f' : '#aeb2b7');
      }
    }

    // borda da zona segura
    const c = worldToScreen(SPAWN.x, SPAWN.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, SAFE_RADIUS, 0, Math.PI*2);
    ctx.stroke();
  }

  function drawTopText(){
    const inSafe = Math.hypot(player.x-SPAWN.x, player.y-SPAWN.y) <= SAFE_RADIUS;
    ctx.font = 'bold 18px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = inSafe ? '#48e59a' : '#ff6b6b';
    ctx.fillText(inSafe ? 'VOCÊ ESTÁ NA ZONA SEGURA' : 'VOCÊ ESTÁ FORA DA ZONA SEGURA', (cvs.width/DPR)/2, 28);
  }

  // ===== Loop =====
  let last = performance.now();
  function loop(ts){
    const dt = Math.min(0.033, (ts-last)/1000);
    last = ts;

    updateCamera();
    update(dt);

    ctx.clearRect(0,0, cvs.width, cvs.height);
    drawGround();

    // order por Y para “depth”
    const drawQ = [];
    houses.forEach(h => drawQ.push({y: h.y+h.h, fn:()=>drawHouse(h)}));
    bushes.forEach(b => drawQ.push({y: b.y,     fn:()=>drawBush(b)}));
    drawQ.push({y: blacksmith.y, fn:()=>drawNPC(blacksmith)});
    monsters.forEach(m => drawQ.push({y: m.y,   fn:()=>drawMonster(m)}));
    drawQ.push({y: player.y,     fn:()=>drawPlayer()});
    drawQ.sort((a,b)=>a.y-b.y).forEach(n=>n.fn());

    drawTopText();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

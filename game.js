/*  RPG – Mundo Aberto (tela de jogo “seca”, sem HUD)
    - WASD para mover
    - Espaço ataca
    - E interage com ferreiro
*/

(() => {
  // ==== Canvas ====
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

  // ==== Input ====
  const keys = {};
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

  // ==== Mundo ====
  const TILE = 32;                 // grade base
  const WORLD_W = 180 * TILE;      // mundo grandinho
  const WORLD_H = 140 * TILE;
  const SAFE_RADIUS = 12 * TILE;   // raio da zona segura

  // Spawn no centro
  const SPAWN = { x: WORLD_W/2, y: WORLD_H/2 };

  // ==== Player ====
  const player = {
    x: SPAWN.x, y: SPAWN.y,
    w: 22, h: 26,
    speed: 180, dir: 0, // 0=baixo,1=esq,2=dir,3=cima
    attackTimer: 0,
    coins: 50, // começa com 50 pra testar compra
    hasSword: false,
    hasArmor: false,
  };

  // ==== Partículas / Mensagens flutuantes ====
  const floaters = [];
  function addFloater(text, x, y, color='#fff') {
    floaters.push({ text, x, y, color, life: 1.5 });
  }

  // ==== Ruído simples p/ “texturas” ====
  // (value noise barato pra variar a grama/caminho)
  const RSEED = 1337;
  function rand(n){ const s = Math.sin(n*9283.123+RSEED)*43758.5453; return s - Math.floor(s); }
  function noise2(x,y){ // 2D value noise
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi,        yf = y - yi;
    const n00 = rand(xi*57 + yi*131);
    const n10 = rand((xi+1)*57 + yi*131);
    const n01 = rand(xi*57 + (yi+1)*131);
    const n11 = rand((xi+1)*57 + (yi+1)*131);
    const u = xf*xf*(3-2*xf);
    const v = yf*yf*(3-2*yf);
    const nx0 = n00*(1-u) + n10*u;
    const nx1 = n01*(1-u) + n11*u;
    return nx0*(1-v) + nx1*v;
  }

  // ==== Caminhos (terra e pedra) ====
  // Gera alguns “rios” de caminho que serpenteiam
  const paths = [];
  function addPath(kind, startX, startY, len, amp, wav) {
    // kind: 'dirt' ou 'stone'
    const pts = [];
    for (let i=0;i<len;i++){
      const t = i/len;
      const x = startX + i*TILE*1.2;
      const y = startY + Math.sin(i*wav)*amp + Math.cos(i*wav*0.5)*amp*0.4;
      pts.push({x,y});
    }
    paths.push({kind, pts, width:TILE*1.2});
  }
  addPath('dirt',  WORLD_W*0.15, WORLD_H*0.35, 120, TILE*3, 0.18);
  addPath('stone', WORLD_W*0.05, WORLD_H*0.65, 140, TILE*2.2, 0.15);

  // ==== Arbustos (sólidos) ====
  const bushes = [];
  for (let i=0;i<180;i++){
    const x = Math.random()*WORLD_W;
    const y = Math.random()*WORLD_H;
    // Evita spawn no miolo da zona segura
    if (Math.hypot(x-SPAWN.x,y-SPAWN.y) < SAFE_RADIUS*0.7) continue;
    bushes.push({x, y, r: TILE*0.6});
  }

  // ==== Casas (sólidas) ====
  const houses = [];
  function addHouse(cx, cy, wTiles, hTiles) {
    const w = wTiles*TILE, h = hTiles*TILE;
    houses.push({x:cx-w/2, y:cy-h/2, w, h});
  }
  addHouse(SPAWN.x-8*TILE, SPAWN.y-5*TILE, 6,4);
  addHouse(SPAWN.x+10*TILE, SPAWN.y+9*TILE, 7,5);
  addHouse(SPAWN.x-18*TILE, SPAWN.y+15*TILE, 5,4);
  addHouse(SPAWN.x+20*TILE, SPAWN.y-12*TILE, 6,5);

  // ==== NPC Ferreiro (interação) ====
  const blacksmith = {
    x: SPAWN.x + 3*TILE,
    y: SPAWN.y + 0.5*TILE,
    r: TILE*0.8,
    talkTimer: 0,
    open: false
  };

  // ==== Monstros (fora da zona segura) ====
  const monsters = [];
  function spawnMonster() {
    for (let k=0;k<120;k++){
      const x = Math.random()*WORLD_W;
      const y = Math.random()*WORLD_H;
      if (Math.hypot(x-SPAWN.x,y-SPAWN.y) > SAFE_RADIUS + TILE*2){
        monsters.push({x,y, r:TILE*0.6, hp:2, vx:0, vy:0, t:Math.random()*6});
        return;
      }
    }
  }
  for (let i=0;i<40;i++) spawnMonster();

  // ==== Colisão simples ====
  function collidesRect(x,y,w,h, rx,ry,rw,rh) {
    return !(x+w<rx || x>rx+rw || y+h<ry || y>ry+rh);
  }
  function collidesCircle(px,py, cx,cy, r) {
    return Math.hypot(px-cx, py-cy) < r;
  }
  function tryMove(ent, dx, dy) {
    // limit world
    let nx = ent.x + dx;
    let ny = ent.y + dy;
    nx = Math.max(8, Math.min(WORLD_W-8, nx));
    ny = Math.max(8, Math.min(WORLD_H-8, ny));

    // collide houses
    const bb = {x:nx-ent.w/2, y:ny-ent.h/2, w:ent.w, h:ent.h};
    for (const h of houses){
      if (collidesRect(bb.x,bb.y,bb.w,bb.h, h.x,h.y,h.w,h.h)) {
        // resolve by axis
        // try x only
        const bbX = {x:ent.x+dx-ent.w/2, y:ent.y-ent.h/2, w:ent.w, h:ent.h};
        if (!collidesRect(bbX.x,bbX.y,bbX.w,bbX.h, h.x,h.y,h.w,h.h)) {
          ent.x += dx; nx = ent.x; 
        }
        // try y only
        const bbY = {x:ent.x-ent.w/2, y:ent.y+dy-ent.h/2, w:ent.w, h:ent.h};
        if (!collidesRect(bbY.x,bbY.y,bbY.w,bbY.h, h.x,h.y,h.w,h.h)) {
          ent.y += dy; ny = ent.y;
        }
        return; // cancel combined move
      }
    }
    // collide bushes (circles)
    for (const b of bushes){
      if (collidesCircle(nx,ny,b.x,b.y,b.r)) return;
    }

    ent.x = nx; ent.y = ny;
  }

  // ==== Render helpers ====
  function drawGrass(x,y,w,h){
    // base
    ctx.fillStyle = '#3e8e41';
    ctx.fillRect(x,y,w,h);
    // “textura” com noise
    const step = 6;
    for (let yy=y; yy<y+h; yy+=step){
      for (let xx=x; xx<x+w; xx+=step){
        const n = noise2(xx*0.07, yy*0.07);
        const k = (n*0.18)|0;
        ctx.fillStyle = `rgba(0,0,0,${0.06 + n*0.07})`;
        ctx.fillRect(xx,yy,2,2);
      }
    }
  }
  function drawPath(kind, pts, width){
    ctx.save();
    // sombra leve
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = width+6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i=0;i<pts.length;i++){
      const p = worldToScreen(pts[i].x, pts[i].y);
      if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();

    ctx.strokeStyle = (kind==='dirt') ? '#b48a5f' : '#aeb2b7';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i=0;i<pts.length;i++){
      const p = worldToScreen(pts[i].x, pts[i].y);
      if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();

    // textura pontilhada
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let i=2;i<pts.length-2;i+=2){
      const p = worldToScreen(pts[i].x, pts[i].y);
      ctx.beginPath();
      ctx.moveTo(p.x-4, p.y);
      ctx.lineTo(p.x+4, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawBush(b){
    const p = worldToScreen(b.x,b.y);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y+b.r*0.25, b.r*0.9, b.r*0.35, 0, 0, Math.PI*2);
    ctx.fill();
    // folhagem
    ctx.fillStyle = '#1e5a23';
    ctx.beginPath();
    ctx.arc(p.x, p.y, b.r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#2e7b31';
    ctx.beginPath();
    ctx.arc(p.x-6, p.y-4, b.r*0.75, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x+6, p.y+2, b.r*0.6, 0, Math.PI*2);
    ctx.fill();
    // brilhos
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(p.x-2, p.y- b.r*0.6, 3, 3);
  }
  function drawHouse(h){
    const p = worldToScreen(h.x, h.y);
    // corpo (parede)
    ctx.fillStyle = '#caa78f';
    ctx.fillRect(p.x, p.y, h.w, h.h);
    // porta
    ctx.fillStyle = '#5a3a21';
    ctx.fillRect(p.x + h.w/2 - 10, p.y + h.h - 28, 20, 28);
    // janelas
    ctx.fillStyle = '#1e2d59';
    ctx.fillRect(p.x+8, p.y+10, 16, 14);
    ctx.fillRect(p.x+h.w-24, p.y+10, 16, 14);
    // telhado
    ctx.fillStyle = '#7a2c20';
    ctx.beginPath();
    ctx.moveTo(p.x-8, p.y);
    ctx.lineTo(p.x + h.w + 8, p.y);
    ctx.lineTo(p.x + h.w/2, p.y - h.h*0.45);
    ctx.closePath();
    ctx.fill();
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(p.x, p.y+h.h-4, h.w, 4);
  }
  function drawNPC(n){
    const p = worldToScreen(n.x,n.y);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y+8, 14, 6, 0, 0, Math.PI*2);
    ctx.fill();
    // corpo
    ctx.fillStyle = '#c9ab6f';
    ctx.fillRect(p.x-8, p.y-18, 16, 18);
    // avental/ferreiro
    ctx.fillStyle = '#444';
    ctx.fillRect(p.x-8, p.y-6, 16, 6);
    // cabeça
    ctx.fillStyle = '#e2c892';
    ctx.fillRect(p.x-7, p.y-26, 14, 10);
    // bigode
    ctx.fillStyle = '#3a2a19';
    ctx.fillRect(p.x-6, p.y-20, 12, 2);
  }
  function drawMonster(m){
    const p = worldToScreen(m.x,m.y);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y+8, 12, 5, 0, 0, Math.PI*2);
    ctx.fill();
    // corpo
    ctx.fillStyle = '#6a1833';
    ctx.fillRect(p.x-10, p.y-16, 20, 22);
    // olhos
    ctx.fillStyle = '#ffdd33';
    ctx.fillRect(p.x-6, p.y-10, 3, 3);
    ctx.fillRect(p.x+3, p.y-10, 3, 3);
  }
  function drawPlayer() {
    const p = worldToScreen(player.x, player.y);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y+8, 12, 5, 0, 0, Math.PI*2);
    ctx.fill();

    // corpo (com “armadura” se comprado)
    ctx.fillStyle = player.hasArmor ? '#7f8c8d' : '#3e6bb0';
    ctx.fillRect(p.x-10, p.y-16, 20, 22);
    // cabeça + elmo simples
    ctx.fillStyle = '#e2c892';
    ctx.fillRect(p.x-8, p.y-26, 16, 10);
    ctx.fillStyle = '#8e6d2d';
    ctx.fillRect(p.x-9, p.y-28, 18, 4);

    // espada quando atacar (hitbox)
    if (player.attackTimer > 0 && player.hasSword) {
      ctx.fillStyle = '#cfd3d6';
      if (player.dir===2) ctx.fillRect(p.x+8,  p.y-8, 16, 4);
      if (player.dir===1) ctx.fillRect(p.x-24, p.y-8, 16, 4);
      if (player.dir===0) ctx.fillRect(p.x-2,  p.y+8,  4, 16);
      if (player.dir===3) ctx.fillRect(p.x-2,  p.y-24, 4, 16);
    }
  }

  // ==== Câmera ====
  const camera = { x:0, y:0, w:0, h:0 };
  function updateCamera(){
    camera.w = cvs.width / DPR;
    camera.h = cvs.height/ DPR;
    camera.x = player.x - camera.w/2;
    camera.y = player.y - camera.h/2;
    camera.x = Math.max(0, Math.min(WORLD_W - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_H - camera.h, camera.y));
  }
  function worldToScreen(wx,wy){
    return { x: wx - camera.x, y: wy - camera.y };
  }

  // ==== Interação Ferreiro ====
  function tryInteractBlacksmith(){
    const d = Math.hypot(player.x - blacksmith.x, player.y - blacksmith.y);
    if (d < TILE*1.6) {
      blacksmith.open = true;
      blacksmith.talkTimer = 3;
    }
  }
  window.addEventListener('keydown', e=>{
    if (e.key.toLowerCase()==='e') tryInteractBlacksmith();
    if (e.key===' ') {
      if (player.attackTimer<=0) player.attackTimer = 0.18; // 180ms
    }
    if (blacksmith.open) {
      if (e.key==='1') { // comprar espada
        if (player.coins>=50) {
          player.coins -= 50; player.hasSword = true;
          addFloater(`Comprou Espada (-50). Moedas: ${player.coins}`, player.x, player.y-30, '#ffd166');
        } else {
          addFloater('Moedas insuficientes!', player.x, player.y-30, '#ff6b6b');
        }
      }
      if (e.key==='2') { // comprar armadura
        if (player.coins>=80) {
          player.coins -= 80; player.hasArmor = true;
          addFloater(`Comprou Armadura (-80). Moedas: ${player.coins}`, player.x, player.y-30, '#ffd166');
        } else {
          addFloater('Moedas insuficientes!', player.x, player.y-30, '#ff6b6b');
        }
      }
    }
  });

  // ==== Combate simples ====
  function hitMonsters(){
    if (player.attackTimer<=0) return;
    const reach = player.hasSword ? TILE*1.2 : TILE*0.6;
    for (let i=monsters.length-1;i>=0;i--){
      const m = monsters[i];
      const d = Math.hypot(m.x-player.x, m.y-player.y);
      if (d < reach) {
        m.hp -= 1;
        addFloater('-1', m.x, m.y-12, '#ff5e57');
        if (m.hp<=0){
          monsters.splice(i,1);
          const gain = 10 + (Math.random()*10|0);
          player.coins += gain;
          addFloater(`+${gain} moedas (total: ${player.coins})`, player.x, player.y-36, '#a3e635');
          spawnMonster();
        }
      }
    }
  }

  // ==== Game Loop ====
  let last = performance.now();
  function tick(ts){
    const dt = Math.min(0.033, (ts-last)/1000);
    last = ts;

    // mover
    let dx=0, dy=0;
    if (keys['w']||keys['arrowup'])    { dy -= 1; player.dir = 3; }
    if (keys['s']||keys['arrowdown'])  { dy += 1; player.dir = 0; }
    if (keys['a']||keys['arrowleft'])  { dx -= 1; player.dir = 1; }
    if (keys['d']||keys['arrowright']) { dx += 1; player.dir = 2; }
    if (dx||dy){
      const m = Math.hypot(dx,dy); dx/=m; dy/=m;
      tryMove(player, dx*player.speed*dt, dy*player.speed*dt);
    }

    // ataque timer
    if (player.attackTimer>0){
      player.attackTimer -= dt;
      if (player.attackTimer<0) player.attackTimer=0;
    }

    // monstros: vagam e perseguem
    for (const m of monsters){
      m.t += dt;
      const d = Math.hypot(player.x-m.x, player.y-m.y);
      let ax=0, ay=0;
      if (d < TILE*8) { // persegue
        ax = (player.x-m.x)/d * 60;
        ay = (player.y-m.y)/d * 60;
      } else {
        ax = Math.cos(m.t*0.7)*10;
        ay = Math.sin(m.t*0.5)*10;
      }
      m.vx += ax*dt; m.vy += ay*dt;
      const sp = 40;
      const len = Math.hypot(m.vx, m.vy);
      if (len>sp){ m.vx = m.vx/len*sp; m.vy = m.vy/len*sp; }

      // não entram na zona segura
      const ndx = m.x + m.vx*dt - SPAWN.x;
      const ndy = m.y + m.vy*dt - SPAWN.y;
      if (Math.hypot(ndx,ndy) < SAFE_RADIUS-8) { m.vx*=-0.5; m.vy*=-0.5; }

      m.x += m.vx*dt; m.y += m.vy*dt;
    }

    // dano por contato (só efeito empurrão)
    for (const m of monsters){
      if (Math.hypot(player.x-m.x, player.y-m.y) < TILE*1.0) {
        const ang = Math.atan2(player.y-m.y, player.x-m.x);
        tryMove(player, Math.cos(ang)*80*dt, Math.sin(ang)*80*dt);
      }
    }

    // golpe
    hitMonsters();

    // mensagens flutuantes
    for (let i=floaters.length-1;i>=0;i--){
      const f = floaters[i];
      f.life -= dt;
      f.y -= 20*dt;
      if (f.life<=0) floaters.splice(i,1);
    }

    // fechar diálogo do ferreiro
    if (blacksmith.open) {
      blacksmith.talkTimer -= dt;
      if (blacksmith.talkTimer<=0) blacksmith.open = false;
    }

    // ===== Render =====
    updateCamera();
    ctx.clearRect(0,0, cvs.width, cvs.height);

    // chão (grama) visível
    const vx0 = Math.max(0, Math.floor(camera.x/TILE)-2);
    const vy0 = Math.max(0, Math.floor(camera.y/TILE)-2);
    const vx1 = Math.min(Math.ceil((camera.x+camera.w)/TILE)+2, Math.floor(WORLD_W/TILE));
    const vy1 = Math.min(Math.ceil((camera.y+camera.h)/TILE)+2, Math.floor(WORLD_H/TILE));

    for (let gy=vy0; gy<vy1; gy++){
      for (let gx=vx0; gx<vx1; gx++){
        const sx = gx*TILE - camera.x;
        const sy = gy*TILE - camera.y;
        drawGrass(sx, sy, TILE, TILE);
      }
    }

    // caminhos
    for (const p of paths) drawPath(p.kind, p.pts, p.width);

    // desenhar props/entidades por ordem Y (pseudo depth)
    const drawQueue = [];

    houses.forEach(h => drawQueue.push({y:h.y+h.h, fn:()=>drawHouse(h)}));
    bushes.forEach(b => drawQueue.push({y:b.y, fn:()=>drawBush(b)}));
    drawQueue.push({y:blacksmith.y, fn:()=>drawNPC(blacksmith)});
    monsters.forEach(m => drawQueue.push({y:m.y, fn:()=>drawMonster(m)}));
    drawQueue.push({y:player.y, fn:()=>drawPlayer()});

    drawQueue.sort((a,b)=>a.y-b.y).forEach(n=>n.fn());

    // círculo da zona segura (borda sutil)
    const center = worldToScreen(SPAWN.x, SPAWN.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, SAFE_RADIUS, 0, Math.PI*2);
    ctx.stroke();

    // texto topo: dentro/fora da zona segura
    const inSafe = Math.hypot(player.x-SPAWN.x, player.y-SPAWN.y) <= SAFE_RADIUS;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = inSafe ? '#48e59a' : '#ff6b6b';
    ctx.fillText(inSafe ? 'VOCÊ ESTÁ NA ZONA SEGURA' : 'VOCÊ ESTÁ FORA DA ZONA SEGURA', (cvs.width/DPR)/2, 28);

    // prompt ferreiro (apenas quando perto)
    if (Math.hypot(player.x - blacksmith.x, player.y - blacksmith.y) < TILE*1.8){
      const s = worldToScreen(blacksmith.x, blacksmith.y-40);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(s.x-140, s.y-30, 280, 48);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('FERRERIO: [E] Interagir', s.x, s.y-10);
      ctx.fillText('1) Espada 50  |  2) Armadura 80', s.x, s.y+10);
    }

    // balões flutuantes
    for (const f of floaters){
      const p = worldToScreen(f.x,f.y);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(p.x- (f.text.length*4), p.y-14, f.text.length*8, 18);
      ctx.fillStyle = f.color;
      ctx.textAlign = 'center';
      ctx.fillText(f.text, p.x, p.y);
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

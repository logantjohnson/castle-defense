// ── Constants ─────────────────────────────────────────────────
const CELL = 40; // grid cell size in pixels
const HUD_H = 36;

const PATH_WAYPOINTS = [
  { x: 0,   y: 280 },
  { x: 160, y: 280 },
  { x: 160, y: 440 },
  { x: 360, y: 440 },
  { x: 360, y: 160 },
  { x: 600, y: 160 },
  { x: 600, y: 440 },
  { x: 800, y: 440 },
];

// Cells occupied by the path (blocked from tower placement)
const PATH_CELLS = new Set();
(function buildPathCells() {
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const a = PATH_WAYPOINTS[i], b = PATH_WAYPOINTS[i + 1];
    if (a.x === b.x) {
      const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
      for (let y = minY; y <= maxY; y += CELL)
        PATH_CELLS.add(`${Math.floor(a.x/CELL)},${Math.floor(y/CELL)}`);
    } else {
      const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
      for (let x = minX; x <= maxX; x += CELL)
        PATH_CELLS.add(`${Math.floor(x/CELL)},${Math.floor(a.y/CELL)}`);
    }
  }
})();

// ── Tower definitions ─────────────────────────────────────────
// unlockWave: 0 = available from start, N = unlocks after completing wave N
// upgrades: [lvl0→1 cost, lvl1→2 cost, lvl2→3 cost]
const TOWER_TYPES = {
  arrow:  { label: 'Arrow',     cost: 50,  color: 0x4488ff, range: 120, damage: 20,  fireRate: 1000, projColor: 0x88bbff, projSpeed: 300,  dmgColor: '#aaccff', sfxFire: 'arrow',     sfxHit: 'arrow',     unlockWave: 0, icon: '🏹', desc: 'Fast & cheap',           upgrades: [40,  75,  130] },
  cannon: { label: 'Cannon',    cost: 100, color: 0xff8800, range: 100, damage: 60,  fireRate: 2000, projColor: 0xff4400, projSpeed: 220,  dmgColor: '#ff8844', sfxFire: 'cannon',    sfxHit: 'cannon',    unlockWave: 0, icon: '💣', desc: 'Slow, hard hit',         upgrades: [55,  100, 175] },
  sniper: { label: 'Trebuchet', cost: 150, color: 0xaa44ff, range: 220, damage: 45,  fireRate: 2500, projColor: 0xdd88ff, projSpeed: 500,  dmgColor: '#dd88ff', sfxFire: 'trebuchet', sfxHit: 'trebuchet', unlockWave: 0, icon: '🪨', desc: 'Long range',             upgrades: [65,  120, 210] },
  mine:   { label: 'Mine',      cost: 100, color: 0x886633, range: 0,   damage: 0,   fireRate: 99999,projColor: 0xffd700, projSpeed: 1,    dmgColor: '#ffd700', sfxFire: 'interest',  sfxHit: 'interest',  unlockWave: 0, icon: '⛏️', desc: '+2% interest/upgrade',  upgrades: [75,  125, 200] },
  tesla:  { label: 'Titan',     cost: 300, color: 0x88aacc, range: 150, damage: 160, fireRate: 1600, projColor: 0xeeeeff, projSpeed: 999,  dmgColor: '#aaddff', sfxFire: 'tesla',     sfxHit: 'tesla',     unlockWave: 2, icon: '🗿', desc: 'Lightning bolts',        upgrades: [100, 175, 300] },
  flame:  { label: 'Dragon',    cost: 450, color: 0x44bb44, range: 80,  damage: 250, fireRate: 550,  projColor: 0xff6600, projSpeed: 180,  dmgColor: '#ff4400', sfxFire: 'flame',     sfxHit: 'flame',     unlockWave: 4, icon: '🐉', desc: 'Fire breath, close range', upgrades: [120, 210, 360] },
};

// ── Enemy factions & types ────────────────────────────────────
const FACTIONS = {
  barbarian: { name: 'Barbarian Horde',   color: '#cc3300', waves: [1,6]  },
  undead:    { name: 'Undead Legion',     color: '#44aaaa', waves: [7,12] },
  dark:      { name: 'Dark Magic Army',   color: '#9933cc', waves: [13,18] },
};

// shape: 'square' | 'circle' | 'diamond' | 'triangle'
const ENEMY_TYPES = {
  // ── Barbarian Faction (waves 1-6) ──────────────────────────
  goblin:   { label:'Goblin',   faction:'barbarian', color:0x44aa22, size:18, speedMult:1.6, hpMult:0.5,  reward:10, lives:1, wave:1, shape:'square'   },
  orc:      { label:'Orc',      faction:'barbarian', color:0x886600, size:24, speedMult:1.0, hpMult:1.0,  reward:18, lives:1, wave:2, shape:'square'   },
  wolf:     { label:'Wolf',     faction:'barbarian', color:0x997755, size:20, speedMult:2.0, hpMult:0.7,  reward:22, lives:1, wave:2, shape:'circle'   },
  ogre:     { label:'Ogre',     faction:'barbarian', color:0xcc6600, size:32, speedMult:0.7, hpMult:3.0,  reward:40, lives:2, wave:3, shape:'square'   },
  troll:    { label:'Troll',    faction:'barbarian', color:0x336633, size:30, speedMult:0.8, hpMult:4.0,  reward:50, lives:2, wave:4, shape:'circle'   },
  cyclops:  { label:'CYCLOPS',  faction:'barbarian', color:0xaa2200, size:44, speedMult:0.55,hpMult:10.0, reward:130,lives:4, wave:6, shape:'diamond'  },

  // ── Undead Faction (waves 7-12) ────────────────────────────
  skeleton: { label:'Skeleton', faction:'undead',    color:0xddddcc, size:18, speedMult:1.2, hpMult:0.6,  reward:15, lives:1, wave:7,  shape:'square'  },
  zombie:   { label:'Zombie',   faction:'undead',    color:0x558855, size:24, speedMult:0.7, hpMult:1.8,  reward:25, lives:1, wave:7,  shape:'square'  },
  wight:    { label:'Wight',    faction:'undead',    color:0x8899bb, size:22, speedMult:1.3, hpMult:1.5,  reward:30, lives:1, wave:8,  shape:'circle'  },
  vampire:  { label:'Vampire',  faction:'undead',    color:0x880022, size:24, speedMult:1.7, hpMult:1.8,  reward:38, lives:1, wave:9,  shape:'diamond' },
  lich:     { label:'Lich',     faction:'undead',    color:0x553388, size:28, speedMult:0.9, hpMult:5.0,  reward:70, lives:2, wave:10, shape:'square'  },
  bonedragon:{ label:'BONE DRAGON', faction:'undead',color:0xeeeedd, size:46, speedMult:0.6, hpMult:12.0, reward:160,lives:5, wave:12, shape:'diamond' },

  // ── Dark Magic Faction (waves 13-18) ───────────────────────
  centaur:  { label:'Centaur',  faction:'dark',      color:0xbb6622, size:20, speedMult:1.8, hpMult:0.9,  reward:20, lives:1, wave:13, shape:'square'  },
  gargoyle: { label:'Gargoyle', faction:'dark',      color:0x777788, size:22, speedMult:1.5, hpMult:1.2,  reward:25, lives:1, wave:13, shape:'diamond' },
  griffin:  { label:'Griffin',  faction:'dark',      color:0xddaa00, size:26, speedMult:1.4, hpMult:2.0,  reward:35, lives:1, wave:14, shape:'circle'  },
  minotaur: { label:'Minotaur', faction:'dark',      color:0x553300, size:32, speedMult:0.9, hpMult:4.5,  reward:55, lives:2, wave:15, shape:'square'  },
  hydra:    { label:'Hydra',    faction:'dark',      color:0x224422, size:36, speedMult:0.7, hpMult:7.0,  reward:90, lives:3, wave:16, shape:'circle'  },
  blackdragon:{ label:'BLACK DRAGON', faction:'dark',color:0x110011, size:50, speedMult:0.65,hpMult:18.0, reward:250,lives:6, wave:18, shape:'diamond' },
};

const BASE_SPEED = 80;
const BASE_HP    = 90;

function getFactionForWave(w) {
  for (const [key, f] of Object.entries(FACTIONS))
    if (w >= f.waves[0] && w <= f.waves[1]) return key;
  return 'dark';
}

function buildWaveRoster(wave) {
  const faction = getFactionForWave(wave);
  // All types belonging to this faction that have unlocked by this wave
  const pool = Object.entries(ENEMY_TYPES)
    .filter(([,d]) => d.faction === faction && d.wave <= wave);

  const roster = [];
  const total = 8 + wave * 2;

  // Always include the faction's hardest available unit once as a mini-boss
  const hardest = pool[pool.length - 1];
  if (hardest) roster.push(hardest[0]);

  // Fill the rest: weight toward harder units as wave progresses
  for (let i = roster.length; i < total; i++) {
    const weights = pool.map(([,d], idx) => idx + 1); // linear weight
    const sum = weights.reduce((a,b) => a+b, 0);
    let r = Math.random() * sum;
    let chosen = pool[0][0];
    for (let j = 0; j < weights.length; j++) { r -= weights[j]; if (r <= 0) { chosen = pool[j][0]; break; } }
    roster.push(chosen);
  }
  // Shuffle so the hardest isn't always first
  for (let i = roster.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [roster[i], roster[j]] = [roster[j], roster[i]];
  }
  return roster;
}

// ── Enemy sprite drawing ──────────────────────────────────────
function drawEnemySprite(g, type) {
  const c = ENEMY_TYPES[type].color;
  const dark = Phaser.Display.Color.IntegerToColor(c);
  dark.darken(30);
  const dc = dark.color;

  switch (type) {
    // ── BARBARIAN ──────────────────────────────────────────────
    case 'goblin':
      g.fillStyle(c);      g.fillRect(-8,-8,16,14);        // body
      g.fillStyle(0x22cc22); g.fillTriangle(-11,-6,-8,-2,-8,-8); g.fillTriangle(8,-8,8,-2,11,-6); // ears
      g.fillStyle(0xff2200); g.fillRect(-5,-4,4,3); g.fillRect(2,-4,4,3);  // angry eyes
      g.fillStyle(0xffffff); g.fillRect(-4,3,9,3);          // teeth
      g.fillStyle(0x000000); g.fillRect(-3,3,2,3); g.fillRect(1,3,2,3); g.fillRect(5,3,2,3); // gaps
      break;

    case 'orc':
      g.fillStyle(c);      g.fillRect(-11,-11,22,20);       // body
      g.fillStyle(dc);     g.fillRect(-11,-11,22,7);        // brow
      g.fillStyle(0xff4400); g.fillRect(-7,-6,5,4); g.fillRect(3,-6,5,4); // eyes
      g.fillStyle(0xddbb88); g.fillRect(-5,4,3,7); g.fillRect(3,4,3,7);  // tusks
      g.fillStyle(dc);     g.fillRect(-11,9,22,2);          // chin line
      break;

    case 'wolf':
      g.fillStyle(c);      g.fillCircle(0,0,9);             // head
      g.fillStyle(c);      g.fillTriangle(-8,-8,-4,-14,0,-8); g.fillTriangle(0,-8,4,-14,8,-8); // ears
      g.fillStyle(dc);     g.fillTriangle(-5,-8,-1,-4,1,-4); g.fillTriangle(1,-4,5,-8,-1,-4); // inner ears
      g.fillStyle(0x332200); g.fillRect(-11,2,22,7);        // snout
      g.fillStyle(0xff2200); g.fillRect(-5,-4,3,3); g.fillRect(3,-4,3,3); // eyes
      g.fillStyle(0xffffff); g.fillRect(-8,6,5,4); g.fillRect(4,6,5,4);  // fangs
      break;

    case 'ogre':
      g.fillStyle(c);      g.fillRect(-15,-14,30,26);       // body
      g.fillStyle(dc);     g.fillRect(-15,-14,30,8);        // brow ridge
      g.fillStyle(0xffaa00); g.fillRect(-8,-8,6,5); g.fillRect(3,-8,6,5); // eyes
      g.fillStyle(0x000000); g.fillRect(-6,-7,3,3); g.fillRect(4,-7,3,3); // pupils
      g.fillStyle(0xddbb88); g.fillRect(-4,6,3,8); g.fillRect(2,6,3,8);  // tusks
      g.fillStyle(dc);     g.fillRect(-15,10,30,3);         // belt
      break;

    case 'troll':
      g.fillStyle(c);      g.fillCircle(0,0,15);            // body
      g.fillStyle(dc);     g.fillCircle(-6,-6,4); g.fillCircle(6,-6,4);  // bumpy shoulders
      g.fillStyle(0xff6600); g.fillRect(-7,-8,5,4); g.fillRect(3,-8,5,4); // eyes
      g.fillStyle(0x000000); g.fillRect(-6,-7,3,3); g.fillRect(4,-7,3,3); // pupils
      g.fillStyle(0xddbb88); g.fillRect(-3,4,2,9); g.fillRect(2,4,2,9);  // fangs
      g.fillStyle(dc);     g.fillCircle(0,8,5);             // belly
      break;

    case 'cyclops':
      g.fillStyle(c);      g.fillRect(-20,-20,40,36);       // body
      g.fillStyle(dc);     g.fillRect(-20,-20,40,10);       // brow
      g.fillStyle(0xffff00); g.fillCircle(0,-8,10);         // single giant eye
      g.fillStyle(0x000000); g.fillCircle(0,-8,5);          // pupil
      g.fillStyle(0xff0000); g.fillCircle(0,-8,2);          // iris glint
      g.fillStyle(0xddbb88); g.fillRect(-8,8,4,12); g.fillRect(5,8,4,12); // tusks
      g.fillStyle(dc);     g.fillRect(-20,14,40,4);         // chin
      break;

    // ── UNDEAD ─────────────────────────────────────────────────
    case 'skeleton':
      g.fillStyle(c);      g.fillRect(-8,-10,16,18);        // ribcage
      g.fillStyle(dc);     g.lineStyle(2,dc,1);             // ribs
      for (let i = -5; i <= 5; i+=4) { g.fillRect(-9,i,18,2); }
      g.fillStyle(c);      g.fillCircle(0,-14,7);           // skull
      g.fillStyle(0x000000); g.fillCircle(-3,-15,3); g.fillCircle(3,-15,3); // eye sockets
      g.fillStyle(c);      g.fillRect(-6,6,3,8); g.fillRect(0,6,3,8); g.fillRect(6,6,3,8); // leg bones
      break;

    case 'zombie':
      g.fillStyle(c);      g.fillRect(-11,-12,22,22);       // body
      g.fillStyle(0x225522); g.fillRect(-11,-12,22,8);      // rotting head
      g.fillStyle(0xffdd00); g.fillRect(-7,-8,5,4); g.fillRect(3,-8,5,4); // yellowed eyes
      g.fillStyle(0x000000); g.fillRect(-6,-7,3,3); g.fillRect(4,-7,3,3);
      g.fillStyle(0x884422); g.fillRect(-8,0,22,4);         // torn flesh
      g.fillStyle(0xddbb88); g.fillRect(-4,8,2,6); g.fillRect(2,8,2,6);   // dangling teeth
      break;

    case 'wight':
      g.fillStyle(c);      g.fillCircle(0,0,11);            // ghostly form
      g.fillStyle(0xaabbdd); g.fillCircle(0,-4,8);          // head glow
      g.fillStyle(0x0000ff); g.fillCircle(-4,-5,3); g.fillCircle(4,-5,3); // glowing eyes
      g.fillStyle(0xffffff); g.fillCircle(-4,-5,1); g.fillCircle(4,-5,1); // eye gleam
      // wispy tail
      g.fillStyle(c); g.fillTriangle(-6,8,6,8,0,18);
      g.fillStyle(0xaabbdd,0.5); g.fillTriangle(-10,4,-6,14,0,8); g.fillTriangle(10,4,6,14,0,8);
      break;

    case 'vampire':
      g.fillStyle(c);      g.fillRect(-11,-13,22,22);       // body
      g.fillStyle(0x330000); g.fillTriangle(-14,-13,14,-13,0,-22); // widow's peak
      g.fillStyle(0x660000); // cape wings
      g.fillTriangle(-11,-5,-20,14,-11,14);
      g.fillTriangle(11,-5,20,14,11,14);
      g.fillStyle(0xff2200); g.fillRect(-6,-7,4,4); g.fillRect(3,-7,4,4); // red eyes
      g.fillStyle(0xffffff); g.fillRect(-4,4,2,7); g.fillRect(3,4,2,7);  // fangs
      break;

    case 'lich':
      g.fillStyle(c);      g.fillRect(-13,-13,26,24);       // robed body
      g.fillStyle(0x220044); g.fillRect(-13,-13,26,8);      // dark hood
      g.fillStyle(0x8800ff); g.fillCircle(-5,-8,3); g.fillCircle(5,-8,3); // glowing eyes
      g.fillStyle(0xffffff); g.fillCircle(-5,-8,1); g.fillCircle(5,-8,1);
      g.fillStyle(0x4400aa); // staff
      g.fillRect(14,-20,3,36);
      g.fillStyle(0x8800ff); g.fillCircle(15,-22,5);        // staff orb
      g.fillStyle(0x220044); g.fillRect(-13,8,26,4);        // robe hem
      break;

    case 'bonedragon':
      g.fillStyle(c);      g.fillRect(-18,-12,36,22);       // body
      g.fillStyle(dc);     // wing bones left
      g.fillTriangle(-18,-12,-32,-28,-18,4);
      g.fillTriangle(-18,-12,-28,-8,-18,4);
      g.fillStyle(dc);     // wing bones right
      g.fillTriangle(18,-12,32,-28,18,4);
      g.fillTriangle(18,-12,28,-8,18,4);
      g.fillStyle(c);      g.fillCircle(-2,-18,10);         // skull head
      g.fillStyle(0x000000); g.fillCircle(-6,-20,4); g.fillCircle(2,-20,4); // eye sockets
      g.fillStyle(0xff4400); g.fillCircle(-6,-20,2); g.fillCircle(2,-20,2); // glowing eyes
      g.fillStyle(c);      g.fillRect(-8,-10,3,8); g.fillRect(-3,-10,3,8); g.fillRect(2,-10,3,8); // teeth
      break;

    // ── DARK MAGIC ─────────────────────────────────────────────
    case 'centaur':
      g.fillStyle(c);      g.fillRect(-13,0,26,14);         // horse body
      g.fillStyle(c);      g.fillRect(-6,-16,12,18);        // human torso
      g.fillStyle(dc);     g.fillRect(-6,-16,12,6);         // chest armor
      g.fillStyle(0xff8800); g.fillRect(-4,-12,3,3); g.fillRect(2,-12,3,3); // eyes
      g.fillStyle(dc);     // hooves
      g.fillRect(-13,12,6,4); g.fillRect(-4,12,6,4); g.fillRect(5,12,6,4);
      g.fillStyle(0xddaa55); g.fillRect(8,-16,3,14);        // spear
      g.fillStyle(0xffffff); g.fillTriangle(8,-22,11,-22,9,-14); // spear tip
      break;

    case 'gargoyle':
      g.fillStyle(c);      g.fillRect(-10,-11,20,20);       // body
      g.fillStyle(dc);     // stone wings
      g.fillTriangle(-10,-11,-22,-4,-10,10);
      g.fillTriangle(10,-11,22,-4,10,10);
      g.fillStyle(0xff4400); g.fillRect(-6,-6,4,4); g.fillRect(3,-6,4,4); // eyes
      g.fillStyle(0xffffff); g.fillRect(-3,4,2,5); g.fillRect(2,4,2,5);   // fangs
      g.fillStyle(dc);
      g.fillTriangle(-4,-18,0,-11,4,-18);                   // horns
      break;

    case 'griffin':
      g.fillStyle(c);      g.fillCircle(0,3,12);            // lion body
      g.fillStyle(0xddaa00); // wings
      g.fillTriangle(-12,0,-24,-10,-12,10);
      g.fillTriangle(12,0,24,-10,12,10);
      g.fillStyle(0xbb8800); g.fillCircle(0,-10,8);         // eagle head
      g.fillStyle(0xff8800); g.fillRect(-5,-12,4,4); g.fillRect(2,-12,4,4); // eyes
      g.fillStyle(0xffcc00); g.fillTriangle(-3,-5,3,-5,0,-1); // beak
      g.fillStyle(0xddaa00); g.fillRect(-3,12,2,6); g.fillRect(2,12,2,6); // back legs
      break;

    case 'minotaur':
      g.fillStyle(c);      g.fillRect(-15,-13,30,26);       // massive body
      g.fillStyle(dc);     g.fillRect(-15,-13,30,9);        // shoulders
      g.fillStyle(c);      // horns
      g.fillTriangle(-12,-13,-18,-26,-6,-13);
      g.fillTriangle(12,-13,18,-26,6,-13);
      g.fillStyle(0xff2200); g.fillRect(-8,-7,5,5); g.fillRect(4,-7,5,5); // eyes
      g.fillStyle(0x000000); g.fillRect(-7,-6,3,3); g.fillRect(5,-6,3,3);
      g.fillStyle(dc);     g.fillRect(-8,8,6,10); g.fillRect(3,8,6,10);   // legs
      g.fillStyle(0xaa6600); g.fillRect(-13,-2,26,4);       // belt
      break;

    case 'hydra':
      g.fillStyle(c);      g.fillCircle(0,6,16);            // body
      // Three necks and heads
      const headPositions = [[-12,-8],[ 0,-16],[12,-8]];
      headPositions.forEach(([hx,hy]) => {
        g.fillStyle(dc);   g.fillRect(hx-2, hy+8, 4, 12);  // neck
        g.fillStyle(c);    g.fillCircle(hx, hy, 7);         // head
        g.fillStyle(0xff4400); g.fillCircle(hx-2,hy-1,2); g.fillCircle(hx+2,hy-1,2); // eyes
        g.fillStyle(0xff0000); g.fillTriangle(hx-4,hy+4,hx+4,hy+4,hx,hy+8); // mouth
      });
      break;

    case 'blackdragon':
      g.fillStyle(c);      g.fillRect(-22,-14,44,26);       // body
      g.fillStyle(0x220022); // massive wings
      g.fillTriangle(-22,-14,-42,-36,-22,14);
      g.fillTriangle(-22,-14,-36,-10,-22,14);
      g.fillTriangle(22,-14,42,-36,22,14);
      g.fillTriangle(22,-14,36,-10,22,14);
      g.fillStyle(0x110011); // wing membranes
      g.fillTriangle(-22,-14,-38,-28,-22,2);
      g.fillTriangle(22,-14,38,-28,22,2);
      g.fillStyle(c);      g.fillRect(-6,-26,12,16);        // neck
      g.fillStyle(c);      g.fillCircle(0,-32,12);          // head
      g.fillStyle(0xff0000); g.fillCircle(-5,-34,4); g.fillCircle(5,-34,4); // eyes
      g.fillStyle(0xff6600); g.fillCircle(-5,-34,2); g.fillCircle(5,-34,2); // pupils
      g.fillStyle(0xff2200); // fire breath hint
      g.fillTriangle(-4,-24,4,-24,0,-18);
      g.fillStyle(0x440000); g.fillRect(-14,-6,4,14); g.fillRect(11,-6,4,14); // legs
      break;
  }
}

// ── Enemy class ───────────────────────────────────────────────
class Enemy {
  constructor(scene, type, wave) {
    this.scene = scene;
    this.type = type;
    const def = ENEMY_TYPES[type];
    this.waypointIndex = 1;
    const hp = Math.floor(BASE_HP * def.hpMult * (1 + wave * 0.22));
    this.maxHp = hp; this.hp = hp;
    this.speed = BASE_SPEED * def.speedMult;
    this.reward = def.reward;
    this.liveDmg = def.lives;
    this.alive = true; this.reached = false;
    this.x = PATH_WAYPOINTS[0].x;
    this.y = PATH_WAYPOINTS[0].y;

    // Container holds all sprite graphics and moves as one unit
    const g = scene.add.graphics();
    drawEnemySprite(g, type);
    this.container = scene.add.container(this.x, this.y, [g]).setDepth(2);

    // Name label inside container for boss-sized units
    if (def.size >= 36) {
      const lbl = scene.add.text(0, def.size * 0.25, def.label, {
        fontSize: '9px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5);
      this.container.add(lbl);
    }

    // HP bar (kept outside container so it always faces up)
    const barW = def.size + 10;
    this._barW = barW;
    this._barOffY = -def.size / 2 - 10;
    this.hpBarBg = scene.add.rectangle(this.x, this.y + this._barOffY, barW, 5, 0x222222).setDepth(6);
    this.hpBar   = scene.add.rectangle(this.x - barW/2, this.y + this._barOffY, barW, 5, 0x2ecc71).setDepth(7).setOrigin(0, 0.5);
  }

  update(delta) {
    if (!this.alive || this.reached) return;
    const target = PATH_WAYPOINTS[this.waypointIndex];
    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const step = this.speed * (delta / 1000);
    if (dist <= step) {
      this.x = target.x; this.y = target.y;
      this.waypointIndex++;
      if (this.waypointIndex >= PATH_WAYPOINTS.length) { this.reached = true; this.destroy(); return; }
    } else {
      this.x += (dx/dist)*step; this.y += (dy/dist)*step;
    }
    this._syncSprites();
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.destroy(); }
  }

  _syncSprites() {
    this.container.setPosition(this.x, this.y);
    const barY = this.y + this._barOffY;
    this.hpBarBg.setPosition(this.x, barY);
    this.hpBar.setPosition(this.x - this._barW/2, barY);
    const pct = this.hp / this.maxHp;
    this.hpBar.setScale(pct, 1);
    this.hpBar.setFillStyle(pct > 0.5 ? 0x2ecc71 : pct > 0.25 ? 0xf39c12 : 0xe74c3c);
  }

  destroy() {
    this.alive = false;
    this.container.destroy();
    this.hpBarBg.destroy();
    this.hpBar.destroy();
  }
}

// ── Effects ───────────────────────────────────────────────────
const particles = [];

function spawnExplosion(scene, x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
    const speed = 40 + Math.random() * 80;
    const life  = 400 + Math.random() * 300;
    const r = 2 + Math.random() * 3;
    const dot = scene.add.circle(x, y, r, color).setDepth(15).setAlpha(1);
    particles.push({ dot, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life, maxLife: life });
  }
}

function spawnDamageNumber(scene, x, y, amount, color = '#ffffff') {
  const txt = scene.add.text(x, y, '-' + amount, {
    fontSize: '13px', fontFamily: 'Arial Black', color,
    stroke: '#000000', strokeThickness: 3
  }).setOrigin(0.5).setDepth(20).setAlpha(1);
  particles.push({ dot: txt, vx: (Math.random()-0.5)*20, vy: -60, life: 700, maxLife: 700, isText: true });
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= delta;
    if (p.life <= 0) { p.dot.destroy(); particles.splice(i, 1); continue; }
    const dt = delta / 1000;
    p.dot.x += p.vx * dt;
    p.dot.y += p.vy * dt;
    p.vy += 120 * dt; // gravity
    p.dot.setAlpha(p.life / p.maxLife);
  }
}

function screenShake(scene, intensity = 8, duration = 400) {
  scene.cameras.main.shake(duration, intensity / 1000);
}

// ── Tower ─────────────────────────────────────────────────────
const MAX_UPGRADE = 3;

// Dragon tier colors: 0=green, 1=blue, 2=red, 3=black
const DRAGON_COLORS = [0x44bb44, 0x2266ff, 0xff2200, 0x111111];
const DRAGON_WING_COLORS = [0x2a8830, 0x1144cc, 0xbb1100, 0x222222];
const DRAGON_NAMES = ['Green Dragon', 'Blue Dragon', 'Red Dragon', 'Black Dragon'];

function getTotalMineBonus() {
  let bonus = 0;
  for (const t of towers) {
    if (t.isMine) bonus += (1 + t.dmgLevel) * INTEREST_RATE;
  }
  return bonus;
}

function globalUpgradeTier() {
  // Returns the highest tier T such that every placed tower has every stat >= T
  if (towers.length === 0) return 0;
  let min = MAX_UPGRADE;
  for (const t of towers) {
    min = Math.min(min, t.dmgLevel, t.rangeLevel, t.rateLevel);
  }
  return min;
}

function canUpgradeTo(targetLevel) {
  // Upgrading a stat from (targetLevel-1) to targetLevel requires all towers at >= (targetLevel-1)
  if (targetLevel <= 1) return true; // first upgrade always allowed
  const required = targetLevel - 1;
  for (const t of towers) {
    if (t.dmgLevel < required || t.rangeLevel < required || t.rateLevel < required) return false;
  }
  return true;
}

function refreshAllDragons() {
  const tier = globalUpgradeTier();
  for (const t of towers) {
    if (t.type === 'flame') t.redrawDragon(tier);
  }
}

class Tower {
  constructor(scene, cx, cy, type) {
    this.scene = scene;
    this.cx = cx; this.cy = cy;
    this.x = cx * CELL + CELL/2;
    this.y = cy * CELL + CELL/2;
    this.type = type;
    this.baseDef = TOWER_TYPES[type];
    this.cooldown = 0;

    // Upgrade levels
    this.dmgLevel   = 0;
    this.rangeLevel = 0;
    this.rateLevel  = 0;

    this.isDragon = (type === 'flame');
    this.isTitan  = (type === 'tesla');
    this.isMine   = (type === 'mine');

    if (this.isMine) {
      this.base = scene.add.rectangle(this.x, this.y, CELL-4, CELL-4, 0x000000, 0).setDepth(5);
      this.base.setStrokeStyle(2, 0xffffff, 0.7);
      this.customGfx = scene.add.graphics().setDepth(6);
      this.dragonGfx = null;
      this.barrel = scene.add.rectangle(this.x, this.y, 1, 1, 0x000000, 0).setDepth(5);
      this.rangeRing = scene.add.circle(this.x, this.y, 1, 0xffffff, 0).setDepth(1); // invisible
      this.rangeRing.setStrokeStyle(0, 0xffffff, 0);
      this.iconText = scene.add.text(this.x, this.y, '', { fontSize: '18px' }).setOrigin(0.5).setDepth(7);
      this.redrawMine();
      return;
    }

    if (this.isDragon || this.isTitan) {
      this.base = scene.add.rectangle(this.x, this.y, CELL-4, CELL-4, 0x000000, 0).setDepth(5);
      this.base.setStrokeStyle(2, 0xffffff, 0.7);
      this.customGfx = scene.add.graphics().setDepth(6);
      this.barrel = scene.add.rectangle(this.x, this.y, 1, 1, 0x000000, 0).setDepth(5);
      this.dragonGfx = this.customGfx; // alias for compat
    } else {
      this.base = scene.add.rectangle(this.x, this.y, CELL-4, CELL-4, this.baseDef.color).setDepth(5);
      this.base.setStrokeStyle(2, 0xffffff, 0.7);
      this.barrel = scene.add.rectangle(this.x+12, this.y, 16, 5, 0xffffff).setDepth(6);
      this.customGfx = null;
      this.dragonGfx = null;
    }

    this.rangeRing = scene.add.circle(this.x, this.y, this.baseDef.range, 0xffffff, 0).setDepth(1);
    this.rangeRing.setStrokeStyle(1, 0xffffff, 0.15);
    this.iconText = scene.add.text(this.x, this.y, this._icon(type), { fontSize: '18px' }).setOrigin(0.5).setDepth(7);

    if (this.isDragon) {
      this.iconText.setVisible(false);
      this.redrawDragon(globalUpgradeTier());
    }
    if (this.isTitan) {
      this.iconText.setVisible(false);
      this.redrawTitan();
    }
  }

  redrawTitan() {
    const g = this.customGfx;
    if (!g) return;
    g.clear();
    const x = this.x, y = this.y;

    // Legs
    g.fillStyle(0x556677, 1);
    g.fillRect(x-7, y+6, 6, 10);
    g.fillRect(x+1,  y+6, 6, 10);

    // Body / armour plate
    g.fillStyle(0x8899bb, 1);
    g.fillRect(x-9, y-8, 18, 16);
    // Chest highlight
    g.fillStyle(0xaabbdd, 1);
    g.fillRect(x-6, y-6, 12, 8);

    // Arms raised (throwing pose)
    g.fillStyle(0x778899, 1);
    g.fillRect(x-18, y-14, 8, 5);   // left arm
    g.fillRect(x+10,  y-18, 8, 5);  // right arm raised higher

    // Head
    g.fillStyle(0x99aabb, 1);
    g.fillCircle(x, y-14, 7);
    // Helmet crest
    g.fillStyle(0xccddee, 1);
    g.fillRect(x-2, y-22, 4, 8);

    // Lightning bolt in right hand
    const bx = x+14, by = y-16;
    g.fillStyle(0xffff44, 1);
    g.fillTriangle(bx,    by-8, bx+5,  by,   bx+1,  by);
    g.fillTriangle(bx+1,  by,   bx-4,  by+8, bx-1,  by);
    g.fillStyle(0xffffff, 0.7);
    g.fillTriangle(bx+1,  by-6, bx+4,  by-1, bx+2,  by-1);

    // Eye glow
    g.fillStyle(0x44aaff, 1);
    g.fillCircle(x-2, y-15, 1.5);
    g.fillCircle(x+2, y-15, 1.5);

    // Selection outline
    const sel = this.base.strokeColor === 0xffd700;
    g.lineStyle(2, sel ? 0xffd700 : 0xaabbcc, sel ? 1 : 0.5);
    g.strokeRect(x-9, y-21, 18, 37);
  }

  redrawDragon(tier) {
    if (!this.dragonGfx) return;
    const g = this.dragonGfx;
    const bc = DRAGON_COLORS[tier];
    const wc = DRAGON_WING_COLORS[tier];
    const x = this.x, y = this.y;
    g.clear();

    // Wings (behind body)
    g.fillStyle(wc, 1);
    g.fillTriangle(x, y-4, x-18, y-22, x+4, y-18);  // left wing
    g.fillTriangle(x, y+4, x-18, y+22, x+4, y+18);  // right wing
    g.fillTriangle(x+2, y-4, x+18, y-20, x+6, y-16); // right-front wing tip
    g.fillTriangle(x+2, y+4, x+18, y+20, x+6, y+16);

    // Body
    g.fillStyle(bc, 1);
    g.fillEllipse(x, y, 26, 18);

    // Head / snout (points right — attack direction)
    g.fillStyle(bc, 1);
    g.fillTriangle(x+8, y-5, x+8, y+5, x+22, y);  // snout
    g.fillEllipse(x+6, y, 12, 12);                  // head blob

    // Tail (points left)
    g.fillStyle(wc, 1);
    g.fillTriangle(x-8, y-3, x-8, y+3, x-20, y);

    // Eyes
    const eyeColor = tier === 3 ? 0xff2200 : (tier === 2 ? 0xffff00 : 0xff6600);
    g.fillStyle(eyeColor, 1);
    g.fillCircle(x+8, y-3, 2.5);
    g.fillCircle(x+8, y+3, 2.5);

    // Outline stroke for selection
    const sel = this.base.strokeColor === 0xffd700;
    g.lineStyle(2, sel ? 0xffd700 : 0xffffff, sel ? 1 : 0.5);
    g.strokeEllipse(x, y, 26, 18);

    // Update label for dragon tier
    this.baseDef = { ...TOWER_TYPES['flame'], label: DRAGON_NAMES[tier], color: bc };
  }

  redrawMine() {
    const g = this.customGfx;
    if (!g) return;
    g.clear();
    const x = this.x, y = this.y;
    const bonus = (1 + this.dmgLevel) * 2;

    // Dark shaft
    g.fillStyle(0x110a00, 1);
    g.fillRect(x-12, y-10, 24, 22);

    // Wooden support frame
    g.fillStyle(0x7a4a20, 1);
    g.fillRect(x-14, y-13, 28, 5);   // top beam
    g.fillRect(x-14, y+10, 28, 5);   // bottom beam
    g.fillRect(x-14, y-13, 5, 28);   // left post
    g.fillRect(x+9,  y-13, 5, 28);   // right post

    // Cross braces inside shaft
    g.lineStyle(2, 0x5a3010, 0.9);
    g.beginPath(); g.moveTo(x-10, y-8); g.lineTo(x+10, y+8); g.strokePath();
    g.beginPath(); g.moveTo(x+10, y-8); g.lineTo(x-10, y+8); g.strokePath();

    // Gold vein flecks
    g.fillStyle(0xffd700, 0.85);
    g.fillRect(x-8, y-4, 3, 2);
    g.fillRect(x+5, y+1, 4, 2);
    g.fillRect(x-2, y+5, 2, 3);
    g.fillRect(x+2, y-6, 3, 2);

    // Interest rate badge
    g.fillStyle(0x443300, 0.9);
    g.fillRoundedRect(x-14, y+16, 28, 12, 3);
    g.fillStyle(0xffd700, 1);

    // Selection outline
    const sel = this.base.strokeColor === 0xffd700;
    g.lineStyle(2, sel ? 0xffd700 : 0x886633, sel ? 1 : 0.6);
    g.strokeRect(x-14, y-13, 28, 41);

    // Interest label drawn via text (update the iconText)
    this.iconText.setVisible(true);
    this.iconText.setText('+' + bonus + '%');
    this.iconText.setStyle({ fontSize: '9px', color: '#ffd700', fontFamily: 'Arial Black' });
    this.iconText.setPosition(x, y + 22);
  }

  _icon(t) { return TOWER_TYPES[t].icon; }

  get damage()   { return Math.floor(this.baseDef.damage   * (1 + this.dmgLevel   * 0.4)); }
  get range()    { return Math.floor(this.baseDef.range    * (1 + this.rangeLevel * 0.3)); }
  get fireRate() { return Math.floor(this.baseDef.fireRate * (1 - this.rateLevel  * 0.2)); }

  upgradeCost(level) { return this.baseDef.upgrades ? this.baseDef.upgrades[level] : (level + 1) * 75; }

  upgrade(stat) {
    const key = stat + 'Level';
    const level = this[key];
    if (level >= MAX_UPGRADE) return false;
    const cost = this.upgradeCost(level);
    if (gold < cost) return false;
    gold -= cost;
    goldText.setText('💰 Gold: ' + gold);
    this[key]++;
    if (!this.isMine) this.rangeRing.setRadius(this.range);
    if (this.isMine) this.redrawMine();
    refreshAllDragons();
    return true;
  }

  setSelected(sel) {
    this.base.setStrokeStyle(2, sel ? 0xffd700 : 0xffffff, sel ? 1 : 0.7);
    this.rangeRing.setStrokeStyle(1, 0xffd700, sel ? 0.5 : 0.15);
    if (this.isDragon) this.redrawDragon(globalUpgradeTier());
    if (this.isTitan)  this.redrawTitan();
    if (this.isMine)   this.redrawMine();
  }

  // Move all graphics to pixel position px, py
  moveTo(px, py) {
    this.x = px; this.y = py;
    this.base.setPosition(px, py);
    this.rangeRing.setPosition(px, py);
    this.iconText.setPosition(px, py + (this.isMine ? 22 : 0));
    if (this.isDragon) this.redrawDragon(globalUpgradeTier());
    else if (this.isTitan) this.redrawTitan();
    else if (this.isMine) this.redrawMine();
    else this.barrel.setPosition(px + 12, py);
  }

  // Snap to cell cx,cy and update placedCells
  snapToCell(newCx, newCy) {
    const oldKey = `${this.cx},${this.cy}`;
    const newKey = `${newCx},${newCy}`;
    placedCells.delete(oldKey);
    placedCells.add(newKey);
    this.cx = newCx; this.cy = newCy;
    this.moveTo(newCx * CELL + CELL/2, newCy * CELL + CELL/2);
    if (!this.isDragon && !this.isTitan) this.base.setFillStyle(this.baseDef.color);
  }

  sell() {
    const refund = Math.floor(this.baseDef.cost * 0.75);
    gold += refund;
    goldText.setText('💰 Gold: ' + gold);
    placedCells.delete(`${this.cx},${this.cy}`);
    const idx = towers.indexOf(this);
    if (idx !== -1) towers.splice(idx, 1);
    this.base.destroy();
    if (this.customGfx) this.customGfx.destroy();
    else this.barrel.destroy();
    this.rangeRing.destroy();
    this.iconText.destroy();
    spawnDamageNumber(scene_ref, this.x, this.y, '+' + refund + 'g', '#ffd700');
    SFX.play('place_tower');
    refreshAllDragons();
  }

  update(delta, enemies) {
    if (this.isMine) return; // mines don't shoot
    this.cooldown -= delta;
    if (this.cooldown > 0) return;
    let target = null, closest = Infinity;
    for (const e of enemies) {
      if (!e.alive || e.reached) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d <= this.range && d < closest) { closest = d; target = e; }
    }
    if (!target) return;
    this.cooldown = this.fireRate;
    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    this.barrel.setPosition(this.x + Math.cos(angle)*12, this.y + Math.sin(angle)*12);
    this.barrel.setRotation(angle);
    projectiles.push(new Projectile(this.scene, this.x, this.y, target, {
      damage: this.damage,
      projColor: this.baseDef.projColor,
      projSpeed: this.baseDef.projSpeed
    }));
  }
}

// ── Projectile ────────────────────────────────────────────────
class Projectile {
  constructor(scene, x, y, target, def) {
    this.scene  = scene;
    this.target = target;
    this.damage = def.damage;
    this.speed  = def.projSpeed;
    this.x = x; this.y = y;
    this.done = false;
    this.dmgColor = def.dmgColor || '#ffffff';
    this.sfxHit   = def.sfxHit  || 'arrow';
    this.dot = scene.add.circle(x, y, 5, def.projColor).setDepth(8);
    // Muzzle flash
    spawnExplosion(scene, x, y, def.projColor, 4);
    SFX.play(def.sfxFire || 'arrow');
  }

  update(delta) {
    if (this.done) return;
    if (!this.target.alive || this.target.reached) { this.destroy(); return; }

    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const step = this.speed * (delta / 1000);

    if (dist <= step) {
      this.target.takeDamage(this.damage);
      spawnDamageNumber(this.scene, this.target.x, this.target.y - 16, this.damage, this.dmgColor);
      SFX.play(this.sfxHit);
      this.destroy();
    } else {
      this.x += (dx/dist)*step; this.y += (dy/dist)*step;
      this.dot.setPosition(this.x, this.y);
    }
  }

  destroy() { this.done = true; this.dot.destroy(); }
}

// ── Upgrade Panel ─────────────────────────────────────────────
class UpgradePanel {
  constructor(scene) {
    this.scene = scene;
    this.tower = null;
    const px = 530, py = 400, pw = 240, ph = 200;

    this.bg = scene.add.rectangle(px, py, pw, ph, 0x111122, 0.95).setDepth(20).setVisible(false);
    this.bg.setStrokeStyle(2, 0xffd700, 1);
    this.title = scene.add.text(px, py - 82, '', { fontSize: '14px', fontFamily: 'Arial Black', color: '#ffd700' }).setOrigin(0.5).setDepth(21).setVisible(false);

    // Three upgrade rows: damage, range, fire rate
    this.rows = [
      { stat: 'dmg',   label: '⚔️  Damage',   y: py - 52 },
      { stat: 'range', label: '📡 Range',      y: py - 16 },
      { stat: 'rate',  label: '⚡ Fire Rate',  y: py + 20 },
    ].map(row => {
      const lbl  = scene.add.text(px - 110, row.y, row.label, { fontSize: '12px', color: '#cccccc' }).setOrigin(0, 0.5).setDepth(21).setVisible(false);
      const lvl  = scene.add.text(px,       row.y, '',        { fontSize: '12px', color: '#ffffff' }).setOrigin(0, 0.5).setDepth(21).setVisible(false);
      const btn  = scene.add.rectangle(px + 88, row.y, 60, 24, 0x226622).setDepth(21).setVisible(false).setInteractive();
      const bTxt = scene.add.text(px + 88,  row.y, '',        { fontSize: '11px', color: '#aaffaa' }).setOrigin(0.5).setDepth(22).setVisible(false);
      btn.on('pointerover', () => btn.setFillStyle(0x338833));
      btn.on('pointerout',  () => btn.setFillStyle(0x226622));
      btn.on('pointerdown', (ptr) => {
        ptr.event.stopPropagation();
        if (!this.tower) return;
        this.tower.upgrade(row.stat);
        this.refresh();
      });
      return { lbl, lvl, btn, bTxt, stat: row.stat };
    });

    // Move button
    this.moveBtn = scene.add.rectangle(px - 55, py + 62, 90, 28, 0x224488).setDepth(21).setVisible(false).setInteractive();
    this.moveBtnTxt = scene.add.text(px - 55, py + 62, '✋ Move', { fontSize: '12px', color: '#aaddff' }).setOrigin(0.5).setDepth(22).setVisible(false);
    this.moveBtn.on('pointerover', () => this.moveBtn.setFillStyle(0x3366aa));
    this.moveBtn.on('pointerout',  () => this.moveBtn.setFillStyle(movingTower ? 0x885500 : 0x224488));
    this.moveBtn.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      if (!this.tower) return;
      if (movingTower === this.tower) {
        cancelMove();
      } else {
        startMove(this.tower);
        if (movingTower) { this.moveBtn.setFillStyle(0x885500); this.moveBtnTxt.setText('✕ Cancel'); }
      }
      this.refresh();
    });

    // Sell button
    this.sellBtn = scene.add.rectangle(px + 55, py + 62, 90, 28, 0x882222).setDepth(21).setVisible(false).setInteractive();
    this.sellBtnTxt = scene.add.text(px + 55, py + 62, '', { fontSize: '12px', color: '#ffaaaa' }).setOrigin(0.5).setDepth(22).setVisible(false);
    this.sellBtn.on('pointerover', () => this.sellBtn.setFillStyle(0xaa3333));
    this.sellBtn.on('pointerout',  () => this.sellBtn.setFillStyle(0x882222));
    this.sellBtn.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      if (!this.tower) return;
      const t = this.tower;
      this.hide();
      if (selectedTower === t) { selectedTower = null; }
      t.sell();
    });

    this.closeBtn = scene.add.text(px + 108, py - 82, '✕', { fontSize: '14px', color: '#ff6666' }).setOrigin(0.5).setDepth(22).setVisible(false).setInteractive();
    this.closeBtn.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      cancelMove();
      this.hide();
      if (selectedTower) { selectedTower.setSelected(false); selectedTower = null; }
    });
  }

  show(tower) {
    this.tower = tower;
    this.bg.setVisible(true);
    this.title.setVisible(true);
    this.closeBtn.setVisible(true);
    this.moveBtn.setVisible(true);
    this.moveBtnTxt.setVisible(true);
    this.sellBtn.setVisible(true);
    this.sellBtnTxt.setVisible(true);
    this.rows.forEach(r => { r.lbl.setVisible(true); r.lvl.setVisible(true); r.btn.setVisible(true); r.bTxt.setVisible(true); });
    this.refresh();
  }

  refresh() {
    if (!this.tower) return;
    const t = this.tower;
    const label = t.isDragon ? DRAGON_NAMES[globalUpgradeTier()] : t.baseDef.label + (t.isTitan ? '' : '');
    this.title.setText(label + '  Lv.' + (t.dmgLevel + t.rangeLevel + t.rateLevel + 1));
    const inMove = movingTower === t;
    const preWave = !waveActive && wave === 1;
    const moveLabel = inMove ? '✕ Cancel' : (preWave ? '✋ Free Move' : `✋ Move (${MOVE_COST}g)`);
    this.moveBtn.setFillStyle(inMove ? 0x885500 : (!preWave && gold < MOVE_COST ? 0x662222 : 0x224488));
    this.moveBtnTxt.setText(moveLabel);
    const sellPrice = Math.floor(t.baseDef.cost * 0.75);
    this.sellBtnTxt.setText(`💰 Sell ${sellPrice}g`);
    this.sellBtn.setFillStyle(0x882222);
    if (t.isMine) {
      // Mine: single interest upgrade row, hide others
      this.rows[0].lbl.setText('⛏️ Interest +2%');
      const lvl = t.dmgLevel;
      this.rows[0].lvl.setText('★'.repeat(lvl) + '☆'.repeat(MAX_UPGRADE - lvl));
      if (lvl >= MAX_UPGRADE) {
        this.rows[0].btn.setFillStyle(0x444444).removeInteractive();
        this.rows[0].bTxt.setText('MAX').setColor('#888888');
      } else {
        const cost = t.upgradeCost(lvl);
        this.rows[0].btn.setFillStyle(gold >= cost ? 0x226622 : 0x662222).setInteractive();
        this.rows[0].bTxt.setText(cost + 'g').setColor(gold >= cost ? '#aaffaa' : '#ff8888');
      }
      this.rows[1].lbl.setText(''); this.rows[1].lvl.setText(''); this.rows[1].btn.setVisible(false); this.rows[1].bTxt.setText('');
      this.rows[2].lbl.setText(''); this.rows[2].lvl.setText(''); this.rows[2].btn.setVisible(false); this.rows[2].bTxt.setText('');
    } else {
      this.rows[0].lbl.setText('⚔️  Damage');
      this.rows[1].lbl.setText('📡 Range');
      this.rows[2].lbl.setText('⚡ Fire Rate');
      this.rows[1].btn.setVisible(true); this.rows[2].btn.setVisible(true);
      const stats = [
        { level: t.dmgLevel,   stat: 'dmg' },
        { level: t.rangeLevel, stat: 'range' },
        { level: t.rateLevel,  stat: 'rate' },
      ];
      this.rows.forEach((row, i) => {
        const lvl  = stats[i].level;
        row.lvl.setText('★'.repeat(lvl) + '☆'.repeat(MAX_UPGRADE - lvl));
        if (lvl >= MAX_UPGRADE) {
          row.btn.setFillStyle(0x444444).removeInteractive();
          row.bTxt.setText('MAX').setColor('#888888');
        } else {
          const cost = t.upgradeCost(lvl);
          row.btn.setFillStyle(gold >= cost ? 0x226622 : 0x662222).setInteractive();
          row.bTxt.setText(cost + 'g').setColor(gold >= cost ? '#aaffaa' : '#ff8888');
        }
      });
    }
  }

  hide() {
    this.tower = null;
    this.bg.setVisible(false);
    this.title.setVisible(false);
    this.closeBtn.setVisible(false);
    this.moveBtn.setVisible(false);
    this.moveBtnTxt.setVisible(false);
    this.sellBtn.setVisible(false);
    this.sellBtnTxt.setVisible(false);
    this.rows.forEach(r => { r.lbl.setVisible(false); r.lvl.setVisible(false); r.btn.setVisible(false); r.bTxt.setVisible(false); });
  }
}

// ── Phaser config ─────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#2d5a27',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update }
};
const game = new Phaser.Game(config);

// ── Game state ────────────────────────────────────────────────
let enemies = [], towers = [], projectiles = [];
let placedCells = new Set();
let waveRoster = [];
let spawnTimer = 0, spawnCount = 0, waveSize = 8;
let gold = 150, wave = 1, waveActive = false;
let lives = 20; // kept for compat — mirrors castleHP

// ── Castle system ─────────────────────────────────────────────
const CASTLE_LEVELS = [
  { name: 'Castle',    cost: 0,   maxHP: 20, cols: 2, rows: 2 },
  { name: 'Stronghold',cost: 200, maxHP: 35, cols: 2, rows: 3 },
  { name: 'Fortress',  cost: 400, maxHP: 55, cols: 3, rows: 3 },
  { name: 'Keep',      cost: 800, maxHP: 80, cols: 4, rows: 3 },
];
let castleLevel = 0;
let castleHP = CASTLE_LEVELS[0].maxHP;
let castleMaxHP = CASTLE_LEVELS[0].maxHP;
let castleGfxGroup = [];   // graphics objects for current castle drawing
let castleHPBar = null;    // green fill rect in HUD
let castleHPBg  = null;    // grey bg rect in HUD
let castleHPText = null;   // text label
let castleNameText = null; // e.g. "Castle" / "Stronghold"

function castleEnemyDamage(size) {
  if (size >= 44) return 6;   // bosses
  if (size >= 30) return 3;   // large
  if (size >= 18) return 2;   // medium
  return 1;                   // small
}

function clearCastleGfx() {
  for (const o of castleGfxGroup) { if (o && o.destroy) o.destroy(); }
  castleGfxGroup = [];
}

function drawCastle(scene, factionKey) {
  clearCastleGfx();
  const lvl = CASTLE_LEVELS[castleLevel];
  // Castle sits at the right edge, centred on path end y=440
  const pathEndY = 440;
  const cellW = CELL * lvl.cols, cellH = CELL * lvl.rows;
  const cx = 800 - cellW / 2 - 4;   // right-aligned with 4px margin
  const cy = pathEndY;

  // Theme colours
  const themes = {
    barbarian: { wall: 0xd4a855, accent: 0xb88830, flag: 0xcc2200, flag2: 0xffffff },
    undead:    { wall: 0x778899, accent: 0x556677, flag: 0x2244aa, flag2: 0xffffff },
    dark:      { wall: 0x88aaaa, accent: 0x557755, flag: 0x7722cc, flag2: 0xffdd44 },
  };
  const t = themes[factionKey] || themes.barbarian;
  const dmgRatio = castleHP / castleMaxHP;

  const g = scene.add.graphics().setDepth(4);
  castleGfxGroup.push(g);

  const left = cx - cellW/2, top = cy - cellH/2;
  const w = cellW, h = cellH;

  // ── Foundation shadow ──
  g.fillStyle(0x000000, 0.25);
  g.fillRect(left + 4, top + h - 4, w, 8);

  // ── Main wall ──
  g.fillStyle(t.wall, 1);
  g.fillRect(left, top + 8, w, h - 8);

  // ── Darker accent band ──
  g.fillStyle(t.accent, 1);
  g.fillRect(left, top + h - 16, w, 10);

  // ── Gate archway ──
  const gateW = Math.min(20, w * 0.35);
  const gateX = cx - gateW / 2;
  g.fillStyle(0x221100, 1);
  g.fillRect(gateX, top + h - 28, gateW, 28);
  g.fillCircle(cx, top + h - 28, gateW / 2); // arch top

  // ── Portcullis bars ──
  g.fillStyle(0x554433, 1);
  for (let bx = gateX + 3; bx < gateX + gateW - 3; bx += 5) {
    g.fillRect(bx, top + h - 28, 2, 26);
  }

  // ── Corner towers ──
  const towerW = Math.max(14, w * 0.22);
  const towerH = h * 0.55;
  for (const tx of [left, left + w - towerW]) {
    g.fillStyle(t.accent, 1);
    g.fillRect(tx, top, towerW, towerH + 8);
    g.fillStyle(t.wall, 1);
    g.fillRect(tx, top, towerW, towerH);
    // Tower battlements
    const merlonW = towerW / 3;
    for (let m = 0; m < 3; m++) {
      if (m % 2 === 0) {
        g.fillStyle(t.wall, 1);
        g.fillRect(tx + m * merlonW, top - 7, merlonW - 2, 10);
      }
    }
    // Tower window
    g.fillStyle(0x221100, 1);
    g.fillRect(tx + towerW/2 - 3, top + towerH * 0.35, 6, 8);
  }

  // ── Main wall battlements ──
  const innerW = w - towerW * 2;
  const mW = 10, gap = 8;
  let bx2 = left + towerW + 4;
  while (bx2 + mW < left + w - towerW - 4) {
    g.fillStyle(t.wall, 1);
    g.fillRect(bx2, top - 7, mW, 10);
    bx2 += mW + gap;
  }

  // ── Flag on left tower ──
  const flagX = left + towerW / 2;
  const flagY = top - 18;
  g.fillStyle(0x554433, 1);
  g.fillRect(flagX - 1, flagY - 14, 2, 20); // pole
  g.fillStyle(t.flag, 1);
  g.fillTriangle(flagX + 1, flagY - 14, flagX + 14, flagY - 8, flagX + 1, flagY - 2); // flag
  // Cross on flag (crusader)
  g.fillStyle(t.flag2, 1);
  g.fillRect(flagX + 4, flagY - 13, 2, 10);
  g.fillRect(flagX + 1, flagY - 10, 8, 2);

  // ── Damage overlays ──
  if (dmgRatio < 0.75) {
    // Crack lines
    g.lineStyle(2, 0x332211, 0.8);
    g.beginPath(); g.moveTo(left + w*0.3, top+10); g.lineTo(left + w*0.25, top+30); g.strokePath();
    g.beginPath(); g.moveTo(left + w*0.7, top+15); g.lineTo(left + w*0.75, top+40); g.strokePath();
  }
  if (dmgRatio < 0.5) {
    // Missing battlements & scorch marks
    g.fillStyle(0x332211, 0.6);
    g.fillRect(left + towerW + 4, top - 7, mW, 10); // fill one merlon gap
    g.fillStyle(0x221100, 0.4);
    g.fillRect(left + w*0.4, top+8, 18, 12);
    g.lineStyle(2, 0x553311, 0.9);
    g.beginPath(); g.moveTo(left + w*0.5, top+5); g.lineTo(left + w*0.45, top+35); g.lineTo(left+w*0.5, top+50); g.strokePath();
  }
  if (dmgRatio < 0.25) {
    // Heavy rubble — darken & crumble corner
    g.fillStyle(0x221100, 0.55);
    g.fillRect(left, top, towerW, towerH);
    g.fillStyle(0x554433, 0.7);
    g.fillRect(left + w*0.6, top+h-20, w*0.3, 20);
    g.lineStyle(3, 0x000000, 0.5);
    g.beginPath(); g.moveTo(left+w*0.3, top); g.lineTo(left+w*0.2, top+h*0.6); g.strokePath();
  }

  // ── Clickable hit area (invisible rect) ──
  const hitZone = scene.add.rectangle(cx, cy, cellW, cellH, 0x000000, 0)
    .setDepth(4).setInteractive({ useHandCursor: true });
  hitZone.on('pointerdown', (ptr) => {
    ptr.event.stopPropagation();
    showCastlePanel(scene);
  });
  hitZone.on('pointerover', () => {
    g.lineStyle(2, 0xffd700, 0.8);
    g.strokeRect(left, top - 7, w, h + 7);
  });
  hitZone.on('pointerout', () => { g.clear(); drawCastle(scene, currentFaction); });
  castleGfxGroup.push(hitZone);

  updateCastleHUD();
}

function updateCastleHUD() {
  if (!castleHPBar) return;
  const pct = Math.max(0, castleHP / castleMaxHP);
  const barW = Math.floor(120 * pct);
  castleHPBar.setSize(barW || 1, 10);
  const col = pct > 0.6 ? 0x44dd44 : pct > 0.3 ? 0xffaa00 : 0xff2200;
  castleHPBar.setFillStyle(col);
  castleHPText.setText(castleHP + '/' + castleMaxHP);
  castleNameText.setText('🏰 ' + CASTLE_LEVELS[castleLevel].name);
}

let castlePanel = null;
let currentFaction = 'barbarian';

function showCastlePanel(scene) {
  if (castlePanel) { castlePanel.destroy(); castlePanel = null; return; }
  const px = 260, py = 410, pw = 240, ph = 120;
  const nextLvl = CASTLE_LEVELS[castleLevel + 1];

  const bg    = scene.add.rectangle(px, py, pw, ph, 0x111122, 0.95).setDepth(30).setStrokeStyle(2, 0xffd700);
  const title = scene.add.text(px, py - 48, '🏰 ' + CASTLE_LEVELS[castleLevel].name, { fontSize: '15px', fontFamily: 'Arial Black', color: '#ffd700' }).setOrigin(0.5).setDepth(31);
  const hpTxt = scene.add.text(px, py - 24, `HP: ${castleHP} / ${castleMaxHP}`, { fontSize: '13px', color: '#aaffaa' }).setOrigin(0.5).setDepth(31);
  const close = scene.add.text(px + 108, py - 48, '✕', { fontSize: '14px', color: '#ff6666' }).setOrigin(0.5).setDepth(32).setInteractive({ useHandCursor: true });
  close.on('pointerdown', (ptr) => { ptr.event.stopPropagation(); castlePanel.destroy(); castlePanel = null; });

  let upgradeBtn, upgradeTxt;
  if (nextLvl) {
    const canAfford = gold >= nextLvl.cost;
    upgradeBtn = scene.add.rectangle(px, py + 14, 200, 34, canAfford ? 0x226622 : 0x662222).setDepth(31).setInteractive({ useHandCursor: true });
    upgradeTxt = scene.add.text(px, py + 14, `Upgrade → ${nextLvl.name}  (${nextLvl.cost}g)`, { fontSize: '12px', color: canAfford ? '#aaffaa' : '#ff8888' }).setOrigin(0.5).setDepth(32);
    upgradeBtn.on('pointerover', () => upgradeBtn.setFillStyle(canAfford ? 0x338833 : 0x882222));
    upgradeBtn.on('pointerout',  () => upgradeBtn.setFillStyle(canAfford ? 0x226622 : 0x662222));
    upgradeBtn.on('pointerdown', (ptr) => {
      ptr.event.stopPropagation();
      if (gold < nextLvl.cost) { SFX.play('not_enough_gold'); return; }
      gold -= nextLvl.cost;
      goldText.setText('💰 Gold: ' + gold);
      castleLevel++;
      const cl = CASTLE_LEVELS[castleLevel];
      castleMaxHP = cl.maxHP;
      castleHP = Math.min(castleHP + 15, castleMaxHP);
      lives = castleHP;
      SFX.play('unlock');
      castlePanel.destroy(); castlePanel = null;
      drawCastle(scene, currentFaction);
    });
  } else {
    upgradeBtn = scene.add.rectangle(px, py + 14, 200, 34, 0x444444).setDepth(31);
    upgradeTxt = scene.add.text(px, py + 14, 'MAX LEVEL — Keep', { fontSize: '12px', color: '#888888' }).setOrigin(0.5).setDepth(32);
  }

  castlePanel = { destroy() { [bg, title, hpTxt, close, upgradeBtn, upgradeTxt].forEach(o => o && o.destroy()); castlePanel = null; } };
}
let selectedTowerType = 'arrow';
let selectedTower = null;
let movingTower = null;
let draggingTower = null;   // tower being freely dragged (pre-wave)
let dragStartX = 0, dragStartY = 0; // pointer position at drag start
const MOVE_COST = 50;       // gold cost to move a tower after wave 1 has started
let interestTimer = 0;
const INTEREST_INTERVAL = 10000, INTEREST_RATE = 0.02;

let livesText, goldText, waveText, statusText, interestText, factionText;
let upgradePanel;

function refreshShop() {
  if (!scene_ref) return;
  for (const [key, entry] of Object.entries(scene_ref._shopBtns)) {
    const def = TOWER_TYPES[key];
    const locked = wave <= def.unlockWave;
    entry.bg.setFillStyle(locked ? 0x1a1a1a : 0x222244);
    entry.bg.setStrokeStyle(2, key === selectedTowerType && !locked ? 0xffd700 : (locked ? 0x333333 : 0x444466));
    entry.nameTxt.setColor(locked ? '#555555' : '#ffffff');
    entry.costTxt.setColor(locked ? '#554400' : '#ffd700');
    entry.descTxt.setColor(locked ? '#444444' : '#aaaaaa');
    entry.lockTxt.setText(locked ? `🔒 Unlocks\nafter Wave ${def.unlockWave}` : '');
    // If selected tower just unlocked, keep selection; if locked, switch to arrow
    if (locked && selectedTowerType === key) selectedTowerType = 'arrow';
  }
}

let scene_ref = null;
let countdownActive = false;

function startWaveWithCountdown(scene) {
  if (waveActive || countdownActive) return;
  // Cancel any active drag when wave starts
  if (draggingTower) {
    draggingTower.moveTo(draggingTower.cx * CELL + CELL/2, draggingTower.cy * CELL + CELL/2);
    draggingTower.rangeRing.setAlpha(1);
    draggingTower = null;
  }
  countdownActive = true;
  scene._waveBtn.setFillStyle(0x888800).removeInteractive();
  scene._waveBtnText.setText('Starting...');

  let count = 3;
  statusText.setText(count + '...').setColor('#ff4444').setFontSize('48px');
  const tick = scene.time.addEvent({
    delay: 700, repeat: 2,
    callback: () => {
      count--;
      if (count > 0) {
        statusText.setText(count + '...').setColor(count === 2 ? '#ffaa00' : '#44ff44');
        SFX.play('countdown_beep');
      } else {
        statusText.setText('').setFontSize('20px').setColor('#ffd700');
        SFX.play('countdown_go');
        countdownActive = false;
        waveActive = true; spawnCount = 0; spawnTimer = 0; interestTimer = 0;
        waveRoster = buildWaveRoster(wave);
        scene._waveBtnText.setText('Wave ' + wave + '...');
        const f = FACTIONS[getFactionForWave(wave)];
        if (factionText) factionText.setText(f.name).setColor(f.color);
      }
    }
  });
}

function showGameOver(scene) {
  const survived = wave - 1;
  const prev = parseInt(localStorage.getItem('td_best_wave') || '0');
  const isNewBest = survived > prev;
  if (isNewBest) localStorage.setItem('td_best_wave', survived);
  const best = isNewBest ? survived : prev;

  // Dark overlay
  const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.75).setDepth(50);
  scene.add.text(400, 160, 'GAME OVER', {
    fontSize: '64px', fontFamily: 'Arial Black', color: '#ff2200',
    stroke: '#000000', strokeThickness: 8
  }).setOrigin(0.5).setDepth(51);
  scene.add.text(400, 250, `Survived ${survived} wave${survived !== 1 ? 's' : ''}`, {
    fontSize: '28px', color: '#ffffff', stroke: '#000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(51);
  scene.add.text(400, 295, `Gold earned: ${gold}`, {
    fontSize: '22px', color: '#ffd700', stroke: '#000', strokeThickness: 3
  }).setOrigin(0.5).setDepth(51);

  // Faction reached
  const faction = FACTIONS[getFactionForWave(wave)];
  scene.add.text(400, 335, `Fell to: ${faction.name}`, {
    fontSize: '20px', color: faction.color, stroke: '#000', strokeThickness: 3
  }).setOrigin(0.5).setDepth(51);

  // Best wave
  if (isNewBest && survived > 0) {
    scene.add.text(400, 378, '🏆 NEW BEST!', {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#ffdd00',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(51);
  } else {
    scene.add.text(400, 378, `Best: Wave ${best}`, {
      fontSize: '20px', color: '#aaaaaa', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(51);
  }

  // Restart button
  const btn = scene.add.rectangle(400, 445, 200, 50, 0xffd700).setDepth(51).setInteractive();
  scene.add.text(400, 445, '▶ Play Again', {
    fontSize: '22px', fontFamily: 'Arial Black', color: '#1a1a2e'
  }).setOrigin(0.5).setDepth(52);
  btn.on('pointerover', () => btn.setFillStyle(0xffec6e));
  btn.on('pointerout',  () => btn.setFillStyle(0xffd700));
  btn.on('pointerdown', () => scene.scene.restart());
}

function selectTower(tower) {
  if (selectedTower) selectedTower.setSelected(false);
  if (selectedTower === tower) { selectedTower = null; upgradePanel.hide(); return; }
  selectedTower = tower;
  tower.setSelected(true);
  upgradePanel.show(tower);
}

function startMove(tower) {
  if (waveActive || wave > 1) {
    // Post-wave: charge gold
    if (gold < MOVE_COST) {
      statusText.setText('Not enough gold to move! (50g)');
      scene_ref.time.delayedCall(1500, () => statusText.setText(''));
      SFX.play('not_enough_gold');
      return;
    }
    gold -= MOVE_COST;
    goldText.setText('💰 Gold: ' + gold);
  }
  movingTower = tower;
  if (!tower.isDragon && !tower.isTitan) tower.base.setFillStyle(0xff9900);
  statusText.setText('Click an empty cell to move the tower');
}

function cancelMove() {
  if (!movingTower) return;
  if (!movingTower.isDragon && !movingTower.isTitan) movingTower.base.setFillStyle(movingTower.baseDef.color);
  if (movingTower.isDragon) movingTower.redrawDragon(globalUpgradeTier());
  if (movingTower.isTitan)  movingTower.redrawTitan();
  movingTower = null;
  statusText.setText('');
  if (upgradePanel) upgradePanel.refresh();
}

function doMove(cx, cy) {
  if (!movingTower) return;
  const oldKey = `${movingTower.cx},${movingTower.cy}`;
  const newKey = `${cx},${cy}`;
  // Move the tower visually and update state
  placedCells.delete(oldKey);
  placedCells.add(newKey);
  movingTower.cx = cx;
  movingTower.cy = cy;
  movingTower.x = cx * CELL + CELL/2;
  movingTower.y = cy * CELL + CELL/2;
  // Reposition all sprites
  movingTower.base.setPosition(movingTower.x, movingTower.y);
  if (!movingTower.isDragon && !movingTower.isTitan) movingTower.barrel.setPosition(movingTower.x + 12, movingTower.y);
  movingTower.rangeRing.setPosition(movingTower.x, movingTower.y);
  movingTower.iconText.setPosition(movingTower.x, movingTower.y);
  if (!movingTower.isDragon && !movingTower.isTitan) movingTower.base.setFillStyle(movingTower.baseDef.color);
  if (movingTower.isDragon) movingTower.redrawDragon(globalUpgradeTier());
  if (movingTower.isTitan)  movingTower.redrawTitan();
  movingTower.setSelected(true);
  statusText.setText('');
  movingTower = null;
  if (upgradePanel) upgradePanel.refresh();
}

function preload() {}

function create() {
  scene_ref = this;
  drawMap(this, 'barbarian');

  // ── Tower shop bar at bottom ──
  const shopY = 565;
  this.add.rectangle(400, shopY, 800, 70, 0x111111, 0.9).setDepth(9);
  this.add.text(8, shopY, 'BUILD', { fontSize: '11px', color: '#666666', fontFamily: 'Arial Black' }).setOrigin(0, 0.5).setDepth(10);

  this._shopBtns = {};
  this._shopScene = this;
  const keys = Object.keys(TOWER_TYPES);
  const btnW = 118, gap = 8;
  const totalW = keys.length * btnW + (keys.length - 1) * gap;
  let bx = (800 - totalW) / 2 + btnW / 2;

  for (const key of keys) {
    const def = TOWER_TYPES[key];
    const locked = def.unlockWave > 0;
    const bg = this.add.rectangle(bx, shopY, btnW, 58, locked ? 0x1a1a1a : 0x222244).setDepth(10).setInteractive();
    bg.setStrokeStyle(2, key === selectedTowerType ? 0xffd700 : (locked ? 0x333333 : 0x444466));
    const iconTxt  = this.add.text(bx - 44, shopY - 14, def.icon,             { fontSize: '16px' }).setOrigin(0, 0.5).setDepth(11);
    const nameTxt  = this.add.text(bx - 24, shopY - 14, def.label,            { fontSize: '11px', fontFamily: 'Arial Black', color: locked ? '#555555' : '#ffffff' }).setOrigin(0, 0.5).setDepth(11);
    const costTxt  = this.add.text(bx - 44, shopY + 4,  '💰' + def.cost,      { fontSize: '10px', color: locked ? '#554400' : '#ffd700' }).setOrigin(0, 0.5).setDepth(11);
    const descTxt  = this.add.text(bx - 44, shopY + 20, def.desc,             { fontSize: '9px',  color: locked ? '#444444' : '#aaaaaa' }).setOrigin(0, 0.5).setDepth(11);
    const lockTxt  = this.add.text(bx,      shopY,      locked ? `🔒 Unlocks\nafter Wave ${def.unlockWave}` : '', { fontSize: '10px', color: '#888800', align: 'center' }).setOrigin(0.5).setDepth(12);

    bg.on('pointerdown', () => {
      if (wave <= def.unlockWave) return; // still locked
      selectedTowerType = key;
      for (const [k, entry] of Object.entries(this._shopBtns)) {
        const isLocked = TOWER_TYPES[k].unlockWave >= wave;
        entry.bg.setStrokeStyle(2, k === selectedTowerType ? 0xffd700 : (isLocked ? 0x333333 : 0x444466));
      }
    });
    bg.on('pointerover', () => { if (wave > def.unlockWave) bg.setFillStyle(0x333366); });
    bg.on('pointerout',  () => { bg.setFillStyle(wave <= def.unlockWave ? 0x1a1a1a : 0x222244); });

    this._shopBtns[key] = { bg, iconTxt, nameTxt, costTxt, descTxt, lockTxt };
    bx += btnW + gap;
  }

  // ── Input: pointer down ──────────────────────────────────────
  this.input.on('pointerdown', (ptr) => {
    if (ptr.downElement && ptr.downElement !== this.game.canvas) return;
    if (ptr.y < HUD_H || ptr.y > 520) return;

    const cx = Math.floor(ptr.x / CELL);
    const cy = Math.floor(ptr.y / CELL);
    const key = `${cx},${cy}`;

    // Paid move mode (post-wave): drop tower on valid cell
    if (movingTower) {
      if (PATH_CELLS.has(key) || (placedCells.has(key) && key !== `${movingTower.cx},${movingTower.cy}`)) {
        statusText.setText("Can't place there!");
        this.time.delayedCall(1200, () => { if (movingTower) statusText.setText('Click an empty cell to move the tower'); });
        return;
      }
      doMove(cx, cy);
      return;
    }

    // Pre-wave free drag: start dragging an existing tower
    if (!waveActive && placedCells.has(key)) {
      const tower = towers.find(t => t.cx === cx && t.cy === cy);
      if (tower) {
        draggingTower = tower;
        dragStartX = ptr.x; dragStartY = ptr.y;
        if (selectedTower && selectedTower !== tower) { selectedTower.setSelected(false); upgradePanel.hide(); }
        selectedTower = tower;
        tower.setSelected(true);
        upgradePanel.show(tower);
        return;
      }
    }

    // Clicked occupied cell during wave — select tower
    if (placedCells.has(key)) {
      const tower = towers.find(t => t.cx === cx && t.cy === cy);
      if (tower) { selectTower(tower); return; }
    }

    // Deselect if clicking empty map
    if (selectedTower) { selectedTower.setSelected(false); selectedTower = null; upgradePanel.hide(); }

    // Place new tower on empty valid cell
    if (PATH_CELLS.has(key)) return;
    const def = TOWER_TYPES[selectedTowerType];
    if (gold < def.cost) {
      statusText.setText('Not enough gold!');
      this.time.delayedCall(1500, () => statusText.setText(''));
      SFX.play('not_enough_gold');
      return;
    }
    gold -= def.cost;
    goldText.setText('💰 Gold: ' + gold);
    placedCells.add(key);
    towers.push(new Tower(this, cx, cy, selectedTowerType));
    SFX.play('place_tower');
  });

  // ── Input: pointer move (drag) ────────────────────────────────
  this.input.on('pointermove', (ptr) => {
    if (!draggingTower) return;
    // Only drag if moved more than 4px (prevents accidental drags)
    const dx = ptr.x - dragStartX, dy = ptr.y - dragStartY;
    if (Math.sqrt(dx*dx + dy*dy) < 4) return;
    draggingTower.moveTo(ptr.x, ptr.y);
    draggingTower.rangeRing.setAlpha(0.5);
  });

  // ── Input: pointer up (drop) ─────────────────────────────────
  this.input.on('pointerup', (ptr) => {
    if (!draggingTower) return;
    const tower = draggingTower;
    draggingTower = null;
    tower.rangeRing.setAlpha(1);

    const moved = Math.sqrt((ptr.x-dragStartX)**2 + (ptr.y-dragStartY)**2);
    if (moved < 4) {
      // Treat as a click — snap back, keep selected
      tower.moveTo(tower.cx * CELL + CELL/2, tower.cy * CELL + CELL/2);
      return;
    }

    // Snap to target cell
    const cx = Math.floor(ptr.x / CELL);
    const cy = Math.floor(ptr.y / CELL);
    const key = `${cx},${cy}`;
    const origKey = `${tower.cx},${tower.cy}`;

    if (ptr.y < HUD_H || ptr.y > 520 || PATH_CELLS.has(key) ||
        (placedCells.has(key) && key !== origKey)) {
      // Invalid drop — snap back to original cell
      tower.moveTo(tower.cx * CELL + CELL/2, tower.cy * CELL + CELL/2);
      statusText.setText("Can't place there!");
      scene_ref.time.delayedCall(1200, () => statusText.setText(''));
      return;
    }

    tower.snapToCell(cx, cy);
    tower.setSelected(true);
    upgradePanel.show(tower);
    SFX.play('place_tower');
  });

  // ── HUD ──
  this.add.rectangle(400, HUD_H/2, 800, HUD_H, 0x000000, 0.65).setDepth(9);
  // Castle HP bar in HUD
  castleNameText = this.add.text(14, HUD_H/2 - 6, '🏰 Castle', { fontSize: '11px', fontFamily: 'Arial Black', color: '#ffd700' }).setOrigin(0, 0.5).setDepth(10);
  this.add.rectangle(14 + 60 + 2, HUD_H/2 + 6, 122, 12, 0x333333).setOrigin(0, 0.5).setDepth(10); // bg
  castleHPBg  = this.add.rectangle(14 + 60 + 2, HUD_H/2 + 6, 122, 12, 0x333333).setOrigin(0, 0.5).setDepth(10);
  castleHPBar = this.add.rectangle(14 + 60 + 2, HUD_H/2 + 6, 120, 10, 0x44dd44).setOrigin(0, 0.5).setDepth(11);
  castleHPText = this.add.text(14 + 60 + 66, HUD_H/2 + 6, '20/20', { fontSize: '9px', color: '#ffffff' }).setOrigin(0.5, 0.5).setDepth(12);
  livesText = { setText: () => {} }; // stub so old refs don't crash
  goldText     = this.add.text(100, HUD_H/2, '💰 Gold: 150', { fontSize: '15px', color: '#ffd700' }).setOrigin(0, 0.5).setDepth(10);
  waveText     = this.add.text(400, HUD_H/2, 'Wave: 1',      { fontSize: '15px', color: '#ffffff' }).setOrigin(0.5, 0.5).setDepth(10);
  const bestWave = parseInt(localStorage.getItem('td_best_wave') || '0');
  if (bestWave > 0) this.add.text(510, HUD_H/2, `🏆 Best: ${bestWave}`, { fontSize: '13px', color: '#ffdd00' }).setOrigin(0, 0.5).setDepth(10);
  const muteBtn = this.add.text(598, HUD_H/2, '🔊', { fontSize: '16px' }).setOrigin(0.5, 0.5).setDepth(10).setInteractive({ useHandCursor: true });
  muteBtn.on('pointerdown', () => { const m = SFX.toggleMute(); muteBtn.setText(m ? '🔇' : '🔊'); });
  interestText = this.add.text(400, 530, '',                           { fontSize: '13px', color: '#aaffaa', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
  statusText   = this.add.text(400, 290, '',                           { fontSize: '20px', color: '#ffd700', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
  factionText  = this.add.text(400, HUD_H + 12, 'Barbarian Horde',   { fontSize: '13px', fontFamily: 'Arial Black', color: '#cc3300', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(10);

  // ── Upgrade panel (hidden by default) ──
  upgradePanel = new UpgradePanel(this);


  // Start Wave button
  const btn = this.add.rectangle(690, HUD_H/2, 150, 28, 0xffd700).setDepth(10).setInteractive();
  const btnText = this.add.text(690, HUD_H/2, 'Start Wave', { fontSize: '14px', fontFamily: 'Arial Black', color: '#1a1a2e' }).setOrigin(0.5).setDepth(11);
  btn.on('pointerover', () => btn.setFillStyle(0xffec6e));
  btn.on('pointerout',  () => btn.setFillStyle(0xffd700));
  btn.on('pointerdown', () => startWaveWithCountdown(this));
  this._waveBtn = btn; this._waveBtnText = btnText;
}

// Holds graphics objects for the current map so they can be destroyed on transition
let mapGraphicsGroup = [];

const MAP_THEMES = {
  barbarian: {
    bgColor:   0xc49a3c,   // sandy tan
    gridColor: 0xb8882a,
    gridAlpha: 0.25,
    pathFill:  0xa07830,   // dusty brown track
    pathEdge:  0xd4aa55,
    skyColor:  0xe8c870,   // warm haze sky strip
  },
  undead: {
    bgColor:   0x1a2810,   // dark green-black forest floor
    gridColor: 0x223318,
    gridAlpha: 0.3,
    pathFill:  0x2a1808,   // dark dirt path
    pathEdge:  0x4a3020,
    skyColor:  0x0d1a08,
  },
  dark: {
    bgColor:   0x2d4a1e,   // lighter forest green
    gridColor: 0x3a6128,
    gridAlpha: 0.25,
    pathFill:  0x3d2a10,
    pathEdge:  0x6a4a22,
    skyColor:  0x1a3010,
  },
};

function clearMapGraphics() {
  for (const obj of mapGraphicsGroup) { if (obj && obj.destroy) obj.destroy(); }
  mapGraphicsGroup = [];
}

function drawMap(scene, factionKey) {
  clearMapGraphics();
  const theme = MAP_THEMES[factionKey] || MAP_THEMES.barbarian;
  const GAME_H = 530; // playfield height (above shop bar)

  // ── Background fill ──
  const bg = scene.add.rectangle(400, GAME_H/2, 800, GAME_H, theme.bgColor).setDepth(0);
  mapGraphicsGroup.push(bg);

  // ── Faction-specific decorations ──
  const deco = scene.add.graphics().setDepth(1);
  mapGraphicsGroup.push(deco);

  if (factionKey === 'barbarian') {
    // Desert: sand dunes silhouette at top, cacti, rocks
    deco.fillStyle(0xe8c870, 1); // sky strip
    deco.fillRect(0, 0, 800, 48);
    deco.fillStyle(0xd4a030, 1); // dune layer
    deco.fillTriangle(0,48, 120,8, 240,48);
    deco.fillTriangle(150,48, 300,12, 450,48);
    deco.fillTriangle(370,48, 500,6,  630,48);
    deco.fillTriangle(580,48, 720,16, 800,48);
    // Scattered rocks
    const rocks = [[60,200,10],[180,350,7],[580,150,12],[700,400,9],[350,450,8],[450,250,6]];
    for (const [rx,ry,rr] of rocks) {
      deco.fillStyle(0x9a7830, 1); deco.fillEllipse(rx, ry, rr*2.5, rr*1.4);
      deco.fillStyle(0xb89040, 1); deco.fillEllipse(rx-2, ry-2, rr*1.5, rr*0.9);
    }
    // Cacti (simple T-shapes)
    const cactiPos = [[90,300],[550,200],[680,320],[230,420],[730,200]];
    for (const [cx2,cy2] of cactiPos) {
      if (PATH_CELLS.has(`${Math.floor(cx2/CELL)},${Math.floor(cy2/CELL)}`)) continue;
      deco.fillStyle(0x4a8830, 1);
      deco.fillRect(cx2-4, cy2-30, 8, 38);    // trunk
      deco.fillRect(cx2-14, cy2-20, 10, 5);   // left arm horizontal
      deco.fillRect(cx2-14, cy2-26, 5, 10);   // left arm vertical tip
      deco.fillRect(cx2+4,  cy2-24, 10, 5);   // right arm horizontal
      deco.fillRect(cx2+9,  cy2-30, 5, 10);   // right arm vertical tip
    }

  } else if (factionKey === 'undead') {
    // Dark forest: near-black sky, dead trees, fog wisps, gravestones
    deco.fillStyle(0x080f06, 1); // very dark sky
    deco.fillRect(0, 0, 800, 55);
    // Moon
    deco.fillStyle(0xddddaa, 1); deco.fillCircle(680, 28, 18);
    deco.fillStyle(0x080f06, 1); deco.fillCircle(672, 24, 14); // crescent cutout
    // Dead trees
    const trees = [[50,100],[160,80],[280,110],[480,90],[610,105],[740,85],[120,460],[340,480],[560,465],[700,440]];
    for (const [tx,ty] of trees) {
      if (PATH_CELLS.has(`${Math.floor(tx/CELL)},${Math.floor(ty/CELL)}`)) continue;
      deco.fillStyle(0x1a1a10, 1);
      deco.fillRect(tx-3, ty, 6, 55);        // trunk
      deco.fillRect(tx-3, ty-5, 6, 10);      // crown base
      // gnarled branches
      deco.fillRect(tx-20, ty+8,  18, 3);
      deco.fillRect(tx+2,  ty+16, 16, 3);
      deco.fillRect(tx-14, ty+22, 12, 3);
      deco.fillRect(tx-3,  ty-18, 3, 16);    // top spike
      deco.fillRect(tx-10, ty-10, 3, 10);
      deco.fillRect(tx+4,  ty-12, 3, 12);
    }
    // Gravestones
    const graves = [[60,400],[200,320],[660,380],[550,290]];
    for (const [gx,gy] of graves) {
      if (PATH_CELLS.has(`${Math.floor(gx/CELL)},${Math.floor(gy/CELL)}`)) continue;
      deco.fillStyle(0x445544, 1);
      deco.fillRect(gx-7, gy-18, 14, 18);
      deco.fillTriangle(gx-7, gy-18, gx+7, gy-18, gx, gy-26); // arch top
    }
    // Fog wisps (semi-transparent light strips near ground)
    deco.fillStyle(0x334433, 0.18);
    deco.fillRect(0, 470, 800, 18);
    deco.fillRect(0, 488, 600, 12);

  } else if (factionKey === 'dark') {
    // Lighter forest + volcano background
    // Sky: deep twilight purple-green
    deco.fillStyle(0x1a2a10, 1);
    deco.fillRect(0, 0, 800, 55);
    // Volcano silhouette on the right
    deco.fillStyle(0x2a1a10, 1);
    deco.fillTriangle(680, 530, 800, 530, 760, 90);
    deco.fillTriangle(640, 530, 800, 530, 740, 80);
    deco.fillStyle(0xff4400, 0.7); // lava glow at crater
    deco.fillCircle(755, 95, 18);
    deco.fillStyle(0xff7700, 0.5);
    deco.fillCircle(755, 92, 10);
    // Lava trickles
    deco.fillStyle(0xff5500, 0.55);
    deco.fillRect(750, 100, 5, 40);
    deco.fillRect(762, 108, 4, 30);
    deco.fillStyle(0xff8800, 0.35);
    deco.fillRect(748, 138, 4, 25);
    // Living trees (lighter, greener)
    const liveTrees = [[40,100],[150,90],[270,110],[420,95],[540,105],[80,460],[300,475],[490,460]];
    for (const [tx,ty] of liveTrees) {
      if (PATH_CELLS.has(`${Math.floor(tx/CELL)},${Math.floor(ty/CELL)}`)) continue;
      deco.fillStyle(0x2a1a08, 1);
      deco.fillRect(tx-4, ty+10, 8, 50);
      deco.fillStyle(0x2a5c14, 1);
      deco.fillTriangle(tx, ty-20, tx-22, ty+14, tx+22, ty+14);
      deco.fillStyle(0x347a1c, 1);
      deco.fillTriangle(tx, ty-32, tx-16, ty, tx+16, ty);
      deco.fillStyle(0x3d8f22, 1);
      deco.fillTriangle(tx, ty-42, tx-10, ty-14, tx+10, ty-14);
    }
    // Magic rune circles on ground
    const runes = [[100,380],[350,320],[520,410]];
    for (const [rx,ry] of runes) {
      if (PATH_CELLS.has(`${Math.floor(rx/CELL)},${Math.floor(ry/CELL)}`)) continue;
      deco.lineStyle(1, 0x9933cc, 0.4);
      deco.strokeCircle(rx, ry, 18);
      deco.strokeCircle(rx, ry, 12);
      deco.lineStyle(1, 0xcc44ff, 0.3);
      for (let a = 0; a < 6; a++) {
        const ang = (a/6)*Math.PI*2;
        deco.moveTo(rx, ry);
        deco.lineTo(rx + Math.cos(ang)*18, ry + Math.sin(ang)*18);
      }
      deco.strokePath();
    }
  }

  // ── Grid lines ──
  const grid = scene.add.graphics().setDepth(2);
  mapGraphicsGroup.push(grid);
  grid.lineStyle(1, theme.gridColor, theme.gridAlpha);
  for (let x = 0; x <= 800; x += CELL) { grid.moveTo(x,36); grid.lineTo(x,530); }
  for (let y = 36; y <= 530; y += CELL) { grid.moveTo(0,y); grid.lineTo(800,y); }
  grid.strokePath();

  // ── Path ──
  const pg = scene.add.graphics().setDepth(3);
  mapGraphicsGroup.push(pg);
  pg.lineStyle(36, theme.pathFill, 0.75);
  pg.beginPath();
  pg.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
  PATH_WAYPOINTS.slice(1).forEach(p => pg.lineTo(p.x, p.y));
  pg.strokePath();
  pg.lineStyle(2, theme.pathEdge, 0.9);
  pg.beginPath();
  pg.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
  PATH_WAYPOINTS.slice(1).forEach(p => pg.lineTo(p.x, p.y));
  pg.strokePath();

  // ── Start/End markers ──
  const mS = scene.add.circle(20, PATH_WAYPOINTS[0].y, 12, 0x00cc44).setDepth(4);
  const mSt = scene.add.text(20, PATH_WAYPOINTS[0].y, 'S', { fontSize: '10px', color: '#fff' }).setOrigin(0.5).setDepth(4);
  mapGraphicsGroup.push(mS, mSt);

  // Draw the castle at the path end
  currentFaction = factionKey;
  drawCastle(scene, factionKey);
}

function drawPath() {} // no-op — path is now drawn inside drawMap

function update(time, delta) {
  // ── Interest ──
  if (waveActive) {
    interestTimer += delta;
    if (interestTimer >= INTEREST_INTERVAL) {
      interestTimer = 0;
      const effectiveRate = INTEREST_RATE + getTotalMineBonus();
      const earned = Math.floor(gold * effectiveRate);
      if (earned > 0) {
        gold += earned;
        goldText.setText('💰 Gold: ' + gold);
        const pct = Math.round(effectiveRate * 100);
        interestText.setText('+' + earned + ' interest (' + pct + '%)');
        SFX.play('interest');
        this.time.delayedCall(2000, () => interestText.setText(''));
      }
    }
  }

  if (!waveActive) return;

  // ── Spawn ──
  if (spawnCount < waveRoster.length) {
    spawnTimer += delta;
    if (spawnTimer >= 1600) {
      spawnTimer = 0;
      enemies.push(new Enemy(this, waveRoster[spawnCount], wave));
      spawnCount++;
    }
  }

  // ── Update enemies ──
  for (let i = enemies.length-1; i >= 0; i--) {
    const e = enemies[i];
    e.update(delta);
    if (e.reached) {
      const dmg = castleEnemyDamage(ENEMY_TYPES[e.type].size);
      castleHP = Math.max(0, castleHP - dmg);
      lives = castleHP;
      enemies.splice(i, 1);
      drawCastle(this, currentFaction);
      screenShake(this, dmg >= 4 ? 14 : 6, dmg >= 4 ? 600 : 300);
      SFX.play(dmg >= 4 ? 'boss_breach' : 'enemy_die');
      if (castleHP <= 0) {
        waveActive = false;
        SFX.play('game_over');
        showGameOver(this);
      }
    } else if (!e.alive) {
      const def = ENEMY_TYPES[e.type];
      spawnExplosion(this, e.x, e.y, def.color, def.size >= 36 ? 20 : 10);
      SFX.play(def.size >= 44 ? 'boss_die' : def.size >= 30 ? 'enemy_die_big' : 'enemy_die');
      gold += e.reward;
      goldText.setText('💰 Gold: ' + gold);
      enemies.splice(i, 1);
    }
  }

  // ── Update particles ──
  updateParticles(delta);

  // ── Update towers ──
  for (const t of towers) t.update(delta, enemies);

  // ── Update projectiles ──
  for (let i = projectiles.length-1; i >= 0; i--) {
    projectiles[i].update(delta);
    if (projectiles[i].done) projectiles.splice(i, 1);
  }

  // ── Wave complete ──
  if (spawnCount >= waveRoster.length && enemies.length === 0 && waveActive) {
    waveActive = false;
    const prevWave = wave;
    wave++; waveSize += 3;
    waveText.setText('Wave: ' + wave);
    refreshShop();

    // Detect faction change
    const prevFaction = getFactionForWave(prevWave);
    const nextFaction = getFactionForWave(wave);
    if (nextFaction !== prevFaction) {
      castleLevel = 0;
      castleMaxHP = CASTLE_LEVELS[0].maxHP;
      castleHP = castleMaxHP;
      lives = castleHP;
      drawMap(scene_ref, nextFaction);
    }
    const factionMsg = nextFaction !== prevFaction
      ? `⚔️ NEW THREAT: ${FACTIONS[nextFaction].name}!`
      : '';

    // Announce newly unlocked towers
    const justUnlocked = Object.entries(TOWER_TYPES).filter(([,d]) => d.unlockWave === prevWave);
    const unlockMsg = justUnlocked.length ? ' 🔓 ' + justUnlocked.map(([,d]) => d.label).join(' & ') + ' unlocked!' : '';

    const msg = factionMsg || ('Wave Complete!' + unlockMsg + ' Interest keeps earning — save up!');
    statusText.setText(msg);
    SFX.play('wave_complete');
    if (justUnlocked.length) SFX.play('unlock');
    this._waveBtn.setFillStyle(0xffd700).setInteractive();
    this._waveBtnText.setText('Start Wave');
    this._waveBtn.on('pointerover', () => this._waveBtn.setFillStyle(0xffec6e));
    this._waveBtn.on('pointerout',  () => this._waveBtn.setFillStyle(0xffd700));
    this._waveBtn.on('pointerdown', () => startWaveWithCountdown(this));
  }
}

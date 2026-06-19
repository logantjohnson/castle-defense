// ── Constants ─────────────────────────────────────────────────
const CELL = 40; // grid cell size in pixels
const HUD_H = 36;

// Three distinct path layouts — one per faction map
const MAP_PATHS = {
  barbarian: [
    { x: 0,   y: 280 },
    { x: 200, y: 280 },
    { x: 200, y: 440 },
    { x: 440, y: 440 },
    { x: 440, y: 160 },
    { x: 640, y: 160 },
    { x: 640, y: 440 },
    { x: 800, y: 440 },
  ],
  undead: [
    { x: 0,   y: 160 },
    { x: 280, y: 160 },
    { x: 280, y: 400 },
    { x: 80,  y: 400 },
    { x: 80,  y: 480 },
    { x: 520, y: 480 },
    { x: 520, y: 240 },
    { x: 720, y: 240 },
    { x: 720, y: 480 },
    { x: 800, y: 480 },
  ],
  dark: [
    { x: 0,   y: 100 },
    { x: 160, y: 100 },
    { x: 160, y: 360 },
    { x: 400, y: 360 },
    { x: 400, y: 120 },
    { x: 600, y: 120 },
    { x: 600, y: 400 },
    { x: 320, y: 400 },
    { x: 320, y: 480 },
    { x: 680, y: 480 },
    { x: 680, y: 260 },
    { x: 800, y: 260 },
  ],
};
let currentPath = MAP_PATHS.barbarian;

// Cells occupied by the path (blocked from tower placement)
let PATH_CELLS = new Set();
function buildPathCells(path) {
  PATH_CELLS.clear();
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
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
}
buildPathCells(currentPath);

// ── Tower definitions ─────────────────────────────────────────
// unlockWave: 0 = available from start, N = available from local wave N of every land
// upgrades: [lvl0→1 cost, lvl1→2 cost, lvl2→3 cost]
const TOWER_TYPES = {
  arrow:  { label: 'Arrow',     cost: 50,  color: 0x4488ff, range: 120, damage: 20,  fireRate: 1000, projColor: 0x88bbff, projSpeed: 300,  dmgColor: '#aaccff', sfxFire: 'arrow',     sfxHit: 'arrow',     unlockWave: 0,  icon: '🏹', desc: 'Fast & cheap',           upgrades: [40,  75,  130] },
  pitch:  { label: 'Pitch',     cost: 75,  color: 0x442200, range: 100, damage: 8,   fireRate: 1500, projColor: 0x221100, projSpeed: 200,  dmgColor: '#886633', sfxFire: 'cannon',    sfxHit: 'cannon',    unlockWave: 0,  icon: '🏺', desc: 'Slows enemies',          upgrades: [45,  85,  150], slowPct: 0.20, slowPctPerLevel: 0.05 },
  cannon: { label: 'Cannon',    cost: 100, color: 0xff8800, range: 100, damage: 60,  fireRate: 2000, projColor: 0xff4400, projSpeed: 220,  dmgColor: '#ff8844', sfxFire: 'cannon',    sfxHit: 'cannon',    unlockWave: 0,  icon: '💣', desc: 'Slow, hard hit',         upgrades: [55,  100, 175] },
  sniper: { label: 'Trebuchet', cost: 150, color: 0xaa44ff, range: 220, damage: 45,  fireRate: 2500, projColor: 0xdd88ff, projSpeed: 500,  dmgColor: '#dd88ff', sfxFire: 'trebuchet', sfxHit: 'trebuchet', unlockWave: 0, icon: '🪨', desc: 'Long range',             upgrades: [65,  120, 210] },
  tesla:  { label: 'Titan',     cost: 300, color: 0x88aacc, range: 150, damage: 160, fireRate: 1600, projColor: 0xeeeeff, projSpeed: 999,  dmgColor: '#aaddff', sfxFire: 'tesla',     sfxHit: 'tesla',     unlockWave: 7,  icon: '🗿', desc: 'Lightning bolts',        upgrades: [100, 175, 300] },
  flame:  { label: 'Dragon',    cost: 450, color: 0x44bb44, range: 80,  damage: 250, fireRate: 550,  projColor: 0xff6600, projSpeed: 180,  dmgColor: '#ff4400', sfxFire: 'flame',     sfxHit: 'flame',     unlockWave: 13, icon: '🐉', desc: 'Fire breath, close range', upgrades: [120, 210, 360] },
};

// ── Enemy factions & types ────────────────────────────────────
const FACTIONS = {
  barbarian: { name: 'Desert Oasis',    color: '#cc3300', waves: [1,20],  difficulty: 1.00 },
  undead:    { name: 'Mystical Forest', color: '#44aaaa', waves: [21,40], difficulty: 1.10 },
  dark:      { name: 'Volcanic Peaks',  color: '#9933cc', waves: [41,60], difficulty: 1.20 },
};

// ── Difficulty modes ──────────────────────────────────────────
// hpMult/countMult/rewardMult scale enemy strength, numbers, and payout.
// gold = starting gold per land. These are first-pass values; tuned in the balance pass.
const DIFFICULTY_MODES = {
  easy:   { name: 'Easy',   color: '#55cc55', hpMult: 0.75, countBase: 8,  countScale: 2.0, rewardMult: 1.15, gold: 250, blurb: 'A relaxed defense' },
  normal: { name: 'Normal', color: '#ffd700', hpMult: 1.00, countBase: 6,  countScale: 1.8, rewardMult: 1.00, gold: 175, blurb: 'The intended challenge' },
  heroic: { name: 'Heroic', color: '#ff3333', hpMult: 1.30, countBase: 4,  countScale: 1.5, rewardMult: 0.90, gold: 150, blurb: 'Spend wisely — every wave counts' },
};
let currentDifficulty = 'normal';
let infinityMode = false;
function diffMode() { return DIFFICULTY_MODES[currentDifficulty]; }

// shape: 'square' | 'circle' | 'diamond' | 'triangle'
// bossOnly: true means only spawned as the wave boss, never in normal pool
// wave = the GLOBAL wave an enemy first appears. Non-boss units unlock across local
// waves 1/3/6/9/13; mini boss at local 10, big boss at local 20 (per 20-wave land).
const ENEMY_TYPES = {
  // ── Barbarian Faction (waves 1-20) ─────────────────────────
  goblin:         { label:'Goblin',         faction:'barbarian', color:0x44aa22, size:18, speedMult:1.6, hpMult:0.5,  reward:10,  lives:1, wave:1,  shape:'square'                    },
  wolf:           { label:'Wolf',           faction:'barbarian', color:0x997755, size:20, speedMult:2.0, hpMult:0.7,  reward:22,  lives:1, wave:1,  shape:'circle'                    },
  orc:            { label:'Orc',            faction:'barbarian', color:0x886600, size:24, speedMult:1.0, hpMult:1.0,  reward:18,  lives:1, wave:3,  shape:'square'                    },
  ogre:           { label:'Ogre',           faction:'barbarian', color:0xcc6600, size:32, speedMult:0.7, hpMult:3.0,  reward:40,  lives:2, wave:6,  shape:'square'                    },
  troll:          { label:'Troll',          faction:'barbarian', color:0x336633, size:30, speedMult:0.8, hpMult:4.0,  reward:50,  lives:2, wave:9,  shape:'circle'                    },
  cyclops:        { label:'CYCLOPS',        faction:'barbarian', color:0xaa2200, size:44, speedMult:0.5, hpMult:9.0,  reward:120, lives:4, wave:13, shape:'diamond'                   },
  iron_golem:     { label:'IRON GOLEM',     faction:'barbarian', color:0x7a7a82, size:42, speedMult:0.42,hpMult:11.0, reward:130, lives:4, wave:13, shape:'square',  noPrefix:true    },
  warchief:       { label:'ORC WARCHIEF',   faction:'barbarian', color:0xcc1100, size:40, speedMult:0.5, hpMult:8.0,  reward:80,  lives:4, wave:10, shape:'diamond', bossOnly:true    },
  barbarian_king: { label:'BARBARIAN KING', faction:'barbarian', color:0xff2200, size:52, speedMult:0.38,hpMult:20.0, reward:200, lives:6, wave:20, shape:'diamond', bossOnly:true    },

  // ── Undead Faction (waves 21-40) ───────────────────────────
  skeleton:   { label:'Skeleton',    faction:'undead', color:0xddddcc, size:18, speedMult:1.2, hpMult:0.6,  reward:15,  lives:1, wave:21, shape:'square'                   },
  zombie:     { label:'Zombie',      faction:'undead', color:0x558855, size:24, speedMult:0.7, hpMult:0.85, reward:25,  lives:1, wave:21, shape:'square'                   },
  wight:      { label:'Wight',       faction:'undead', color:0x8899bb, size:22, speedMult:1.3, hpMult:1.7,  reward:30,  lives:1, wave:23, shape:'circle'                   },
  vampire:    { label:'Vampire',     faction:'undead', color:0x880022, size:24, speedMult:1.7, hpMult:2.4,  reward:38,  lives:1, wave:26, shape:'diamond'                  },
  lich:       { label:'Lich',        faction:'undead', color:0x553388, size:28, speedMult:0.9, hpMult:5.5,  reward:70,  lives:2, wave:29, shape:'square'                   },
  bonedragon: { label:'BONE DRAGON', faction:'undead', color:0xeeeedd, size:46, speedMult:0.6, hpMult:13.0, reward:160, lives:5, wave:33, shape:'diamond'                  },
  bone_colossus:{label:'BONE COLOSSUS',faction:'undead',color:0xddddc8, size:44, speedMult:0.42,hpMult:14.0, reward:150, lives:4, wave:33, shape:'square', noPrefix:true     },
  lich_lord:  { label:'LICH LORD',   faction:'undead', color:0x4400aa, size:40, speedMult:0.5, hpMult:9.0,  reward:80,  lives:4, wave:30, shape:'diamond', bossOnly:true   },
  death_lord: { label:'DEATH LORD',  faction:'undead', color:0x0011aa, size:52, speedMult:0.38,hpMult:23.0, reward:200, lives:6, wave:40, shape:'diamond', bossOnly:true   },

  // ── Dark Magic Faction (waves 41-60) ───────────────────────
  centaur:      { label:'Centaur',      faction:'dark', color:0xbb6622, size:20, speedMult:1.8, hpMult:0.9,  reward:20,  lives:1, wave:41, shape:'square'                 },
  gargoyle:     { label:'Gargoyle',     faction:'dark', color:0x777788, size:22, speedMult:1.5, hpMult:1.1,  reward:25,  lives:1, wave:41, shape:'diamond'                },
  griffin:      { label:'Griffin',      faction:'dark', color:0xddaa00, size:26, speedMult:1.4, hpMult:2.3,  reward:35,  lives:1, wave:43, shape:'circle'                 },
  minotaur:     { label:'Minotaur',     faction:'dark', color:0x553300, size:32, speedMult:0.9, hpMult:5.2,  reward:55,  lives:2, wave:46, shape:'square'                 },
  hydra:        { label:'Hydra',        faction:'dark', color:0x224422, size:36, speedMult:0.7, hpMult:8.5,  reward:90,  lives:3, wave:49, shape:'circle'                 },
  blackdragon:  { label:'BLACK DRAGON', faction:'dark', color:0x110011, size:50, speedMult:0.65,hpMult:20.0, reward:250, lives:6, wave:53, shape:'diamond'                },
  magma_titan:  { label:'MAGMA TITAN',  faction:'dark', color:0x3a2020, size:46, speedMult:0.4, hpMult:20.0, reward:180, lives:5, wave:53, shape:'square',  noPrefix:true },
  shadow_demon: { label:'SHADOW DEMON', faction:'dark', color:0x440033, size:40, speedMult:0.5, hpMult:10.0, reward:80,  lives:4, wave:50, shape:'diamond', bossOnly:true },
  demon_lord:   { label:'DEMON LORD',   faction:'dark', color:0x880000, size:52, speedMult:0.38,hpMult:27.0, reward:200, lives:6, wave:60, shape:'diamond', bossOnly:true },
};

const BASE_SPEED = 80;
const BASE_HP    = 90;

function getFactionForWave(w) {
  for (const [key, f] of Object.entries(FACTIONS))
    if (w >= f.waves[0] && w <= f.waves[1]) return key;
  return infinityMode ? restartFaction : 'dark'; // infinity: stay on chosen land
}
function localWave(w) {
  w = w ?? wave;
  return w - FACTIONS[getFactionForWave(w)].waves[0] + 1;
}

// ── Elite (second-half) enemies: after the mini-boss falls (local wave 10),
// the land's lord sends tougher, armored reinforcements for waves 11-20.
const ELITE_PREFIX = { barbarian: 'Iron', undead: 'Cursed', dark: 'Infernal' };
function isEliteWave(w) { return localWave(w) >= 11; }
// Extra HP multiplier for elites: ~+35% at wave 11 ramping to ~+98% at wave 20.
function eliteHpFactor(w) { const lw = localWave(w); return lw >= 11 ? 1.35 + (lw - 11) * 0.07 : 1; }

function buildWaveRoster(wave) {
  const faction = getFactionForWave(wave);
  // Exclude bossOnly enemies — those are appended separately
  const pool = Object.entries(ENEMY_TYPES)
    .filter(([,d]) => d.faction === faction && d.wave <= wave && !d.bossOnly);

  const roster = [];
  // Scale enemy count by local wave number so wave 21 feels like wave 1 of its map
  const factionStart = FACTIONS[faction].waves[0];
  const localWave = wave - factionStart + 1;
  const d = diffMode();
  const total = Math.max(3, Math.round(d.countBase + localWave * d.countScale));

  // Fill: weight toward harder units as wave progresses
  for (let i = 0; i < total; i++) {
    const weights = pool.map((_, idx) => idx + 1);
    const sum = weights.reduce((a,b) => a+b, 0);
    let r = Math.random() * sum;
    let chosen = pool[0][0];
    for (let j = 0; j < weights.length; j++) { r -= weights[j]; if (r <= 0) { chosen = pool[j][0]; break; } }
    roster.push(chosen);
  }
  // Shuffle so enemies are mixed
  for (let i = roster.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [roster[i], roster[j]] = [roster[j], roster[i]];
  }
  // Append boss as the final enemy on boss waves (local wave 10 = mini boss, local wave 20 = final boss)
  const boss = Object.entries(ENEMY_TYPES).find(([,d]) => d.bossOnly && d.wave === wave);
  if (boss) roster.push(boss[0]);
  return roster;
}

// Armored "iron" overlay drawn on top of elite (second-half) enemies
function drawIronArmor(g, size) {
  const r = size * 0.55;
  g.fillStyle(0x9aa4b4, 0.28); g.fillCircle(0, 0, r);          // steel sheen
  g.lineStyle(2.5, 0xdce4f0, 0.95); g.strokeCircle(0, 0, r);   // bright armor ring
  g.fillStyle(0xeef4fc, 0.95);                                  // rivets
  for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; g.fillCircle(Math.cos(ang) * r, Math.sin(ang) * r, 1.6); }
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

    // ── ELITE APEX UNITS (wave 13) ─────────────────────────────
    case 'iron_golem':
      g.fillStyle(0x55555c); g.fillRect(-19,-9,6,22); g.fillRect(13,-9,6,22);  // arms
      g.fillStyle(c);        g.fillRect(-15,-17,30,32);     // body block
      g.fillStyle(0x8a8a94); g.fillRect(-15,-17,30,7);      // shoulder highlight
      g.fillStyle(0x44444a); g.fillRect(-15,11,30,4);       // belt
      g.fillStyle(0xff7a1a); g.fillRect(-9,-9,6,5); g.fillRect(3,-9,6,5);  // glowing eyes
      g.fillStyle(0x2a2a30); g.fillRect(-8,1,16,3);         // mouth grate
      g.fillStyle(0x55555c); g.fillRect(-12,15,9,6); g.fillRect(3,15,9,6);  // feet
      break;

    case 'bone_colossus':
      g.fillStyle(c);        g.fillRect(-18,-8,7,20); g.fillRect(11,-8,7,20); // arms
      g.fillStyle(c);        g.fillRect(-15,-10,30,24);     // ribcage block
      g.fillStyle(0x2a2820); g.fillRect(-12,-6,24,2); g.fillRect(-12,-1,24,2); g.fillRect(-12,4,24,2); g.fillRect(-12,9,24,2); // rib gaps
      g.fillStyle(c);        g.fillRect(-2,-10,4,24);       // spine
      g.fillStyle(c);        g.fillCircle(0,-18,10);        // skull
      g.fillStyle(0x000000); g.fillCircle(-4,-19,3); g.fillCircle(4,-19,3); // sockets
      g.fillStyle(0x66ff88); g.fillCircle(-4,-19,1.3); g.fillCircle(4,-19,1.3); // glow
      g.fillStyle(0x000000); g.fillRect(-2,-13,4,3);        // nasal
      break;

    case 'magma_titan':
      g.fillStyle(0x241414); g.fillRect(-20,-10,6,22); g.fillRect(14,-10,6,22); // arms
      g.fillStyle(c);        g.fillRect(-17,-17,34,33);     // rock body
      g.fillStyle(0xff4400); g.fillRect(-11,-13,3,26); g.fillRect(5,-9,3,22); g.fillRect(-2,-15,2,30); // lava cracks
      g.fillStyle(0xff8800); g.fillRect(-9,-3,5,5); g.fillRect(5,-3,5,5);  // glowing eyes
      g.fillStyle(0xffaa00); g.fillRect(-17,9,34,4);        // molten underbelly
      g.fillStyle(0x241414); g.fillRect(-13,16,9,6); g.fillRect(4,16,9,6);  // feet
      break;

    // ── MINI BOSSES ────────────────────────────────────────────
    case 'warchief':
      g.fillStyle(0x885500); g.fillRect(-20,-28,40,20);     // iron helmet
      g.fillStyle(0x664400); g.fillRect(-22,-20,44,6);      // helmet brim
      g.fillStyle(0x885500); // ram horns
      g.fillTriangle(-22,-22,-34,-38,-12,-18);
      g.fillTriangle(22,-22,34,-38,12,-18);
      g.fillStyle(c);        g.fillRect(-18,-14,36,30);     // face
      g.fillStyle(dc);       g.fillRect(-18,-14,36,10);     // brow ridge
      g.fillStyle(0xffaa00); g.fillRect(-10,-7,7,6); g.fillRect(4,-7,7,6); // eyes
      g.fillStyle(0x000000); g.fillRect(-9,-6,4,4); g.fillRect(5,-6,4,4);
      g.fillStyle(0xddbb88); g.fillRect(-6,8,3,10); g.fillRect(4,8,3,10);  // tusks
      g.fillStyle(dc);       g.fillRect(-18,16,36,3);       // chin
      break;

    case 'barbarian_king':
      g.fillStyle(0xffd700); // crown
      g.fillRect(-22,-44,44,12);
      g.fillTriangle(-18,-44,-14,-60,-10,-44);
      g.fillTriangle(-2,-44,0,-64,2,-44);
      g.fillTriangle(10,-44,14,-60,18,-44);
      g.fillStyle(0x880000); g.fillRect(-22,-32,44,54);     // armored body
      g.fillStyle(0x550000); g.fillRect(-22,-32,44,14);     // pauldrons
      g.fillStyle(0xffaa00); g.fillRect(-11,-22,8,7); g.fillRect(4,-22,8,7); // eyes
      g.fillStyle(0x000000); g.fillRect(-10,-21,5,5); g.fillRect(5,-21,5,5);
      g.fillStyle(0xff0000); g.fillRect(-8,-6,16,5);        // snarl
      g.fillStyle(0xddbb88); g.fillRect(-7,0,4,14); g.fillRect(4,0,4,14);   // tusks
      g.fillStyle(0x777777); g.fillRect(24,-36,7,54);       // axe haft
      g.fillStyle(0xcccccc); // axe blade
      g.fillTriangle(24,-36,44,-22,24,-10);
      g.fillTriangle(24,-36,42,-30,24,-20);
      break;

    case 'lich_lord':
      g.fillStyle(0x220033); g.fillRect(-16,-22,32,44);     // robe
      g.fillStyle(0xddddcc); g.fillCircle(0,-30,14);        // skull
      g.fillStyle(0x000000); g.fillCircle(-6,-32,5); g.fillCircle(6,-32,5); // sockets
      g.fillStyle(0x8800ff); g.fillCircle(-6,-32,3); g.fillCircle(6,-32,3); // glowing eyes
      g.fillStyle(0x880088); // skull crown
      g.fillRect(-14,-44,28,8);
      g.fillTriangle(-12,-44,-8,-56,-4,-44);
      g.fillTriangle(4,-44,8,-56,12,-44);
      g.fillStyle(0x664488); g.fillRect(20,-2,4,28);        // staff
      g.fillStyle(0xaa00ff); g.fillCircle(22,-6,7);         // orb
      g.fillStyle(0xff88ff); g.fillCircle(22,-6,3);         // orb core
      g.fillStyle(c); // bony hands
      g.fillRect(-22,4,6,8); g.fillRect(16,4,6,8);
      break;

    case 'death_lord':
      g.fillStyle(0x111133); g.fillRect(-24,-28,48,54);     // dark armor
      g.fillStyle(0x000022); g.fillRect(-24,-28,48,16);     // shoulder plates
      g.fillStyle(0x888899); g.fillCircle(0,-38,16);        // skull helm
      g.fillStyle(0x000000); g.fillCircle(-7,-40,6); g.fillCircle(7,-40,6);
      g.fillStyle(0x0044ff); g.fillCircle(-7,-40,3); g.fillCircle(7,-40,3); // blue eyes
      g.fillStyle(0x666677); // three horns
      g.fillTriangle(-14,-54,-18,-74,-6,-54);
      g.fillTriangle(-1,-54,0,-78,1,-54);
      g.fillTriangle(6,-54,18,-74,14,-54);
      g.fillStyle(0x000033); // dark cloak panels
      g.fillTriangle(-24,26,-38,60,-24,26);
      g.fillTriangle(24,26,38,60,24,26);
      g.fillStyle(0x888899); // skeletal fists
      g.fillRect(-36,-10,12,8); g.fillRect(24,-10,12,8);
      break;

    case 'shadow_demon':
      g.fillStyle(0x220011); g.fillCircle(0,0,22);          // shadow aura
      g.fillStyle(c);        g.fillRect(-14,-20,28,38);     // body
      g.fillStyle(0x660044); // curved horns
      g.fillTriangle(-10,-20,-18,-40,-2,-20);
      g.fillTriangle(10,-20,18,-40,2,-20);
      g.fillStyle(0xff00ff); g.fillCircle(-6,-10,5); g.fillCircle(6,-10,5); // eyes
      g.fillStyle(0xffffff); g.fillCircle(-6,-10,2); g.fillCircle(6,-10,2);
      g.fillStyle(0x330022); // large wings
      g.fillTriangle(-14,-8,-40,-28,-14,20);
      g.fillTriangle(-14,-8,-38,-6,-14,20);
      g.fillTriangle(14,-8,40,-28,14,20);
      g.fillTriangle(14,-8,38,-6,14,20);
      g.fillStyle(0x660044); // claws
      g.fillTriangle(-20,12,-30,4,-16,22);
      g.fillTriangle(20,12,30,4,16,22);
      break;

    case 'demon_lord':
      g.fillStyle(0x550000); g.fillRect(-26,-24,52,50);     // massive body
      g.fillStyle(0x440000); // enormous wings
      g.fillTriangle(-26,-12,-62,-52,-26,26);
      g.fillTriangle(-26,-12,-54,-6,-26,26);
      g.fillTriangle(26,-12,62,-52,26,26);
      g.fillTriangle(26,-12,54,-6,26,26);
      g.fillStyle(0x330000); // wing membranes
      g.fillTriangle(-26,-12,-58,-44,-26,12);
      g.fillTriangle(26,-12,58,-44,26,12);
      g.fillStyle(0xbb2200); g.fillRect(-18,-44,36,20);     // skull face
      g.fillStyle(0xff0000); g.fillCircle(-8,-36,8); g.fillCircle(8,-36,8); // eyes
      g.fillStyle(0xff4400); g.fillCircle(-8,-36,5); g.fillCircle(8,-36,5);
      g.fillStyle(0xffd700); g.fillCircle(-8,-36,2); g.fillCircle(8,-36,2); // gold pupils
      g.fillStyle(0xff2200); // crown of horns
      g.fillTriangle(-14,-44,-18,-64,-6,-44);
      g.fillTriangle(-2,-44,0,-68,2,-44);
      g.fillTriangle(6,-44,18,-64,14,-44);
      g.fillStyle(0x440000); // tail
      g.fillRect(-4,26,8,18); g.fillTriangle(-10,44,10,44,0,58);
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
    const landDiff = FACTIONS[getFactionForWave(wave)].difficulty;
    const mode = diffMode();
    // Elite reinforcements (waves 11-20) get an extra HP bump — bosses excluded
    const elite = isEliteWave(wave) && !def.bossOnly;
    this.elite = elite;
    const eliteMul = elite ? eliteHpFactor(wave) : 1;
    const hp = Math.floor(BASE_HP * def.hpMult * landDiff * mode.hpMult * eliteMul * (1 + localWave(wave) * 0.22));
    this.maxHp = hp; this.hp = hp;
    this.speed = BASE_SPEED * def.speedMult;
    this.slowMult = 1.0;
    this.slowTimer = 0;
    this.reward = Math.floor(def.reward * mode.rewardMult);
    this.liveDmg = def.lives;
    this.alive = true; this.reached = false;
    this.x = currentPath[0].x;
    this.y = currentPath[0].y;

    // Container holds all sprite graphics and moves as one unit
    const g = scene.add.graphics();
    drawEnemySprite(g, type);
    if (elite) drawIronArmor(g, def.size); // steel sheen + armor ring
    this.container = scene.add.container(this.x, this.y, [g]).setDepth(2);

    // Name label inside container for boss-sized units (elites get the faction prefix,
    // unless the unit already has its own themed name via noPrefix)
    if (def.size >= 36) {
      const name = (elite && !def.noPrefix) ? `${ELITE_PREFIX[def.faction].toUpperCase()} ${def.label}` : def.label;
      const lbl = scene.add.text(0, def.size * 0.25, name, {
        fontSize: '9px', fontFamily: 'Arial Black', color: elite ? '#cfe0ff' : '#ffffff', stroke: '#000', strokeThickness: 2
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

  applySlow(pct, duration) {
    this.slowMult = Math.min(this.slowMult, 1 - pct); // take the strongest slow
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  update(delta) {
    if (!this.alive || this.reached) return;
    if (this.slowTimer > 0) { this.slowTimer -= delta; if (this.slowTimer <= 0) { this.slowTimer = 0; this.slowMult = 1.0; } }
    const target = currentPath[this.waypointIndex];
    const dx = target.x - this.x, dy = target.y - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const step = this.speed * this.slowMult * (delta / 1000);
    if (dist <= step) {
      this.x = target.x; this.y = target.y;
      this.waypointIndex++;
      if (this.waypointIndex >= currentPath.length) { this.reached = true; this.destroy(); return; }
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
    this.container.setAlpha(this.slowTimer > 0 ? 0.65 : 1.0); // darken when tarred
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

function globalUpgradeTier() {
  if (!towers.length) return 0;
  let min = MAX_UPGRADE;
  for (const t of towers) min = Math.min(min, t.dmgLevel, t.rangeLevel, t.rateLevel);
  return min;
}

function totalUpgradesAllowed() {
  if (!towers.length) return MAX_UPGRADE * 3;
  return Math.min(...towers.map(t => t.dmgLevel + t.rangeLevel + t.rateLevel)) + 1;
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

  // Tear down all graphics (used when clearing the board). Phaser destroy() is idempotent.
  destroy() {
    if (this.base) this.base.destroy();
    if (this.customGfx) this.customGfx.destroy();
    if (this.barrel) this.barrel.destroy();
    if (this.rangeRing) this.rangeRing.destroy();
    if (this.iconText) this.iconText.destroy();
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

  _icon(t) { return TOWER_TYPES[t].icon; }

  get damage()   { return Math.floor(this.baseDef.damage   * (1 + this.dmgLevel   * 0.20)); } // each ★ = +20% dmg (was 40%)
  get range()    { return Math.floor(this.baseDef.range    * (1 + this.rangeLevel * 0.3)); }
  get fireRate() { return Math.floor(this.baseDef.fireRate * (1 - this.rateLevel  * 0.2)); }

  upgradeCost(level) { return this.baseDef.upgrades ? this.baseDef.upgrades[level] : (level + 1) * 75; }

  // Total gold sunk into this tower: base cost + every upgrade purchased
  investedValue() {
    let total = this.baseDef.cost;
    for (const lvl of [this.dmgLevel, this.rangeLevel, this.rateLevel]) {
      for (let l = 0; l < lvl; l++) total += this.upgradeCost(l);
    }
    return total;
  }

  // Cost to relocate: 50% of everything invested — cheap for basic towers, steep for upgraded ones
  moveCost() { return Math.floor(this.investedValue() * MOVE_COST_PCT); }

  upgrade(stat) {
    const key = stat + 'Level';
    const level = this[key];
    if (level >= MAX_UPGRADE) return false;
    // Per-tower tier gate: all three stats must be at level N before any can reach N+1
    const minLevel = Math.min(this.dmgLevel, this.rangeLevel, this.rateLevel);
    if (level >= minLevel + 1) return false;
    const cost = this.upgradeCost(level);
    if (gold < cost) return false;
    gold -= cost;
    goldText.setText('💰 Gold: ' + gold);
    this[key]++;
    this.rangeRing.setRadius(this.range);
    refreshAllDragons();
    return true;
  }

  setSelected(sel) {
    this.base.setStrokeStyle(2, sel ? 0xffd700 : 0xffffff, sel ? 1 : 0.7);
    this.rangeRing.setStrokeStyle(1, 0xffd700, sel ? 0.5 : 0.15);
    if (this.isDragon) this.redrawDragon(globalUpgradeTier());
    if (this.isTitan)  this.redrawTitan();
  }

  // Move all graphics to pixel position px, py
  moveTo(px, py) {
    this.x = px; this.y = py;
    this.base.setPosition(px, py);
    this.rangeRing.setPosition(px, py);
    this.iconText.setPosition(px, py);
    if (this.isDragon) this.redrawDragon(globalUpgradeTier());
    else if (this.isTitan) this.redrawTitan();
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
    refreshShop(); // re-enable the mine button if this was the mine
  }

  update(delta, enemies) {
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
    const slowPct = this.baseDef.slowPct ? this.baseDef.slowPct + this.dmgLevel * (this.baseDef.slowPctPerLevel || 0) : 0;
    projectiles.push(new Projectile(this.scene, this.x, this.y, target, {
      damage: this.damage,
      projColor: this.baseDef.projColor,
      projSpeed: this.baseDef.projSpeed,
      slowPct,
      slowDuration: 2000
    }));
  }
}

// ── Projectile ────────────────────────────────────────────────
class Projectile {
  constructor(scene, x, y, target, def) {
    this.scene  = scene;
    this.target = target;
    this.damage      = def.damage;
    this.speed       = def.projSpeed;
    this.slowPct     = def.slowPct     || 0;
    this.slowDuration= def.slowDuration|| 0;
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
      if (this.slowPct > 0 && this.target.alive) this.target.applySlow(this.slowPct, this.slowDuration);
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
      // startMove charges, hides this panel, and enters move mode.
      // If the player can't afford it, the panel stays and shows the error.
      startMove(this.tower);
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
    const preWave = !waveActive && localWave() === 1;
    const moveCost = t.moveCost();
    const moveLabel = inMove ? '✕ Cancel' : (preWave ? '✋ Free Move' : `✋ Move (${moveCost}g)`);
    this.moveBtn.setFillStyle(inMove ? 0x885500 : (!preWave && gold < moveCost ? 0x662222 : 0x224488));
    this.moveBtnTxt.setText(moveLabel);
    const sellPrice = Math.floor(t.baseDef.cost * 0.75);
    this.sellBtnTxt.setText(`💰 Sell ${sellPrice}g`);
    this.sellBtn.setFillStyle(0x882222);
    this.rows[0].lbl.setText(t.type === 'pitch' ? '🐢 Slow %' : '⚔️  Damage');
    this.rows[1].lbl.setText('📡 Range');
    this.rows[2].lbl.setText('⚡ Fire Rate');
    this.rows[1].btn.setVisible(true); this.rows[2].btn.setVisible(true);
    const stats = [
      { level: t.dmgLevel,   stat: 'dmg' },
      { level: t.rangeLevel, stat: 'range' },
      { level: t.rateLevel,  stat: 'rate' },
    ];
    const minLevel = Math.min(t.dmgLevel, t.rangeLevel, t.rateLevel);
    this.rows.forEach((row, i) => {
      const lvl  = stats[i].level;
      const tierLocked = lvl >= minLevel + 1;
      row.lvl.setText('★'.repeat(lvl) + '☆'.repeat(MAX_UPGRADE - lvl));
      if (lvl >= MAX_UPGRADE) {
        row.btn.setFillStyle(0x444444).removeInteractive();
        row.bTxt.setText('MAX').setColor('#888888');
      } else if (tierLocked) {
        row.btn.setFillStyle(0x885500).removeInteractive();
        row.bTxt.setText('TIER').setColor('#ffaa44');
      } else {
        const cost = t.upgradeCost(lvl);
        row.btn.setFillStyle(gold >= cost ? 0x226622 : 0x662222).setInteractive();
        row.bTxt.setText(cost + 'g').setColor(gold >= cost ? '#aaffaa' : '#ff8888');
      }
    });
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

// ── Title screen ──────────────────────────────────────────────
function drawTitleCastle(scene, cx, baseY) {
  const g = scene.add.graphics();
  const stone = 0x9a9aa6, stoneDark = 0x6f6f7d, stoneLt = 0xb8b8c4;
  const roof = 0x8a2030, roofDark = 0x5a1420;

  // Helper: a crenellated tower
  function tower(x, w, topY, withRoof) {
    g.fillStyle(stoneDark, 1); g.fillRect(x, topY, w, baseY - topY);
    g.fillStyle(stone, 1);     g.fillRect(x + 3, topY, w - 6, baseY - topY);
    g.fillStyle(stoneLt, 0.5); g.fillRect(x + 3, topY, 4, baseY - topY);
    // battlements
    g.fillStyle(stoneDark, 1);
    for (let bx = x; bx < x + w; bx += 12) g.fillRect(bx, topY - 8, 7, 8);
    if (withRoof) {
      g.fillStyle(roofDark, 1); g.fillTriangle(x - 6, topY - 6, x + w + 6, topY - 6, x + w/2, topY - 40);
      g.fillStyle(roof, 1);     g.fillTriangle(x - 2, topY - 6, x + w + 2, topY - 6, x + w/2, topY - 36);
    }
    // a couple of lit windows
    g.fillStyle(0xffcc44, 1);
    g.fillRect(x + w/2 - 4, topY + 18, 8, 12);
    g.fillStyle(0x1a1208, 1);
    g.fillRect(x + w/2 - 4, topY + 18, 8, 4);
  }

  // Back curtain wall
  g.fillStyle(stoneDark, 1); g.fillRect(cx - 110, baseY - 90, 220, 90);
  g.fillStyle(stone, 1);     g.fillRect(cx - 107, baseY - 88, 214, 88);
  g.fillStyle(stoneDark, 1);
  for (let bx = cx - 110; bx < cx + 110; bx += 16) g.fillRect(bx, baseY - 98, 9, 10);

  // Side towers + central keep
  tower(cx - 120, 38, baseY - 130, true);
  tower(cx + 82,  38, baseY - 130, true);
  tower(cx - 32,  64, baseY - 200, true); // tall central keep

  // Gate
  g.fillStyle(stoneDark, 1); g.fillRect(cx - 26, baseY - 56, 52, 56);
  g.fillStyle(0x140a06, 1);  g.fillRect(cx - 20, baseY - 50, 40, 50);
  g.fillStyle(0x140a06, 1);  g.fillCircle(cx, baseY - 50, 20);
  // portcullis bars
  g.lineStyle(2, 0x3a2a1a, 1);
  for (let bx = cx - 16; bx <= cx + 16; bx += 8) { g.beginPath(); g.moveTo(bx, baseY - 50); g.lineTo(bx, baseY - 6); g.strokePath(); }

  // Princess in the central keep window (the one we protect)
  const py = baseY - 176;
  g.fillStyle(0xffcc44, 1); g.fillRect(cx - 9, py, 18, 24);     // warm lit window
  g.fillStyle(0x140a06, 1); g.fillRect(cx - 9, py, 18, 5);
  g.fillStyle(0xe8a0c0, 1); g.fillCircle(cx, py + 12, 5);        // head/hair
  g.fillStyle(0xffe0ee, 1); g.fillCircle(cx, py + 14, 3.4);      // face
  g.fillStyle(0xffd700, 1); g.fillTriangle(cx - 4, py + 8, cx + 4, py + 8, cx, py + 3); // tiny crown

  // Banners on the keep
  g.fillStyle(0x2244aa, 1); g.fillRect(cx - 30, baseY - 196, 5, 26); g.fillTriangle(cx - 30, baseY - 170, cx - 25, baseY - 170, cx - 27, baseY - 162);
  g.fillStyle(0x2244aa, 1); g.fillRect(cx + 25, baseY - 196, 5, 26); g.fillTriangle(cx + 25, baseY - 170, cx + 30, baseY - 170, cx + 27, baseY - 162);
  return g;
}

function drawTitleKnight(scene, x, y) {
  const g = scene.add.graphics();
  const steel = 0xc4c8d4, steelDark = 0x8a8e9c, steelLt = 0xe4e8f0;
  // cape
  g.fillStyle(0x8a1828, 1); g.fillTriangle(x - 4, y - 36, x + 16, y - 30, x + 12, y + 24);
  // legs
  g.fillStyle(steelDark, 1); g.fillRect(x - 10, y + 6, 8, 22); g.fillRect(x + 2, y + 6, 8, 22);
  g.fillStyle(0x3a3a44, 1);  g.fillRect(x - 11, y + 26, 11, 6); g.fillRect(x + 1, y + 26, 11, 6); // boots
  // torso (breastplate)
  g.fillStyle(steel, 1);     g.fillRoundedRect(x - 13, y - 22, 26, 32, 5);
  g.fillStyle(steelLt, 0.6); g.fillRect(x - 10, y - 20, 5, 28);
  g.lineStyle(2, steelDark, 1); g.strokeRoundedRect(x - 13, y - 22, 26, 32, 5);
  // shield (left arm)
  g.fillStyle(0x2244aa, 1);  g.fillRoundedRect(x - 30, y - 18, 20, 28, 4);
  g.fillStyle(0xffd700, 1);  g.fillRect(x - 22, y - 14, 4, 20); g.fillRect(x - 27, y - 6, 14, 4); // cross
  g.lineStyle(2, 0xe4e8f0, 1); g.strokeRoundedRect(x - 30, y - 18, 20, 28, 4);
  // sword (right arm, raised)
  g.fillStyle(steelLt, 1);   g.fillRect(x + 18, y - 64, 5, 48);   // blade
  g.fillStyle(0xffd700, 1);  g.fillRect(x + 12, y - 18, 17, 5);   // crossguard
  g.fillStyle(0x6a4a2a, 1);  g.fillRect(x + 18, y - 14, 5, 10);   // grip
  // head + helmet
  g.fillStyle(0xe0b89a, 1);  g.fillCircle(x, y - 30, 7);          // face
  g.fillStyle(steel, 1);     g.fillRoundedRect(x - 8, y - 40, 16, 14, 4); // helm
  g.fillStyle(0x140a06, 1);  g.fillRect(x - 6, y - 32, 12, 3);    // visor slit
  g.fillStyle(0xcc2244, 1);  g.fillTriangle(x - 2, y - 44, x + 2, y - 44, x + 10, y - 56); // plume
  return g;
}

function drawTitleCrossbowTower(scene, x, y) {
  const g = scene.add.graphics();
  const stone = 0x8a8a96, stoneDark = 0x5f5f6d, stoneLt = 0xb2b4bf;
  // shadow
  g.fillStyle(0x000000, 0.18); g.fillEllipse(x, y + 4, 68, 12);
  // tower body
  g.fillStyle(stoneDark, 1); g.fillRect(x - 28, y - 108, 56, 112);
  g.fillStyle(stone, 1);     g.fillRect(x - 25, y - 106, 50, 110);
  g.fillStyle(stoneLt, 0.35); g.fillRect(x - 21, y - 104, 11, 106);
  // stone block texture
  g.fillStyle(stoneDark, 0.35);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++)
    g.fillRect(x - 22 + col * 26, y - 96 + row * 26, 23, 24);
  // battlements
  for (let bx = x - 28; bx < x + 24; bx += 14) {
    g.fillStyle(stoneDark, 1); g.fillRect(bx, y - 122, 10, 16);
    g.fillStyle(stone, 1);     g.fillRect(bx + 2, y - 120, 6, 14);
  }
  // platform ledge
  g.fillStyle(stoneDark, 1); g.fillRect(x - 33, y - 110, 66, 7);
  g.fillStyle(stone, 1);     g.fillRect(x - 31, y - 109, 62, 5);
  // arrow slit window
  g.fillStyle(0x1a1018, 1); g.fillRect(x - 5, y - 72, 10, 22);
  g.fillStyle(0xffcc44, 0.2); g.fillRect(x - 3, y - 70, 6, 18);
  // ballista frame (wooden legs)
  g.fillStyle(0x6a3a10, 1); g.fillRect(x - 22, y - 144, 7, 26); g.fillRect(x + 15, y - 144, 7, 26);
  g.fillStyle(0x7a4a18, 1); g.fillRect(x - 20, y - 148, 40, 8);
  // bow arm (wide crossbow)
  g.fillStyle(0x6a3a10, 1); g.fillRect(x - 34, y - 160, 68, 10);
  g.fillStyle(0x8a5a28, 1); g.fillRect(x - 32, y - 158, 64, 6);
  // bow tips (curved)
  g.fillStyle(0x4a2808, 1);
  g.fillTriangle(x - 34, y - 158, x - 42, y - 146, x - 27, y - 150);
  g.fillTriangle(x + 34, y - 158, x + 42, y - 146, x + 27, y - 150);
  // bowstring
  g.lineStyle(2, 0xddc090, 0.9);
  g.beginPath(); g.moveTo(x - 40, y - 150); g.lineTo(x, y - 168); g.lineTo(x + 40, y - 150); g.strokePath();
  // loaded bolt
  g.fillStyle(0xb0a060, 1); g.fillRect(x - 30, y - 157, 60, 4);
  g.fillStyle(0x8899aa, 1); g.fillTriangle(x + 30, y - 159, x + 30, y - 153, x + 40, y - 156);
  return g;
}

function drawTitleTitan(scene, x, y) {
  const g = scene.add.graphics();
  const stone = 0x8095aa, stoneDark = 0x506070, stoneLt = 0xb0c5d8;
  const glow = 0x88ccff;
  // shadow
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 3, 75, 14);
  // boots
  g.fillStyle(stoneDark, 1); g.fillRect(x - 28, y - 6, 24, 10); g.fillRect(x + 4, y - 6, 24, 10);
  // legs
  g.fillStyle(stoneDark, 1); g.fillRect(x - 24, y - 44, 19, 40); g.fillRect(x + 5, y - 44, 19, 40);
  g.fillStyle(stone, 1);     g.fillRect(x - 22, y - 44, 15, 40); g.fillRect(x + 7, y - 44, 15, 40);
  // torso
  g.fillStyle(stoneDark, 1); g.fillRect(x - 30, y - 96, 60, 56);
  g.fillStyle(stone, 1);     g.fillRect(x - 27, y - 94, 54, 54);
  g.fillStyle(stoneLt, 0.4); g.fillRect(x - 23, y - 92, 13, 50);
  // torso panel lines
  g.lineStyle(2, stoneDark, 0.5);
  g.beginPath(); g.moveTo(x, y - 96); g.lineTo(x, y - 40); g.strokePath();
  g.beginPath(); g.moveTo(x - 27, y - 70); g.lineTo(x + 27, y - 70); g.strokePath();
  // shoulder pads (massive)
  g.fillStyle(stoneDark, 1); g.fillRect(x - 46, y - 100, 20, 24); g.fillRect(x + 26, y - 100, 20, 24);
  g.fillStyle(stone, 1);     g.fillRect(x - 44, y - 98, 16, 22);  g.fillRect(x + 28, y - 98, 16, 22);
  // arms
  g.fillStyle(stoneDark, 1); g.fillRect(x - 53, y - 84, 19, 54); g.fillRect(x + 34, y - 84, 19, 54);
  g.fillStyle(stone, 1);     g.fillRect(x - 51, y - 82, 15, 52); g.fillRect(x + 36, y - 82, 15, 52);
  // fists
  g.fillStyle(stoneDark, 1); g.fillRect(x - 57, y - 34, 24, 20); g.fillRect(x + 33, y - 34, 24, 20);
  g.fillStyle(stone, 1);     g.fillRect(x - 55, y - 32, 20, 16); g.fillRect(x + 35, y - 32, 20, 16);
  // neck
  g.fillStyle(stoneDark, 1); g.fillRect(x - 13, y - 112, 26, 18);
  g.fillStyle(stone, 1);     g.fillRect(x - 11, y - 110, 22, 16);
  // head
  g.fillStyle(stoneDark, 1); g.fillRect(x - 24, y - 148, 48, 40);
  g.fillStyle(stone, 1);     g.fillRect(x - 22, y - 146, 44, 38);
  g.fillStyle(stoneLt, 0.35); g.fillRect(x - 19, y - 144, 12, 36);
  // brow ridge + jaw line
  g.fillStyle(stoneDark, 1); g.fillRect(x - 24, y - 148, 48, 9);
  g.fillStyle(stoneDark, 1); g.fillRect(x - 24, y - 118, 48, 7);
  // glowing eyes
  g.fillStyle(glow, 0.25); g.fillCircle(x - 10, y - 130, 9); g.fillCircle(x + 10, y - 130, 9);
  g.fillStyle(glow, 1);    g.fillCircle(x - 10, y - 130, 5); g.fillCircle(x + 10, y - 130, 5);
  g.fillStyle(0xcceeff, 1); g.fillCircle(x - 10, y - 130, 2.5); g.fillCircle(x + 10, y - 130, 2.5);
  // cracks on stone
  g.lineStyle(1, stoneDark, 0.7);
  g.beginPath(); g.moveTo(x - 8, y - 88); g.lineTo(x + 6, y - 64); g.strokePath();
  g.beginPath(); g.moveTo(x - 16, y - 134); g.lineTo(x - 7, y - 120); g.strokePath();
  return g;
}

function drawTitleGreenDragon(scene, x, y) {
  const g = scene.add.graphics();
  const grn = 0x2a8a22, grnDk = 0x1a5a14, scl = 0x44aa2a, belly = 0x88cc44;
  // shadow
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x + 22, y + 3, 100, 14);
  // left wing (spread back)
  g.fillStyle(grnDk, 0.65);
  g.fillTriangle(x - 16, y - 52, x - 88, y - 98, x - 58, y - 18);
  g.fillTriangle(x - 16, y - 52, x - 108, y - 62, x - 58, y - 18);
  g.lineStyle(2, grnDk, 0.9);
  g.beginPath(); g.moveTo(x - 16, y - 50); g.lineTo(x - 86, y - 96); g.strokePath();
  g.beginPath(); g.moveTo(x - 16, y - 50); g.lineTo(x - 106, y - 60); g.strokePath();
  g.beginPath(); g.moveTo(x - 16, y - 50); g.lineTo(x - 62, y - 16); g.strokePath();
  // right wing (partial behind body)
  g.fillStyle(grnDk, 0.45);
  g.fillTriangle(x + 12, y - 46, x + 64, y - 90, x + 52, y - 14);
  g.lineStyle(2, grnDk, 0.6);
  g.beginPath(); g.moveTo(x + 12, y - 46); g.lineTo(x + 62, y - 88); g.strokePath();
  g.beginPath(); g.moveTo(x + 12, y - 46); g.lineTo(x + 50, y - 12); g.strokePath();
  // tail
  g.lineStyle(16, grnDk, 1); g.beginPath(); g.moveTo(x - 8, y - 10); g.lineTo(x - 52, y + 6); g.lineTo(x - 72, y - 8); g.strokePath();
  g.lineStyle(11, grn, 1);   g.beginPath(); g.moveTo(x - 8, y - 10); g.lineTo(x - 52, y + 6); g.lineTo(x - 72, y - 8); g.strokePath();
  g.fillStyle(grnDk, 1); g.fillTriangle(x - 68, y - 8, x - 76, y - 13, x - 82, y + 2);
  // body
  g.fillStyle(grnDk, 1); g.fillEllipse(x + 12, y - 28, 62, 50);
  g.fillStyle(grn, 1);   g.fillEllipse(x + 10, y - 30, 56, 46);
  g.fillStyle(belly, 0.7); g.fillEllipse(x + 14, y - 24, 30, 38);
  g.fillStyle(belly, 0.35); g.fillEllipse(x + 12, y - 20, 20, 28);
  // back spines
  g.fillStyle(scl, 1);
  [[x, y - 54],[x + 7, y - 58],[x + 15, y - 56],[x + 22, y - 52]].forEach(([sx,sy]) =>
    g.fillTriangle(sx - 3, sy, sx + 3, sy, sx, sy - 11));
  // scale patches
  g.fillStyle(scl, 0.35);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.fillCircle(x - 4 + c * 10, y - 46 + r * 11, 4);
  // front legs + claws
  g.fillStyle(grnDk, 1); g.fillRect(x + 10, y - 14, 14, 22); g.fillRect(x + 22, y - 10, 12, 18);
  g.fillStyle(grn, 1);   g.fillRect(x + 12, y - 14, 10, 20); g.fillRect(x + 24, y - 10, 8, 16);
  g.fillStyle(0xaaaaaa, 1);
  g.fillTriangle(x + 11, y + 8, x + 14, y + 17, x + 9, y + 15);
  g.fillTriangle(x + 16, y + 8, x + 18, y + 17, x + 14, y + 15);
  g.fillTriangle(x + 21, y + 8, x + 23, y + 17, x + 19, y + 15);
  // neck
  g.lineStyle(20, grnDk, 1); g.beginPath(); g.moveTo(x + 20, y - 50); g.lineTo(x + 44, y - 72); g.lineTo(x + 58, y - 66); g.strokePath();
  g.lineStyle(15, grn, 1);   g.beginPath(); g.moveTo(x + 20, y - 50); g.lineTo(x + 44, y - 72); g.lineTo(x + 58, y - 66); g.strokePath();
  g.fillStyle(scl, 1);
  [[x + 22, y - 54],[x + 30, y - 60],[x + 38, y - 66],[x + 46, y - 70]].forEach(([sx,sy]) =>
    g.fillTriangle(sx - 3, sy, sx + 3, sy, sx, sy - 9));
  // head
  g.fillStyle(grnDk, 1); g.fillEllipse(x + 62, y - 66, 40, 26);
  g.fillStyle(grn, 1);   g.fillEllipse(x + 60, y - 68, 36, 24);
  // snout
  g.fillStyle(grnDk, 1); g.fillRect(x + 68, y - 76, 24, 16);
  g.fillStyle(grn, 1);   g.fillRect(x + 70, y - 74, 20, 13);
  // eye
  g.fillStyle(0xffcc00, 1); g.fillCircle(x + 59, y - 70, 5);
  g.fillStyle(0x000000, 1); g.fillEllipse(x + 59, y - 70, 3, 6);
  g.fillStyle(0xffffff, 1); g.fillCircle(x + 60, y - 72, 1.5);
  // nostril
  g.fillStyle(grnDk, 1); g.fillCircle(x + 86, y - 72, 2.5);
  // horns
  g.fillStyle(0x8a6a22, 1);
  g.fillTriangle(x + 52, y - 76, x + 56, y - 76, x + 47, y - 94);
  g.fillTriangle(x + 58, y - 77, x + 62, y - 77, x + 57, y - 92);
  // fire breath!
  g.fillStyle(0xff6600, 0.25); g.fillTriangle(x + 92, y - 69, x + 160, y - 84, x + 158, y - 54);
  g.fillStyle(0xff8800, 0.45); g.fillTriangle(x + 92, y - 69, x + 148, y - 78, x + 146, y - 60);
  g.fillStyle(0xffcc00, 0.65); g.fillTriangle(x + 92, y - 69, x + 134, y - 74, x + 132, y - 64);
  g.fillStyle(0xffffff, 0.85); g.fillTriangle(x + 92, y - 69, x + 114, y - 71, x + 112, y - 67);
  return g;
}

function drawTitleCyclops(scene, x, y) {
  const g = scene.add.graphics();
  const skin = 0xc06618, skinDk = 0x7a3e0c, skinLt = 0xde8840;
  // shadow
  g.fillStyle(0x000000, 0.22); g.fillEllipse(x, y + 3, 88, 15);
  // feet/sandals
  g.fillStyle(0x4a2c10, 1); g.fillRect(x - 30, y - 5, 26, 9); g.fillRect(x + 4, y - 5, 26, 9);
  // legs
  g.fillStyle(skinDk, 1); g.fillRect(x - 26, y - 46, 21, 44); g.fillRect(x + 5, y - 46, 21, 44);
  g.fillStyle(skin, 1);   g.fillRect(x - 24, y - 46, 17, 44); g.fillRect(x + 7, y - 46, 17, 44);
  // loincloth
  g.fillStyle(0x6a4a2a, 1); g.fillRect(x - 24, y - 46, 48, 18);
  g.fillStyle(0x8a6a3a, 0.4); g.fillRect(x - 22, y - 44, 44, 15);
  // torso barrel chest
  g.fillStyle(skinDk, 1); g.fillRect(x - 32, y - 108, 64, 66);
  g.fillStyle(skin, 1);   g.fillRect(x - 30, y - 106, 60, 64);
  g.fillStyle(skinLt, 0.25); g.fillRect(x - 26, y - 104, 16, 60);
  // left arm (hanging)
  g.fillStyle(skinDk, 1); g.fillRect(x - 50, y - 102, 22, 58); g.fillRect(x - 54, y - 46, 28, 12);
  g.fillStyle(skin, 1);   g.fillRect(x - 48, y - 100, 18, 56);
  // right arm (club raised)
  g.fillStyle(skinDk, 1); g.fillRect(x + 28, y - 110, 22, 62);
  g.fillStyle(skin, 1);   g.fillRect(x + 30, y - 108, 18, 58);
  // club
  g.fillStyle(0x4a2c08, 1); g.fillRect(x + 36, y - 162, 16, 56);
  g.fillStyle(0x5a3c18, 1); g.fillRect(x + 38, y - 160, 12, 52);
  g.fillStyle(0x3a2008, 1); g.fillRect(x + 32, y - 166, 26, 12); // club head
  g.fillStyle(0x5a4028, 1); g.fillRect(x + 34, y - 164, 22, 8);
  g.fillStyle(0x888888, 1); g.fillCircle(x + 36, y - 168, 3); g.fillCircle(x + 45, y - 168, 3); g.fillCircle(x + 54, y - 168, 3);
  // shoulder lumps
  g.fillStyle(skinDk, 1); g.fillCircle(x - 32, y - 100, 12); g.fillCircle(x + 32, y - 100, 12);
  g.fillStyle(skin, 1);   g.fillCircle(x - 30, y - 101, 9);  g.fillCircle(x + 30, y - 101, 9);
  // neck
  g.fillStyle(skinDk, 1); g.fillRect(x - 15, y - 120, 30, 16);
  g.fillStyle(skin, 1);   g.fillRect(x - 13, y - 118, 26, 14);
  // head (massive, slightly wide)
  g.fillStyle(skinDk, 1); g.fillEllipse(x, y - 156, 74, 68);
  g.fillStyle(skin, 1);   g.fillEllipse(x, y - 158, 70, 64);
  g.fillStyle(skinLt, 0.2); g.fillEllipse(x - 14, y - 163, 30, 38);
  // unibrow ridge
  g.fillStyle(skinDk, 1);   g.fillRect(x - 30, y - 144, 60, 11);
  g.fillStyle(0x2a1404, 1); g.fillEllipse(x, y - 148, 52, 9);
  // THE EYE — giant single red glowing eye
  g.fillStyle(0x330000, 1); g.fillCircle(x, y - 160, 20);
  g.fillStyle(0xaa0000, 1); g.fillCircle(x, y - 160, 16);
  g.fillStyle(0xdd1100, 1); g.fillCircle(x, y - 160, 11);
  g.fillStyle(0xff3311, 1); g.fillCircle(x, y - 160, 7);
  g.fillStyle(0xff8866, 0.7); g.fillCircle(x - 4, y - 164, 4); // highlight
  g.fillStyle(0x000000, 1); g.fillEllipse(x, y - 160, 7, 12); // slit pupil
  // eyelid shadow
  g.fillStyle(skinDk, 0.7); g.fillRect(x - 21, y - 182, 42, 16);
  // eyelashes (thick)
  g.lineStyle(2, 0x1a0a00, 1);
  for (let ex = -18; ex <= 18; ex += 6) { g.beginPath(); g.moveTo(x + ex, y - 181); g.lineTo(x + ex - 2, y - 190); g.strokePath(); }
  // tusk
  g.fillStyle(0xeeddaa, 1); g.fillTriangle(x - 16, y - 134, x - 9, y - 134, x - 13, y - 118);
  g.fillStyle(0xffeebb, 1); g.fillTriangle(x - 15, y - 134, x - 10, y - 134, x - 12, y - 120);
  // ears (big pointy)
  g.fillStyle(skinDk, 1); g.fillTriangle(x - 42, y - 158, x - 34, y - 180, x - 28, y - 138);
  g.fillStyle(skin, 1);   g.fillTriangle(x - 40, y - 157, x - 34, y - 176, x - 30, y - 140);
  g.fillStyle(skinDk, 1); g.fillTriangle(x + 42, y - 158, x + 34, y - 180, x + 28, y - 138);
  g.fillStyle(skin, 1);   g.fillTriangle(x + 40, y - 157, x + 34, y - 176, x + 30, y - 140);
  // matted hair
  g.fillStyle(0x1e0e04, 1); g.fillRect(x - 30, y - 190, 60, 18);
  g.fillTriangle(x - 30, y - 190, x - 40, y - 166, x - 18, y - 170);
  g.fillTriangle(x + 30, y - 190, x + 40, y - 166, x + 18, y - 170);
  // red eye glow ambient
  g.fillStyle(0xff2200, 0.07); g.fillCircle(x, y - 160, 36);
  return g;
}

function drawTitleWarchief(scene, x, y) {
  const g = scene.add.graphics();
  const skin = 0x884422, skinDk = 0x562008, armor = 0x445566, armorLt = 0x6688aa;
  const red = 0xcc1100;
  // shadow
  g.fillStyle(0x000000, 0.2); g.fillEllipse(x, y + 3, 62, 13);
  // boots
  g.fillStyle(0x1e1408, 1); g.fillRect(x - 24, y - 7, 22, 11); g.fillRect(x + 2, y - 7, 22, 11);
  // legs
  g.fillStyle(0x2a3344, 1); g.fillRect(x - 20, y - 40, 16, 36); g.fillRect(x + 4, y - 40, 16, 36);
  g.fillStyle(armor, 1);   g.fillRect(x - 18, y - 40, 12, 36); g.fillRect(x + 6, y - 40, 12, 36);
  // cape (behind body)
  g.fillStyle(red, 0.75); g.fillTriangle(x - 24, y - 86, x + 24, y - 86, x + 30, y - 8);
  g.fillStyle(red, 0.55); g.fillTriangle(x - 24, y - 86, x + 24, y - 86, x - 30, y - 8);
  // torso
  g.fillStyle(0x2a3344, 1); g.fillRect(x - 24, y - 90, 48, 54);
  g.fillStyle(armor, 1);   g.fillRect(x - 22, y - 88, 44, 52);
  g.fillStyle(armorLt, 0.35); g.fillRect(x - 20, y - 86, 11, 48);
  // chest plate divider + skull icon
  g.lineStyle(2, 0x223355, 1);
  g.beginPath(); g.moveTo(x, y - 90); g.lineTo(x, y - 38); g.strokePath();
  g.beginPath(); g.moveTo(x - 22, y - 66); g.lineTo(x + 22, y - 66); g.strokePath();
  g.fillStyle(0x776644, 1); g.fillCircle(x, y - 68, 7);
  g.fillStyle(0x1a0c00, 1); g.fillCircle(x - 2, y - 70, 2); g.fillCircle(x + 2, y - 70, 2);
  g.fillStyle(0x1a0c00, 1); g.fillRect(x - 3, y - 64, 6, 3);
  // shoulder guards
  g.fillStyle(0x223355, 1); g.fillRect(x - 36, y - 94, 16, 22); g.fillRect(x + 20, y - 94, 16, 22);
  g.fillStyle(armor, 1);   g.fillRect(x - 34, y - 92, 12, 20); g.fillRect(x + 22, y - 92, 12, 20);
  // right arm + battleaxe
  g.fillStyle(0x223355, 1); g.fillRect(x + 30, y - 86, 15, 46);
  g.fillStyle(armor, 1);   g.fillRect(x + 32, y - 84, 11, 44);
  g.fillStyle(0x4a2c0a, 1); g.fillRect(x + 38, y - 104, 7, 68); // axe handle
  g.fillStyle(0x5a3c1a, 1); g.fillRect(x + 40, y - 102, 4, 64);
  g.fillStyle(0x8899aa, 1); // axe head
  g.fillTriangle(x + 38, y - 104, x + 64, y - 126, x + 66, y - 88);
  g.fillTriangle(x + 38, y - 104, x + 12, y - 126, x + 10, y - 88);
  g.fillStyle(0xaabbcc, 0.6);
  g.fillTriangle(x + 40, y - 102, x + 62, y - 122, x + 64, y - 91);
  g.lineStyle(2, 0xddeeff, 0.8);
  g.beginPath(); g.moveTo(x + 64, y - 126); g.lineTo(x + 64, y - 88); g.strokePath();
  // left arm
  g.fillStyle(0x223355, 1); g.fillRect(x - 45, y - 86, 15, 46);
  g.fillStyle(armor, 1);   g.fillRect(x - 43, y - 84, 11, 44);
  g.fillStyle(skin, 1);    g.fillRect(x - 46, y - 42, 16, 14);
  // neck
  g.fillStyle(skinDk, 1); g.fillRect(x - 11, y - 104, 22, 16);
  g.fillStyle(skin, 1);   g.fillRect(x - 9, y - 102, 18, 14);
  // horned helmet
  g.fillStyle(0x223355, 1); g.fillEllipse(x, y - 126, 48, 34);
  g.fillStyle(armor, 1);   g.fillEllipse(x, y - 128, 44, 30);
  g.fillStyle(0x223355, 1); g.fillRect(x - 26, y - 116, 52, 12); // helmet brim
  g.fillStyle(armor, 1);   g.fillRect(x - 24, y - 115, 48, 10);
  // horns (pair, curved)
  g.fillStyle(0xaaaaaa, 1);
  g.fillTriangle(x - 22, y - 128, x - 18, y - 128, x - 32, y - 158);
  g.fillTriangle(x + 22, y - 128, x + 18, y - 128, x + 32, y - 158);
  g.fillStyle(0xcccccc, 0.45);
  g.fillTriangle(x - 21, y - 128, x - 19, y - 128, x - 30, y - 154);
  g.fillTriangle(x + 21, y - 128, x + 19, y - 128, x + 30, y - 154);
  // helmet face opening
  g.fillStyle(skinDk, 1); g.fillRect(x - 14, y - 120, 28, 18);
  g.fillStyle(skin, 1);   g.fillRect(x - 12, y - 118, 24, 16);
  // orc glowing red eyes
  g.fillStyle(0xff2200, 1); g.fillCircle(x - 7, y - 113, 3); g.fillCircle(x + 7, y - 113, 3);
  // tusks
  g.fillStyle(0xeeddaa, 1);
  g.fillTriangle(x - 7, y - 106, x - 3, y - 106, x - 5, y - 96);
  g.fillTriangle(x + 7, y - 106, x + 3, y - 106, x + 5, y - 96);
  // warpaint stripe
  g.fillStyle(red, 0.65); g.fillRect(x - 12, y - 115, 24, 4);
  return g;
}

function drawTitleBoneDragon(scene, x, y) {
  const g = scene.add.graphics();
  const bone = 0xdddcc6, boneDk = 0xa8a896, boneLt = 0xeeeedc;
  const soul = 0x6600cc;
  // shadow
  g.fillStyle(0x000000, 0.18); g.fillEllipse(x + 8, y + 4, 130, 16);
  // tail
  g.lineStyle(18, boneDk, 1); g.beginPath(); g.moveTo(x - 16, y - 12); g.lineTo(x - 58, y + 6); g.lineTo(x - 82, y - 10); g.strokePath();
  g.lineStyle(12, bone, 1);   g.beginPath(); g.moveTo(x - 16, y - 12); g.lineTo(x - 58, y + 6); g.lineTo(x - 82, y - 10); g.strokePath();
  g.fillStyle(boneDk, 1); g.fillTriangle(x - 78, y - 9, x - 86, y - 7, x - 94, y - 18);
  // tail vertebrae knobs
  for (let i = 0; i < 5; i++) {
    const tx = x - 20 - i * 13, ty = y - 10 + i * 3;
    g.fillStyle(boneDk, 1); g.fillCircle(tx, ty, 5);
    g.fillStyle(boneLt, 1); g.fillCircle(tx - 1, ty - 1, 3);
  }
  // left wing (large, skeletal)
  g.lineStyle(8, boneDk, 1);  g.beginPath(); g.moveTo(x - 8, y - 66); g.lineTo(x - 96, y - 138); g.strokePath();
  g.lineStyle(5, boneLt, 0.8); g.beginPath(); g.moveTo(x - 8, y - 66); g.lineTo(x - 94, y - 136); g.strokePath();
  g.lineStyle(4, boneDk, 1);
  g.beginPath(); g.moveTo(x - 94, y - 136); g.lineTo(x - 44, y - 32); g.strokePath();
  g.beginPath(); g.moveTo(x - 94, y - 136); g.lineTo(x - 82, y - 32); g.strokePath();
  g.beginPath(); g.moveTo(x - 94, y - 136); g.lineTo(x - 118, y - 54); g.strokePath();
  // wing membranes (ragged)
  g.fillStyle(0x8888a0, 0.18); g.fillTriangle(x - 94, y - 136, x - 44, y - 32, x - 82, y - 32);
  g.fillStyle(0x8888a0, 0.13); g.fillTriangle(x - 94, y - 136, x - 82, y - 32, x - 118, y - 54);
  // membrane decay holes
  g.fillStyle(0x14100c, 1); g.fillCircle(x - 70, y - 92, 9); g.fillCircle(x - 52, y - 70, 6); g.fillCircle(x - 100, y - 58, 5);
  // right wing (smaller)
  g.lineStyle(6, boneDk, 1); g.beginPath(); g.moveTo(x + 12, y - 62); g.lineTo(x + 76, y - 118); g.strokePath();
  g.lineStyle(4, boneDk, 1);
  g.beginPath(); g.moveTo(x + 76, y - 118); g.lineTo(x + 44, y - 32); g.strokePath();
  g.beginPath(); g.moveTo(x + 76, y - 118); g.lineTo(x + 86, y - 44); g.strokePath();
  g.fillStyle(0x8888a0, 0.13); g.fillTriangle(x + 76, y - 118, x + 44, y - 32, x + 86, y - 44);
  // body (ribcage)
  g.fillStyle(boneDk, 1); g.fillEllipse(x + 6, y - 36, 58, 54);
  g.fillStyle(bone, 1);   g.fillEllipse(x + 4, y - 38, 54, 50);
  // ribs
  g.lineStyle(3, boneDk, 0.8);
  for (let i = 0; i < 4; i++) {
    const ry = y - 54 + i * 11;
    g.beginPath(); g.moveTo(x - 12, ry); g.lineTo(x - 24, ry + 9); g.strokePath();
    g.beginPath(); g.moveTo(x + 20, ry); g.lineTo(x + 32, ry + 9); g.strokePath();
  }
  // spine vertebrae
  for (let i = 0; i < 5; i++) {
    g.fillStyle(boneDk, 1); g.fillCircle(x + 4, y - 60 + i * 11, 5);
    g.fillStyle(boneLt, 1); g.fillCircle(x + 3, y - 61 + i * 11, 3);
  }
  // front leg + claws
  g.fillStyle(boneDk, 1); g.fillRect(x + 6, y - 16, 11, 24);
  g.fillStyle(bone, 1);   g.fillRect(x + 8, y - 16, 7, 22);
  g.fillStyle(boneDk, 1);
  g.fillTriangle(x + 6, y + 8, x + 10, y + 18, x + 7, y + 16);
  g.fillTriangle(x + 11, y + 8, x + 14, y + 18, x + 12, y + 16);
  g.fillTriangle(x + 15, y + 8, x + 18, y + 17, x + 16, y + 15);
  // neck bones
  g.fillStyle(boneDk, 1); g.fillRect(x + 16, y - 76, 13, 46);
  g.fillStyle(bone, 1);   g.fillRect(x + 18, y - 74, 9, 44);
  // neck vertebrae + dorsal spikes
  for (let i = 0; i < 4; i++) {
    g.fillStyle(boneDk, 1); g.fillRect(x + 14, y - 66 + i * 11, 17, 7);
    g.fillStyle(boneLt, 0.65); g.fillRect(x + 16, y - 65 + i * 11, 13, 5);
    g.fillStyle(boneDk, 1); g.fillTriangle(x + 15, y - 67 + i * 11, x + 27, y - 67 + i * 11, x + 21, y - 80 + i * 11);
  }
  // skull head
  g.fillStyle(boneDk, 1); g.fillEllipse(x + 32, y - 98, 56, 44);
  g.fillStyle(bone, 1);   g.fillEllipse(x + 30, y - 100, 52, 42);
  g.fillStyle(boneLt, 0.4); g.fillEllipse(x + 20, y - 104, 20, 24);
  // snout upper + lower jaw
  g.fillStyle(boneDk, 1); g.fillRect(x + 40, y - 96, 30, 16); g.fillRect(x + 40, y - 82, 28, 12);
  g.fillStyle(bone, 1);   g.fillRect(x + 42, y - 94, 26, 12); g.fillRect(x + 42, y - 80, 24, 10);
  // teeth
  g.fillStyle(boneLt, 1);
  for (let i = 0; i < 5; i++) {
    g.fillTriangle(x + 42 + i * 5, y - 84, x + 44 + i * 5, y - 84, x + 43 + i * 5, y - 91);
    g.fillTriangle(x + 42 + i * 5, y - 80, x + 44 + i * 5, y - 80, x + 43 + i * 5, y - 73);
  }
  // skull eye sockets (dark hollow)
  g.fillStyle(0x0e0016, 1); g.fillCircle(x + 18, y - 102, 11); g.fillCircle(x + 36, y - 102, 10);
  // soul fire eyes (purple)
  g.fillStyle(soul, 0.35); g.fillCircle(x + 18, y - 102, 8);
  g.fillStyle(soul, 0.7);  g.fillCircle(x + 18, y - 102, 5);
  g.fillStyle(0xbb66ff, 1); g.fillCircle(x + 18, y - 102, 2.5);
  g.fillStyle(soul, 0.35); g.fillCircle(x + 36, y - 102, 7);
  g.fillStyle(soul, 0.7);  g.fillCircle(x + 36, y - 102, 4);
  g.fillStyle(0xbb66ff, 1); g.fillCircle(x + 36, y - 102, 2);
  // skull horn
  g.fillStyle(boneDk, 1); g.fillTriangle(x + 16, y - 116, x + 22, y - 116, x + 16, y - 140);
  g.fillStyle(boneLt, 0.45); g.fillTriangle(x + 17, y - 117, x + 21, y - 117, x + 17, y - 136);
  // ambient purple glow from eyes
  g.fillStyle(soul, 0.05); g.fillCircle(x + 27, y - 102, 34);
  return g;
}

function createTitle() {
  const scene = this;
  const W = 800, H = 600;

  // ---- Night sky gradient ----
  const sky = scene.add.graphics();
  sky.fillGradientStyle(0x140a2e, 0x140a2e, 0x3a1a4a, 0x6a2a44, 1);
  sky.fillRect(0, 0, W, 380);

  // ---- Moon + glow ----
  const moon = scene.add.graphics();
  moon.fillStyle(0xffe9b0, 0.15); moon.fillCircle(648, 92, 70);
  moon.fillStyle(0xffe9b0, 1);    moon.fillCircle(648, 92, 44);
  moon.fillStyle(0x3a1a4a, 0.35); moon.fillCircle(666, 80, 38);

  // ---- Twinkling stars ----
  for (let i = 0; i < 70; i++) {
    const star = scene.add.circle(Math.random() * W, Math.random() * 330,
      Math.random() * 1.4 + 0.4, 0xffffff, Math.random() * 0.6 + 0.3);
    scene.tweens.add({ targets: star, alpha: 0.1, duration: 800 + Math.random() * 2200, yoyo: true, repeat: -1 });
  }

  // ---- Distant mountains ----
  const mt = scene.add.graphics();
  mt.fillStyle(0x281838, 1);
  mt.fillTriangle(-60, 380, 170, 190, 380, 380);
  mt.fillTriangle(240, 380, 470, 160, 700, 380);
  mt.fillStyle(0x1d1228, 1);
  mt.fillTriangle(480, 380, 770, 210, 1000, 380);

  // ---- Ground ----
  const ground = scene.add.graphics();
  ground.fillStyle(0x1c2814, 1); ground.fillRect(0, 366, W, 234);
  ground.fillStyle(0x26341c, 1); ground.fillRect(0, 396, W, 204);

  // ---- Scene actors ----
  drawTitleCastle(scene, 400, 392);
  // good guys (left): tower background, then dragon, then titan, knight anchors center-left
  drawTitleCrossbowTower(scene, 128, 474);
  drawTitleGreenDragon(scene, 72, 462);
  drawTitleTitan(scene, 228, 478);
  drawTitleKnight(scene, 310, 434);
  // bad guys (right): cyclops, warchief, bone dragon
  drawTitleCyclops(scene, 518, 478);
  drawTitleWarchief(scene, 630, 475);
  drawTitleBoneDragon(scene, 730, 470);

  // ---- Title text ----
  const t1 = scene.add.text(W/2, 70, 'CASTLE', {
    fontSize: '74px', fontFamily: 'Arial Black', color: '#ffd700',
    stroke: '#2a1408', strokeThickness: 10
  }).setOrigin(0.5);
  const t2 = scene.add.text(W/2, 138, 'DEFENSE', {
    fontSize: '56px', fontFamily: 'Arial Black', color: '#e8c060',
    stroke: '#2a1408', strokeThickness: 9
  }).setOrigin(0.5);
  scene.add.text(W/2, 184, '★  Defend the realm · Save the princess  ★', {
    fontSize: '15px', fontFamily: 'monospace', color: '#ffeebb'
  }).setOrigin(0.5);
  scene.tweens.add({ targets: [t1, t2], y: '+=6', duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

  // ---- Difficulty selector ----
  scene.add.text(W/2, 466, 'CHOOSE YOUR DIFFICULTY', {
    fontSize: '13px', fontFamily: 'Arial Black', color: '#ffffff'
  }).setOrigin(0.5).setAlpha(0.8);

  const modes = Object.keys(DIFFICULTY_MODES);
  const bw = 150, gap = 12;
  const totalW = modes.length * bw + (modes.length - 1) * gap;
  let bx = (W - totalW) / 2 + bw / 2;
  const diffBtns = {};
  const blurb = scene.add.text(W/2, 524, '', { fontSize: '12px', fontFamily: 'monospace', color: '#cccccc' }).setOrigin(0.5);

  function refreshDiff() {
    for (const [k, b] of Object.entries(diffBtns)) {
      const sel = k === currentDifficulty;
      const m = DIFFICULTY_MODES[k];
      b.bg.setStrokeStyle(sel ? 4 : 2, sel ? 0xffffff : 0x444455);
      b.bg.setFillStyle(Phaser.Display.Color.HexStringToColor(m.color).color, sel ? 0.85 : 0.35);
      b.label.setColor(sel ? '#1a1a2e' : '#dddddd');
    }
    const m = DIFFICULTY_MODES[currentDifficulty];
    blurb.setText(`${m.blurb}  ·  start gold ${m.gold}`);
  }

  for (const k of modes) {
    const m = DIFFICULTY_MODES[k];
    const bg = scene.add.rectangle(bx, 498, bw, 34, 0x333344).setInteractive({ useHandCursor: true });
    const label = scene.add.text(bx, 498, m.name, { fontSize: '15px', fontFamily: 'Arial Black', color: '#dddddd' }).setOrigin(0.5);
    bg.on('pointerover', () => { if (k !== currentDifficulty) bg.setFillStyle(Phaser.Display.Color.HexStringToColor(m.color).color, 0.55); });
    bg.on('pointerout',  () => refreshDiff());
    bg.on('pointerdown', () => {
      currentDifficulty = k;
      if (k !== 'heroic') infinityMode = false;
      SFX.play('place_tower');
      refreshDiff();
      refreshInfinity();
    });
    diffBtns[k] = { bg, label };
    bx += bw + gap;
  }
  refreshDiff();

  // ---- Infinity Mode toggle (Heroic only) ----
  const infBg  = scene.add.rectangle(W/2, 548, 200, 26, 0x1a1a2e).setInteractive({ useHandCursor: true }).setDepth(5);
  infBg.setStrokeStyle(2, 0x884400);
  const infTxt = scene.add.text(W/2, 548, '∞  Infinity Mode', {
    fontSize: '13px', fontFamily: 'Arial Black', color: '#ff8822'
  }).setOrigin(0.5).setDepth(6);
  function refreshInfinity() {
    const show = currentDifficulty === 'heroic';
    infBg.setVisible(show); infTxt.setVisible(show);
    infBg.setFillStyle(infinityMode ? 0x884400 : 0x1a1a2e);
    infBg.setStrokeStyle(2, infinityMode ? 0xffaa44 : 0x884400);
    infTxt.setColor(infinityMode ? '#ffdd88' : '#ff8822');
  }
  infBg.on('pointerdown', () => {
    if (currentDifficulty !== 'heroic') return;
    infinityMode = !infinityMode;
    SFX.play('place_tower');
    refreshInfinity();
  });
  refreshInfinity();

  // ---- Start button ----
  const startBg = scene.add.rectangle(W/2, 582, 260, 46, 0x2a8a2a).setInteractive({ useHandCursor: true });
  startBg.setStrokeStyle(3, 0xffd700);
  const startTxt = scene.add.text(W/2, 582, '▶  START GAME', {
    fontSize: '22px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#0a2a0a', strokeThickness: 3
  }).setOrigin(0.5);
  startBg.on('pointerover', () => { startBg.setFillStyle(0x33aa33); startTxt.setScale(1.05); });
  startBg.on('pointerout',  () => { startBg.setFillStyle(0x2a8a2a); startTxt.setScale(1); });
  startBg.on('pointerdown', () => {
    SFX.play('wave_complete');
    resetProgress();
    scene.scene.start('worldmap');
  });
  scene.tweens.add({ targets: startBg, scaleX: 1.03, scaleY: 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
}

// ── World map screen ──────────────────────────────────────────
const MAP_NODES = {
  barbarian: { x: 175, y: 405 },
  undead:    { x: 400, y: 250 },
  dark:      { x: 625, y: 405 },
};
const MAP_CAMP = { x: 85, y: 500 };

function makeKnightToken(scene) {
  const g = scene.add.graphics().setDepth(30);
  g.fillStyle(0x8a1828, 1); g.fillTriangle(-3, -14, 8, -12, 6, 9);     // cape
  g.fillStyle(0x8a8e9c, 1); g.fillRect(-5, -2, 4, 11); g.fillRect(1, -2, 4, 11); // legs
  g.fillStyle(0xc4c8d4, 1); g.fillRoundedRect(-6, -13, 12, 16, 3);     // torso
  g.fillStyle(0x2244aa, 1); g.fillRoundedRect(-14, -9, 9, 14, 2);      // shield
  g.fillStyle(0xffd700, 1); g.fillRect(-10, -6, 2, 9); g.fillRect(-13, -2, 7, 2); // cross
  g.fillStyle(0xe4e8f0, 1); g.fillRect(9, -28, 3, 23);                 // sword
  g.fillStyle(0xe0b89a, 1); g.fillCircle(0, -17, 4);                   // face
  g.fillStyle(0xc4c8d4, 1); g.fillRoundedRect(-5, -23, 10, 8, 2);      // helm
  g.fillStyle(0xcc2244, 1); g.fillTriangle(-1, -25, 1, -25, 6, -33);   // plume
  return g;
}

function drawLandNode(scene, faction, state) {
  const n = MAP_NODES[faction];
  const f = FACTIONS[faction];
  const col = Phaser.Display.Color.HexStringToColor(f.color).color;
  const objs = [];
  const g = scene.add.graphics().setDepth(10);
  objs.push(g);
  // emblem disc
  g.fillStyle(0x000000, 0.22); g.fillEllipse(n.x, n.y + 40, 84, 26);
  g.fillStyle(col, state === 'locked' ? 0.22 : 0.45); g.fillCircle(n.x, n.y, 44);
  g.lineStyle(4, state === 'active' ? 0xffffff : (state === 'defended' ? 0xffd700 : 0x333333), state === 'locked' ? 0.5 : 1);
  g.strokeCircle(n.x, n.y, 44);
  // mini castle
  const s = 0x9a9aa6, sd = 0x6f6f7d;
  g.fillStyle(state === 'locked' ? 0x555560 : sd, 1); g.fillRect(n.x - 26, n.y - 4, 52, 30);
  g.fillStyle(state === 'locked' ? 0x6a6a76 : s, 1);  g.fillRect(n.x - 23, n.y - 4, 46, 30);
  g.fillStyle(state === 'locked' ? 0x555560 : sd, 1);
  for (let bx = n.x - 26; bx < n.x + 26; bx += 11) g.fillRect(bx, n.y - 12, 6, 8); // battlements
  g.fillRect(n.x - 30, n.y - 18, 14, 44); g.fillRect(n.x + 16, n.y - 18, 14, 44); // towers
  g.fillStyle(0x140a06, 1); g.fillRect(n.x - 6, n.y + 8, 12, 18); // gate
  // labels
  const nameTxt = scene.add.text(n.x, n.y + 56, f.name, {
    fontSize: '15px', fontFamily: 'Arial Black', color: state === 'locked' ? '#777777' : f.color,
    stroke: '#000', strokeThickness: 3
  }).setOrigin(0.5).setDepth(11);
  objs.push(nameTxt);

  if (state === 'defended') {
    const flag = scene.add.text(n.x, n.y - 60, '🚩', { fontSize: '24px' }).setOrigin(0.5).setDepth(12);
    const chk = scene.add.text(n.x, n.y + 76, '✓ Conquered', { fontSize: '11px', color: '#ffd700' }).setOrigin(0.5).setDepth(11);
    objs.push(flag, chk);
  } else if (state === 'locked') {
    const lock = scene.add.text(n.x, n.y, '🔒', { fontSize: '30px' }).setOrigin(0.5).setDepth(12);
    objs.push(lock);
  } else {
    const tag = scene.add.text(n.x, n.y + 76, '▶ Defend!', { fontSize: '12px', fontFamily: 'Arial Black', color: '#ffffff' }).setOrigin(0.5).setDepth(11);
    objs.push(tag);
    scene.tweens.add({ targets: tag, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    // pulsing ring
    const ring = scene.add.circle(n.x, n.y, 50).setStrokeStyle(3, 0xffffff, 0.9).setDepth(9);
    objs.push(ring);
    scene.tweens.add({ targets: ring, scale: 1.18, alpha: 0.2, duration: 900, yoyo: true, repeat: -1 });
  }
  return objs;
}

function createWorldMap() {
  const scene = this;
  const W = 800, H = 600;

  // Parchment background
  const bg = scene.add.graphics();
  bg.fillStyle(0x2a2018, 1); bg.fillRect(0, 0, W, H);
  bg.fillStyle(0xc9a86a, 1); bg.fillRect(20, 20, W - 40, H - 40);
  bg.fillStyle(0xbb9a58, 1);
  for (let i = 0; i < 40; i++) { const x = 20 + Math.random()*(W-40), y = 20 + Math.random()*(H-40); bg.fillCircle(x, y, Math.random()*18+4); }
  bg.lineStyle(6, 0x6a4a28, 1); bg.strokeRect(20, 20, W - 40, H - 40);

  scene.add.text(W/2, 56, 'THE REALM', {
    fontSize: '42px', fontFamily: 'Arial Black', color: '#4a2a12', stroke: '#c9a86a', strokeThickness: 2
  }).setOrigin(0.5);
  scene.add.text(W/2, 92, 'Choose the next land to defend', {
    fontSize: '14px', fontFamily: 'monospace', color: '#5a3a1a'
  }).setOrigin(0.5);

  // Dotted trail: camp → land1 → land2 → land3
  const pts = [MAP_CAMP, MAP_NODES.barbarian, MAP_NODES.undead, MAP_NODES.dark];
  const trail = scene.add.graphics().setDepth(5);
  trail.fillStyle(0x6a4a28, 0.9);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i+1];
    const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    const steps = Math.floor(dist / 16);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      trail.fillCircle(a.x + (b.x-a.x)*t, a.y + (b.y-a.y)*t, 3);
    }
  }

  const active = firstUndefeatedLand();
  // Draw each land node in its state
  for (const land of LAND_ORDER) {
    const clickable = infinityMode || land === active;
    const state = landDefended[land] ? 'defended' : (clickable ? 'active' : 'locked');
    drawLandNode(scene, land, state);
    if (clickable) {
      const n = MAP_NODES[land];
      const hit = scene.add.circle(n.x, n.y, 52, 0xffffff, 0).setInteractive({ useHandCursor: true }).setDepth(13);
      if (infinityMode) {
        // gold glow to signal infinity availability
        const ring = scene.add.circle(n.x, n.y, 56, 0xffaa00, 0).setDepth(12);
        ring.setStrokeStyle(2, 0xffaa00, 0.6);
      }
      hit.on('pointerdown', () => {
        hit.disableInteractive();
        SFX.play('place_tower');
        scene.tweens.add({
          targets: knight, x: n.x - 4, y: n.y + 18, duration: 850, ease: 'Sine.inOut',
          onComplete: () => { restartFaction = land; scene.scene.start('game'); }
        });
      });
    }
  }

  // Knight token starts at the last conquered land (or the camp)
  const conquered = LAND_ORDER.filter(l => landDefended[l]);
  const start = conquered.length ? MAP_NODES[conquered[conquered.length - 1]] : MAP_CAMP;
  const knight = makeKnightToken(scene);
  knight.setPosition(start === MAP_CAMP ? start.x : start.x - 4, start === MAP_CAMP ? start.y : start.y + 18);
  scene.tweens.add({ targets: knight, y: '-=4', duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
}

// ── Ending cutscene ───────────────────────────────────────────
function createEnding() {
  const scene = this;
  const W = 800, H = 600;

  // Warm dawn sky
  const sky = scene.add.graphics();
  sky.fillGradientStyle(0x4a2a6a, 0x4a2a6a, 0xffb070, 0xffd9a0, 1);
  sky.fillRect(0, 0, W, 420);
  // sun rays
  const sun = scene.add.graphics();
  sun.fillStyle(0xfff2c0, 1); sun.fillCircle(400, 200, 70);
  sun.fillStyle(0xfff2c0, 0.18); sun.fillCircle(400, 200, 130);
  // ground
  const ground = scene.add.graphics();
  ground.fillStyle(0x3a6a2a, 1); ground.fillRect(0, 400, W, 200);
  ground.fillStyle(0x2f5a22, 1); ground.fillRect(0, 440, W, 160);

  // Flower arch
  const arch = scene.add.graphics();
  arch.lineStyle(14, 0x5a8a3a, 1); arch.beginPath();
  arch.arc(400, 400, 120, Math.PI, 0, false); arch.strokePath();
  for (let a = 0; a <= Math.PI; a += 0.22) {
    const fx = 400 + Math.cos(Math.PI - a) * 120, fy = 400 - Math.sin(a) * 120;
    const c = [0xff5577, 0xffcc44, 0xffffff, 0xaa66ff][Math.floor(Math.random()*4)];
    arch.fillStyle(c, 1); arch.fillCircle(fx, fy, 8);
  }

  // Knight (left) and Princess (right), facing each other under the arch
  const knight = makeKnightToken(scene);
  knight.setScale(2.2).setPosition(345, 452);
  const pr = scene.add.graphics().setDepth(30);
  pr.fillStyle(0xe86aa0, 1); pr.fillTriangle(-16, 24, 16, 24, 0, -10);  // gown
  pr.fillStyle(0xffd0e4, 1); pr.fillCircle(0, -16, 8);                   // head
  pr.fillStyle(0xe86aa0, 1); pr.fillRect(-8, -26, 16, 8);                // hair top
  pr.fillStyle(0xffd700, 1); pr.fillTriangle(-7, -24, 7, -24, 0, -34);   // crown
  pr.setScale(2.0).setPosition(455, 442);

  // Floating hearts rising between them
  for (let i = 0; i < 14; i++) {
    const heart = scene.add.text(400, 430, '❤', { fontSize: (12 + Math.random()*16) + 'px', color: '#ff4477' }).setOrigin(0.5).setDepth(40).setAlpha(0);
    scene.tweens.add({
      targets: heart, y: 300 + Math.random()*60, x: 360 + Math.random()*80, alpha: { from: 0.9, to: 0 },
      duration: 2200 + Math.random()*1500, delay: i * 240, repeat: -1, ease: 'Sine.out'
    });
  }

  // Cheering villagers along the bottom
  const crowdColors = [0x4477cc, 0xcc7744, 0x44aa66, 0xaa4488, 0x8866cc, 0xccaa44];
  for (let i = 0; i < 12; i++) {
    const vx = 60 + i * 62, vy = 540;
    const v = scene.add.graphics().setDepth(35);
    const c = crowdColors[i % crowdColors.length];
    v.fillStyle(c, 1); v.fillRoundedRect(-9, -6, 18, 26, 4);            // body
    v.fillStyle(0xe0b89a, 1); v.fillCircle(0, -14, 7);                  // head
    v.fillStyle(0x000000, 1); v.fillCircle(-2, -15, 1); v.fillCircle(2, -15, 1);
    v.setPosition(vx, vy);
    scene.tweens.add({ targets: v, y: vy - 14, duration: 360 + Math.random()*260, yoyo: true, repeat: -1, ease: 'Quad.out', delay: Math.random()*400 });
  }

  // Confetti falling
  for (let i = 0; i < 50; i++) {
    const c = [0xff5577, 0xffcc44, 0x44ccff, 0xffffff, 0xaa66ff, 0x66ff88][Math.floor(Math.random()*6)];
    const conf = scene.add.rectangle(Math.random()*W, -20, 6, 10, c).setDepth(45);
    scene.tweens.add({
      targets: conf, y: H + 20, x: '+=' + (Math.random()*80 - 40), angle: Math.random()*720,
      duration: 2600 + Math.random()*2600, delay: Math.random()*2500, repeat: -1, ease: 'Linear',
      onRepeat: () => { conf.y = -20; conf.x = Math.random()*W; }
    });
  }

  // Title text (appears after a beat)
  const congrats = scene.add.text(W/2, 80, 'And they lived happily ever after...', {
    fontSize: '20px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#5a2a2a', strokeThickness: 4
  }).setOrigin(0.5).setDepth(50).setAlpha(0);
  scene.tweens.add({ targets: congrats, alpha: 1, duration: 1200, delay: 600 });

  const theEnd = scene.add.text(W/2, 150, 'THE END', {
    fontSize: '64px', fontFamily: 'Arial Black', color: '#ffd700', stroke: '#5a2a2a', strokeThickness: 8
  }).setOrigin(0.5).setDepth(50).setScale(0).setAlpha(0);
  scene.tweens.add({ targets: theEnd, alpha: 1, scale: 1, duration: 900, delay: 1800, ease: 'Back.out' });

  // Play Again button (after the cutscene settles)
  const againBg = scene.add.rectangle(W/2, 225, 240, 46, 0x2a8a2a).setDepth(50).setAlpha(0).setStrokeStyle(3, 0xffd700);
  const againTxt = scene.add.text(W/2, 225, '▶  Play Again', {
    fontSize: '20px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#0a2a0a', strokeThickness: 3
  }).setOrigin(0.5).setDepth(51).setAlpha(0);
  scene.tweens.add({ targets: [againBg, againTxt], alpha: 1, duration: 800, delay: 2800 });
  againBg.setInteractive({ useHandCursor: true });
  againBg.on('pointerover', () => againBg.setFillStyle(0x33aa33));
  againBg.on('pointerout',  () => againBg.setFillStyle(0x2a8a2a));
  againBg.on('pointerdown', () => { SFX.play('wave_complete'); resetProgress(); scene.scene.start('title'); });

  SFX.play('wave_complete');
}

// ── Phaser config ─────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#2d5a27',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [
    { key: 'title',    create: createTitle },
    { key: 'worldmap', create: createWorldMap },
    { key: 'game',     preload, create, update },
    { key: 'ending',   create: createEnding },
  ]
};
const game = new Phaser.Game(config);

// ── Game state ────────────────────────────────────────────────
let enemies = [], towers = [], projectiles = [];
let placedCells = new Set();
let waveRoster = [];
let spawnTimer = 0, spawnCount = 0, waveSize = 8;
let gold = 150, wave = 1, waveActive = false;
let gameOver = false; // true once the castle falls; guards showGameOver from firing repeatedly
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
  if (size >= 52) return 10;  // final bosses — devastating hit
  if (size >= 44) return 6;   // mini bosses / big enemies
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
  // Castle sits at the right edge, centred on the path's end point
  const pathEndY = currentPath[currentPath.length - 1].y;
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
let restartFaction = 'barbarian'; // the land the game scene currently plays (set by the world map)

// ── Land progression (world map) ──────────────────────────────
const LAND_ORDER = ['barbarian', 'undead', 'dark'];
let landDefended = { barbarian: false, undead: false, dark: false };
function resetProgress() { landDefended = { barbarian: false, undead: false, dark: false }; }
function firstUndefeatedLand() { return LAND_ORDER.find(l => !landDefended[l]) || null; }

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
let selectedTowerType = null;
let selectedTower = null;
let movingTower = null;
let movingTowerCharge = 0;  // gold charged to start the current move (refunded on cancel)
let draggingTower = null;   // tower being freely dragged (pre-wave)
let ghostGfx = null;        // hover preview ghost
let ghostRing = null;
let ghostIcon = null;
let dragStartX = 0, dragStartY = 0; // pointer position at drag start
const MOVE_COST_PCT = 0.5;  // move cost = this fraction of the tower's total invested gold
let interestTimer = 0;
const INTEREST_INTERVAL = 10000, INTEREST_RATE = 0.02;
const SPEED_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2];
let gameSpeed = 1;
let speedSlider = null;
const MINE_UPGRADE_COSTS = [200, 400, 800];
let mineLevel = 0;       // 0=not built, 1=2%, 2=3%, 3=4%, 4=5%
let mineGfxGroup = [];
let minePanel = null;

let livesText, goldText, waveText, landText, statusText, interestText, factionText;
let upgradePanel;

function refreshShop() {
  if (!scene_ref) return;
  for (const [key, entry] of Object.entries(scene_ref._shopBtns)) {
    const def = TOWER_TYPES[key];
    const locked = localWave() < def.unlockWave;
    entry.bg.setFillStyle(locked ? 0x1a1a1a : 0x222244);
    entry.bg.setStrokeStyle(2, key === selectedTowerType && !locked ? 0xffd700 : (locked ? 0x333333 : 0x444466));
    entry.nameTxt.setColor(locked ? '#555555' : '#ffffff');
    entry.costTxt.setColor(locked ? '#554400' : '#ffd700');
    entry.descTxt.setColor(locked ? '#444444' : '#aaaaaa');
    entry.lockTxt.setText(locked ? `🔒 Unlocks\nat Wave ${def.unlockWave}` : '');
    if (locked && selectedTowerType === key) selectedTowerType = null;
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
        if (landText) landText.setText(f.name).setColor(f.color);
      }
    }
  });
}

// Name of the land's final boss (shown on the game-over screen)
function landBossLabel(faction) {
  const lastWave = FACTIONS[faction].waves[1];
  const boss = Object.values(ENEMY_TYPES).find(d => d.faction === faction && d.bossOnly && d.wave === lastWave);
  return boss ? boss.label : FACTIONS[faction].name;
}

function toggleSpeedSlider(scene, speedBtn) {
  if (speedSlider) {
    speedSlider.forEach(o => { if (o && o.destroy) o.destroy(); });
    speedSlider = null;
    return;
  }

  speedSlider = [];

  const trackX1 = 530, trackX2 = 770;
  const trackW = trackX2 - trackX1;
  const trackY = HUD_H + 30;
  const stopXs = SPEED_STEPS.map((_, i) => trackX1 + i * trackW / (SPEED_STEPS.length - 1));

  // Panel background
  const bg = scene.add.rectangle(650, trackY, trackW + 50, 52, 0x1a1a2e, 0.96).setDepth(20);
  bg.setStrokeStyle(1, 0x555577);
  speedSlider.push(bg);

  // Track line
  const gfx = scene.add.graphics().setDepth(21);
  gfx.lineStyle(3, 0x444466, 1);
  gfx.beginPath(); gfx.moveTo(trackX1, trackY); gfx.lineTo(trackX2, trackY); gfx.strokePath();
  speedSlider.push(gfx);

  // Ticks + labels
  SPEED_STEPS.forEach((spd, i) => {
    const x = stopXs[i];
    const tg = scene.add.graphics().setDepth(21);
    tg.lineStyle(2, 0x6666aa, 1);
    tg.beginPath(); tg.moveTo(x, trackY - 7); tg.lineTo(x, trackY + 7); tg.strokePath();
    speedSlider.push(tg);
    const lbl = scene.add.text(x, trackY + 10, spd + 'x', {
      fontSize: '9px', color: '#9999bb'
    }).setOrigin(0.5, 0).setDepth(21);
    speedSlider.push(lbl);
  });

  // Draggable thumb
  const curIdx = Math.max(0, SPEED_STEPS.indexOf(gameSpeed));
  const thumb = scene.add.circle(stopXs[curIdx], trackY, 10, 0xffd700).setDepth(22);
  thumb.setStrokeStyle(2, 0xaa8800);
  thumb.setInteractive({ draggable: true, useHandCursor: true });
  scene.input.setDraggable(thumb);
  speedSlider.push(thumb);

  const updateBtn = () => {
    const label = '⏩ ' + (gameSpeed === 1 ? '1x' : gameSpeed + 'x');
    speedBtn.setText(label);
    speedBtn.setColor(gameSpeed < 1 ? '#88ccff' : gameSpeed === 1 ? '#ffffff' : '#ffdd44');
  };

  thumb.on('drag', (ptr, dragX) => {
    const cx = Math.max(trackX1, Math.min(trackX2, dragX));
    thumb.x = cx;
    let nearest = 0, minDist = Infinity;
    stopXs.forEach((sx, i) => { const d = Math.abs(cx - sx); if (d < minDist) { minDist = d; nearest = i; } });
    gameSpeed = SPEED_STEPS[nearest];
    updateBtn();
  });

  thumb.on('dragend', () => {
    thumb.x = stopXs[SPEED_STEPS.indexOf(gameSpeed)];
  });
}

// Dramatic banner when the elite (second-half) horde arrives at wave 11
function announceElite(scene, faction) {
  const msgs = {
    barbarian: 'Enraged by his fallen champion,\nthe Barbarian King unleashes his IRON LEGION!',
    undead:    'Dark magic festers in the woods —\na CURSED horde rises!',
    dark:      'The mountain roars in fury —\nINFERNAL legions pour forth!',
  };
  const t = scene.add.text(400, 250, msgs[faction] || 'Stronger reinforcements approach!', {
    fontSize: '19px', fontFamily: 'Arial Black', color: '#ff8844', align: 'center',
    stroke: '#000', strokeThickness: 5
  }).setOrigin(0.5).setDepth(40).setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, duration: 500, hold: 2600, yoyo: true, onComplete: () => t.destroy() });
}

// After wave 3: the people of the land build a mine near the castle
function revealMine(scene, faction) {
  mineLevel = 1;
  const landName = FACTIONS[faction].name;
  const msg = `The people of ${landName} have built a mine!\nYou will now earn 2% interest on your gold each wave.`;
  const t = scene.add.text(400, 240, msg, {
    fontSize: '17px', fontFamily: 'Arial Black', color: '#ffd700', align: 'center',
    stroke: '#000', strokeThickness: 5
  }).setOrigin(0.5).setDepth(40).setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, duration: 500, hold: 3200, yoyo: true, onComplete: () => t.destroy() });
  SFX.play('unlock');
  drawMineGfx(scene);
}

function drawMineGfx(scene) {
  mineGfxGroup.forEach(o => { if (o && o.destroy) o.destroy(); });
  mineGfxGroup = [];

  const pathEndY = currentPath[currentPath.length - 1].y;
  const lvl = CASTLE_LEVELS[castleLevel];
  const cx = 800 - (CELL * lvl.cols) / 2 - 4;
  const mx = cx - (CELL * lvl.cols) / 2 - 24;
  const cellH = CELL * lvl.rows;
  const my = Math.max(HUD_H + 30, pathEndY - cellH / 2 - 35); // above the castle

  const g = scene.add.graphics().setDepth(6);
  mineGfxGroup.push(g);

  // Dark shaft
  g.fillStyle(0x110a00, 1);
  g.fillRect(mx - 12, my - 10, 24, 22);

  // Wooden frame
  g.fillStyle(0x7a4a20, 1);
  g.fillRect(mx - 14, my - 13, 28, 5);
  g.fillRect(mx - 14, my + 10, 28, 5);
  g.fillRect(mx - 14, my - 13, 5, 28);
  g.fillRect(mx + 9,  my - 13, 5, 28);

  // Cross braces
  g.lineStyle(2, 0x5a3010, 0.9);
  g.beginPath(); g.moveTo(mx - 10, my - 8); g.lineTo(mx + 10, my + 8); g.strokePath();
  g.beginPath(); g.moveTo(mx + 10, my - 8); g.lineTo(mx - 10, my + 8); g.strokePath();

  // Gold vein flecks
  g.fillStyle(0xffd700, 0.85);
  g.fillRect(mx - 8, my - 4, 3, 2);
  g.fillRect(mx + 5, my + 1, 4, 2);
  g.fillRect(mx - 2, my + 5, 2, 3);
  g.fillRect(mx + 2, my - 6, 3, 2);

  // Outline
  g.lineStyle(2, 0x886633, 0.8);
  g.strokeRect(mx - 14, my - 13, 28, 41);

  // Interest rate badge background
  g.fillStyle(0x443300, 0.9);
  g.fillRoundedRect(mx - 16, my + 16, 32, 14, 3);

  const pct = INTEREST_RATE * 100 + (mineLevel - 1);
  const badge = scene.add.text(mx, my + 23, `+${pct}%`, {
    fontSize: '9px', fontFamily: 'Arial Black', color: '#ffd700'
  }).setOrigin(0.5).setDepth(7);
  mineGfxGroup.push(badge);

  const label = scene.add.text(mx, my + 36, '⛏️ Mine', {
    fontSize: '8px', color: '#ccaa66'
  }).setOrigin(0.5).setDepth(7);
  mineGfxGroup.push(label);

  // Click zone
  const hit = scene.add.rectangle(mx, my + 10, 36, 60, 0xffffff, 0).setDepth(8).setInteractive({ useHandCursor: true });
  mineGfxGroup.push(hit);
  hit.on('pointerdown', () => showMinePanel(scene, mx, my));
  hit.on('pointerover', () => { g.lineStyle(2, 0xffd700, 1); g.strokeRect(mx - 14, my - 13, 28, 41); });
  hit.on('pointerout',  () => { g.lineStyle(2, 0x886633, 0.8); g.strokeRect(mx - 14, my - 13, 28, 41); });
}

function showMinePanel(scene, mx, my) {
  if (minePanel) { minePanel.destroy(); minePanel = null; return; }

  const panelW = 170, panelH = mineLevel < 4 ? 120 : 100;
  const px = mx - panelW - 10;
  const py = Math.max(HUD_H + 5, Math.min(my - panelH / 2, 520 - panelH));

  const container = scene.add.container(px, py).setDepth(30);
  minePanel = container;

  const bg = scene.add.rectangle(0, 0, panelW, panelH, 0x1a1a2e, 0.95).setOrigin(0, 0);
  bg.setStrokeStyle(2, 0x886633);
  container.add(bg);

  const title = scene.add.text(panelW / 2 + 10, 12, '⛏️  Mine', {
    fontSize: '13px', fontFamily: 'Arial Black', color: '#ffd700'
  }).setOrigin(0.5, 0);
  container.add(title);

  const curPct = INTEREST_RATE * 100 + (mineLevel - 1);
  const info = scene.add.text(panelW / 2, 32, `Earning ${curPct}% interest\nevery 10 seconds`, {
    fontSize: '10px', color: '#aaffaa', align: 'center'
  }).setOrigin(0.5, 0);
  container.add(info);

  const closeBtn = scene.add.text(8, 6, '✕', {
    fontSize: '12px', color: '#ff6666'
  }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
  closeBtn.on('pointerdown', () => { minePanel.destroy(); minePanel = null; });
  container.add(closeBtn);

  if (mineLevel < 4) {
    const upgCost = MINE_UPGRADE_COSTS[mineLevel - 1];
    const newPct = curPct + 1;
    const canAfford = gold >= upgCost;

    const upgBg = scene.add.rectangle(panelW / 2, 82, panelW - 20, 28, canAfford ? 0x226622 : 0x662222).setOrigin(0.5, 0.5);
    upgBg.setInteractive({ useHandCursor: true });
    container.add(upgBg);

    const upgTxt = scene.add.text(panelW / 2, 82, `Upgrade to ${newPct}%  (${upgCost}g)`, {
      fontSize: '10px', fontFamily: 'Arial Black', color: canAfford ? '#aaffaa' : '#ff8888', align: 'center'
    }).setOrigin(0.5);
    container.add(upgTxt);

    if (canAfford) {
      upgBg.on('pointerdown', () => {
        gold -= upgCost;
        goldText.setText('💰 Gold: ' + gold);
        mineLevel++;
        SFX.play('unlock');
        minePanel.destroy(); minePanel = null;
        drawMineGfx(scene);
      });
    }
  } else {
    const maxTxt = scene.add.text(panelW / 2, 82, 'MAX LEVEL  ★★★', {
      fontSize: '11px', fontFamily: 'Arial Black', color: '#ffd700'
    }).setOrigin(0.5);
    container.add(maxTxt);
  }
}

function showGameOver(scene) {
  const survived = wave - 1;
  const landWaveEnd = FACTIONS[restartFaction].waves[1];
  const infWavesSurvived = infinityMode ? Math.max(0, localWave(survived) - 20) : 0;

  if (infinityMode && infWavesSurvived > 0) {
    const prevBest = parseInt(localStorage.getItem('td_best_infinity') || '0');
    const isNewBest = infWavesSurvived > prevBest;
    if (isNewBest) localStorage.setItem('td_best_infinity', infWavesSurvived);
  }
  const prev = parseInt(localStorage.getItem('td_best_wave') || '0');
  const isNewBest = !infinityMode && survived > prev;
  if (isNewBest) localStorage.setItem('td_best_wave', survived);
  const best = isNewBest ? survived : prev;

  // Dark overlay — interactive so clicks don't fall through to the board
  const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.75).setDepth(50).setInteractive();
  scene.add.text(400, 160, 'GAME OVER', {
    fontSize: '64px', fontFamily: 'Arial Black', color: '#ff2200',
    stroke: '#000000', strokeThickness: 8
  }).setOrigin(0.5).setDepth(51);
  const survivedLabel = (infinityMode && infWavesSurvived > 0)
    ? `Survived to ∞+${infWavesSurvived}`
    : `Survived ${survived} wave${survived !== 1 ? 's' : ''}`;
  scene.add.text(400, 258, survivedLabel, {
    fontSize: '26px', color: '#ffffff', stroke: '#000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(51);

  // Fell to...
  const faction = FACTIONS[getFactionForWave(wave)];
  const fellLabel = (infinityMode && infWavesSurvived > 0)
    ? `∞ Infinity Run — ${FACTIONS[restartFaction].name}`
    : `Fell to: ${landBossLabel(getFactionForWave(wave))}`;
  scene.add.text(400, 308, fellLabel, {
    fontSize: '20px', color: infinityMode ? '#ffaa44' : faction.color, stroke: '#000', strokeThickness: 3
  }).setOrigin(0.5).setDepth(51);

  // Best score line
  if (infinityMode) {
    const prevBestInf = parseInt(localStorage.getItem('td_best_infinity') || '0');
    const isNewInfBest = infWavesSurvived > 0 && infWavesSurvived >= prevBestInf;
    const bestInfLabel = isNewInfBest ? '🏆 NEW INFINITY BEST!' : `Best infinity run: ∞+${prevBestInf}`;
    scene.add.text(400, 352, bestInfLabel, {
      fontSize: isNewInfBest ? '20px' : '17px',
      fontFamily: isNewInfBest ? 'Arial Black' : undefined,
      color: isNewInfBest ? '#ffdd00' : '#aaaaaa', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(51);
  } else if (isNewBest && survived > 0) {
    scene.add.text(400, 352, '🏆 NEW BEST!', {
      fontSize: '22px', fontFamily: 'Arial Black', color: '#ffdd00',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(51);
  } else {
    scene.add.text(400, 352, `Best: Wave ${best}`, {
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
  let restarting = false;
  btn.on('pointerdown', () => {
    if (restarting) return; // guard against double-fire
    restarting = true;
    // Replay the same land. create() fully resets state (towers, gold, wave, etc.),
    // and scene.restart() destroys the old scene's objects for us.
    restartFaction = getFactionForWave(wave);
    gameOver = false;
    scene.scene.restart();
  });
}

function selectTower(tower) {
  if (selectedTower) selectedTower.setSelected(false);
  if (selectedTower === tower) { selectedTower = null; upgradePanel.hide(); return; }
  selectedTower = tower;
  tower.setSelected(true);
  upgradePanel.show(tower);
}

function startMove(tower) {
  movingTowerCharge = 0;
  if (waveActive || localWave() > 1) {
    // Post-wave: charge a fraction of the tower's invested value
    const cost = tower.moveCost();
    if (gold < cost) {
      statusText.setText(`Not enough gold to move! (${cost}g)`);
      scene_ref.time.delayedCall(1500, () => statusText.setText(''));
      SFX.play('not_enough_gold');
      return;
    }
    gold -= cost;
    movingTowerCharge = cost;
    goldText.setText('💰 Gold: ' + gold);
  }
  movingTower = tower;
  if (!tower.isDragon && !tower.isTitan) tower.base.setFillStyle(0xff9900);
  // Hide the panel so it doesn't block the board, and show the move ghost immediately
  upgradePanel.hide();
  selectedTower = tower; // keep the tower logically selected during the move
  statusText.setText('Click a cell to move  ·  Esc to cancel');
}

function cancelMove() {
  if (!movingTower) return;
  const tower = movingTower;
  // Refund the charge — no move actually happened
  if (movingTowerCharge > 0) {
    gold += movingTowerCharge;
    goldText.setText('💰 Gold: ' + gold);
  }
  movingTowerCharge = 0;
  if (!tower.isDragon && !tower.isTitan) tower.base.setFillStyle(tower.baseDef.color);
  if (tower.isDragon) tower.redrawDragon(globalUpgradeTier());
  if (tower.isTitan)  tower.redrawTitan();
  movingTower = null;
  clearGhost();
  statusText.setText('');
  // Re-open the panel on the tower so the player can keep managing it
  selectedTower = tower;
  tower.setSelected(true);
  upgradePanel.show(tower);
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
  const tower = movingTower;
  tower.setSelected(true);
  statusText.setText('');
  movingTower = null;
  movingTowerCharge = 0;
  clearGhost();
  SFX.play('place_tower');
  // Re-open the panel on the tower at its new spot
  selectedTower = tower;
  upgradePanel.show(tower);
}

function preload() {}

function create() {
  scene_ref = this;
  // Fresh state every time a land is entered (the previous scene's objects are already destroyed)
  enemies = []; towers = []; projectiles = []; placedCells = new Set(); waveRoster = [];
  spawnCount = 0; spawnTimer = 0; waveSize = 8; waveActive = false; countdownActive = false;
  selectedTower = null; selectedTowerType = null; movingTower = null; movingTowerCharge = 0;
  draggingTower = null; castlePanel = null; interestTimer = 0;
  gameOver = false;
  gameSpeed = 1;
  if (speedSlider) { speedSlider.forEach(o => { if (o && o.destroy) o.destroy(); }); speedSlider = null; }
  mineLevel = 0;
  mineGfxGroup.forEach(o => { if (o && o.destroy) o.destroy(); }); mineGfxGroup = [];
  if (minePanel) { minePanel.destroy(); minePanel = null; }
  castleLevel = 0; castleMaxHP = CASTLE_LEVELS[0].maxHP; castleHP = castleMaxHP; lives = castleHP;
  wave = FACTIONS[restartFaction].waves[0]; // start at the first wave of the land being played
  gold = diffMode().gold; // starting gold depends on chosen difficulty
  // Clear stale HUD references from any previous scene — they point to destroyed
  // objects after scene.restart(), and drawMap()→drawCastle() runs before they're rebuilt.
  castleHPBar = null; castleHPBg = null; castleHPText = null; castleNameText = null;
  drawMap(this, restartFaction);

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
    const lockTxt  = this.add.text(bx,      shopY,      locked ? `🔒 Unlocks\nat Wave ${def.unlockWave}` : '', { fontSize: '10px', color: '#888800', align: 'center' }).setOrigin(0.5).setDepth(12);

    bg.on('pointerdown', () => {
      if (localWave() < def.unlockWave) return; // still locked
      selectedTowerType = key;
      for (const [k, entry] of Object.entries(this._shopBtns)) {
        const isLocked = localWave() < TOWER_TYPES[k].unlockWave;
        entry.bg.setStrokeStyle(2, k === selectedTowerType ? 0xffd700 : (isLocked ? 0x333333 : 0x444466));
      }
    });
    bg.on('pointerover', () => { if (localWave() >= def.unlockWave) bg.setFillStyle(0x333366); });
    bg.on('pointerout',  () => { bg.setFillStyle(localWave() < def.unlockWave ? 0x1a1a1a : 0x222244); });

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

    // Move mode: drop tower on a valid cell, or cancel by clicking its own cell
    if (movingTower) {
      const origKey = `${movingTower.cx},${movingTower.cy}`;
      if (key === origKey) { cancelMove(); return; } // clicked where it already is → cancel + refund
      if (PATH_CELLS.has(key) || placedCells.has(key)) {
        statusText.setText("Can't place there!");
        this.time.delayedCall(1200, () => { if (movingTower) statusText.setText('Click a cell to move  ·  Esc to cancel'); });
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
    if (!selectedTowerType) return;   // nothing selected — require explicit shop pick
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
    deselectShop();   // clear selection — player must pick again to place another
    refreshShop();    // update locked states (e.g. mine now used up)
    SFX.play('place_tower');
  });

  // ── Input: pointer move (drag + ghost preview) ───────────────
  this.input.on('pointermove', (ptr) => {
    if (draggingTower) {
      clearGhost();
      const dx = ptr.x - dragStartX, dy = ptr.y - dragStartY;
      if (Math.sqrt(dx*dx + dy*dy) < 4) return;
      draggingTower.moveTo(ptr.x, ptr.y);
      draggingTower.rangeRing.setAlpha(0.5);
      return;
    }
    // Ghost preview: show where the selected tower type would land
    if (ptr.y < HUD_H || ptr.y > 520) { clearGhost(); return; }
    if (movingTower) { drawMoveGhostAt(ptr.x, ptr.y); return; }
    drawGhostAt(ptr.x, ptr.y);
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
  const rf = FACTIONS[restartFaction];
  goldText     = this.add.text(218, HUD_H/2, '💰 Gold: ' + gold, { fontSize: '15px', color: '#ffd700' }).setOrigin(0, 0.5).setDepth(10);
  // Wave box (land name + wave number) sits to the right, just left of the sound button
  landText     = this.add.text(665, 7,  rf.name, { fontSize: '9px',  fontFamily: 'monospace', color: rf.color }).setOrigin(0.5, 0).setDepth(10).setAlpha(0.85);
  waveText     = this.add.text(665, 17, 'Wave: ' + localWave(), { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5, 0).setDepth(10);
  // Sound toggle in the top-right corner
  const muteBtn = this.add.text(785, HUD_H/2, '🔊', { fontSize: '16px' }).setOrigin(0.5, 0.5).setDepth(10).setInteractive({ useHandCursor: true });
  muteBtn.on('pointerdown', () => { const m = SFX.toggleMute(); muteBtn.setText(m ? '🔇' : '🔊'); });

  const speedBtn = this.add.text(737, HUD_H/2, '⏩ 1x', {
    fontSize: '11px', fontFamily: 'Arial Black', color: '#ffffff',
    backgroundColor: '#333355', padding: { x: 5, y: 2 }
  }).setOrigin(0.5, 0.5).setDepth(10).setInteractive({ useHandCursor: true });
  speedBtn.on('pointerdown', () => toggleSpeedSlider(scene_ref, speedBtn));
  interestText = this.add.text(400, 530, '',                           { fontSize: '13px', color: '#aaffaa', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10);
  statusText   = this.add.text(400, 508, '',                           { fontSize: '20px', color: '#ffd700', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setDepth(10);
  factionText  = null; // land name now shown only in the wave box; guards skip the old corner label

  // ── Upgrade panel (hidden by default) ──
  upgradePanel = new UpgradePanel(this);

  // ── Ghost preview objects ──
  ghostGfx  = this.add.graphics().setDepth(8).setAlpha(0.55);
  ghostRing = this.add.graphics().setDepth(8).setAlpha(0.3);
  ghostIcon = this.add.text(0, 0, '', { fontSize: '18px' }).setOrigin(0.5).setDepth(9).setAlpha(0.6).setVisible(false);

  // Clear ghost whenever the pointer leaves the canvas
  this.input.on('pointerout', () => clearGhost());

  // Esc cancels an in-progress tower move (refunds the charge)
  this.input.keyboard.on('keydown-ESC', () => {
    if (movingTower) cancelMove();
  });

  // Dev shortcut: ] instantly wins the current land (testing only)
  this.input.keyboard.on('keydown-CLOSED_BRACKET', () => {
    if (gameOver) return;
    waveActive = false;
    for (const e of enemies) e.destroy();
    enemies = [];
    showLandComplete(this, getFactionForWave(wave));
  });

  // Start Wave button (left of the wave box)
  const btn = this.add.rectangle(475, HUD_H/2, 150, 28, 0xffd700).setDepth(10).setInteractive();
  const btnText = this.add.text(475, HUD_H/2, 'Start Wave', { fontSize: '14px', fontFamily: 'Arial Black', color: '#1a1a2e' }).setOrigin(0.5).setDepth(11);
  btn.on('pointerover', () => btn.setFillStyle(0xffec6e));
  btn.on('pointerout',  () => btn.setFillStyle(0xffd700));
  btn.on('pointerdown', () => startWaveWithCountdown(this));
  this._waveBtn = btn; this._waveBtnText = btnText;
}

function clearGhost() {
  if (ghostGfx)  ghostGfx.clear();
  if (ghostRing) ghostRing.clear();
  if (ghostIcon) ghostIcon.setVisible(false);
}

function showLandComplete(scene, fromFaction) {
  landDefended[fromFaction] = true; // mark this land conquered
  const from = FACTIONS[fromFaction];
  const idx = LAND_ORDER.indexOf(fromFaction);
  const isLast = idx === LAND_ORDER.length - 1;
  const objs = [];
  const track = o => { objs.push(o); return o; };

  track(scene.add.rectangle(400, 283, 800, 566, 0x000000, 0.90).setDepth(60).setInteractive());

  const titleTxt = isLast ? '👑  The Realm is Saved!' : '🏰  Castle Defended!';
  track(scene.add.text(400, 170, titleTxt, {
    fontSize: '46px', fontFamily: 'Arial Black', color: '#ffd700',
    stroke: '#000', strokeThickness: 8
  }).setOrigin(0.5).setDepth(61));

  track(scene.add.text(400, 250, `You saved the castle from the ${from.name}!`, {
    fontSize: '22px', color: from.color, stroke: '#000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(61));

  track(scene.add.text(400, 300, isLast
      ? 'All three lands are free. Ride home to your reward...'
      : 'The knight returns to the map to choose his next quest.', {
    fontSize: '15px', color: '#cccccc', stroke: '#000', strokeThickness: 3
  }).setOrigin(0.5).setDepth(61));

  const btnLabel = isLast ? 'See your reward  →' : 'Return to the Map  →';
  const btn = track(scene.add.rectangle(400, 400, 320, 54, 0x225522).setDepth(61).setInteractive({ useHandCursor: true }));
  track(scene.add.text(400, 400, btnLabel, {
    fontSize: '20px', fontFamily: 'Arial Black', color: '#aaffaa',
    stroke: '#000', strokeThickness: 4
  }).setOrigin(0.5).setDepth(62));
  btn.on('pointerover', () => btn.setFillStyle(0x338833));
  btn.on('pointerout',  () => btn.setFillStyle(0x225522));
  btn.on('pointerdown', () => {
    objs.forEach(o => o.destroy());
    scene.scene.start(isLast ? 'ending' : 'worldmap');
  });
}

function deselectShop() {
  selectedTowerType = null;
  clearGhost();
  if (scene_ref && scene_ref._shopBtns) {
    for (const [k, entry] of Object.entries(scene_ref._shopBtns)) {
      const locked = localWave() < TOWER_TYPES[k].unlockWave;
      entry.bg.setStrokeStyle(2, locked ? 0x333333 : 0x444466);
    }
  }
}

function drawGhostAt(px, py) {
  if (!ghostGfx || !selectedTowerType) { clearGhost(); return; }
  const def = TOWER_TYPES[selectedTowerType];
  if (!def) { clearGhost(); return; }

  const cx = Math.floor(px / CELL);
  const cy = Math.floor(py / CELL);
  const key = `${cx},${cy}`;
  const cellX = cx * CELL + CELL / 2;
  const cellY = cy * CELL + CELL / 2;

  const onPath    = PATH_CELLS.has(key);
  const occupied  = placedCells.has(key);
  const canAfford = gold >= def.cost;
  const valid = !onPath && !occupied && canAfford;
  const invalid = onPath || occupied;

  // Cell highlight
  ghostGfx.clear();
  ghostGfx.fillStyle(invalid ? 0xff2200 : (canAfford ? 0x44ff88 : 0xffaa00), 1);
  ghostGfx.fillRect(cx * CELL + 2, cy * CELL + 2, CELL - 4, CELL - 4);
  ghostGfx.lineStyle(2, invalid ? 0xff4400 : (canAfford ? 0x00ff66 : 0xffcc00), 1);
  ghostGfx.strokeRect(cx * CELL + 2, cy * CELL + 2, CELL - 4, CELL - 4);

  // Range ring (only when valid and can afford)
  ghostRing.clear();
  if (!invalid && canAfford && def.range > 0) {
    ghostRing.lineStyle(1, 0xffffff, 1);
    ghostRing.strokeCircle(cellX, cellY, def.range);
  }

  // Icon
  ghostIcon.setText(def.icon || '').setPosition(cellX, cellY).setVisible(true);
}

// Ghost preview while relocating an existing tower (move mode)
function drawMoveGhostAt(px, py) {
  if (!ghostGfx || !movingTower) { clearGhost(); return; }
  const cx = Math.floor(px / CELL);
  const cy = Math.floor(py / CELL);
  const key = `${cx},${cy}`;
  const cellX = cx * CELL + CELL / 2;
  const cellY = cy * CELL + CELL / 2;

  const origKey  = `${movingTower.cx},${movingTower.cy}`;
  const onPath   = PATH_CELLS.has(key);
  const occupied = placedCells.has(key) && key !== origKey;
  const invalid  = onPath || occupied;

  // Cell highlight (green = valid drop, red = blocked)
  ghostGfx.clear();
  ghostGfx.fillStyle(invalid ? 0xff2200 : 0x44ff88, 1);
  ghostGfx.fillRect(cx * CELL + 2, cy * CELL + 2, CELL - 4, CELL - 4);
  ghostGfx.lineStyle(2, invalid ? 0xff4400 : 0x00ff66, 1);
  ghostGfx.strokeRect(cx * CELL + 2, cy * CELL + 2, CELL - 4, CELL - 4);

  // Range ring at the prospective location
  ghostRing.clear();
  if (!invalid && movingTower.range > 0) {
    ghostRing.lineStyle(1, 0xffffff, 1);
    ghostRing.strokeCircle(cellX, cellY, movingTower.range);
  }

  ghostIcon.setText(movingTower.baseDef.icon || '').setPosition(cellX, cellY).setVisible(true);
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
    bgColor:   0x0f1a08,   // very dark haunted forest floor
    gridColor: 0x1a2810,
    gridAlpha: 0.3,
    pathFill:  0x2a1808,   // dark dirt path
    pathEdge:  0x4a3020,
    skyColor:  0x0a1205,
  },
  dark: {
    bgColor:   0x2a0800,   // dark volcanic ground
    gridColor: 0x4a1800,
    gridAlpha: 0.3,
    pathFill:  0x5a1800,   // dark lava-rock path
    pathEdge:  0xaa2200,   // lava glow edge
    skyColor:  0x440a00,
  },
};

function clearMapGraphics() {
  for (const obj of mapGraphicsGroup) { if (obj && obj.destroy) obj.destroy(); }
  mapGraphicsGroup = [];
}

function drawMap(scene, factionKey) {
  clearMapGraphics();
  // Update current path and rebuild blocked cells for new layout
  currentPath = MAP_PATHS[factionKey] || MAP_PATHS.barbarian;
  buildPathCells(currentPath);
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
    const cactiPos = [[90,300],[550,200],[230,420]];
    for (const [cx2,cy2] of cactiPos) {
      if (PATH_CELLS.has(`${Math.floor(cx2/CELL)},${Math.floor(cy2/CELL)}`)) continue;
      deco.fillStyle(0x4a8830, 1);
      deco.fillRect(cx2-4, cy2-30, 8, 38);    // trunk
      deco.fillRect(cx2-14, cy2-20, 10, 5);   // left arm horizontal
      deco.fillRect(cx2-14, cy2-26, 5, 10);   // left arm vertical tip
      deco.fillRect(cx2+4,  cy2-24, 10, 5);   // right arm horizontal
      deco.fillRect(cx2+9,  cy2-30, 5, 10);   // right arm vertical tip
    }
    // Oasis pool with palms, in the open area near the castle
    const ox = 720, oy = 300;
    deco.fillStyle(0xc9a050, 1); deco.fillEllipse(ox, oy, 128, 66);        // sandy rim
    deco.fillStyle(0x2a7ab0, 1); deco.fillEllipse(ox, oy, 110, 52);        // water
    deco.fillStyle(0x4aa6d6, 1); deco.fillEllipse(ox-6, oy-5, 70, 28);     // shimmer
    deco.fillStyle(0xb8e0f4, 0.7); deco.fillEllipse(ox-20, oy-9, 24, 7);   // highlight
    for (const [px, py] of [[ox-50, oy-2], [ox+50, oy+2]]) {
      deco.fillStyle(0x7a5028, 1); deco.fillRect(px-2, py-40, 4, 42);      // trunk
      deco.fillStyle(0x3a8a32, 1);                                          // fronds
      deco.fillEllipse(px, py-44, 30, 10);
      deco.fillEllipse(px-13, py-39, 20, 8); deco.fillEllipse(px+13, py-39, 20, 8);
      deco.fillEllipse(px-8, py-50, 16, 8);  deco.fillEllipse(px+8, py-50, 16, 8);
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
  pg.moveTo(currentPath[0].x, currentPath[0].y);
  currentPath.slice(1).forEach(p => pg.lineTo(p.x, p.y));
  pg.strokePath();
  pg.lineStyle(2, theme.pathEdge, 0.9);
  pg.beginPath();
  pg.moveTo(currentPath[0].x, currentPath[0].y);
  currentPath.slice(1).forEach(p => pg.lineTo(p.x, p.y));
  pg.strokePath();

  // Draw the castle at the path end
  currentFaction = factionKey;
  drawCastle(scene, factionKey);
}

function drawPath() {} // no-op — path is now drawn inside drawMap

function update(time, delta) {
  delta *= gameSpeed;
  // ── Interest (only once the mine is built, after wave 3) ──
  if (waveActive && mineLevel > 0) {
    interestTimer += delta;
    if (interestTimer >= INTEREST_INTERVAL) {
      interestTimer = 0;
      const effectiveRate = INTEREST_RATE + (mineLevel - 1) * 0.01;
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
      if (castleHP <= 0 && !gameOver) {
        gameOver = true;
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
    const lw = localWave();
    const waveLabel = (infinityMode && lw > 20) ? `∞+${lw - 20}` : String(lw);
    waveText.setText('Wave: ' + waveLabel);
    refreshShop();
    SFX.play('wave_complete');

    // Detect end of the current land (its final wave was just cleared)
    const prevFaction = getFactionForWave(prevWave);
    const isLandEnd   = prevWave === FACTIONS[prevFaction].waves[1];

    if (isLandEnd && !infinityMode) {
      this._waveBtn.removeInteractive();
      this._waveBtnText.setText('...');
      showLandComplete(scene_ref, prevFaction);
      return;
    }
    if (isLandEnd && infinityMode) {
      const infWave = localWave(wave) - 20;
      const t = scene_ref.add.text(400, 240,
        `Wave 20 cleared!\nThe darkness grows... ∞+${infWave}`, {
        fontSize: '18px', fontFamily: 'Arial Black', color: '#ffaa44', align: 'center',
        stroke: '#000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(40).setAlpha(0);
      scene_ref.tweens.add({ targets: t, alpha: 1, duration: 500, hold: 2400, yoyo: true, onComplete: () => t.destroy() });
    }

    // Normal wave complete
    const justUnlocked = Object.entries(TOWER_TYPES).filter(([,d]) => d.unlockWave === localWave(wave));
    const unlockMsg = justUnlocked.length ? ' 🔓 ' + justUnlocked.map(([,d]) => d.label).join(' & ') + ' unlocked!' : '';
    statusText.setText('Wave Complete!' + unlockMsg);
    if (justUnlocked.length) SFX.play('unlock');
    // After wave 3 the land's people build a mine near the castle
    if (localWave(wave) === 4 && mineLevel === 0) revealMine(this, getFactionForWave(wave));
    // Entering the second half — the land's lord sends elite reinforcements
    if (localWave(wave) === 11) announceElite(this, getFactionForWave(wave));
    this._waveBtn.setFillStyle(0xffd700).setInteractive();
    this._waveBtnText.setText('Start Wave');
    this._waveBtn.on('pointerover', () => this._waveBtn.setFillStyle(0xffec6e));
    this._waveBtn.on('pointerout',  () => this._waveBtn.setFillStyle(0xffd700));
    this._waveBtn.on('pointerdown', () => startWaveWithCountdown(this));
  }
}

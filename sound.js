// ── Sound Engine (Web Audio API, no files needed) ──────────────
const SFX = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(ctx.destination);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // ── Low-level helpers ────────────────────────────────────────
  function osc(freq, type, start, duration, gainStart, gainEnd, destination) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(gainStart, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gainEnd), start + duration);
    o.connect(g); g.connect(destination || masterGain);
    o.start(start); o.stop(start + duration + 0.01);
    return { o, g };
  }

  function noise(start, duration, gainStart, gainEnd, lowpass, destination) {
    const bufSize = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainStart, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, gainEnd), start + duration);
    src.connect(filter); filter.connect(g); g.connect(destination || masterGain);
    src.start(start); src.stop(start + duration);
  }

  // ── Sound definitions ────────────────────────────────────────
  function play(name) {
    if (muted) return;
    try {
      init(); resume();
      const t = ctx.currentTime;
      switch (name) {

        case 'arrow': { // bow string twang + arrow whoosh
          // String twang: sharp attack, quick pitch drop
          const twangOsc = ctx.createOscillator();
          const twangGain = ctx.createGain();
          twangOsc.type = 'triangle';
          twangOsc.frequency.setValueAtTime(900, t);
          twangOsc.frequency.exponentialRampToValueAtTime(220, t + 0.15);
          twangGain.gain.setValueAtTime(0.45, t);
          twangGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          twangOsc.connect(twangGain); twangGain.connect(masterGain);
          twangOsc.start(t); twangOsc.stop(t + 0.2);
          // Arrow whoosh: high filtered noise fading fast
          noise(t + 0.02, 0.1, 0.14, 0.001, 4000);
          // Body resonance — higher to stay distinct from cannon
          osc(320, 'sine', t, 0.12, 0.2, 0.001);
          break;
        }

        case 'cannon': { // boom with pressure wave
          // Deep sub boom
          const boomOsc = ctx.createOscillator();
          const boomGain = ctx.createGain();
          boomOsc.type = 'sine';
          boomOsc.frequency.setValueAtTime(90, t);
          boomOsc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
          boomGain.gain.setValueAtTime(0.001, t);
          boomGain.gain.linearRampToValueAtTime(0.9, t + 0.01);
          boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          boomOsc.connect(boomGain); boomGain.connect(masterGain);
          boomOsc.start(t); boomOsc.stop(t + 0.55);
          // Mid crack
          const crackOsc = ctx.createOscillator();
          const crackGain = ctx.createGain();
          crackOsc.type = 'square';
          crackOsc.frequency.setValueAtTime(160, t);
          crackOsc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
          crackGain.gain.setValueAtTime(0.6, t);
          crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          crackOsc.connect(crackGain); crackGain.connect(masterGain);
          crackOsc.start(t); crackOsc.stop(t + 0.2);
          // Explosion noise burst
          noise(t, 0.05, 0.8, 0.001, 600);
          noise(t + 0.05, 0.4, 0.35, 0.001, 200);
          break;
        }

        case 'trebuchet': { // sling whoosh + stone impact
          // Rope/sling whoosh: rising then cut noise
          noise(t, 0.18, 0.15, 0.001, 3000);
          noise(t, 0.18, 0.12, 0.001, 800);
          // Mechanical creak at release
          const creakOsc = ctx.createOscillator();
          const creakGain = ctx.createGain();
          creakOsc.type = 'sawtooth';
          creakOsc.frequency.setValueAtTime(320, t);
          creakOsc.frequency.linearRampToValueAtTime(80, t + 0.1);
          creakGain.gain.setValueAtTime(0.25, t);
          creakGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          creakOsc.connect(creakGain); creakGain.connect(masterGain);
          creakOsc.start(t); creakOsc.stop(t + 0.14);
          // Stone impact thud at end of arc
          osc(70,  'sine', t+0.2, 0.2, 0.5, 0.001);
          osc(50,  'sine', t+0.2, 0.22, 0.4, 0.001);
          noise(t+0.2, 0.12, 0.4, 0.001, 400);
          break;
        }

        case 'flame': { // roaring fire burst
          // Turbulent fire noise — multiple layers at different freq ranges
          noise(t,       0.35, 0.5,  0.001, 3500);
          noise(t,       0.35, 0.4,  0.001, 900);
          noise(t+0.05,  0.28, 0.25, 0.001, 400);
          // Low roar oscillator
          const roarOsc = ctx.createOscillator();
          const roarGain = ctx.createGain();
          roarOsc.type = 'sawtooth';
          roarOsc.frequency.setValueAtTime(90, t);
          roarOsc.frequency.linearRampToValueAtTime(60, t + 0.3);
          roarGain.gain.setValueAtTime(0.18, t);
          roarGain.gain.linearRampToValueAtTime(0.22, t + 0.08);
          roarGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          roarOsc.connect(roarGain); roarGain.connect(masterGain);
          roarOsc.start(t); roarOsc.stop(t + 0.38);
          // Initial ignition pop
          osc(250, 'sine', t, 0.04, 0.3, 0.001);
          break;
        }

        case 'tesla': { // electrical arc crackle
          // Harsh electric buzz base
          const arcOsc = ctx.createOscillator();
          const arcGain = ctx.createGain();
          arcOsc.type = 'sawtooth';
          arcOsc.frequency.setValueAtTime(60, t);
          arcGain.gain.setValueAtTime(0.001, t);
          arcGain.gain.linearRampToValueAtTime(0.4, t + 0.005);
          arcGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          arcOsc.connect(arcGain); arcGain.connect(masterGain);
          arcOsc.start(t); arcOsc.stop(t + 0.2);
          // High freq crackle — multiple sharp spikes
          for (let i = 0; i < 5; i++) {
            const delay = i * 0.025;
            osc(1800 - i*180, 'square', t + delay, 0.04, 0.35, 0.001);
            noise(t + delay, 0.03, 0.25, 0.001, 8000);
          }
          // Sizzle tail
          noise(t, 0.22, 0.3, 0.001, 6000);
          // Resonant pop
          osc(440, 'square', t, 0.02, 0.5, 0.001);
          break;
        }

        case 'enemy_die': // small crunch
          noise(t, 0.08, 0.3, 0.001, 600);
          osc(200, 'sine', t, 0.06, 0.2, 0.001);
          break;

        case 'enemy_die_big': // bigger crunch for large enemies
          noise(t, 0.18, 0.5, 0.001, 500);
          osc(100, 'sine',   t,      0.15, 0.4, 0.001);
          osc(150, 'square', t+0.05, 0.12, 0.3, 0.001);
          break;

        case 'boss_die': // dramatic explosion
          noise(t,      0.4,  0.7, 0.001, 300);
          osc(60,  'sine',   t,      0.35, 0.8, 0.001);
          osc(40,  'sine',   t+0.1,  0.3,  0.6, 0.001);
          osc(80,  'square', t+0.05, 0.25, 0.5, 0.001);
          noise(t+0.15, 0.25, 0.4, 0.001, 200);
          break;

        case 'boss_breach': // scary low drone
          osc(60,  'sawtooth', t,      0.5,  0.7, 0.001);
          osc(80,  'square',   t,      0.5,  0.5, 0.001);
          osc(55,  'sine',     t+0.1,  0.45, 0.6, 0.001);
          noise(t, 0.5, 0.3, 0.001, 250);
          break;

        case 'wave_start': // rising fanfare
          [0, 0.12, 0.24, 0.36].forEach((delay, i) => {
            const freqs = [330, 415, 494, 660];
            osc(freqs[i], 'sine', t + delay, 0.25, 0.3, 0.001);
          });
          break;

        case 'wave_complete': // cheerful ding
          [0, 0.1, 0.2, 0.35].forEach((delay, i) => {
            const freqs = [523, 659, 784, 1047];
            osc(freqs[i], 'sine', t + delay, 0.3, 0.35, 0.001);
          });
          break;

        case 'interest': // coin clink
          osc(1200, 'sine', t,      0.08, 0.25, 0.001);
          osc(1600, 'sine', t+0.05, 0.08, 0.2,  0.001);
          break;

        case 'place_tower': // soft click
          osc(400, 'sine', t,      0.04, 0.2, 0.001);
          osc(600, 'sine', t+0.03, 0.04, 0.15, 0.001);
          break;

        case 'not_enough_gold': // low buzz
          osc(150, 'square', t, 0.15, 0.3, 0.001);
          osc(130, 'square', t+0.08, 0.1, 0.2, 0.001);
          break;

        case 'unlock': // magical shimmer
          [0, 0.06, 0.12, 0.18, 0.24].forEach((delay, i) => {
            const freqs = [800, 1000, 1200, 1500, 2000];
            osc(freqs[i], 'sine', t + delay, 0.2, 0.25, 0.001);
          });
          break;

        case 'game_over': // descending doom
          [0, 0.2, 0.4, 0.65].forEach((delay, i) => {
            const freqs = [440, 370, 311, 220];
            osc(freqs[i], 'sawtooth', t + delay, 0.3, 0.4, 0.001);
          });
          osc(110, 'sine', t + 0.6, 0.6, 0.5, 0.001);
          noise(t + 0.5, 0.5, 0.3, 0.001, 300);
          break;

        case 'countdown_beep': // tick
          osc(660, 'sine', t, 0.1, 0.3, 0.001);
          break;

        case 'countdown_go': // GO! beep
          osc(880, 'sine', t,      0.12, 0.5, 0.001);
          osc(1100,'sine', t+0.05, 0.12, 0.4, 0.001);
          break;
      }
    } catch(e) { /* audio blocked — silently ignore */ }
  }

  function toggleMute() {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.4;
    return muted;
  }

  function setVolume(v) {
    if (masterGain) masterGain.gain.value = muted ? 0 : v;
  }

  return { play, toggleMute, setVolume, init, resume };
})();

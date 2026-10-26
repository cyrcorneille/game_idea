/**
 * NEXUS — Adaptive Procedural WebAudio Engine (Section 10).
 * Separate real-time buses: Music, SFX, Voice + dynamic crossfade across Exploration / Combat / Shooting.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.volumes = { music: 0.55, sfx: 0.8, voice: 0.85 };
    this.currentMode = 'EXPLORATION';
    this.isRaining = true;
    this.musicTimer = null;
    this.stepIndex = 0;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.voiceGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.voiceGain.connect(this.masterGain);

    this._createNoiseBuffer();
    this._setupRainAmbience();
    this._applyVolumes();
    this._startAdaptiveSequencer();
    this.initialized = true;
  }

  _createNoiseBuffer() {
    const length = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const out = this.noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.03 * white) / 1.03;
      out[i] = last * 2.6 + white * 0.22;
    }
  }

  _setupRainAmbience() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1150;
    filter.Q.value = 0.65;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = this.isRaining ? 0.08 : 0.0;
    src.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.sfxGain);
    src.start();
  }

  setRain(raining) {
    this.isRaining = raining;
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(raining ? 0.08 : 0.005, this.ctx.currentTime, 0.35);
    }
  }

  setMode(mode) {
    this.currentMode = mode;
  }

  setVolume(channel, value) {
    this.volumes[channel] = Math.max(0, Math.min(1, value));
    this._applyVolumes();
  }

  _applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(this.volumes.music * 0.42, t, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, t, 0.08);
    this.voiceGain.gain.setTargetAtTime(this.volumes.voice, t, 0.08);
  }

  _startAdaptiveSequencer() {
    // Neo-noir D-minor scale notes (Hz)
    const explNotes = [73.42, 87.31, 110.0, 130.81, 146.83, 164.81, 110.0, 98.0];
    const combatBass = [73.42, 73.42, 87.31, 98.0, 73.42, 110.0, 82.41, 73.42];
    const fpsPulse = [146.83, 146.83, 174.61, 146.83, 220.0, 196.0, 174.61, 164.81];

    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running' || this.volumes.music <= 0.01) return;
      const now = this.ctx.currentTime;
      const idx = this.stepIndex % 8;
      this.stepIndex++;

      if (this.currentMode === 'EXPLORATION') {
        if (idx % 2 === 0) {
          this._playSynthNote(explNotes[idx], 0.62, 'triangle', 0.16, 480);
        }
      } else if (this.currentMode === 'COMBAT') {
        this._playSynthNote(combatBass[idx], 0.24, 'sawtooth', 0.2, 720);
        if (idx % 2 === 0) this._playDrumKick(now, 0.26);
      } else if (this.currentMode === 'SHOOTING') {
        this._playSynthNote(fpsPulse[idx] * 0.5, 0.18, 'square', 0.14, 900);
        if (idx % 4 === 0) this._playDrumKick(now, 0.22);
      }
    }, 260);
  }

  _playSynthNote(freq, dur, waveType, peakGain, cutoff) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const flt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, t);
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(cutoff, t);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(peakGain, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(flt);
    flt.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _playDrumKick(t, gainVal) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(125, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.14);
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playGunshot(weaponId) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const preset = {
      pistol: { freq: 260, end: 68, dur: 0.12, noise: 0.28 },
      assault_rifle: { freq: 210, end: 55, dur: 0.1, noise: 0.25 },
      shotgun: { freq: 135, end: 34, dur: 0.25, noise: 0.48 },
      sniper_rifle: { freq: 340, end: 42, dur: 0.3, noise: 0.42 }
    }[weaponId] || { freq: 220, end: 60, dur: 0.12, noise: 0.26 };

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(preset.freq, t);
    osc.frequency.exponentialRampToValueAtTime(preset.end, t + preset.dur);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.32, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + preset.dur);
    osc.connect(og);
    og.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + preset.dur + 0.02);

    const nSrc = this.ctx.createBufferSource();
    nSrc.buffer = this.noiseBuffer;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(preset.noise, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + preset.dur);
    nSrc.connect(nGain);
    nGain.connect(this.sfxGain);
    nSrc.start(t);
    nSrc.stop(t + preset.dur + 0.02);
  }

  playMelee(isHeavy) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = isHeavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 175 : 320, t);
    osc.frequency.exponentialRampToValueAtTime(isHeavy ? 44 : 110, t + (isHeavy ? 0.22 : 0.1));
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(isHeavy ? 0.38 : 0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isHeavy ? 0.23 : 0.11));
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playParryClang() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [880, 1318, 1760].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.2 / (idx + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.32);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  playHitmarker(isCrit = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 1240 : 820, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playPuzzleTone(stepIndex = 0) {
    if (!this.ctx) return;
    const freqs = [293.66, 349.23, 440.0, 587.33];
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqs[stepIndex % freqs.length], t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  playVoiceTransmission(text, lang = 'fr') {
    if (this.ctx) {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.setValueAtTime(790, t + 0.05);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(g);
      g.connect(this.voiceGain);
      osc.start(t);
      osc.stop(t + 0.13);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.volumes.voice > 0.05) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
        utter.volume = Math.min(1, this.volumes.voice * 0.85);
        utter.rate = 1.06;
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore browser speech synthesis sandbox quirks
      }
    }
  }
}

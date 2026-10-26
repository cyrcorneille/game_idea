/**
 * NEXUS — Main Application Bootstrap.
 */

import { InputManager } from './engine/InputManager.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { SaveSystem } from './engine/SaveSystem.js';
import { GameSimulation } from './engine/GameSimulation.js';
import { UIManager } from './ui/UIManager.js';
import { preloadModels } from './engine/ModelLibrary.js';

const canvas = document.getElementById('game-canvas');
const input = new InputManager(canvas);
const audio = new AudioEngine();
const saveSystem = new SaveSystem();

// Characters & vehicles are glTF assets: load them before the world is built so
// every spawned entity gets the realistic model instead of the primitive fallback.
preloadModels().then(() => {
  const sim = new GameSimulation(canvas, input, audio, saveSystem);
  const ui = new UIManager(sim, input, audio, saveSystem);

  // Expose clean debug/test handle for automated verification & developer inspection
  window.__NEXUS__ = { sim, ui, input, audio, saveSystem };

  let lastTime = performance.now();
  const startOrigin = lastTime;

  function animate(now) {
    const rawDt = Math.max(0.0005, (now - lastTime) / 1000);
    lastTime = now;
    const elapsedSec = (now - startOrigin) / 1000;

    sim.step(rawDt, elapsedSec);
    ui.updateHUD();
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
});

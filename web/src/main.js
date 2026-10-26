/**
 * NEXUS — Main Application Bootstrap.
 */

import { InputManager } from './engine/InputManager.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { SaveSystem } from './engine/SaveSystem.js';
import { GameSimulation } from './engine/GameSimulation.js';
import { UIManager } from './ui/UIManager.js';
import { preloadModels } from './engine/ModelLibrary.js';
import { preloadEnvironment } from './engine/Environment.js';

const canvas = document.getElementById('game-canvas');
const input = new InputManager(canvas);
const audio = new AudioEngine();
const saveSystem = new SaveSystem();

// Characters, vehicles, weapons and the HDRI are heavy glTF/EXR assets. Show progress,
// keep the menu buttons disabled until they are ready, and never block forever on a
// slow connection: after 60 s the game starts with the procedural fallbacks.
const statusEl = document.getElementById('asset-status');
const menuButtons = [...document.querySelectorAll('#main-menu button')];
const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };
const SAFETY_TIMEOUT_MS = 60000;

const assets = Promise.all([
  preloadModels((done, total) => setStatus(`Chargement des modèles 3D… ${done}/${total}`)),
  preloadEnvironment()
]);
const safety = new Promise((resolve) => setTimeout(resolve, SAFETY_TIMEOUT_MS));

Promise.race([assets, safety]).then(() => {
  setStatus('');
  statusEl?.classList.add('hidden');
  menuButtons.forEach((b) => { b.disabled = false; });
  startGame();
});

function startGame() {
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
}

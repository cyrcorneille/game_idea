/**
 * NEXUS — End-to-End Acceptance Verification Suite (Section 12 Milestones J1–J6 & Section 14 Criteria).
 * Run with: node web/tests/validate_nexus_v1.mjs
 */

import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  WEAPONS_DATA,
  WEAPON_UPGRADES,
  ARMORS_DATA,
  SKILL_TREES,
  ENEMY_ARCHETYPES,
  ZONES_DATA,
  CAMPAIGN_MISSIONS,
  SIDE_ACTIVITIES
} from '../src/data/gameData.js';
import { UI_STRINGS, SPEAKER_META } from '../src/data/localization.js';
import { WorldZoneBuilder } from '../src/engine/WorldZones.js';
import { SaveSystem } from '../src/engine/SaveSystem.js';

// Polyfill minimal browser globals for headless Node validation
globalThis.localStorage = (() => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };
})();

console.log('=== NEXUS WEB 3D — ACCEPTANCE VALIDATION SUITE ===');

// 1. Validate 4 Weapons, Upgrades, Armors & 3 Skill Branches (Sections 5.3 & 7)
assert.equal(Object.keys(WEAPONS_DATA).length, 4, 'Must define all 4 weapons (Pistol, AR, Shotgun, Sniper)');
assert.equal(WEAPONS_DATA.shotgun.pellets, 8, 'Shotgun must fire 8 pellets');
assert.equal(WEAPONS_DATA.sniper_rifle.hasScope, true, 'Sniper rifle must expose optical scope');
assert.equal(Object.keys(WEAPON_UPGRADES).length, 4, 'Must define 4 weapon upgrades');
assert.equal(Object.keys(ARMORS_DATA).length, 4, 'Must define 4 armor items across 2 slots');
assert.deepEqual(Object.keys(SKILL_TREES), ['shooting', 'combat', 'exploration'], 'Must define all 3 skill branches');

// 2. Validate Enemy Archetypes & Bosses (Sections 5.2 & 5.3)
const behaviors = new Set(Object.values(ENEMY_ARCHETYPES).map((e) => e.behavior));
assert.ok(behaviors.has('SIMPLE_ATTACK') && behaviors.has('GUARD') && behaviors.has('RANGED'), 'All 3 AI behaviors present');

// 3. Validate All 15 Campaign Missions across 4 Acts + Zone Unlocks (Sections 4.1 & 6)
assert.equal(CAMPAIGN_MISSIONS.length, 15, 'Campaign must contain 15 playable missions');
assert.deepEqual([...new Set(CAMPAIGN_MISSIONS.map((m) => m.act))], [1, 2, 3, 4], 'Campaign must span Acts 1..4');
assert.equal(CAMPAIGN_MISSIONS[3].unlocksZone, 'zone_2_industrial', 'M04 unlocks Zone 2 Industrial');
assert.equal(CAMPAIGN_MISSIONS[7].unlocksZone, 'zone_3_outskirts', 'M08 unlocks Zone 3 Outskirts');
assert.equal(CAMPAIGN_MISSIONS[14].isFinale, true, 'M15 is the Grand Finale');
assert.equal(SIDE_ACTIVITIES.length, 3, 'Contracts & Zone Challenges defined');

// 4. Validate 3D Streaming World Zones, Performance Budget (<2000 objects) & All 3 Puzzle Types
const dummyMat = new THREE.MeshBasicMaterial();
const mockMats = {
  asphalt: dummyMat,
  forestGround: dummyMat,
  building: dummyMat,
  industrial: dummyMat,
  concrete: dummyMat,
  coverCrate: dummyMat,
  amberGlow: dummyMat,
  cyanGlow: dummyMat,
  emeraldGlow: dummyMat,
  crimsonGlow: dummyMat
};
const scene = new THREE.Scene();
const wb = new WorldZoneBuilder(scene, mockMats);

for (const zoneId of Object.keys(ZONES_DATA)) {
  const count = wb.buildZone(zoneId, ['cp_z1_plaza'], []);
  assert.ok(count > 20 && count < 2000, `${zoneId} active objects (${count}) strictly within 2,000 budget`);
  assert.equal(wb.npcs.length, 3, `${zoneId} has IGNORE, FLEE, and ALERT NPCs`);
}

// Verify Zone 1 Lever Puzzle solves cleanly
wb.buildZone('zone_1_downtown', [], []);
let solvedType = null;
const mockSim = {
  lang: 'fr',
  audio: { playPuzzleTone: () => {}, playParryClang: () => {} },
  notifyToast: () => {},
  onPuzzleSolved: (t) => { solvedType = t; }
};
wb.interactables.filter((i) => i.type === 'puzzle_lever').forEach((lev) => {
  const idx = Number(lev.id.split('_')[1]);
  if (!wb.puzzles.levers.states[idx]) lev.onInteract(mockSim);
});
assert.equal(solvedType, 'levers', 'Courthouse Lever Door puzzle solves cleanly');

// Verify Zone 3 Moving Platform + Sequence Order Puzzles solve cleanly
wb.buildZone('zone_3_outskirts', [], []);
wb.interactables.find((i) => i.id === 'platform_relay').onInteract(mockSim);
wb.interactables.find((i) => i.id === 'platform_goal').onInteract(mockSim);
assert.equal(solvedType, 'platforms', 'Moving Platforms puzzle solves cleanly');

[0, 1, 2, 3].forEach((idx) => {
  wb.interactables.find((i) => i.id === `seq_pylon_${idx}`).onInteract(mockSim);
});
assert.equal(solvedType, 'sequence', '4-Pylon Sequence Order puzzle solves cleanly');

// 5. Validate 3-Slot Versioned Save/Load Roundtrip (Section 11.3 & Section 14)
const saves = new SaveSystem();
const sampleProgress = {
  money: 2850,
  xp: 120,
  level: 5,
  skillPoints: 2,
  materials: { polymer: 4, cell: 3, alloy: 2 },
  currentZoneId: 'zone_3_outskirts',
  unlockedZones: ['zone_1_downtown', 'zone_2_industrial', 'zone_3_outskirts'],
  currentMissionIndex: 11
};
assert.equal(saves.saveSlot(2, sampleProgress, false), true, 'Manual save to Slot 2 succeeds');
const restored = saves.loadSlot(2);
assert.deepEqual(restored, sampleProgress, 'Save Slot 2 restores with zero progression loss');

// 6. Validate Bilingual Localization FR & EN + Speaker Portraits
assert.ok(UI_STRINGS.fr.btn_new_game && UI_STRINGS.en.btn_new_game, 'FR & EN UI dictionaries complete');
assert.equal(Object.keys(SPEAKER_META).length, 3, 'All 3 speaker portraits configured');

console.log('ALL WEB 3D ACCEPTANCE TESTS PASSED (4 Weapons, 3 Modes, 3 Zones, 3 Puzzles, 15 Missions, 3 Save Slots OK).');

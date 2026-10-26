/**
 * NEXUS — Realistic 3D model library (glTF / GLB).
 *
 * Loads the humanoid and vehicle assets once at boot (see main.js), normalises
 * them to in-game metric sizes, and hands out cheap skinned clones with their
 * own AnimationMixer. Procedural primitives remain as a fallback when an asset
 * is missing, so the game never breaks on a partial deployment.
 *
 * Assets (public/models/):
 *  - Xbot.glb     : Mixamo-rigged human (idle / walk / run)  → player & civilians
 *  - Soldier.glb  : Mixamo-rigged armoured human (Idle/Walk/Run) → Éclipse enforcers
 *  - ferrari.glb  : sports-car body with separated wheel nodes → Berline stand-in
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const BASE = import.meta.env?.BASE_URL ?? './';

const MODEL_FILES = {
  xbot: 'models/Xbot.glb',
  soldier: 'models/Soldier.glb',
  ferrari: 'models/ferrari.glb',
  wpn_pistol: 'models/weapons/pistol.glb',
  wpn_assault_rifle: 'models/weapons/assault_rifle.glb',
  wpn_shotgun: 'models/weapons/shotgun.glb',
  wpn_sniper_rifle: 'models/weapons/sniper_rifle.glb'
};

// Real-world overall lengths (metres) of the first-person weapon models.
const WEAPON_LENGTH = {
  wpn_pistol: 0.22,
  wpn_assault_rifle: 0.92,
  wpn_shotgun: 0.98,
  wpn_sniper_rifle: 1.18
};

// Real-world targets in metres (game units == metres).
const TARGET_HEIGHT = { xbot: 1.82, soldier: 1.9 };
// Sample nodes used to find which end of a weapon is the muzzle.
const MUZZLE_REFS = ['Attach_Muzzle', 'Pump'];
const TRIGGER_REF = 'Trigger';
const TARGET_CAR_LENGTH = 4.6;

// Animation clip names exposed by each rig (see GLB metadata).
const CLIP_MAP = {
  xbot: { idle: 'idle', walk: 'walk', run: 'run' },
  soldier: { idle: 'Idle', walk: 'Walk', run: 'Run' }
};

const templates = {};
let loadPromise = null;

/** Load every model once. Resolves even if individual assets fail. */
export function preloadModels() {
  if (!loadPromise) {
    const draco = new DRACOLoader();
    draco.setDecoderPath(BASE + 'draco/gltf/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loadPromise = Promise.all(
      Object.entries(MODEL_FILES).map(async ([key, file]) => {
        try {
          const gltf = await loader.loadAsync(BASE + file);
          templates[key] = buildTemplate(key, gltf);
        } catch (err) {
          console.warn(`[ModelLibrary] Failed to load ${file} (${err?.message ?? err}); using procedural fallback.`);
        }
      })
    ).then(() => templates);
  }
  return loadPromise;
}

export function hasModel(key) {
  return Boolean(templates[key]);
}

function buildTemplate(key, gltf) {
  const inner = gltf.scene;
  const wrapper = new THREE.Group();
  wrapper.add(inner);

  inner.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // skinned meshes have unreliable bounds
    }
  });

  if (key === 'ferrari') {
    orientLongestToZ(inner, wrapper);
    const size = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
    wrapper.scale.setScalar(TARGET_CAR_LENGTH / size.z);
    centerOnGround(wrapper);
    return { root: wrapper, clips: gltf.animations, kind: 'vehicle' };
  }

  if (key.startsWith('wpn_')) {
    return buildWeaponTemplate(key, gltf, wrapper, inner);
  }

  // Characters: scale to target height, feet on the ground, centred on origin.
  wrapper.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
  wrapper.scale.setScalar(TARGET_HEIGHT[key] / size.y);
  centerOnGround(wrapper);
  return { root: wrapper, clips: gltf.animations, kind: 'character' };
}

/**
 * Rotate `inner` so the world-longest axis lies on Z, the shortest on Y and the
 * remaining one on X, using a proper rotation (det = +1). Works for any authoring axis.
 */
function orientLongestToZ(inner, wrapper) {
  wrapper.updateMatrixWorld(true);
  const raw = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
  const dims = [raw.x, raw.y, raw.z];
  const [L, W, H] = [0, 1, 2].sort((a, b) => dims[b] - dims[a]);
  const cols = [null, null, null];
  cols[L] = new THREE.Vector3(0, 0, 1);
  cols[H] = new THREE.Vector3(0, 1, 0);
  cols[W] = new THREE.Vector3(1, 0, 0);
  const det = new THREE.Matrix3().setFromMatrix4(
    new THREE.Matrix4().makeBasis(cols[0], cols[1], cols[2])
  ).determinant();
  if (det < 0) cols[W].negate();
  inner.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(cols[0], cols[1], cols[2]));
  wrapper.updateMatrixWorld(true);
}

/**
 * First-person weapon: forward is −Z (camera convention). The muzzle side is
 * found from named sample nodes relative to the trigger; the model is then
 * scaled to real length, centred, and its muzzle position is exported.
 */
function buildWeaponTemplate(key, gltf, wrapper, inner) {
  orientLongestToZ(inner, wrapper);

  let muzzleNode = null;
  for (const n of MUZZLE_REFS) {
    muzzleNode = inner.getObjectByName(n);
    if (muzzleNode) break;
  }
  const trigger = inner.getObjectByName(TRIGGER_REF);
  if (muzzleNode && trigger) {
    const mz = muzzleNode.getWorldPosition(new THREE.Vector3()).z;
    const tz = trigger.getWorldPosition(new THREE.Vector3()).z;
    if (mz > tz) inner.rotation.y += Math.PI; // muzzle was at +Z → turn to −Z
    wrapper.updateMatrixWorld(true);
  }

  const size = new THREE.Box3().setFromObject(wrapper).getSize(new THREE.Vector3());
  wrapper.scale.setScalar(WEAPON_LENGTH[key] / size.z);
  wrapper.updateMatrixWorld(true);

  // Put the grip (trigger) at the viewmodel origin so the barrel extends forward
  // from the hand position, exactly where the first-person mount expects it.
  if (trigger) {
    const grip = wrapper.worldToLocal(trigger.getWorldPosition(new THREE.Vector3()));
    wrapper.position.sub(grip.multiply(wrapper.scale));
  } else {
    centerOnGround(wrapper, { ground: false });
  }
  wrapper.updateMatrixWorld(true);

  let muzzle = new THREE.Vector3(0, 0, -WEAPON_LENGTH[key] / 2);
  if (muzzleNode) {
    muzzle = wrapper.worldToLocal(muzzleNode.getWorldPosition(new THREE.Vector3()));
  }
  return { root: wrapper, clips: [], kind: 'weapon', muzzle };
}

/** Shift an object so its XZ centre is at origin and its lowest point is y=0. */
function centerOnGround(obj, { ground = true } = {}) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  if (ground) {
    obj.position.y -= box.min.y;
  } else {
    obj.position.y -= c.y;
  }
  obj.updateMatrixWorld(true);
}

/**
 * Instance a first-person weapon model. Returns { root, muzzle } where `muzzle`
 * is the muzzle position in the weapon's local space (for the muzzle-flash light).
 */
export function createWeaponModel(weaponId) {
  const tpl = templates[`wpn_${weaponId}`];
  if (!tpl) return null;
  const root = SkeletonUtils.clone(tpl.root);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return { root, muzzle: tpl.muzzle.clone() };
}

/** Fresh instance of the sports-car body (wheels are separate child nodes). */
export function createVehicleModel() {
  const tpl = templates.ferrari;
  if (!tpl) return null;
  const model = SkeletonUtils.clone(tpl.root);
  // Dark, slightly cool paint so the Berline reads as an unmarked Éclipse sedan.
  tintMaterials(model, 0x5b6478);
  return model;
}

function tintMaterials(root, colorHex) {
  if (colorHex == null) return;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = Array.isArray(o.material)
      ? mats.map((m) => m.clone())
      : o.material.clone();
    const list = Array.isArray(o.material) ? o.material : [o.material];
    list.forEach((m) => {
      if (m.color) m.color.multiply(new THREE.Color(colorHex));
    });
  });
}

/**
 * Create a character instance: { root, mixer, actions, bones, anim }.
 * `root` is an empty Group you position/rotate; the model is its child.
 */
export function createCharacter(key, { tint = null } = {}) {
  const tpl = templates[key];
  if (!tpl) return null;

  const model = SkeletonUtils.clone(tpl.root);
  tintMaterials(model, tint);

  const root = new THREE.Group();
  root.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const names = CLIP_MAP[key] ?? {};
  const actions = {};
  for (const [state, clipName] of Object.entries(names)) {
    const clip = tpl.clips.find((c) => c.name === clipName);
    if (clip) actions[state] = mixer.clipAction(clip);
  }
  // Arm/leg bones used for additive procedural poses (attacks, parries).
  const bones = {};
  model.traverse((o) => {
    if (o.isBone) {
      const n = o.name.replace('mixamorig', '').replace(/^[:_]/, '');
      bones[n] = o;
    }
  });

  const anim = new CharacterAnimator(root, mixer, actions, bones);
  return { root, model, mixer, actions, bones, anim };
}

/**
 * Locomotion state machine (IDLE → WALK → RUN) driven by measured root speed,
 * so AI, player and civilians all animate without per-caller bookkeeping.
 */
export class CharacterAnimator {
  constructor(root, mixer, actions, bones = {}) {
    this.root = root;
    this.mixer = mixer;
    this.actions = actions;
    this.bones = bones;
    this.state = null;
    this.lastPos = root.position.clone();
    this.speed = 0;
    this.additive = {}; // boneName -> { x?, y?, z? } rotation offsets, decay to 0
    this.play('idle');
  }

  play(state, fade = 0.25) {
    const next = this.actions[state] ?? this.actions.idle;
    if (!next || next === this.current) return;
    next.reset().setEffectiveWeight(1).fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = next;
    this.state = state;
  }

  /**
   * Additive pose on a bone (e.g. raised arm for a melee swing). The offset is
   * applied after the mixer each frame and relaxes back to zero.
   */
  pose(boneName, axis, value) {
    const entry = this.additive[boneName] ?? (this.additive[boneName] = {});
    entry[axis] = value;
  }

  update(dt) {
    if (dt <= 0) return;
    const moved = this.root.position.distanceTo(this.lastPos);
    this.lastPos.copy(this.root.position);
    const instSpeed = moved / dt;
    this.speed += (instSpeed - this.speed) * Math.min(1, dt * 10);

    if (this.speed > 3.4) {
      this.play('run');
      if (this.actions.run) this.actions.run.timeScale = THREE.MathUtils.clamp(this.speed / 4.2, 0.8, 1.6);
    } else if (this.speed > 0.35) {
      this.play('walk');
      if (this.actions.walk) this.actions.walk.timeScale = THREE.MathUtils.clamp(this.speed / 1.4, 0.7, 1.4);
    } else {
      this.play('idle');
    }

    this.mixer.update(dt);

    // Apply and relax additive bone poses on top of the mixer output.
    const relax = Math.exp(-dt * 7);
    for (const [boneName, axes] of Object.entries(this.additive)) {
      const bone = this.bones[boneName];
      for (const axis of Object.keys(axes)) {
        if (bone) bone.rotation[axis] += axes[axis];
        axes[axis] *= relax;
        if (Math.abs(axes[axis]) < 0.002) delete axes[axis];
      }
    }
  }
}

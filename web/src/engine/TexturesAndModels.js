/**
 * NEXUS — Procedural PBR Textures & Articulated 3D Models (Section 3 & Section 5).
 * Builds rich Neo-Noir materials, Marcus Vance rig, 4 FPS weapons, 3+ Enemy types, NPCs & Berline sedan.
 */

import * as THREE from 'three';
import { hasModel, createCharacter, createVehicleModel, createWeaponModel } from './ModelLibrary.js';

function makeCanvasTexture(w, h, drawFn, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMaterialLibrary() {
  const asphaltTex = makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0c111d';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(56,189,248,0.03)';
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.42)';
    ctx.lineWidth = 4;
    ctx.setLineDash([22, 18]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
  }, 14, 14);

  const buildingTex = makeCanvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0e1626';
    ctx.fillRect(0, 0, w, h);
    const cols = 6;
    const rows = 14;
    const padX = 10;
    const padY = 10;
    const cw = (w - padX * 2) / cols;
    const ch = (h - padY * 2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = Math.random();
        if (lit > 0.62) {
          ctx.fillStyle = lit > 0.86 ? '#38bdf8' : '#f59e0b';
        } else if (lit > 0.42) {
          ctx.fillStyle = '#1e293b';
        } else {
          ctx.fillStyle = '#080c14';
        }
        ctx.fillRect(padX + c * cw + 4, padY + r * ch + 4, cw - 8, ch - 8);
      }
    }
  }, 1, 1);

  const industrialTex = makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#172030';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = x % 32 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, 0, 8, h);
    }
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, h - 18, w, 18);
    ctx.fillStyle = '#090d16';
    for (let x = -20; x < w + 20; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, h - 18);
      ctx.lineTo(x + 14, h - 18);
      ctx.lineTo(x + 4, h);
      ctx.lineTo(x - 10, h);
      ctx.closePath();
      ctx.fill();
    }
  }, 2, 1);

  const forestTex = makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0e1d18';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(16,185,129,0.06)' : 'rgba(6,12,18,0.2)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 4, 4);
    }
  }, 16, 16);

  return {
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.2, metalness: 0.42 }),
    forestGround: new THREE.MeshStandardMaterial({ map: forestTex, roughness: 0.78, metalness: 0.08 }),
    building: new THREE.MeshStandardMaterial({
      map: buildingTex,
      emissiveMap: buildingTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.42,
      roughness: 0.45,
      metalness: 0.3
    }),
    industrial: new THREE.MeshStandardMaterial({ map: industrialTex, roughness: 0.5, metalness: 0.55 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.68, metalness: 0.18 }),
    coverCrate: new THREE.MeshStandardMaterial({ color: 0x263449, roughness: 0.48, metalness: 0.4 }),
    amberGlow: new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 2.0 }),
    cyanGlow: new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 2.0 }),
    emeraldGlow: new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 2.0 }),
    crimsonGlow: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.1 })
  };
}

/** Melee slash arc + parry dome VFX shared by procedural and model player rigs. */
function attachPlayerVfx(root) {
  // Melee Slash Arc VFX mesh
  const slashGeo = new THREE.RingGeometry(0.85, 2.35, 24, 1, -Math.PI * 0.45, Math.PI * 0.9);
  const slashMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const slashArc = new THREE.Mesh(slashGeo, slashMat);
  slashArc.rotation.x = -Math.PI / 2;
  slashArc.position.set(0, 1.15, -0.6);
  root.add(slashArc);

  // Parry Shield dome VFX
  const shieldMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    })
  );
  shieldMesh.position.y = 1.05;
  root.add(shieldMesh);

  return { slashArc, slashMat, shieldMesh };
}

/**
 * Player rig. Uses the rigged Xbot model when loaded (ModelLibrary), otherwise
 * falls back to the articulated primitive rig below.
 */
export function createPlayerRig() {
  if (hasModel('xbot')) return createModelPlayerRig();
  const root = new THREE.Group();

  const coatMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.42, metalness: 0.25 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.45 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a382, roughness: 0.65 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 1.4 });

  const hips = new THREE.Group();
  hips.position.y = 0.92;
  root.add(hips);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.64, 0.3), vestMat);
  torso.position.y = 0.32;
  torso.castShadow = true;
  hips.add(torso);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.34), coatMat);
  collar.position.y = 0.58;
  hips.add(collar);

  const coatTail = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.44, 0.32), coatMat);
  coatTail.position.set(0, -0.04, 0.02);
  hips.add(coatTail);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), skinMat);
  head.position.y = 0.82;
  head.castShadow = true;
  hips.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), coatMat);
  hair.position.y = 0.95;
  hips.add(hair);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.34, 0.56, 0);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.54, 0.15), coatMat);
  leftArm.position.y = -0.24;
  leftArmPivot.add(leftArm);
  hips.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.34, 0.56, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.54, 0.15), coatMat);
  rightArm.position.y = -0.24;
  rightArmPivot.add(rightArm);

  // Kinetic Melee Baton / Blade attached to right hand
  const baton = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.86, 8), trimMat);
  baton.rotation.x = Math.PI * 0.42;
  baton.position.set(0, -0.46, -0.32);
  rightArmPivot.add(baton);
  hips.add(rightArmPivot);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.15, 0, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.86, 0.2), coatMat);
  leftLeg.position.y = -0.44;
  leftLegPivot.add(leftLeg);
  hips.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.15, 0, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.86, 0.2), coatMat);
  rightLeg.position.y = -0.44;
  rightLegPivot.add(rightLeg);
  hips.add(rightLegPivot);

  const { slashArc, slashMat, shieldMesh } = attachPlayerVfx(root);

  return {
    poseAttack(angle) { rightArmPivot.rotation.x = angle; },
    root,
    hips,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    baton,
    slashArc,
    slashMat,
    shieldMesh
  };
}

/** Rigged-model player: locomotion comes from the animation clips, melee from additive bone poses. */
function createModelPlayerRig() {
  const root = new THREE.Group();
  const char = createCharacter('xbot', { tint: 0x4b5263 });
  root.add(char.root);
  const { slashArc, slashMat, shieldMesh } = attachPlayerVfx(root);
  const proxy = () => new THREE.Object3D();
  return {
    root,
    isModel: true,
    anim: char.anim,
    hips: proxy(),
    leftArmPivot: proxy(),
    rightArmPivot: proxy(),
    leftLegPivot: proxy(),
    rightLegPivot: proxy(),
    baton: null,
    slashArc,
    slashMat,
    shieldMesh,
    /** Raise the right arm for a melee swing (procedural rigs use the pivot instead). */
    poseAttack(angle) {
      char.anim.pose('RightArm', 'x', angle);
    }
  };
}

/** First-person viewmodel from the CC0 weapon GLB; muzzle flash sits at the real muzzle. */
function createModelViewmodel(weaponId) {
  const { root, muzzle } = createWeaponModel(weaponId);
  const group = new THREE.Group();
  group.add(root);
  const muzzleFlash = new THREE.PointLight(0xffb74d, 0, 7);
  muzzleFlash.position.copy(muzzle);
  group.add(muzzleFlash);
  group.userData.muzzleFlash = muzzleFlash;
  return group;
}

export function createFPSWeaponViewmodel(weaponId) {
  if (hasModel(`wpn_${weaponId}`)) return createModelViewmodel(weaponId);
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x1e2533, roughness: 0.28, metalness: 0.84 });
  const darkGrip = new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 0.72, metalness: 0.2 });
  const neon = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

  if (weaponId === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.3), metal);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.08), darkGrip);
    grip.position.set(0, -0.09, 0.08);
    grip.rotation.x = 0.24;
    const supp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 10), darkGrip);
    supp.rotation.x = Math.PI / 2;
    supp.position.set(0, 0.015, -0.23);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.014), neon);
    sight.position.set(0, 0.048, -0.12);
    group.add(slide, grip, supp, sight);
  } else if (weaponId === 'assault_rifle') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.48), metal);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.34, 10), darkGrip);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.38);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.085), darkGrip);
    mag.position.set(0, -0.14, -0.05);
    mag.rotation.x = -0.2;
    const holoHousing = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.1), darkGrip);
    holoHousing.position.set(0, 0.082, -0.02);
    const holoDot = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.014, 12), neon);
    holoDot.position.set(0, 0.082, 0.032);
    group.add(receiver, barrel, mag, holoHousing, holoDot);
  } else if (weaponId === 'shotgun') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.11, 0.44), darkGrip);
    const tubeTop = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.56, 10), metal);
    tubeTop.rotation.x = Math.PI / 2;
    tubeTop.position.set(0, 0.03, -0.4);
    const tubeUnder = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.48, 10), metal);
    tubeUnder.rotation.x = Math.PI / 2;
    tubeUnder.position.set(0, -0.012, -0.36);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.065, 0.2), amber);
    pump.position.set(0, -0.02, -0.32);
    group.add(body, tubeTop, tubeUnder, pump);
  } else {
    // sniper_rifle
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.56), metal);
    const longBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.62, 10), metal);
    longBarrel.rotation.x = Math.PI / 2;
    longBarrel.position.set(0, 0.025, -0.56);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.28, 12), darkGrip);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.095, -0.06);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), neon);
    lens.position.set(0, 0.095, 0.082);
    group.add(chassis, longBarrel, scope, lens);
  }

  const muzzleFlash = new THREE.PointLight(0xffb74d, 0, 7);
  muzzleFlash.position.set(0, 0.04, -0.68);
  group.add(muzzleFlash);
  group.userData.muzzleFlash = muzzleFlash;
  return group;
}

/** Éclipse enforcer built from the rigged Soldier model; combat overlays are kept procedural. */
function createModelEnemy(archetype, group, scale) {
  const tint = archetype.isBoss || String(archetype.id).startsWith('boss_') ? ENEMY_TINT.boss : (ENEMY_TINT[archetype.id] ?? ENEMY_TINT.rusher);
  const char = createCharacter('soldier', { tint });
  group.add(char.root);

  let shieldMesh = null;
  if (archetype.shielded) {
    shieldMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 1.35, 0.09),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        metalness: 0.75,
        roughness: 0.25
      })
    );
    shieldMesh.position.set(0, 1.05, 0.38);
    group.add(shieldMesh);
  }

  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.85, 20),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.04;
  group.add(telegraphRing);

  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.DoubleSide })
  );
  hpBg.position.y = 2.18;
  const hpFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.04, 0.075),
    new THREE.MeshBasicMaterial({ color: archetype.color, side: THREE.DoubleSide })
  );
  hpFill.position.set(0, 2.18, 0.01);
  group.add(hpBg, hpFill);

  group.scale.setScalar(scale);
  return { group, hpFill, hpBg, shieldMesh, telegraphRing, anim: char.anim };
}

const ENEMY_TINT = {
  rusher: 0x9aa3b2,
  guard: 0x8f8a7e,
  marksman: 0x7f8ca3,
  boss: 0x6e5c8f
};

export function createEnemyMesh(archetype) {
  const group = new THREE.Group();
  const scale = archetype.isBoss ? 1.24 : 1.0;

  if (hasModel('soldier')) {
    return createModelEnemy(archetype, group, scale);
  }

  const armorMat = new THREE.MeshStandardMaterial({
    color: archetype.isBoss ? 0x1a1022 : 0x171f2e,
    roughness: 0.42,
    metalness: 0.5
  });
  const visorMat = new THREE.MeshBasicMaterial({ color: archetype.color });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.82, 0.34), armorMat);
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.72, 0.28), armorMat);
  legs.position.y = 0.36;
  group.add(legs);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), armorMat);
  head.position.y = 1.72;
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.34), visorMat);
  visor.position.y = 1.74;
  group.add(visor);

  let shieldMesh = null;
  if (archetype.shielded) {
    shieldMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 1.35, 0.09),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.35,
        metalness: 0.75,
        roughness: 0.25
      })
    );
    shieldMesh.position.set(0, 1.05, -0.34);
    group.add(shieldMesh);
  }

  // Wind-up parry indicator ring on ground
  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.85, 20),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.04;
  group.add(telegraphRing);

  // Floating 3D Health Bar
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.DoubleSide })
  );
  hpBg.position.y = 2.18;
  const hpFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.04, 0.075),
    new THREE.MeshBasicMaterial({ color: archetype.color, side: THREE.DoubleSide })
  );
  hpFill.position.set(0, 2.18, 0.01);
  group.add(hpBg, hpFill);

  group.scale.setScalar(scale);
  return { group, hpFill, hpBg, shieldMesh, telegraphRing };
}

/**
 * Berline built from the sports-car model. Wheels are re-parented under spinner
 * pivots whose local X is the axle, so the driving code can keep rotating
 * `wheel.rotation.x` regardless of how the asset was authored.
 */
function createModelVehicle() {
  return createVehicleModel();
}

function createModelCar() {
  const car = new THREE.Group();
  const body = createModelVehicle();
  car.add(body);
  car.updateMatrixWorld(true);

  // Lights: the red tail lamps must sit at +Z so the nose faces −Z (driving convention).
  const tail = car.getObjectByName('lights_red');
  if (tail) {
    const tb = new THREE.Box3().setFromObject(tail);
    if (!tb.isEmpty() && tb.getCenter(new THREE.Vector3()).z < 0) body.rotation.y = Math.PI;
    car.updateMatrixWorld(true);
  }

  const wheels = [];
  ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach((name) => {
    const node = car.getObjectByName(name);
    if (!node) return;
    const box = new THREE.Box3().setFromObject(node);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const dims = [size.x, size.y, size.z];
    const axleIdx = dims.indexOf(Math.min(...dims));
    const align = new THREE.Group();
    align.position.copy(center);
    if (axleIdx === 1) align.rotation.z = Math.PI / 2;
    if (axleIdx === 2) align.rotation.y = Math.PI / 2;
    const spinner = new THREE.Group();
    align.add(spinner);
    car.add(align);
    spinner.attach(node);
    wheels.push(spinner);
  });

  return { car, wheels };
}

export function createBerlineCarMesh() {
  if (hasModel('ferrari')) {
    const { car, wheels } = createModelCar();
    const beam = new THREE.SpotLight(0xfff1cc, 4.2, 34, Math.PI * 0.24, 0.45, 1.2);
    beam.position.set(0, 0.8, -2.2);
    beam.target.position.set(0, 0.1, -16);
    car.add(beam, beam.target);
    return { car, wheels, beam };
  }
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x0d1320, roughness: 0.16, metalness: 0.86 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9, opacity: 0.65, transparent: true });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.8 });

  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.65, 4.6), paint);
  lower.position.y = 0.56;
  lower.castShadow = true;
  car.add(lower);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.56, 2.35), glass);
  cabin.position.set(0, 1.12, -0.1);
  car.add(cabin);

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  [-0.72, 0.72].forEach((x) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.08), headlightMat);
    hl.position.set(x, 0.62, -2.31);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.08), tailMat);
    tl.position.set(x, 0.66, 2.31);
    car.add(hl, tl);
  });

  const beam = new THREE.SpotLight(0xfff1cc, 4.2, 34, Math.PI * 0.24, 0.45, 1.2);
  beam.position.set(0, 0.8, -2.2);
  beam.target.position.set(0, 0.1, -16);
  car.add(beam, beam.target);

  const wheels = [];
  [
    [-0.98, 0.36, -1.42],
    [0.98, 0.36, -1.42],
    [-0.98, 0.36, 1.42],
    [0.98, 0.36, 1.42]
  ].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14), tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    car.add(w);
    wheels.push(w);
  });

  return { car, wheels, beam };
}

/**
 * NEXUS — Core 60 FPS 3D Gameplay & Open-World Simulation Engine.
 * Orchestrates Exploration (3P), Melee Combat (GoW 3P Shoulder), and Shooting (CoD 1P FPS),
 * plus 15 Campaign Missions, 3 Zones, Berline Driving, 3 Puzzles, AI State Machines, and Save/Load.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import {
  WEAPONS_DATA,
  WEAPON_UPGRADES,
  ARMORS_DATA,
  SKILL_TREES,
  ENEMY_ARCHETYPES,
  ZONES_DATA,
  CAMPAIGN_MISSIONS,
  SIDE_ACTIVITIES
} from '../data/gameData.js';
import { UI_STRINGS } from '../data/localization.js';
import {
  createMaterialLibrary,
  createPlayerRig,
  createFPSWeaponViewmodel,
  createEnemyMesh,
  createBerlineCarMesh
} from './TexturesAndModels.js';
import { WorldZoneBuilder } from './WorldZones.js';

const TIME_STATES = ['DAWN', 'DAY', 'DUSK', 'NIGHT'];

export class GameSimulation {
  constructor(canvas, input, audio, saveSystem) {
    this.canvas = canvas;
    this.input = input;
    this.audio = audio;
    this.saveSystem = saveSystem;

    // Callbacks wired by UIManager
    this.onOpenMenuRequest = null;
    this.onSubtitle = null;
    this.onToast = null;
    this.onFloatingText = null;
    this.onCinematicTransition = null;
    this.onHitmarker = null;
    this.onDirectionalDamage = null;

    // Accessibility & Localization (Section 9)
    this.lang = 'fr';
    this.subtitlesEnabled = true;
    this.textScale = 1.0;

    // Progression & Economy State (Section 7)
    this.resetProgressionState();

    // Runtime simulation fields
    this.isPaused = true; // Starts on Main Menu
    this.mode = 'EXPLORATION'; // EXPLORATION | COMBAT | SHOOTING
    this.hitstopTimer = 0;
    this.fpsMeasured = 60;
    this._frameCounter = 0;
    this._fpsAccum = 0;

    // Player physics & combat state
    this.playerPos = new THREE.Vector3(0, 0, 26);
    this.playerVel = new THREE.Vector3();
    this.onGround = true;
    this.yaw = 0;
    this.pitch = -0.14;
    this.walkCycle = 0;

    this.comboStep = 0;
    this.comboResetTimer = 0;
    this.attackCooldown = 0;
    this.slashFade = 0;
    this.dodgeTimer = 0;
    this.dodgeDir = new THREE.Vector3();
    this.parryWindowTimer = 0;
    this.lockedEnemy = null;

    this.activeWeaponSlot = 0;
    this.isAimingADS = false;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0;
    this.recoilVisual = 0;
    this.dynamicSpread = 0;
    this.lastDamageTime = -10;

    // Vehicle state (Section 5.4)
    this.vehicle = null;
    this.inVehicle = false;

    // Active entities & tracers
    this.enemies = [];
    this.tracers = [];
    this.activeMission = null;
    this.stageIndex = 0;
    this.missionTimer = 0;
    this.missionHeadshots = 0;
    this.missionPerfects = 0;
    this.activeWaypointMesh = null;
    this.hintHighlightMesh = null;
    this.currentContextPrompt = '';

    this._initThreeScene();
    this.streamZone('zone_1_downtown', false);
  }

  resetProgressionState() {
    this.money = 450;
    this.xp = 0;
    this.level = 1;
    this.skillPoints = 1;
    this.materials = { polymer: 2, cell: 1, alloy: 0 };

    this.ownedWeapons = ['pistol', 'assault_rifle'];
    this.equippedWeapons = ['pistol', 'assault_rifle'];
    this.weaponUpgrades = { pistol: [], assault_rifle: [], shotgun: [], sniper_rifle: [] };

    this.ownedArmors = ['vest_light'];
    this.equippedArmors = ['vest_light', ''];

    this.unlockedSkills = { shooting: [], combat: [], exploration: [] };

    this.currentZoneId = 'zone_1_downtown';
    this.unlockedZones = ['zone_1_downtown'];
    this.unlockedCheckpoints = ['cp_z1_plaza'];
    this.completedRumors = [];
    this.currentMissionIndex = 0;

    this.timeIndex = 3; // NIGHT Neo-Noir default
    this.weather = 'RAIN';

    this.health = this.getMaxHealth();
    this.stamina = this.getMaxStamina();
    this.ammoInMag = {};
    this.ammoReserve = {};
    Object.values(WEAPONS_DATA).forEach((w) => {
      this.ammoInMag[w.id] = w.magSize;
      this.ammoReserve[w.id] = w.maxReserve;
    });
  }

  _initThreeScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b14);
    this.scene.fog = new THREE.FogExp2(0x091122, 0.0115);

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 320);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Subtle Neo-Noir Bloom Post-Processing
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.34,
      0.55,
      0.78
    );
    this.composer.addPass(this.bloomPass);

    // Lighting rig (updated dynamically across 4 Day/Night phases)
    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.72);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0x60a5fa, 1.15);
    this.dirLight.position.set(28, 52, 24);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 4;
    this.dirLight.shadow.camera.far = 150;
    const d = 58;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // Warm Sodium City Bounce Light
    this.sodiumFill = new THREE.PointLight(0xf59e0b, 1.8, 65);
    this.sodiumFill.position.set(0, 10, 0);
    this.scene.add(this.sodiumFill);

    this.mats = createMaterialLibrary();
    this.worldBuilder = new WorldZoneBuilder(this.scene, this.mats);

    // Player 3D Rig
    this.playerRig = createPlayerRig();
    this.scene.add(this.playerRig.root);

    // FPS Weapon Mount attached to Camera
    this.fpsMount = new THREE.Group();
    this.fpsMount.position.set(0.24, -0.22, -0.44);
    this.camera.add(this.fpsMount);
    this._rebuildFPSViewmodel();

    // 3D Mission Waypoint Beacon + Progressive Puzzle Hint Beacon
    this.activeWaypointMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 9.0, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.activeWaypointMesh.visible = false;
    this.scene.add(this.activeWaypointMesh);

    this.hintHighlightMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55),
      this.mats.amberGlow
    );
    this.hintHighlightMesh.visible = false;
    this.scene.add(this.hintHighlightMesh);

    // Rain Particle System (Section 4.2: Clear / Rain weather)
    const rainCount = 1200;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 70;
      rainPositions[i * 3 + 1] = Math.random() * 26;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.14,
      transparent: true,
      opacity: 0.55
    });
    this.rainPoints = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainPoints);

    this.applyEnvironmentVisuals();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.composer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  getMaxHealth() {
    let hp = 100;
    this.equippedArmors.forEach((id) => {
      if (ARMORS_DATA[id]) hp += ARMORS_DATA[id].hpBonus;
    });
    if (this.hasSkill('exploration', 'parkour_absorb')) hp = Math.round(hp * 1.25);
    return hp;
  }

  getMaxStamina() {
    let st = 100;
    this.equippedArmors.forEach((id) => {
      if (ARMORS_DATA[id]) st += ARMORS_DATA[id].staminaBonus;
    });
    if (this.hasSkill('combat', 'second_wind')) st += 35;
    return st;
  }

  hasSkill(branch, id) {
    return Boolean(this.unlockedSkills[branch]?.includes(id));
  }

  getCurrentWeaponData() {
    const list = this.ownedWeapons.length ? this.ownedWeapons : ['pistol'];
    const id = list[this.activeWeaponSlot % list.length] || 'pistol';
    return WEAPONS_DATA[id] || WEAPONS_DATA.pistol;
  }

  getEffectiveMagSize(weaponId) {
    const base = WEAPONS_DATA[weaponId]?.magSize || 15;
    let mult = 1;
    if (this.hasSkill('shooting', 'tactical_reload')) mult += 0.3;
    if (this.weaponUpgrades[weaponId]?.includes('extended_mag')) mult += 0.4;
    return Math.max(1, Math.round(base * mult));
  }

  _rebuildFPSViewmodel() {
    while (this.fpsMount.children.length > 0) {
      this.fpsMount.remove(this.fpsMount.children[0]);
    }
    const wpn = this.getCurrentWeaponData();
    this.currentViewmodel = createFPSWeaponViewmodel(wpn.id);
    this.fpsMount.add(this.currentViewmodel);
    this.fpsMount.visible = this.mode === 'SHOOTING' && !this.inVehicle;
  }

  equipWeaponSlot(slotIdx) {
    if (!this.ownedWeapons.length) return;
    this.activeWeaponSlot = ((slotIdx % this.ownedWeapons.length) + this.ownedWeapons.length) % this.ownedWeapons.length;
    this.isReloading = false;
    this._rebuildFPSViewmodel();
  }

  equipSpecificWeapon(weaponId) {
    const idx = this.ownedWeapons.indexOf(weaponId);
    if (idx >= 0) this.equipWeaponSlot(idx);
  }

  streamZone(zoneId, announce = true) {
    const z = ZONES_DATA[zoneId];
    if (!z) return false;
    if (!this.unlockedZones.includes(zoneId)) {
      this.unlockedZones.push(zoneId);
    }

    this.exitVehicle();
    this._clearEnemies();

    this.currentZoneId = zoneId;
    const firstCp = z.checkpoints[0];
    if (firstCp && !this.unlockedCheckpoints.includes(firstCp.id)) {
      this.unlockedCheckpoints.push(firstCp.id);
    }

    this.worldBuilder.buildZone(zoneId, this.unlockedCheckpoints, this.completedRumors);
    this.playerPos.set(z.playerSpawn.x, 0, z.playerSpawn.z);
    this.playerVel.set(0, 0, 0);

    // Spawn Berline sedan in Zone 1 (Section 5.4)
    if (this.vehicle) {
      this.scene.remove(this.vehicle.car);
      this.vehicle = null;
    }
    if (z.carSpawn) {
      this._spawnBerlineAt(z.carSpawn.x, z.carSpawn.z);
    }

    // Spawn ambient patrol enemies so free-roam combat/shooting is immediately lively
    this.spawnEnemy('rusher', -14, -18);
    this.spawnEnemy('guard', 14, -22);
    this.spawnEnemy('marksman', 0, -32);

    if (announce) {
      this.notifyToast(z.name[this.lang]);
    }
    return true;
  }

  _spawnBerlineAt(x, z) {
    if (this.vehicle) {
      this.scene.remove(this.vehicle.car);
    }
    const rig = createBerlineCarMesh();
    rig.car.position.set(x, 0, z);
    this.scene.add(rig.car);
    this.vehicle = {
      ...rig,
      speed: 0,
      integrity: 100
    };
  }

  enterOrExitVehicle() {
    if (this.inVehicle) {
      this.exitVehicle();
      return;
    }
    if (!this.vehicle) return;
    if (this.playerPos.distanceTo(this.vehicle.car.position) <= 4.2) {
      this.inVehicle = true;
      this.playerRig.root.visible = false;
      this.fpsMount.visible = false;
      this.notifyToast(UI_STRINGS[this.lang].drive_exit_hint);
    }
  }

  exitVehicle() {
    if (!this.inVehicle || !this.vehicle) return;
    this.inVehicle = false;
    const offset = new THREE.Vector3(2.3, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicle.car.rotation.y);
    this.playerPos.copy(this.vehicle.car.position).add(offset);
    this.playerPos.y = 0;
    this.vehicle.speed = 0;
    this.playerRig.root.visible = this.mode !== 'SHOOTING';
    this.fpsMount.visible = this.mode === 'SHOOTING';
  }

  requestModeSwitch(targetMode, isCinematic = true) {
    if (targetMode === this.mode) return;
    if (this.inVehicle && targetMode !== 'EXPLORATION') {
      this.exitVehicle();
    }
    this.mode = targetMode;
    this.isAimingADS = false;
    this.playerRig.root.visible = this.mode !== 'SHOOTING';
    this.fpsMount.visible = this.mode === 'SHOOTING';
    if (this.mode === 'SHOOTING') {
      this._rebuildFPSViewmodel();
    }
    this.audio.setMode(targetMode);
    if (isCinematic && this.onCinematicTransition) {
      this.onCinematicTransition(targetMode);
    }
  }

  applyEnvironmentVisuals() {
    const timeKey = TIME_STATES[this.timeIndex % TIME_STATES.length];
    const presets = {
      DAWN: { bg: 0x1a1c33, fog: 0x242642, sun: 0xfb923c, intensity: 1.05, hemi: 0.78, sodium: 1.1 },
      DAY: { bg: 0x3b5878, fog: 0x4b6888, sun: 0xf8fafc, intensity: 1.65, hemi: 1.05, sodium: 0.35 },
      DUSK: { bg: 0x1f1629, fog: 0x2a1b30, sun: 0xd97706, intensity: 0.95, hemi: 0.72, sodium: 1.45 },
      NIGHT: { bg: 0x070b14, fog: 0x091122, sun: 0x60a5fa, intensity: 0.68, hemi: 0.62, sodium: 2.15 }
    };
    const p = presets[timeKey];
    this.scene.background.setHex(p.bg);
    this.scene.fog.color.setHex(p.fog);
    this.scene.fog.density = this.weather === 'RAIN' ? 0.012 : 0.0065;
    this.dirLight.color.setHex(p.sun);
    this.dirLight.intensity = p.intensity;
    this.hemiLight.intensity = p.hemi;
    this.sodiumFill.intensity = p.sodium;
    this.mats.asphalt.roughness = this.weather === 'RAIN' ? 0.16 : 0.58;
    this.rainPoints.visible = this.weather === 'RAIN';
    this.audio.setRain(this.weather === 'RAIN');
  }

  cycleTimeOfDay() {
    this.timeIndex = (this.timeIndex + 1) % TIME_STATES.length;
    this.applyEnvironmentVisuals();
  }

  toggleWeather() {
    this.weather = this.weather === 'RAIN' ? 'CLEAR' : 'RAIN';
    this.applyEnvironmentVisuals();
  }

  spawnEnemy(archetypeId, x, z, missionTagged = false) {
    const arch = ENEMY_ARCHETYPES[archetypeId] || ENEMY_ARCHETYPES.rusher;
    const built = createEnemyMesh(arch);
    built.group.position.set(x, 0, z);
    this.scene.add(built.group);

    const enemy = {
      id: `enm_${Math.random().toString(36).slice(2, 8)}`,
      arch,
      ...built,
      hp: arch.hp,
      maxHp: arch.hp,
      state: 'PATROL',
      timer: Math.random() * 0.8,
      staggerTimer: 0,
      originX: x,
      originZ: z,
      missionTagged
    };
    this.enemies.push(enemy);
    return enemy;
  }

  _clearEnemies(onlyMission = false) {
    this.enemies = this.enemies.filter((e) => {
      if (!onlyMission || e.missionTagged) {
        this.scene.remove(e.group);
        return false;
      }
      return true;
    });
    this.lockedEnemy = null;
  }

  // === CAMPAIGN & SIDE ACTIVITIES DIRECTOR (Section 6) ===
  launchCampaignMission(missionIndex = this.currentMissionIndex) {
    const idx = Math.max(0, Math.min(CAMPAIGN_MISSIONS.length - 1, missionIndex));
    this.currentMissionIndex = idx;
    const def = CAMPAIGN_MISSIONS[idx];

    if (this.currentZoneId !== def.zoneId) {
      this.unlockedZones.push(def.zoneId);
      this.streamZone(def.zoneId, false);
    } else {
      this._clearEnemies(false);
    }

    if (def.grantWeapon && !this.ownedWeapons.includes(def.grantWeapon)) {
      this.ownedWeapons.push(def.grantWeapon);
      this._rebuildFPSViewmodel();
    }

    if (def.spawnCarNearPlayer) {
      this._spawnBerlineAt(this.playerPos.x + 3.4, this.playerPos.z - 2.0);
    }

    if (def.resetPuzzle) {
      // Rebuild zone cleanly so puzzle starts fresh
      this.streamZone(def.zoneId, false);
      if (def.spawnCarNearPlayer) {
        this._spawnBerlineAt(this.playerPos.x + 3.4, this.playerPos.z - 2.0);
      }
    }

    this.activeMission = def;
    this.stageIndex = 0;
    this.missionTimer = 0;
    this.missionHeadshots = 0;
    this.missionPerfects = 0;
    this.health = this.getMaxHealth();
    this.stamina = this.getMaxStamina();

    if (this.onSubtitle && this.subtitlesEnabled) {
      this.onSubtitle(def.speaker, def.briefing[this.lang]);
    }
    this.audio.playVoiceTransmission(def.briefing[this.lang], this.lang);
    this._startMissionStage(0);
  }

  launchSideActivity(activityId) {
    const act = SIDE_ACTIVITIES.find((a) => a.id === activityId);
    if (!act) return;
    this._clearEnemies(false);
    this.activeMission = {
      id: act.id,
      isSide: true,
      title: act.name,
      bonusText: { fr: 'Contrat répétable de Fixer', en: 'Repeatable Fixer Contract' },
      rewardMoney: act.rewardMoney,
      rewardXp: act.rewardXp,
      rewardMat: act.rewardMat,
      rewardMatAmt: 1,
      stages: act.stages
    };
    this.stageIndex = 0;
    this.missionTimer = 0;
    this._startMissionStage(0);
  }

  _startMissionStage(idx) {
    if (!this.activeMission || idx >= this.activeMission.stages.length) {
      this._completeActiveMission();
      return;
    }
    this.stageIndex = idx;
    const st = this.activeMission.stages[idx];
    if (st.mode && st.mode !== this.mode) {
      this.requestModeSwitch(st.mode, Boolean(st.cinematic));
    }

    if (st.kind === 'WAYPOINT' || st.kind === 'SOLVE_PUZZLE') {
      this.activeWaypointMesh.position.set(st.target.x, 4.5, st.target.z);
      this.activeWaypointMesh.visible = true;
    } else if (st.kind === 'DEFEAT_WAVE') {
      this.activeWaypointMesh.visible = false;
      this._clearEnemies(true);
      st.spawns.forEach((sp) => {
        const e = this.spawnEnemy(sp.type, sp.x, sp.z, true);
        if (sp.type === 'shotgun_user') e.hp += 20;
      });
      if (st.mode === 'SHOOTING' && this.activeMission.grantWeapon) {
        this.equipSpecificWeapon(this.activeMission.grantWeapon);
      }
    }
  }

  onPuzzleSolved(puzzleType) {
    this.notifyToast(
      this.lang === 'fr' ? 'Mécanisme résolu ! Accès déverrouillé.' : 'Mechanism solved! Security unsealed.'
    );
    this.grantRewards(200, 90, 'cell', 1);
    if (this.activeMission) {
      const st = this.activeMission.stages[this.stageIndex];
      if (st && st.kind === 'SOLVE_PUZZLE' && st.puzzleType === puzzleType) {
        this._startMissionStage(this.stageIndex + 1);
      }
    }
  }

  _completeActiveMission() {
    const m = this.activeMission;
    if (!m) return;
    this.activeWaypointMesh.visible = false;
    this.hintHighlightMesh.visible = false;

    let bonusOk = true;
    if (m.bonusCheck === 'hp70') bonusOk = this.health >= this.getMaxHealth() * 0.7;
    else if (m.bonusCheck === 'hp50') bonusOk = this.health >= this.getMaxHealth() * 0.5;
    else if (m.bonusCheck === 'time90') bonusOk = this.missionTimer <= 90;
    else if (m.bonusCheck === 'headshot2') bonusOk = this.missionHeadshots >= 2;
    else if (m.bonusCheck === 'perfect1') bonusOk = this.missionPerfects >= 1;

    const moneyGain = Math.round(m.rewardMoney * (bonusOk ? 1.5 : 1.0));
    const xpGain = Math.round(m.rewardXp * (bonusOk ? 1.25 : 1.0));
    this.grantRewards(moneyGain, xpGain, m.rewardMat, m.rewardMatAmt || 1);

    if (m.unlocksZone && !this.unlockedZones.includes(m.unlocksZone)) {
      this.unlockedZones.push(m.unlocksZone);
    }

    if (m.reversal && this.onSubtitle) {
      this.onSubtitle('vaneck', m.reversal[this.lang]);
      this.audio.playVoiceTransmission(m.reversal[this.lang], this.lang);
    } else {
      this.notifyToast(
        `${m.title[this.lang]} — ${this.lang === 'fr' ? 'TERMINÉE' : 'COMPLETE'} (+${moneyGain} € · +${xpGain} XP)`
      );
    }

    if (!m.isSide) {
      this.currentMissionIndex = Math.min(CAMPAIGN_MISSIONS.length - 1, (m.number || 1));
    }
    this.activeMission = null;
    // Automatic save after every completed mission (Section 11.3)
    this.saveSystem.saveSlot(this.saveSystem.activeSlot, this.exportSaveData(), true);
  }

  grantRewards(moneyAmt, xpAmt, matId = null, matCount = 0) {
    const creditMult = this.hasSkill('exploration', 'beacon_intel') ? 1.25 : 1.0;
    this.money += Math.round(moneyAmt * creditMult);
    this.xp += xpAmt;
    while (this.xp >= this.level * 250) {
      this.xp -= this.level * 250;
      this.level++;
      this.skillPoints++;
      this.health = this.getMaxHealth();
      this.notifyToast(
        this.lang === 'fr'
          ? `Niveau supérieur ! Niveau ${this.level} (+1 Point de Compétence)`
          : `Level Up! Level ${this.level} (+1 Skill Point)`
      );
    }
    if (matId && matCount > 0 && this.materials[matId] !== undefined) {
      this.materials[matId] += matCount;
    }
  }

  collectCache(matId) {
    this.audio.playPuzzleTone(2);
    this.grantRewards(120, 45, matId, 1);
    Object.keys(WEAPONS_DATA).forEach((wId) => {
      this.ammoReserve[wId] = Math.min(WEAPONS_DATA[wId].maxReserve, (this.ammoReserve[wId] || 0) + 18);
    });
    this.notifyToast(
      this.lang === 'fr'
        ? '+120 € · +1 Matériau rare & Munitions récupérés !'
        : '+120 € · +1 Rare Material & Ammo resupplied!'
    );
  }

  talkToNPC(npc) {
    if (npc.rumorId && !this.completedRumors.includes(npc.rumorId)) {
      this.completedRumors.push(npc.rumorId);
      this.grantRewards(600, 160, 'polymer', 2);
      const msg =
        this.lang === 'fr'
          ? 'Rumeur découverte ! Cache secrète de l’unité Boréale localisée (+600 € · +2 Polymères).'
          : 'Rumor discovered! Hidden Boreal cache recovered (+600 € · +2 Polymers).';
      if (this.onSubtitle && this.subtitlesEnabled) this.onSubtitle('elena', msg);
      this.notifyToast(msg);
    } else {
      const line =
        this.lang === 'fr'
          ? 'Citoyen : « Les patrouilles d’Éclipse quadrillent le secteur dès la tombée de la nuit. Soyez prudent. »'
          : 'Citizen: "Eclipse patrols sweep the district every nightfall. Watch your back out there."';
      if (this.onSubtitle && this.subtitlesEnabled) this.onSubtitle('marcus', line);
    }
  }

  unlockCheckpoint(cpId) {
    if (!this.unlockedCheckpoints.includes(cpId)) {
      this.unlockedCheckpoints.push(cpId);
    }
  }

  saveManualCheckpoint(slot = this.saveSystem.activeSlot) {
    this.saveSystem.saveSlot(slot, this.exportSaveData(), false);
    this.notifyToast(`${UI_STRINGS[this.lang].saved_toast} (#${slot})`);
  }

  fastTravelTo(zoneId, cpX, cpZ) {
    if (this.currentZoneId !== zoneId) {
      this.streamZone(zoneId, false);
    }
    this.exitVehicle();
    this.playerPos.set(cpX + 1.5, 0, cpZ + 1.5);
    this.notifyToast(
      this.lang === 'fr' ? 'Déplacement rapide effectué.' : 'Fast travel completed.'
    );
  }

  unlockEverythingSandbox() {
    this.unlockedZones = ['zone_1_downtown', 'zone_2_industrial', 'zone_3_outskirts'];
    Object.values(ZONES_DATA).forEach((z) =>
      z.checkpoints.forEach((cp) => this.unlockCheckpoint(cp.id))
    );
    this.ownedWeapons = ['pistol', 'assault_rifle', 'shotgun', 'sniper_rifle'];
    this.ownedArmors = ['vest_light', 'vest_exo', 'gear_boots', 'gear_visor'];
    this.money += 3000;
    this.skillPoints += 4;
    this.materials.polymer += 5;
    this.materials.cell += 5;
    this.materials.alloy += 5;
    this._rebuildFPSViewmodel();
    this.notifyToast(
      this.lang === 'fr'
        ? 'Accès Intégral activé : 3 Zones, 4 Armes, Armures & Matériaux débloqués !'
        : 'Full Access unlocked: All 3 Zones, 4 Weapons, Armors & Materials granted!'
    );
  }

  notifyToast(msg) {
    if (this.onToast) this.onToast(msg);
  }

  // === SAVE / LOAD SERIALIZATION ===
  exportSaveData() {
    return {
      money: this.money,
      xp: this.xp,
      level: this.level,
      skillPoints: this.skillPoints,
      materials: { ...this.materials },
      ownedWeapons: [...this.ownedWeapons],
      equippedWeapons: [...this.equippedWeapons],
      weaponUpgrades: structuredClone(this.weaponUpgrades),
      ownedArmors: [...this.ownedArmors],
      equippedArmors: [...this.equippedArmors],
      unlockedSkills: structuredClone(this.unlockedSkills),
      currentZoneId: this.currentZoneId,
      unlockedZones: [...this.unlockedZones],
      unlockedCheckpoints: [...this.unlockedCheckpoints],
      completedRumors: [...this.completedRumors],
      currentMissionIndex: this.currentMissionIndex,
      timeIndex: this.timeIndex,
      weather: this.weather,
      playerPos: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
      lang: this.lang
    };
  }

  importSaveData(d) {
    if (!d) return false;
    this.money = d.money ?? 450;
    this.xp = d.xp ?? 0;
    this.level = d.level ?? 1;
    this.skillPoints = d.skillPoints ?? 1;
    this.materials = { polymer: 2, cell: 1, alloy: 0, ...(d.materials || {}) };
    this.ownedWeapons = d.ownedWeapons || ['pistol', 'assault_rifle'];
    this.equippedWeapons = d.equippedWeapons || ['pistol', 'assault_rifle'];
    this.weaponUpgrades = d.weaponUpgrades || { pistol: [], assault_rifle: [], shotgun: [], sniper_rifle: [] };
    this.ownedArmors = d.ownedArmors || ['vest_light'];
    this.equippedArmors = d.equippedArmors || ['vest_light', ''];
    this.unlockedSkills = d.unlockedSkills || { shooting: [], combat: [], exploration: [] };
    this.unlockedZones = d.unlockedZones || ['zone_1_downtown'];
    this.unlockedCheckpoints = d.unlockedCheckpoints || ['cp_z1_plaza'];
    this.completedRumors = d.completedRumors || [];
    this.currentMissionIndex = d.currentMissionIndex ?? 0;
    this.timeIndex = d.timeIndex ?? 3;
    this.weather = d.weather || 'RAIN';
    if (d.lang) this.lang = d.lang;

    this.streamZone(d.currentZoneId || 'zone_1_downtown', false);
    if (d.playerPos) {
      this.playerPos.set(d.playerPos.x, d.playerPos.y || 0, d.playerPos.z);
    }
    this.applyEnvironmentVisuals();
    this.health = this.getMaxHealth();
    this.stamina = this.getMaxStamina();
    this._rebuildFPSViewmodel();
    return true;
  }

  // === MAIN SIMULATION STEP ===
  step(rawDt, elapsedSec) {
    // Live FPS telemetry
    this._frameCounter++;
    this._fpsAccum += rawDt;
    if (this._fpsAccum >= 0.5) {
      this.fpsMeasured = Math.round(this._frameCounter / this._fpsAccum);
      this._frameCounter = 0;
      this._fpsAccum = 0;
    }

    const dt = Math.min(rawDt, 0.05);
    this._animateRain(dt);

    if (this.isPaused) {
      // Gentle cinematic camera orbit on Main Menu / Pause
      this.composer.render();
      this.input.consumeFrameDeltas(dt);
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.composer.render();
      return;
    }

    const gp = this.input.pollGamepadState(dt);

    // Quick weapon selection 1..4 & Sandbox Mode preview keys F1..F3
    if (this.input.keysJustPressed.has('Digit1')) this.equipWeaponSlot(0);
    if (this.input.keysJustPressed.has('Digit2')) this.equipWeaponSlot(1);
    if (this.input.keysJustPressed.has('Digit3')) this.equipWeaponSlot(2);
    if (this.input.keysJustPressed.has('Digit4')) this.equipWeaponSlot(3);
    if (this.input.keysJustPressed.has('F1')) this.requestModeSwitch('EXPLORATION', true);
    if (this.input.keysJustPressed.has('F2')) this.requestModeSwitch('COMBAT', true);
    if (this.input.keysJustPressed.has('F3')) this.requestModeSwitch('SHOOTING', true);

    if (this.input.wasActionPressed('hint')) {
      this.triggerManualPuzzleHint();
    }

    const look = this.input.consumeFrameDeltas(dt);
    this.yaw -= look.dx;
    this.pitch = Math.max(-1.18, Math.min(1.12, this.pitch - look.dy));

    if (this.inVehicle && this.vehicle) {
      this._updateVehicleDriving(dt, gp);
    } else {
      this._updatePlayerMovementAndActions(dt, elapsedSec, gp);
    }

    this._updateWorldPuzzlesAndNPCs(dt, elapsedSec);
    this._updateEnemies(dt, elapsedSec);
    this._updateAnimations(dt);
    this._updateTracers(dt);
    this._updateMissionProgress(dt, elapsedSec);
    this._updateCamera(dt);

    this.sodiumFill.position.set(this.playerPos.x, 11, this.playerPos.z);
    this.composer.render();
  }

  _animateRain(dt) {
    if (!this.rainPoints.visible) return;
    const pos = this.rainPoints.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - 28 * dt;
      if (y < 0) y = 26;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.rainPoints.position.set(this.playerPos.x, 0, this.playerPos.z);
  }

  _updateVehicleDriving(dt, gp) {
    const carObj = this.vehicle.car;
    if (this.input.wasActionPressed('interact') || gp.interact) {
      this.exitVehicle();
      return;
    }

    const forwardIn = (this.input.isActionDown('forward') ? 1 : 0) - (this.input.isActionDown('backward') ? 1 : 0) - gp.moveZ;
    const steerIn = (this.input.isActionDown('left') ? 1 : 0) - (this.input.isActionDown('right') ? 1 : 0) - gp.moveX;
    const maxSpd = this.hasSkill('exploration', 'urban_sprinter') ? 31 : 26;

    if (Math.abs(forwardIn) > 0.05) {
      this.vehicle.speed = THREE.MathUtils.clamp(this.vehicle.speed + forwardIn * 22 * dt, -12, maxSpd);
    } else {
      this.vehicle.speed = THREE.MathUtils.lerp(this.vehicle.speed, 0, Math.min(1, dt * 3.5));
    }
    if (this.input.isActionDown('jump')) {
      this.vehicle.speed = THREE.MathUtils.lerp(this.vehicle.speed, 0, Math.min(1, dt * 9));
    }

    if (Math.abs(this.vehicle.speed) > 0.5) {
      carObj.rotation.y += steerIn * 2.15 * dt * Math.sign(this.vehicle.speed);
    }

    const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), carObj.rotation.y);
    const nextX = THREE.MathUtils.clamp(carObj.position.x + fwd.x * this.vehicle.speed * dt, -90, 90);
    const nextZ = THREE.MathUtils.clamp(carObj.position.z + fwd.z * this.vehicle.speed * dt, -90, 90);

    // Check building collisions
    let blocked = false;
    for (const c of this.worldBuilder.colliders) {
      if (c.height > 1.2 && nextX > c.minX - 1.1 && nextX < c.maxX + 1.1 && nextZ > c.minZ - 1.1 && nextZ < c.maxZ + 1.1) {
        blocked = true;
        this.vehicle.speed *= -0.35;
        this.vehicle.integrity = Math.max(20, this.vehicle.integrity - 4);
        break;
      }
    }
    if (!blocked) {
      carObj.position.x = nextX;
      carObj.position.z = nextZ;
    }

    this.vehicle.wheels.forEach((w) => { w.rotation.x -= this.vehicle.speed * dt * 1.8; });
    this.playerPos.copy(carObj.position);
    this.yaw = carObj.rotation.y;
  }

  _updatePlayerMovementAndActions(dt, elapsedSec, gp) {
    // Cooldowns & regeneration
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.comboResetTimer = Math.max(0, this.comboResetTimer - dt);
    if (this.comboResetTimer <= 0) this.comboStep = 0;
    this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
    this.parryWindowTimer = Math.max(0, this.parryWindowTimer - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.recoilVisual = THREE.MathUtils.lerp(this.recoilVisual, 0, Math.min(1, dt * 14));
    this.dynamicSpread = THREE.MathUtils.lerp(this.dynamicSpread, 0, Math.min(1, dt * 8));
    this.slashFade = Math.max(0, this.slashFade - dt * 4.2);

    this.playerRig.slashMat.opacity = this.slashFade;
    this.playerRig.shieldMesh.material.opacity = this.parryWindowTimer > 0 ? 0.55 : 0;

    // Stamina recovery
    const stamRate = this.hasSkill('combat', 'second_wind') ? 28 : 20;
    if (this.dodgeTimer <= 0 && this.attackCooldown <= 0) {
      this.stamina = Math.min(this.getMaxStamina(), this.stamina + stamRate * dt);
    }

    // Health regeneration after delay out of fire (Section 5.3)
    const regenDelay = this.equippedArmors.includes('gear_visor') ? 2.8 : 4.0;
    if (elapsedSec - this.lastDamageTime > regenDelay && this.health < this.getMaxHealth()) {
      this.health = Math.min(this.getMaxHealth(), this.health + 12 * dt);
    }

    // Input direction
    let ix = (this.input.isActionDown('right') ? 1 : 0) - (this.input.isActionDown('left') ? 1 : 0) + gp.moveX;
    let iz = (this.input.isActionDown('backward') ? 1 : 0) - (this.input.isActionDown('forward') ? 1 : 0) + gp.moveZ;
    const moveVec = new THREE.Vector3(ix, 0, iz);
    if (moveVec.lengthSq() > 1) moveVec.normalize();
    moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const sprinting = (this.input.isActionDown('sprint') || gp.sprint) && this.stamina > 6 && !this.isAimingADS;
    const baseSpeed = (sprinting ? 9.0 : 5.6) * (this.hasSkill('exploration', 'urban_sprinter') ? 1.18 : 1.0);
    if (sprinting && moveVec.lengthSq() > 0.05) {
      this.stamina = Math.max(0, this.stamina - 14 * dt);
    }

    if (this.dodgeTimer > 0) {
      this.playerVel.x = this.dodgeDir.x * 14.5;
      this.playerVel.z = this.dodgeDir.z * 14.5;
    } else {
      this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, moveVec.x * baseSpeed, Math.min(1, dt * 13));
      this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, moveVec.z * baseSpeed, Math.min(1, dt * 13));
    }

    // Jump & Ledge Mantling (Section 5.1)
    if (this.onGround && (this.input.wasActionPressed('jump') || gp.jump)) {
      this.playerVel.y = 8.2;
      this.onGround = false;
    }
    this.playerVel.y -= 22.0 * dt;

    // Integrate & resolve world collisions + moving platforms + climbable ledges
    let nextX = THREE.MathUtils.clamp(this.playerPos.x + this.playerVel.x * dt, -92, 92);
    let nextZ = THREE.MathUtils.clamp(this.playerPos.z + this.playerVel.z * dt, -92, 92);
    let nextY = this.playerPos.y + this.playerVel.y * dt;
    let supportHeight = 0;

    for (const c of this.worldBuilder.colliders) {
      const insideXZ = nextX > c.minX - 0.42 && nextX < c.maxX + 0.42 && nextZ > c.minZ - 0.42 && nextZ < c.maxZ + 0.42;
      if (!insideXZ) continue;
      if (this.playerPos.y >= c.height - 0.25) {
        supportHeight = Math.max(supportHeight, c.height);
      } else if (c.climbable && c.height <= 1.65 && (this.input.isActionDown('jump') || !this.onGround)) {
        // Automatic obstacle climb / mantle!
        nextY = Math.max(nextY, c.height);
        supportHeight = Math.max(supportHeight, c.height);
        this.playerVel.y = 0;
      } else {
        // Slide out cleanly on nearest axis
        const penLeft = Math.abs(nextX - (c.minX - 0.42));
        const penRight = Math.abs(c.maxX + 0.42 - nextX);
        const penTop = Math.abs(nextZ - (c.minZ - 0.42));
        const penBot = Math.abs(c.maxZ + 0.42 - nextZ);
        const minPen = Math.min(penLeft, penRight, penTop, penBot);
        if (minPen === penLeft) nextX = c.minX - 0.42;
        else if (minPen === penRight) nextX = c.maxX + 0.42;
        else if (minPen === penTop) nextZ = c.minZ - 0.42;
        else nextZ = c.maxZ + 0.42;
      }
    }

    if (nextY <= supportHeight) {
      nextY = supportHeight;
      this.playerVel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    this.playerPos.set(nextX, nextY, nextZ);
    this.playerRig.root.position.copy(this.playerPos);

    // Character limb animation
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    // Rigged-model players are animated by CharacterAnimator (see _updateAnimations);
    // the procedural limb swing only drives the primitive fallback rig.
    if (horizSpeed > 0.35) {
      if (!this.playerRig.isModel) {
        this.walkCycle += dt * horizSpeed * 1.45;
        const swing = Math.sin(this.walkCycle) * 0.55;
        this.playerRig.leftLegPivot.rotation.x = swing;
        this.playerRig.rightLegPivot.rotation.x = -swing;
        this.playerRig.leftArmPivot.rotation.x = -swing * 0.7;
        if (this.attackCooldown <= 0) this.playerRig.rightArmPivot.rotation.x = swing * 0.7;
      }
      this.playerRig.root.rotation.y = Math.atan2(-this.playerVel.x, -this.playerVel.z) + Math.PI;
    } else {
      if (!this.playerRig.isModel) {
        this.playerRig.leftLegPivot.rotation.x *= 0.85;
        this.playerRig.rightLegPivot.rotation.x *= 0.85;
      }
      this.playerRig.root.rotation.y = this.yaw;
    }

    // Contextual Interaction scan [E]
    this._updateContextualInteraction(gp);

    // Mode-specific Combat / FPS actions
    if (this.mode === 'COMBAT') {
      if (this.input.wasActionPressed('lockTarget')) {
        this._toggleLockOn();
      }
      if (this.lockedEnemy && this.lockedEnemy.hp > 0) {
        const dx = this.lockedEnemy.group.position.x - this.playerPos.x;
        const dz = this.lockedEnemy.group.position.z - this.playerPos.z;
        this.yaw = Math.atan2(-dx, -dz);
        this.playerRig.root.rotation.y = this.yaw;
      }
      if (this.input.wasActionPressed('dodge') || gp.dodge) {
        this.triggerDodge(moveVec);
      }
      if (this.input.wasActionPressed('parry') || gp.parry) {
        this.triggerParry();
      }
      if (this.input.mouseJustPressed.has(0) || gp.primary) {
        this.triggerMeleeStrike(false);
      } else if (this.input.mouseJustPressed.has(2) || this.input.wasActionPressed('heavy') || gp.secondary) {
        this.triggerMeleeStrike(true);
      }
    } else if (this.mode === 'SHOOTING') {
      this.isAimingADS = this.input.mouseButtons.has(2) || gp.secondary;
      if (this.isReloading) {
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) this._completeReload();
      } else {
        if (this.input.wasActionPressed('reload') || gp.reload) {
          this.startReload();
        } else {
          const wpn = this.getCurrentWeaponData();
          const fireTriggered = wpn.auto
            ? this.input.mouseButtons.has(0) || gp.primary
            : this.input.mouseJustPressed.has(0) || gp.primary;
          if (fireTriggered) this.fireCurrentWeapon();
        }
      }
    } else {
      // Exploration Mode: quick melee swing if clicking close to an enemy!
      if (this.input.mouseJustPressed.has(0) && this._findNearestEnemy(4.5)) {
        this.triggerMeleeStrike(false);
      }
    }
  }

  _updateContextualInteraction(gp) {
    this.currentContextPrompt = '';
    if (this.vehicle && !this.inVehicle && this.playerPos.distanceTo(this.vehicle.car.position) <= 4.2) {
      this.currentContextPrompt = UI_STRINGS[this.lang].drive_exit_hint;
      if (this.input.wasActionPressed('interact') || gp.interact) {
        this.enterOrExitVehicle();
        return;
      }
    }

    let nearest = null;
    let minDist = Infinity;
    for (const item of this.worldBuilder.interactables) {
      if (item.collected) continue;
      const d = Math.hypot(this.playerPos.x - item.x, this.playerPos.z - item.z);
      if (d <= item.radius && d < minDist) {
        minDist = d;
        nearest = item;
      }
    }

    if (nearest) {
      this.currentContextPrompt = this.lang === 'fr' ? nearest.labelFr : nearest.labelEn;
      if (this.input.wasActionPressed('interact') || gp.interact) {
        nearest.onInteract(this);
      }
    }
  }

  // === MELEE COMBAT ACTIONS (Section 5.2: 3 Light + 1 Heavy, Dodge i-frames, Parry, Stamina, Hitstop) ===
  triggerMeleeStrike(isHeavy) {
    if (this.attackCooldown > 0) return;
    const cost = isHeavy ? 22 : 9;
    if (this.stamina < cost) return;
    this.stamina -= cost;

    if (isHeavy) {
      this.comboStep = 4;
      this.attackCooldown = 0.38;
      this.playerRig.slashMat.color.setHex(0xf59e0b);
      this.playerRig.slashArc.scale.setScalar(1.32);
    } else {
      this.comboStep = (this.comboStep % 3) + 1;
      this.attackCooldown = 0.24;
      this.playerRig.slashMat.color.setHex(0x38bdf8);
      this.playerRig.slashArc.scale.setScalar(1.0);
    }
    this.comboResetTimer = 1.4;
    this.slashFade = 0.92;
    this.playerRig.poseAttack(-1.35);
    this.audio.playMelee(isHeavy);

    // Soft-assist toward nearest close enemy for visceral GoW feel
    const assistTarget = this.lockedEnemy && this.lockedEnemy.hp > 0 ? this.lockedEnemy : this._findNearestEnemy(4.2);
    if (assistTarget) {
      const dx = assistTarget.group.position.x - this.playerPos.x;
      const dz = assistTarget.group.position.z - this.playerPos.z;
      this.playerRig.root.rotation.y = Math.atan2(-dx, -dz);
    }

    let baseDmg = isHeavy ? 48 : 22 + this.comboStep * 5;
    if (this.hasSkill('combat', 'iron_fist')) baseDmg *= 1.25;
    const hitRadius = isHeavy && this.hasSkill('combat', 'eclipse_counter') ? 4.4 : 3.6;

    let hitCount = 0;
    this.enemies.forEach((e) => {
      if (e.hp <= 0) return;
      const d = this.playerPos.distanceTo(e.group.position);
      if (d <= hitRadius) {
        let dmg = baseDmg;
        let label = '';
        if (e.arch.shielded && e.staggerTimer <= 0 && !isHeavy) {
          dmg *= 0.2;
          label = this.lang === 'fr' ? 'BLOQUÉ (Attaque Lourde [F] !)' : 'BLOCKED (Use Heavy [F]!)';
        } else if (e.arch.shielded && isHeavy) {
          e.staggerTimer = 2.0;
          label = this.lang === 'fr' ? 'GARDE BRISÉE !' : 'GUARD BROKEN!';
        }
        if (e.staggerTimer > 0) dmg *= 1.45;
        this._damageEnemy(e, dmg, false, label);
        hitCount++;
      }
    });

    if (hitCount > 0 && isHeavy) {
      this.hitstopTimer = 0.065; // Micro-pause Hitstop (Section 5.2)
    }

    // Alert nearby NPCs (Section 5.1)
    this._alertNearbyNPCs();
  }

  triggerDodge(moveVec) {
    if (this.dodgeTimer > 0 || this.stamina < 16) return;
    this.stamina -= 16;
    this.dodgeTimer = 0.34; // Invulnerability frames!
    if (moveVec.lengthSq() > 0.05) {
      this.dodgeDir.copy(moveVec).normalize();
    } else {
      this.dodgeDir.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    }
  }

  triggerParry() {
    this.parryWindowTimer = this.hasSkill('combat', 'eclipse_counter') ? 0.38 : 0.28;
  }

  _toggleLockOn() {
    if (this.lockedEnemy) {
      this.lockedEnemy = null;
      return;
    }
    this.lockedEnemy = this._findNearestEnemy(22);
  }

  _findNearestEnemy(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = this.playerPos.distanceTo(e.group.position);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  // === FPS SHOOTING ACTIONS (Section 5.3: 4 Weapons, Ammo/Reload, Recoil/Spread/ADS, Raycast + Tracers) ===
  fireCurrentWeapon() {
    const wpn = this.getCurrentWeaponData();
    if (!wpn || this.fireCooldown > 0 || this.isReloading) return;

    const curMag = this.ammoInMag[wpn.id] ?? 0;
    if (curMag <= 0) {
      this.startReload();
      return;
    }

    this.ammoInMag[wpn.id] = curMag - 1;
    const rateMult = this.weaponUpgrades[wpn.id]?.includes('titanium_bolt') ? 1.18 : 1.0;
    this.fireCooldown = 1.0 / (wpn.fireRate * rateMult);

    let recoilScale = 1.0;
    if (this.hasSkill('shooting', 'steady_aim')) recoilScale *= 0.75;
    if (this.weaponUpgrades[wpn.id]?.includes('compensator')) recoilScale *= 0.65;

    this.pitch = Math.min(1.12, this.pitch + wpn.recoil * 0.05 * recoilScale);
    this.recoilVisual = Math.min(0.14, this.recoilVisual + wpn.recoil * 0.14);
    this.dynamicSpread = Math.min(0.06, this.dynamicSpread + wpn.recoil * 0.03);

    if (this.currentViewmodel?.userData.muzzleFlash) {
      this.currentViewmodel.userData.muzzleFlash.intensity = 3.5;
    }
    this.audio.playGunshot(wpn.id);
    this._alertNearbyNPCs();

    let dmgMult = 1.0;
    if (this.hasSkill('shooting', 'surgical_rounds')) dmgMult += 0.25;
    if (this.weaponUpgrades[wpn.id]?.includes('match_barrel')) dmgMult += 0.2;

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    const enemyMeshes = [];
    this.enemies.forEach((e) => {
      if (e.hp > 0) enemyMeshes.push(e.group);
    });

    for (let p = 0; p < wpn.pellets; p++) {
      const spread = ((this.isAimingADS ? wpn.spreadAds : wpn.spreadHip) + this.dynamicSpread * 0.4) * recoilScale;
      const dir = forward
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * spread * 2,
            (Math.random() - 0.5) * spread * 2,
            (Math.random() - 0.5) * spread * 2
          )
        )
        .normalize();

      const ray = new THREE.Raycaster(origin, dir, 0.2, wpn.range);
      const hits = ray.intersectObjects(enemyMeshes, true);
      let endPt = origin.clone().addScaledVector(dir, Math.min(wpn.range, 48));

      if (hits.length > 0) {
        const first = hits[0];
        endPt = first.point;
        const hitEnemy = this.enemies.find((e) => {
          let cur = first.object;
          while (cur) {
            if (cur === e.group) return true;
            cur = cur.parent;
          }
          return false;
        });

        if (hitEnemy) {
          const isHeadshot = first.point.y - hitEnemy.group.position.y > 1.5;
          const totalDmg = wpn.damage * dmgMult * (isHeadshot ? wpn.critMult : 1.0);
          if (isHeadshot) this.missionHeadshots++;
          this.audio.playHitmarker(isHeadshot);
          this.onHitmarker?.(isHeadshot);
          this._damageEnemy(hitEnemy, totalDmg, isHeadshot, isHeadshot ? 'CRIT!' : '');
        }
      }
      this._spawnTracer(origin.clone().addScaledVector(dir, 0.65), endPt, wpn.color);
    }
  }

  startReload() {
    const wpn = this.getCurrentWeaponData();
    if (!wpn || this.isReloading) return;
    const maxMag = this.getEffectiveMagSize(wpn.id);
    if ((this.ammoInMag[wpn.id] ?? 0) >= maxMag || (this.ammoReserve[wpn.id] ?? 0) <= 0) return;
    this.isReloading = true;
    const speedFactor = this.hasSkill('shooting', 'tactical_reload') ? 0.75 : 1.0;
    this.reloadTimer = wpn.reloadTime * speedFactor;
    this.audio.playPuzzleTone(0);
  }

  _completeReload() {
    const wpn = this.getCurrentWeaponData();
    this.isReloading = false;
    if (!wpn) return;
    const maxMag = this.getEffectiveMagSize(wpn.id);
    const needed = maxMag - (this.ammoInMag[wpn.id] ?? 0);
    const take = Math.min(needed, this.ammoReserve[wpn.id] ?? 0);
    this.ammoInMag[wpn.id] = (this.ammoInMag[wpn.id] ?? 0) + take;
    this.ammoReserve[wpn.id] = (this.ammoReserve[wpn.id] ?? 0) - take;
  }

  _spawnTracer(start, end, hexColor) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: hexColor, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, mat, life: 0.09 });
  }

  _updateTracers(dt) {
    this.tracers = this.tracers.filter((tr) => {
      tr.life -= dt;
      tr.mat.opacity = Math.max(0, tr.life * 9);
      if (tr.life <= 0) {
        this.scene.remove(tr.line);
        tr.line.geometry.dispose();
        tr.mat.dispose();
        return false;
      }
      return true;
    });
  }

  _damageEnemy(enemy, amount, isCrit, tagText = '') {
    enemy.hp = Math.max(0, enemy.hp - amount);
    const pct = Math.max(0, enemy.hp / enemy.maxHp);
    enemy.hpFill.scale.x = Math.max(0.001, pct);

    const screenPos = this.projectToScreen(enemy.group.position.clone().add(new THREE.Vector3(0, 2.1, 0)));
    if (screenPos && this.onFloatingText) {
      const txt = tagText ? `${Math.round(amount)} ${tagText}` : `${Math.round(amount)}`;
      this.onFloatingText(screenPos.x, screenPos.y, txt, isCrit || Boolean(tagText));
    }

    if (enemy.hp <= 0) {
      this.scene.remove(enemy.group);
      this.grantRewards(enemy.arch.money, enemy.arch.xp);
      if (this.lockedEnemy === enemy) this.lockedEnemy = null;
    }
  }

  // === ENEMY AI STATE MACHINE (Section 5.2 & 5.3) ===
  /** Advance skeletal animation for the player, enemies and civilians (model-based rigs). */
  _updateAnimations(dt) {
    this.playerRig.anim?.update(dt);
    for (const e of this.enemies) e.anim?.update(dt);
    for (const npc of this.worldBuilder.npcs) npc.anim?.update(dt);
  }

  _updateEnemies(dt, elapsedSec) {
    this.enemies = this.enemies.filter((e) => e.hp > 0);
    for (const e of this.enemies) {
      e.hpBg.lookAt(this.camera.position);
      e.hpFill.lookAt(this.camera.position);

      if (e.staggerTimer > 0) {
        e.staggerTimer -= dt;
        e.telegraphRing.material.opacity = 0;
        continue;
      }

      const dx = this.playerPos.x - e.group.position.x;
      const dz = this.playerPos.z - e.group.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 38 && !e.missionTagged) {
        // Gentle patrol
        const px = e.originX + Math.sin(elapsedSec + e.originZ) * 3.0;
        e.group.position.x = THREE.MathUtils.lerp(e.group.position.x, px, dt * 1.2);
        continue;
      }

      e.group.rotation.y = Math.atan2(dx, dz);

      if (e.arch.behavior === 'RANGED') {
        // Tactical cover-seeking ranged behavior (Section 5.3)
        if (dist > 16) {
          e.group.position.x += (dx / dist) * e.arch.speed * dt;
          e.group.position.z += (dz / dist) * e.arch.speed * dt;
        } else if (dist < 8.5) {
          e.group.position.x -= (dx / dist) * e.arch.speed * 0.8 * dt;
          e.group.position.z -= (dz / dist) * e.arch.speed * 0.8 * dt;
        }
        e.timer -= dt;
        e.telegraphRing.material.opacity = e.timer < 0.35 ? 0.65 : 0;
        if (e.timer <= 0 && dist <= e.arch.range) {
          e.timer = 1.65;
          const muzzle = e.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
          const target = this.playerPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.1, 0));
          this._spawnTracer(muzzle, target, 0xef4444);
          this._applyIncomingAttack(e, e.arch.damage * 0.85, elapsedSec);
        }
      } else {
        // Melee Rusher & Shielded Bastion
        if (dist > e.arch.range) {
          e.group.position.x += (dx / dist) * e.arch.speed * dt;
          e.group.position.z += (dz / dist) * e.arch.speed * dt;
          e.telegraphRing.material.opacity = 0;
          e.timer = Math.min(e.timer, 0.38);
        } else {
          e.timer -= dt;
          // Visible amber wind-up ring right before melee hit for clean player Parry timing!
          e.telegraphRing.material.opacity = e.timer > 0 && e.timer < 0.36 ? 0.85 : 0;
          if (e.timer <= 0) {
            e.timer = 1.45;
            this._applyIncomingAttack(e, e.arch.damage, elapsedSec);
          }
        }
      }
    }
  }

  _applyIncomingAttack(enemy, rawDamage, elapsedSec) {
    if (this.dodgeTimer > 0) {
      this.missionPerfects++;
      const sp = this.projectToScreen(this.playerPos.clone().add(new THREE.Vector3(0, 2, 0)));
      if (sp) this.onFloatingText?.(sp.x, sp.y, this.lang === 'fr' ? 'ESQUIVE PARFAITE !' : 'PERFECT DODGE!', true);
      return;
    }
    if (this.parryWindowTimer > 0) {
      this.parryWindowTimer = 0;
      this.missionPerfects++;
      enemy.staggerTimer = 2.2;
      this.hitstopTimer = 0.065;
      this.audio.playParryClang();
      if (this.hasSkill('combat', 'eclipse_counter')) {
        this.health = Math.min(this.getMaxHealth(), this.health + 15);
      }
      const sp = this.projectToScreen(this.playerPos.clone().add(new THREE.Vector3(0, 2, 0)));
      if (sp) this.onFloatingText?.(sp.x, sp.y, this.lang === 'fr' ? 'PARADE PARFAITE !' : 'PERFECT PARRY!', true);
      return;
    }

    let reduction = 0;
    this.equippedArmors.forEach((id) => {
      if (ARMORS_DATA[id]) reduction += ARMORS_DATA[id].dmgReduction;
    });
    const dmg = Math.max(2, rawDamage * (1 - Math.min(0.5, reduction)));
    this.health = Math.max(0, this.health - dmg);
    this.lastDamageTime = elapsedSec;

    const angleToAttacker =
      Math.atan2(enemy.group.position.x - this.playerPos.x, enemy.group.position.z - this.playerPos.z) - this.yaw;
    this.onDirectionalDamage?.(angleToAttacker);

    if (this.health <= 0) {
      // Respawn at active zone checkpoint with half mercy restore (zero blocking game-over crash!)
      this.health = this.getMaxHealth();
      this.stamina = this.getMaxStamina();
      const z = ZONES_DATA[this.currentZoneId];
      this.playerPos.set(z.playerSpawn.x, 0, z.playerSpawn.z);
      this.notifyToast(
        this.lang === 'fr'
          ? 'Évacuation d’urgence vers le dernier point de contrôle.'
          : 'Emergency extraction to nearest checkpoint.'
      );
    }
  }

  _alertNearbyNPCs() {
    for (const npc of this.worldBuilder.npcs) {
      const d = Math.hypot(npc.group.position.x - this.playerPos.x, npc.group.position.z - this.playerPos.z);
      if (d < 22) {
        if (npc.profile === 'FLEE') npc.fleeTimer = 6.0;
        else if (npc.profile === 'ALERT' && npc.fleeTimer <= 0) {
          npc.fleeTimer = 6.0;
          this.notifyToast(
            this.lang === 'fr' ? 'Un informateur civil a donné l’alerte !' : 'A civilian informant alerted nearby guards!'
          );
        }
      }
    }
  }

  _updateWorldPuzzlesAndNPCs(dt, elapsedSec) {
    // Animate moving platforms & carry player physically!
    const platPuzzle = this.worldBuilder.puzzles.platforms;
    if (platPuzzle && platPuzzle.powered) {
      platPuzzle.phase += dt * 1.25;
      const prevAx = platPuzzle.platA.position.x;
      const newAx = platPuzzle.baseX + Math.sin(platPuzzle.phase) * 3.2;
      platPuzzle.platA.position.x = newAx;
      platPuzzle.platB.position.x = platPuzzle.baseX - Math.sin(platPuzzle.phase) * 3.2;
      if (this.playerPos.distanceTo(platPuzzle.platA.position) < 2.3) {
        this.playerPos.x += newAx - prevAx;
        this.playerPos.y = Math.max(this.playerPos.y, 0.62);
      } else if (this.playerPos.distanceTo(platPuzzle.platB.position) < 2.3) {
        this.playerPos.x -= newAx - prevAx;
        this.playerPos.y = Math.max(this.playerPos.y, 0.62);
      }
    }

    // Progressive puzzle hints (Section 5.5: automatic 15s & 30s hints!)
    this.hintHighlightMesh.visible = false;
    Object.values(this.worldBuilder.puzzles).forEach((pz) => {
      if (pz.solved) return;
      pz.timer += dt;
      if (pz.timer > 15 && pz.hintStage < 2) {
        pz.hintStage = 2;
        this.notifyToast(
          this.lang === 'fr'
            ? 'Indice Puzzle : Appuyez sur [H] pour illuminer le prochain élément à activer.'
            : 'Puzzle Hint: Press [H] to highlight the exact next mechanism node.'
        );
      }
      if (pz.hintStage >= 3) {
        const target = this._getNextPuzzleNodePosition(pz);
        if (target) {
          this.hintHighlightMesh.visible = true;
          this.hintHighlightMesh.position.set(target.x, 2.6 + Math.sin(elapsedSec * 4) * 0.25, target.z);
          this.hintHighlightMesh.rotation.y += dt * 2.5;
        }
      }
    });

    // Update NPCs
    for (const npc of this.worldBuilder.npcs) {
      npc.phase += dt;
      if (npc.fleeTimer > 0) {
        npc.fleeTimer -= dt;
        const ax = npc.group.position.x - this.playerPos.x;
        const az = npc.group.position.z - this.playerPos.z;
        const len = Math.max(0.1, Math.hypot(ax, az));
        npc.group.position.x += (ax / len) * 5.2 * dt;
        npc.group.position.z += (az / len) * 5.2 * dt;
      } else {
        const tx = npc.homeX + Math.cos(npc.phase * 0.6) * 2.4;
        const tz = npc.homeZ + Math.sin(npc.phase * 0.6) * 2.4;
        npc.group.position.x = THREE.MathUtils.lerp(npc.group.position.x, tx, dt * 1.5);
        npc.group.position.z = THREE.MathUtils.lerp(npc.group.position.z, tz, dt * 1.5);
      }
    }
  }

  triggerManualPuzzleHint() {
    let shown = false;
    Object.values(this.worldBuilder.puzzles).forEach((pz) => {
      if (!pz.solved) {
        pz.hintStage = 3;
        shown = true;
      }
    });
    this.notifyToast(
      shown
        ? this.lang === 'fr'
          ? 'Indice progressif activé : un losange doré flotte au-dessus de la prochaine action !'
          : 'Progressive Hint active: follow the floating golden beacon!'
        : this.lang === 'fr'
          ? 'Tous les puzzles de cette zone sont déjà résolus.'
          : 'All puzzles in this sector are already solved.'
    );
  }

  _getNextPuzzleNodePosition(pz) {
    if (pz.type === 'levers') {
      const idx = pz.states.findIndex((s) => !s);
      const item = this.worldBuilder.interactables.find((i) => i.id === `lever_${idx}`);
      return item || null;
    }
    if (pz.type === 'platforms') {
      const id = pz.powered ? 'platform_goal' : 'platform_relay';
      return this.worldBuilder.interactables.find((i) => i.id === id) || null;
    }
    if (pz.type === 'sequence') {
      return this.worldBuilder.interactables.find((i) => i.id === `seq_pylon_${pz.progress}`) || null;
    }
    return null;
  }

  _updateMissionProgress(dt, elapsedSec) {
    if (!this.activeMission) return;
    this.missionTimer += dt;
    this.activeWaypointMesh.rotation.y = elapsedSec * 1.4;

    const st = this.activeMission.stages[this.stageIndex];
    if (!st) return;

    if (st.kind === 'WAYPOINT') {
      const d = Math.hypot(this.playerPos.x - st.target.x, this.playerPos.z - st.target.z);
      if (d <= 4.2) {
        this.audio.playPuzzleTone(3);
        this._startMissionStage(this.stageIndex + 1);
      }
    } else if (st.kind === 'DEFEAT_WAVE') {
      const remaining = this.enemies.filter((e) => e.missionTagged && e.hp > 0).length;
      if (remaining === 0) {
        this._startMissionStage(this.stageIndex + 1);
      }
    }
  }

  // === CAMERA CONTROLLER WITH RAYCAST WALL COLLISION (Sections 5.1, 5.2, 5.3) ===
  _updateCamera(dt) {
    if (this.inVehicle && this.vehicle) {
      const back = new THREE.Vector3(0, 2.8, 7.2).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.vehicle.car.rotation.y
      );
      const desired = this.vehicle.car.position.clone().add(back);
      this.camera.position.lerp(desired, Math.min(1, dt * 8));
      this.camera.lookAt(this.vehicle.car.position.clone().add(new THREE.Vector3(0, 1.1, 0)));
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 72 + Math.abs(this.vehicle.speed) * 0.4, dt * 6);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.mode === 'SHOOTING') {
      const wpn = this.getCurrentWeaponData();
      this.camera.position.set(this.playerPos.x, this.playerPos.y + 1.62, this.playerPos.z);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = this.pitch;

      const targetFov = this.isAimingADS ? wpn.adsFov : 75;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1, dt * 14));
      this.camera.updateProjectionMatrix();

      // Smooth ADS weapon centering & recoil kick
      const targetX = this.isAimingADS ? 0.0 : 0.24;
      const targetY = this.isAimingADS ? -0.145 : -0.22;
      this.fpsMount.position.x = THREE.MathUtils.lerp(this.fpsMount.position.x, targetX, Math.min(1, dt * 15));
      this.fpsMount.position.y = THREE.MathUtils.lerp(this.fpsMount.position.y, targetY, Math.min(1, dt * 15));
      this.fpsMount.position.z = -0.44 + this.recoilVisual + (this.isReloading ? 0.14 : 0);
      this.fpsMount.rotation.x = this.isReloading ? -0.55 : this.recoilVisual * 1.4;
      this.fpsMount.visible = !(this.isAimingADS && wpn.hasScope);

      if (this.currentViewmodel?.userData.muzzleFlash) {
        this.currentViewmodel.userData.muzzleFlash.intensity *= 0.65;
      }
      return;
    }

    // 3rd-Person Rear (Exploration) vs Over-the-Shoulder (Combat) Camera with Wall Collision!
    const dist = this.mode === 'COMBAT' ? 3.25 : 4.85;
    const shoulderX = this.mode === 'COMBAT' ? 0.72 : 0.0;
    const pivot = new THREE.Vector3(this.playerPos.x, this.playerPos.y + 1.55, this.playerPos.z);

    const offset = new THREE.Vector3(
      shoulderX,
      Math.sin(-this.pitch) * dist * 0.72 + 0.35,
      Math.cos(-this.pitch) * dist
    ).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const desiredCam = pivot.clone().add(offset);
    desiredCam.y = Math.max(this.playerPos.y + 0.55, desiredCam.y);

    // Clamp against solid buildings along ray segment so camera never clips inside walls!
    for (let t = 0.25; t <= 1.0; t += 0.15) {
      const sample = pivot.clone().lerp(desiredCam, t);
      const hitWall = this.worldBuilder.colliders.some(
        (c) =>
          sample.y < c.height &&
          sample.x > c.minX - 0.3 &&
          sample.x < c.maxX + 0.3 &&
          sample.z > c.minZ - 0.3 &&
          sample.z < c.maxZ + 0.3
      );
      if (hitWall) {
        desiredCam.copy(pivot.clone().lerp(desiredCam, Math.max(0.2, t - 0.15)));
        break;
      }
    }

    this.camera.position.lerp(desiredCam, Math.min(1, dt * 14));
    const lookTarget = pivot.clone().add(
      new THREE.Vector3(shoulderX * 0.35, 0, -6).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw)
    );
    this.camera.lookAt(lookTarget);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.mode === 'COMBAT' ? 64 : 68, dt * 10);
    this.camera.updateProjectionMatrix();
  }

  projectToScreen(worldVec) {
    const v = worldVec.clone().project(this.camera);
    if (v.z > 1) return null;
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight
    };
  }
}

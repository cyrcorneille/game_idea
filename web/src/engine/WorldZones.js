/**
 * NEXUS — Streamed 3D Open-World Zones, Collision Solver & Environmental Puzzles (Sections 4 & 5.5).
 * Builds Zone 1 (Downtown), Zone 2 (Industrial Docks), Zone 3 (Forest Outskirts) cleanly < 450 objects.
 */

import * as THREE from 'three';

export class WorldZoneBuilder {
  constructor(scene, mats) {
    this.scene = scene;
    this.mats = mats;
    this.zoneGroup = new THREE.Group();
    this.scene.add(this.zoneGroup);

    this.colliders = []; // { minX, maxX, minZ, maxZ, height, climbable }
    this.interactables = []; // { id, type, x, y, z, radius, labelFr, labelEn, onInteract, data, mesh }
    this.npcs = [];
    this.puzzles = {};
    this.activeObjectCount = 0;
  }

  clearZone() {
    while (this.zoneGroup.children.length > 0) {
      const child = this.zoneGroup.children[0];
      this.zoneGroup.remove(child);
    }
    this.colliders = [];
    this.interactables = [];
    this.npcs = [];
    this.puzzles = {};
    this.activeObjectCount = 0;
  }

  _addBox(x, y, z, w, h, d, material, collide = true, climbable = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = h > 1.0 && h < 35;
    mesh.receiveShadow = true;
    this.zoneGroup.add(mesh);
    this.activeObjectCount++;
    if (collide) {
      this.colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        height: y + h,
        baseY: y,
        climbable
      });
    }
    return mesh;
  }

  buildZone(zoneId, unlockedCheckpoints, completedRumors) {
    this.clearZone();

    // Ground plane
    const groundMat = zoneId === 'zone_3_outskirts' ? this.mats.forestGround : this.mats.asphalt;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(210, 210), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.zoneGroup.add(ground);
    this.activeObjectCount++;

    if (zoneId === 'zone_1_downtown') {
      this._buildDowntown();
    } else if (zoneId === 'zone_2_industrial') {
      this._buildIndustrial();
    } else {
      this._buildOutskirts();
    }

    this._spawnCommonZoneFeatures(zoneId, unlockedCheckpoints, completedRumors);
    return this.activeObjectCount;
  }

  _buildDowntown() {
    // Vaneck Monolith Skyscraper at North Plaza (matches Key Art!)
    this._addBox(0, 0, -68, 26, 56, 22, this.mats.building);
    this._addBox(0, 56, -68, 16, 16, 14, this.mats.building);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), this.mats.crimsonGlow);
    beacon.position.set(0, 74, -68);
    this.zoneGroup.add(beacon);

    // City Blocks flanking avenues
    const blocks = [
      [-52, -42, 18, 32, 18], [52, -42, 18, 28, 18],
      [-52, -8, 16, 24, 18], [52, -8, 18, 34, 18],
      [-52, 26, 18, 22, 18], [52, 26, 18, 26, 18],
      [-24, 48, 20, 20, 14], [26, 48, 20, 24, 14]
    ];
    blocks.forEach(([x, z, w, h, d], idx) => {
      this._addBox(x, 0, z, w, h, d, this.mats.building);
      // Neon Sign on building facade
      const neonMat = idx % 2 === 0 ? this.mats.cyanGlow : this.mats.amberGlow;
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.5, 1.4), neonMat);
      sign.position.set(x > 0 ? x - w / 2 - 0.3 : x + w / 2 + 0.3, 7.5, z);
      this.zoneGroup.add(sign);
      this.activeObjectCount++;
    });

    // Sodium Streetlights along Central Boulevard
    for (let z = -44; z <= 36; z += 20) {
      [-15, 15].forEach((x) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.2, 6), this.mats.concrete);
        pole.position.set(x, 3.6, z);
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.4), this.mats.amberGlow);
        bulb.position.set(x > 0 ? x - 0.6 : x + 0.6, 7.1, z);
        this.zoneGroup.add(pole, bulb);
        this.activeObjectCount += 2;
      });
    }

    // Viktor's Armory Garage structure
    this._addBox(28, 0, 12, 9, 5.2, 9, this.mats.industrial);
    const shopSign = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.7, 0.3), this.mats.amberGlow);
    shopSign.position.set(28, 5.8, 7.4);
    this.zoneGroup.add(shopSign);

    // Tactical Barricades & Climbable Crates (Section 5.1 & 5.3)
    [
      [-7, -18], [7, -18], [-9, -34], [9, -34], [0, -25], [-16, 8], [16, -2]
    ].forEach(([cx, cz]) => {
      this._addBox(cx, 0, cz, 3.4, 1.35, 1.0, this.mats.coverCrate, true, true);
    });

    // PUZZLE TYPE 1: Courthouse Coupled Hydraulic Levers & Gate (Section 5.5)
    this._createLeverDoorPuzzle(-34, -8);
  }

  _buildIndustrial() {
    // Shipping Containers & Foundry Halls
    const containers = [
      [-32, -26, 8, 6.5, 16], [34, -10, 14, 11, 18],
      [-36, 12, 10, 6.5, 14], [36, 24, 12, 8, 14],
      [-18, -54, 16, 12, 12], [18, -54, 16, 12, 12]
    ];
    containers.forEach(([x, z, w, h, d]) => {
      this._addBox(x, 0, z, w, h, d, this.mats.industrial);
    });

    // Towering Port Gantry Cranes
    [-22, 22].forEach((cx) => {
      this._addBox(cx, 0, -32, 2.2, 22, 2.2, this.mats.industrial);
      const boom = new THREE.Mesh(new THREE.BoxGeometry(18, 1.4, 1.8), this.mats.amberGlow);
      boom.position.set(cx > 0 ? cx - 6 : cx + 6, 21.5, -32);
      this.zoneGroup.add(boom);
      this.activeObjectCount++;
    });

    // Dense FPS Cover Arena on Pier 7
    [
      [-12, 10], [0, 12], [12, 10], [-7, -2], [7, -2],
      [-14, -14], [0, -16], [14, -14], [-6, -28], [6, -28], [24, -2]
    ].forEach(([cx, cz]) => {
      this._addBox(cx, 0, cz, 3.6, 1.4, 1.2, this.mats.coverCrate, true, true);
    });

    // PUZZLE TYPE 2: Kinetic Moving Platform Bridge (Section 5.5)
    this._createMovingPlatformPuzzle(-26, 2);
  }

  _buildOutskirts() {
    // Pine Conifer Forest perimeter + Rocks
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x0f2d22, roughness: 0.85 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2b1d12, roughness: 0.9 });
    for (let i = 0; i < 42; i++) {
      const angle = (i / 42) * Math.PI * 2;
      const dist = 42 + (i % 4) * 9;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 4, 6), trunkMat);
      trunk.position.set(tx, 2, tz);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 11, 6), pineMat);
      crown.position.set(tx, 8.5, tz);
      this.zoneGroup.add(trunk, crown);
      this.activeObjectCount += 2;
    }

    // Hydroelectric Dam Wall & Bunker Cendre Facade
    this._addBox(38, 0, -10, 10, 16, 36, this.mats.concrete);
    this._addBox(0, 0, -56, 28, 9, 14, this.mats.industrial);

    // Rock cover outcrops & Radar towers
    [
      [-28, 14], [26, 16], [-18, -16], [-8, -22], [8, -22], [0, -6]
    ].forEach(([rx, rz]) => {
      this._addBox(rx, 0, rz, 3.2, 1.45, 1.4, this.mats.concrete, true, true);
    });

    // PUZZLE TYPE 2 (Dam Span) & PUZZLE TYPE 3 (4-Pylon Harmonic Sequence at Bunker Cendre)
    this._createMovingPlatformPuzzle(26, -6);
    this._createSequencePuzzle(0, -34);
  }

  _createLeverDoorPuzzle(cx, cz) {
    const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.0, 0.6), this.mats.industrial);
    gateMesh.position.set(cx, 2.0, cz - 5);
    this.zoneGroup.add(gateMesh);

    const puzzle = {
      type: 'levers',
      solved: false,
      timer: 0,
      hintStage: 1,
      states: [false, true, false],
      bulbs: [],
      gateMesh
    };

    for (let i = 0; i < 3; i++) {
      const lx = cx - 3 + i * 3;
      const lz = cz;
      const post = this._addBox(lx, 0, lz, 0.6, 1.4, 0.6, this.mats.concrete, false);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 10),
        puzzle.states[i] ? this.mats.emeraldGlow : this.mats.crimsonGlow
      );
      bulb.position.set(lx, 1.65, lz);
      this.zoneGroup.add(bulb);
      puzzle.bulbs.push(bulb);

      this.interactables.push({
        id: `lever_${i}`,
        type: 'puzzle_lever',
        x: lx,
        y: 1.0,
        z: lz,
        radius: 2.8,
        mesh: post,
        labelFr: `[E] Actionner la Vanne Hydraulique #${i + 1}`,
        labelEn: `[E] Pull Hydraulic Valve #${i + 1}`,
        onInteract: (sim) => {
          if (puzzle.solved) return;
          puzzle.states[i] = !puzzle.states[i];
          sim.audio.playPuzzleTone(i);
          puzzle.states.forEach((st, idx) => {
            puzzle.bulbs[idx].material = st ? this.mats.emeraldGlow : this.mats.crimsonGlow;
          });
          if (puzzle.states.every(Boolean)) {
            puzzle.solved = true;
            gateMesh.position.y = 6.2;
            sim.onPuzzleSolved('levers');
          }
        }
      });
    }
    this.puzzles.levers = puzzle;
  }

  _createMovingPlatformPuzzle(cx, cz) {
    const platA = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 3.8), this.mats.cyanGlow);
    platA.position.set(cx, 0.35, cz - 5);
    const platB = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.45, 3.8), this.mats.amberGlow);
    platB.position.set(cx, 0.35, cz - 11);
    this.zoneGroup.add(platA, platB);

    const puzzle = {
      type: 'platforms',
      solved: false,
      powered: false,
      phase: 0,
      timer: 0,
      hintStage: 1,
      platA,
      platB,
      baseX: cx
    };

    const relayPost = this._addBox(cx, 0, cz, 0.8, 1.5, 0.8, this.mats.amberGlow, false);
    this.interactables.push({
      id: 'platform_relay',
      type: 'puzzle_platform_relay',
      x: cx,
      y: 1.0,
      z: cz,
      radius: 3.0,
      mesh: relayPost,
      labelFr: '[E] Alimenter les Plateformes Mobiles Cinétiques',
      labelEn: '[E] Power Kinetic Moving Platforms',
      onInteract: (sim) => {
        puzzle.powered = true;
        sim.audio.playPuzzleTone(1);
        sim.notifyToast(
          sim.lang === 'fr'
            ? 'Plateformes activées ! Traversez jusqu’à la console Nord [E].'
            : 'Platforms online! Ride across to the North Console [E].'
        );
      }
    });

    const goalConsole = this._addBox(cx, 0, cz - 15.5, 0.9, 1.6, 0.9, this.mats.emeraldGlow, false);
    this.interactables.push({
      id: 'platform_goal',
      type: 'puzzle_platform_goal',
      x: cx,
      y: 1.0,
      z: cz - 15.5,
      radius: 3.2,
      mesh: goalConsole,
      labelFr: '[E] Verrouiller le Pont du Barrage',
      labelEn: '[E] Lock Hydro-Bridge Span',
      onInteract: (sim) => {
        if (puzzle.solved) return;
        puzzle.powered = true;
        puzzle.solved = true;
        sim.audio.playParryClang();
        sim.onPuzzleSolved('platforms');
      }
    });

    this.puzzles.platforms = puzzle;
  }

  _createSequencePuzzle(cx, cz) {
    // 4 Pylons labeled 1..4 visually by height!
    const puzzle = {
      type: 'sequence',
      solved: false,
      progress: 0,
      timer: 0,
      hintStage: 1,
      caps: []
    };
    const positions = [
      { x: cx - 4.5, z: cz, order: 0 },
      { x: cx - 1.5, z: cz, order: 1 },
      { x: cx + 1.5, z: cz, order: 2 },
      { x: cx + 4.5, z: cz, order: 3 }
    ];

    positions.forEach((p, idx) => {
      const h = 1.4 + idx * 0.42; // Visual progressive height clue!
      const pillar = this._addBox(p.x, 0, p.z, 0.7, h, 0.7, this.mats.concrete, false);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), this.mats.cyanGlow);
      cap.position.set(p.x, h + 0.3, p.z);
      this.zoneGroup.add(cap);
      puzzle.caps.push(cap);

      this.interactables.push({
        id: `seq_pylon_${idx}`,
        type: 'puzzle_sequence',
        x: p.x,
        y: 1.0,
        z: p.z,
        radius: 2.6,
        mesh: pillar,
        labelFr: `[E] Pylône Harmonique #${idx + 1} (Taille ${idx + 1}/4)`,
        labelEn: `[E] Harmonic Pylon #${idx + 1} (Height ${idx + 1}/4)`,
        onInteract: (sim) => {
          if (puzzle.solved) return;
          if (idx === puzzle.progress) {
            puzzle.caps[idx].material = this.mats.emeraldGlow;
            puzzle.progress++;
            sim.audio.playPuzzleTone(idx);
            if (puzzle.progress === 4) {
              puzzle.solved = true;
              sim.onPuzzleSolved('sequence');
            }
          } else {
            puzzle.progress = 0;
            puzzle.caps.forEach((c) => { c.material = this.mats.cyanGlow; });
            sim.notifyToast(
              sim.lang === 'fr'
                ? 'Séquence réinitialisée — Activez du plus petit pylône (#1) au plus grand (#4) !'
                : 'Sequence reset — Activate from shortest pylon (#1) to tallest (#4)!'
            );
          }
        }
      });
    });

    this.puzzles.sequence = puzzle;
  }

  _spawnCommonZoneFeatures(zoneId, unlockedCheckpoints, completedRumors) {
    // Save / Fast-Travel Checkpoint Terminals
    const zoneMeta = {
      zone_1_downtown: [
        { id: 'cp_z1_plaza', x: -10, z: 22 },
        { id: 'cp_z1_garage', x: 24, z: 18 },
        { id: 'cp_z1_tower', x: 0, z: -48 }
      ],
      zone_2_industrial: [
        { id: 'cp_z2_pier7', x: -12, z: 28 },
        { id: 'cp_z2_foundry', x: 26, z: -6 },
        { id: 'cp_z2_rail', x: -4, z: -46 }
      ],
      zone_3_outskirts: [
        { id: 'cp_z3_trail', x: -8, z: 30 },
        { id: 'cp_z3_dam', x: 24, z: 0 },
        { id: 'cp_z3_bunker', x: 0, z: -44 }
      ]
    }[zoneId] || [];

    zoneMeta.forEach((cp) => {
      const kiosk = this._addBox(cp.x, 0, cp.z, 0.85, 2.1, 0.85, this.mats.emeraldGlow, false);
      this.interactables.push({
        id: cp.id,
        type: 'checkpoint',
        x: cp.x,
        y: 1.0,
        z: cp.z,
        radius: 3.2,
        mesh: kiosk,
        labelFr: '[E] Terminal de Sauvegarde & Voyage Rapide',
        labelEn: '[E] Checkpoint Save & Fast-Travel Terminal',
        onInteract: (sim) => {
          sim.unlockCheckpoint(cp.id);
          sim.saveManualCheckpoint();
        }
      });
    });

    // Armory Workshop Station
    const shopPos = zoneId === 'zone_1_downtown' ? { x: 24, z: 12 } : { x: -18, z: 26 };
    const bench = this._addBox(shopPos.x, 0, shopPos.z, 1.8, 1.2, 1.1, this.mats.amberGlow, false);
    this.interactables.push({
      id: `shop_${zoneId}`,
      type: 'shop',
      x: shopPos.x,
      y: 1.0,
      z: shopPos.z,
      radius: 3.4,
      mesh: bench,
      labelFr: '[E] Ouvrir l’Armurerie & Établi d’Améliorations',
      labelEn: '[E] Open Armory & Weapon Upgrade Bench',
      onInteract: (sim) => sim.onOpenMenuRequest?.('inventory')
    });

    // Rare Material Caches in Zone
    [
      { x: -20, z: 20, mat: 'polymer' },
      { x: 18, z: -24, mat: 'cell' },
      { x: -18, z: -38, mat: 'alloy' }
    ].forEach((c, idx) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.85), this.mats.cyanGlow);
      crate.position.set(c.x, 0.4, c.z);
      this.zoneGroup.add(crate);
      const item = {
        id: `loot_${zoneId}_${idx}`,
        type: 'loot',
        collected: false,
        x: c.x,
        y: 0.5,
        z: c.z,
        radius: 2.8,
        mesh: crate,
        labelFr: '[E] Ramasser Caisse de Matériaux & Munitions',
        labelEn: '[E] Collect Rare Material & Ammo Cache',
        onInteract: (sim) => {
          if (item.collected) return;
          item.collected = true;
          crate.visible = false;
          sim.collectCache(c.mat);
        }
      };
      this.interactables.push(item);
    });

    // Living NPCs (IGNORE, FLEE, ALERT + Rumor Giver — Section 5.1 & 6.3)
    const profiles = ['IGNORE', 'FLEE', 'ALERT'];
    profiles.forEach((prof, idx) => {
      const npcGroup = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x334155 : idx === 1 ? 0x475569 : 0x7c2d12,
        roughness: 0.6
      });
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.05, 4, 8), bodyMat);
      torso.position.y = 0.9;
      npcGroup.add(torso);

      // Rain Umbrella on downtown/dock citizens
      const umb = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.25, 10), this.mats.concrete);
      umb.position.y = 2.02;
      npcGroup.add(umb);

      const rumorId = idx === 0 ? `rumor_${zoneId}` : null;
      if (rumorId && !completedRumors.includes(rumorId)) {
        const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), this.mats.amberGlow);
        marker.position.y = 2.55;
        npcGroup.add(marker);
      }

      const startX = -14 + idx * 9;
      const startZ = 14 + (idx % 2) * 5;
      npcGroup.position.set(startX, 0, startZ);
      this.zoneGroup.add(npcGroup);
      this.activeObjectCount += 2;

      const npcObj = {
        group: npcGroup,
        profile: prof,
        rumorId,
        homeX: startX,
        homeZ: startZ,
        phase: idx * 1.7,
        fleeTimer: 0
      };
      this.npcs.push(npcObj);

      this.interactables.push({
        id: `npc_${zoneId}_${idx}`,
        type: 'npc',
        x: startX,
        y: 1.0,
        z: startZ,
        radius: 2.9,
        npcRef: npcObj,
        labelFr: rumorId ? '[E] Parler à l’Informateur (Rumeur locale !)' : '[E] Parler au Citoyen',
        labelEn: rumorId ? '[E] Speak to Informant (Local Rumor!)' : '[E] Talk to Citizen',
        onInteract: (sim) => sim.talkToNPC(npcObj)
      });
    });
  }
}

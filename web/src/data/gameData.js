/**
 * NEXUS — Complete Data-Driven Catalog (Section 11.2: Zero hardcoded gameplay values).
 * Mirrors Godot 4 `.tres` resources (`resources/weapons`, `enemies`, `items`, `missions`).
 */

export const WEAPONS_DATA = {
  pistol: {
    id: 'pistol',
    slotKey: '1',
    name: { fr: 'P99 Tactical', en: 'P99 Tactical' },
    category: { fr: 'Pistolet', en: 'Pistol' },
    desc: {
      fr: 'Arme de poing semi-automatique précise et nerveuse, idéale en mobilité.',
      en: 'Crisp semi-automatic sidearm built for fast handling and clean headshots.'
    },
    damage: 30,
    pellets: 1,
    fireRate: 4.4,
    magSize: 15,
    maxReserve: 90,
    reloadTime: 1.25,
    recoil: 0.16,
    spreadHip: 0.024,
    spreadAds: 0.005,
    adsFov: 58,
    range: 65,
    critMult: 1.85,
    auto: false,
    price: 0,
    color: 0x38bdf8
  },
  assault_rifle: {
    id: 'assault_rifle',
    slotKey: '2',
    name: { fr: 'VX-4 Carbine', en: 'VX-4 Carbine' },
    category: { fr: "Fusil d'assaut", en: 'Assault Rifle' },
    desc: {
      fr: 'Carabine automatique tactique polyvalente équipée d’un viseur holographique.',
      en: 'Versatile full-auto tactical carbine fitted with a holographic optic.'
    },
    damage: 25,
    pellets: 1,
    fireRate: 8.6,
    magSize: 30,
    maxReserve: 180,
    reloadTime: 1.65,
    recoil: 0.25,
    spreadHip: 0.036,
    spreadAds: 0.008,
    adsFov: 50,
    range: 95,
    critMult: 1.65,
    auto: true,
    price: 650,
    color: 0x10b981
  },
  shotgun: {
    id: 'shotgun',
    slotKey: '3',
    name: { fr: 'M590 Breacher', en: 'M590 Breacher' },
    category: { fr: 'Fusil à pompe', en: 'Pump Shotgun' },
    desc: {
      fr: 'Calibre 12 dévastateur projetant 8 plombs cinétiques à courte portée.',
      en: 'Devastating 12-gauge breacher firing 8 kinetic pellets in close quarters.'
    },
    damage: 17,
    pellets: 8,
    fireRate: 1.3,
    magSize: 8,
    maxReserve: 48,
    reloadTime: 2.0,
    recoil: 0.62,
    spreadHip: 0.095,
    spreadAds: 0.062,
    adsFov: 60,
    range: 34,
    critMult: 1.4,
    auto: false,
    price: 900,
    color: 0xf59e0b
  },
  sniper_rifle: {
    id: 'sniper_rifle',
    slotKey: '4',
    name: { fr: 'SR-25 Nemesis', en: 'SR-25 Nemesis' },
    category: { fr: 'Fusil de précision', en: 'Sniper Rifle' },
    desc: {
      fr: 'Fusil longue portée à lunette mil-dot grossissante et pouvoir d’arrêt massif.',
      en: 'Long-range marksman rifle with high-magnification mil-dot optic.'
    },
    damage: 98,
    pellets: 1,
    fireRate: 1.0,
    magSize: 6,
    maxReserve: 36,
    reloadTime: 2.25,
    recoil: 0.78,
    spreadHip: 0.058,
    spreadAds: 0.001,
    adsFov: 24,
    range: 170,
    critMult: 2.1,
    auto: false,
    hasScope: true,
    price: 1250,
    color: 0xef4444
  }
};

export const WEAPON_UPGRADES = {
  match_barrel: {
    id: 'match_barrel',
    name: { fr: 'Canon rayé Match (+20% Dégâts)', en: 'Match Rifled Barrel (+20% DMG)' },
    costMoney: 400,
    matId: 'polymer',
    matCost: 2,
    dmgBonus: 0.2
  },
  compensator: {
    id: 'compensator',
    name: { fr: 'Compensateur (-35% Recul/Disp.)', en: 'Tactical Compensator (-35% Recoil)' },
    costMoney: 450,
    matId: 'cell',
    matCost: 1,
    recoilMult: 0.65
  },
  extended_mag: {
    id: 'extended_mag',
    name: { fr: 'Chargeur XL (+40% Munitions)', en: 'Extended Magazine (+40% Mag)' },
    costMoney: 500,
    matId: 'cell',
    matCost: 2,
    magBonus: 0.4
  },
  titanium_bolt: {
    id: 'titanium_bolt',
    name: { fr: 'Culasse Titane (+18% Cadence)', en: 'Titanium Bolt (+18% Fire Rate)' },
    costMoney: 750,
    matId: 'alloy',
    matCost: 2,
    rateBonus: 0.18
  }
};

export const ARMORS_DATA = {
  vest_light: {
    id: 'vest_light',
    slot: 0,
    name: { fr: 'Gilet Kevlar Urbain', en: 'Urban Kevlar Vest' },
    desc: { fr: '+15 PV max · -8% dégâts subis', en: '+15 Max HP · -8% damage taken' },
    hpBonus: 15,
    staminaBonus: 0,
    dmgReduction: 0.08,
    price: 0
  },
  vest_exo: {
    id: 'vest_exo',
    slot: 0,
    name: { fr: 'Manteau Blindé Exo-Weave', en: 'Exo-Weave Armored Coat' },
    desc: { fr: '+45 PV max · -20% dégâts subis', en: '+45 Max HP · -20% damage taken' },
    hpBonus: 45,
    staminaBonus: 10,
    dmgReduction: 0.2,
    price: 1100
  },
  gear_boots: {
    id: 'gear_boots',
    slot: 1,
    name: { fr: 'Bottes Cinétiques Silencieuses', en: 'Silent Kinetic Boots' },
    desc: { fr: '+25 Endurance max · +10% mobilité', en: '+25 Max Stamina · +10% agility' },
    hpBonus: 0,
    staminaBonus: 25,
    dmgReduction: 0.04,
    price: 700
  },
  gear_visor: {
    id: 'gear_visor',
    slot: 1,
    name: { fr: 'Visière Balistique Boréale', en: 'Boreal Ballistic Visor' },
    desc: { fr: '+15 PV · Régénération vie accélérée +35%', en: '+15 HP · +35% faster health regen' },
    hpBonus: 15,
    staminaBonus: 10,
    dmgReduction: 0.06,
    regenBoost: 1.35,
    price: 1300
  }
};

export const MATERIALS_META = {
  polymer: { id: 'polymer', name: { fr: 'Polymère balistique', en: 'Ballistic Polymer' }, color: '#38bdf8' },
  cell: { id: 'cell', name: { fr: 'Cellule vanadium', en: 'Vanadium Cell' }, color: '#f59e0b' },
  alloy: { id: 'alloy', name: { fr: 'Alliage Cendre', en: 'Ashen Titanium Alloy' }, color: '#ef4444' }
};

export const SKILL_TREES = {
  shooting: {
    id: 'shooting',
    title: { fr: 'Branche TIR', en: 'SHOOTING Branch' },
    accent: '#ef4444',
    skills: [
      {
        id: 'steady_aim',
        name: { fr: 'Souffle Calme', en: 'Steady Breath' },
        desc: { fr: '-25% recul et dispersion sur toutes les armes', en: '-25% recoil and spread on all firearms' }
      },
      {
        id: 'tactical_reload',
        name: { fr: 'Chargeurs Tactiques', en: 'Tactical Mags' },
        desc: { fr: '+30% capacité chargeur & rechargement +25% plus vif', en: '+30% magazine capacity & +25% reload speed' }
      },
      {
        id: 'surgical_rounds',
        name: { fr: 'Impact Chirurgical', en: 'Surgical Rounds' },
        desc: { fr: '+25% dégâts balistiques et critiques amplifiés', en: '+25% firearm damage & stronger headshots' }
      }
    ]
  },
  combat: {
    id: 'combat',
    title: { fr: 'Branche COMBAT', en: 'COMBAT Branch' },
    accent: '#f59e0b',
    skills: [
      {
        id: 'iron_fist',
        name: { fr: 'Poing d’Acier', en: 'Iron Strike' },
        desc: { fr: '+25% dégâts au corps à corps (léger & lourd)', en: '+25% light & heavy melee damage' }
      },
      {
        id: 'second_wind',
        name: { fr: 'Second Souffle', en: 'Second Wind' },
        desc: { fr: '+35 Endurance max et récupération +35%', en: '+35 Max Stamina & +35% stamina recovery' }
      },
      {
        id: 'eclipse_counter',
        name: { fr: 'Contre-Éclipse', en: 'Eclipse Counter' },
        desc: { fr: 'Onde de choc lourde élargie & +15 PV par parade parfaite', en: 'Wider heavy shockwave & +15 HP on perfect parry' }
      }
    ]
  },
  exploration: {
    id: 'exploration',
    title: { fr: 'Branche EXPLORATION', en: 'EXPLORATION Branch' },
    accent: '#38bdf8',
    skills: [
      {
        id: 'urban_sprinter',
        name: { fr: 'Foulée Fantôme', en: 'Phantom Stride' },
        desc: { fr: '+18% vitesse de course & turbo Berline amélioré', en: '+18% sprint speed & faster Sedan handling' }
      },
      {
        id: 'parkour_absorb',
        name: { fr: 'Amortisseurs Cinétiques', en: 'Kinetic Absorbers' },
        desc: { fr: 'Zéro dégât de chute, escalade vive & +25% PV max', en: 'Zero fall damage, fast vaulting & +25% Max HP' }
      },
      {
        id: 'beacon_intel',
        name: { fr: 'Réseau du Phare', en: 'Lighthouse Intel' },
        desc: { fr: 'Tous les secrets révélés sur la carte & +25% Crédits €', en: 'Reveals all map caches & +25% Credit rewards' }
      }
    ]
  }
};

export const ENEMY_ARCHETYPES = {
  rusher: {
    id: 'rusher',
    name: { fr: 'Exécuteur Éclipse', en: 'Eclipse Enforcer' },
    behavior: 'SIMPLE_ATTACK',
    hp: 85,
    speed: 5.0,
    damage: 12,
    range: 2.35,
    color: 0xef4444,
    xp: 45,
    money: 65
  },
  guard: {
    id: 'guard',
    name: { fr: 'Bastion Blindé', en: 'Shield Bastion' },
    behavior: 'GUARD',
    hp: 135,
    speed: 3.3,
    damage: 18,
    range: 2.5,
    shielded: true,
    color: 0xf59e0b,
    xp: 65,
    money: 95
  },
  marksman: {
    id: 'marksman',
    name: { fr: 'Tireur d’Éclipse', en: 'Eclipse Marksman' },
    behavior: 'RANGED',
    hp: 75,
    speed: 3.8,
    damage: 10,
    range: 26.0,
    color: 0x38bdf8,
    xp: 55,
    money: 80
  },
  boss_krow: {
    id: 'boss_krow',
    name: { fr: 'Damien « Krow » Delacroix', en: "Damien 'Krow' Delacroix" },
    behavior: 'SIMPLE_ATTACK',
    isBoss: true,
    hp: 340,
    speed: 5.5,
    damage: 19,
    range: 2.7,
    color: 0xdc2626,
    xp: 220,
    money: 450
  },
  boss_kael: {
    id: 'boss_kael',
    name: { fr: 'Commandante Iris Kael', en: 'Commander Iris Kael' },
    behavior: 'GUARD',
    isBoss: true,
    hp: 400,
    speed: 5.2,
    damage: 21,
    range: 2.8,
    shielded: true,
    color: 0xe11d48,
    xp: 280,
    money: 600
  },
  boss_warden: {
    id: 'boss_warden',
    name: { fr: 'Le Veilleur (Bunker Cendre)', en: 'The Warden (Ashen Bunker)' },
    behavior: 'GUARD',
    isBoss: true,
    hp: 460,
    speed: 4.8,
    damage: 23,
    range: 2.9,
    shielded: true,
    color: 0xf97316,
    xp: 340,
    money: 750
  },
  boss_vaneck: {
    id: 'boss_vaneck',
    name: { fr: 'Sébastien Vaneck — Directeur d’Éclipse', en: 'Sebastien Vaneck — Eclipse Director' },
    behavior: 'GUARD',
    isBoss: true,
    hp: 560,
    speed: 5.4,
    damage: 25,
    range: 3.0,
    shielded: true,
    color: 0xff1e42,
    xp: 600,
    money: 1500
  }
};

export const ZONES_DATA = {
  zone_1_downtown: {
    id: 'zone_1_downtown',
    actUnlock: 1,
    name: { fr: 'Zone 1 — Centre-ville de Port-Valois', en: 'Zone 1 — Port-Valois Downtown' },
    subtitle: {
      fr: 'Avenues sous pluie acide, Armurerie de Viktor, Palais de Justice & Tour Vaneck',
      en: 'Rain-slicked avenues, Viktor’s Armory, Courthouse Vaults & Vaneck Tower'
    },
    bounds: 96,
    playerSpawn: { x: 0, y: 0, z: 26 },
    checkpoints: [
      { id: 'cp_z1_plaza', name: { fr: 'Place Centrale Sud', en: 'South Central Plaza' }, x: -10, z: 22 },
      { id: 'cp_z1_garage', name: { fr: 'Atelier de Viktor', en: 'Viktor’s Workshop' }, x: 24, z: 18 },
      { id: 'cp_z1_tower', name: { fr: 'Parvis Tour Vaneck', en: 'Vaneck Tower Forecourt' }, x: 0, z: -48 }
    ],
    shopPos: { x: 24, z: 12 },
    carSpawn: { x: 10, z: 20 }
  },
  zone_2_industrial: {
    id: 'zone_2_industrial',
    actUnlock: 2,
    name: { fr: 'Zone 2 — Quartier Industriel & Docks', en: 'Zone 2 — Industrial Docks' },
    subtitle: {
      fr: 'Quai 7 embrumé, grues portuaires, fonderie automatisée & terminal blindé',
      en: 'Foggy Pier 7, gantry cranes, automated foundry & armored rail terminal'
    },
    bounds: 96,
    playerSpawn: { x: 0, y: 0, z: 32 },
    checkpoints: [
      { id: 'cp_z2_pier7', name: { fr: 'Entrée du Quai 7', en: 'Pier 7 Gate' }, x: -12, z: 28 },
      { id: 'cp_z2_foundry', name: { fr: 'Passerelle Fonderie', en: 'Foundry Catwalk' }, x: 26, z: -6 },
      { id: 'cp_z2_rail', name: { fr: 'Terminal Ferroviaire Nord', en: 'North Rail Terminal' }, x: -4, z: -46 }
    ],
    shopPos: { x: -20, z: 24 },
    carSpawn: null
  },
  zone_3_outskirts: {
    id: 'zone_3_outskirts',
    actUnlock: 3,
    name: { fr: 'Zone 3 — Périphérie & Massif Nord', en: 'Zone 3 — Northern Forest Outskirts' },
    subtitle: {
      fr: 'Sentiers de conifères, Barrage Hydroélectrique & Bunker Cendre souterrain',
      en: 'Misty pine ridges, Hydroelectric Dam & subterranean Ashen Bunker'
    },
    bounds: 96,
    playerSpawn: { x: 0, y: 0, z: 34 },
    checkpoints: [
      { id: 'cp_z3_trail', name: { fr: 'Poste Forestier Sud', en: 'South Ranger Outpost' }, x: -8, z: 30 },
      { id: 'cp_z3_dam', name: { fr: 'Belvédère du Barrage', en: 'Hydro Dam Overlook' }, x: 24, z: 0 },
      { id: 'cp_z3_bunker', name: { fr: 'Entrée Bunker Cendre', en: 'Ashen Bunker Gate' }, x: 0, z: -44 }
    ],
    shopPos: { x: -18, z: 28 },
    carSpawn: null
  }
};

export const CAMPAIGN_MISSIONS = [
  // === ACTE 1 (Zone 1 — Centre-ville) ===
  {
    id: 'm01', number: 1, act: 1, zoneId: 'zone_1_downtown', type: 'COMBAT',
    speaker: 'elena',
    title: { fr: 'M01 — Réveil sous la pluie', en: 'M01 — Rain Awakening' },
    briefing: {
      fr: "Deux escouades d'Éclipse verrouillent le carrefour Nord. Rejoins la ruelle et neutralise-les au corps à corps !",
      en: 'Two Eclipse squads just locked down the North junction. Reach the alley and neutralize them hand-to-hand!'
    },
    bonusText: { fr: 'Conserver plus de 70% de santé', en: 'Keep health above 70%' },
    bonusCheck: 'hp70',
    rewardMoney: 400, rewardXp: 160, rewardMat: 'polymer', rewardMatAmt: 1,
    stages: [
      {
        mode: 'EXPLORATION',
        kind: 'WAYPOINT',
        target: { x: 0, z: -6 },
        label: { fr: 'Rejoindre le relais de la ruelle centrale', en: 'Reach the central alley relay' }
      },
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'rusher', x: -5, z: -14 },
          { type: 'rusher', x: 5, z: -14 },
          { type: 'guard', x: 0, z: -18 },
          { type: 'rusher', x: 2, z: -11 }
        ],
        label: { fr: "Éliminer l'escouade d'Exécuteurs Éclipse (Combo L-L-L + Lourd [F])", en: 'Defeat the Eclipse squad (L-L-L Combo + Heavy [F])' }
      }
    ]
  },
  {
    id: 'm02', number: 2, act: 1, zoneId: 'zone_1_downtown', type: 'PURSUIT',
    speaker: 'marcus',
    title: { fr: 'M02 — Livraison Express', en: 'M02 — Midnight Run' },
    briefing: {
      fr: 'Monte dans la Berline Valois GT [E] et franchis les 4 relais chiffrés à travers le Centre-ville avant blocage !',
      en: 'Hop in the Valois GT Sedan [E] and hit all 4 encrypted relays across Downtown before lockdown!'
    },
    bonusText: { fr: 'Terminer en moins de 90 secondes', en: 'Finish in under 90 seconds' },
    bonusCheck: 'time90',
    rewardMoney: 550, rewardXp: 190, rewardMat: 'polymer', rewardMatAmt: 1,
    spawnCarNearPlayer: true,
    stages: [
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 34, z: 16 }, label: { fr: 'Relais 1/4 — Avenue de l’Est (en Berline [E] ou sprint)', en: 'Relay 1/4 — East Boulevard (Sedan [E] or sprint)' } },
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 34, z: -30 }, label: { fr: 'Relais 2/4 — Carrefour du Palais', en: 'Relay 2/4 — Courthouse Crossing' } },
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: -34, z: -28 }, label: { fr: 'Relais 3/4 — Quai Ouest', en: 'Relay 3/4 — West Embankment' } },
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: -12, z: 18 }, label: { fr: 'Relais 4/4 — Point d’extraction Sud', en: 'Relay 4/4 — South Extraction Point' } }
    ]
  },
  {
    id: 'm03', number: 3, act: 1, zoneId: 'zone_1_downtown', type: 'PUZZLE',
    speaker: 'elena',
    title: { fr: 'M03 — Les Sous-sols du Palais', en: 'M03 — Courthouse Vaults' },
    briefing: {
      fr: 'Infiltre la chambre forte Est et aligne les 3 vannes hydrauliques [E] pour ouvrir le coffre municipal. Appuie sur [H] si besoin d’un indice.',
      en: 'Infiltrate the East vault and align all 3 hydraulic levers [E] to open the archive gate. Press [H] anytime for a progressive hint.'
    },
    bonusText: { fr: 'Terminer avec plus de 80% de santé', en: 'Finish with over 80% HP' },
    bonusCheck: 'hp70',
    rewardMoney: 650, rewardXp: 220, rewardMat: 'cell', rewardMatAmt: 1,
    resetPuzzle: 'levers',
    stages: [
      { mode: 'EXPLORATION', kind: 'SOLVE_PUZZLE', puzzleType: 'levers', target: { x: -32, z: -6 }, label: { fr: 'Aligner les 3 leviers hydrauliques du Palais [E] ([H] Indice)', en: 'Align all 3 Courthouse hydraulic levers [E] ([H] Hint)' } },
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'guard', x: -26, z: -6 },
          { type: 'marksman', x: -22, z: -12 }
        ],
        label: { fr: 'Neutraliser la patrouille alertée à la sortie du coffre', en: 'Neutralize the vault security patrol' }
      }
    ]
  },
  {
    id: 'm04', number: 4, act: 1, zoneId: 'zone_1_downtown', type: 'COMBAT',
    speaker: 'vaneck',
    title: { fr: 'M04 — Nuit de Fer (Boss : Krow)', en: 'M04 — Iron Night (Boss: Krow)' },
    briefing: {
      fr: 'Damien « Krow » Delacroix t’attend sur le parvis Nord de la Tour Vaneck avec ses Bastions. Brise sa garde !',
      en: "Damien 'Krow' Delacroix awaits on the North Vaneck Plaza with his Shield Bastions. Break his guard!"
    },
    bonusText: { fr: 'Réussir au moins 1 parade [Q] ou esquive parfaite [C]', en: 'Trigger at least 1 perfect parry [Q] or dodge [C]' },
    bonusCheck: 'perfect1',
    rewardMoney: 1000, rewardXp: 350, rewardMat: 'alloy', rewardMatAmt: 1,
    unlocksZone: 'zone_2_industrial',
    reversal: {
      fr: "REVERS FIN D'ACTE I — Le refuge d'Elena vient d'exploser ! Vaneck diffuse un mandat falsifié contre vous. Le Quartier Industriel (Zone 2) est désormais DÉBLOQUÉ !",
      en: "END OF ACT I REVERSAL — Elena's safehouse just blew up! Vaneck framed you citywide. Zone 2 (Industrial Docks) is now UNLOCKED!"
    },
    stages: [
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 0, z: -34 }, label: { fr: 'Monter vers le Parvis Nord de la Tour Vaneck', en: 'Approach Vaneck Tower North Forecourt' } },
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'boss_krow', x: 0, z: -44 },
          { type: 'guard', x: -6, z: -41 },
          { type: 'rusher', x: 6, z: -41 }
        ],
        label: { fr: 'Vaincre le Boss KROW et sa garde rapprochée', en: 'Defeat Boss KROW and his personal guard' }
      }
    ]
  },

  // === ACTE 2 (Zone 2 — Quartier industriel · Mode Tir FPS dominant) ===
  {
    id: 'm05', number: 5, act: 2, zoneId: 'zone_2_industrial', type: 'SHOOTING',
    speaker: 'elena',
    title: { fr: 'M05 — Quai des Brumes', en: 'M05 — Fog Pier' },
    briefing: {
      fr: "Bienvenue sur les docks, Marcus. Les unités d'Éclipse tirent à vue : passe en vue FPS, vise [Clic Droit] et nettoie le Quai 7 !",
      en: 'Welcome to the docks, Marcus. Eclipse units are weapons-free: aim down sights [Right Click] and clear Pier 7!'
    },
    bonusText: { fr: 'Réussir au moins 2 tirs critiques (tête)', en: 'Land at least 2 critical headshots' },
    bonusCheck: 'headshot2',
    rewardMoney: 850, rewardXp: 270, rewardMat: 'polymer', rewardMatAmt: 1,
    stages: [
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'marksman', x: -10, z: 4 },
          { type: 'marksman', x: 10, z: 2 },
          { type: 'rusher', x: 0, z: 8 },
          { type: 'guard', x: -4, z: -6 },
          { type: 'marksman', x: 6, z: -10 }
        ],
        label: { fr: 'Éliminer les 5 opérateurs armés du Quai 7 (Touches 1-4 Armes, [R] Recharger)', en: 'Eliminate all 5 armed operators on Pier 7 (Keys 1-4 Weapons, [R] Reload)' }
      }
    ]
  },
  {
    id: 'm06', number: 6, act: 2, zoneId: 'zone_2_industrial', type: 'SHOOTING',
    speaker: 'marcus',
    title: { fr: 'M06 — Contre-feux', en: 'M06 — Foundry Breach' },
    briefing: {
      fr: 'La fonderie Est fabrique les blindages d’Éclipse. Prends d’assaut le hall métallurgique à courte portée !',
      en: 'The East Foundry manufactures Eclipse armor plates. Storm the smelting hall at close quarters!'
    },
    bonusText: { fr: 'Terminer en moins de 90 secondes', en: 'Finish under 90 seconds' },
    bonusCheck: 'time90',
    rewardMoney: 950, rewardXp: 300, rewardMat: 'cell', rewardMatAmt: 1,
    grantWeapon: 'shotgun',
    stages: [
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 22, z: 2 }, label: { fr: 'Entrer dans le secteur Fonderie Est (M590 Breacher débloqué !)', en: 'Enter East Foundry sector (M590 Breacher unlocked!)' } },
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'rusher', x: 28, z: -6 },
          { type: 'guard', x: 22, z: -12 },
          { type: 'rusher', x: 32, z: -14 },
          { type: 'marksman', x: 18, z: -18 }
        ],
        label: { fr: 'Nettoyer la garnison de la fonderie (touche [3] Fusil à pompe)', en: 'Clear the foundry garrison (key [3] Shotgun)' }
      }
    ]
  },
  {
    id: 'm07', number: 7, act: 2, zoneId: 'zone_2_industrial', type: 'SHOOTING',
    speaker: 'elena',
    title: { fr: 'M07 — Ligne de Mire', en: 'M07 — Overwatch' },
    briefing: {
      fr: 'Des tireurs d’élite tiennent le canal Nord. Équipe le fusil de précision SR-25 [4], zoome [Clic Droit] et neutralise-les !',
      en: 'Snipers hold the North canal. Equip the SR-25 Nemesis [4], scope in [Right Click], and take them down!'
    },
    bonusText: { fr: 'Conserver plus de 70% de santé', en: 'Keep health above 70%' },
    bonusCheck: 'hp70',
    rewardMoney: 1100, rewardXp: 340, rewardMat: 'cell', rewardMatAmt: 1,
    grantWeapon: 'sniper_rifle',
    stages: [
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'marksman', x: -24, z: -20 },
          { type: 'marksman', x: 24, z: -22 },
          { type: 'marksman', x: -8, z: -34 },
          { type: 'marksman', x: 12, z: -36 }
        ],
        label: { fr: 'Neutraliser les 4 Tireurs d’élite à longue distance (SR-25 [4] débloqué !)', en: 'Neutralize all 4 long-range Marksmen (SR-25 [4] unlocked!)' }
      }
    ]
  },
  {
    id: 'm08', number: 8, act: 2, zoneId: 'zone_2_industrial', type: 'MIXED',
    speaker: 'vaneck',
    title: { fr: 'M08 — Protocole Kael (Boss)', en: 'M08 — Kael Protocol (Boss)' },
    briefing: {
      fr: 'Perce l’escorte du terminal Nord au fusil, puis affronte la Commandante Iris Kael en duel rapproché sur le quai !',
      en: 'Pierce the North terminal escort by rifle, then duel Commander Iris Kael hand-to-hand on the platform!'
    },
    bonusText: { fr: 'Vaincre Kael avec plus de 50% PV', en: 'Defeat Kael with over 50% HP' },
    bonusCheck: 'hp50',
    rewardMoney: 1450, rewardXp: 460, rewardMat: 'alloy', rewardMatAmt: 1,
    unlocksZone: 'zone_3_outskirts',
    reversal: {
      fr: "REVERS FIN D'ACTE II — Le convoi était un leurre ! Le commissaire Benali a été capturé et transféré vers le Bunker Cendre. La Périphérie / Forêt (Zone 3) est DÉBLOQUÉE !",
      en: 'END OF ACT II REVERSAL — The train was a decoy! Detective Benali was captured and taken to Ashen Bunker. Zone 3 (Northern Outskirts) is UNLOCKED!'
    },
    stages: [
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'marksman', x: -10, z: -32 },
          { type: 'guard', x: 0, z: -34 },
          { type: 'marksman', x: 10, z: -32 }
        ],
        label: { fr: 'Phase 1 (Tir FPS) — Percer l’escorte blindée du terminal ferroviaire', en: 'Phase 1 (FPS) — Breach the rail terminal escort' }
      },
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'boss_kael', x: 0, z: -44 },
          { type: 'rusher', x: -5, z: -42 }
        ],
        label: { fr: 'Phase 2 (Combat Épaule) — Vaincre la Commandante IRIS KAEL !', en: 'Phase 2 (Melee Combat) — Defeat Commander IRIS KAEL!' }
      }
    ]
  },

  // === ACTE 3 (Zone 3 — Périphérie / Forêt · Combat & Puzzles dominants) ===
  {
    id: 'm09', number: 9, act: 3, zoneId: 'zone_3_outskirts', type: 'INFILTRATION',
    speaker: 'elena',
    title: { fr: 'M09 — Sentier des Ombres', en: 'M09 — Shadow Trail' },
    briefing: {
      fr: 'Désactive les 3 relais radar disséminés dans le massif forestier pour aveugler la surveillance du Bunker Cendre.',
      en: 'Disable all 3 radar relays across the pine ridges to blind Ashen Bunker security.'
    },
    bonusText: { fr: 'Terminer en moins de 90 secondes', en: 'Complete under 90 seconds' },
    bonusCheck: 'time90',
    rewardMoney: 1200, rewardXp: 380, rewardMat: 'polymer', rewardMatAmt: 2,
    stages: [
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: -28, z: 14 }, label: { fr: 'Saboter le Relais Radar Ouest (1/3)', en: 'Sabotage West Radar Relay (1/3)' } },
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 26, z: 16 }, label: { fr: 'Saboter le Relais Radar Est (2/3)', en: 'Sabotage East Radar Relay (2/3)' } },
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: -18, z: -16 }, label: { fr: 'Saboter le Relais Radar Nord (3/3)', en: 'Sabotage North Radar Relay (3/3)' } },
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'rusher', x: -14, z: -20 },
          { type: 'guard', x: -20, z: -22 }
        ],
        label: { fr: 'Éliminer les éclaireurs forestiers', en: 'Eliminate the forest scouts' }
      }
    ]
  },
  {
    id: 'm10', number: 10, act: 3, zoneId: 'zone_3_outskirts', type: 'PUZZLE',
    speaker: 'elena',
    title: { fr: 'M10 — Le Barrage Oublié', en: 'M10 — Forgotten Dam' },
    briefing: {
      fr: 'Active le relais cinétique [E] du barrage Est, traverse sur les plateformes mobiles et valide la console opposée !',
      en: 'Power the East Dam kinetic relay [E], ride the moving platforms across the chasm, and unlock the far console!'
    },
    bonusText: { fr: 'Conserver plus de 70% de santé', en: 'Maintain above 70% HP' },
    bonusCheck: 'hp70',
    rewardMoney: 1350, rewardXp: 420, rewardMat: 'cell', rewardMatAmt: 2,
    resetPuzzle: 'platforms',
    stages: [
      { mode: 'EXPLORATION', kind: 'SOLVE_PUZZLE', puzzleType: 'platforms', target: { x: 28, z: -4 }, label: { fr: 'Franchir les plateformes mobiles du Barrage et activer le terminal [E]', en: 'Cross the Dam moving platforms and activate the far console [E]' } },
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'rusher', x: 24, z: -18 },
          { type: 'guard', x: 30, z: -20 }
        ],
        label: { fr: 'Repousser la patrouille du barrage', en: 'Repel the dam garrison' }
      }
    ]
  },
  {
    id: 'm11', number: 11, act: 3, zoneId: 'zone_3_outskirts', type: 'PUZZLE',
    speaker: 'elena',
    title: { fr: 'M11 — Bunker Cendre', en: 'M11 — Ashen Bunker' },
    briefing: {
      fr: 'Active les 4 pylônes harmoniques du Bunker Nord dans le bon ordre (1 → 2 → 3 → 4, [H] Indice), puis libère Benali !',
      en: 'Activate the 4 Ashen Bunker harmonic pylons in exact sequence (1 → 2 → 3 → 4, [H] Hint), then free Benali!'
    },
    bonusText: { fr: 'Conserver plus de 70% de santé', en: 'Keep health above 70%' },
    bonusCheck: 'hp70',
    rewardMoney: 1550, rewardXp: 470, rewardMat: 'alloy', rewardMatAmt: 1,
    resetPuzzle: 'sequence',
    stages: [
      { mode: 'EXPLORATION', kind: 'SOLVE_PUZZLE', puzzleType: 'sequence', target: { x: 0, z: -34 }, label: { fr: 'Décoder la séquence des 4 pylônes du Bunker Cendre [E] ([H] Indice)', en: 'Decode the 4-pylon Bunker sequence [E] ([H] Hint)' } },
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'marksman', x: -8, z: -44 },
          { type: 'guard', x: 0, z: -46 },
          { type: 'marksman', x: 8, z: -44 }
        ],
        label: { fr: 'Couvrir l’évasion de Benali contre les gardes du bunker (FPS)', en: 'Cover Benali’s extraction against bunker guards (FPS)' }
      }
    ]
  },
  {
    id: 'm12', number: 12, act: 3, zoneId: 'zone_3_outskirts', type: 'COMBAT',
    speaker: 'vaneck',
    title: { fr: 'M12 — Les Loups du Nord (Boss)', en: 'M12 — Northern Wolves (Boss)' },
    briefing: {
      fr: 'Le Veilleur et son unité prétorienne vous barrent la route dans la clairière ! Brisez l’encerclement !',
      en: 'The Warden and his Praetorian pack block the clearing! Break through their encirclement!'
    },
    bonusText: { fr: 'Réussir au moins 1 parade ou esquive parfaite', en: 'Land at least 1 perfect parry or dodge' },
    bonusCheck: 'perfect1',
    rewardMoney: 1800, rewardXp: 560, rewardMat: 'alloy', rewardMatAmt: 2,
    reversal: {
      fr: 'REVERS FIN D’ACTE III — Le serveur déchiffré révèle le piège : Vaneck vient de verrouiller tout le Centre-ville depuis le sommet de sa tour ! Retournez en Zone 1 pour l’Acte Final !',
      en: 'END OF ACT III REVERSAL — Decrypted files reveal the endgame: Vaneck just locked down all of Downtown from Eclipse Tower! Return to Zone 1 for the Finale!'
    },
    stages: [
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'boss_warden', x: 0, z: -12 },
          { type: 'guard', x: -6, z: -10 },
          { type: 'marksman', x: 7, z: -16 },
          { type: 'rusher', x: 5, z: -8 }
        ],
        label: { fr: 'Vaincre LE VEILLEUR et les Loups du Nord', en: 'Defeat THE WARDEN and the Northern Wolves' }
      }
    ]
  },

  // === ACTE 4 (Retour en Zone 1 — Centre-ville · Finale Multi-Modes) ===
  {
    id: 'm13', number: 13, act: 4, zoneId: 'zone_1_downtown', type: 'MIXED',
    speaker: 'marcus',
    title: { fr: 'M13 — État de Siège', en: 'M13 — Martial Lockdown' },
    briefing: {
      fr: 'Le Centre-ville est sous loi martiale ! Force les 2 barrages en Berline, puis nettoie le parvis central armes au poing !',
      en: 'Downtown is under martial lockdown! Smash both roadblocks by Sedan, then retake the plaza under fire!'
    },
    bonusText: { fr: 'Conserver plus de 50% de santé', en: 'Stay above 50% HP' },
    bonusCheck: 'hp50',
    rewardMoney: 2000, rewardXp: 620, rewardMat: 'cell', rewardMatAmt: 2,
    spawnCarNearPlayer: true,
    stages: [
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 0, z: 4 }, label: { fr: 'Forcer le Barrage Sud vers l’avenue centrale', en: 'Smash through the South Boulevard roadblock' } },
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 0, z: -22 }, label: { fr: 'Percer le Barrage Nord au pied de la Tour Vaneck', en: 'Pierce the North Plaza barricade' } },
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'marksman', x: -9, z: -32 },
          { type: 'guard', x: 0, z: -30 },
          { type: 'marksman', x: 9, z: -32 },
          { type: 'rusher', x: 4, z: -26 }
        ],
        label: { fr: 'Sécuriser l’esplanade en Mode Tir FPS', en: 'Secure the plaza in Tactical FPS Mode' }
      }
    ]
  },
  {
    id: 'm14', number: 14, act: 4, zoneId: 'zone_1_downtown', type: 'MIXED',
    speaker: 'elena',
    title: { fr: 'M14 — Tour Éclipse', en: 'M14 — Eclipse Tower' },
    briefing: {
      fr: 'Prends d’assaut l’atrium de la Tour Vaneck au fusil, puis élimine la garde prétorienne au corps à corps !',
      en: 'Storm the Vaneck Tower atrium under fire, then crush the Praetorian Guard in close combat!'
    },
    bonusText: { fr: 'Conserver plus de 50% de santé', en: 'Keep health above 50%' },
    bonusCheck: 'hp50',
    rewardMoney: 2400, rewardXp: 720, rewardMat: 'alloy', rewardMatAmt: 2,
    stages: [
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'marksman', x: -10, z: -38 },
          { type: 'marksman', x: 10, z: -38 },
          { type: 'guard', x: 0, z: -42 }
        ],
        label: { fr: 'Phase 1 (FPS) — Conquérir le hall vitré de la Tour Éclipse', en: 'Phase 1 (FPS) — Conquer the Eclipse Tower glass lobby' }
      },
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'guard', x: -5, z: -45 },
          { type: 'guard', x: 5, z: -45 },
          { type: 'rusher', x: 0, z: -48 }
        ],
        label: { fr: 'Phase 2 (Combat) — Briser la garde prétorienne devant l’ascenseur', en: 'Phase 2 (Combat) — Crush the elevator Praetorian guard' }
      }
    ]
  },
  {
    id: 'm15', number: 15, act: 4, zoneId: 'zone_1_downtown', type: 'MIXED',
    speaker: 'vaneck',
    title: { fr: 'M15 — Point Nexus (Finale)', en: 'M15 — Nexus Point (Grand Finale)' },
    briefing: {
      fr: "L'Opération Cendre s'achève ici, Vance ! Balaye la garde héliportée au tir, puis affronte Sébastien Vaneck en duel singulier !",
      en: 'Operation Cendre ends tonight! Sweep the helipad guard by rifle, then defeat Sebastien Vaneck in final combat!'
    },
    bonusText: { fr: 'Remporter le duel final avec panache (>50% PV)', en: 'Win the final duel with over 50% HP' },
    bonusCheck: 'hp50',
    rewardMoney: 4000, rewardXp: 1000, rewardMat: 'alloy', rewardMatAmt: 3,
    isFinale: true,
    reversal: {
      fr: "FIN DE CAMPAGNE — Protocole NEXUS purgé ! Sébastien Vaneck est arrêté par Benali tandis que l'aube se lève enfin sur Port-Valois libérée. Bravo, Opérateur !",
      en: 'CAMPAIGN COMPLETE — Protocol NEXUS purged! Detective Benali arrests Sebastien Vaneck as dawn breaks over a free Port-Valois. Outstanding work, Operative!'
    },
    stages: [
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'marksman', x: -11, z: -42 },
          { type: 'guard', x: -3, z: -46 },
          { type: 'marksman', x: 11, z: -42 }
        ],
        label: { fr: 'Phase Finale 1/2 (FPS) — Éliminer la dernière escorte d’élite de Vaneck', en: 'Final Phase 1/2 (FPS) — Eliminate Vaneck’s last rifle escort' }
      },
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'boss_vaneck', x: 0, z: -50 },
          { type: 'rusher', x: -6, z: -48 }
        ],
        label: { fr: 'Phase Finale 2/2 (Duel Épaule) — VAINCRE SÉBASTIEN VANECK !', en: 'Final Phase 2/2 (Melee Duel) — DEFEAT SEBASTIEN VANECK!' }
      }
    ]
  }
];

export const SIDE_ACTIVITIES = [
  {
    id: 'contract_delivery',
    category: 'CONTRACT',
    name: { fr: 'Contrat : Courrier Fantôme (Livraison)', en: 'Contract: Phantom Courier (Delivery)' },
    desc: { fr: 'Franchir 3 balises prioritaires en un minimum de temps.', en: 'Hit 3 priority drop beacons across the sector.' },
    rewardMoney: 380,
    rewardXp: 120,
    rewardMat: 'polymer',
    stages: [
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 24, z: -18 }, label: { fr: 'Point de livraison 1/3', en: 'Drop Point 1/3' } },
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: -24, z: -14 }, label: { fr: 'Point de livraison 2/3', en: 'Drop Point 2/3' } },
      { mode: 'EXPLORATION', kind: 'WAYPOINT', target: { x: 6, z: 20 }, label: { fr: 'Point de livraison 3/3', en: 'Drop Point 3/3' } }
    ]
  },
  {
    id: 'contract_elim',
    category: 'CONTRACT',
    name: { fr: 'Contrat : Nettoyage Chirurgical (Cible)', en: 'Contract: Surgical Sweep (Bounty)' },
    desc: { fr: 'Neutraliser un officier d’Éclipse et ses gardes du corps.', en: 'Eliminate an Eclipse officer and their bodyguards.' },
    rewardMoney: 480,
    rewardXp: 150,
    rewardMat: 'cell',
    stages: [
      {
        mode: 'SHOOTING',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'guard', x: -14, z: -8 },
          { type: 'marksman', x: -18, z: -14 },
          { type: 'rusher', x: -10, z: -12 }
        ],
        label: { fr: 'Éliminer l’escouade cible sous contrat', en: 'Eliminate the contracted target squad' }
      }
    ]
  },
  {
    id: 'challenge_flawless',
    category: 'CHALLENGE',
    name: { fr: 'Défi de Zone : Ombre Intouchable', en: 'Zone Challenge: Untouchable Shadow' },
    desc: { fr: 'Vaincre 3 Exécuteurs au corps à corps avec précision.', en: 'Defeat 3 Enforcers in close-quarters melee.' },
    rewardMoney: 550,
    rewardXp: 190,
    rewardMat: 'alloy',
    stages: [
      {
        mode: 'COMBAT',
        cinematic: true,
        kind: 'DEFEAT_WAVE',
        spawns: [
          { type: 'rusher', x: 12, z: -8 },
          { type: 'rusher', x: 16, z: -12 },
          { type: 'guard', x: 14, z: -15 }
        ],
        label: { fr: 'Défi Combat : Vaincre le trio d’élite', en: 'Combat Challenge: Defeat the elite trio' }
      }
    ]
  }
];

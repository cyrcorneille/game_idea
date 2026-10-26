# Annexe A.3 — Catalogue complet : Armes, Ennemis, Équipements & Compétences

Projet : **NEXUS** — Toutes les valeurs ci-dessous sont stockées sous forme de données pures (`.tres` sous Godot 4 et `gameData.js` sous WebGL — zéro constante magique en dur).

---

## 1. Arsenal — Mode Tir (4 Armes & Améliorations)

Chaque arme peut recevoir **jusqu'à 2 améliorations maximum** (Section 7.3) à l'établi de Viktor contre Crédits (€) et Matériaux rares.

| ID | Nom | Catégorie | Dégâts | Cadence (tirs/s) | Chargeur / Réserve | Portée eff. | Recul | Dispersion Base / ADS | Prix Boutique |
|---|---|---|---|---|---|---|---|---|---|
| `pistol` | **P99 Tactical** | Pistolet | 28 | 4,2 | 15 / 90 | 45 m | Faible (0,18) | 1,6° / 0,35° | Départ (0 €) |
| `assault_rifle` | **VX-4 Carbine** | Fusil d'assaut | 24 | 8,5 | 30 / 180 | 75 m | Moyen (0,28) | 2,4° / 0,55° | 650 € (ou M05) |
| `shotgun` | **M590 Breacher** | Fusil à pompe | 16 × 8 plombs (128 max) | 1,25 | 8 / 48 | 22 m | Élevé (0,65) | 6,5° / 4,2° | 900 € |
| `sniper_rifle` | **SR-25 Nemesis** | Fusil de précision | 95 (Crit ×2,0) | 0,95 | 6 / 36 | 160 m | Fort (0,80) | 3,8° / 0,06° | 1 250 € |

### Améliorations d'armes disponibles (Max 2 par arme)
1. **Canon rayé match (`match_barrel`)** : +20 % dégâts balistiques · Coût : `400 € + 2 Polymères`.
2. **Compensateur tactique (`compensator`)** : -35 % recul et dispersion · Coût : `450 € + 1 Polymère + 1 Cellule`.
3. **Chargeur haute capacité (`extended_mag`)** : +40 % capacité du chargeur & rechargement +25 % plus rapide · Coût : `500 € + 2 Cellules`.
4. **Culasse titane allégée (`titanium_bolt`)** : +18 % cadence de tir & multiplicateur critique +0,35 · Coût : `750 € + 2 Alliages Titane`.

---

## 2. Armures & Matériaux rares (Section 7.1 & 7.3)

### 2.1 Armures (2 emplacements actifs : Torse & Équipement tactique)
| ID | Emplacement | Nom | Bonus passifs | Prix |
|---|---|---|---|---|
| `vest_light` | Emplacement 1 (Torse) | **Gilet Kevlar Urbain** | +15 PV max, -8 % dégâts reçus | Départ (0 €) |
| `vest_exo` | Emplacement 1 (Torse) | **Manteau Blindé Exo-Weave** | +45 PV max, -20 % dégâts reçus | 1 100 € |
| `gear_boots` | Emplacement 2 (Tactique) | **Bottes Cinétiques Silencieuses** | +20 Endurance max, +10 % vitesse d'esquive | 700 € |
| `gear_visor` | Emplacement 2 (Tactique) | **Visière Balistique Boréale** | Délai régénération vie -30 %, +15 % dégâts précision | 1 300 € |

### 2.2 Matériaux rares d'artisanat
1. **Polymère balistique (`polymer`)** : Commun/Peu commun — caches urbaines (Zone 1) et contrats.
2. **Cellule au vanadium (`cell`)** : Rare — conteneurs industriels (Zone 2), puzzles et défis.
3. **Alliage de titane Cendre (`alloy`)** : Très rare — bunkers forestiers (Zone 3), rumeurs et boss d'actes.

---

## 3. Arbres de Compétences — 3 Branches × 3 Paliers (Section 7.2)

Chaque niveau d'expérience (palier tous les `250 XP`) octroie **1 Point de Compétence (PC)**.

### Branche 1 — TIR (`shooting`)
1. **Souffle Calme (`steady_aim`)** : -25 % dispersion et recul sur toutes les armes à feu.
2. **Chargeurs Tactiques (`tactical_reload`)** : +30 % capacité des chargeurs et rechargement accéléré.
3. **Impact Chirurgical (`surgical_rounds`)** : +25 % dégâts d'armes à feu et bonus critique amélioré.

### Branche 2 — COMBAT (`combat`)
1. **Poing d'Acier (`iron_fist`)** : +25 % dégâts des attaques légères et lourdes au corps à corps.
2. **Second Souffle (`second_wind`)** : +35 Endurance max et régénération d'endurance +35 % plus rapide.
3. **Contre-Éclipse (`eclipse_counter`)** : Onde de choc sur le 4e coup lourd du combo et fenêtre de parade élargie (+100 ms), soignant +12 PV à chaque parade parfaite.

### Branche 3 — EXPLORATION (`exploration`)
1. **Foulée Fantôme (`urban_sprinter`)** : +18 % vitesse de marche/course et maniabilité accrue de la Berline.
2. **Amortisseurs Cinétiques (`parkour_absorb`)** : Immunité totale aux dégâts de chute et escalade accélérée (+25 % PV max).
3. **Réseau du Phare (`beacon_intel`)** : Révèle automatiquement tous les coffres, rumeurs et indices de puzzles sur la carte et accorde +25 % de gains en Crédits (€).

---

## 4. Bestiaire Ennemis & Boss (Sections 5.2 & 5.3)

| ID | Archétype | Comportement IA (Machine à états) | PV | Dégâts | Particularité tactique |
|---|---|---|---|---|---|
| `rusher` | **Exécuteur Éclipse** | `PATROL → CHASE → WINDUP → MELEE_STRIKE → STAGGER` | 85 | 14 | Rapide, signal lumineux ambré avant l'impact permettant la parade parfaite. |
| `guard` | **Bastion Éclipse** | `PATROL → SHIELD_ADVANCE → BLOCK → HEAVY_BASH → GUARD_BROKEN` | 135 | 20 | Bouclier frontal bloquant 85 % des coups légers ; vulnérable à l'**Attaque Lourde** ou à la **Parade**. |
| `marksman` | **Tireur / Opérateur** | `PATROL → SEEK_COVER → PEEK_AIM → FIRE_BURST → REPOSITION` | 75 | 12 | Prend abri derrière les barricades, vise au pointeur laser rouge et contourne le joueur. |
| `boss_krow` | **Damien « Krow » Delacroix** | Boss Acte I — Enchaînements rapides & charge sautée | 380 | 22 | Bouclier d'adrénaline ; vulnérable aux contre-attaques après parade. |
| `boss_kael` | **Commandante Iris Kael** | Boss Acte II — Rafales tactiques + estocs éclairs | 460 | 25 | Esquive latérale rapide, alterne tirs de suppression et charges de lame. |
| `boss_warden` | **Le Veilleur** | Boss Acte III — Bouclier cinétique & appel d'escorte | 540 | 26 | Génère une garde renforcée qu'il faut briser par frappes lourdes. |
| `boss_vaneck` | **Sébastien Vaneck** | Boss Final Acte IV — Maître tactique multi-phases | 700 | 30 | Deux phases d'intensité croissante sur l'héliport sous l'orage. |

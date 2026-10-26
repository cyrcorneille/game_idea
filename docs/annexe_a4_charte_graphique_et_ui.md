# Annexe A.4 — Charte Graphique Néo-Noir, Interface Utilisateur & Plan Qualité J1–J6

Projet : **NEXUS**

---

## 1. Identité Visuelle Néo-Noir (« Sodium & Pluie Froide »)

### 1.1 Palette chromatique officielle
| Rôle visuel | Nom | Hex | Usage 3D & Interface |
|---|---|---|---|
| Fond primaire | **Obsidian Asphalt** | `#090D16` | Chaussées humides, arrière-plans de menus, bandes cinématiques |
| Surface UI | **Wet Slate Glass** | `#111827` (88 % alpha) | Panneaux tactiques HUD, cartes, inventaire à flou vitré |
| Accent chaud | **Sodium Amber** | `#F59E0B` | Réverbères urbains, objectifs principaux, combo lourd, indices |
| Accent froid | **Rain Cyan** | `#38BDF8` | Reflets néon de pluie, mode Exploration, endurance, boucliers alliés |
| Alerte / Ennemi | **Eclipse Crimson** | `#EF4444` | Visières du réseau Éclipse, barre de vie critique, indicateur de dégâts |
| Validation / Vie | **Boreal Emerald** | `#10B981` | Santé stable, objectifs bonus validés, terminaux de sauvegarde |
| Texte principal | **Mist White** | `#F1F5F9` | Lisibilité contraste élevé (> 11:1 WCAG AAA) |

### 1.2 Ambiances lumineuses du cycle Jour / Nuit & Météo
1. **Aube (`DAWN`)** : Soleil rasant rosé-orangé (`#FB923C`), brume basse bleutée, réverbères s'éteignant.
2. **Jour (`DAY`)** : Lumière zénithale froide nordique (`#E2E8F0`), ombres nettes, haute visibilité longue distance.
3. **Crépuscule (`DUSK`)** : Ciel pourpre-ambré (`#D97706`), allumage progressif des enseignes et phares automobiles.
4. **Nuit (`NIGHT` — Signature Néo-Noir)** : Ciel indigo profond (`#0B132B`), faisceaux sodium/cyan intenses, reflets spéculaires prononcés sur le bitume mouillé.

---

## 2. Typographie & Architecture Interface (Section 9)

- **Titres & En-têtes tactiques** : *Rajdhani* / *Space Grotesk* / pile système géométrique condensée à espacement large (`letter-spacing: 0.08em`).
- **Corps & Sous-titres** : *Inter* / *Segoe UI* sans-serif haute lisibilité, 3 tailles sélectionnables à chaud :
  - **Petit (`0.88rem`)** · **Normal (`1.0rem`)** · **Grand (`1.18rem`)**.
- **HUD minimaliste adaptatif** :
  - **Haut gauche** : Badge du **Mode actif** (*EXPLORATION · COMBAT · TIR*), Zone actuelle, Heure/Météo, Niveau & Crédits (€).
  - **Haut droite** : **Objectif principal & Objectif bonus** en cours + mini-radar d'orientation et compteur FPS temps réel.
  - **Centre** : Réticule dynamique (point discret en Exploration, losange de verrouillage en Combat, croix dynamique de dispersion / lunette en Tir + anneau directionnel rouge d'impact).
  - **Bas gauche** : Barres fines **Santé** (avec indicateur de régénération) et **Endurance** (active en sprint/combat).
  - **Bas droite** : Arme équipée, compteur `Chargeur / Réserve` (en Mode Tir), indicateur de **Combo `L-L-L-H`** (en Mode Combat) ou vitesse **Berline km/h** (en conduite).
  - **Bas centre** : Bandeau de **Sous-titres radio** avec portrait illustré du locuteur (*Marcus Vance*, *Sébastien Vaneck*, *Elena Rostova*) et invites contextuelles `[E]`.

---

## 3. Illustrations Concept Officielles (`interface/artwork/`)

- `interface/artwork/hero_keyart.jpg` : Illustration clé principale 16:9 de Port-Valois sous la pluie nocturne.
- `interface/artwork/portrait_marcus.jpg` : Portrait officiel de **Marcus Vance**.
- `interface/artwork/portrait_vaneck.jpg` : Portrait officiel de **Sébastien Vaneck**.

---

## 4. Checklist de Validation par Jalon (Section 11.4 & Section 12)

| Jalon | Exigence vérifiée | Statut Godot 4.x | Statut Web 3D Live |
|---|---|---|---|
| **J1 — Prototype** | Déplacement 3D fluide, caméra collision murale, 1 zone, 1 ennemi | Validé (`Zone1_Downtown.tscn`, `Player.tscn`) | Validé (60 FPS constants) |
| **J2 — Combat** | Combo 3L+1H, esquive i-frames, parade timing, endurance, hitstop, 3 ennemis, lock-on | Validé (`CombatController.gd`, `Enemy.gd`) | Validé & jouable |
| **J3 — Tir** | Vue FPS 1re personne, 4 armes, munitions/rechargement, recul/dispersion/ADS, couverture IA | Validé (`FPSController.gd`, 4 `.tres`) | Validé & jouable |
| **J4 — Monde** | 3 zones streamées, cycle jour/nuit (4 états), météo clair/pluie, berline, contrats, carte & fast-travel | Validé (`Main.tscn`, `VehicleBerline.tscn`) | Validé & jouable |
| **J5 — Campagne** | Actes 1 & 2 complets (Missions 1 à 8) + transitions cinématiques | Validé (`MissionManager.gd`) | Validé & jouable |
| **J6 — Finalisation** | Actes 3 & 4 (Missions 9 à 15), 3 puzzles + indices progressifs, audio adaptatif 3 bus, FR/EN, 3 slots sauvegarde | Validé (`SaveManager.gd`, `AudioManager.gd`) | Validé & jouable |

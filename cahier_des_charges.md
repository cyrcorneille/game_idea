# Cahier des charges — « NEXUS »

Version 1.0 — Document de référence complet (Spécifications fonctionnelles, techniques et Annexes narratives).

---

## 1. Contexte et objectif

Le jeu **« NEXUS »** combine trois expériences reconnues au sein d'une œuvre cohérente :

- **Call of Duty** : tir précis, missions scénarisées, rythme soutenu, vue première personne (FPS).
- **God of War** : combat viscéral au corps à corps, caméra épaule, esquives/parades, puzzles d'environnement, mise en scène.
- **GTA** : monde ouvert urbain et périphérique, liberté d'exploration, conduite arcade, activités secondaires, progression par missions.

**Objectif** : proposer une expérience fluide où le joueur incarne **Marcus Vance**, ex-opérateur du renseignement indépendant, alternant entre exploration urbaine libre, duels rapprochés et fusillades tactiques à travers la métropole néo-noir de **Port-Valois**.

**Public cible** : joueurs de 16 ans et plus, amateurs d'action-aventure et de jeux de tir tactiques.

---

## 2. Périmètre

### 2.1 Inclus (version 1.0 livrée)
- **Monde ouvert** découpé en **3 zones streamées** :
  1. *Zone 1 — Centre-ville* (zone de départ, accessible immédiatement).
  2. *Zone 2 — Quartier industriel* (débloquée après la Mission 4).
  3. *Zone 3 — Périphérie / Forêt* (débloquée après la Mission 8).
- **Campagne principale complète de 15 missions** réparties en **4 actes** (objectifs principaux + objectifs bonus optionnels).
- **Trois modes de gameplay distincts** :
  - *Mode Exploration* (3e personne caméra arrière avec collision murale, escalade, interactions, conduite).
  - *Mode Combat rapproché* (3e personne caméra épaule, verrouillage cible, combos 3L + 1H, esquive i-frames, parade chronométrée, endurance, hitstop).
  - *Mode Tir* (1re personne avec arme 3D visible, 4 armes, munitions/rechargement, recul/dispersion/ADS, ennemis à couvert, indicateur directionnel de dégâts, régénération de santé).
- **Véhicule** : berline noire néo-noir à conduite arcade (Zone 1 et missions de poursuite M2 & M13).
- **Puzzles d'environnement** : 3 mécaniques complètes (leviers & portes hydrauliques, plateformes mobiles, ordre de séquence) avec **système d'indices progressifs**.
- **Progression & Économie** : crédits (€), XP & niveaux, matériaux rares, **3 arbres de compétences** (*Tir*, *Combat*, *Exploration*), inventaire (2 emplacements d'armes, 2 d'armures, jusqu'à 2 améliorations par arme) et boutique.
- **Activités secondaires** : contrats répétables (livraison, élimination, course), défis de zone (temps, précision, sans dégât) et rumeurs narratives.
- **Sauvegarde** : 3 emplacements versionnés (sauvegarde manuelle aux terminaux & sauvegarde automatique à chaque mission).
- **Localisation & Accessibilité** : Français et Anglais intégral, sous-titres activables, taille de texte ajustable (Petit / Normal / Grand), contrôles reconfigurables clavier (compatible AZERTY/QWERTY natif) et manette.
- **Double livrable opérationnel** :
  1. **Projet natif Godot 4.x** (`project.godot`, scènes `.tscn`, scripts GDScript modulaires, ressources `.tres`, bus audio) prêt pour Windows 10/11 et validé par suite de tests automatisés.
  2. **Édition Web 3D temps réel interactive** (`web/`, Three.js / WebGL / WebAudio 60 FPS) jouable instantanément dans le navigateur.

### 2.2 Exclu (version 1)
- Multijoueur, coopération, classements en ligne.
- Véhicules complexes hors berline urbaine.
- Éditeur de niveaux, modding.
- Localisation autre que français et anglais.

---

## 3. Plateforme et technologie

| Élément | Choix retenu et implémenté |
|---|---|
| Moteur natif PC | **Godot 4.x** (`config_version=5`, Forward+ / Compatibility) |
| Langage moteur | **GDScript 2.0** typé statiquement, ressources `.tres` pilotées par données |
| Moteur aperçu Web direct | **Three.js + WebGL 2 + WebAudio API** (Vite ES Modules, 60 FPS) |
| Contrôle de version | Git / GitHub (`cyrcorneille/game_idea`) |
| Assets 3D & Textures | Géométrie procédurale articulée optimisée LOD + textures PBR générées + illustrations concept néo-noir (`interface/artwork/`) |
| Audio | Synthèse adaptative procédurale temps réel (3 couches musicales : Exploration, Combat, Tir) + mixeur 3 bus (*Musique*, *Effets*, *Voix*) |
| Cible matérielle | PC milieu de gamme : 8 Go RAM, GPU 4 Go VRAM, 60 FPS constants en 1080p (< 600 objets actifs par zone) |
| Système cible | Windows 10/11 (64 bits) & Navigateurs modernes WebGL2 |

---

## 4. Structure du monde

### 4.1 Découpage
- **Zone 1 — Centre-ville (`zone_1_downtown`)** : boulevards sous la pluie, Tour Vaneck, armurerie de Viktor, ruelles éclairées au sodium, berline stationnée, coffre souterrain à leviers.
- **Zone 2 — Quartier industriel (`zone_2_industrial`)** : quais brumeux, entrepôts logistiques, grues portuaires, fonderie, pont transbordeur à plateformes mobiles.
- **Zone 3 — Périphérie / Forêt (`zone_3_outskirts`)** : forêt de conifères, barrage hydroélectrique, Bunker Cendre souterrain, pylônes de séquence harmonique.
- **Streaming** : chargement asynchrone sans écran noir prolongé (< 1 s Web, < 3 s Godot `ResourceLoader.load_threaded_request`).

### 4.2 Contraintes de monde
- Superficie : ~2 km² répartis sur les trois secteurs interconnectés.
- Cycle jour/nuit à **4 phases** : *Aube*, *Jour*, *Crépuscule*, *Nuit* (impact sur l'éclairage directionnel, le brouillard, les lampadaires et la distance de détection).
- Météo à **2 états** : *Clair* et *Pluie* (rideau de gouttes GPU, reflets humides sur l'asphalte, sans pénalité physique punitive).
- Points d'intérêt : marqueurs de campagne, tableaux de contrats, armurerie, terminaux de sauvegarde/voyage rapide, zones de défis et informateurs de rumeurs.

### 4.3 Navigation
- Carte tactique interactive (`[M]`) avec légende et clic direct pour le **déplacement rapide** entre terminaux débloqués.
- Boussole / repère d'objectif 3D projeté à l'écran avec distance en mètres.

---

## 5. Gameplay

### 5.1 Mode Exploration (3e personne, caméra arrière)
- Marche, course (`Shift`), saut (`Espace`), franchissement/escalade automatique des rebords et caisses basses.
- Interaction contextuelle unifiée (`[E]`) : parler aux PNJ, ramasser matériaux/munitions, actionner mécanismes, conduire la berline, sauvegarder ou acheter de l'équipement.
- Caméra orbitale avec détection de collision murale par raycast (`SpringArm3D` / raycast WebGL).
- Réactions dynamiques des PNJ : **Ignorent** (passants paisibles), **Fuient** (civils en cas de tirs/coups proches), **Alertent** (informateurs appelant des renforts).

### 5.2 Mode Combat rapproché (3e personne, caméra épaule)
- Combo de base enchaîné : **3 attaques légères** (`Clic Gauche` ×3) + **1 attaque lourde brise-garde** (`Clic Droit` / `[F]`).
- **Esquive directionnelle** (`Alt` / `[C]`) avec fenêtre d'invulnérabilité (*i-frames* de 0,32 s) et bonus d'esquive parfaite.
- **Parade & Garde** (`[Q]` / `[V]`) avec fenêtre de timing parfait (0,26 s) étourdissant l'assaillant.
- **Barre d'endurance** limitant les esquives et frappes lourdes avec régénération progressive.
- **Hitstop** (micro-gel d'impact de 65 ms) + secousse caméra dosée pour une lecture viscérale des coups.
- **3 archétypes ennemis minimum** : *Exécuteur* (attaque directe), *Bastion* (garde au bouclier exigeant attaque lourde ou parade), *Tireur* (appui à distance).
- **Verrouillage de cible** (`Tab`) centrant l'ennemi prioritaire en vue épaule.

### 5.3 Mode Tir (1re personne)
- Vue subjective avec modèle 3D d'arme animé (balancement, recul, éjection, flamme de bouche).
- **4 armes complètes** :
  1. `P99 Tactical` (Pistolet semi-automatique polyvalent).
  2. `VX-4 Carbine` (Fusil d'assaut automatique équilibré).
  3. `M590 Breacher` (Fusil à pompe dévastateur à courte portée — 8 plombs).
  4. `SR-25 Nemesis` (Fusil de précision à lunette grossissante).
- Gestion réaliste du chargeur, de la réserve de munitions et du **rechargement (`[R]`)**.
- Recul vertical/horizontal, dispersion dynamique du réticule et **visée précise ADS (`Clic Droit`)**.
- IA tactique utilisant les abris/couvertures et le maillage de navigation (`NavigationAgent3D` / grille tactique).
- **Indicateur de dégâts directionnel** circulaire et **santé régénérative** hors combat après délai de sécurité.
- **Transitions maîtrisées** : passage entre modes par mise en scène scriptée de mission (bandes cinématiques et fondu caméra fluide), jamais subi par surprise au milieu d'une action critique.

### 5.4 Véhicules (version 1)
- Catégorie unique : **Berline urbaine « Valois GT »**.
- Conduite arcade réactive (accélération, freinage/marche arrière, phares dynamiques, jauge de blindage).
- Disponible librement en Zone 1 et lors des missions scénarisées de poursuite (**M2** & **M13**).

### 5.5 Puzzles d'environnement
1. **Leviers et portes hydrauliques** (combinaison d'états logiques).
2. **Plateformes mobiles synchronisées** (ponts transbordeurs alimentés par relais).
3. **Ordre de séquence harmonique** (pylônes codés visuellement et acoustiquement).
- **Indice progressif garanti** : palier 1 visuel dans le décor (0 s), palier 2 conseil contextuel HUD (15 s), palier 3 surbrillance dorée de la prochaine étape (`[H]` ou 30 s).

---

## 6 à 15. Référentiel complet et Annexes rédigées

L'ensemble des chapitres narratifs, catalogues chiffrés et chartes graphiques prévus à l'**Annexe A** est intégralement rédigé dans le dossier [`docs/`](./docs/) :

- **[Annexe A.1 — Synopsis détaillé, Personnages & Dialogues clés](./docs/annexe_a1_synopsis_et_personnages.md)**
- **[Annexe A.2 — Scénario complet des 15 Missions (Actes 1 à 4) & Activités secondaires](./docs/annexe_a2_scenario_missions.md)**
- **[Annexe A.3 — Catalogue complet et équilibrage : Armes, Ennemis, Équipements & Compétences](./docs/annexe_a3_catalogue_armes_ennemis_objets.md)**
- **[Annexe A.4 — Charte Graphique Néo-Noir, Interface Utilisateur & Checklist Qualité J1–J6](./docs/annexe_a4_charte_graphique_et_ui.md)**

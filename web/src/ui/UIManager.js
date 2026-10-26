/**
 * NEXUS — Reactive HUD, Main Menu & Command Deck UI Controller (Section 9).
 */

import {
  WEAPONS_DATA,
  WEAPON_UPGRADES,
  ARMORS_DATA,
  MATERIALS_META,
  SKILL_TREES,
  ZONES_DATA,
  CAMPAIGN_MISSIONS,
  SIDE_ACTIVITIES
} from '../data/gameData.js';
import { UI_STRINGS, SPEAKER_META } from '../data/localization.js';

export class UIManager {
  constructor(sim, input, audio, saveSystem) {
    this.sim = sim;
    this.input = input;
    this.audio = audio;
    this.saveSystem = saveSystem;
    this.activeTab = 'missions';
    this.subtitleTimeout = null;
    this.toastTimeout = null;

    this._cacheElements();
    this._bindEvents();
    this._wireSimulationHooks();
    this.refreshStaticLocale();
  }

  _cacheElements() {
    this.mainMenu = document.getElementById('main-menu');
    this.hud = document.getElementById('game-hud');
    this.modal = document.getElementById('command-modal');
    this.modalBody = document.getElementById('modal-panel-body');

    this.modeBadge = document.getElementById('hud-mode-badge');
    this.zoneNameEl = document.getElementById('hud-zone-name');
    this.envStatusEl = document.getElementById('hud-env-status');
    this.levelEl = document.getElementById('hud-level');
    this.moneyEl = document.getElementById('hud-money');
    this.spEl = document.getElementById('hud-sp');

    this.fpsEl = document.getElementById('hud-fps');
    this.objCountEl = document.getElementById('hud-obj-count');
    this.missionTitleEl = document.getElementById('hud-mission-title');
    this.objDescEl = document.getElementById('hud-obj-desc');
    this.bonusDescEl = document.getElementById('hud-bonus-desc');

    this.hpFill = document.getElementById('hp-bar-fill');
    this.staminaFill = document.getElementById('stamina-bar-fill');
    this.valHp = document.getElementById('val-hp');
    this.valStamina = document.getElementById('val-stamina');

    this.wpnPills = document.getElementById('hud-wpn-pills');
    this.wpnName = document.getElementById('hud-weapon-name');
    this.ammoMag = document.getElementById('hud-ammo-mag');
    this.ammoRes = document.getElementById('hud-ammo-res');
    this.comboReadout = document.getElementById('combo-readout');
    this.vehicleReadout = document.getElementById('vehicle-readout');
    this.carSpeedEl = document.getElementById('car-speed');
    this.carHpEl = document.getElementById('car-hp');

    this.bossHud = document.getElementById('boss-hud');
    this.bossNameEl = document.getElementById('boss-name');
    this.bossBarFill = document.getElementById('boss-bar-fill');

    this.scopeOverlay = document.getElementById('sniper-scope-overlay');
    this.damageVignette = document.getElementById('damage-vignette');
    this.directionalArc = document.getElementById('directional-arc');
    this.letterbox = document.getElementById('cinema-letterbox');
    this.cinemaTitle = document.getElementById('cinema-mode-title');
    this.cinemaPrefix = document.getElementById('cinema-prefix');

    this.contextPrompt = document.getElementById('context-prompt');
    this.subtitleBanner = document.getElementById('subtitle-banner');
    this.subPortrait = document.getElementById('sub-portrait');
    this.subSpeaker = document.getElementById('sub-speaker');
    this.subText = document.getElementById('sub-text');
    this.toastBanner = document.getElementById('toast-banner');
    this.floatingLayer = document.getElementById('floating-combat-layer');
    this.hitmarker = document.getElementById('hitmarker');
    this.waypointTag = document.getElementById('waypoint-tag');
    this.waypointDist = document.getElementById('waypoint-dist');
  }

  _bindEvents() {
    // Language switch on Main Menu
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sim.lang = btn.dataset.lang;
        document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('active', b === btn));
        this.refreshStaticLocale();
      });
    });

    // Main Menu CTAs
    document.getElementById('btn-start-campaign').addEventListener('click', () => {
      this.audio.init();
      this.startGameplay(false);
      this.sim.launchCampaignMission(0);
    });

    const continueBtn = document.getElementById('btn-continue-save');
    if (this.saveSystem.hasAnySave()) {
      continueBtn.classList.remove('hidden');
      continueBtn.addEventListener('click', () => {
        this.audio.init();
        const slot = this.saveSystem.getLatestSlot() || 1;
        const data = this.saveSystem.loadSlot(slot);
        if (data) this.sim.importSaveData(data);
        this.startGameplay(false);
      });
    }

    document.getElementById('btn-sandbox-all').addEventListener('click', () => {
      this.audio.init();
      this.sim.unlockEverythingSandbox();
      this.startGameplay(false);
      this.sim.launchCampaignMission(0);
    });

    document.getElementById('btn-open-settings').addEventListener('click', () => {
      this.audio.init();
      this.openModal('settings');
    });

    // HUD Quick Mode Switcher
    document.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audio.init();
        this.sim.requestModeSwitch(btn.dataset.mode, true);
      });
    });

    // HUD Command Deck buttons
    document.querySelectorAll('[data-open-tab]').forEach((btn) => {
      btn.addEventListener('click', () => this.openModal(btn.dataset.openTab));
    });

    // Modal Tabs & Close
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.openModal(btn.dataset.tab));
    });
    document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());

    // Canvas click safely captures mouse when playing
    this.sim.canvas.addEventListener('click', () => {
      this.audio.init();
      if (!this.sim.isPaused) {
        this.input.requestPointerCaptureSafe();
      }
    });

    // Global Menu Hotkeys (J=Missions, I=Inventory, K=Skills, M=Map, F5=QuickSave, O/P/Esc=Pause)
    window.addEventListener('keydown', (e) => {
      if (this.input.awaitingRebindAction) return;
      if (!this.mainMenu.classList.contains('hidden') && this.modal.classList.contains('hidden')) return;

      const mapHotkeys = {
        KeyJ: 'missions',
        KeyI: 'inventory',
        KeyK: 'skills',
        KeyM: 'map',
        KeyO: 'settings',
        KeyP: 'missions'
      };
      if (e.code === 'F5') {
        e.preventDefault();
        this.sim.saveManualCheckpoint();
        return;
      }
      if (e.code === 'Escape') {
        if (!this.modal.classList.contains('hidden')) this.closeModal();
        else this.openModal('missions');
        return;
      }
      if (mapHotkeys[e.code]) {
        if (!this.modal.classList.contains('hidden') && this.activeTab === mapHotkeys[e.code]) {
          this.closeModal();
        } else {
          this.openModal(mapHotkeys[e.code]);
        }
      }
    });
  }

  _wireSimulationHooks() {
    this.sim.onOpenMenuRequest = (tab) => this.openModal(tab);

    this.sim.onSubtitle = (speakerId, text) => {
      if (!this.sim.subtitlesEnabled) return;
      const meta = SPEAKER_META[speakerId] || SPEAKER_META.elena;
      this.subPortrait.src = meta.portrait;
      this.subSpeaker.textContent = `${meta.name} — ${meta.role[this.sim.lang]}`;
      this.subSpeaker.style.color = meta.color;
      this.subText.textContent = text;
      this.subtitleBanner.classList.remove('hidden');
      clearTimeout(this.subtitleTimeout);
      this.subtitleTimeout = setTimeout(() => this.subtitleBanner.classList.add('hidden'), 6500);
    };

    this.sim.onToast = (msg) => {
      this.toastBanner.textContent = msg;
      this.toastBanner.classList.remove('hidden');
      clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => this.toastBanner.classList.add('hidden'), 3400);
    };

    this.sim.onFloatingText = (x, y, label, isCrit) => {
      const el = document.createElement('div');
      el.className = `float-dmg ${isCrit ? 'crit' : ''}`;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.textContent = label;
      this.floatingLayer.appendChild(el);
      setTimeout(() => el.remove(), 680);
    };

    this.sim.onCinematicTransition = (targetMode) => {
      const s = UI_STRINGS[this.sim.lang];
      this.cinemaPrefix.textContent = s.transition_prefix;
      this.cinemaTitle.textContent = s[`mode_${targetMode}`] || targetMode;
      this.letterbox.classList.remove('hidden');
      setTimeout(() => this.letterbox.classList.add('hidden'), 1350);
    };

    this.sim.onHitmarker = (isCrit) => {
      this.hitmarker.classList.toggle('crit', Boolean(isCrit));
      this.hitmarker.classList.remove('hidden');
      setTimeout(() => this.hitmarker.classList.add('hidden'), 110);
    };

    this.sim.onDirectionalDamage = (angleRad) => {
      this.directionalArc.style.transform = `rotate(${angleRad}rad)`;
      this.directionalArc.classList.remove('hidden');
      setTimeout(() => this.directionalArc.classList.add('hidden'), 420);
    };
  }

  startGameplay() {
    this.mainMenu.classList.add('hidden');
    this.modal.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.sim.isPaused = false;
    this.audio.setMode(this.sim.mode);
  }

  openModal(tabName = 'missions') {
    this.activeTab = tabName;
    this.sim.isPaused = true;
    this.input.releasePointerCaptureSafe();
    this.modal.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    this.renderActiveTab();
  }

  closeModal() {
    this.modal.classList.add('hidden');
    if (this.mainMenu.classList.contains('hidden')) {
      this.sim.isPaused = false;
    }
  }

  refreshStaticLocale() {
    const s = UI_STRINGS[this.sim.lang];
    document.getElementById('mm-tagline').textContent = s.subtitle_tagline;
    document.getElementById('btn-start-campaign').textContent = s.btn_new_game;
    document.getElementById('btn-continue-save').textContent = s.btn_continue;
    document.getElementById('btn-sandbox-all').textContent = s.btn_free_eval;
    document.getElementById('btn-open-settings').textContent = s.btn_options;

    document.getElementById('lbl-hp').textContent = s.hp_label;
    document.getElementById('lbl-stamina').textContent = s.stamina_label;
    document.getElementById('hud-obj-header').textContent = s.objective_header;

    document.getElementById('tab-lbl-missions').textContent = s.tab_missions;
    document.getElementById('tab-lbl-inventory').textContent = s.tab_inventory;
    document.getElementById('tab-lbl-skills').textContent = s.tab_skills;
    document.getElementById('tab-lbl-map').textContent = s.tab_map;
    document.getElementById('tab-lbl-saves').textContent = s.tab_saves;
    document.getElementById('tab-lbl-settings').textContent = s.tab_settings;
    document.getElementById('btn-close-modal').textContent = s.close_resume;
  }

  updateHUD() {
    if (this.hud.classList.contains('hidden')) return;
    const s = UI_STRINGS[this.sim.lang];

    this.modeBadge.textContent = s[`mode_${this.sim.mode}`];
    this.modeBadge.dataset.mode = this.sim.mode;
    document.querySelectorAll('[data-mode]').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === this.sim.mode);
    });

    const zData = ZONES_DATA[this.sim.currentZoneId];
    this.zoneNameEl.textContent = zData ? zData.name[this.sim.lang] : this.sim.currentZoneId;
    const timeKey = ['DAWN', 'DAY', 'DUSK', 'NIGHT'][this.sim.timeIndex % 4];
    this.envStatusEl.textContent = `${s[`time_${timeKey}`]} · ${s[`weather_${this.sim.weather}`]}`;

    this.levelEl.textContent = this.sim.level;
    this.moneyEl.textContent = this.sim.money;
    this.spEl.textContent = this.sim.skillPoints;
    this.fpsEl.textContent = this.sim.fpsMeasured;
    this.objCountEl.textContent = this.sim.worldBuilder.activeObjectCount + this.sim.enemies.length;

    // Vitals & low-health vignette
    const maxHp = this.sim.getMaxHealth();
    const maxSt = this.sim.getMaxStamina();
    const hpRatio = Math.max(0, Math.min(1, this.sim.health / maxHp));
    this.hpFill.style.width = `${hpRatio * 100}%`;
    this.staminaFill.style.width = `${Math.max(0, Math.min(1, this.sim.stamina / maxSt)) * 100}%`;
    this.valHp.textContent = `${Math.round(this.sim.health)} / ${maxHp}`;
    this.valStamina.textContent = `${Math.round(this.sim.stamina)} / ${maxSt}`;
    this.damageVignette.style.boxShadow =
      hpRatio < 0.45 ? `inset 0 0 120px rgba(239, 68, 68, ${(0.5 - hpRatio) * 1.4})` : 'none';

    // Mission & Waypoint display
    if (this.sim.activeMission) {
      const m = this.sim.activeMission;
      const st = m.stages[this.sim.stageIndex];
      this.missionTitleEl.textContent = m.title[this.sim.lang];
      this.objDescEl.textContent = st ? st.label[this.sim.lang] : '';
      this.bonusDescEl.textContent = `★ ${m.bonusText[this.sim.lang]}`;

      if (this.sim.activeWaypointMesh.visible) {
        const sp = this.sim.projectToScreen(this.sim.activeWaypointMesh.position.clone().setY(2.2));
        const d = Math.round(
          Math.hypot(
            this.sim.playerPos.x - this.sim.activeWaypointMesh.position.x,
            this.sim.playerPos.z - this.sim.activeWaypointMesh.position.z
          )
        );
        this.waypointDist.textContent = `${d} m`;
        this.waypointTag.classList.remove('hidden');
        if (sp) {
          this.waypointTag.style.position = 'fixed';
          this.waypointTag.style.left = `${Math.max(40, Math.min(window.innerWidth - 40, sp.x))}px`;
          this.waypointTag.style.top = `${Math.max(40, Math.min(window.innerHeight - 40, sp.y))}px`;
        }
      } else {
        this.waypointTag.classList.add('hidden');
      }
    } else {
      const nextM = CAMPAIGN_MISSIONS[this.sim.currentMissionIndex];
      this.missionTitleEl.textContent = nextM ? nextM.title[this.sim.lang] : 'NEXUS';
      this.objDescEl.textContent = s.free_roam_obj;
      this.bonusDescEl.textContent = '';
      this.waypointTag.classList.add('hidden');
    }

    // Boss bar check
    const activeBoss = this.sim.enemies.find((e) => e.arch.isBoss && e.hp > 0);
    if (activeBoss) {
      this.bossHud.classList.remove('hidden');
      this.bossNameEl.textContent = activeBoss.arch.name[this.sim.lang];
      this.bossBarFill.style.width = `${(activeBoss.hp / activeBoss.maxHp) * 100}%`;
    } else {
      this.bossHud.classList.add('hidden');
    }

    // Context prompt
    if (this.sim.currentContextPrompt) {
      this.contextPrompt.textContent = this.sim.currentContextPrompt;
      this.contextPrompt.classList.remove('hidden');
    } else {
      this.contextPrompt.classList.add('hidden');
    }

    // Weapon / Combo / Vehicle panel + Sniper Scope
    const wpn = this.sim.getCurrentWeaponData();
    this.scopeOverlay.classList.toggle(
      'hidden',
      !(this.sim.mode === 'SHOOTING' && this.sim.isAimingADS && wpn.hasScope && !this.sim.inVehicle)
    );

    if (this.sim.inVehicle && this.sim.vehicle) {
      this.vehicleReadout.classList.remove('hidden');
      this.carSpeedEl.textContent = Math.round(Math.abs(this.sim.vehicle.speed) * 3.6);
      this.carHpEl.textContent = Math.round(this.sim.vehicle.integrity);
    } else {
      this.vehicleReadout.classList.add('hidden');
    }

    this.wpnName.textContent = wpn.name[this.sim.lang];
    this.ammoMag.textContent = this.sim.isReloading ? '...' : this.sim.ammoInMag[wpn.id] ?? 0;
    this.ammoRes.textContent = this.sim.ammoReserve[wpn.id] ?? 0;

    this.wpnPills.innerHTML = this.sim.ownedWeapons
      .map(
        (id, idx) =>
          `<button class="mini-btn ${idx === this.sim.activeWeaponSlot ? 'active' : ''}" data-wpn-idx="${idx}">[${idx + 1}] ${WEAPONS_DATA[id].name[this.sim.lang]}</button>`
      )
      .join('');
    this.wpnPills.querySelectorAll('[data-wpn-idx]').forEach((b) => {
      b.onclick = () => this.sim.equipWeaponSlot(Number(b.dataset.wpnIdx));
    });

    this.comboReadout.classList.toggle('hidden', this.sim.mode !== 'COMBAT');
    if (this.sim.mode === 'COMBAT') {
      this.comboReadout.querySelectorAll('i').forEach((el) => {
        el.classList.toggle('lit', Number(el.dataset.step) <= this.sim.comboStep);
      });
    }
  }

  // === MODAL TABS RENDERING ===
  renderActiveTab() {
    const lang = this.sim.lang;
    const s = UI_STRINGS[lang];

    if (this.activeTab === 'missions') {
      this.modalBody.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
          <h3 class="section-heading" style="margin:0;">${lang === 'fr' ? 'Campagne Principale — 15 Missions (Actes I à IV)' : 'Main Campaign — All 15 Missions (Acts I to IV)'}</h3>
          <button id="unlock-all-modal" class="action-btn">${s.unlock_all_btn}</button>
        </div>
        <div class="grid-cards">
          ${CAMPAIGN_MISSIONS.map((m, idx) => {
            const isCurrent = idx === this.sim.currentMissionIndex;
            return `
              <div class="item-card ${isCurrent ? 'current' : ''}">
                <div style="font-size:0.72rem;color:var(--amber);font-weight:700;">ACTE ${m.act} · ${ZONES_DATA[m.zoneId].name[lang]}</div>
                <h4>${m.title[lang]}</h4>
                <p>${m.briefing[lang]}</p>
                <p style="color:var(--cyan);">★ ${m.bonusText[lang]} · <strong>${m.rewardMoney} €</strong></p>
                <button class="action-btn launch-m-btn" data-m-idx="${idx}">
                  ${lang === 'fr' ? 'Lancer la mission' : 'Launch Mission'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
        <h3 class="section-heading">${lang === 'fr' ? 'Contrats Répétables & Défis de Maîtrise' : 'Repeatable Fixer Contracts & Zone Challenges'}</h3>
        <div class="grid-cards">
          ${SIDE_ACTIVITIES.map((act) => `
            <div class="item-card">
              <h4>${act.name[lang]}</h4>
              <p>${act.desc[lang]}</p>
              <p style="color:var(--emerald);">+${act.rewardMoney} € · +${act.rewardXp} XP</p>
              <button class="action-btn launch-side-btn" data-side-id="${act.id}">
                ${lang === 'fr' ? 'Démarrer le contrat' : 'Start Contract'}
              </button>
            </div>
          `).join('')}
        </div>
      `;

      document.getElementById('unlock-all-modal').onclick = () => {
        this.sim.unlockEverythingSandbox();
        this.renderActiveTab();
      };
      this.modalBody.querySelectorAll('.launch-m-btn').forEach((btn) => {
        btn.onclick = () => {
          this.startGameplay();
          this.sim.launchCampaignMission(Number(btn.dataset.mIdx));
        };
      });
      this.modalBody.querySelectorAll('.launch-side-btn').forEach((btn) => {
        btn.onclick = () => {
          this.startGameplay();
          this.sim.launchSideActivity(btn.dataset.sideId);
        };
      });
      return;
    }

    if (this.activeTab === 'inventory') {
      const matsHtml = Object.values(MATERIALS_META)
        .map((m) => `<span style="margin-right:14px;color:${m.color};font-weight:700;">● ${m.name[lang]}: ${this.sim.materials[m.id]}</span>`)
        .join('');

      this.modalBody.innerHTML = `
        <div style="margin-bottom:14px;">
          <strong>${lang === 'fr' ? 'Crédits disponibles' : 'Credits'}: <span style="color:var(--amber)">${this.sim.money} €</span></strong>
          <div style="margin-top:6px;font-size:0.84rem;">${matsHtml}</div>
        </div>
        <h3 class="section-heading">${lang === 'fr' ? 'Arsenal & Établi d’Améliorations (Max 2 améliorations / arme)' : 'Arsenal & Weapon Bench (Max 2 upgrades / weapon)'}</h3>
        <div class="grid-cards">
          ${Object.values(WEAPONS_DATA).map((w) => {
            const owned = this.sim.ownedWeapons.includes(w.id);
            const upgs = this.sim.weaponUpgrades[w.id] || [];
            return `
              <div class="item-card">
                <h4>[${w.slotKey}] ${w.name[lang]} <span style="font-size:0.75rem;color:var(--cyan);">(${w.category[lang]})</span></h4>
                <p>${w.desc[lang]}</p>
                <p>DMG: <strong>${w.damage}${w.pellets > 1 ? `×${w.pellets}` : ''}</strong> · Mag: <strong>${this.sim.getEffectiveMagSize(w.id)}</strong> · Améliorations: <strong>${upgs.length}/2</strong></p>
                ${
                  owned
                    ? Object.values(WEAPON_UPGRADES)
                        .map((u) => {
                          const hasU = upgs.includes(u.id);
                          const canBuy =
                            !hasU &&
                            upgs.length < 2 &&
                            this.sim.money >= u.costMoney &&
                            this.sim.materials[u.matId] >= u.matCost;
                          return `<button class="action-btn buy-upg-btn" data-wpn="${w.id}" data-upg="${u.id}" ${canBuy ? '' : 'disabled'}>
                            ${hasU ? '✓ ' : ''}${u.name[lang]} (${u.costMoney}€ + ${u.matCost} ${MATERIALS_META[u.matId].name[lang]})
                          </button>`;
                        })
                        .join('')
                    : `<button class="action-btn buy-wpn-btn" data-wpn="${w.id}" ${this.sim.money >= w.price ? '' : 'disabled'}>
                        ${lang === 'fr' ? 'Acheter l’arme' : 'Purchase Weapon'} (${w.price} €)
                      </button>`
                }
              </div>
            `;
          }).join('')}
        </div>
        <h3 class="section-heading">${lang === 'fr' ? 'Armures & Équipements Tactiques (2 Emplacements)' : 'Armors & Tactical Gear (2 Slots)'}</h3>
        <div class="grid-cards">
          ${Object.values(ARMORS_DATA).map((a) => {
            const owned = this.sim.ownedArmors.includes(a.id);
            const equipped = this.sim.equippedArmors[a.slot] === a.id;
            return `
              <div class="item-card ${equipped ? 'current' : ''}">
                <h4>${a.name[lang]}</h4>
                <p>${a.desc[lang]}</p>
                ${
                  owned
                    ? `<button class="action-btn equip-armor-btn" data-armor="${a.id}" ${equipped ? 'disabled' : ''}>
                        ${equipped ? (lang === 'fr' ? '✓ Équipé' : '✓ Equipped') : lang === 'fr' ? 'Équiper' : 'Equip'}
                      </button>`
                    : `<button class="action-btn buy-armor-btn" data-armor="${a.id}" ${this.sim.money >= a.price ? '' : 'disabled'}>
                        ${lang === 'fr' ? 'Acheter' : 'Buy'} (${a.price} €)
                      </button>`
                }
              </div>
            `;
          }).join('')}
        </div>
      `;

      this.modalBody.querySelectorAll('.buy-wpn-btn').forEach((b) => {
        b.onclick = () => {
          const w = WEAPONS_DATA[b.dataset.wpn];
          if (this.sim.money >= w.price) {
            this.sim.money -= w.price;
            this.sim.ownedWeapons.push(w.id);
            this.sim.equipSpecificWeapon(w.id);
            this.renderActiveTab();
          }
        };
      });
      this.modalBody.querySelectorAll('.buy-upg-btn').forEach((b) => {
        b.onclick = () => {
          const u = WEAPON_UPGRADES[b.dataset.upg];
          const wId = b.dataset.wpn;
          if (this.sim.money >= u.costMoney && this.sim.materials[u.matId] >= u.matCost) {
            this.sim.money -= u.costMoney;
            this.sim.materials[u.matId] -= u.matCost;
            this.sim.weaponUpgrades[wId].push(u.id);
            this.sim.ammoInMag[wId] = this.sim.getEffectiveMagSize(wId);
            this.renderActiveTab();
          }
        };
      });
      this.modalBody.querySelectorAll('.buy-armor-btn').forEach((b) => {
        b.onclick = () => {
          const a = ARMORS_DATA[b.dataset.armor];
          if (this.sim.money >= a.price) {
            this.sim.money -= a.price;
            this.sim.ownedArmors.push(a.id);
            this.sim.equippedArmors[a.slot] = a.id;
            this.sim.health = this.sim.getMaxHealth();
            this.renderActiveTab();
          }
        };
      });
      this.modalBody.querySelectorAll('.equip-armor-btn').forEach((b) => {
        b.onclick = () => {
          const a = ARMORS_DATA[b.dataset.armor];
          this.sim.equippedArmors[a.slot] = a.id;
          this.sim.health = Math.min(this.sim.getMaxHealth(), this.sim.health);
          this.renderActiveTab();
        };
      });
      return;
    }

    if (this.activeTab === 'skills') {
      this.modalBody.innerHTML = `
        <div style="margin-bottom:14px;font-size:0.95rem;">
          ${lang === 'fr' ? 'Points de Compétence disponibles' : 'Available Skill Points'}:
          <strong style="color:var(--amber);font-size:1.2rem;">${this.sim.skillPoints} PC</strong>
        </div>
        <div class="grid-cards">
          ${Object.values(SKILL_TREES).map((branch) => `
            <div class="item-card" style="border-color:${branch.accent}">
              <h4 style="color:${branch.accent}">${branch.title[lang]}</h4>
              ${branch.skills.map((sk) => {
                const unlocked = this.sim.hasSkill(branch.id, sk.id);
                return `
                  <div style="padding:8px;background:#0a0f1c;border-radius:6px;margin-top:6px;">
                    <strong>${sk.name[lang]}</strong>
                    <p style="margin:4px 0 8px;">${sk.desc[lang]}</p>
                    <button class="action-btn unlock-sk-btn" data-branch="${branch.id}" data-sk="${sk.id}" ${
                      unlocked || this.sim.skillPoints <= 0 ? 'disabled' : ''
                    }>
                      ${unlocked ? (lang === 'fr' ? '✓ Débloqué' : '✓ Unlocked') : lang === 'fr' ? 'Débloquer (1 PC)' : 'Unlock (1 SP)'}
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>
      `;
      this.modalBody.querySelectorAll('.unlock-sk-btn').forEach((b) => {
        b.onclick = () => {
          if (this.sim.skillPoints > 0) {
            this.sim.unlockedSkills[b.dataset.branch].push(b.dataset.sk);
            this.sim.skillPoints--;
            this.sim.health = this.sim.getMaxHealth();
            this.sim.stamina = this.sim.getMaxStamina();
            this.renderActiveTab();
          }
        };
      });
      return;
    }

    if (this.activeTab === 'map') {
      this.modalBody.innerHTML = `
        <div class="map-layout">
          <div>
            <canvas id="tactical-map-canvas" width="440" height="440"></canvas>
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
              <button id="btn-cycle-time" class="action-btn">☀ / ☾ ${lang === 'fr' ? 'Changer Heure Jour/Nuit' : 'Cycle Time of Day'}</button>
              <button id="btn-toggle-weather" class="action-btn">🌧 ${lang === 'fr' ? 'Basculer Clair / Pluie' : 'Toggle Clear / Rain'}</button>
              <button id="btn-trigger-hint" class="action-btn">💡 ${s.hint_btn}</button>
            </div>
          </div>
          <div>
            <h3 class="section-heading">${lang === 'fr' ? 'Streaming de Zones & Voyage Rapide' : 'Zone Streaming & Fast-Travel Checkpoints'}</h3>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${Object.values(ZONES_DATA).map((z) => {
                const unlocked = this.sim.unlockedZones.includes(z.id);
                return `
                  <div class="item-card ${z.id === this.sim.currentZoneId ? 'current' : ''}">
                    <h4>${z.name[lang]} ${unlocked ? '' : '🔒'}</h4>
                    <p>${z.subtitle[lang]}</p>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                      ${z.checkpoints.map((cp) => `
                        <button class="action-btn ft-btn" data-z="${z.id}" data-x="${cp.x}" data-cz="${cp.z}" ${unlocked ? '' : 'disabled'}>
                          ⚡ ${cp.name[lang]}
                        </button>
                      `).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-cycle-time').onclick = () => {
        this.sim.cycleTimeOfDay();
        this._drawTacticalMap();
      };
      document.getElementById('btn-toggle-weather').onclick = () => {
        this.sim.toggleWeather();
        this._drawTacticalMap();
      };
      document.getElementById('btn-trigger-hint').onclick = () => {
        this.sim.triggerManualPuzzleHint();
        this.closeModal();
      };
      this.modalBody.querySelectorAll('.ft-btn').forEach((b) => {
        b.onclick = () => {
          this.sim.fastTravelTo(b.dataset.z, Number(b.dataset.x), Number(b.dataset.cz));
          this.startGameplay();
        };
      });
      this._drawTacticalMap();
      return;
    }

    if (this.activeTab === 'saves') {
      this.modalBody.innerHTML = `
        <h3 class="section-heading">${lang === 'fr' ? 'Système de Sauvegarde Versionné (3 Emplacements JSON)' : 'Versioned Save Slots (3 JSON Slots + Auto-Save)'}</h3>
        <div class="grid-cards">
          ${[1, 2, 3].map((slot) => {
            const info = this.saveSystem.getSlotSummary(slot);
            return `
              <div class="item-card ${this.saveSystem.activeSlot === slot ? 'current' : ''}">
                <h4>Slot #${slot} ${info?.isAuto ? '(Auto)' : ''}</h4>
                <p>${
                  info
                    ? `Nv.${info.level} · ${info.money} € · Mission ${info.missionIndex + 1}/15<br/>${ZONES_DATA[info.zoneId]?.name[lang] || info.zoneId}<br/><small>${new Date(info.savedAt).toLocaleString()}</small>`
                    : s.empty_slot
                }</p>
                <div style="display:flex;gap:8px;">
                  <button class="action-btn save-slot-btn" data-slot="${slot}">${s.save_manual}</button>
                  <button class="action-btn load-slot-btn" data-slot="${slot}" ${info ? '' : 'disabled'}>${s.load_slot}</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      this.modalBody.querySelectorAll('.save-slot-btn').forEach((b) => {
        b.onclick = () => {
          this.sim.saveManualCheckpoint(Number(b.dataset.slot));
          this.renderActiveTab();
        };
      });
      this.modalBody.querySelectorAll('.load-slot-btn').forEach((b) => {
        b.onclick = () => {
          const loaded = this.saveSystem.loadSlot(Number(b.dataset.slot));
          if (loaded) {
            this.sim.importSaveData(loaded);
            this.sim.notifyToast(s.loaded_toast);
            this.startGameplay();
          }
        };
      });
      return;
    }

    // Settings Tab (Audio 3 buses, FR/EN, Subtitles, Text Size, Key Rebinding)
    const actionLabels = [
      ['forward', lang === 'fr' ? 'Avancer (Z / W)' : 'Move Forward'],
      ['backward', lang === 'fr' ? 'Reculer (S)' : 'Move Backward'],
      ['left', lang === 'fr' ? 'Gauche (Q / A)' : 'Strafe Left'],
      ['right', lang === 'fr' ? 'Droite (D)' : 'Strafe Right'],
      ['jump', lang === 'fr' ? 'Sauter / Escalader' : 'Jump / Vault'],
      ['interact', lang === 'fr' ? 'Interagir / Véhicule' : 'Interact / Drive'],
      ['dodge', lang === 'fr' ? 'Esquive (i-frames)' : 'Dodge (i-frames)'],
      ['parry', lang === 'fr' ? 'Parade Parfaite' : 'Perfect Parry'],
      ['heavy', lang === 'fr' ? 'Attaque Lourde' : 'Heavy Strike'],
      ['reload', lang === 'fr' ? 'Recharger Arme' : 'Reload Weapon']
    ];

    this.modalBody.innerHTML = `
      <h3 class="section-heading">${lang === 'fr' ? 'Mixage Audio Séparé (Section 10)' : 'Independent Audio Mixer (Section 10)'}</h3>
      <div class="slider-row">
        <span>${lang === 'fr' ? 'Volume Musique Adaptative' : 'Adaptive Music Volume'}</span>
        <input type="range" min="0" max="100" value="${Math.round(this.audio.volumes.music * 100)}" id="vol-music" />
      </div>
      <div class="slider-row">
        <span>${lang === 'fr' ? 'Volume Effets Sonores (Armes, Pas, Pluie)' : 'SFX Volume (Weapons, Impacts, Rain)'}</span>
        <input type="range" min="0" max="100" value="${Math.round(this.audio.volumes.sfx * 100)}" id="vol-sfx" />
      </div>
      <div class="slider-row">
        <span>${lang === 'fr' ? 'Volume Voix & Radio' : 'Dialogue & Radio Voice Volume'}</span>
        <input type="range" min="0" max="100" value="${Math.round(this.audio.volumes.voice * 100)}" id="vol-voice" />
      </div>

      <h3 class="section-heading">${lang === 'fr' ? 'Langue, Sous-titres & Lisibilité (Section 9)' : 'Language, Subtitles & Text Size'}</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
        <button class="action-btn" id="opt-toggle-lang">${lang === 'fr' ? 'Basculer FR / EN (Actuel: FR)' : 'Switch FR / EN (Current: EN)'}</button>
        <button class="action-btn" id="opt-toggle-subs">${lang === 'fr' ? 'Sous-titres' : 'Subtitles'}: ${this.sim.subtitlesEnabled ? 'ON' : 'OFF'}</button>
        <button class="action-btn scale-btn" data-sc="small">${lang === 'fr' ? 'Texte Petit' : 'Small Text'}</button>
        <button class="action-btn scale-btn" data-sc="normal">${lang === 'fr' ? 'Texte Normal' : 'Normal Text'}</button>
        <button class="action-btn scale-btn" data-sc="large">${lang === 'fr' ? 'Texte Grand' : 'Large Text'}</button>
      </div>

      <h3 class="section-heading">${lang === 'fr' ? 'Contrôles Reconfigurables (Clavier AZERTY/QWERTY + Manette active)' : 'Rebindable Controls (Keyboard + Gamepad Ready)'}</h3>
      <div class="grid-cards">
        ${actionLabels.map(([actKey, label]) => `
          <div class="item-card" style="flex-direction:row;align-items:center;justify-content:space-between;">
            <span>${label}</span>
            <button class="action-btn rebind-btn" data-act="${actKey}">${this.input.bindings[actKey]}</button>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('vol-music').oninput = (e) => this.audio.setVolume('music', e.target.value / 100);
    document.getElementById('vol-sfx').oninput = (e) => this.audio.setVolume('sfx', e.target.value / 100);
    document.getElementById('vol-voice').oninput = (e) => this.audio.setVolume('voice', e.target.value / 100);

    document.getElementById('opt-toggle-lang').onclick = () => {
      this.sim.lang = this.sim.lang === 'fr' ? 'en' : 'fr';
      this.refreshStaticLocale();
      this.renderActiveTab();
    };
    document.getElementById('opt-toggle-subs').onclick = () => {
      this.sim.subtitlesEnabled = !this.sim.subtitlesEnabled;
      this.renderActiveTab();
    };
    this.modalBody.querySelectorAll('.scale-btn').forEach((b) => {
      b.onclick = () => {
        document.body.dataset.scale = b.dataset.sc;
      };
    });
    this.modalBody.querySelectorAll('.rebind-btn').forEach((b) => {
      b.onclick = () => {
        b.textContent = '...';
        this.input.startRebind(b.dataset.act, () => this.renderActiveTab());
      };
    });
  }

  _drawTacticalMap() {
    const canvas = document.getElementById('tactical-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const mapCoord = (val) => ((val + 96) / 192) * w;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, w, h);

    // Tactical grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    for (let g = 0; g <= w; g += 44) {
      ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(w, g); ctx.stroke();
    }

    // Buildings & Structures footprint
    ctx.fillStyle = '#1e293b';
    this.sim.worldBuilder.colliders.forEach((c) => {
      ctx.fillRect(
        mapCoord(c.minX),
        mapCoord(c.minZ),
        Math.max(3, ((c.maxX - c.minX) / 192) * w),
        Math.max(3, ((c.maxZ - c.minZ) / 192) * h)
      );
    });

    // Checkpoints (Emerald)
    this.sim.worldBuilder.interactables.forEach((it) => {
      if (it.type === 'checkpoint') {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(mapCoord(it.x) - 5, mapCoord(it.z) - 5, 10, 10);
      } else if (it.type === 'shop') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(mapCoord(it.x) - 5, mapCoord(it.z) - 5, 10, 10);
      } else if (it.type === 'loot' && !it.collected && this.sim.hasSkill('exploration', 'beacon_intel')) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(mapCoord(it.x) - 3, mapCoord(it.z) - 3, 6, 6);
      }
    });

    // Active Mission Waypoint (Gold Diamond)
    if (this.sim.activeWaypointMesh.visible) {
      const wx = mapCoord(this.sim.activeWaypointMesh.position.x);
      const wz = mapCoord(this.sim.activeWaypointMesh.position.z);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(wx, wz, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies (Crimson dots)
    ctx.fillStyle = '#ef4444';
    this.sim.enemies.forEach((e) => {
      ctx.beginPath();
      ctx.arc(mapCoord(e.group.position.x), mapCoord(e.group.position.z), 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player Marker (Bright Cyan Triangle)
    const px = mapCoord(this.sim.playerPos.x);
    const pz = mapCoord(this.sim.playerPos.z);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-this.sim.yaw);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 8);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

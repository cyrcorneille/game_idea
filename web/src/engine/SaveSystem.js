/**
 * NEXUS — Versioned 3-Slot Save System (Section 11.3).
 * Supports manual checkpoint saves, automatic mission saves, and JSON export/import.
 */

const SAVE_PREFIX = 'nexus_v1_save_slot_';
export const SAVE_SCHEMA_VERSION = '1.0.0';

export class SaveSystem {
  constructor() {
    this.activeSlot = 1;
  }

  saveSlot(slotIndex, stateObject, isAuto = false) {
    const slot = Math.max(1, Math.min(3, Number(slotIndex) || 1));
    this.activeSlot = slot;
    const envelope = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      slot,
      isAuto,
      savedAt: new Date().toISOString(),
      data: structuredClone(stateObject)
    };
    try {
      localStorage.setItem(`${SAVE_PREFIX}${slot}`, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  loadSlot(slotIndex) {
    const slot = Math.max(1, Math.min(3, Number(slotIndex) || 1));
    try {
      const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      this.activeSlot = slot;
      return parsed.data;
    } catch {
      return null;
    }
  }

  hasAnySave() {
    return [1, 2, 3].some((s) => Boolean(this.getSlotSummary(s)));
  }

  getLatestSlot() {
    let best = null;
    for (const s of [1, 2, 3]) {
      const info = this.getSlotSummary(s);
      if (info && (!best || info.savedAt > best.savedAt)) {
        best = info;
      }
    }
    return best ? best.slot : null;
  }

  getSlotSummary(slotIndex) {
    try {
      const raw = localStorage.getItem(`${SAVE_PREFIX}${slotIndex}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      return {
        slot: slotIndex,
        isAuto: Boolean(parsed.isAuto),
        savedAt: parsed.savedAt,
        level: parsed.data.level || 1,
        money: parsed.data.money ?? 0,
        missionIndex: parsed.data.currentMissionIndex ?? 0,
        zoneId: parsed.data.currentZoneId || 'zone_1_downtown'
      };
    } catch {
      return null;
    }
  }
}

extends Node
## Système de sauvegarde versionné à 3 emplacements (Section 11.3).
## Gère la sauvegarde manuelle aux terminaux et la sauvegarde automatique à chaque mission.

signal save_completed(slot_index: int, is_auto: bool)
signal save_loaded(slot_index: int)

const SAVE_FORMAT_VERSION: int = 1
const MAX_SLOTS: int = 3
var active_slot: int = 1


func _slot_path(slot_index: int) -> String:
	var safe_slot: int = clampi(slot_index, 1, MAX_SLOTS)
	return "user://nexus_save_slot_%d.json" % safe_slot


func save_game(slot_index: int = -1, is_auto: bool = false) -> bool:
	var target_slot: int = active_slot if slot_index < 1 else clampi(slot_index, 1, MAX_SLOTS)
	active_slot = target_slot
	var payload: Dictionary = {
		"schema_version": SAVE_FORMAT_VERSION,
		"saved_at_unix": int(Time.get_unix_time_from_system()),
		"is_autosave": is_auto,
		"locale": LocalizationManager.current_locale,
		"game_state": GameManager.serialize_state(),
		"mission_state": MissionManager.serialize_state()
	}
	var file := FileAccess.open(_slot_path(target_slot), FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(payload, "\t"))
	file.close()
	save_completed.emit(target_slot, is_auto)
	return true


func load_game(slot_index: int) -> bool:
	var target_slot: int = clampi(slot_index, 1, MAX_SLOTS)
	var path: String = _slot_path(target_slot)
	if not FileAccess.file_exists(path):
		return false
	var raw: String = FileAccess.get_file_as_string(path)
	var parsed: Variant = JSON.parse_string(raw)
	if typeof(parsed) != TYPE_DICTIONARY:
		return false
	var data: Dictionary = parsed
	if int(data.get("schema_version", 0)) != SAVE_FORMAT_VERSION:
		return false
	active_slot = target_slot
	LocalizationManager.set_locale(String(data.get("locale", "fr")))
	GameManager.deserialize_state(data.get("game_state", {}))
	MissionManager.deserialize_state(data.get("mission_state", {}))
	save_loaded.emit(target_slot)
	return true


func get_slot_summary(slot_index: int) -> Dictionary:
	var path: String = _slot_path(slot_index)
	if not FileAccess.file_exists(path):
		return {"exists": false, "slot": slot_index}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(path))
	if typeof(parsed) != TYPE_DICTIONARY:
		return {"exists": false, "slot": slot_index}
	var d: Dictionary = parsed
	var gs: Dictionary = d.get("game_state", {})
	var ms: Dictionary = d.get("mission_state", {})
	return {
		"exists": true,
		"slot": slot_index,
		"level": int(gs.get("level", 1)),
		"money": int(gs.get("money", 0)),
		"zone": String(gs.get("current_zone_id", "zone_1_downtown")),
		"mission_index": int(ms.get("current_mission_index", 0)),
		"saved_at_unix": int(d.get("saved_at_unix", 0))
	}

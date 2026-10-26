extends Node
## Gestionnaire de la campagne (15 missions, 4 actes), contrats, défis et rumeurs (Section 6).

signal mission_started(mission_dict: Dictionary)
signal mission_progress_updated(current_count: int, target_count: int, bonus_ok: bool)
signal mission_completed(mission_dict: Dictionary, bonus_achieved: bool)
signal campaign_completed()
signal subtitle_triggered(speaker_id: String, text_fr: String, text_en: String)

var missions: Array[Dictionary] = []
var contracts: Array[Dictionary] = []
var rumors_completed: Array[String] = []

var current_mission_index: int = 0
var mission_active: bool = false
var objective_progress: int = 0
var bonus_condition_met: bool = true
var active_contract_id: String = ""


func _ready() -> void:
	_load_campaign_definitions()
	_load_contracts_definitions()


func _load_campaign_definitions() -> void:
	var json_path: String = "res://resources/missions/campaign_missions.json"
	if FileAccess.file_exists(json_path):
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(json_path))
		if typeof(parsed) == TYPE_ARRAY:
			for entry in parsed:
				if typeof(entry) == TYPE_DICTIONARY:
					missions.append(entry)


func _load_contracts_definitions() -> void:
	contracts = [
		{
			"id": "contract_delivery",
			"title_fr": "Contrat : Courrier Fantôme (Livraison)",
			"title_en": "Contract: Phantom Courier (Delivery)",
			"target": 4,
			"reward_money": 350,
			"reward_xp": 100,
			"reward_material": ""
		},
		{
			"id": "contract_elimination",
			"title_fr": "Contrat : Nettoyage Chirurgical (Élimination)",
			"title_en": "Contract: Surgical Sweep (Elimination)",
			"target": 3,
			"reward_money": 450,
			"reward_xp": 130,
			"reward_material": "polymer"
		},
		{
			"id": "contract_race",
			"title_fr": "Contrat : Circuit Sodium (Course)",
			"title_en": "Contract: Sodium Circuit (Time Sprint)",
			"target": 5,
			"reward_money": 300,
			"reward_xp": 110,
			"reward_material": ""
		}
	]


func get_current_mission() -> Dictionary:
	if current_mission_index >= 0 and current_mission_index < missions.size():
		return missions[current_mission_index]
	return {}


func start_current_mission() -> void:
	var m: Dictionary = get_current_mission()
	if m.is_empty():
		return
	mission_active = true
	objective_progress = 0
	bonus_condition_met = true
	var mode_str: String = String(m.get("dominant_mode", "EXPLORATION"))
	if mode_str == "COMBAT":
		ModeManager.request_mode_transition(ModeManager.PlayMode.COMBAT, "MISSION_START")
	elif mode_str == "SHOOTING":
		ModeManager.request_mode_transition(ModeManager.PlayMode.SHOOTING, "MISSION_START")
	else:
		ModeManager.request_mode_transition(ModeManager.PlayMode.EXPLORATION, "MISSION_START")
	subtitle_triggered.emit(
		String(m.get("speaker", "elena")),
		String(m.get("briefing_fr", "")),
		String(m.get("briefing_en", ""))
	)
	AudioManager.play_voice_cue()
	mission_started.emit(m)


func advance_objective(amount: int = 1) -> void:
	if not mission_active:
		return
	var m: Dictionary = get_current_mission()
	var target: int = maxi(1, int(m.get("target_count", 1)))
	objective_progress = mini(target, objective_progress + amount)
	# Transition scriptée mi-mission pour les missions mixtes (M08, M13, M14, M15)
	if m.has("mid_transition_mode") and objective_progress == maxi(1, target / 2):
		var next_m: String = String(m.get("mid_transition_mode", "COMBAT"))
		if next_m == "COMBAT":
			ModeManager.request_mode_transition(ModeManager.PlayMode.COMBAT, "MID_MISSION_CINEMATIC")
		elif next_m == "SHOOTING":
			ModeManager.request_mode_transition(ModeManager.PlayMode.SHOOTING, "MID_MISSION_CINEMATIC")
	mission_progress_updated.emit(objective_progress, target, bonus_condition_met)
	if objective_progress >= target:
		complete_current_mission()


func complete_current_mission() -> void:
	var m: Dictionary = get_current_mission()
	if m.is_empty():
		return
	mission_active = false
	var base_money: int = int(m.get("reward_money", 400))
	var base_xp: int = int(m.get("reward_xp", 150))
	var mat_id: String = String(m.get("reward_material", "polymer"))
	var mat_amt: int = int(m.get("reward_material_amount", 1))
	if bonus_condition_met:
		base_money = int(round(float(base_money) * 1.5))
		base_xp = int(round(float(base_xp) * 1.25))
	GameManager.add_rewards(base_money, base_xp, mat_id, mat_amt if bonus_condition_met else 0)
	var unlock_zone: String = String(m.get("unlocks_zone", ""))
	if unlock_zone != "":
		GameManager.unlock_zone(unlock_zone)
	var reversal_fr: String = String(m.get("reversal_fr", ""))
	if reversal_fr != "":
		subtitle_triggered.emit("vaneck", reversal_fr, String(m.get("reversal_en", "")))
	mission_completed.emit(m, bonus_condition_met)
	current_mission_index += 1
	SaveManager.save_game(SaveManager.active_slot, true)
	if current_mission_index >= missions.size():
		campaign_completed.emit()


func serialize_state() -> Dictionary:
	return {
		"current_mission_index": current_mission_index,
		"rumors_completed": rumors_completed.duplicate()
	}


func deserialize_state(data: Dictionary) -> void:
	current_mission_index = int(data.get("current_mission_index", 0))
	rumors_completed.assign(data.get("rumors_completed", []))
	mission_active = false

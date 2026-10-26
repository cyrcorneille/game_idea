extends Node
## Gestionnaire global d'état du jeu, économie, compétences, équipement & monde (Sections 4, 7 & 11.2).

signal stats_updated()
signal world_environment_changed(time_of_day: String, weather_state: String)
signal zone_unlocked(zone_id: String)
signal checkpoint_unlocked(checkpoint_id: String)

const XP_PER_LEVEL: int = 250
const MAX_WEAPON_UPGRADES: int = 2
const TIMES_OF_DAY: Array[String] = ["DAWN", "DAY", "DUSK", "NIGHT"]

# Progression & Ressources (Section 7.1)
var money: int = 350
var experience: int = 0
var level: int = 1
var skill_points: int = 1
var materials: Dictionary = {
	"polymer": 2,
	"cell": 1,
	"alloy": 0
}

# Santé & Endurance joueur
var health: float = 115.0
var stamina: float = 100.0
var last_damage_timestamp_ms: int = 0

# Arbres de compétences — 3 branches × 3 paliers (Section 7.2)
var unlocked_skills: Dictionary = {
	"shooting": [],
	"combat": [],
	"exploration": []
}

# Inventaire & Équipement — 2 emplacements d'armes, 2 d'armures, max 2 améliorations/arme (Section 7.3)
var owned_weapons: Array[String] = ["pistol", "assault_rifle"]
var equipped_weapons: Array[String] = ["pistol", "assault_rifle"]
var weapon_upgrades: Dictionary = {
	"pistol": [],
	"assault_rifle": [],
	"shotgun": [],
	"sniper_rifle": []
}
var owned_armors: Array[String] = ["vest_light"]
var equipped_armors: Array[String] = ["vest_light", ""]

# Monde ouvert, météo et déplacements rapides (Section 4)
var current_zone_id: String = "zone_1_downtown"
var unlocked_zones: Array[String] = ["zone_1_downtown"]
var unlocked_checkpoints: Array[String] = ["cp_downtown_plaza"]
var player_saved_position: Vector3 = Vector3(0.0, 1.2, 8.0)
var time_of_day_index: int = 3 # NIGHT par défaut néo-noir
var weather_state: String = "RAIN" # CLEAR ou RAIN


func get_max_health() -> float:
	var base: float = 100.0
	if "vest_light" in equipped_armors:
		base += 15.0
	if "vest_exo" in equipped_armors:
		base += 45.0
	if "gear_visor" in equipped_armors:
		base += 10.0
	if has_skill("exploration", "parkour_absorb"):
		base *= 1.25
	return base


func get_max_stamina() -> float:
	var base: float = 100.0
	if "gear_boots" in equipped_armors:
		base += 20.0
	if has_skill("combat", "second_wind"):
		base += 35.0
	return base


func has_skill(branch: String, skill_id: String) -> bool:
	if not unlocked_skills.has(branch):
		return false
	var list: Array = unlocked_skills[branch]
	return skill_id in list


func unlock_skill(branch: String, skill_id: String) -> bool:
	if skill_points <= 0 or not unlocked_skills.has(branch):
		return false
	if has_skill(branch, skill_id):
		return false
	unlocked_skills[branch].append(skill_id)
	skill_points -= 1
	health = minf(get_max_health(), health + 20.0)
	stamina = get_max_stamina()
	stats_updated.emit()
	return true


func add_rewards(add_money: int, add_xp: int, mat_id: String = "", mat_amount: int = 0) -> void:
	var credit_mult: float = 1.25 if has_skill("exploration", "beacon_intel") else 1.0
	money += int(round(float(add_money) * credit_mult))
	experience += add_xp
	while experience >= level * XP_PER_LEVEL:
		experience -= level * XP_PER_LEVEL
		level += 1
		skill_points += 1
		health = get_max_health()
	if mat_id != "" and mat_amount > 0:
		materials[mat_id] = int(materials.get(mat_id, 0)) + mat_amount
	stats_updated.emit()


func apply_weapon_upgrade(weapon_id: String, upgrade_id: String, cost_money: int, mat_id: String, mat_cost: int) -> bool:
	if not weapon_upgrades.has(weapon_id):
		return false
	var current_list: Array = weapon_upgrades[weapon_id]
	if current_list.size() >= MAX_WEAPON_UPGRADES or upgrade_id in current_list:
		return false
	if money < cost_money or int(materials.get(mat_id, 0)) < mat_cost:
		return false
	money -= cost_money
	materials[mat_id] = int(materials.get(mat_id, 0)) - mat_cost
	current_list.append(upgrade_id)
	stats_updated.emit()
	return true


func unlock_zone(zone_id: String) -> void:
	if zone_id != "" and not (zone_id in unlocked_zones):
		unlocked_zones.append(zone_id)
		zone_unlocked.emit(zone_id)


func unlock_checkpoint(cp_id: String) -> void:
	if cp_id != "" and not (cp_id in unlocked_checkpoints):
		unlocked_checkpoints.append(cp_id)
		checkpoint_unlocked.emit(cp_id)


func advance_time_of_day() -> void:
	time_of_day_index = (time_of_day_index + 1) % TIMES_OF_DAY.size()
	world_environment_changed.emit(TIMES_OF_DAY[time_of_day_index], weather_state)


func set_weather(new_weather: String) -> void:
	if new_weather == "CLEAR" or new_weather == "RAIN":
		weather_state = new_weather
		world_environment_changed.emit(TIMES_OF_DAY[time_of_day_index], weather_state)


func rebind_action_key(action_name: String, physical_key: Key) -> void:
	if not InputMap.has_action(action_name):
		return
	var kept_joypad: Array[InputEvent] = []
	for ev in InputMap.action_get_events(action_name):
		if ev is InputEventJoypadButton or ev is InputEventJoypadMotion:
			kept_joypad.append(ev)
	InputMap.action_erase_events(action_name)
	var key_event := InputEventKey.new()
	key_event.physical_keycode = physical_key
	InputMap.action_add_event(action_name, key_event)
	for joy_ev in kept_joypad:
		InputMap.action_add_event(action_name, joy_ev)


func serialize_state() -> Dictionary:
	return {
		"money": money,
		"experience": experience,
		"level": level,
		"skill_points": skill_points,
		"materials": materials.duplicate(true),
		"health": health,
		"stamina": stamina,
		"unlocked_skills": unlocked_skills.duplicate(true),
		"owned_weapons": owned_weapons.duplicate(),
		"equipped_weapons": equipped_weapons.duplicate(),
		"weapon_upgrades": weapon_upgrades.duplicate(true),
		"owned_armors": owned_armors.duplicate(),
		"equipped_armors": equipped_armors.duplicate(),
		"current_zone_id": current_zone_id,
		"unlocked_zones": unlocked_zones.duplicate(),
		"unlocked_checkpoints": unlocked_checkpoints.duplicate(),
		"player_saved_position": [player_saved_position.x, player_saved_position.y, player_saved_position.z],
		"time_of_day_index": time_of_day_index,
		"weather_state": weather_state
	}


func deserialize_state(data: Dictionary) -> void:
	money = int(data.get("money", 350))
	experience = int(data.get("experience", 0))
	level = int(data.get("level", 1))
	skill_points = int(data.get("skill_points", 1))
	materials = data.get("materials", {"polymer": 2, "cell": 1, "alloy": 0}).duplicate(true)
	health = float(data.get("health", 115.0))
	stamina = float(data.get("stamina", 100.0))
	unlocked_skills = data.get("unlocked_skills", {"shooting": [], "combat": [], "exploration": []}).duplicate(true)
	owned_weapons.assign(data.get("owned_weapons", ["pistol", "assault_rifle"]))
	equipped_weapons.assign(data.get("equipped_weapons", ["pistol", "assault_rifle"]))
	weapon_upgrades = data.get("weapon_upgrades", weapon_upgrades).duplicate(true)
	owned_armors.assign(data.get("owned_armors", ["vest_light"]))
	equipped_armors.assign(data.get("equipped_armors", ["vest_light", ""]))
	current_zone_id = String(data.get("current_zone_id", "zone_1_downtown"))
	unlocked_zones.assign(data.get("unlocked_zones", ["zone_1_downtown"]))
	unlocked_checkpoints.assign(data.get("unlocked_checkpoints", ["cp_downtown_plaza"]))
	var pos: Array = data.get("player_saved_position", [0.0, 1.2, 8.0])
	if pos.size() == 3:
		player_saved_position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]))
	time_of_day_index = int(data.get("time_of_day_index", 3))
	weather_state = String(data.get("weather_state", "RAIN"))
	stats_updated.emit()

class_name NPCController
extends CharacterBody3D
## PNJ urbain réagissant au contexte : IGNORE, FLEE ou ALERT + dialogues et rumeurs (Sections 5.1 & 6.3).

signal rumor_discovered(rumor_id: String)

@export_enum("IGNORE", "FLEE", "ALERT") var reaction_profile: String = "IGNORE"
@export var npc_name_fr: String = "Citoyen de Port-Valois"
@export var npc_name_en: String = "Port-Valois Citizen"
@export var dialogue_fr: String = "Il pleut sans arrêt depuis que Vaneck contrôle la mairie..."
@export var dialogue_en: String = "It hasn't stopped raining since Vaneck took over City Hall..."
@export var rumor_id: String = ""

var is_panicked: bool = false
var has_alerted_guards: bool = false
var _wander_time: float = 0.0
var _home_pos: Vector3 = Vector3.ZERO


func _ready() -> void:
	add_to_group("npcs")
	_home_pos = global_position


func notify_combat_event(origin: Vector3) -> void:
	if global_position.distance_to(origin) > 22.0:
		return
	if reaction_profile == "FLEE":
		is_panicked = true
	elif reaction_profile == "ALERT" and not has_alerted_guards:
		has_alerted_guards = true
		MissionManager.bonus_condition_met = false


func interact(_interactor: Node3D) -> void:
	MissionManager.subtitle_triggered.emit("elena", dialogue_fr, dialogue_en)
	if rumor_id != "" and not (rumor_id in MissionManager.rumors_completed):
		MissionManager.rumors_completed.append(rumor_id)
		GameManager.add_rewards(600, 150, "polymer", 2)
		rumor_discovered.emit(rumor_id)


func _physics_process(delta: float) -> void:
	_wander_time += delta
	if is_panicked:
		var player: Node3D = get_tree().get_first_node_in_group("player") as Node3D
		if player != null:
			var away: Vector3 = (global_position - player.global_position).normalized()
			velocity.x = away.x * 5.2
			velocity.z = away.z * 5.2
	else:
		var target: Vector3 = _home_pos + Vector3(cos(_wander_time * 0.6) * 2.5, 0.0, sin(_wander_time * 0.6) * 2.5)
		var dir: Vector3 = target - global_position
		velocity.x = dir.x * 1.1
		velocity.z = dir.z * 1.1
	move_and_slide()

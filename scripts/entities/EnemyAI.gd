class_name EnemyAI
extends CharacterBody3D
## Machine à états finis pour l'IA ennemie : attaque simple, garde au bouclier et tir à couvert (Sections 5.2, 5.3 & 11.2).

signal enemy_defeated(enemy_data: EnemyData, was_headshot: bool)

enum AIState {
	IDLE,
	PATROL,
	CHASE,
	TAKE_COVER,
	WINDUP,
	ATTACK,
	GUARD_BLOCK,
	STAGGERED,
	DEAD
}

@export var data: EnemyData

@onready var nav_agent: NavigationAgent3D = $NavigationAgent3D

var current_state: AIState = AIState.PATROL
var health: float = 85.0
var _state_timer: float = 0.0
var _patrol_origin: Vector3 = Vector3.ZERO
var _patrol_phase: float = 0.0
var _last_hit_headshot: bool = false


func _ready() -> void:
	add_to_group("enemies")
	_patrol_origin = global_position
	if data == null:
		data = load("res://resources/enemies/rusher.tres") as EnemyData
	if data != null:
		health = data.max_health


func _physics_process(delta: float) -> void:
	if current_state == AIState.DEAD or data == null:
		return

	if not is_on_floor():
		velocity.y -= 20.0 * delta

	var player: PlayerController = get_tree().get_first_node_in_group("player") as PlayerController
	if player == null:
		return

	var dist: float = global_position.distance_to(player.global_position)
	_state_timer = maxf(0.0, _state_timer - delta)

	match current_state:
		AIState.PATROL, AIState.IDLE:
			_patrol_phase += delta
			var target_pt: Vector3 = _patrol_origin + Vector3(sin(_patrol_phase) * 4.0, 0.0, cos(_patrol_phase) * 4.0)
			_move_toward_point(target_pt, data.move_speed * 0.45)
			if dist <= data.detection_range:
				current_state = AIState.TAKE_COVER if data.behavior_type == "RANGED" else AIState.CHASE

		AIState.CHASE:
			if data.behavior_type == "GUARD" and dist < 5.0:
				current_state = AIState.GUARD_BLOCK
				_state_timer = 0.9
			elif dist <= data.attack_range:
				current_state = AIState.WINDUP
				_state_timer = 0.34 # Fenêtre lisible pour la parade du joueur
			else:
				_move_toward_point(player.global_position, data.move_speed)

		AIState.GUARD_BLOCK:
			_move_toward_point(player.global_position, data.move_speed * 0.4)
			if _state_timer <= 0.0:
				current_state = AIState.WINDUP
				_state_timer = 0.36

		AIState.TAKE_COVER:
			# Maintient une distance tactique de couverture pour le tir FPS (Section 5.3)
			if dist < 9.0:
				var retreat_pt: Vector3 = global_position + (global_position - player.global_position).normalized() * 5.0
				_move_toward_point(retreat_pt, data.move_speed)
			elif _state_timer <= 0.0:
				current_state = AIState.ATTACK
				_state_timer = data.attack_cooldown
				player.receive_attack(data.attack_damage, global_position, self)

		AIState.WINDUP:
			velocity.x = 0.0
			velocity.z = 0.0
			if _state_timer <= 0.0:
				current_state = AIState.ATTACK
				_state_timer = data.attack_cooldown
				if dist <= data.attack_range + 1.0:
					player.receive_attack(data.attack_damage, global_position, self)

		AIState.ATTACK:
			velocity.x = 0.0
			velocity.z = 0.0
			if _state_timer <= 0.0:
				current_state = AIState.TAKE_COVER if data.behavior_type == "RANGED" else AIState.CHASE

		AIState.STAGGERED:
			velocity.x = 0.0
			velocity.z = 0.0
			if _state_timer <= 0.0:
				current_state = AIState.CHASE

	move_and_slide()


func _move_toward_point(world_target: Vector3, spd: float) -> void:
	if nav_agent != null:
		nav_agent.target_position = world_target
	var dir: Vector3 = (world_target - global_position)
	dir.y = 0.0
	if dir.length() > 0.15:
		dir = dir.normalized()
		velocity.x = dir.x * spd
		velocity.z = dir.z * spd
		rotation.y = atan2(-dir.x, -dir.z)
	else:
		velocity.x = 0.0
		velocity.z = 0.0


func apply_stagger(duration: float) -> void:
	current_state = AIState.STAGGERED
	_state_timer = duration


func receive_melee_hit(amount: float, is_heavy: bool) -> float:
	if current_state == AIState.DEAD:
		return 0.0
	var final_dmg: float = amount
	# L'ennemi à bouclier bloque 85 % des attaques légères mais sa garde cède aux attaques lourdes (Section 5.2)
	if data != null and data.behavior_type == "GUARD" and current_state != AIState.STAGGERED and not is_heavy:
		final_dmg *= 0.15
	elif data != null and data.behavior_type == "GUARD" and is_heavy:
		apply_stagger(1.5)
	if current_state == AIState.STAGGERED:
		final_dmg *= 1.6
	_last_hit_headshot = false
	_apply_damage(final_dmg)
	return final_dmg


func receive_bullet_hit(amount: float, is_headshot: bool) -> float:
	if current_state == AIState.DEAD:
		return 0.0
	_last_hit_headshot = is_headshot
	_apply_damage(amount)
	return amount


func _apply_damage(dmg: float) -> void:
	health = maxf(0.0, health - dmg)
	if health <= 0.0:
		current_state = AIState.DEAD
		remove_from_group("enemies")
		if data != null:
			GameManager.add_rewards(data.money_reward, data.xp_reward)
			enemy_defeated.emit(data, _last_hit_headshot)
		MissionManager.advance_objective(1)
		queue_free()

class_name PlayerController
extends CharacterBody3D
## Contrôleur unifié de Marcus Vance piloté par ModeManager (Sections 5.1, 5.2, 5.3).
## - Mode Exploration : 3e personne caméra arrière avec SpringArm3D collision murale, escalade, interaction [E]
## - Mode Combat : caméra épaule, verrouillage cible [Tab], combo 3L+1H, esquive i-frames, parade timing, endurance, hitstop
## - Mode Tir : 1re personne avec arme 3D, 4 armes .tres, munitions/rechargement, recul/dispersion/ADS, regen PV

signal hud_weapon_updated(weapon_name: String, ammo_in_mag: int, ammo_reserve: int, is_reloading: bool)
signal directional_damage_taken(angle_radians: float, amount: float)
signal combo_updated(step: int, is_heavy: bool)
signal context_prompt_changed(prompt_text: String)
signal perfect_move_triggered(move_label: String)

const GRAVITY: float = 22.0
const WALK_SPEED: float = 5.4
const SPRINT_SPEED: float = 8.4
const JUMP_VELOCITY: float = 7.6
const DODGE_DURATION: float = 0.32
const PARRY_PERFECT_WINDOW: float = 0.26
const HEALTH_REGEN_DELAY_MS: int = 4000

@onready var camera_pivot: Node3D = $CameraPivot
@onready var spring_arm: SpringArm3D = $CameraPivot/SpringArm3D
@onready var third_person_cam: Camera3D = $CameraPivot/SpringArm3D/ThirdPersonCamera
@onready var first_person_cam: Camera3D = $CameraPivot/FirstPersonCamera
@onready var weapon_rig: WeaponRig = $CameraPivot/FirstPersonCamera/WeaponMount/WeaponRig
@onready var body_mesh: Node3D = $VisualBody
@onready var ledge_low_ray: RayCast3D = $VisualBody/LedgeLowRay
@onready var ledge_high_ray: RayCast3D = $VisualBody/LedgeHighRay
@onready var interact_area: Area3D = $InteractArea

var _yaw: float = 0.0
var _pitch: float = -0.15

# État Combat rapproché (Section 5.2)
var combo_step: int = 0
var _combo_reset_timer: float = 0.0
var _attack_cooldown: float = 0.0
var is_invulnerable: bool = false
var _dodge_timer: float = 0.0
var _dodge_dir: Vector3 = Vector3.ZERO
var _parry_timer: float = 0.0
var locked_target: Node3D = null

# État Tir FPS (Section 5.3)
var weapon_catalog: Dictionary = {}
var current_weapon_slot: int = 0
var mag_ammo: Dictionary = {}
var reserve_ammo: Dictionary = {}
var is_reloading: bool = false
var _reload_timer: float = 0.0
var _fire_cooldown: float = 0.0
var is_aiming_ads: bool = false

# Véhicule actif (Section 5.4)
var active_vehicle: Node3D = null


func _ready() -> void:
	add_to_group("player")
	_load_weapons_from_resources()
	ModeManager.mode_changed.connect(_on_mode_changed)
	_apply_camera_for_mode(int(ModeManager.current_mode))


func _load_weapons_from_resources() -> void:
	var paths: Array[String] = [
		"res://resources/weapons/pistol.tres",
		"res://resources/weapons/assault_rifle.tres",
		"res://resources/weapons/shotgun.tres",
		"res://resources/weapons/sniper_rifle.tres"
	]
	for p in paths:
		var res: WeaponData = load(p) as WeaponData
		if res != null:
			weapon_catalog[res.id] = res
			mag_ammo[res.id] = _compute_effective_mag_size(res)
			reserve_ammo[res.id] = res.max_reserve


func _compute_effective_mag_size(wpn: WeaponData) -> int:
	var bonus_mult: float = 1.0
	if GameManager.has_skill("shooting", "tactical_reload"):
		bonus_mult += 0.30
	var upgs: Array = GameManager.weapon_upgrades.get(wpn.id, [])
	if "extended_mag" in upgs:
		bonus_mult += 0.40
	return maxi(1, int(round(float(wpn.mag_size) * bonus_mult)))


func get_active_weapon() -> WeaponData:
	var owned: Array[String] = GameManager.owned_weapons
	if owned.is_empty():
		return weapon_catalog.get("pistol")
	var safe_idx: int = posmod(current_weapon_slot, owned.size())
	var w_id: String = owned[safe_idx]
	return weapon_catalog.get(w_id, weapon_catalog.get("pistol"))


func equip_weapon_by_index(slot_idx: int) -> void:
	if GameManager.owned_weapons.is_empty():
		return
	current_weapon_slot = clampi(slot_idx, 0, GameManager.owned_weapons.size() - 1)
	is_reloading = false
	var wpn: WeaponData = get_active_weapon()
	if wpn != null and weapon_rig != null:
		weapon_rig.configure_for_category(wpn.category)
		_emit_ammo_hud(wpn)


func _on_mode_changed(new_mode: int) -> void:
	_apply_camera_for_mode(new_mode)


func _apply_camera_for_mode(mode_idx: int) -> void:
	if mode_idx == int(ModeManager.PlayMode.SHOOTING):
		first_person_cam.current = true
		third_person_cam.current = false
		body_mesh.visible = false
		var wpn: WeaponData = get_active_weapon()
		if wpn != null:
			weapon_rig.configure_for_category(wpn.category)
			_emit_ammo_hud(wpn)
	elif mode_idx == int(ModeManager.PlayMode.COMBAT):
		third_person_cam.current = true
		first_person_cam.current = false
		body_mesh.visible = true
		spring_arm.spring_length = 3.1
		spring_arm.position = Vector3(0.68, 0.35, 0.0) # Caméra épaule God of War
	else:
		third_person_cam.current = true
		first_person_cam.current = false
		body_mesh.visible = true
		spring_arm.spring_length = 4.6
		spring_arm.position = Vector3(0.0, 0.55, 0.0) # Caméra arrière exploration


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		var mm := event as InputEventMouseMotion
		_yaw -= mm.relative.x * 0.0026
		_pitch = clampf(_pitch - mm.relative.y * 0.0022, -1.25, 1.15)
	elif event is InputEventKey and event.pressed and not event.echo:
		var ke := event as InputEventKey
		if ke.physical_keycode >= KEY_1 and ke.physical_keycode <= KEY_4:
			equip_weapon_by_index(int(ke.physical_keycode - KEY_1))


func _physics_process(delta: float) -> void:
	if active_vehicle != null:
		global_position = active_vehicle.global_position + Vector3(0.0, 0.6, 0.0)
		return

	_update_timers_and_regen(delta)
	_update_camera_rig(delta)

	var input_vec: Vector2 = Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var basis_yaw := Basis(Vector3.UP, _yaw)
	var move_dir: Vector3 = (basis_yaw * Vector3(input_vec.x, 0.0, input_vec.y)).normalized()

	var speed_mult: float = 1.18 if GameManager.has_skill("exploration", "urban_sprinter") else 1.0
	var is_sprinting: bool = Input.is_action_pressed("sprint") and GameManager.stamina > 8.0
	var target_speed: float = (SPRINT_SPEED if is_sprinting else WALK_SPEED) * speed_mult

	if is_sprinting and move_dir.length() > 0.1:
		GameManager.stamina = maxf(0.0, GameManager.stamina - 16.0 * delta)

	if _dodge_timer > 0.0:
		velocity.x = _dodge_dir.x * 13.5
		velocity.z = _dodge_dir.z * 13.5
	else:
		velocity.x = lerpf(velocity.x, move_dir.x * target_speed, minf(1.0, delta * 12.0))
		velocity.z = lerpf(velocity.z, move_dir.z * target_speed, minf(1.0, delta * 12.0))

	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	elif Input.is_action_just_pressed("jump"):
		if not _try_ledge_climb():
			velocity.y = JUMP_VELOCITY

	if move_dir.length() > 0.1 and ModeManager.current_mode != ModeManager.PlayMode.SHOOTING:
		if locked_target != null and is_instance_valid(locked_target) and ModeManager.current_mode == ModeManager.PlayMode.COMBAT:
			var to_enemy: Vector3 = locked_target.global_position - global_position
			body_mesh.rotation.y = atan2(-to_enemy.x, -to_enemy.z)
		else:
			body_mesh.rotation.y = lerp_angle(body_mesh.rotation.y, atan2(-move_dir.x, -move_dir.z), minf(1.0, delta * 10.0))

	move_and_slide()
	_process_mode_specific_actions(delta, move_dir)


func _try_ledge_climb() -> bool:
	if ledge_low_ray != null and ledge_high_ray != null:
		if ledge_low_ray.is_colliding() and not ledge_high_ray.is_colliding():
			global_position += Vector3(0.0, 1.35, 0.0) - body_mesh.global_transform.basis.z * 0.75
			velocity.y = 2.0
			return true
	return false


func _update_timers_and_regen(delta: float) -> void:
	if _attack_cooldown > 0.0:
		_attack_cooldown -= delta
		if _attack_cooldown <= 0.0:
			ModeManager.set_action_lock(false)
	if _combo_reset_timer > 0.0:
		_combo_reset_timer -= delta
		if _combo_reset_timer <= 0.0:
			combo_step = 0
	if _dodge_timer > 0.0:
		_dodge_timer -= delta
		if _dodge_timer <= 0.0:
			is_invulnerable = false
	if _parry_timer > 0.0:
		_parry_timer -= delta
	if _fire_cooldown > 0.0:
		_fire_cooldown -= delta

	# Régénération d'endurance
	var stam_rate: float = 28.0 if GameManager.has_skill("combat", "second_wind") else 20.0
	if _dodge_timer <= 0.0 and _attack_cooldown <= 0.0:
		GameManager.stamina = minf(GameManager.get_max_stamina(), GameManager.stamina + stam_rate * delta)

	# Régénération de santé automatique hors dégâts (Section 5.3)
	var now_ms: int = Time.get_ticks_msec()
	var regen_delay: int = 2800 if "gear_visor" in GameManager.equipped_armors else HEALTH_REGEN_DELAY_MS
	if now_ms - GameManager.last_damage_timestamp_ms > regen_delay and GameManager.health < GameManager.get_max_health():
		GameManager.health = minf(GameManager.get_max_health(), GameManager.health + 12.0 * delta)


func _update_camera_rig(delta: float) -> void:
	if locked_target != null and is_instance_valid(locked_target) and ModeManager.current_mode == ModeManager.PlayMode.COMBAT:
		var dir: Vector3 = locked_target.global_position - global_position
		_yaw = lerp_angle(_yaw, atan2(-dir.x, -dir.z), minf(1.0, delta * 8.0))
	camera_pivot.rotation.y = _yaw
	camera_pivot.rotation.x = _pitch

	var wpn: WeaponData = get_active_weapon()
	if ModeManager.current_mode == ModeManager.PlayMode.SHOOTING and wpn != null:
		var target_fov: float = wpn.ads_fov if is_aiming_ads else 75.0
		first_person_cam.fov = lerpf(first_person_cam.fov, target_fov, minf(1.0, delta * 14.0))


func _process_mode_specific_actions(delta: float, move_dir: Vector3) -> void:
	if Input.is_action_just_pressed("interact"):
		_trigger_contextual_interaction()

	if ModeManager.current_mode == ModeManager.PlayMode.COMBAT:
		if Input.is_action_just_pressed("lock_target"):
			_toggle_target_lock()
		if Input.is_action_just_pressed("dodge"):
			perform_dodge(move_dir)
		if Input.is_action_just_pressed("parry"):
			perform_parry()
		if Input.is_action_just_pressed("primary_action"):
			perform_melee_attack(false)
		elif Input.is_action_just_pressed("secondary_action"):
			perform_melee_attack(true)
	elif ModeManager.current_mode == ModeManager.PlayMode.SHOOTING:
		is_aiming_ads = Input.is_action_pressed("secondary_action")
		if is_reloading:
			_reload_timer -= delta
			if _reload_timer <= 0.0:
				_finish_reload()
		else:
			if Input.is_action_just_pressed("reload"):
				start_reload()
			elif Input.is_action_pressed("primary_action"):
				fire_active_weapon()


func perform_melee_attack(is_heavy: bool) -> bool:
	if _attack_cooldown > 0.0:
		return false
	var stamina_cost: float = 24.0 if is_heavy else 10.0
	if GameManager.stamina < stamina_cost:
		return false

	GameManager.stamina -= stamina_cost
	ModeManager.set_action_lock(true)

	if is_heavy:
		combo_step = 4 # 4e coup lourd finalisateur après 1..3 attaques légères
		_attack_cooldown = 0.42
		AudioManager.play_sfx("melee_heavy")
	else:
		combo_step = (combo_step % 3) + 1
		_attack_cooldown = 0.26
		AudioManager.play_sfx("melee_light")

	_combo_reset_timer = 1.35
	combo_updated.emit(combo_step, is_heavy)

	var base_dmg: float = 44.0 if is_heavy else (22.0 + float(combo_step) * 4.0)
	if GameManager.has_skill("combat", "iron_fist"):
		base_dmg *= 1.25

	var hit_any: bool = false
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if enemy is Node3D and global_position.distance_to(enemy.global_position) <= 3.1:
			if enemy.has_method("receive_melee_hit"):
				enemy.receive_melee_hit(base_dmg, is_heavy)
				hit_any = true
	if hit_any and is_heavy:
		_trigger_hitstop(0.065)
	return true


func perform_dodge(move_dir: Vector3) -> bool:
	if _dodge_timer > 0.0 or GameManager.stamina < 18.0:
		return false
	GameManager.stamina -= 18.0
	is_invulnerable = true
	_dodge_timer = DODGE_DURATION
	_dodge_dir = move_dir if move_dir.length() > 0.1 else -Basis(Vector3.UP, _yaw).z
	return true


func perform_parry() -> void:
	var window: float = PARRY_PERFECT_WINDOW
	if GameManager.has_skill("combat", "eclipse_counter"):
		window += 0.10
	_parry_timer = window


func is_in_parry_window() -> bool:
	return _parry_timer > 0.0


func fire_active_weapon() -> bool:
	var wpn: WeaponData = get_active_weapon()
	if wpn == null or is_reloading or _fire_cooldown > 0.0:
		return false
	var current_mag: int = int(mag_ammo.get(wpn.id, 0))
	if current_mag <= 0:
		start_reload()
		return false

	mag_ammo[wpn.id] = current_mag - 1
	var rate_mult: float = 1.18 if "titanium_bolt" in GameManager.weapon_upgrades.get(wpn.id, []) else 1.0
	_fire_cooldown = 1.0 / (wpn.fire_rate * rate_mult)

	var recoil_scale: float = 1.0
	if GameManager.has_skill("shooting", "steady_aim"):
		recoil_scale *= 0.75
	if "compensator" in GameManager.weapon_upgrades.get(wpn.id, []):
		recoil_scale *= 0.65

	_pitch = clampf(_pitch + wpn.recoil_kick * 0.045 * recoil_scale, -1.25, 1.15)
	if weapon_rig != null:
		weapon_rig.trigger_shot_kick(wpn.recoil_kick * recoil_scale)

	match wpn.category:
		"PISTOL":
			AudioManager.play_sfx("shoot_pistol")
		"ASSAULT_RIFLE":
			AudioManager.play_sfx("shoot_rifle")
		"SHOTGUN":
			AudioManager.play_sfx("shoot_shotgun")
		"SNIPER_RIFLE":
			AudioManager.play_sfx("shoot_sniper")

	var dmg_mult: float = 1.0
	if GameManager.has_skill("shooting", "surgical_rounds"):
		dmg_mult += 0.25
	if "match_barrel" in GameManager.weapon_upgrades.get(wpn.id, []):
		dmg_mult += 0.20

	var space_state: PhysicsDirectSpaceState3D = get_world_3d().direct_space_state
	for _p in range(wpn.pellets):
		var spread_deg: float = (wpn.spread_ads_deg if is_aiming_ads else wpn.spread_hip_deg) * recoil_scale
		var spread_x: float = deg_to_rad(randf_range(-spread_deg, spread_deg))
		var spread_y: float = deg_to_rad(randf_range(-spread_deg, spread_deg))
		var origin: Vector3 = first_person_cam.global_position
		var dir: Vector3 = (-first_person_cam.global_transform.basis.z).rotated(Vector3.UP, spread_x).rotated(first_person_cam.global_transform.basis.x, spread_y)
		var query := PhysicsRayQueryParameters3D.create(origin, origin + dir * wpn.effective_range)
		query.exclude = [self]
		var hit: Dictionary = space_state.intersect_ray(query)
		if not hit.is_empty():
			var collider: Object = hit.get("collider")
			if collider != null and collider.has_method("receive_bullet_hit"):
				var hit_pos: Vector3 = hit.get("position", origin)
				var is_headshot: bool = (hit_pos.y - (collider as Node3D).global_position.y) > 1.45
				var final_dmg: float = wpn.damage * dmg_mult * (wpn.crit_multiplier if is_headshot else 1.0)
				collider.call("receive_bullet_hit", final_dmg, is_headshot)

	_emit_ammo_hud(wpn)
	return true


func start_reload() -> bool:
	var wpn: WeaponData = get_active_weapon()
	if wpn == null or is_reloading:
		return false
	var max_mag: int = _compute_effective_mag_size(wpn)
	var cur_mag: int = int(mag_ammo.get(wpn.id, 0))
	var cur_res: int = int(reserve_ammo.get(wpn.id, 0))
	if cur_mag >= max_mag or cur_res <= 0:
		return false
	is_reloading = true
	var speed_bonus: float = 0.75 if GameManager.has_skill("shooting", "tactical_reload") else 1.0
	_reload_timer = wpn.reload_time * speed_bonus
	_emit_ammo_hud(wpn)
	return true


func _finish_reload() -> void:
	var wpn: WeaponData = get_active_weapon()
	is_reloading = false
	if wpn == null:
		return
	var needed: int = _compute_effective_mag_size(wpn) - int(mag_ammo.get(wpn.id, 0))
	var available: int = mini(needed, int(reserve_ammo.get(wpn.id, 0)))
	mag_ammo[wpn.id] = int(mag_ammo.get(wpn.id, 0)) + available
	reserve_ammo[wpn.id] = int(reserve_ammo.get(wpn.id, 0)) - available
	_emit_ammo_hud(wpn)


func receive_attack(raw_damage: float, attacker_position: Vector3, attacker_node: Node3D = null) -> String:
	if is_invulnerable:
		perfect_move_triggered.emit("DODGE")
		return "DODGED"
	if is_in_parry_window():
		_parry_timer = 0.0
		AudioManager.play_sfx("parry_clang")
		_trigger_hitstop(0.065)
		if GameManager.has_skill("combat", "eclipse_counter"):
			GameManager.health = minf(GameManager.get_max_health(), GameManager.health + 12.0)
		if attacker_node != null and attacker_node.has_method("apply_stagger"):
			attacker_node.call("apply_stagger", 1.8)
		perfect_move_triggered.emit("PARRY")
		return "PARRIED"

	var reduction: float = 0.08 if "vest_light" in GameManager.equipped_armors else 0.0
	if "vest_exo" in GameManager.equipped_armors:
		reduction = 0.20
	var actual: float = maxf(1.0, raw_damage * (1.0 - reduction))
	GameManager.health = maxf(0.0, GameManager.health - actual)
	GameManager.last_damage_timestamp_ms = Time.get_ticks_msec()
	var dir_to_attacker: Vector3 = attacker_position - global_position
	var rel_angle: float = atan2(dir_to_attacker.x, dir_to_attacker.z) - _yaw
	directional_damage_taken.emit(rel_angle, actual)
	GameManager.stats_updated.emit()
	return "HIT"


func _toggle_target_lock() -> void:
	if locked_target != null and is_instance_valid(locked_target):
		locked_target = null
		return
	var closest: Node3D = null
	var min_d: float = 20.0
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if enemy is Node3D:
			var d: float = global_position.distance_to(enemy.global_position)
			if d < min_d:
				min_d = d
				closest = enemy
	locked_target = closest


func _trigger_contextual_interaction() -> void:
	if interact_area == null:
		return
	for body in interact_area.get_overlapping_bodies():
		if body.has_method("interact"):
			body.call("interact", self)
			return
	for area in interact_area.get_overlapping_areas():
		if area.has_method("interact"):
			area.call("interact", self)
			return


func _trigger_hitstop(duration_sec: float) -> void:
	Engine.time_scale = 0.12
	get_tree().create_timer(duration_sec, true, false, true).timeout.connect(func() -> void:
		Engine.time_scale = 1.0
	)


func _emit_ammo_hud(wpn: WeaponData) -> void:
	var label: String = LocalizationManager.select_text(wpn.display_name_fr, wpn.display_name_en)
	hud_weapon_updated.emit(label, int(mag_ammo.get(wpn.id, 0)), int(reserve_ammo.get(wpn.id, 0)), is_reloading)

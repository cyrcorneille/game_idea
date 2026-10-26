class_name VehicleBerline
extends CharacterBody3D
## Berline urbaine « Valois GT » à conduite arcade (Section 5.4 — présente en Zone 1 et poursuites).

signal vehicle_speed_changed(speed_kmh: float, integrity_pct: float)

const MAX_SPEED: float = 24.0
const ACCELERATION: float = 18.0
const BRAKE_DECEL: float = 24.0
const TURN_RATE: float = 2.15

var driver: PlayerController = null
var current_speed: float = 0.0
var integrity: float = 100.0


func _ready() -> void:
	add_to_group("vehicles")


func interact(interactor: Node3D) -> void:
	if driver == null and interactor is PlayerController:
		enter_vehicle(interactor as PlayerController)
	elif driver == interactor:
		exit_vehicle()


func enter_vehicle(player: PlayerController) -> void:
	driver = player
	player.active_vehicle = self
	player.visible = false


func exit_vehicle() -> void:
	if driver == null:
		return
	driver.active_vehicle = null
	driver.global_position = global_position + global_transform.basis.x * 2.2 + Vector3.UP * 0.5
	driver.visible = true
	driver = null
	current_speed = 0.0


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= 22.0 * delta

	if driver != null:
		if Input.is_action_just_pressed("interact"):
			exit_vehicle()
			return
		var throttle: float = Input.get_axis("move_backward", "move_forward")
		var steer: float = Input.get_axis("move_right", "move_left")
		if absf(throttle) > 0.05:
			current_speed = clampf(current_speed + throttle * ACCELERATION * delta, -10.0, MAX_SPEED)
		else:
			current_speed = move_toward(current_speed, 0.0, BRAKE_DECEL * 0.5 * delta)
		if absf(current_speed) > 0.6:
			rotation.y += steer * TURN_RATE * delta * signf(current_speed)
		var forward: Vector3 = -global_transform.basis.z
		velocity.x = forward.x * current_speed
		velocity.z = forward.z * current_speed
		vehicle_speed_changed.emit(absf(current_speed) * 3.6, integrity)
	else:
		velocity.x = move_toward(velocity.x, 0.0, 12.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 12.0 * delta)

	move_and_slide()

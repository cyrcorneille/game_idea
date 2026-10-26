class_name MovingPlatformPuzzle
extends PuzzleBase
## Type 2 (Section 5.5) : Plateformes mobiles synchronisées par relais d'alimentation.

var power_relay_active: bool = false
var travel_phase: float = 0.0

@onready var platform_a: AnimatableBody3D = get_node_or_null("PlatformA")
@onready var platform_b: AnimatableBody3D = get_node_or_null("PlatformB")


func activate_power_relay() -> void:
	power_relay_active = true


func complete_crossing() -> void:
	if power_relay_active:
		mark_solved()


func _physics_process(delta: float) -> void:
	if not power_relay_active:
		return
	travel_phase += delta * 1.15
	if platform_a != null:
		platform_a.position.x = sin(travel_phase) * 4.5
	if platform_b != null:
		platform_b.position.x = -sin(travel_phase) * 4.5

class_name LeverDoorPuzzle
extends PuzzleBase
## Type 1 (Section 5.5) : Leviers couplés et porte blindée hydraulique.

var lever_states: Array[bool] = [false, true, false]
var target_states: Array[bool] = [true, true, true]

@onready var gate_mesh: Node3D = get_node_or_null("HydraulicGate")


func toggle_lever(index: int) -> bool:
	if is_solved or index < 0 or index >= lever_states.size():
		return is_solved
	lever_states[index] = not lever_states[index]
	# Couplage mécanique simple : le levier central inverse aussi le premier s'il est abaissé
	if index == 1 and not lever_states[0]:
		lever_states[0] = true
	if lever_states == target_states:
		if gate_mesh != null:
			gate_mesh.position.y += 3.6
		mark_solved()
	return is_solved


func get_next_recommended_lever() -> int:
	for i in range(lever_states.size()):
		if lever_states[i] != target_states[i]:
			return i
	return -1

class_name SequenceOrderPuzzle
extends PuzzleBase
## Type 3 (Section 5.5) : Pylônes d'ordre de séquence harmonique (4 balises).

var expected_sequence: Array[int] = [2, 0, 3, 1]
var entered_sequence: Array[int] = []
var mistake_made: bool = false


func press_pylon(pylon_index: int) -> String:
	if is_solved:
		return "ALREADY_SOLVED"
	var step_idx: int = entered_sequence.size()
	if expected_sequence[step_idx] == pylon_index:
		entered_sequence.append(pylon_index)
		AudioManager.play_voice_cue()
		if entered_sequence.size() == expected_sequence.size():
			if mistake_made:
				MissionManager.bonus_condition_met = false
			mark_solved()
			return "SOLVED"
		return "STEP_OK"
	mistake_made = true
	entered_sequence.clear()
	return "RESET"


func get_next_expected_pylon() -> int:
	if entered_sequence.size() < expected_sequence.size():
		return expected_sequence[entered_sequence.size()]
	return -1

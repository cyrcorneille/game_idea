class_name PuzzleBase
extends Node3D
## Classe de base des puzzles d'environnement avec indice progressif à 3 paliers (Section 5.5).
## Garantit qu'aucun joueur ne reste bloqué sans issue.

signal puzzle_solved(puzzle_id: String)
signal hint_stage_updated(stage: int, hint_text: String)

@export var puzzle_id: String = "puzzle_generic"
@export var hint_stage2_fr: String = "Observez les conduites lumineuses reliant le mécanisme."
@export var hint_stage2_en: String = "Follow the glowing power conduits linking the mechanism."
@export var hint_stage3_fr: String = "Actionnez l'élément doré mis en surbrillance pour avancer."
@export var hint_stage3_en: String = "Activate the golden highlighted node next."

var is_solved: bool = false
var elapsed_in_zone: float = 0.0
var current_hint_stage: int = 1


func _process(delta: float) -> void:
	if is_solved:
		return
	elapsed_in_zone += delta
	if Input.is_action_just_pressed("request_hint"):
		force_next_hint()
	elif elapsed_in_zone >= 30.0 and current_hint_stage < 3:
		_set_hint_stage(3)
	elif elapsed_in_zone >= 15.0 and current_hint_stage < 2:
		_set_hint_stage(2)


func force_next_hint() -> void:
	_set_hint_stage(mini(3, current_hint_stage + 1))


func _set_hint_stage(stage: int) -> void:
	current_hint_stage = stage
	var msg: String = ""
	if stage == 2:
		msg = LocalizationManager.select_text(hint_stage2_fr, hint_stage2_en)
	elif stage >= 3:
		msg = LocalizationManager.select_text(hint_stage3_fr, hint_stage3_en)
	hint_stage_updated.emit(current_hint_stage, msg)


func mark_solved() -> void:
	if is_solved:
		return
	is_solved = true
	AudioManager.play_sfx("parry_clang")
	MissionManager.advance_objective(1)
	puzzle_solved.emit(puzzle_id)

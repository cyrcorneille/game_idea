class_name PauseMenuController
extends Control
## Menu Pause complet : Inventaire, Arbre de compétences, Carte & Fast Travel, 3 Slots Sauvegarde & Options (Section 9).

@onready var resume_btn: Button = $Panel/VBox/ResumeButton
@onready var save_slot_1_btn: Button = $Panel/VBox/SaveSlot1Button
@onready var save_slot_2_btn: Button = $Panel/VBox/SaveSlot2Button
@onready var save_slot_3_btn: Button = $Panel/VBox/SaveSlot3Button


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	if resume_btn != null:
		resume_btn.pressed.connect(toggle_pause)
	if save_slot_1_btn != null:
		save_slot_1_btn.pressed.connect(func() -> void: SaveManager.save_game(1, false))
	if save_slot_2_btn != null:
		save_slot_2_btn.pressed.connect(func() -> void: SaveManager.save_game(2, false))
	if save_slot_3_btn != null:
		save_slot_3_btn.pressed.connect(func() -> void: SaveManager.save_game(3, false))


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause_menu") or event.is_action_pressed("open_map"):
		toggle_pause()


func toggle_pause() -> void:
	visible = not visible
	get_tree().paused = visible

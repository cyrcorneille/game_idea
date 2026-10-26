class_name MainMenuController
extends Control
## Menu principal illustré avec reprise de sauvegarde, nouvelle campagne et choix de langue (Section 9).

signal start_requested()

@onready var play_btn: Button = $CenterBox/VBox/PlayButton
@onready var continue_btn: Button = $CenterBox/VBox/ContinueButton
@onready var lang_btn: Button = $CenterBox/VBox/LangButton


func _ready() -> void:
	if play_btn != null:
		play_btn.pressed.connect(func() -> void:
			visible = false
			MissionManager.start_current_mission()
			start_requested.emit()
		)
	if continue_btn != null:
		var slot1: Dictionary = SaveManager.get_slot_summary(1)
		continue_btn.disabled = not bool(slot1.get("exists", false))
		continue_btn.pressed.connect(func() -> void:
			if SaveManager.load_game(1):
				visible = false
				start_requested.emit()
		)
	if lang_btn != null:
		lang_btn.pressed.connect(func() -> void:
			var next_loc: String = "en" if LocalizationManager.current_locale == "fr" else "fr"
			LocalizationManager.set_locale(next_loc)
			_refresh_labels()
		)
	_refresh_labels()


func _refresh_labels() -> void:
	if play_btn != null:
		play_btn.text = LocalizationManager.tr_key("menu_play")
	if continue_btn != null:
		continue_btn.text = LocalizationManager.tr_key("menu_continue")
	if lang_btn != null:
		lang_btn.text = "Langue / Language : %s" % LocalizationManager.current_locale.to_upper()

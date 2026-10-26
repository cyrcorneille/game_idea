extends Node
## Gestionnaire de mode de gameplay et des transitions cinématiques (Sections 5 & 11.2).
## Garantit qu'aucun changement ne survient brutalement au milieu d'une action critique.

signal transition_started(from_mode: int, to_mode: int, reason_label: String)
signal mode_changed(new_mode: int)
signal transition_completed(active_mode: int)

enum PlayMode {
	EXPLORATION = 0,
	COMBAT = 1,
	SHOOTING = 2
}

var current_mode: PlayMode = PlayMode.EXPLORATION
var is_transitioning: bool = false
var action_lock_active: bool = false
var _pending_mode: int = -1
var _pending_reason: String = ""


func get_mode_name(mode_val: PlayMode) -> String:
	match mode_val:
		PlayMode.EXPLORATION:
			return LocalizationManager.tr_key("mode_exploration")
		PlayMode.COMBAT:
			return LocalizationManager.tr_key("mode_combat")
		PlayMode.SHOOTING:
			return LocalizationManager.tr_key("mode_shooting")
	return "UNKNOWN"


func set_action_lock(locked: bool) -> void:
	action_lock_active = locked
	if not action_lock_active and _pending_mode != -1:
		var next_mode: PlayMode = _pending_mode as PlayMode
		var reason: String = _pending_reason
		_pending_mode = -1
		_pending_reason = ""
		request_mode_transition(next_mode, reason)


func request_mode_transition(target_mode: PlayMode, reason_label: String = "SCRIPTED") -> bool:
	if target_mode == current_mode or is_transitioning:
		return false
	# Protection Section 5.3 : diffère la transition si une animation d'attaque est en cours.
	if action_lock_active:
		_pending_mode = int(target_mode)
		_pending_reason = reason_label
		return true

	is_transitioning = true
	var previous_mode: PlayMode = current_mode
	transition_started.emit(int(previous_mode), int(target_mode), reason_label)
	current_mode = target_mode
	mode_changed.emit(int(current_mode))
	AudioManager.adapt_music_to_mode(int(current_mode))
	is_transitioning = false
	transition_completed.emit(int(current_mode))
	return true

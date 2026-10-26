class_name HUDController
extends CanvasLayer
## HUD minimaliste adaptatif (Section 9) : vie, endurance, munitions, objectif, sous-titres & indicateur dégâts.

@onready var health_bar: ProgressBar = $MarginRoot/BottomLeft/HealthBar
@onready var stamina_bar: ProgressBar = $MarginRoot/BottomLeft/StaminaBar
@onready var mode_label: Label = $MarginRoot/TopLeft/ModeLabel
@onready var stats_label: Label = $MarginRoot/TopLeft/StatsLabel
@onready var objective_label: Label = $MarginRoot/TopRight/ObjectiveLabel
@onready var ammo_label: Label = $MarginRoot/BottomRight/AmmoLabel
@onready var subtitle_box: PanelContainer = $MarginRoot/SubtitlePanel
@onready var subtitle_label: Label = $MarginRoot/SubtitlePanel/SubtitleLabel
@onready var damage_flash: ColorRect = $DamageIndicator
@onready var transition_banner: Label = $TransitionBanner


func _ready() -> void:
	GameManager.stats_updated.connect(_refresh_stats)
	ModeManager.mode_changed.connect(_on_mode_changed)
	ModeManager.transition_started.connect(_on_transition_started)
	MissionManager.subtitle_triggered.connect(_on_subtitle)
	MissionManager.mission_started.connect(_on_mission_updated)
	MissionManager.mission_completed.connect(_on_mission_done)
	LocalizationManager.locale_changed.connect(func(_l: String) -> void: _refresh_stats())
	_refresh_stats()


func _process(delta: float) -> void:
	if health_bar != null:
		health_bar.max_value = GameManager.get_max_health()
		health_bar.value = GameManager.health
	if stamina_bar != null:
		stamina_bar.max_value = GameManager.get_max_stamina()
		stamina_bar.value = GameManager.stamina
	if damage_flash != null and damage_flash.color.a > 0.0:
		damage_flash.color.a = maxf(0.0, damage_flash.color.a - delta * 2.2)


func bind_player(player: PlayerController) -> void:
	player.hud_weapon_updated.connect(_on_weapon_hud)
	player.directional_damage_taken.connect(_on_directional_hit)


func _refresh_stats() -> void:
	if mode_label != null:
		mode_label.text = ModeManager.get_mode_name(ModeManager.current_mode)
	if stats_label != null:
		stats_label.text = "%s | Nv.%d | %d €" % [
			LocalizationManager.tr_key(GameManager.current_zone_id),
			GameManager.level,
			GameManager.money
		]
	_update_objective_text()


func _on_mode_changed(_new_mode: int) -> void:
	_refresh_stats()
	if ammo_label != null:
		ammo_label.visible = (ModeManager.current_mode == ModeManager.PlayMode.SHOOTING)


func _on_transition_started(_from_m: int, to_m: int, _reason: String) -> void:
	if transition_banner != null:
		transition_banner.text = "— %s —" % ModeManager.get_mode_name(to_m as ModeManager.PlayMode)
		transition_banner.visible = true
		get_tree().create_timer(1.6).timeout.connect(func() -> void:
			if transition_banner != null:
				transition_banner.visible = false
		)


func _on_weapon_hud(weapon_name: String, in_mag: int, reserve: int, reloading: bool) -> void:
	if ammo_label != null:
		ammo_label.text = "%s : %d / %d%s" % [weapon_name, in_mag, reserve, " [RECHARGEMENT]" if reloading else ""]


func _on_directional_hit(_angle: float, _amount: float) -> void:
	if damage_flash != null:
		damage_flash.color.a = 0.42


func _on_subtitle(speaker: String, text_fr: String, text_en: String) -> void:
	if subtitle_box == null or subtitle_label == null:
		return
	if not LocalizationManager.subtitles_enabled:
		subtitle_box.visible = false
		return
	subtitle_box.visible = true
	subtitle_label.text = "[%s] %s" % [speaker.to_upper(), LocalizationManager.select_text(text_fr, text_en)]


func _on_mission_updated(_m: Dictionary) -> void:
	_update_objective_text()


func _on_mission_done(_m: Dictionary, _bonus: bool) -> void:
	_update_objective_text()


func _update_objective_text() -> void:
	if objective_label == null:
		return
	var m: Dictionary = MissionManager.get_current_mission()
	if m.is_empty():
		objective_label.text = "Port-Valois libérée — Contrats libres disponibles"
		return
	var title: String = LocalizationManager.select_text(String(m.get("title_fr", "")), String(m.get("title_en", "")))
	var obj: String = LocalizationManager.select_text(String(m.get("objective_fr", "")), String(m.get("objective_en", "")))
	objective_label.text = "%s\n• %s" % [title, obj]

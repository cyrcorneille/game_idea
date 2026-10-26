extends Node
## Gestionnaire global de localisation FR/EN, sous-titres et taille de texte (Sections 2.2 & 9).

signal locale_changed(new_locale: String)
signal accessibility_changed()

var current_locale: String = "fr"
var subtitles_enabled: bool = true
var text_scale_index: int = 1 # 0 = Petit (0.88), 1 = Normal (1.0), 2 = Grand (1.18)

const SCALES: Array[float] = [0.88, 1.0, 1.18]

const TRANSLATIONS: Dictionary = {
	"menu_play": {"fr": "JOUER LA CAMPAGNE", "en": "PLAY CAMPAIGN"},
	"menu_continue": {"fr": "CONTINUER", "en": "CONTINUE"},
	"menu_quit": {"fr": "QUITTER", "en": "QUIT"},
	"mode_exploration": {"fr": "MODE EXPLORATION (3P)", "en": "EXPLORATION MODE (3P)"},
	"mode_combat": {"fr": "MODE COMBAT ÉPAULE", "en": "MELEE COMBAT MODE"},
	"mode_shooting": {"fr": "MODE TIR TACTIQUE (FPS)", "en": "TACTICAL FPS MODE"},
	"zone_1_downtown": {"fr": "Zone 1 — Centre-ville", "en": "Zone 1 — Downtown"},
	"zone_2_industrial": {"fr": "Zone 2 — Quartier industriel", "en": "Zone 2 — Industrial Docks"},
	"zone_3_outskirts": {"fr": "Zone 3 — Périphérie / Forêt", "en": "Zone 3 — Northern Outskirts"},
	"hud_health": {"fr": "VIE", "en": "HP"},
	"hud_stamina": {"fr": "ENDURANCE", "en": "STAMINA"},
	"hud_ammo": {"fr": "MUNITIONS", "en": "AMMO"},
	"hud_objective": {"fr": "OBJECTIF ACTIF", "en": "ACTIVE OBJECTIVE"},
	"hud_bonus": {"fr": "BONUS OPTIONNEL", "en": "OPTIONAL BONUS"},
	"interact_talk": {"fr": "[E] Parler", "en": "[E] Talk"},
	"interact_pickup": {"fr": "[E] Ramasser", "en": "[E] Pick up"},
	"interact_open": {"fr": "[E] Activer le mécanisme", "en": "[E] Activate mechanism"},
	"interact_drive": {"fr": "[E] Conduire la Berline", "en": "[E] Drive Sedan"},
	"interact_save": {"fr": "[E] Sauvegarder / Voyage rapide", "en": "[E] Save / Fast Travel"},
	"puzzle_hint_prefix": {"fr": "INDICE : ", "en": "HINT: "}
}


func set_locale(locale_code: String) -> void:
	if locale_code != "fr" and locale_code != "en":
		return
	current_locale = locale_code
	locale_changed.emit(current_locale)


func tr_key(key: String) -> String:
	if TRANSLATIONS.has(key):
		var entry: Dictionary = TRANSLATIONS[key]
		if entry.has(current_locale):
			return String(entry[current_locale])
	return key


func select_text(text_fr: String, text_en: String) -> String:
	return text_fr if current_locale == "fr" else text_en


func get_font_scale() -> float:
	return SCALES[clampi(text_scale_index, 0, SCALES.size() - 1)]


func set_text_scale_index(idx: int) -> void:
	text_scale_index = clampi(idx, 0, SCALES.size() - 1)
	accessibility_changed.emit()


func set_subtitles(enabled: bool) -> void:
	subtitles_enabled = enabled
	accessibility_changed.emit()

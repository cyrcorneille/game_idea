class_name WeaponData
extends Resource
## Ressource de données d'arme à feu (Section 5.3 & 11.2 — aucune constante codée en dur).

@export var id: String = "pistol"
@export var display_name_fr: String = "P99 Tactical"
@export var display_name_en: String = "P99 Tactical"
@export_enum("PISTOL", "ASSAULT_RIFLE", "SHOTGUN", "SNIPER_RIFLE") var category: String = "PISTOL"
@export var damage: float = 28.0
@export var pellets: int = 1
@export var fire_rate: float = 4.2
@export var mag_size: int = 15
@export var max_reserve: int = 90
@export var reload_time: float = 1.35
@export var recoil_kick: float = 0.18
@export var spread_hip_deg: float = 1.6
@export var spread_ads_deg: float = 0.35
@export var ads_fov: float = 55.0
@export var effective_range: float = 45.0
@export var crit_multiplier: float = 1.6
@export var price: int = 0

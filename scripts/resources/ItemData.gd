class_name ItemData
extends Resource
## Ressource d'armure, d'amélioration ou de matériau rare (Section 7.1 & 7.3).

@export var id: String = "vest_light"
@export var display_name_fr: String = "Gilet Kevlar Urbain"
@export var display_name_en: String = "Urban Kevlar Vest"
@export_enum("ARMOR_TORSO", "ARMOR_TACTICAL", "WEAPON_UPGRADE", "MATERIAL") var item_type: String = "ARMOR_TORSO"
@export var bonus_max_health: float = 15.0
@export var bonus_max_stamina: float = 0.0
@export var damage_reduction: float = 0.08
@export var damage_multiplier_bonus: float = 0.0
@export var recoil_reduction_bonus: float = 0.0
@export var mag_capacity_bonus: float = 0.0
@export var price: int = 0
@export var material_id: String = ""
@export var material_cost: int = 0

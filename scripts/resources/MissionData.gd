class_name MissionData
extends Resource
## Ressource définissant une mission de campagne et ses objectifs (Section 6.1 & 6.2).

@export var id: String = "m01"
@export var mission_number: int = 1
@export var act_number: int = 1
@export var zone_id: String = "zone_1_downtown"
@export_enum("EXPLORATION", "COMBAT", "SHOOTING") var dominant_mode: String = "COMBAT"
@export_enum("COMBAT", "SHOOTING", "PUZZLE", "PURSUIT", "INFILTRATION", "MIXED") var mission_type: String = "COMBAT"
@export var title_fr: String = ""
@export var title_en: String = ""
@export var objective_fr: String = ""
@export var objective_en: String = ""
@export var bonus_fr: String = ""
@export var bonus_en: String = ""
@export var reward_money: int = 400
@export var reward_xp: int = 150
@export var reward_material_id: String = "polymer"
@export var reward_material_amount: int = 1
@export var unlocks_zone_id: String = ""
@export var act_reversal_fr: String = ""
@export var act_reversal_en: String = ""

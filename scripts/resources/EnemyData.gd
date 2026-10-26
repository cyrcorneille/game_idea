class_name EnemyData
extends Resource
## Ressource de configuration d'archétype ennemi / boss (Section 5.2, 5.3 & 11.2).

@export var id: String = "rusher"
@export var display_name_fr: String = "Exécuteur Éclipse"
@export var display_name_en: String = "Eclipse Enforcer"
@export_enum("SIMPLE_ATTACK", "GUARD", "RANGED") var behavior_type: String = "SIMPLE_ATTACK"
@export var is_boss: bool = false
@export var max_health: float = 85.0
@export var move_speed: float = 4.6
@export var attack_damage: float = 14.0
@export var attack_range: float = 2.2
@export var detection_range: float = 24.0
@export var attack_cooldown: float = 1.35
@export var xp_reward: int = 45
@export var money_reward: int = 65
@export var tint_color: Color = Color(0.93, 0.26, 0.26, 1.0)

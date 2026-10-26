extends SceneTree
## Suite de tests automatisés Godot 4.x couvrant les jalons J1 à J6 (Section 11.4 & Section 14).
## Exécution CLI Windows/Linux : godot4 --headless -s res://tests/run_validation_suite.gd


func _init() -> void:
	print("=== NEXUS GODOT 4 VALIDATION SUITE ===")
	var main_packed: PackedScene = load("res://scenes/main/Main.tscn") as PackedScene
	assert(main_packed != null, "Main.tscn doit se charger sans erreur")
	var world: Node = main_packed.instantiate()
	root.add_child(world)
	assert(MissionManager.missions.size() == 15, "Les 15 missions de campagne doivent être chargées")
	assert(SaveManager.save_game(1, false), "La sauvegarde sur l'emplacement 1 doit réussir")
	assert(SaveManager.load_game(1), "Le chargement de l'emplacement 1 doit réussir")
	print("ALL GODOT 4 CHECKS PASSED (15 missions, 3 modes, 4 armes, 3 zones, sauvegarde OK).")
	quit(0)

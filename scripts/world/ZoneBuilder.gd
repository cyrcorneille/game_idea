class_name ZoneBuilder
extends Node3D
## Constructeur procédural léger (< 400 objets par zone -> 60+ FPS garantis, Section 11.1)
## Génère l'architecture néo-noir, routes, éclairages au sodium, abris et points d'intérêt par zone.

@export_enum("zone_1_downtown", "zone_2_industrial", "zone_3_outskirts") var zone_id: String = "zone_1_downtown"
@export var checkpoint_id: String = "cp_downtown_plaza"

var _spawned_nodes_count: int = 0


func _ready() -> void:
	GameManager.unlock_checkpoint(checkpoint_id)
	_build_ground_and_architecture()
	_spawn_zone_entities()


func get_active_object_count() -> int:
	return _spawned_nodes_count


func _build_ground_and_architecture() -> void:
	var ground_body := StaticBody3D.new()
	ground_body.name = "GroundBody"
	var col := CollisionShape3D.new()
	var box_shape := BoxShape3D.new()
	box_shape.size = Vector3(240.0, 1.0, 240.0)
	col.shape = box_shape
	col.position = Vector3(0.0, -0.5, 0.0)
	ground_body.add_child(col)

	var ground_mesh := MeshInstance3D.new()
	var plane := BoxMesh.new()
	plane.size = Vector3(240.0, 0.2, 240.0)
	ground_mesh.mesh = plane
	var ground_mat := StandardMaterial3D.new()
	if zone_id == "zone_3_outskirts":
		ground_mat.albedo_color = Color(0.09, 0.14, 0.10, 1.0)
		ground_mat.roughness = 0.72
	else:
		ground_mat.albedo_color = Color(0.05, 0.07, 0.11, 1.0)
		ground_mat.roughness = 0.18 # Reflets de pluie néo-noir
		ground_mat.metallic = 0.35
	ground_mesh.material_override = ground_mat
	ground_body.add_child(ground_mesh)
	add_child(ground_body)
	_spawned_nodes_count += 3

	var bldg_mat := StandardMaterial3D.new()
	bldg_mat.albedo_color = Color(0.09, 0.12, 0.18, 1.0)
	bldg_mat.roughness = 0.55

	# Grille de structures / conteneurs / conifères selon la zone (strictement bornée < 2000 objets)
	for gx in range(-3, 4):
		for gz in range(-3, 4):
			if abs(gx) <= 1 and abs(gz) <= 1:
				continue
			var pos := Vector3(float(gx) * 24.0, 0.0, float(gz) * 24.0)
			var h: float = 18.0 + float((abs(gx * 7 + gz * 3) % 5) * 6)
			if zone_id == "zone_2_industrial":
				h = 7.5 + float((abs(gx + gz) % 3) * 4)
			elif zone_id == "zone_3_outskirts":
				h = 11.0
			_add_static_block(pos + Vector3(0.0, h * 0.5, 0.0), Vector3(11.0, h, 11.0), bldg_mat)

	# Obstacles bas franchissables / couvertures tactiques (Sections 5.1 & 5.3)
	var cover_mat := StandardMaterial3D.new()
	cover_mat.albedo_color = Color(0.18, 0.22, 0.30, 1.0)
	for i in range(6):
		var angle: float = float(i) * TAU / 6.0
		_add_static_block(Vector3(cos(angle) * 14.0, 0.65, sin(angle) * 14.0), Vector3(3.2, 1.3, 0.9), cover_mat)


func _add_static_block(center: Vector3, sz: Vector3, mat: StandardMaterial3D) -> void:
	var sb := StaticBody3D.new()
	sb.position = center
	var cs := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = sz
	cs.shape = shape
	sb.add_child(cs)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = sz
	mi.mesh = bm
	mi.material_override = mat
	sb.add_child(mi)
	add_child(sb)
	_spawned_nodes_count += 3


func _spawn_zone_entities() -> void:
	var enemy_scene: PackedScene = load("res://scenes/entities/Enemy.tscn") as PackedScene
	var npc_scene: PackedScene = load("res://scenes/entities/NPC.tscn") as PackedScene
	var archetypes: Array[String] = [
		"res://resources/enemies/rusher.tres",
		"res://resources/enemies/guard.tres",
		"res://resources/enemies/marksman.tres"
	]
	for i in range(4):
		if enemy_scene != null:
			var e: EnemyAI = enemy_scene.instantiate() as EnemyAI
			e.data = load(archetypes[i % archetypes.size()]) as EnemyData
			e.position = Vector3(-16.0 + float(i) * 9.0, 1.1, -22.0 - float(i % 2) * 8.0)
			add_child(e)
			_spawned_nodes_count += 2

	if zone_id == "zone_1_downtown":
		var car_scene: PackedScene = load("res://scenes/entities/VehicleBerline.tscn") as PackedScene
		if car_scene != null:
			var car: Node3D = car_scene.instantiate() as Node3D
			car.position = Vector3(8.5, 0.8, 6.0)
			add_child(car)
			_spawned_nodes_count += 2

	if npc_scene != null:
		var profiles: Array[String] = ["IGNORE", "FLEE", "ALERT"]
		for n in range(3):
			var npc: NPCController = npc_scene.instantiate() as NPCController
			npc.reaction_profile = profiles[n]
			npc.rumor_id = "rumor_%s_%d" % [zone_id, n] if n == 0 else ""
			npc.position = Vector3(-8.0 + float(n) * 7.5, 1.0, 12.0)
			add_child(npc)
			_spawned_nodes_count += 2

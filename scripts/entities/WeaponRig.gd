class_name WeaponRig
extends Node3D
## Modèle 3D procédural d'arme en vue subjective avec recul et flamme de bouche (Section 5.3).

var _barrel_mesh: MeshInstance3D
var _body_mesh: MeshInstance3D
var _optic_mesh: MeshInstance3D
var _muzzle_light: OmniLight3D
var _recoil_offset_z: float = 0.0
var _recoil_rot_x: float = 0.0


func _ready() -> void:
	_build_procedural_weapon_meshes()


func _build_procedural_weapon_meshes() -> void:
	var dark_metal := StandardMaterial3D.new()
	dark_metal.albedo_color = Color(0.14, 0.16, 0.2, 1.0)
	dark_metal.metallic = 0.82
	dark_metal.roughness = 0.28

	var accent_mat := StandardMaterial3D.new()
	accent_mat.albedo_color = Color(0.22, 0.74, 0.97, 1.0)
	accent_mat.emission_enabled = true
	accent_mat.emission = Color(0.22, 0.74, 0.97, 1.0)

	_body_mesh = MeshInstance3D.new()
	var body_box := BoxMesh.new()
	body_box.size = Vector3(0.08, 0.12, 0.34)
	_body_mesh.mesh = body_box
	_body_mesh.material_override = dark_metal
	add_child(_body_mesh)

	_barrel_mesh = MeshInstance3D.new()
	var barrel_cyl := BoxMesh.new()
	barrel_cyl.size = Vector3(0.04, 0.04, 0.38)
	_barrel_mesh.mesh = barrel_cyl
	_barrel_mesh.position = Vector3(0.0, 0.04, -0.28)
	_barrel_mesh.material_override = dark_metal
	add_child(_barrel_mesh)

	_optic_mesh = MeshInstance3D.new()
	var optic_box := BoxMesh.new()
	optic_box.size = Vector3(0.035, 0.04, 0.12)
	_optic_mesh.mesh = optic_box
	_optic_mesh.position = Vector3(0.0, 0.085, -0.04)
	_optic_mesh.material_override = accent_mat
	add_child(_optic_mesh)

	_muzzle_light = OmniLight3D.new()
	_muzzle_light.light_color = Color(1.0, 0.72, 0.25)
	_muzzle_light.light_energy = 0.0
	_muzzle_light.omni_range = 6.0
	_muzzle_light.position = Vector3(0.0, 0.04, -0.52)
	add_child(_muzzle_light)


func configure_for_category(category: String) -> void:
	if _barrel_mesh == null:
		return
	match category:
		"PISTOL":
			_barrel_mesh.scale = Vector3(0.85, 0.85, 0.55)
			_optic_mesh.visible = false
		"ASSAULT_RIFLE":
			_barrel_mesh.scale = Vector3(1.0, 1.0, 1.0)
			_optic_mesh.visible = true
		"SHOTGUN":
			_barrel_mesh.scale = Vector3(1.45, 1.35, 1.05)
			_optic_mesh.visible = false
		"SNIPER_RIFLE":
			_barrel_mesh.scale = Vector3(0.9, 0.9, 1.55)
			_optic_mesh.visible = true
			_optic_mesh.scale = Vector3(1.2, 1.2, 1.9)


func trigger_shot_kick(kick_strength: float) -> void:
	_recoil_offset_z = minf(0.14, _recoil_offset_z + kick_strength * 0.16)
	_recoil_rot_x = minf(0.32, _recoil_rot_x + kick_strength * 0.28)
	if _muzzle_light != null:
		_muzzle_light.light_energy = 3.2


func _process(delta: float) -> void:
	_recoil_offset_z = lerpf(_recoil_offset_z, 0.0, minf(1.0, delta * 14.0))
	_recoil_rot_x = lerpf(_recoil_rot_x, 0.0, minf(1.0, delta * 12.0))
	position.z = _recoil_offset_z
	rotation.x = _recoil_rot_x
	if _muzzle_light != null and _muzzle_light.light_energy > 0.01:
		_muzzle_light.light_energy = lerpf(_muzzle_light.light_energy, 0.0, minf(1.0, delta * 26.0))

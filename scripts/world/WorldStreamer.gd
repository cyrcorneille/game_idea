class_name WorldStreamer
extends Node3D
## Orchestrateur principal du monde ouvert : streaming asynchrone des 3 zones,
## cycle jour/nuit (4 états) et météo dynamique Clair / Pluie (Sections 4.1, 4.2 & 11.1).

signal zone_stream_started(zone_id: String)
signal zone_stream_finished(zone_id: String)

const ZONE_SCENES: Dictionary = {
	"zone_1_downtown": "res://scenes/zones/Zone1_Downtown.tscn",
	"zone_2_industrial": "res://scenes/zones/Zone2_Industrial.tscn",
	"zone_3_outskirts": "res://scenes/zones/Zone3_Outskirts.tscn"
}

@onready var zone_container: Node3D = $ZoneContainer
@onready var sun_light: DirectionalLight3D = $DirectionalLight3D
@onready var world_env: WorldEnvironment = $WorldEnvironment
@onready var rain_particles: GPUParticles3D = $RainParticles
@onready var player: PlayerController = $Player

var _streaming_target_path: String = ""
var _streaming_target_id: String = ""


func _ready() -> void:
	GameManager.world_environment_changed.connect(_apply_environment)
	_apply_environment(GameManager.TIMES_OF_DAY[GameManager.time_of_day_index], GameManager.weather_state)
	stream_zone(GameManager.current_zone_id)


func stream_zone(zone_id: String) -> bool:
	if not ZONE_SCENES.has(zone_id):
		return false
	if not (zone_id in GameManager.unlocked_zones):
		return false
	var path: String = String(ZONE_SCENES[zone_id])
	_streaming_target_id = zone_id
	_streaming_target_path = path
	zone_stream_started.emit(zone_id)
	ResourceLoader.load_threaded_request(path)
	return true


func _process(_delta: float) -> void:
	if _streaming_target_path != "":
		var status: ResourceLoader.ThreadLoadStatus = ResourceLoader.load_threaded_get_status(_streaming_target_path)
		if status == ResourceLoader.THREAD_LOAD_LOADED:
			var packed: PackedScene = ResourceLoader.load_threaded_get(_streaming_target_path) as PackedScene
			_swap_active_zone(packed, _streaming_target_id)
			_streaming_target_path = ""
	if rain_particles != null and player != null:
		rain_particles.global_position = player.global_position + Vector3(0.0, 14.0, 0.0)


func _swap_active_zone(packed: PackedScene, zone_id: String) -> void:
	for child in zone_container.get_children():
		child.queue_free()
	if packed != null:
		var inst: Node3D = packed.instantiate() as Node3D
		zone_container.add_child(inst)
	GameManager.current_zone_id = zone_id
	if player != null:
		player.global_position = Vector3(0.0, 1.4, 8.0)
	zone_stream_finished.emit(zone_id)


func fast_travel_to_checkpoint(checkpoint_id: String, target_zone_id: String) -> bool:
	if not (checkpoint_id in GameManager.unlocked_checkpoints):
		return false
	return stream_zone(target_zone_id)


func _apply_environment(time_name: String, weather: String) -> void:
	if sun_light != null:
		match time_name:
			"DAWN":
				sun_light.light_color = Color(0.98, 0.57, 0.24)
				sun_light.light_energy = 0.85
			"DAY":
				sun_light.light_color = Color(0.92, 0.95, 1.0)
				sun_light.light_energy = 1.35
			"DUSK":
				sun_light.light_color = Color(0.85, 0.46, 0.09)
				sun_light.light_energy = 0.72
			"NIGHT":
				sun_light.light_color = Color(0.22, 0.45, 0.78)
				sun_light.light_energy = 0.28
	if rain_particles != null:
		rain_particles.emitting = (weather == "RAIN")

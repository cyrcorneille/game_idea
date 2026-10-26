extends Node
## Gestionnaire audio adaptatif procédural à 3 bus séparés : Music, SFX, Voice (Section 10).

const SAMPLE_RATE: int = 22050

var _music_player: AudioStreamPlayer
var _sfx_player: AudioStreamPlayer
var _voice_player: AudioStreamPlayer
var _cached_streams: Dictionary = {}

var music_volume_linear: float = 0.75
var sfx_volume_linear: float = 0.85
var voice_volume_linear: float = 0.90


func _ready() -> void:
	_music_player = AudioStreamPlayer.new()
	_music_player.bus = &"Music"
	add_child(_music_player)

	_sfx_player = AudioStreamPlayer.new()
	_sfx_player.bus = &"SFX"
	add_child(_sfx_player)

	_voice_player = AudioStreamPlayer.new()
	_voice_player.bus = &"Voice"
	add_child(_voice_player)

	_pregenerate_sfx_bank()
	adapt_music_to_mode(0)


func _pregenerate_sfx_bank() -> void:
	_cached_streams["shoot_pistol"] = _build_tone_wav(240.0, 70.0, 0.11, true)
	_cached_streams["shoot_rifle"] = _build_tone_wav(190.0, 55.0, 0.09, true)
	_cached_streams["shoot_shotgun"] = _build_tone_wav(125.0, 38.0, 0.22, true)
	_cached_streams["shoot_sniper"] = _build_tone_wav(320.0, 48.0, 0.28, true)
	_cached_streams["melee_light"] = _build_tone_wav(310.0, 120.0, 0.08, false)
	_cached_streams["melee_heavy"] = _build_tone_wav(165.0, 52.0, 0.18, true)
	_cached_streams["parry_clang"] = _build_tone_wav(880.0, 1320.0, 0.16, false)
	_cached_streams["footstep"] = _build_tone_wav(95.0, 60.0, 0.05, true)
	_cached_streams["voice_beep"] = _build_tone_wav(640.0, 760.0, 0.07, false)
	_cached_streams["music_explo"] = _build_ambient_loop(110.0, 164.81, 2.0)
	_cached_streams["music_combat"] = _build_ambient_loop(82.41, 123.47, 1.5)
	_cached_streams["music_fps"] = _build_ambient_loop(98.0, 146.83, 1.2)


func _build_tone_wav(freq_start: float, freq_end: float, duration: float, add_noise: bool) -> AudioStreamWAV:
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = SAMPLE_RATE
	wav.stereo = false
	var count: int = maxi(1, int(duration * SAMPLE_RATE))
	var bytes := PackedByteArray()
	bytes.resize(count * 2)
	var phase: float = 0.0
	for i in range(count):
		var t: float = float(i) / float(count)
		var env: float = pow(1.0 - t, 1.8)
		var f: float = lerpf(freq_start, freq_end, t)
		phase += TAU * f / float(SAMPLE_RATE)
		var sample: float = sin(phase) * 0.65
		if add_noise:
			sample += (sin(float(i) * 12.9898) * 0.35)
		var pcm: int = clampi(int(sample * env * 26000.0), -32767, 32767)
		bytes.encode_s16(i * 2, pcm)
	wav.data = bytes
	return wav


func _build_ambient_loop(root_hz: float, fifth_hz: float, duration: float) -> AudioStreamWAV:
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = SAMPLE_RATE
	wav.loop_mode = AudioStreamWAV.LOOP_FORWARD
	var count: int = int(duration * SAMPLE_RATE)
	wav.loop_end = count
	var bytes := PackedByteArray()
	bytes.resize(count * 2)
	for i in range(count):
		var secs: float = float(i) / float(SAMPLE_RATE)
		var pulse: float = 0.55 + 0.45 * sin(TAU * secs / duration)
		var wave: float = (sin(TAU * root_hz * secs) * 0.22 + sin(TAU * fifth_hz * secs) * 0.14) * pulse
		var pcm: int = clampi(int(wave * 24000.0), -32767, 32767)
		bytes.encode_s16(i * 2, pcm)
	wav.data = bytes
	return wav


func adapt_music_to_mode(mode_index: int) -> void:
	var key: String = "music_explo"
	if mode_index == 1:
		key = "music_combat"
	elif mode_index == 2:
		key = "music_fps"
	if _cached_streams.has(key):
		_music_player.stream = _cached_streams[key]
		_music_player.play()


func play_sfx(sfx_key: String) -> void:
	if _cached_streams.has(sfx_key):
		_sfx_player.stream = _cached_streams[sfx_key]
		_sfx_player.play()


func play_voice_cue() -> void:
	if _cached_streams.has("voice_beep"):
		_voice_player.stream = _cached_streams["voice_beep"]
		_voice_player.play()


func set_bus_volume(bus_name: String, linear_value: float) -> void:
	var clamped: float = clampf(linear_value, 0.0, 1.0)
	var idx: int = AudioServer.get_bus_index(bus_name)
	if idx >= 0:
		AudioServer.set_bus_volume_db(idx, linear_to_db(maxf(clamped, 0.0001)))
		AudioServer.set_bus_mute(idx, clamped <= 0.001)
	if bus_name == "Music":
		music_volume_linear = clamped
	elif bus_name == "SFX":
		sfx_volume_linear = clamped
	elif bus_name == "Voice":
		voice_volume_linear = clamped

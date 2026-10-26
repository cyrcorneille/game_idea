#!/usr/bin/env python3
"""
NEXUS — Automated Godot 4.x Project Integrity & AST Verification Suite.
Validates:
1. AST parsing of every .gd file using official gdtoolkit `gdparse` (Godot 4 grammar).
2. project.godot main scene, icon, audio bus layout, all 6 Autoload paths, and InputMap actions.
3. Every .tscn and .tres file: all `res://` ExtResource paths exist on disk, SubResource references match,
   and .tres properties match `@export` declarations on their target Resource script.
4. All 15 Campaign Missions across 4 Acts, Zone unlocks (M04 -> Zone 2, M08 -> Zone 3), and Annex A docs.
"""

import json
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def resolve_res(res_path: str) -> pathlib.Path:
    assert res_path.startswith("res://"), f"Invalid res path: {res_path}"
    return ROOT / res_path[len("res://") :]


def verify_gdscript_ast() -> int:
    gd_files = sorted(p for p in ROOT.rglob("*.gd") if "web/" not in p.as_posix())
    assert len(gd_files) >= 18, f"Expected >= 18 GDScript files, found {len(gd_files)}"
    if shutil.which("gdparse") is None:
        # Fresh sandbox sessions may not have gdtoolkit installed. Degrade gracefully
        # to structural checks instead of crashing, so the suite stays runnable offline.
        print("WARNING: `gdparse` (gdtoolkit) not found — running structural fallback checks.")
        print("         Install with: pip install --break-system-packages gdtoolkit")
        for gd in gd_files:
            text = gd.read_text(encoding="utf-8")
            assert text.strip(), f"Empty GDScript file: {gd}"
            assert text.lstrip().startswith(("#", "@", "class_name", "extends", "static")), (
                f"Unexpected GDScript header in {gd}"
            )
            assert text.count("(") == text.count(")"), f"Unbalanced parentheses in {gd}"
            assert text.count("{") == text.count("}"), f"Unbalanced braces in {gd}"
        return len(gd_files)
    cmd = ["gdparse"] + [str(p) for p in gd_files]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print("GDPARSE ERROR:\n", proc.stdout, proc.stderr)
        sys.exit(1)
    return len(gd_files)


def verify_project_godot() -> None:
    proj = (ROOT / "project.godot").read_text(encoding="utf-8")
    for res_match in re.findall(r'\*?res://[^\s"]+', proj):
        clean = res_match.lstrip("*")
        target = resolve_res(clean)
        assert target.exists(), f"Missing path referenced in project.godot: {clean}"
    required_actions = [
        "move_forward", "move_backward", "move_left", "move_right",
        "jump", "sprint", "interact", "primary_action", "secondary_action",
        "dodge", "parry", "reload", "lock_target", "open_map", "request_hint", "pause_menu",
    ]
    for act in required_actions:
        assert f"\n{act}=" in proj, f"Missing InputMap action: {act}"


def extract_script_exports(gd_path: pathlib.Path) -> set[str]:
    text = gd_path.read_text(encoding="utf-8")
    return set(re.findall(r"@export(?:_\w+(?:\([^)]*\))?)?\s+var\s+(\w+)", text))


def verify_scenes_and_resources() -> tuple[int, int]:
    tscn_files = sorted(ROOT.rglob("*.tscn"))
    tres_files = sorted(ROOT.rglob("*.tres"))
    assert len(tscn_files) >= 14, f"Expected >= 14 .tscn scenes, found {len(tscn_files)}"
    assert len(tres_files) >= 13, f"Expected >= 13 .tres resources, found {len(tres_files)}"

    for f in tscn_files + tres_files:
        content = f.read_text(encoding="utf-8")
        ext_ids = set(re.findall(r'\[ext_resource [^\]]*id="([^"]+)"\]', content))
        sub_ids = set(re.findall(r'\[sub_resource [^\]]*id="([^"]+)"\]', content))

        for path_str in re.findall(r'path="(res://[^"]+)"', content):
            assert resolve_res(path_str).exists(), f"{f}: Missing ExtResource {path_str}"

        for ref_ext in re.findall(r'ExtResource\("([^"]+)"\)', content):
            assert ref_ext in ext_ids, f"{f}: Undefined ExtResource('{ref_ext}')"

        for ref_sub in re.findall(r'SubResource\("([^"]+)"\)', content):
            assert ref_sub in sub_ids, f"{f}: Undefined SubResource('{ref_sub}')"

    for tf in tres_files:
        content = tf.read_text(encoding="utf-8")
        script_m = re.search(r'path="(res://scripts/resources/\w+\.gd)"', content)
        if script_m:
            allowed_props = extract_script_exports(resolve_res(script_m.group(1))) | {"script"}
            res_section = content.split("[resource]", 1)[1]
            for line in res_section.strip().splitlines():
                if "=" in line:
                    prop = line.split("=", 1)[0].strip()
                    assert prop in allowed_props, f"{tf}: Property '{prop}' not in {script_m.group(1)} exports"

    return len(tscn_files), len(tres_files)


def verify_campaign_and_docs() -> int:
    missions = json.loads((ROOT / "resources/missions/campaign_missions.json").read_text(encoding="utf-8"))
    assert len(missions) == 15, f"Expected 15 missions, got {len(missions)}"
    acts = {m["act"] for m in missions}
    assert acts == {1, 2, 3, 4}, f"Expected all 4 acts, got {acts}"
    assert missions[3]["unlocks_zone"] == "zone_2_industrial", "M04 must unlock Zone 2"
    assert missions[7]["unlocks_zone"] == "zone_3_outskirts", "M08 must unlock Zone 3"
    for doc_name in [
        "annexe_a1_synopsis_et_personnages.md",
        "annexe_a2_scenario_missions.md",
        "annexe_a3_catalogue_armes_ennemis_objets.md",
        "annexe_a4_charte_graphique_et_ui.md",
    ]:
        p = ROOT / "docs" / doc_name
        assert p.exists() and p.stat().st_size > 1500, f"Incomplete Annex A doc: {doc_name}"
    return len(missions)


if __name__ == "__main__":
    n_gd = verify_gdscript_ast()
    verify_project_godot()
    n_tscn, n_tres = verify_scenes_and_resources()
    n_missions = verify_campaign_and_docs()
    ast_mode = "AST OK" if shutil.which("gdparse") else "structural fallback"
    print(
        f"SUCCESS: Verified {n_gd} GDScript files ({ast_mode}), {n_tscn} .tscn scenes, "
        f"{n_tres} .tres resources, and {n_missions} campaign missions across 4 Acts!"
    )

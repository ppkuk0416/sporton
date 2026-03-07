#!/usr/bin/env python3
"""
PM Skills Marketplace - Plugin Validator
Validates all plugins, skills, and commands for structural correctness.
Exit code: 0 = pass, 1 = failures detected
"""

import os
import re
import sys
import json

ROOT = os.path.dirname(os.path.abspath(__file__))
PLUGINS = [
    "pm-product-discovery",
    "pm-product-strategy",
    "pm-execution",
    "pm-market-research",
    "pm-data-analytics",
    "pm-go-to-market",
    "pm-marketing-growth",
    "pm-toolkit",
]

REQUIRED_MANIFEST_FIELDS = ["name", "version", "description", "author", "keywords"]
REQUIRED_README_SECTIONS = ["overview", "install", "skills", "commands"]
SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")
WORD_COUNT_MIN = 50
WORD_COUNT_MAX = 3000

failures = []


def fail(msg):
    failures.append(msg)
    print(f"  FAIL: {msg}")


def ok(msg):
    print(f"  OK  : {msg}")


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def parse_frontmatter(content):
    """Extract YAML frontmatter fields as a simple dict (key: value)."""
    fm = {}
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            block = content[3:end]
            for line in block.splitlines():
                if ":" in line:
                    k, _, v = line.partition(":")
                    fm[k.strip()] = v.strip()
    return fm


def word_count(content):
    return len(content.split())


# ──────────────────────────────────────────────
# Marketplace manifest
# ──────────────────────────────────────────────

def validate_marketplace():
    print("\n[Marketplace]")
    path = os.path.join(ROOT, ".claude-plugin", "marketplace.json")
    if not os.path.exists(path):
        fail("marketplace.json missing")
        return
    with open(path) as f:
        data = json.load(f)
    for field in REQUIRED_MANIFEST_FIELDS:
        if field not in data:
            fail(f"marketplace.json missing field: {field}")
        else:
            ok(f"marketplace.json has '{field}'")
    if "version" in data and not SEMVER_RE.match(data["version"]):
        fail(f"marketplace.json version not semver: {data['version']}")


# ──────────────────────────────────────────────
# Plugin manifest
# ──────────────────────────────────────────────

def validate_plugin_manifest(plugin_dir, plugin_name):
    path = os.path.join(plugin_dir, ".claude-plugin", "plugin.json")
    if not os.path.exists(path):
        fail(f"{plugin_name}: plugin.json missing")
        return
    with open(path) as f:
        data = json.load(f)
    for field in REQUIRED_MANIFEST_FIELDS:
        if field not in data:
            fail(f"{plugin_name}/plugin.json missing field: {field}")
        else:
            ok(f"{plugin_name}/plugin.json has '{field}'")
    if "version" in data and not SEMVER_RE.match(data["version"]):
        fail(f"{plugin_name}/plugin.json version not semver: {data['version']}")


# ──────────────────────────────────────────────
# Skills
# ──────────────────────────────────────────────

def validate_skills(plugin_dir, plugin_name):
    skills_dir = os.path.join(plugin_dir, "skills")
    if not os.path.isdir(skills_dir):
        fail(f"{plugin_name}: skills/ directory missing")
        return

    skill_names = []
    for skill_folder in os.listdir(skills_dir):
        skill_path = os.path.join(skills_dir, skill_folder, "SKILL.md")
        if not os.path.exists(skill_path):
            fail(f"{plugin_name}/skills/{skill_folder}: SKILL.md missing")
            continue

        with open(skill_path) as f:
            content = f.read()

        fm = parse_frontmatter(content)

        # Name matches directory
        if fm.get("name") != skill_folder:
            fail(f"{plugin_name}/skills/{skill_folder}: name '{fm.get('name')}' != directory '{skill_folder}'")
        else:
            ok(f"{plugin_name}/skills/{skill_folder}: name matches directory")
            skill_names.append(skill_folder)

        # Description present
        if not fm.get("description"):
            fail(f"{plugin_name}/skills/{skill_folder}: missing 'description' frontmatter")
        else:
            ok(f"{plugin_name}/skills/{skill_folder}: has description")

        # Word count
        wc = word_count(content)
        if wc < WORD_COUNT_MIN:
            fail(f"{plugin_name}/skills/{skill_folder}: word count {wc} < {WORD_COUNT_MIN}")
        elif wc > WORD_COUNT_MAX:
            fail(f"{plugin_name}/skills/{skill_folder}: word count {wc} > {WORD_COUNT_MAX}")
        else:
            ok(f"{plugin_name}/skills/{skill_folder}: word count {wc} OK")

        # Trigger phrase
        lower = content.lower()
        if "use when" not in lower and "trigger" not in lower:
            fail(f"{plugin_name}/skills/{skill_folder}: missing trigger phrase ('use when' or 'trigger')")
        else:
            ok(f"{plugin_name}/skills/{skill_folder}: has trigger phrase")

    return skill_names


# ──────────────────────────────────────────────
# Commands
# ──────────────────────────────────────────────

def validate_commands(plugin_dir, plugin_name, skill_names):
    commands_dir = os.path.join(plugin_dir, "commands")
    if not os.path.isdir(commands_dir):
        fail(f"{plugin_name}: commands/ directory missing")
        return

    for cmd_file in os.listdir(commands_dir):
        if not cmd_file.endswith(".md"):
            continue
        cmd_name = cmd_file[:-3]
        cmd_path = os.path.join(commands_dir, cmd_file)

        with open(cmd_path) as f:
            content = f.read()

        fm = parse_frontmatter(content)

        # description required
        if not fm.get("description"):
            fail(f"{plugin_name}/commands/{cmd_name}: missing 'description' frontmatter")
        else:
            ok(f"{plugin_name}/commands/{cmd_name}: has description")

        # argument-hint recommended
        if not fm.get("argument-hint"):
            print(f"  WARN: {plugin_name}/commands/{cmd_name}: missing 'argument-hint' (recommended)")

        # Check for cross-plugin references (simple heuristic)
        for other_plugin in PLUGINS:
            if other_plugin != plugin_name and other_plugin + ":" in content:
                fail(f"{plugin_name}/commands/{cmd_name}: cross-plugin direct reference to {other_plugin}")


# ──────────────────────────────────────────────
# README
# ──────────────────────────────────────────────

def validate_readme(plugin_dir, plugin_name):
    readme_path = os.path.join(plugin_dir, "README.md")
    if not os.path.exists(readme_path):
        fail(f"{plugin_name}: README.md missing")
        return
    with open(readme_path) as f:
        content = f.read().lower()
    for section in REQUIRED_README_SECTIONS:
        if section not in content:
            fail(f"{plugin_name}/README.md: missing section '{section}'")
        else:
            ok(f"{plugin_name}/README.md: has '{section}' section")


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main():
    print("=" * 60)
    print("PM Skills Marketplace Validator")
    print("=" * 60)

    validate_marketplace()

    for plugin_name in PLUGINS:
        plugin_dir = os.path.join(ROOT, plugin_name)
        print(f"\n[{plugin_name}]")
        if not os.path.isdir(plugin_dir):
            fail(f"{plugin_name}: plugin directory missing")
            continue
        validate_plugin_manifest(plugin_dir, plugin_name)
        skill_names = validate_skills(plugin_dir, plugin_name) or []
        validate_commands(plugin_dir, plugin_name, skill_names)
        validate_readme(plugin_dir, plugin_name)

    print("\n" + "=" * 60)
    if failures:
        print(f"RESULT: {len(failures)} failure(s) detected")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("RESULT: All checks passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()

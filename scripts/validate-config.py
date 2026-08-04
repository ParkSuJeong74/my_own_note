#!/usr/bin/env python3

import json
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    json_files = sorted((ROOT / "monitoring" / "grafana" / "dashboards").glob("*.json"))
    yaml_files = [
        ROOT / "docker-compose.yml",
        *sorted((ROOT / "monitoring").rglob("*.yml")),
    ]

    for path in json_files:
        with path.open(encoding="utf-8") as file:
            json.load(file)
        print(f"valid JSON: {path.relative_to(ROOT)}")

    for path in yaml_files:
        with path.open(encoding="utf-8") as file:
            # Grafana provisioning accepts matcher operators such as unquoted `=`.
            # BaseLoader validates YAML structure without interpreting those values
            # as YAML 1.1 application-specific tags.
            list(yaml.load_all(file, Loader=yaml.BaseLoader))
        print(f"valid YAML: {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

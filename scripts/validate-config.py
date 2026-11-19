#!/usr/bin/env python3

import json
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
POSTGRES_IMAGE = (
    "postgres:16.16-alpine@"
    "sha256:81e77a4833487b8132fe4b00bedd39dc3f74b8641e387f19312a48f7de218c2e"
)
POSTGRES_SERVICES = ("mano-admin-postgres", "easyopen-postgres", "n8n-postgres")


def validate_postgres_images() -> None:
    compose_path = ROOT / "docker-compose.yml"
    with compose_path.open(encoding="utf-8") as file:
        compose = yaml.load(file, Loader=yaml.BaseLoader)

    services = compose.get("services", {})
    for service_name in POSTGRES_SERVICES:
        image = services.get(service_name, {}).get("image")
        if image != POSTGRES_IMAGE:
            raise ValueError(
                f"{service_name} must pin the approved PostgreSQL image: {POSTGRES_IMAGE}"
            )

    print("valid PostgreSQL image pins: " + ", ".join(POSTGRES_SERVICES))


def main() -> None:
    json_files = sorted((ROOT / "monitoring" / "grafana" / "dashboards").glob("*.json"))
    yaml_files = [
        ROOT / "doppler.yaml",
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

    validate_postgres_images()


if __name__ == "__main__":
    main()

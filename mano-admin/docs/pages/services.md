# Services

## Purpose

The Services page is the static home-server catalog. It combines known service metadata with a
Prometheus status query and a safe external management link.

## Catalog ownership

Entries are maintained in `src/config/services.ts`. Each entry contains an identifier, display
name, category, description, optional external URL and optional allowlisted PromQL query.
Visitors cannot submit arbitrary PromQL or internal URLs.

## Status sources

- n8n, Prometheus, Loki and Alloy use their scrape target `up` values.
- Grafana, File Browser and MinIO use internal Blackbox Exporter probes.
- Nginx Proxy Manager currently has no status query and is intentionally `unknown`.

An unavailable external management URL does not automatically mark a service down unless the
catalog also defines a matching status query.

## Actions

`Open service` launches the service in a new tab with `noopener`/`noreferrer` behavior. Internal
services without a public management URL display `Internal only` and are not clickable.

# Overview

## Purpose

The Overview page is the landing page for daily home-server checks. It summarizes resource
usage, service availability and links to the tools used for detailed operations. It never
starts, stops or restarts a container.

## Sections

### Infrastructure metrics

| Card | Prometheus source | Meaning |
| --- | --- | --- |
| CPU usage | `node_cpu_seconds_total` idle rate | Five-minute average non-idle CPU percentage |
| Memory usage | `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes` | Percentage of memory currently unavailable |
| Disk usage | root `node_filesystem_avail_bytes`, `node_filesystem_size_bytes` | Used percentage of the root filesystem |

An em dash means Prometheus returned no usable sample. It does not mean zero usage.

### Service health

- `healthy`: the configured Prometheus query returned samples and all values were `1`.
- `down`: at least one returned value was not `1`.
- `unknown`: no query exists, Prometheus was unavailable, or no sample was returned.

The card reports explicit counts instead of treating `unknown` as an outage. The Services page
shows which services belong to each state.

### Core services

The quick-access cards link to n8n, Grafana, File Browser and MinIO. Each link opens the owning
tool in a new tab. Mano Admin does not reproduce their detailed management functions.

## Failure behavior

Prometheus requests have a three-second timeout. A monitoring failure leaves the portal usable
and changes affected values to `unknown`. A database outage makes `/api/health` return `503` and
the container healthcheck fail.

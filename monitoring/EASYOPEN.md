# EasyOpen public service monitoring

## Scope

Reuse the home-server Grafana 12.1, Prometheus 3.5, Blackbox Exporter 0.27.
No frontend container or additional public port is needed.

| Target | Validation |
| --- | --- |
| https://easy-open.mano.io.kr/ | HTTPS, HTTP 200, EasyOpen body |
| https://easy-open.mano.io.kr/download/ | HTTPS, HTTP 200, EasyOpen body |
| https://easy-open.mano.io.kr/sitemap.xml | HTTPS, HTTP 200, urlset and site URL |
| https://easyopen-api.mano.io.kr/api/health | HTTPS, HTTP 200, service name and database=true |

Checks run every 5 minutes with a 10-second probe budget.
Redirects, invalid TLS, wrong body and non-200 statuses fail.
This checks public reachability from the home server, not browser workflows.

## Dedicated Slack prerequisite (operator)

1. Create Slack workspace/channel and an Incoming Webhook for that channel.
2. Doppler project mano, config prd: save SLACK_EASYOPEN_WEBHOOK_URL.
   Do not paste the URL into chat, commit it, or put it in public build variables.
3. Compose requires this value and forwards it only to Grafana.
   A missing value stops validation rather than sending to a different project.
4. EasyOpen events use contact point Slack EasyOpen and alert_scope=easyopen.
   Existing Alcove/Tono/shared infrastructure notification receivers stay unchanged.
   Home-server resource alerts continue to their existing destinations.

## Deployment

Do not run deployment commands until explicitly approved for production.
A master push of these monitoring/Compose/script changes triggers the existing
Home server Validate/Deploy workflow for ellie-server. It reconciles the
whole Compose stack, reloads Blackbox and Prometheus and restarts Grafana when changed.
It is not a frontend-only deployment. No manual external Grafana save is needed
for file-provisioned rules.

The secret must exist before deploying. Missing/incorrect webhook settings require
operator correction in Doppler and Grafana recreation, never printing the value.

## Operator verification after deployment

1. Actions: Home server workflow must succeed.
2. Grafana > Dashboards > Services > EasyOpen Public Availability:
   four endpoint results = UP, HTTP = 200, certificate days populated.
   First collection may take 5 minutes.
3. Grafana > Alerts & IRM > Alert rules > EasyOpen:
   five enabled rules, normal states after metrics arrive.
4. Contact points > Slack EasyOpen > Test: operator sends test and confirms
   receipt in the new workspace/channel. No live Slack test is sent by QA scripts.
5. A real failure lasting 10 minutes triggers an endpoint alert; recovery sends
   a resolved notification. Normal collection may add up to one scrape interval.
6. Missing target/collector/certificate metrics have dedicated 10-minute checks.
   Certificate expiry threshold is strictly less than 14 days, pending 5 minutes.

No-data or collector outages are not displayed as a successful endpoint.
Do not cause an actual production outage for a test: use isolated QA or an
operator-managed temporary test rule.

## Local checks

Python with PyYAML 6.x, Docker:
```sh
python scripts/validate-config.py
python scripts/test-easyopen-monitoring.py
python scripts/verify-easyopen-alert-expressions.py
python scripts/verify-easyopen-monitoring-runtime.py
bash -n scripts/deploy-home-server.sh
```

The runtime check starts temporary loopback-only Blackbox and Grafana containers,
uses dummy local notification endpoints, disables Grafana alert evaluation,
probes the public GET endpoints and removes its own containers.
It never reads production secrets or tests live Slack.

## Rollback and limitations

If incorrect notifications occur, operator pauses the EasyOpen rules in the
provisioning source and deploys that change. UI edits to provisioned rules may
be unavailable or overwritten on restart. Keep other projects' rules intact.
Revert only the EasyOpen monitoring changes to restore the previous configuration;
never delete Grafana/Prometheus data volumes.

A home-server power/network outage also stops monitoring and notification delivery.
External monitoring is required for that failure mode. No proprietary SaaS
subscription is added; existing compute/network and Slack account limits apply.

## Atomic deployment configuration mounts

Prometheus and Blackbox mount their configuration directories read-only.
Do not replace them with individual file bind mounts: rsync atomic file replacement
can leave a running container bound to the old inode even after SIGHUP.
The Compose mount-definition change recreates these two services on the next
approved deployment, preserving named metric storage. CI runs
scripts/verify-monitoring-config-mounts.py to reproduce atomic replacement.

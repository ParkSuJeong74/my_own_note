#!/usr/bin/env python3
"""Offline config regression tests. No production credentials or notifications."""
import json,unittest
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[1]
load=lambda name:yaml.safe_load((ROOT/name).read_text())
class MonitoringTests(unittest.TestCase):
 def setUp(self):
  self.prom=load("monitoring/prometheus/prometheus.yml")
  self.jobs=[j for j in self.prom["scrape_configs"] if j["job_name"].startswith("easyopen-public-")]
  self.rules=load("monitoring/grafana/provisioning/alerting/easyopen-rules.yml")["groups"][0]["rules"]
 def test_config_mounts_survive_atomic_deployment_replacement(self):
  compose=yaml.load((ROOT/"docker-compose.yml").read_text(),Loader=yaml.BaseLoader)
  self.assertIn("./monitoring/prometheus:/etc/prometheus:ro",compose["services"]["prometheus"]["volumes"])
  self.assertIn("./monitoring/blackbox:/etc/blackbox_exporter:ro",compose["services"]["blackbox-exporter"]["volumes"])
 def test_exact_public_targets(self):
  targets={url for j in self.jobs for group in j["static_configs"] for url in group["targets"]}
  self.assertEqual(targets,{"https://easy-open.mano.io.kr/","https://easy-open.mano.io.kr/download/","https://easy-open.mano.io.kr/sitemap.xml","https://easyopen-api.mano.io.kr/api/health"})
 def test_scrape_budget_and_internal_exporter(self):
  for job in self.jobs:
   self.assertEqual(job["scrape_interval"],"5m")
   self.assertEqual(job["scrape_timeout"],"15s")
   self.assertEqual(job["relabel_configs"][-1]["replacement"],"blackbox-exporter:9115")
   for group in job["static_configs"]:self.assertEqual(group["labels"]["project"],"easyopen")
 def test_modules_reject_redirects_invalid_tls_and_wrong_body(self):
  modules=load("monitoring/blackbox/config.yml")["modules"]
  for job in self.jobs:
   module=modules[job["params"]["module"][0]]
   self.assertEqual(module["timeout"],"10s")
   http=module["http"]
   self.assertEqual(http["valid_status_codes"],[200])
   self.assertFalse(http["follow_redirects"])
   self.assertTrue(http["fail_if_not_ssl"])
   self.assertTrue(http["fail_if_body_not_matches_regexp"])
   self.assertFalse(http.get("tls_config",{}).get("insecure_skip_verify",False))
 def test_notification_activation_is_explicit(self):
  self.assertEqual(len(self.rules),5)
  for rule in self.rules:
   self.assertFalse(rule["isPaused"])
   self.assertEqual(rule["labels"]["alert_scope"],"easyopen")
   self.assertEqual(rule["execErrState"],"Alerting")
 def test_missing_and_certificate_boundaries(self):
  byid={r["uid"]:r for r in self.rules}
  self.assertIn("or vector(0)",byid["easyopen-probe-missing"]["data"][0]["model"]["expr"])
  cert=byid["easyopen-cert-expiring"]
  self.assertEqual(cert["data"][1]["model"]["conditions"][0]["evaluator"],{"type":"lt","params":[14]})
  self.assertEqual(byid["easyopen-public-down"]["for"],"10m")
 def test_dashboard_queries_real_metrics(self):
  dash=json.loads((ROOT/"monitoring/grafana/dashboards/easyopen-public.json").read_text())
  self.assertEqual(len(dash["panels"]),6)
  for panel in dash["panels"]:
   self.assertEqual(panel["datasource"]["uid"],"prometheus")
   self.assertEqual(panel["fieldConfig"]["defaults"]["noValue"],"NO DATA")
 def test_blackbox_configuration_is_reloaded_on_deploy(self):
  script=(ROOT/"scripts/deploy-home-server.sh").read_text()
  self.assertIn("changed blackbox monitoring/blackbox",script)
  self.assertIn("docker kill --signal=SIGHUP blackbox-exporter",script)
 def test_existing_project_notifications_unchanged(self):
  content=(ROOT/"monitoring/tests/contact-points-before-easyopen.yml").read_text()
  
  # Preserve all existing receivers/routes; add only the dedicated EasyOpen path.
  old=yaml.load(content,Loader=yaml.BaseLoader)
  new=yaml.load((ROOT/"monitoring/grafana/provisioning/alerting/contact-points.yml").read_text(),Loader=yaml.BaseLoader)
  self.assertEqual([c for c in new["contactPoints"] if c["name"]!="Slack EasyOpen"],old["contactPoints"])
  policy=new["policies"][0]
  easy=[route for route in policy["routes"] if route["receiver"]=="Slack EasyOpen"]
  self.assertEqual(len(easy),1)
  self.assertEqual(easy[0]["object_matchers"],[["alert_scope","=","easyopen"]])
  policy["routes"]=[route for route in policy["routes"] if route["receiver"]!="Slack EasyOpen"]
  self.assertEqual(new["policies"],old["policies"])
  contact=next(c for c in new["contactPoints"] if c["name"]=="Slack EasyOpen")
  self.assertEqual(contact["receivers"][0]["settings"]["url"],"$SLACK_EASYOPEN_WEBHOOK_URL")
  self.assertEqual(contact["receivers"][0]["disableResolveMessage"],"false")

if __name__=="__main__":unittest.main()

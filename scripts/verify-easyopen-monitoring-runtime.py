#!/usr/bin/env python3
"""Temporary local Grafana/Blackbox QA. Never loads production env or sends Slack."""
import base64,json,os,shutil,subprocess,tempfile,time,urllib.parse,urllib.request,uuid
from pathlib import Path
root=Path(__file__).resolve().parents[1]
docker=os.environ.get("DOCKER","docker")
def run(*args):return subprocess.check_output([docker,*args],text=True).strip()
ids=[]
try:
 # Only public endpoints and test fixtures; no cookies/credentials on probes.
 cid=run("run","-d","-p","127.0.0.1::9115","-v",str(root/"monitoring/blackbox/config.yml")+":/config.yml:ro","prom/blackbox-exporter:v0.27.0","--config.file=/config.yml")
 ids.append(cid)
 port=run("port",cid,"9115/tcp").split(":")[-1]
 base="http://127.0.0.1:"+port
 def get(url,headers=None):
  return urllib.request.urlopen(urllib.request.Request(url,headers=headers or {}),timeout=20).read().decode()
 def wait(url,headers=None):
  for _ in range(60):
   try:return get(url,headers)
   except Exception:time.sleep(0.5)
  raise RuntimeError("Test service did not start")
 wait(base+"/-/healthy")
 targets=[("https://easy-open.mano.io.kr/","easyopen_web"),("https://easy-open.mano.io.kr/download/","easyopen_web"),("https://easy-open.mano.io.kr/sitemap.xml","easyopen_sitemap"),("https://easyopen-api.mano.io.kr/api/health","easyopen_api"),("http://example.com/","easyopen_web")]
 for url,module in targets:
  text=get(base+"/probe?"+urllib.parse.urlencode({"target":url,"module":module}))
  metrics={line.split()[0]:line.split()[1] for line in text.splitlines() if line and not line.startswith("#") and len(line.split())==2}
  print("Probe",url,"success="+metrics.get("probe_success","missing"),"http="+metrics.get("probe_http_status_code","missing"))
  if not url.startswith("http:"):
   # A WAF rejection is a real failed public check, not a reason to bypass TLS.
   assert metrics.get("probe_success")=="1","Public endpoint failed: "+url
  else:assert metrics.get("probe_success")=="0","Plain HTTP must not pass"
 run("kill","--signal=SIGHUP",cid)
 assert "probe_success 1" in get(base+"/probe?"+urllib.parse.urlencode({"target":targets[0][0],"module":"easyopen_web"}))
 print("Blackbox reload passed")
 with tempfile.TemporaryDirectory(prefix="easyopen-grafana-") as tmp:
  p=Path(tmp)
  for sub in ["alerting","datasources","dashboards"]: (p/sub).mkdir()
  shutil.copy(root/"monitoring/grafana/provisioning/alerting/easyopen-rules.yml",p/"alerting/easyopen-rules.yml")
  shutil.copy(root/"monitoring/grafana/provisioning/alerting/contact-points.yml",p/"alerting/contact-points.yml")
  (p/"datasources/test.yml").write_text('apiVersion: 1\ndatasources:\n  - name: Prometheus\n    uid: prometheus\n    type: prometheus\n    url: http://127.0.0.1:9\n')
  name="easyopen-monitoring-qa-"+uuid.uuid4().hex[:8]
  password=uuid.uuid4().hex
  cid=run("run","-d","--name",name,"-p","127.0.0.1::3000","-v",tmp+":/etc/grafana/provisioning:ro",
   "-e","GF_SECURITY_ADMIN_PASSWORD="+password,"-e","GF_ANALYTICS_REPORTING_ENABLED=false","-e","GF_ANALYTICS_CHECK_FOR_UPDATES=false","-e","GF_ANALYTICS_CHECK_FOR_PLUGIN_UPDATES=false","-e","GF_UNIFIED_ALERTING_EXECUTE_ALERTS=false",
   "-e","SLACK_ALCOVE_WEBHOOK_URL=http://127.0.0.1:9/alcove","-e","SLACK_EASYOPEN_WEBHOOK_URL=http://127.0.0.1:9/easyopen","-e","DISCORD_TONO_WEBHOOK_URL=http://127.0.0.1:9/tono","grafana/grafana:12.1.0")
  ids.append(cid)
  port=run("port",cid,"3000/tcp").split(":")[-1]
  base="http://127.0.0.1:"+port
  wait(base+"/api/health")
  headers={"Authorization":"Basic "+base64.b64encode(("admin:"+password).encode()).decode()}
  for _ in range(60):
   rules=json.loads(get(base+"/api/v1/provisioning/alert-rules",headers))
   if len(rules)==5:break
   time.sleep(0.5)
  print("Grafana provisioned rules:",len(rules),"paused:",[r.get("isPaused") for r in rules])
  assert len(rules)==5 and all(not r["isPaused"] for r in rules)
  policy=json.loads(get(base+"/api/v1/provisioning/policies",headers))
  routes=[r for r in policy["routes"] if r["receiver"]=="Slack EasyOpen"]
  assert len(routes)==1
  print("Grafana 12.1: 5 active rules and isolated Slack EasyOpen policy provisioned; alert evaluation disabled for QA")
finally:
 for cid in reversed(ids):run("rm","-f",cid)

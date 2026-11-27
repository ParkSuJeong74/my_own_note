#!/usr/bin/env python3
"""Test real Grafana expressions with isolated promtool; never sends notifications."""
import os,subprocess,tempfile
from pathlib import Path
import yaml
root=Path(__file__).resolve().parents[1]
rules=yaml.safe_load((root/"monitoring/grafana/provisioning/alerting/easyopen-rules.yml").read_text())["groups"][0]["rules"]
generated=[]
for r in rules:
 ev=r["data"][1]["model"]["conditions"][0]["evaluator"]
 op={"gt":">","lt":"<"}[ev["type"]]
 generated.append({"alert":r["uid"],"expr":"("+r["data"][0]["model"]["expr"]+") "+op+" "+str(ev["params"][0]),"for":r["for"],"labels":r["labels"]})
endpoints=[("https://easy-open.mano.io.kr/","web-home","web"),("https://easy-open.mano.io.kr/download/","web-download","web"),("https://easy-open.mano.io.kr/sitemap.xml","web-sitemap","sitemap"),("https://easyopen-api.mano.io.kr/api/health","api","api")]
def inputs(count=4,first="1+0x30",days=30,collector="1+0x30"):
 result=[]
 for i,(url,service,suffix) in enumerate(endpoints[:count]):
  labels='project="easyopen",instance="'+url+'",service="'+service+'",job="easyopen-public-'+suffix+'"'
  for metric,values in [("probe_success",first if i==0 else "1+0x30"),("up",collector if i==0 else "1+0x30"),("probe_ssl_earliest_cert_expiry",str(days*86400+600)+"+0x30")]:
   result.append({"series":metric+"{"+labels+"}","values":values})
 return result
def expected(uid,indices=None):
 rule=next(r for r in rules if r["uid"]==uid)
 result=[]
 for i in indices if indices is not None else [None]:
  labels=dict(rule["labels"])
  if i is not None:
   url,service,suffix=endpoints[i]
   labels.update(instance=url,service=service,job="easyopen-public-"+suffix)
  result.append({"exp_labels":labels,"exp_annotations":{}})
 return result
tests=[]
def case(name,data,uid,exp,at="10m"):
 tests.append({"name":name,"interval":"1m","input_series":data,"alert_rule_test":[{"eval_time":at,"alertname":uid,"exp_alerts":exp}]})
case("healthy",inputs(),"easyopen-public-down",[])
case("pending before ten minutes",inputs(first="0+0x30"),"easyopen-public-down",[],"9m")
case("failed ten minutes",inputs(first="0+0x30"),"easyopen-public-down",expected("easyopen-public-down",[0]))
case("recovery",inputs(first="0+0x10 1+0x20"),"easyopen-public-down",[],"15m")
case("one target missing",inputs(count=3),"easyopen-probe-missing",expected("easyopen-probe-missing"))
case("all metrics missing",[],"easyopen-probe-missing",expected("easyopen-probe-missing"))
case("all targets present",inputs(),"easyopen-probe-missing",[])
case("collector down",inputs(collector="0+0x30"),"easyopen-probe-scrape-down",expected("easyopen-probe-scrape-down",[0]))
case("certificate expires soon",inputs(days=13),"easyopen-cert-expiring",expected("easyopen-cert-expiring",range(4)))
case("exactly fourteen days",inputs(days=14),"easyopen-cert-expiring",[])
case("certificate metrics absent",[s for s in inputs() if not s["series"].startswith("probe_ssl")],"easyopen-cert-data-missing",expected("easyopen-cert-data-missing"))
with tempfile.TemporaryDirectory(prefix="easyopen-promtool-") as tmp:
 p=Path(tmp)
 (p/"rules.yml").write_text(yaml.safe_dump({"groups":[{"name":"easyopen","rules":generated}]}))
 (p/"tests.yml").write_text(yaml.safe_dump({"rule_files":["rules.yml"],"evaluation_interval":"1m","tests":tests}))
 # The container's non-root user must be able to traverse the bind mount
 # and read both generated fixtures, even with a restrictive host umask.
 for fixture in (p/"rules.yml",p/"tests.yml"):
  fixture.chmod(0o644)
 p.chmod(0o755)
 subprocess.run([os.environ.get("DOCKER","docker"),"run","--rm","--network","none","--entrypoint","promtool","-v",tmp+":/qa:ro","-w","/qa","prom/prometheus:v3.5.0","test","rules","tests.yml"],check=True)
 print(str(len(tests))+" alert scenarios passed")

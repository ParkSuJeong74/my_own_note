#!/usr/bin/env python3
"""Check that Docker sees atomically replaced configuration through directory mounts."""
import os,subprocess,tempfile
from pathlib import Path
import yaml
root=Path(__file__).resolve().parents[1]
compose=yaml.load((root/"docker-compose.yml").read_text(),Loader=yaml.BaseLoader)
docker=os.environ.get("DOCKER","docker")
def run(*args):return subprocess.check_output([docker,*args],text=True).strip()
for service,filename,destination in [
 ("prometheus","prometheus.yml","/etc/prometheus"),
 ("blackbox-exporter","config.yml","/etc/blackbox_exporter"),
]:
 mount=next(v for v in compose["services"][service]["volumes"] if v.endswith(":"+destination+":ro"))
 assert Path(mount.split(":")[0]).suffix=="","Configuration must mount its parent directory"
 with tempfile.TemporaryDirectory(prefix="easyopen-mount-qa-") as tmp:
  directory=Path(tmp);directory.chmod(0o755)
  config=directory/filename;config.write_text("before");config.chmod(0o644)
  cid=run("run","-d","--network","none","--entrypoint","/bin/sh","-v",tmp+":"+destination+":ro","prom/prometheus:v3.5.0","-c","sleep 60")
  try:
   assert run("exec",cid,"cat",destination+"/"+filename)=="before"
   replacement=directory/(filename+".new")
   replacement.write_text("after");replacement.chmod(0o644)
   os.replace(replacement,config)
   assert run("exec",cid,"cat",destination+"/"+filename)=="after"
   print(service+": atomic configuration replacement visible to non-root container")
  finally:run("rm","-f",cid)

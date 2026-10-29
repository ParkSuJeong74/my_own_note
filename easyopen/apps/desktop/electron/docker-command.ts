export function dockerCommand(platform=process.platform):string{
  if(platform==='win32')return 'docker.exe';
  if(platform==='darwin')return '/Applications/Docker.app/Contents/Resources/bin/docker';
  if(platform==='linux')return 'docker';
  throw new Error('지원하지 않는 운영체제입니다.');
}

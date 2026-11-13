const required=(name:string,env:NodeJS.ProcessEnv=process.env)=>{
  const value=env[name]?.trim();
  if(!value)throw new Error(`${name} is required`);
  return value;
};

export const PUBLIC_ORIGINS=['https://easy-open.mano.io.kr','https://easyopen-api.mano.io.kr','https://easyopen-api.mano.io.kr'] as const;

export function loadConfig(env:NodeJS.ProcessEnv=process.env){
  const apiOrigin=required('EASYOPEN_API_ORIGIN',env);
  const webOrigin=required('EASYOPEN_WEB_ORIGIN',env);
  const adminOrigin=required('EASYOPEN_ADMIN_ORIGIN',env);
  const origins=[webOrigin,apiOrigin,adminOrigin];
  for(const origin of origins){
    const url=new URL(origin);
    if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash)throw new Error('EasyOpen origins must be HTTPS origins');
  }
  if(origins.some((origin,index)=>origin!==PUBLIC_ORIGINS[index]))throw new Error('EasyOpen must use its dedicated product origins');
  return {
    apiOrigin,webOrigin,adminOrigin,
    googleClientId:required('EASYOPEN_GOOGLE_CLIENT_ID',env),
    googleClientSecret:required('EASYOPEN_GOOGLE_CLIENT_SECRET',env),
    sessionSecret:required('EASYOPEN_SESSION_SECRET',env),
    adminEmails:new Set(required('EASYOPEN_ADMIN_EMAILS',env).split(',').map(value=>value.trim().toLowerCase()).filter(Boolean)),
    billingProvider:env.EASYOPEN_BILLING_PROVIDER?.trim()||null,
  };
}

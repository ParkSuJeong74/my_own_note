export function databaseConfig(env:NodeJS.ProcessEnv=process.env){
 const required=(name:string)=>{const value=env[name];if(!value?.trim())throw new Error(name+' is required');return value;};
 const portText=env.PGPORT??'5432';
 if(!/^\d+$/.test(portText)||Number(portText)<1||Number(portText)>65535)throw new Error('PGPORT must be an integer between 1 and 65535');
 return {host:required('PGHOST'),port:Number(portText),username:required('PGUSER'),password:required('PGPASSWORD'),database:required('PGDATABASE')};
}

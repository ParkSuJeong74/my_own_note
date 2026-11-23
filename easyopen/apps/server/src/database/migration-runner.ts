import {MigrationExecutor,type DataSource} from 'typeorm';
export async function applyMigrations(source:DataSource,statementTimeoutMs=60000){
 if(!Number.isSafeInteger(statementTimeoutMs)||statementTimeoutMs<1)throw new Error('Invalid migration statement timeout');
 const runner=source.createQueryRunner();
 try{
  await runner.connect();
  await runner.query("SELECT set_config('statement_timeout',$1,false)",[statementTimeoutMs+'ms']);
  await runner.query('SELECT pg_advisory_lock(1795392000)');
  const executor=new MigrationExecutor(source,runner);
  executor.transaction='all';
  return await executor.executePendingMigrations();
 }finally{
  await runner.query('SELECT pg_advisory_unlock(1795392000)').catch(()=>{});
  await runner.query('RESET statement_timeout').catch(()=>{});
  await runner.release();
 }
}

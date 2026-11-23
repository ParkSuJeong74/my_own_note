import {dataSource} from './data-source.js';
await dataSource.initialize();
const lock=dataSource.createQueryRunner();
try{
 await lock.connect();
 await lock.query("SET statement_timeout='60s'");
 await lock.query('SELECT pg_advisory_lock(1795392000)');
 const completed=await dataSource.runMigrations({transaction:'all'});
 console.log('EasyOpen migrations applied: '+completed.length);
}finally{
 await lock.query('SELECT pg_advisory_unlock(1795392000)').catch(()=>{});
 await lock.release();await dataSource.destroy();
}

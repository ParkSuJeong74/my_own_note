import {dataSource} from './data-source.js';
import {applyMigrations} from './migration-runner.js';
await dataSource.initialize();
try{
 const completed=await applyMigrations(dataSource);
 console.log('EasyOpen migrations applied: '+completed.length);
}finally{await dataSource.destroy();}

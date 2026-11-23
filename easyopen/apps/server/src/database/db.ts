import {dataSource} from './data-source.js';
// QueryRunner keeps explicit PostgreSQL row locks on one TypeORM transaction.
export const db={
 async query(sql:string,values:unknown[]=[]){const runner=dataSource.createQueryRunner();try{const r=await runner.query(sql,values,true);return {rows:r.records,rowCount:r.affected??r.records.length};}finally{await runner.release();}},
 async connect(){const runner=dataSource.createQueryRunner();await runner.connect();return {async query(sql:string,values:unknown[]=[]){if(sql==='BEGIN'){await runner.startTransaction();return {rows:[],rowCount:0};}if(sql==='COMMIT'){await runner.commitTransaction();return {rows:[],rowCount:0};}if(sql==='ROLLBACK'){await runner.rollbackTransaction();return {rows:[],rowCount:0};}const r=await runner.query(sql,values,true);return {rows:r.records,rowCount:r.affected??r.records.length};},release:()=>runner.release()};}
};

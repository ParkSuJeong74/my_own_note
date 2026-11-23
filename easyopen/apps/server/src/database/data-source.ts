import 'reflect-metadata';
import {DataSource} from 'typeorm';
import {entities} from './entities.js';
import {InitialSchema1795392000000} from './migrations/InitialSchema1795392000000.js';
import {DeviceSessions1795392000001} from './migrations/DeviceSessions1795392000001.js';
export const dataSource=new DataSource({type:'postgres',host:process.env.PGHOST,port:Number(process.env.PGPORT||5432),username:process.env.PGUSER,password:process.env.PGPASSWORD,database:process.env.PGDATABASE,entities,migrations:[InitialSchema1795392000000,DeviceSessions1795392000001],migrationsTableName:'easyopen_migrations',synchronize:false,migrationsRun:false,logging:false,extra:{max:5,connectionTimeoutMillis:5000}});

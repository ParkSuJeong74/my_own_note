import 'reflect-metadata';
import {DataSource} from 'typeorm';
import {databaseConfig} from './config.js';
import {entities} from './entities.js';
import {InitialSchema1795392000000} from './migrations/InitialSchema1795392000000.js';
import {DeviceSessions1795392000001} from './migrations/DeviceSessions1795392000001.js';
export const dataSource=new DataSource({type:'postgres',...databaseConfig(),entities,migrations:[InitialSchema1795392000000,DeviceSessions1795392000001],migrationsTableName:'easyopen_migrations',synchronize:false,migrationsRun:false,logging:false,extra:{max:5,connectionTimeoutMillis:5000}});

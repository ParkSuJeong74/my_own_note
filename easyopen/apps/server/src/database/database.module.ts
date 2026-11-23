import {Global,Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {dataSource} from './data-source.js';
@Global()
@Module({imports:[TypeOrmModule.forRootAsync({useFactory:()=>dataSource.options,dataSourceFactory:async()=>dataSource.isInitialized?dataSource:dataSource.initialize()})],exports:[TypeOrmModule]})
export class DatabaseModule{}

import {Controller,Get,Res,Inject} from '@nestjs/common';
import {DataSource} from 'typeorm';
import type {Response} from 'express';
@Controller('api')
export class HealthController{
 constructor(@Inject(DataSource) private readonly source:DataSource){}
 @Get('health') async health(@Res() response:Response){let database=false;try{const rows=await this.source.query("SELECT count(*)::int AS count FROM easyopen_migrations WHERE name=ANY($1)",[['InitialSchema1795392000000','DeviceSessions1795392000001']]);await this.source.query('SELECT 1 FROM easyopen_device_requests LIMIT 1');database=rows[0].count===2;}catch{}return response.status(database?200:503).json({service:'easyopen-account-api',database});}
}

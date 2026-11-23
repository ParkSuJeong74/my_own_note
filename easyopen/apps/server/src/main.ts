import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {Catch,HttpException} from '@nestjs/common';
import type {ExceptionFilter,ArgumentsHost} from '@nestjs/common';
import type {Response} from 'express';
import express from 'express';
import cookieParser from 'cookie-parser';
import {AppModule} from './app.module.js';
@Catch()
class SafeErrors implements ExceptionFilter{
 catch(error:unknown,host:ArgumentsHost){const response=host.switchToHttp().getResponse<Response>();const status=error instanceof HttpException?error.getStatus():500;response.status(status).json({error:status===500?'internal_server_error':'invalid_request'});}
}
const app=await NestFactory.create(AppModule,{bodyParser:false,logger:['error','warn']});
app.getHttpAdapter().getInstance().disable('x-powered-by');
app.use(express.json({limit:'16kb'}));app.use(express.urlencoded({extended:false,limit:'16kb'}));app.use(cookieParser());
app.use((_request:unknown,response:Response,next:()=>void)=>{response.setHeader('cache-control','private, no-store');next();});
app.useGlobalFilters(new SafeErrors());app.enableShutdownHooks();
await app.listen(Number(process.env.PORT||3001),process.env.HOSTNAME||'0.0.0.0');

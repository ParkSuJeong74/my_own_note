import {Module} from '@nestjs/common';
import {AccountStoreModule} from '../accounts/account-store.module.js';
import {AuthService} from './auth.service.js';
import {AuthController} from './auth.controller.js';
@Module({imports:[AccountStoreModule],providers:[AuthService],controllers:[AuthController],exports:[AuthService]})
export class AuthModule{}

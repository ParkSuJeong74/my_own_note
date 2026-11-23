import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module.js';
import {AccountStoreModule} from './account-store.module.js';
import {AccountController} from './account.controller.js';
@Module({imports:[AuthModule,AccountStoreModule],controllers:[AccountController]})
export class AccountModule{}

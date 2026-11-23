import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module.js';
import {AccountStoreModule} from '../accounts/account-store.module.js';
import {DeviceController} from './device.controller.js';
@Module({imports:[AuthModule,AccountStoreModule],controllers:[DeviceController]})
export class DeviceModule{}

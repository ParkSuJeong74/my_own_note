import {Module} from '@nestjs/common';
import {DatabaseModule} from './database/database.module.js';
import {AccountModule} from './accounts/account.module.js';
import {AuthModule} from './auth/auth.module.js';
import {DeviceModule} from './device/device.module.js';
import {BillingModule} from './billing/billing.module.js';
import {HealthController} from './health.controller.js';
@Module({imports:[DatabaseModule,AuthModule,AccountModule,DeviceModule,BillingModule],controllers:[HealthController]})
export class AppModule{}

import { VaultConfigService } from './vault-client';
import { VaultSecretInterface } from './config.types';

export class CoreConfigService {
  private vaultService: VaultConfigService;
  private secretsCache: Map<string, VaultSecretInterface> = new Map();
  private cacheTimeout = 5 * 60 * 1000;

  constructor() {
    this.vaultService = new VaultConfigService();
  }

  async getAppConfig(appName: string): Promise<VaultSecretInterface> {
    const cacheKey = `app-${appName}`;

    const cachedSecrets = this.secretsCache.get(cacheKey);
    if (cachedSecrets) {
      return cachedSecrets;
    }

    const secrets = await this.vaultService.getSecrets();
    this.secretsCache.set(cacheKey, secrets);
    setTimeout(() => {
      this.secretsCache.delete(cacheKey);
    }, this.cacheTimeout);

    return secrets;
  }
}

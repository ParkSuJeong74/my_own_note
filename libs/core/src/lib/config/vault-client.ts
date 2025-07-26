import { VaultSecretInterface, VaultConfigInterface } from './config.type';
import vault from 'node-vault';

export class VaultConfigService {
  private vaultClient: vault.client;
  private vaultConfig: VaultConfigInterface;

  constructor(config?: Partial<VaultConfigInterface>) {
    this.vaultConfig = {
      endpoint: process.env['VAULT_ADDR'] || '',
      token: process.env['VAULT_TOKEN'] || '',
      mount: 'secret',
      name: process.env['VAULT_NAME'],
      ...config,
    };

    this.vaultClient = vault({
      endpoint: this.vaultConfig.endpoint,
      token: this.vaultConfig.token,
    });
  }

  async getSecrets(): Promise<VaultSecretInterface> {
    try {
      const response = await this.vaultClient.read(
        `${this.vaultConfig.mount}/data/${this.vaultConfig.name}`
      );

      return response.data.data || response.data;
    } catch (error) {
      throw new Error(`Failed to get secrets : ${error}`);
    }
  }
}

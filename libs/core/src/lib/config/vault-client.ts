import vault from 'node-vault';
import { VaultConfigInterface, VaultSecretInterface } from './config.type';

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
      requestOptions: {
        rejectUnauthorized: false,
        timeout: 5000,
        strictSSL: false,
      },
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

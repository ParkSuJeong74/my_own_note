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

    console.log('Vault Config:', {
      endpoint: this.vaultConfig.endpoint,
      token: this.vaultConfig.token ? '***masked***' : 'undefined',
      mount: this.vaultConfig.mount,
      name: this.vaultConfig.name
    });

    this.vaultClient = vault({
      endpoint: this.vaultConfig.endpoint,
      token: this.vaultConfig.token,
      // 모든 SSL/TLS 검증 비활성화
      requestOptions: {
        rejectUnauthorized: false,
        timeout: 5000
      },
      // HTTP 강제 사용
      noHttps: true
    });
  }

  async getSecrets(): Promise<VaultSecretInterface> {
    try {
      console.log(`Attempting to read: ${this.vaultConfig.mount}/data/${this.vaultConfig.name}`);
      
      const response = await this.vaultClient.read(
        `${this.vaultConfig.mount}/data/${this.vaultConfig.name}`
      );

      console.log('Vault response received successfully');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Vault connection error:', error);
      throw new Error(`Failed to get secrets : ${error}`);
    }
  }
}

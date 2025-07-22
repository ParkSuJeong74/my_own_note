import { ConfigServiceInterface, VaultSecretInterface, VaultConfigInterface } from './config.types';
import vault from 'node-vault';

export class VaultConfigService implements ConfigServiceInterface {
  private vaultClient: vault.client;
  private vaultConfig: VaultConfigInterface;

  constructor(config?: Partial<VaultConfigInterface>) {
    this.vaultConfig = {
      endpoint: process.env['VAULT_ADDR'] || 'http://localhost:8200',
      token: process.env['VAULT_TOKEN'] || '',
      mount: 'secret',
      name:
        process.env['NODE_ENV'] === 'production'
          ? 'my_own_note_prd'
          : process.env['NODE_ENV'] === 'development'
          ? 'my_own_note_dev'
          : 'my_own_note_local',
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
        `${this.vaultConfig.mount}/${this.vaultConfig.mount}`
      );
      return response.data as VaultSecretInterface;
    } catch (error) {
      throw new Error(`Failed to get secrets : ${error}`);
    }
  }

  async loadSecretsToEnv(): Promise<void> {
    const secrets = await this.getSecrets();
    Object.entries(secrets).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }
}

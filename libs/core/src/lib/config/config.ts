import { ConfigSecretInterface } from './config.type';
import { VaultConfigService } from './vault-client';

export const getConfig = async (): Promise<ConfigSecretInterface> => {
  const vaultService = new VaultConfigService();
  const secrets = await vaultService.getSecrets();

  return {
    database: { host: secrets.DB_HOST },
    service: {
      web: { port: secrets.SERVICE_WEB_PORT },
      mobile: { port: secrets.SERVICE_MOBILE_PORT },
      desktop: { port: secrets.SERVICE_DESKTOP_PORT },
      api: { port: secrets.SERVICE_API_PORT },
    },
  };
};

import { ConfigSecretInterface, PublicConfigInterface } from './config.type';
import { VaultConfigService } from './vault-client';

export const getConfig = async (): Promise<ConfigSecretInterface> => {
  const vaultService = new VaultConfigService();
  const secrets = await vaultService.getSecrets();

  return {
    database: {
      postgres: {
        database: secrets.POSTGRES_DB,
        user: secrets.POSTGRES_USER,
        password: secrets.POSTGRES_PASSWORD,
      },
      mongo: {
        user: secrets.MONGO_ROOT_USER,
        password: secrets.MONGO_ROOT_PASSWORD,
      },
    },
    mq: {
      user: secrets.RABBITMQ_USER,
      password: secrets.RABBITMQ_PASSWORD,
      vhost: secrets.RABBITMQ_VHOST,
    },
    monitoring: {
      user: secrets.GRAFANA_ADMIN_USER,
      password: secrets.GRAFANA_ADMIN_PASSWORD,
    },
    storage: { user: secrets.MINIO_ROOT_USER, password: secrets.MINIO_ROOT_PASSWORD },
    service: {
      web: { port: secrets.SERVICE_WEB_PORT, url: secrets.SERVICE_WEB_URL },
      mobile: { port: secrets.SERVICE_MOBILE_PORT, url: secrets.SERVICE_MOBILE_URL },
      desktop: { port: secrets.SERVICE_DESKTOP_PORT, url: secrets.SERVICE_DESKTOP_URL },
      api: { port: secrets.SERVICE_API_PORT, url: secrets.SERVICE_API_URL },
    },
  };
};

export const getPublicConfig = async (): Promise<PublicConfigInterface> => {
  const fullConfig = await getConfig();

  return {
    service: fullConfig.service,
  };
};

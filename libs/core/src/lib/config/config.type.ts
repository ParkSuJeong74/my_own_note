export interface VaultConfigInterface {
  endpoint: string;
  token: string;
  mount?: string;
  name?: string;
}

export interface VaultSecretInterface {
  // database
  POSTGRES_DB: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  MONGO_ROOT_USER: string;
  MONGO_ROOT_PASSWORD: string;

  // storage
  MINIO_ROOT_USER: string;
  MINIO_ROOT_PASSWORD: string;

  // mq
  RABBITMQ_USER: string;
  RABBITMQ_PASSWORD: string;
  RABBITMQ_VHOST: string;

  // service
  SERVICE_WEB_PORT: number;
  SERVICE_API_PORT: number;
  SERVICE_DESKTOP_PORT: number;
  SERVICE_MOBILE_PORT: number;
  SERVICE_API_URL: string;
}

export interface ConfigSecretInterface {
  database: {
    postgres: { database: string; user: string; password: string };
    mongo: { user: string; password: string };
  };
  storage: { user: string; password: string };
  mq: { user: string; password: string; vhost: string };
  service: {
    web: { port: number };
    mobile: { port: number };
    desktop: { port: number };
    api: { port: number; url: string };
  };
}

export type PublicConfigInterface = Pick<ConfigSecretInterface, 'service'>;

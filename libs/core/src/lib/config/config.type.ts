export interface VaultConfigInterface {
  endpoint: string;
  token: string;
  mount?: string;
  name?: string;
}

export interface VaultSecretInterface {
  // database
  DB_HOST: string;

  // service
  SERVICE_WEB_PORT: number;
  SERVICE_API_PORT: number;
  SERVICE_DESKTOP_PORT: number;
  SERVICE_MOBILE_PORT: number;
  SERVICE_API_URL: string;
}

export interface ConfigSecretInterface {
  database: { host: string };
  service: {
    web: { port: number };
    mobile: { port: number };
    desktop: { port: number };
    api: { port: number; url: string };
  };
}

export type PublicConfigInterface = Pick<ConfigSecretInterface, 'service'>;

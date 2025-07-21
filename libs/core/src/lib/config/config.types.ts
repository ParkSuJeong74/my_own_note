export interface VaultConfigInterface {
  endpoint: string;
  token: string;
  mount?: string;
  name?: string;
}

export interface VaultSecretInterface {
  // database
  DB_HOST: string;
}

export interface ConfigSecretInterface {
  database: { host: string };
}

export interface ConfigServiceInterface {
  getSecrets(path: string): Promise<VaultSecretInterface>;
}

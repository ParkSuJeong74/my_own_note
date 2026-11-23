export type AccountState={status:'signed-out'|'pending'|'connected'|'error';email:string|null;entitlements:string[];userCode:string|null;message:string};
export type AccountStorage={ready():Promise<void>;get():Promise<string|null>;set(token:string):Promise<void>;clear():Promise<void>};
export class AccountClient{
  constructor(storage:AccountStorage,platform:'desktop'|'android'|'ios',fetcher?:typeof fetch);
  snapshot():AccountState;
  begin():Promise<AccountState>;
  check():Promise<AccountState>;
  logout():Promise<AccountState>;
}

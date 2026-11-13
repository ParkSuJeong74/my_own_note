export const ENTITLEMENTS=['commercial:jellyfin-plus','commercial:cosyvoice-studio'] as const;
export type EntitlementKey=typeof ENTITLEMENTS[number];
export function isEntitlementKey(value:string):value is EntitlementKey{return ENTITLEMENTS.includes(value as EntitlementKey);}
export function activeEntitlements(rows:{key:string;startsAt:Date;endsAt:Date|null;revokedAt:Date|null}[],now=new Date()){
  return rows.filter(row=>isEntitlementKey(row.key)&&!row.revokedAt&&row.startsAt<=now&&(!row.endsAt||row.endsAt>now)).map(row=>row.key);
}

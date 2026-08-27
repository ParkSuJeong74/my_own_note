import pg from "pg";

const globalDatabase = globalThis as typeof globalThis & { manoAdminPool?: pg.Pool };

export const db = globalDatabase.manoAdminPool ?? new pg.Pool({ max: 5 });

if (process.env.NODE_ENV !== "production") globalDatabase.manoAdminPool = db;

export async function isDatabaseReady(): Promise<boolean> {
  try {
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

import pg from 'pg';
const globalDb=globalThis as typeof globalThis&{easyOpenPool?:pg.Pool};
export const db=globalDb.easyOpenPool??new pg.Pool({max:5});
if(process.env.NODE_ENV!=='production')globalDb.easyOpenPool=db;
export async function databaseReady(){try{await db.query('SELECT 1');return true;}catch{return false;}}

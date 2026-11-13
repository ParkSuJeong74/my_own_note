import { NextResponse } from "next/server";
import { databaseReady } from "@/lib/db";
export async function GET() {
  const database = await databaseReady();
  return NextResponse.json(
    { service: "easyopen-account-api", database },
    { status: database ? 200 : 503 },
  );
}

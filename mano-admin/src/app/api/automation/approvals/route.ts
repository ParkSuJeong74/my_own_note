import { NextResponse } from "next/server";
import { listApprovals } from "@/lib/automation-repository";

export async function GET() {
  return NextResponse.json({ approvals: await listApprovals() });
}

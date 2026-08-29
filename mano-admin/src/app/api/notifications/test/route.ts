import { NextResponse } from "next/server";
import { ntfyConfigured, sendNtfyNotification } from "@/lib/ntfy";
import { recordAdminError } from "@/lib/admin-errors";

const destination = (result: string) => new NextResponse(null, { status: 303, headers: { Location: `/notifications?test=${encodeURIComponent(result)}` } });
export async function POST(request: Request) {
  if (!request.headers.get("x-mano-admin-user")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ntfyConfigured()) return destination("not-configured");
  try {
    await sendNtfyNotification({ title: "Mano 알림 테스트", message: "ntfy 알림이 정상적으로 연결되었습니다.", tags: ["white_check_mark"] });
    return destination("sent");
  } catch (error) {
    await recordAdminError("ntfy-test", error);
    return destination("failed");
  }
}

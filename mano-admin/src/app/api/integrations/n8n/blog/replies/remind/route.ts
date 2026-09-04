import { NextResponse } from "next/server";
import { n8nAuthorized } from "@/lib/internal-auth";
import { sendOverdueBlogReplyReminder } from "@/lib/blog-reply-reminder";

export async function POST(request:Request){if(!n8nAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401});return NextResponse.json(await sendOverdueBlogReplyReminder());}

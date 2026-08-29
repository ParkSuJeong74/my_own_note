"use server";
import {revalidatePath} from "next/cache";
import {resolveAdminError} from "@/lib/admin-errors";
export async function toggleAdminErrorResolvedAction(data:FormData){const id=String(data.get("id")??"");if(!id)return;await resolveAdminError(id,String(data.get("resolved"))==="true");revalidatePath("/errors");}

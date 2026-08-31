"use server";

import { revalidatePath } from "next/cache";
import { disconnectGoogleCalendar, pullGoogleCalendarChanges, retryGoogleCalendarSync } from "@/lib/google-calendar";

export async function retryGoogleCalendarAction() { await pullGoogleCalendarChanges(); await retryGoogleCalendarSync(); revalidatePath("/automation/integrations"); revalidatePath("/calendar"); revalidatePath("/"); }
export async function disconnectGoogleCalendarAction() { await disconnectGoogleCalendar(); revalidatePath("/automation/integrations"); revalidatePath("/calendar"); }

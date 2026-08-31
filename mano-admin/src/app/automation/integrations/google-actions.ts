"use server";

import { revalidatePath } from "next/cache";
import { disconnectGoogleCalendar, retryGoogleCalendarSync } from "@/lib/google-calendar";

export async function retryGoogleCalendarAction() { await retryGoogleCalendarSync(); revalidatePath("/automation/integrations"); revalidatePath("/calendar"); }
export async function disconnectGoogleCalendarAction() { await disconnectGoogleCalendar(); revalidatePath("/automation/integrations"); revalidatePath("/calendar"); }

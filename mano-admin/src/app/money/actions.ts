"use server";

import { revalidatePath } from "next/cache";
import { createMoneyAccount, deleteMoneyAccount, updateMoneyAccount } from "@/lib/automation-repository";

const value=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const type=(data:FormData)=>{const input=value(data,"accountType");return ["CASH","BANK","INVESTMENT","DEBT"].includes(input)?input:"CASH";};
const balance=(data:FormData)=>{const input=Number(value(data,"balance").replaceAll(",",""));return Number.isFinite(input)?Math.max(0,input):0;};
const refresh=()=>revalidatePath("/money");
export async function createMoneyAccountAction(data:FormData){const name=value(data,"name");if(!name)return;await createMoneyAccount({name,accountType:type(data),balance:balance(data),note:value(data,"note")});refresh();}
export async function updateMoneyAccountAction(data:FormData){const id=value(data,"id"),name=value(data,"name");if(!id||!name)return;await updateMoneyAccount(id,{name,accountType:type(data),balance:balance(data),note:value(data,"note")});refresh();}
export async function deleteMoneyAccountAction(data:FormData){const id=value(data,"id");if(!id)return;await deleteMoneyAccount(id);refresh();}

"use server";

import { revalidatePath } from "next/cache";
import { createMoneyAccount, createMoneyFixedExpense, deleteMoneyAccount, deleteMoneyFixedExpense, updateMoneyAccount, updateMoneyFixedExpense } from "@/lib/automation-repository";

const value=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const number=(data:FormData,name:string)=>{const input=Number(value(data,name).replaceAll(",",""));return Number.isFinite(input)?Math.max(0,input):0;};
const type=(data:FormData)=>["CASH","BANK","INVESTMENT","DEBT"].includes(value(data,"accountType"))?value(data,"accountType"):"BANK";
const status=(data:FormData)=>value(data,"status")==="ENDED"?"ENDED":"ACTIVE";
const date=(data:FormData)=>/^\d{4}-\d{2}-\d{2}$/.test(value(data,"maturityDate"))?value(data,"maturityDate"):null;
const day=(data:FormData)=>{const input=Number(value(data,"paymentDay"));return Number.isInteger(input)&&input>=1&&input<=31?input:null;};
const refresh=()=>revalidatePath("/money");
const account=(data:FormData)=>({name:value(data,"name"),accountType:type(data),status:status(data),bankName:value(data,"bankName"),balance:number(data,"balance"),monthlyAmount:number(data,"monthlyAmount"),interestRate:number(data,"interestRate"),note:value(data,"note"),maturityDate:date(data)});
export async function createMoneyAccountAction(data:FormData){const input=account(data);if(!input.name)return;await createMoneyAccount(input);refresh();}
export async function updateMoneyAccountAction(data:FormData){const id=value(data,"id"),input=account(data);if(!id||!input.name)return;await updateMoneyAccount(id,input);refresh();}
export async function deleteMoneyAccountAction(data:FormData){const id=value(data,"id");if(!id)return;await deleteMoneyAccount(id);refresh();}
const expense=(data:FormData)=>({name:value(data,"name"),amount:number(data,"amount"),paymentDay:day(data),note:value(data,"note")});
export async function createMoneyFixedExpenseAction(data:FormData){const input=expense(data);if(!input.name)return;await createMoneyFixedExpense(input);refresh();}
export async function updateMoneyFixedExpenseAction(data:FormData){const id=value(data,"id"),input=expense(data);if(!id||!input.name)return;await updateMoneyFixedExpense(id,input);refresh();}
export async function deleteMoneyFixedExpenseAction(data:FormData){const id=value(data,"id");if(!id)return;await deleteMoneyFixedExpense(id);refresh();}

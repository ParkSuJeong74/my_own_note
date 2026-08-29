"use server";
import {revalidatePath} from "next/cache";
import {createT1Match,deleteT1Game,deleteT1Match,syncT1FromLeaguepedia,updateT1Match,upsertT1Game} from "@/lib/t1-repository";
import {recordAdminError} from "@/lib/admin-errors";
import {ExternalProviderError} from "@/lib/external-http";
const value=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const number=(data:FormData,name:string,fallback=0)=>{const parsed=Number(value(data,name));return Number.isFinite(parsed)?parsed:fallback;};
const items=(data:FormData,name:string)=>value(data,name).split(/[,\n]/).map(item=>item.trim()).filter(Boolean);
const match=(data:FormData)=>({tournament:value(data,"tournament")||"LCK",opponent:value(data,"opponent"),scheduledAt:value(data,"scheduledAt"),bestOf:[1,3,5].includes(number(data,"bestOf"))?number(data,"bestOf"):3,status:["UPCOMING","LIVE","FINISHED"].includes(value(data,"status"))?value(data,"status") as "UPCOMING"|"LIVE"|"FINISHED":"UPCOMING" as const,t1Score:Math.max(0,number(data,"t1Score")),opponentScore:Math.max(0,number(data,"opponentScore")),sourceUrl:value(data,"sourceUrl")||"https://lolesports.com/en-GB/leagues/lck",note:value(data,"note")});
const refresh=()=>revalidatePath("/t1");
export async function createT1MatchAction(data:FormData){const input=match(data);if(!input.opponent||!input.scheduledAt)return;await createT1Match(input);refresh();}
export async function updateT1MatchAction(data:FormData){const id=value(data,"id"),input=match(data);if(!id||!input.opponent||!input.scheduledAt)return;await updateT1Match(id,input);refresh();}
export async function deleteT1MatchAction(data:FormData){const id=value(data,"id");if(id)await deleteT1Match(id);refresh();}
export async function saveT1GameAction(data:FormData){const matchId=value(data,"matchId"),gameNumber=number(data,"gameNumber");if(!matchId||gameNumber<1||gameNumber>5)return;await upsertT1Game({matchId,gameNumber,winner:["T1","OPPONENT"].includes(value(data,"winner"))?value(data,"winner"):null,side:["BLUE","RED"].includes(value(data,"side"))?value(data,"side"):null,t1Picks:items(data,"t1Picks"),opponentPicks:items(data,"opponentPicks"),t1Bans:items(data,"t1Bans"),opponentBans:items(data,"opponentBans")});refresh();}
export async function deleteT1GameAction(data:FormData){const id=value(data,"id");if(id)await deleteT1Game(id);refresh();}
export async function syncT1Action(){try{await syncT1FromLeaguepedia();}catch(error){await recordAdminError("t1-sync",error,error instanceof ExternalProviderError?{provider:error.provider,operation:error.operation,httpStatus:error.status,attempts:error.attempts}:{});}refresh();}

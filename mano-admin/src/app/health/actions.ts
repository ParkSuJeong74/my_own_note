"use server";

import {revalidatePath} from "next/cache";
import {createHealthMeasurement,deleteHealthMeasurement,updateHealthMeasurement,upsertHealthProfile} from "@/lib/automation-repository";

const value=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const positive=(data:FormData,name:string,required=false)=>{const raw=value(data,name);if(!raw)return required?NaN:null;const result=Number(raw);return Number.isFinite(result)&&result>0?result:required?NaN:null;};
const percentage=(data:FormData,name:string)=>{const result=positive(data,name);return result!==null&&result<=100?result:null;};
const date=(data:FormData,name:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value(data,name))?value(data,name):null;
const refresh=()=>revalidatePath("/health");
const measurement=(data:FormData)=>({measuredOn:date(data,"measuredOn")??"",weightKg:positive(data,"weightKg",true) as number,bodyFatPct:percentage(data,"bodyFatPct"),bodyFatMassKg:positive(data,"bodyFatMassKg"),skeletalMuscleKg:positive(data,"skeletalMuscleKg"),waistCm:positive(data,"waistCm"),note:value(data,"note")});

export async function saveHealthProfileAction(data:FormData){const heightCm=positive(data,"heightCm",true) as number,sex=["FEMALE","MALE"].includes(value(data,"sex"))?value(data,"sex"):"UNSPECIFIED";if(!Number.isFinite(heightCm))return;await upsertHealthProfile({heightCm,birthDate:date(data,"birthDate"),sex,targetWeightKg:positive(data,"targetWeightKg"),targetBodyFatPct:percentage(data,"targetBodyFatPct"),deviceName:value(data,"deviceName")});refresh();}
export async function createHealthMeasurementAction(data:FormData){const input=measurement(data);if(!input.measuredOn||!Number.isFinite(input.weightKg))return;await createHealthMeasurement(input);refresh();}
export async function updateHealthMeasurementAction(data:FormData){const id=value(data,"id"),input=measurement(data);if(!id||!input.measuredOn||!Number.isFinite(input.weightKg))return;await updateHealthMeasurement(id,input);refresh();}
export async function deleteHealthMeasurementAction(data:FormData){const id=value(data,"id");if(!id)return;await deleteHealthMeasurement(id);refresh();}

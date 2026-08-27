"use client";

import { calendarColors, defaultCalendarColor } from "@/lib/calendar-colors";

export function EventColorPicker({defaultValue=defaultCalendarColor}:{defaultValue?:string}){
  const selected=calendarColors.some((color)=>color.value===defaultValue)?defaultValue:defaultCalendarColor;
  return <fieldset className="event-color-picker"><legend>Color</legend><div>{calendarColors.map((color)=><label title={color.label} key={color.value}><input type="radio" name="color" value={color.value} defaultChecked={color.value===selected}/><span style={{backgroundColor:color.value}}/><em>{color.label}</em></label>)}</div></fieldset>;
}

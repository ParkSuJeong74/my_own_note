export const calendarColors = [
  { value: "#2563eb", label: "Blue" },
  { value: "#7c3aed", label: "Purple" },
  { value: "#db2777", label: "Pink" },
  { value: "#dc2626", label: "Red" },
  { value: "#ea580c", label: "Orange" },
  { value: "#16a34a", label: "Green" },
  { value: "#0891b2", label: "Cyan" },
  { value: "#475569", label: "Slate" },
] as const;

export const defaultCalendarColor = calendarColors[0].value;

export function isCalendarColor(value: string) {
  return calendarColors.some((color) => color.value === value);
}

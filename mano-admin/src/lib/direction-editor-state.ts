export type DirectionEditorState = "closed" | "open";
export type DirectionEditorEvent = "open" | "cancel" | "saved";

export function directionEditorState(
  state: DirectionEditorState,
  event: DirectionEditorEvent,
): DirectionEditorState {
  if (event === "open") return "open";
  if (event === "cancel" || event === "saved") return "closed";
  return state;
}

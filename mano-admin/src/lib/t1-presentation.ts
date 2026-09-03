export function finishedMatchPom(status: string, pomPlayer: string): string | null {
  if (status !== "FINISHED") return null;
  const player = pomPlayer.trim();
  return player || null;
}

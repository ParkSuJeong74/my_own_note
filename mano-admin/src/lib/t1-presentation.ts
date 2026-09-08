export function finishedMatchPom(status: string, pomPlayer: string): string | null {
  if (status !== "FINISHED") return null;
  const player = pomPlayer.trim();
  return player || null;
}

export function t1SeriesGameNumbers(input: { status: string; t1Score: number; opponentScore: number; gameNumbers: number[] }) {
  const played = Math.max(input.t1Score + input.opponentScore, 0, ...input.gameNumbers);
  const count = Math.max(played, input.status === "FINISHED" ? 1 : 0);
  return Array.from({ length: Math.min(5, count) }, (_, index) => index + 1);
}

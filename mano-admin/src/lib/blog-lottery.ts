export function drawNeighborIndex(
  length: number,
  currentIndex: number | null,
  random = Math.random,
) {
  if (length <= 0) return null;
  if (length === 1) return 0;
  if (currentIndex === null || currentIndex < 0 || currentIndex >= length) {
    return Math.floor(random() * length);
  }
  const candidate = Math.floor(random() * (length - 1));
  return candidate < currentIndex ? candidate : candidate + 1;
}

/** 15-level scale: Low 1 = 1 … High 5 = 15 */
export function bandTierToScale(band: number, tier: string): number {
  const off = tier === "High" ? 0.7 : tier === "Mid" ? 0.35 : 0;
  return (band - 1) * 3 + 1 + off * 2;
}

import type { Domino, TrickEntry } from '../types/game'

export function getValidPlays(
  hand: Domino[],
  trump: number | null | undefined,
  trick: TrickEntry[],
): Domino[] {
  if (!trick || trick.length === 0) return hand;
  const lead = trick[0].domino;
  const leadSuit =
    trump !== null && trump !== undefined && (lead[0] === trump || lead[1] === trump)
      ? trump
      : Math.max(lead[0], lead[1]);
  const hasSuit = hand.some(([a, b]) => a === leadSuit || b === leadSuit);
  return hasSuit ? hand.filter(([a, b]) => a === leadSuit || b === leadSuit) : hand;
}

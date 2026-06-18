export type BaseStats = {
  points: number;
  fgMade: number;
  fgAtt: number;
  twoMade: number;
  twoAtt: number;
  threeMade: number;
  threeAtt: number;
  ftMade: number;
  ftAtt: number;
  offReb: number;
  defReb: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
};

function pct(made: number, attempts: number) {
  return attempts === 0 ? 0 : Math.round((made / attempts) * 1000) / 10;
}

export function advancedStats(stats: BaseStats) {
  const totalRebounds = stats.offReb + stats.defReb;

  return {
    totalRebounds,
    fgPct: pct(stats.fgMade, stats.fgAtt),
    twoPct: pct(stats.twoMade, stats.twoAtt),
    threePct: pct(stats.threeMade, stats.threeAtt),
    ftPct: pct(stats.ftMade, stats.ftAtt),
    efgPct: pct(stats.fgMade + 0.5 * stats.threeMade, stats.fgAtt),
    tsPct: pct(stats.points, 2 * (stats.fgAtt + 0.44 * stats.ftAtt)),
    pir:
      stats.points +
      totalRebounds +
      stats.assists +
      stats.steals +
      stats.blocks -
      (stats.fgAtt - stats.fgMade) -
      (stats.ftAtt - stats.ftMade) -
      stats.turnovers,
  };
}

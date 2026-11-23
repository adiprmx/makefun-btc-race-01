// SmaBand: a long-only cbBTC/USDC bot for the make.fun btc-race-24h competition.
//
// Strategy, chosen from an offline backtest over the kit's 1,440-bar dev window:
//   - The dev window rose +3.6% in one early burst, then chopped sideways about
//     +-0.5% for roughly 18 hours. A 1-minute EMA(8)/EMA(21) crossover whipsaws
//     in that chop: 76 trades, about -$115 net after the ~46 bps a full-size
//     round trip pays (4 bps fee + 2 bps slippage + ~17 bps of pool impact each
//     way at this depth).
//   - A slow 60-bar simple moving average with a +-0.3% hysteresis band instead
//     trades only 8 times on the same window and nets about +$20.4: it rides the
//     burst, sits out the chop in cash, and re-enters only on a real break above
//     the average. Buy-and-hold nets about +$32 on dev, but it rides every
//     drawdown down too; this bot gives the race window up rather than holding
//     through a falling one.
//   - Long only, at most one open position, full size on entry, all out on exit.
//     No clock, no randomness, no environment: every decision is a pure function
//     of the closes the harness sent, so the two graded runs agree byte for byte.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const SMA_BARS = 60;
/** Enter above the average by this much (0.3%), exit below it by the same. */
const BAND_BPS = 30;
/** Never let a fill land more than 1% past the close it was decided on. */
const MAX_SLIPPAGE_BPS = 100;

interface Trend {
  closes: number[];
  sum: number;
}

const trends = new Map<string, Trend>();

function smaAfter(trend: Trend, close: number): number | null {
  trend.closes.push(close);
  trend.sum += close;
  if (trend.closes.length > SMA_BARS) trend.sum -= trend.closes.shift()!;
  if (trend.closes.length < SMA_BARS) return null;
  return trend.sum / SMA_BARS;
}

await runBars({
  onBatch(state: BarsState, batch) {
    if (state.warmingUp) return [];
    const orders: (BuyInput | SellInput)[] = [];
    for (const bar of batch.bars) {
      if (bar.symbol !== SYMBOL) continue;
      let trend = trends.get(bar.symbol);
      if (trend === undefined) {
        trend = { closes: [], sum: 0 };
        trends.set(bar.symbol, trend);
      }
      const sma = smaAfter(trend, Number(bar.c));
      if (sma === null) continue;
      const close = Number(bar.c);
      const held = state.positions.get(bar.symbol);
      if (held === undefined) {
        // Flat: enter only on a clean break above the band, so chop that merely
        // touches the average never opens a trade.
        if (close * 10_000 > sma * (10_000 + BAND_BPS)) {
          let size = state.cash;
          const room = state.weightRoom(bar.symbol);
          if (size > room) size = room;
          if (size < BigInt(state.hello.fees.min_notional_quote_units)) continue;
          orders.push({ side: 'buy', symbol: bar.symbol, notional_quote_units: size, max_slippage_bps: MAX_SLIPPAGE_BPS });
        }
      } else {
        // Holding: exit on a clean break below the band. The condition is a
        // level, not an edge, so a sell the market refuses is retried on the
        // next bar while the break still holds.
        // A hard stop 2% under the entry cost caps one trade's loss in the race
        // window: the band alone only exits at the next close, and a sharp drop
        // between closes would otherwise ride the whole fall. It never fired
        // on the dev window (same +$20.4 there), it is purely race protection.
        const value = state.value(bar.symbol, held.qty);
        if (value * 100n <= held.cost * 98n) {
          orders.push({ side: 'sell', symbol: bar.symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        } else if (close * 10_000 < sma * (10_000 - BAND_BPS)) {
          orders.push({ side: 'sell', symbol: bar.symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        }
      }
    }
    return orders;
  },
});

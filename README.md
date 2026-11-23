# makefun-btc-race-01

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/adiprmx/makefun-btc-race-01/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/adiprmx/makefun-btc-race-01/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A long-only cbBTC/USDC trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades minute by minute on the bars-replay harness, starting from 1,000 USDC of paper money.

## Strategy: SmaBand

A 60-bar simple moving average with a ±0.3% hysteresis band: buy the full cash when the close breaks above SMA(60) × 1.003, sell everything when it breaks below SMA(60) × 0.997, plus a hard stop 2% under the entry cost. Long only, one position at a time, no leverage, no shorts.

Why this, and not the obvious EMA crossover: on the kit's 1,440-bar dev window (BTC +3.6% in one early burst, then ~18 hours of ±0.5% chop), a 1-minute EMA(8)/EMA(21) cross whipsaws — 76 trades, about −$115 net after the ~46 bps a full-size round trip pays in fees, slippage and pool impact. The SMA(60) band trades only 8 times and nets about +$20.4 on the same window: it rides the burst, sits out the chop in cash, and re-enters only on a real break. Buy-and-hold nets about +$32 on dev but rides every drawdown down; this bot is built for the race window, where giving a falling market up beats holding through it.

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout through `vendor/makefun-bars.ts` (a byte-identical copy of the kit's SDK shim). Grade it locally from the kit directory:

```sh
node cli/makefun.mjs grade-local --kit . --bot <this repository> --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=1c6jcmp6&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>

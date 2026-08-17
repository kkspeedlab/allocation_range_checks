# Allocation Range Checks

Pre-trade allocation control application for checking proposed orders against client mandate ranges.

## Controls

1. Equities incl. Commodities: 25%–65%
2. Fixed Income – Bonds: 15%–60%
3. Alternatives / Hedge Funds: 0%–40%
4. Foreign Currencies: 0%–70%
5. Money Market: 0%–60%
6. Eligible Investment Universe: PASS by default until a specific rule is defined
7. Concentration Limit: PASS by default until a specific rule is defined

## Current status

The front end supports portfolio and order uploads, account summaries, projected allocation checks, PASS/FAIL status, archive/reporting metadata, PDF printing, and JSON export. The calculation engine and authentication layer will be connected next.

Sensitive portfolio valuations, order files, and archived pre-trade reports must not be committed to this repository.
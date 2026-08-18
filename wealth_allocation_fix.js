// Wealth-specific allocation reader.
// Wealth uses separate Equities and Commodities rows, which are combined for the mandate control.
(function () {
  window.allocationState = function(rows) {
    const wealthRows = rows.filter(r => isWealthStrategy(r.Strategy) && r.Date !== null && r.Date !== undefined);
    if (!wealthRows.length) throw new Error('No Wealth / Wealth Strategy rows were found in Capital_Allocations.');

    const latest = Math.max(...wealthRows.map(r => num(r.Date)));
    const latestRows = wealthRows.filter(r => num(r.Date) === latest);

    const weightFor = name => latestRows
      .filter(r => norm(r.Component) === name)
      .reduce((sum, r) => sum + num(r.Weight) * 100, 0);

    const equities = weightFor('Equities');
    const commodities = weightFor('Commodities');
    const fixedIncome = weightFor('Fixed Income');
    const moneyMarket = weightFor('Money Market & Liquidity');
    const alternatives = weightFor('Alternatives');

    const out = {
      eqcom: equities + commodities,
      fi: fixedIncome,
      mm: moneyMarket,
      alt: alternatives,
      dateSerial: latest
    };

    // Fail visibly if the expected Wealth components were not found instead of silently returning zeroes.
    const missing = [];
    if (!latestRows.some(r => norm(r.Component) === 'Equities')) missing.push('Equities');
    if (!latestRows.some(r => norm(r.Component) === 'Commodities')) missing.push('Commodities');
    if (!latestRows.some(r => norm(r.Component) === 'Fixed Income')) missing.push('Fixed Income');
    if (!latestRows.some(r => norm(r.Component) === 'Money Market & Liquidity')) missing.push('Money Market & Liquidity');
    if (!latestRows.some(r => norm(r.Component) === 'Alternatives')) missing.push('Alternatives');
    if (missing.length) throw new Error('Missing Wealth allocation component(s): ' + missing.join(', '));

    return out;
  };
})();

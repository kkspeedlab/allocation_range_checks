// Wealth-specific allocation reader.
// Read the dedicated "Wealth Portfolio" strategy exactly as stored in Capital_Allocations.
(function () {
  window.allocationState = function(rows) {
    const strategyName = 'WEALTH PORTFOLIO';
    const wealthRows = rows.filter(r => norm(r.Strategy).toUpperCase() === strategyName && r.Date !== null && r.Date !== undefined);
    if (!wealthRows.length) throw new Error('No Wealth Portfolio rows were found in Capital_Allocations.');

    const latest = Math.max(...wealthRows.map(r => num(r.Date)));
    const latestRows = wealthRows.filter(r => num(r.Date) === latest);

    // Wealth Portfolio now uses the same component names as the mandate controls.
    const componentMap = {
      'Equities (Incl. Commodities)': 'eqcom',
      'Fixed Income - Bonds': 'fi',
      'Money Market': 'mm',
      'Alternatives': 'alt'
    };

    const out = { eqcom: 0, fi: 0, mm: 0, alt: 0, dateSerial: latest };
    const found = new Set();
    for (const r of latestRows) {
      const component = norm(r.Component);
      const key = componentMap[component];
      if (!key) continue;
      out[key] = num(r.Weight) * 100;
      found.add(key);
    }

    const expected = [
      ['eqcom', 'Equities (Incl. Commodities)'],
      ['fi', 'Fixed Income - Bonds'],
      ['mm', 'Money Market'],
      ['alt', 'Alternatives']
    ];
    const missing = expected.filter(([key]) => !found.has(key)).map(([, name]) => name);
    if (missing.length) throw new Error('Missing Wealth Portfolio allocation component(s): ' + missing.join(', '));

    return out;
  };
})();

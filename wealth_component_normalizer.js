// Normalize Wealth Portfolio component labels before the Wealth runtime reads them.
(function () {
  const originalWorkbookToRows = window.workbookToRows;
  if (typeof originalWorkbookToRows !== 'function') return;

  function clean(v) { return String(v ?? '').trim(); }
  function norm(v) {
    return clean(v)
      .toUpperCase()
      .replace(/[–—]/g, '-')
      .replace(/&/g, ' AND ')
      .replace(/[().,_/\\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function standardComponent(v) {
    const x = norm(v);
    if (x.includes('EQUIT') || x.includes('COMMOD')) return 'Equities (Incl. Commodities)';
    if (x.includes('FIXED INCOME') || x.includes('BOND')) return 'Fixed Income - Bonds';
    if (x.includes('MONEY') || x.includes('LIQUID')) return 'Money Market';
    if (x.includes('ALTERNATIVE') || x.includes('HEDGE')) return 'Alternatives';
    return v;
  }

  window.workbookToRows = async function(file) {
    const out = await originalWorkbookToRows(file);
    const rows = out?.sheets?.Capital_Allocations;
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (norm(r.Strategy) === 'WEALTH PORTFOLIO') {
          r.Component = standardComponent(r.Component);
        }
      }
    }
    return out;
  };
})();

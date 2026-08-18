// Runtime logic for wealth.html.
(function () {
  function el(id) { return document.getElementById(id); }
  function clean(v) { return String(v ?? '').trim(); }
  function upper(v) { return clean(v).toUpperCase(); }
  function normalizedText(v) {
    return upper(v)
      .replace(/[–—]/g, '-')
      .replace(/&/g, ' AND ')
      .replace(/[().,_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function weightPct(v) {
    if (v === null || v === undefined || v === '') return NaN;
    if (typeof v === 'number') return Math.abs(v) <= 1.5 ? v * 100 : v;
    let s = String(v).trim().replace(/\s/g, '');
    const hasPct = s.includes('%');
    s = s.replace('%', '').replace(/,/g, '');
    const n = Number(s);
    if (!Number.isFinite(n)) return NaN;
    if (hasPct) return n;
    return Math.abs(n) <= 1.5 ? n * 100 : n;
  }
  function dateKey(v) {
    if (v instanceof Date && Number.isFinite(v.getTime())) return v.getTime();
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const s = clean(v);
    if (!s) return NaN;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
    const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : NaN;
  }

  function wealthAllocationState(rows) {
    const wealthRows = rows.filter(r => normalizedText(r.Strategy) === 'WEALTH PORTFOLIO' && r.Date !== null && r.Date !== undefined);
    if (!wealthRows.length) {
      const available = [...new Set(rows.map(r => clean(r.Strategy)).filter(Boolean))];
      throw new Error('No Strategy = Wealth Portfolio rows found in Capital_Allocations. Available strategies include: ' + available.slice(0,20).join(', '));
    }

    const dated = wealthRows.map(r => ({r, k: dateKey(r.Date)})).filter(x => Number.isFinite(x.k));
    if (!dated.length) throw new Error('Wealth Portfolio rows were found, but their Date values could not be read.');
    const latest = Math.max(...dated.map(x => x.k));
    const latestRows = dated.filter(x => x.k === latest).map(x => x.r);

    function componentKey(name) {
      const x = normalizedText(name);
      if (x === 'EQUITIES INCL COMMODITIES' || x === 'EQUITIES INCLUDING COMMODITIES') return 'eqcom';
      if (x === 'FIXED INCOME - BONDS' || x === 'FIXED INCOME BONDS') return 'fi';
      if (x === 'MONEY MARKET') return 'mm';
      if (x === 'ALTERNATIVES') return 'alt';
      return null;
    }

    const state = {eqcom: NaN, fi: NaN, mm: NaN, alt: NaN, dateSerial: latest};
    for (const r of latestRows) {
      const key = componentKey(r.Component);
      if (!key) continue;
      const w = weightPct(r.Weight);
      if (Number.isFinite(w)) state[key] = w;
    }

    const missing = [];
    if (!Number.isFinite(state.eqcom)) missing.push('Equities (Incl. Commodities)');
    if (!Number.isFinite(state.fi)) missing.push('Fixed Income - Bonds');
    if (!Number.isFinite(state.mm)) missing.push('Money Market');
    if (!Number.isFinite(state.alt)) missing.push('Alternatives');
    if (missing.length) {
      const found = latestRows.map(r => clean(r.Component) + ' [Weight=' + clean(r.Weight) + ']').filter(Boolean);
      throw new Error('Missing/unreadable Wealth Portfolio component(s): ' + missing.join(', ') + '. Rows found for latest date: ' + found.join('; '));
    }
    return state;
  }

  function renderWealthFixed(state, results, ordersList, unpricedCount, portfolioFile, allocationFile, ordersFile) {
    el('tbody').innerHTML = results.map(r => `<tr><td><strong>WEALTH</strong></td><td>${r.control}</td><td class="num">${fmtPct(r.current)}</td><td class="num">${r.delta===null?'—':(r.delta>=0?'+':'')+fmtPct(r.delta)}</td><td class="num"><strong>${fmtPct(r.projected)}</strong></td><td class="num">${r.min===null?'—':r.min+'%'}</td><td class="num">${r.max===null?'—':r.max+'%'}</td><td class="num">${r.headroom===null?'—':fmtPct(r.headroom)}</td><td><span class="pill ${r.status==='PASS'?'pass':'fail'}">${r.status}</span></td></tr>`).join('');
    el('orderbody').innerHTML = ordersList.map(o => `<tr><td>${o.sheet}</td><td>${o.side}</td><td>${o.isin}</td><td>${o.description}</td><td>${o.classification}</td><td class="num">${o.quantity.toLocaleString()}</td><td class="num">${o.eur_value===null?'—':fmtMoney(o.eur_value)}</td><td>${o.price_source}</td><td><span class="pill ${o.status==='PRICED'?'pass':'fail'}">${o.status}</span></td></tr>`).join('');
    const numericPass = results.every(x => x.status === 'PASS');
    const overallResult = !numericPass ? 'FAIL' : (unpricedCount ? 'REVIEW' : 'PASS');
    const card = el('cardstatus');
    card.textContent = overallResult;
    card.className = 'pill ' + (overallResult === 'PASS' ? 'pass' : overallResult === 'REVIEW' ? 'pending' : 'fail');
    const id = makeId();
    const ts = new Date().toLocaleString();
    el('checkid').textContent = id;
    el('timestamp').textContent = ts;
    el('adate').textContent = clean(state.displayDate || '') || String(state.dateSerial);
    el('pfile').textContent = portfolioFile;
    el('afile').textContent = allocationFile;
    el('ofile').textContent = ordersFile;
    el('ordercount').textContent = ordersList.length;
    el('unpriced').textContent = unpricedCount;
    el('overall').textContent = overallResult;
    el('pdf').disabled = false;
    el('json').disabled = false;
    el('status').textContent = `Wealth check completed: ${ordersList.length} aggregated orders processed, ${unpricedCount} unpriced. Current allocations read: Equities ${fmtPct(state.eqcom)}, Fixed Income ${fmtPct(state.fi)}, Money Market ${fmtPct(state.mm)}, Alternatives ${fmtPct(state.alt)}. Overall ${overallResult}.`;
    lastRecord = {check_id:id,timestamp:ts,account:'WEALTH',wealth_nav_eur:WEALTH_NAV,allocation_date:el('adate').textContent,portfolio_file:portfolioFile,allocation_file:allocationFile,orders_file:ordersFile,overall_result:overallResult,unpriced_orders:unpricedCount,results,orders:ordersList};
  }

  window.runCheck = async function () {
    const pf = el('portfolio').files[0];
    const af = el('allocations').files[0];
    const of = el('orders').files[0];
    const statusEl = el('status');
    if (!pf || !af || !of) { statusEl.textContent = 'Please select all three files.'; return; }

    try {
      statusEl.textContent = 'Calculating Wealth allocation impact…';
      const p = await workbookToRows(pf);
      const a = await workbookToRows(af);
      const o = await workbookToRows(of);
      const rows = p.sheets.data || p.sheets.Data || Object.values(p.sheets)[0];
      const allocRows = a.sheets.Capital_Allocations;
      if (!allocRows) throw new Error('Capital_Allocations sheet was not found.');
      if (!rows || !rows.length) throw new Error('HSBC portfolio data sheet was not recognized.');

      const state = wealthAllocationState(allocRows);
      const matchingDates = allocRows.filter(r => normalizedText(r.Strategy) === 'WEALTH PORTFOLIO' && dateKey(r.Date) === state.dateSerial);
      state.displayDate = matchingDates.length ? clean(matchingDates[0].Date) : '';
      const fxValue = rows.filter(x => norm(x['Asset Key']) && norm(x['Position Ccy']).toUpperCase() !== 'EUR').reduce((s,x)=>s+num(x['EOP Mkt Val Tot Cont Ccy']),0);
      state.fx = fxValue / WEALTH_NAV * 100;

      const deltas = {eqcom:0,fi:0,alt:0,mm:0};
      const detail = [];
      let unpricedCount = 0;
      for (const [sheet, ors] of Object.entries(o.sheets)) {
        for (const r of ors) {
          const side = norm(r['Stex Order Group']).toLowerCase();
          const qty = Math.abs(num(r.Quantity));
          const isin = normIsin(r.Asset);
          if (!['buy','sell'].includes(side) || !qty || !isin) continue;
          const match = bestMatch(rows, isin);
          let cls = match ? norm(match.Sub_Class) : 'Unknown';
          let key = CLASS_MAP[cls] || null;
          let vv = valueOrder(match, qty);
          let description = match ? norm(match.Position) : '';
          if (vv.value === null) {
            const y = await yahooQuote(isin);
            if (y) {
              vv = {value:qty*Number(y.price_eur),source:'Yahoo Finance ('+y.symbol+')'};
              description = description || norm(y.name || y.symbol);
              if (!key) { const yc = yahooClass(y); cls = yc.cls; key = yc.key; }
            }
          }
          if (vv.value === null) {
            unpricedCount++;
            detail.push({sheet,side:side.toUpperCase(),isin,description,classification:cls,quantity:qty,eur_value:null,price_source:'Unpriced',status:'UNPRICED'});
            continue;
          }
          if (!key) { key='eqcom'; cls = cls && cls!=='Unknown' ? cls+' → Equities incl. Commodities' : 'Equities incl. Commodities'; }
          const signed = side==='buy' ? vv.value : -vv.value;
          deltas[key] += signed;
          deltas.mm -= signed;
          detail.push({sheet,side:side.toUpperCase(),isin,description,classification:cls,quantity:qty,eur_value:vv.value,price_source:vv.source,status:'PRICED'});
        }
      }

      if (!detail.length) throw new Error('No BUY/SELL orders were recognized. Expected columns include Stex Order Group, Quantity and Asset.');
      const recon = deltas.eqcom+deltas.fi+deltas.alt+deltas.mm;
      if (Math.abs(recon)>1) throw new Error('Internal allocation reconciliation failed by '+fmtMoney(recon)+'. Report not produced.');

      const results=[];
      for (const c of CONTROLS) {
        let current=0,effect=0;
        if (c.key==='eligible'||c.key==='conc') {
        } else if (c.key==='fx') {
          current=state.fx;
        } else {
          current=state[c.key];
          effect=(deltas[c.key]||0)/WEALTH_NAV*100;
        }
        results.push({account:'WEALTH',control:c.name,min:c.min,max:c.max,...controlResult(current,effect,c)});
      }
      renderWealthFixed(state,results,detail,unpricedCount,pf.name,af.name,of.name);
    } catch(e) {
      console.error(e);
      statusEl.textContent='Error: '+e.message;
    }
  };
})();

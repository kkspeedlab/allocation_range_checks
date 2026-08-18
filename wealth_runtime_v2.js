// Clean Wealth Portfolio runtime. Reads exact Capital_Allocations rows for Strategy = Wealth Portfolio.
(function(){
  const el=id=>document.getElementById(id);
  const clean=v=>String(v??'').trim();
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  const pct=v=>{const x=Number(v);if(!Number.isFinite(x)) return NaN;return Math.abs(x)<=1.5?x*100:x};
  const dateKey=v=>{
    if(v instanceof Date && Number.isFinite(v.getTime())) return v.getTime();
    if(typeof v==='number'&&Number.isFinite(v)) return v;
    const s=clean(v); if(!s) return NaN;
    const x=Number(s); if(Number.isFinite(x)) return x;
    const t=Date.parse(s); return Number.isFinite(t)?t:NaN;
  };

  function readWealthPortfolio(rows){
    const wr=rows.filter(r=>clean(r.Strategy)==='Wealth Portfolio');
    if(!wr.length) throw new Error('No exact Strategy = Wealth Portfolio rows found in Capital_Allocations.');
    const dated=wr.map(r=>({r,k:dateKey(r.Date)})).filter(x=>Number.isFinite(x.k));
    if(!dated.length) throw new Error('Wealth Portfolio rows found but Date could not be read.');
    const latest=Math.max(...dated.map(x=>x.k));
    const lr=dated.filter(x=>x.k===latest).map(x=>x.r);
    const wanted={
      'Money Market':'mm',
      'Fixed Income - Bonds':'fi',
      'Equities (Incl. Commodities)':'eqcom',
      'Alternatives':'alt'
    };
    const state={mm:NaN,fi:NaN,eqcom:NaN,alt:NaN,dateSerial:latest,displayDate:clean(lr[0]?.Date)};
    for(const r of lr){
      const key=wanted[clean(r.Component)];
      if(key){const w=pct(r.Weight);if(Number.isFinite(w))state[key]=w;}
    }
    const missing=Object.entries({mm:'Money Market',fi:'Fixed Income - Bonds',eqcom:'Equities (Incl. Commodities)',alt:'Alternatives'}).filter(([k])=>!Number.isFinite(state[k])).map(([,v])=>v);
    if(missing.length){
      const found=lr.map(r=>`${clean(r.Component)}=${clean(r.Weight)}`).join('; ');
      throw new Error('Missing Wealth Portfolio component(s): '+missing.join(', ')+'. Exact rows found: '+found);
    }
    return state;
  }

  function render(state,results,ordersList,unpricedCount,pf,af,of){
    el('tbody').innerHTML=results.map(r=>`<tr><td><strong>WEALTH</strong></td><td>${r.control}</td><td class="num">${fmtPct(r.current)}</td><td class="num">${r.delta===null?'—':(r.delta>=0?'+':'')+fmtPct(r.delta)}</td><td class="num"><strong>${fmtPct(r.projected)}</strong></td><td class="num">${r.min===null?'—':r.min+'%'}</td><td class="num">${r.max===null?'—':r.max+'%'}</td><td class="num">${r.headroom===null?'—':fmtPct(r.headroom)}</td><td><span class="pill ${r.status==='PASS'?'pass':'fail'}">${r.status}</span></td></tr>`).join('');
    el('orderbody').innerHTML=ordersList.map(o=>`<tr><td>${o.sheet}</td><td>${o.side}</td><td>${o.isin}</td><td>${o.description}</td><td>${o.classification}</td><td class="num">${o.quantity.toLocaleString()}</td><td class="num">${o.eur_value===null?'—':fmtMoney(o.eur_value)}</td><td>${o.price_source}</td><td><span class="pill ${o.status==='PRICED'?'pass':'fail'}">${o.status}</span></td></tr>`).join('');
    const overall=!results.every(x=>x.status==='PASS')?'FAIL':(unpricedCount?'REVIEW':'PASS');
    const card=el('cardstatus'); card.textContent=overall; card.className='pill '+(overall==='PASS'?'pass':overall==='REVIEW'?'pending':'fail');
    const id=makeId(),ts=new Date().toLocaleString();
    el('checkid').textContent=id; el('timestamp').textContent=ts; el('adate').textContent=state.displayDate||String(state.dateSerial);
    el('pfile').textContent=pf; el('afile').textContent=af; el('ofile').textContent=of; el('ordercount').textContent=ordersList.length; el('unpriced').textContent=unpricedCount; el('overall').textContent=overall; el('pdf').disabled=false; el('json').disabled=false;
    el('status').textContent=`Wealth check completed. Strategy used: Wealth Portfolio. Current allocations: Equities ${fmtPct(state.eqcom)}, Fixed Income ${fmtPct(state.fi)}, Money Market ${fmtPct(state.mm)}, Alternatives ${fmtPct(state.alt)}. Overall ${overall}.`;
    lastRecord={check_id:id,timestamp:ts,account:'WEALTH',strategy_used:'Wealth Portfolio',wealth_nav_eur:WEALTH_NAV,allocation_date:el('adate').textContent,portfolio_file:pf,allocation_file:af,orders_file:of,overall_result:overall,unpriced_orders:unpricedCount,results,orders:ordersList};
  }

  window.runCheck=async function(){
    const pf=el('portfolio').files[0],af=el('allocations').files[0],of=el('orders').files[0],statusEl=el('status');
    if(!pf||!af||!of){statusEl.textContent='Please select all three files.';return;}
    try{
      statusEl.textContent='Calculating Wealth allocation impact…';
      const p=await workbookToRows(pf),a=await workbookToRows(af),o=await workbookToRows(of);
      const rows=p.sheets.data||p.sheets.Data||Object.values(p.sheets)[0];
      const allocRows=a.sheets.Capital_Allocations;
      if(!allocRows) throw new Error('Capital_Allocations sheet was not found.');
      if(!rows||!rows.length) throw new Error('HSBC portfolio data sheet was not recognized.');
      const state=readWealthPortfolio(allocRows);
      const fxValue=rows.filter(x=>norm(x['Asset Key'])&&norm(x['Position Ccy']).toUpperCase()!=='EUR').reduce((s,x)=>s+num(x['EOP Mkt Val Tot Cont Ccy']),0);
      state.fx=fxValue/WEALTH_NAV*100;
      const deltas={eqcom:0,fi:0,alt:0,mm:0},detail=[]; let unpriced=0;
      for(const [sheet,ors] of Object.entries(o.sheets)) for(const r of ors){
        const side=norm(r['Stex Order Group']).toLowerCase(),qty=Math.abs(num(r.Quantity)),isin=normIsin(r.Asset);
        if(!['buy','sell'].includes(side)||!qty||!isin) continue;
        const match=bestMatch(rows,isin); let cls=match?norm(match.Sub_Class):'Unknown',key=CLASS_MAP[cls]||null,vv=valueOrder(match,qty),description=match?norm(match.Position):'';
        if(vv.value===null){const y=await yahooQuote(isin);if(y){vv={value:qty*Number(y.price_eur),source:'Yahoo Finance ('+y.symbol+')'};description=description||norm(y.name||y.symbol);if(!key){const yc=yahooClass(y);cls=yc.cls;key=yc.key;}}}
        if(vv.value===null){unpriced++;detail.push({sheet,side:side.toUpperCase(),isin,description,classification:cls,quantity:qty,eur_value:null,price_source:'Unpriced',status:'UNPRICED'});continue;}
        if(!key){key='eqcom';cls=cls&&cls!=='Unknown'?cls+' → Equities incl. Commodities':'Equities incl. Commodities';}
        const signed=side==='buy'?vv.value:-vv.value; deltas[key]+=signed; deltas.mm-=signed;
        detail.push({sheet,side:side.toUpperCase(),isin,description,classification:cls,quantity:qty,eur_value:vv.value,price_source:vv.source,status:'PRICED'});
      }
      if(!detail.length) throw new Error('No BUY/SELL orders were recognized.');
      const recon=deltas.eqcom+deltas.fi+deltas.alt+deltas.mm;if(Math.abs(recon)>1)throw new Error('Internal allocation reconciliation failed by '+fmtMoney(recon)+'.');
      const results=[];
      for(const c of CONTROLS){let current=0,effect=0;if(c.key==='eligible'||c.key==='conc'){}else if(c.key==='fx'){current=state.fx}else{current=state[c.key];effect=(deltas[c.key]||0)/WEALTH_NAV*100}results.push({account:'WEALTH',control:c.name,min:c.min,max:c.max,...controlResult(current,effect,c)});}
      render(state,results,detail,unpriced,pf.name,af.name,of.name);
    }catch(e){console.error(e);statusEl.textContent='Error: '+e.message;}
  };
})();

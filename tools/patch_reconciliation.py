from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = "const signed=vv.value===null?null:(side==='buy'?vv.value:-vv.value);if(vv.value===null)unpriced++;else{if(key)deltas[account][key]+=signed;if(review)reviewCount++;deltas[account].mm-=signed}"
new = "const signed=vv.value===null?null:(side==='buy'?vv.value:-vv.value);if(vv.value===null){unpriced++;}else{if(!['fi','alt','eqcom'].includes(key)){key='eqcom';cls=(cls&&cls!=='Unknown')?cls:'Defaulted to Equities/Commodities';review=false;}deltas[account][key]+=signed;if(review)reviewCount++;deltas[account].mm-=signed;}"
if old not in s:
    raise SystemExit('Expected trade-classification block not found')
s = s.replace(old, new, 1)

old = "const results=[];for(const ac of activeAccounts){const s=states[ac],d=deltas[ac];for(const c of CONTROLS){let current=0,effect=0;if(c.key==='eligible'||c.key==='conc'){}else if(c.key==='fx')current=s.fxPct;else{current=s[c.key];effect=s.nav?(d[c.key]||0)/s.nav*100:NaN}results.push({account:ac,control:c.name,min:c.min,max:c.max,...controlResultPct(current,effect,c)})}}"
new = "const reconciliation={};for(const ac of activeAccounts){const d=deltas[ac],residual=(d.eqcom||0)+(d.fi||0)+(d.alt||0)+(d.mm||0);reconciliation[ac]={residual_eur:residual,residual_pct:states[ac].nav?residual/states[ac].nav*100:NaN,ok:Math.abs(residual)<0.01};if(!reconciliation[ac].ok)throw new Error('Trade allocation reconciliation failed for '+ac+': '+residual.toFixed(2)+' EUR residual.');}const results=[];for(const ac of activeAccounts){const s=states[ac],d=deltas[ac];for(const c of CONTROLS){let current=0,effect=0;if(c.key==='eligible'||c.key==='conc'){}else if(c.key==='fx')current=s.fxPct;else{current=s[c.key];effect=s.nav?(d[c.key]||0)/s.nav*100:NaN}results.push({account:ac,control:c.name,min:c.min,max:c.max,...controlResultPct(current,effect,c)})}}"
if old not in s:
    raise SystemExit('Expected results block not found')
s = s.replace(old, new, 1)

s = s.replace("render(activeAccounts,states,results,orderDetails,unpriced,reviewCount,pf.name,af.name,dl,of.name)", "render(activeAccounts,states,results,orderDetails,unpriced,reviewCount,pf.name,af.name,dl,of.name,reconciliation)", 1)
s = s.replace("function render(accounts,states,results,orders,unpriced,reviewCount,pfile,afile,allocDate,ofile){", "function render(accounts,states,results,orders,unpriced,reviewCount,pfile,afile,allocDate,ofile,reconciliation){", 1)
s = s.replace("review_orders:reviewCount,results,orders}", "review_orders:reviewCount,reconciliation,results,orders}", 1)

p.write_text(s, encoding='utf-8')
print('Applied allocation reconciliation patch')

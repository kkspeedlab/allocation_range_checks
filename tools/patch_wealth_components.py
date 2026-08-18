from pathlib import Path

p = Path('wealth.html')
s = p.read_text(encoding='utf-8')
old = "const ALLOC_COMPONENTS={'Money Market':'mm','Fixed Income - Bonds':'fi','Equities (Incl. Commodities)':'eqcom','Alternatives':'alt'};"
new = "const ALLOC_COMPONENTS={'Money Market & Liquidity':'mm','Fixed Income':'fi','Equities + Commodities':'eqcom','Alternatives':'alt'};"
if old not in s and new not in s:
    raise SystemExit('Expected Wealth ALLOC_COMPONENTS mapping not found')
s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
print('Applied Wealth Strategy component-name mapping')

const { chromium } = require('playwright');
(async () => {
  const br = await chromium.launch();
  const p = await br.newPage();
  await p.goto('file://' + require('path').resolve(__dirname, '../index.html') + '?render');
  await p.waitForFunction(() => window.__battle);
  const rows = await p.evaluate(() => { const out = []; for (let s = 1; s <= 400; s++) out.push(__battle.simulate(s)); return out; });
  const good = rows.filter(r => r.endT && r.endT >= 36 && r.endT <= 48 && r.winnerHp >= 3 && r.winnerHp <= 18 && r.kos[0] >= 12 && r.kos[1] - r.kos[0] >= 6 && r.kos[2] - r.kos[1] >= 8);
  console.log('total', rows.length, 'finished', rows.filter(r => r.endT).length, 'good', good.length);
  const wins = {}; rows.filter(r=>r.winner).forEach(r => wins[r.winner] = (wins[r.winner]||0)+1); console.log('win share', JSON.stringify(wins));
  good.slice(0, 12).forEach(r => console.log(JSON.stringify(r)));
  await br.close();
})();

// Prueba de aceptación del prototipo (issue #9). Uso, desde apps/prototipo con el servidor local en 8765:
//   node prueba-aceptacion.cjs            todos los casos y capturas en docs/capturas/9/
//   node prueba-aceptacion.cjs 10.4       solo los casos cuyo nombre contiene «10.4»
// Sale con código 1 si un caso que debía pasar tiene errores, o si renombrar en 10.4 no da 4 morph, 0 salen y 0 entran.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '../..');
const spec = fs.readFileSync(R + '/docs/spec/tiza-formato.md', 'utf8');
const casos = {};
for (const n of ['10.1', '10.2', '10.3', '10.4']) {
  const i = spec.indexOf('### ' + n); const a = spec.indexOf('```markdown\n', i) + 12; const b = spec.indexOf('\n```', a);
  casos['spec ' + n] = spec.slice(a, b) + '\n';
}
for (const f of fs.readdirSync(R + '/corpus', { recursive: true })) if (f.endsWith('.tiza')) casos['corpus ' + f] = fs.readFileSync(R + '/corpus/' + f, 'utf8');
casos['intercambiar'] = `---\nformato: tiza/0.2\ntitulo: Orden\n---\n\n## A\n$$ \\hat{A}\\hat{B} = C $$\n\n## B\n:: intercambiar \\hat{A} \\hat{B}\n$$ \\hat{B}\\hat{A} = C $$\n`;
casos['E13'] = `---\nformato: tiza/0.2\ntitulo: Mal\n---\n\n## A\n$$ \\left( x = 1 $$\n`;
casos['W08 physics'] = `---\nformato: tiza/0.2\ntitulo: Física\npaquetes: [physics]\n---\n\n## A\n$$ \\qty(x) = \\braket{a}{b} $$\n`;
casos['posicion'] = `---\nformato: tiza/0.2\ntitulo: Posicion\n---\n\n## A\n$$ \\tensor{T}{^\\mu_\\mu} = 0 $$\n\n## B\n:: resaltar ^\\mu\n$$ \\tensor{T}{^\\mu_\\mu} = 0 $$\n`;
const solo = process.argv[2];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('ERROR de página:', e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.route(/cdnjs\.cloudflare\.com.*js-yaml/, r => r.fulfill({ path: R + '/apps/prototipo/node_modules/js-yaml/dist/js-yaml.min.js', contentType: 'text/javascript' }));
  await p.goto('http://localhost:8765/index.html?local=1');
  await p.waitForFunction(() => window.__TIZA_READY, null, { timeout: 30000 });
  const res = {}; let fallas = 0;
  for (const [n, src] of Object.entries(casos)) {
    if (solo && !n.includes(solo)) continue;
    res[n] = await p.evaluate(async src => {
      window.__TIZA_READY = false; document.querySelector('#src').value = src; await apply();
      const d = [...DOC.diags, ...DOC.steps.flatMap(s => s.diags || [])].map(x => `${x.code}:${x.line} ${x.msg}`);
      const pasos = DOC.steps.map(s => ({ t: s.titulo, par: s.trans.pairs.length, morph: s.trans.pairs.filter(q => q.morph).length, swap: s.trans.pairs.filter(q => q.swap).length, sal: s.trans.exits.length, ent: s.trans.entries.length, enLugar: s.inPlace, hi: s.trans.targets.size, pos: [...new Set(s.S.glyphs.map(g => g.pos))].join('') }));
      return { diags: d, pasos };
    }, src);
    const r = res[n]; const errs = r.diags.filter(x => x.startsWith('E'));
    const esperaError = n === 'E13';
    const ok = esperaError ? errs.some(e => e.startsWith('E13')) : !errs.length;
    if (!ok) fallas++;
    console.log(`${ok ? '✓' : '✗'} ${n}: ${r.diags.length ? r.diags.join(' | ') : 'sin diagnósticos'}`);
    for (const s of r.pasos) console.log(`    ${s.t}: parejas ${s.par} (morph ${s.morph}, swap ${s.swap}) · salen ${s.sal} · entran ${s.ent} · resaltados ${s.hi}${s.enLugar ? ' · en el lugar' : ''} · pos[${s.pos}]`);
  }
  // capturas
  if (!solo || solo === 'capturas') {
    const dir = R + '/docs/capturas/9'; fs.mkdirSync(dir, { recursive: true });
    for (const [n, f, k] of [['spec 10.3', '10-3-conmutador', 'conmutador'], ['spec 10.4', '10-4-covariante', 'covariante']]) {
      await p.selectOption('#sample', k); await p.waitForTimeout(1500);
      const last = await p.evaluate(() => DOC.steps.length - 1);
      for (const [frac, suf] of [[0.42, 'intermedio'], [1, 'final']]) {
        await p.evaluate(([k, frac]) => { P.dir = 0; P.auto = false; P.k = k; P.tau = DOC.steps[k].sch.T * frac; updateCaption(); renderDiag(); frame(P.k, P.tau); updateHud(); }, [last, frac]);
        await p.waitForTimeout(150);
        await p.screenshot({ path: `${dir}/${f}-${suf}.png` });
      }
    }
    console.log('capturas en', dir);
  }
  const r104 = res['spec 10.4']?.pasos[2];
  if (r104 && !(r104.morph === 4 && r104.sal === 0 && r104.ent === 0)) { console.log('✗ renombrar en 10.4'); fallas++; }
  await b.close();
  process.exit(fallas ? 1 : 0);
})();

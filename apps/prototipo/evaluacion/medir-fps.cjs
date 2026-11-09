// Mide los cuadros por segundo del prototipo en los 30 pares de prueba (issue #12).
// Uso, con el servidor local en 8765 sirviendo apps/prototipo:
//   node evaluacion/medir-fps.cjs                 los 30 pares, a 1× y en tiempo real
//   node evaluacion/medir-fps.cjs --pares 5       solo los primeros 5
//   node evaluacion/medir-fps.cjs --salida f.json guarda el detalle en f.json (por omisión, fps.json)
// Registra el resultado y no tiene umbral: sale con 0 aunque los fps sean bajos. Solo falla (código 1)
// si la página no carga, lanza un error o un par no termina su transición.
// En GitHub Actions agrega una tabla al resumen del trabajo ($GITHUB_STEP_SUMMARY).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '../../..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg('--pares', 30), SALIDA = arg('--salida', 'fps.json');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  let errores = 0;
  p.on('pageerror', e => { console.log('ERROR de página:', e.message); errores++; });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.route(/cdnjs\.cloudflare\.com.*js-yaml/, r => r.fulfill({ path: R + '/apps/prototipo/node_modules/js-yaml/dist/js-yaml.min.js', contentType: 'text/javascript' }));
  await p.goto('http://localhost:8765/index.html?local=1&evaluar=1');
  await p.waitForFunction(() => window.__TIZA_READY, null, { timeout: 60000 });
  const filas = [];
  for (let i = 0; i < Math.min(N, 30); i++) {
    await p.evaluate(i => window.__TIZA_EVAL.evIr(i), i);
    try {
      await p.waitForFunction(() => P.dir === 0 && P.tau > 0 && P.tau >= DOC.steps[P.k].sch.T, null, { timeout: 60000 });
    } catch (e) { console.log(`✗ par ${i + 1}: la transición no terminó`); errores++; continue; }
    const f = await p.evaluate(() => {
      const par = window.__TIZA_EVAL.evClave().par, r = window.__TIZA_EVAL.FPS.byKey['par ' + par.id];
      return { par: par.id, guion: par.guion, transicion: `${par.a - 1}→${par.a}`, glifos: DOC.steps[P.k].S.glyphs.length, duracion: +DOC.steps[P.k].sch.T.toFixed(2), ...r };
    });
    filas.push(f);
    console.log(`${f.par}  ${f.promedio} fps  p5 ${f.p5}  cuadro ${f.costoMs} ms (máx ${f.costoMaxMs})  ${f.guion} ${f.transicion}`);
  }
  const prom = filas.length ? +(filas.reduce((a, f) => a + f.promedio, 0) / filas.length).toFixed(1) : null;
  const p5 = filas.length ? Math.min(...filas.map(f => f.p5)) : null;
  const costo = filas.length ? +(filas.reduce((a, f) => a + f.costoMs, 0) / filas.length).toFixed(2) : null;
  const navegador = await p.evaluate(() => navigator.userAgent);
  const res = { formato: 'tiza-fps/1', fecha: new Date().toISOString(), navegador, entorno: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local', resumen: { pares: filas.length, fpsPromedio: prom, p5Peor: p5, costoMedioMs: costo }, pares: filas };
  fs.writeFileSync(SALIDA, JSON.stringify(res, null, 2));
  console.log(`\nResumen: ${filas.length} pares · ${prom} fps promedio · p5 peor ${p5} · dibujo medio ${costo} ms por cuadro → ${SALIDA}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [`## Prototipo F0: cuadros por segundo (sin umbral)`, '', `Chromium sin pantalla en GitHub Actions: los fps dependen del entorno y no representan el equipo de la sala; el costo de dibujo por cuadro sí sirve para comparar entre PR.`, '',
      `**${filas.length} pares · ${prom} fps promedio · p5 peor ${p5} · dibujo medio ${costo} ms por cuadro**`, '',
      '| Par | Guion | Transición | fps | p5 | ms/cuadro | máx ms |', '| --- | --- | --- | --- | --- | --- | --- |',
      ...filas.map(f => `| ${f.par} | ${f.guion} | ${f.transicion} | ${f.promedio} | ${f.p5} | ${f.costoMs} | ${f.costoMaxMs} |`), ''].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }
  await b.close();
  process.exit(errores ? 1 : 0);
})();

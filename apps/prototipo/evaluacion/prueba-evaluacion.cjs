// Prueba del modo evaluación (issue #12). Uso, con el servidor local en 8765 sirviendo apps/prototipo:
//   node evaluacion/prueba-evaluacion.cjs
// Comprueba que los 30 pares cargan sin errores y en la transición correcta, que B, M, la nota y N
// funcionan con el teclado, que el resultado JSON es coherente y que sobrevive a una recarga.
// Deja capturas en docs/capturas/12/. Sale con código 1 si algo falla.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const R = path.resolve(__dirname, '../../..');
const URL = 'http://localhost:8765/index.html?local=1&evaluar=1';
let fallas = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if (!c) fallas++; };

async function preparar(p) {
  p.on('pageerror', e => { console.log('ERROR de página:', e.message); fallas++; });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.route(/cdnjs\.cloudflare\.com.*js-yaml/, r => r.fulfill({ path: R + '/apps/prototipo/node_modules/js-yaml/dist/js-yaml.min.js', contentType: 'text/javascript' }));
  await p.goto(URL);
  await p.waitForFunction(() => window.__TIZA_READY, null, { timeout: 30000 });
}
const enReposo = p => p.waitForFunction(() => P.dir === 0 && P.tau >= DOC.steps[P.k].sch.T, null, { timeout: 30000 });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await preparar(p);
  await p.evaluate(() => localStorage.removeItem('tiza-evaluacion'));

  ok(await p.isVisible('#evPanel'), 'el panel de evaluación se ve con ?evaluar=1');
  ok(await p.evaluate(() => VIEW.pairs), 'la vista Parejas queda activa');
  ok(await p.$$eval('#evPar option', o => o.length) === 31, 'el selector lista 30 pares');

  // los 30 pares: cargan, sin errores, en la transición indicada
  for (let i = 0; i < 30; i++) {
    const r = await p.evaluate(async i => {
      await window.__TIZA_EVAL.evIr(i);
      const par = EVAL_PARES[i];
      const errs = [...DOC.diags, ...DOC.steps.flatMap(s => s.diags || [])].filter(d => d.lv === 'E').map(d => d.code);
      const cl = window.__TIZA_EVAL.evClave();
      return { id: par.id, errs, k: P.k, a: par.a, clave: cl && cl.clave, sel: document.querySelector('#evPar').value };
    }, i);
    ok(!r.errs.length && r.k === r.a - 1 && r.clave === 'par ' + r.id && r.sel === String(i), `par ${r.id}: carga en ${r.k} → ${r.k + 1}${r.errs.length ? ' errores ' + r.errs.join(',') : ''}`);
  }

  // flujo con teclado: par 05 (Kepler, cancelar) bien; par 06 mal con nota; N avanza
  await p.selectOption('#evPar', '4'); await enReposo(p);
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('b');
  let m = await p.evaluate(() => window.__TIZA_EVAL.EV.marcas['par 05']);
  ok(m && m.veredicto === 'bien' && m.fps && m.fps.promedio > 0, `B marca el par 05 como bien con fps medidos (${m && m.fps ? m.fps.promedio + ' fps, p5 ' + m.fps.p5 : 'sin fps'})`);
  await p.keyboard.press('n');
  await p.waitForFunction(() => window.__TIZA_EVAL.evClave()?.clave === 'par 06');
  await p.waitForTimeout(1800);
  // captura a mitad de la transición, con las parejas
  fs.mkdirSync(R + '/docs/capturas/12', { recursive: true });
  await p.screenshot({ path: R + '/docs/capturas/12/evaluacion-transicion.png' });
  await enReposo(p);
  await p.keyboard.press('m');
  ok(await p.evaluate(() => document.activeElement.id === 'evNota'), 'M lleva el foco a la nota');
  await p.keyboard.type('el paréntesis derecho no se empareja');
  await p.keyboard.press('Enter');
  m = await p.evaluate(() => window.__TIZA_EVAL.EV.marcas['par 06']);
  ok(m && m.veredicto === 'mal' && m.nota === 'el paréntesis derecho no se empareja', 'M y Enter guardan «mal» con la nota');
  // las teclas B y M no se disparan mientras se escribe en la nota
  ok(await p.evaluate(() => document.activeElement.id !== 'evNota'), 'Enter suelta el foco de la nota');

  // resultado
  const res = await p.evaluate(() => window.__TIZA_EVAL.evResultado());
  ok(res.formato === 'tiza-evaluacion/1' && res.resumen.marcados === 2 && res.resumen.bien === 1 && res.resumen.aciertos === 50, `resumen: ${res.resumen.marcados} marcados, ${res.resumen.aciertos} % de aciertos`);
  ok(res.resumen.fps && res.resumen.fps.transiciones === 2, `fps en el resumen: promedio ${res.resumen.fps && res.resumen.fps.promedio}, p5 peor ${res.resumen.fps && res.resumen.fps.p5Peor}`);
  await p.click('#evCopy');
  const msg = await p.textContent('#evMsg');
  const json = await p.inputValue('#evJson');
  ok(msg.length > 0 && JSON.parse(json).resumen.marcados === 2, `Copiar muestra el JSON y avisa: «${msg}»`);
  await p.evaluate(() => { document.querySelector('#evJson').scrollTop = 0; });
  await p.screenshot({ path: R + '/docs/capturas/12/evaluacion-resultado.png' });

  // persistencia
  await p.reload(); await p.waitForFunction(() => window.__TIZA_READY, null, { timeout: 30000 });
  const n = await p.evaluate(() => Object.keys(window.__TIZA_EVAL.EV.marcas).length);
  ok(n === 2, 'las marcas sobreviven a la recarga (localStorage)');

  // borrar con dos clics, sin diálogos
  let dialogo = false; p.on('dialog', d => { dialogo = true; d.dismiss(); });
  await p.click('#evClear'); await p.click('#evClear');
  ok(!dialogo && await p.evaluate(() => Object.keys(window.__TIZA_EVAL.EV.marcas).length) === 0, 'Borrar con dos clics y sin diálogos');

  // sin localStorage (como en una vista previa): no se cae
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
  await preparar(p2);
  await p2.evaluate(async () => { await window.__TIZA_EVAL.evIr(0); window.__TIZA_EVAL.evMarcar('bien'); });
  ok(await p2.evaluate(() => window.__TIZA_EVAL.evResultado().resumen.marcados) === 1, 'funciona sin localStorage');

  // teléfono: el panel cabe sin desplazamiento horizontal
  const p3 = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await preparar(p3);
  const ancho = await p3.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 390, `en 390 px de ancho no hay desplazamiento horizontal (${ancho} px)`);
  await p3.evaluate(() => document.querySelector('#evPanel').scrollIntoView());
  await p3.screenshot({ path: R + '/docs/capturas/12/evaluacion-telefono.png' });

  await b.close();
  console.log(fallas ? `${fallas} fallas` : 'todo bien; capturas en docs/capturas/12/');
  process.exit(fallas ? 1 : 0);
})();

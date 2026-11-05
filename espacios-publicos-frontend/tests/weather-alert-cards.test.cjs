const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = resolve(__dirname, '../src/lib/weatherAlertPresentation.ts');
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled.outputText, filename);
const { getWeatherWindow, summarizeWeatherAlerts, formatWeatherDate, formatStartsIn } = loaded.exports;

const now = Date.parse('2026-11-02T21:00:00Z');
function alert(overrides = {}) {
  return { id: 'a1', status: 'CONFIRMED', suggestedCriticality: 'MEDIA', confirmedCriticality: 'ALTA',
    validFrom: '2026-11-02T20:00:00Z', validUntil: '2026-11-02T22:00:00Z', ...overrides };
}

test('la vigencia es inicio inclusivo y fin exclusivo; no equivale a cerrar la alerta', () => {
  const current = alert();
  assert.equal(getWeatherWindow(current, Date.parse(current.validFrom)).phase, 'active');
  assert.deepEqual(getWeatherWindow(current, now), { phase: 'active', progress: 50, startsInMinutes: 0 });
  assert.equal(getWeatherWindow(current, Date.parse(current.validUntil)).phase, 'expired');
  assert.equal(current.status, 'CONFIRMED');
});

test('una confirmada futura es proxima y no tiene progreso de vigencia', () => {
  const upcoming = alert({ validFrom: '2026-11-02T22:00:00Z', validUntil: '2026-11-03T00:00:00Z' });
  assert.deepEqual(getWeatherWindow(upcoming, now), { phase: 'upcoming', progress: 0, startsInMinutes: 60 });
  const summary = summarizeWeatherAlerts([upcoming], now);
  assert.equal(summary.activeCount, 0);
  assert.equal(summary.upcomingCount, 1);
});

test('no presenta pendientes, descartadas ni finalizadas como alertas vigentes', () => {
  const summary = summarizeWeatherAlerts([
    alert({ id: 'pending', status: 'PENDING' }), alert({ id: 'dismissed', status: 'DISMISSED' }),
    alert({ id: 'closed', status: 'FINALIZED' }), alert(),
  ], now);
  assert.deepEqual(summary.cards.map(item => item.id), ['a1']);
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.activeCount, 1);
});

test('muestra como maximo dos, ordena por criticidad y no modifica el listado original', () => {
  const input = [alert({ id: 'low', confirmedCriticality: 'BAJA' }),
    alert({ id: 'high' }), alert({ id: 'critical', confirmedCriticality: 'CRITICA' })];
  const previous = JSON.stringify(input);
  const summary = summarizeWeatherAlerts(input, now);
  assert.deepEqual(summary.cards.map(item => item.id), ['critical', 'high']);
  assert.equal(summary.totalRelevant, 3);
  assert.equal(JSON.stringify(input), previous);
});

test('a igual nivel prioriza la vigente sobre la proxima', () => {
  const summary = summarizeWeatherAlerts([
    alert({ id: 'later', validFrom: '2026-11-02T22:00:00Z', validUntil: '2026-11-03T00:00:00Z' }),
    alert({ id: 'active' }),
  ], now);
  assert.deepEqual(summary.cards.map(item => item.id), ['active', 'later']);
});

test('separa vencidas sin cierre y fechas invalidas sin declarar que son vigentes', () => {
  const summary = summarizeWeatherAlerts([
    alert({ validUntil: '2026-11-02T21:00:00Z' }), alert({ id: 'bad', validFrom: 'invalid' }),
    alert({ id: 'reversed', validUntil: '2026-11-01T00:00:00Z' }),
  ], now);
  assert.equal(summary.expiredCount, 1);
  assert.equal(summary.invalidCount, 2);
  assert.equal(summary.cards.length, 0);
  assert.equal(getWeatherWindow(alert(), NaN).phase, 'invalid');
});

test('la barra queda entre cero y cien y usa tiempo, no probabilidad', () => {
  assert.equal(getWeatherWindow(alert(), now - 24 * 60 * 60_000).progress, 0);
  assert.equal(getWeatherWindow(alert(), now + 24 * 60 * 60_000).progress, 100);
  assert.equal(getWeatherWindow(alert(), Date.parse('2026-11-02T21:59:59Z')).progress, 99);
});

test('formatea horarios en Buenos Aires y cuenta regresiva en espanol', () => {
  assert.match(formatWeatherDate('2026-11-02T21:00:00Z'), /18:00/);
  assert.equal(formatWeatherDate('bad'), 'Fecha no disponible');
  assert.equal(formatStartsIn(15), 'Comienza en 15 min');
  assert.equal(formatStartsIn(120), 'Comienza en 2 h');
  assert.equal(formatStartsIn(125), 'Comienza en 2 h 5 min');
  assert.equal(formatStartsIn(1500), 'Comienza en 1 d 1 h');
});

function renderCard(item) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MantineProvider } = require('@mantine/core');
  const { MemoryRouter } = require('react-router-dom');
  const componentFile = resolve(__dirname, '../src/components/WeatherAlertCard.tsx');
  const component = new Module(componentFile, module);
  component.filename = componentFile;
  component.paths = module.paths;
  const requireModule = component.require.bind(component);
  const measuresFile = resolve(__dirname, '../src/components/WeatherMeasuresButton.tsx');
  const measures = new Module(measuresFile, module);
  measures.filename = measuresFile;
  measures.paths = module.paths;
  const measuresRequire = measures.require.bind(measures);
  measures.require = id => id === '../lib/api' ? {} : id === '../lib/weatherAlertPresentation' ? loaded.exports : measuresRequire(id);
  measures._compile(ts.transpileModule(readFileSync(measuresFile, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, measuresFile);
  component.require = id => id === './WeatherMeasuresButton' ? measures.exports : id === '../lib/weatherAlertPresentation' ? loaded.exports : requireModule(id);
  const compiled = ts.transpileModule(readFileSync(componentFile, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  component._compile(compiled.outputText, componentFile);
  const data = { phenomenon: 'TORMENTA_ELECTRICA', zone: 'CABA', evidence: {
    provider: 'MANUAL', neighborhoods: ['MONSERRAT'], locations: [{ latitude: -34.6, longitude: -58.4 }],
    weatherCodes: [], evaluatedHours: 0,
  }, ...item };
  return renderToStaticMarkup(React.createElement(MantineProvider, { env: 'test' },
    React.createElement(MemoryRouter, null, React.createElement(component.exports.default, { alert: data, now }))));
}

test('renderiza una card vigente con encabezado, criticidad y detalle accesible', () => {
  const html = renderCard(alert({ confirmedCriticality: 'CRITICA' }));
  assert.match(html, /Tormenta eléctrica/);
  assert.match(html, /CRÍTICA/);
  assert.match(html, /Vigente ahora/);
  assert.match(html, /MONSERRAT/);
  assert.match(html, /50% de vigencia transcurrida/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls=/);
  assert.match(html, /Gestionar espacios y eventos/);
});

test('renderiza una proxima sin presentarla como vigente ni como probabilidad', () => {
  const html = renderCard(alert({ validFrom: '2026-11-02T22:00:00Z', validUntil: '2026-11-03T00:00:00Z' }));
  assert.match(html, /Próxima/);
  assert.match(html, /Comienza en 1 h/);
  assert.doesNotMatch(html, /Vigente ahora/);
  assert.doesNotMatch(html, /probabilidad de/);
});

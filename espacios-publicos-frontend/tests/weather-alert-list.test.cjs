const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(path, overrides = {}) {
  const filename = resolve(__dirname, path);
  const component = new Module(filename, module);
  component.filename = filename; component.paths = module.paths;
  const originalRequire = component.require.bind(component);
  component.require = id => id.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) } : overrides[id] || originalRequire(id);
  component._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return component.exports;
}
const presentation = load('../src/lib/weatherAlertPresentation.ts');
const helpers = load('../src/lib/weatherAlertList.ts');
const measures = load('../src/components/WeatherMeasuresButton.tsx', { '../lib/api': {}, '../lib/weatherAlertPresentation': presentation });
const component = load('../src/components/WeatherAlertsList.tsx', {
  '../lib/weatherAlertPresentation': presentation, '../lib/weatherAlertList': helpers, './WeatherMeasuresButton': measures,
});

const date = offset => new Date(Date.now() + offset * 3600_000).toISOString();
function alert(overrides = {}) {
  return { id: 'a1', phenomenon: 'TORMENTA_ELECTRICA', suggestedCriticality: 'ALTA', status: 'PENDING', zone: 'CABA',
    validFrom: date(-1), validUntil: date(3), evidence: { provider: 'OPEN_METEO', maxWindGustKmh: 62, accumulatedPrecipitationMm: 0,
      temperatureMinC: 19, temperatureMaxC: 26, neighborhoods: ['PALERMO'], locations: [{ latitude: -34.58, longitude: -58.42 }] }, ...overrides };
}
function render(alerts, overrides = {}) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MantineProvider } = require('@mantine/core');
  return renderToStaticMarkup(React.createElement(MantineProvider, { env: 'test' }, React.createElement(component.default, {
    alerts, loading: false, onMessage() {}, onConfirm() {}, onDismiss() {}, onUpdated() {}, ...overrides,
  })));
}

test('combina estado y criticidad sin cambiar el arreglo original', () => {
  const input = [alert(), alert({ id: 'a2', status: 'CONFIRMED', confirmedCriticality: 'MEDIA' }), alert({ id: 'a3', status: 'FINALIZED' })];
  const before = JSON.stringify(input);
  const result = helpers.filterWeatherAlertList(input, 'FINALIZED', 'ALTA');
  assert.deepEqual(result.items.map(item => item.id), ['a3']);
  assert.deepEqual(result.counts, { ALL: 2, PENDING: 1, CONFIRMED: 0, FINALIZED: 1, DISMISSED: 0 });
  assert.equal(JSON.stringify(input), before);
});
test('filtra usando la criticidad confirmada por encima de la sugerida', () => {
  assert.equal(helpers.filterWeatherAlertList([alert({ status: 'CONFIRMED', confirmedCriticality: 'BAJA' })], 'ALL', 'ALTA').items.length, 0);
});
test('mantiene confirmadas futuras y vencidas en el grupo administrativo confirmado', () => {
  const result = helpers.filterWeatherAlertList([alert({ status: 'CONFIRMED', validFrom: date(3), validUntil: date(5) }),
    alert({ id: 'expired', status: 'CONFIRMED', validFrom: date(-5), validUntil: date(-3) })], 'CONFIRMED', 'ALL');
  assert.equal(result.items.length, 2);
});
test('dato ausente no se confunde con cero', () => {
  assert.equal(helpers.weatherMeasurement(undefined, 'mm'), 'Sin dato');
  assert.equal(helpers.weatherMeasurement(NaN, 'mm'), 'Sin dato');
  assert.equal(helpers.weatherMeasurement(0, 'mm'), '0 mm');
});
test('renderiza fechas completas, filtros y acciones pendientes', () => {
  const item = alert();
  const html = render([item]);
  assert.match(html, /Filtrar alertas por estado administrativo/);
  assert.match(html, /Criticidad/);
  assert.match(html, /value="Todas"/);
  assert.doesNotMatch(html, /Todas las criticidades/);
  assert.match(html, /Confirmar alerta/);
  assert.match(html, /Descartar/);
  assert.match(html, /INICIO/);
  assert.match(html, /FIN PREVISTO/);
  assert.ok(html.includes(presentation.formatWeatherDate(item.validFrom)));
  assert.ok(html.includes(presentation.formatWeatherDate(item.validUntil)));
  assert.doesNotMatch(html, /Gestionar espacios y eventos/);
});
test('confirmada próxima no se presenta como vigente ni tiene acciones de pendiente', () => {
  const html = render([alert({ status: 'CONFIRMED', validFrom: date(3), validUntil: date(5) })]);
  assert.match(html, /Próxima/);
  assert.match(html, /Gestionar espacios y eventos/);
  assert.match(html, /Finalizar/);
  assert.doesNotMatch(html, /Vigente ahora|Confirmar alerta/);
});
test('confirmada vigente omite etiqueta redundante y mantiene las acciones', () => {
  const html = render([alert({ status: 'CONFIRMED' })]);
  assert.doesNotMatch(html, /Vigente ahora/);
  assert.match(html, /Confirmada/);
  assert.match(html, /Gestionar espacios y eventos/);
  assert.match(html, /Finalizar/);
  assert.match(html, /vigencia transcurrida/);
  assert.equal((html.match(/class="statusBadge /g) || []).length, 2);
});
test('finalizada se presenta en gris y conserva consulta y revisión de medidas', () => {
  const html = render([alert({ status: 'FINALIZED', finalizedAt: date(-1) })]);
  assert.match(html, /row closed/);
  assert.match(html, /Cierre registrado/);
  assert.match(html, /Revisar medidas pendientes/);
  assert.match(html, /Ver mensaje/);
  assert.doesNotMatch(html, /Vigente ahora|Confirmar alerta|Gestionar espacios y eventos/);
});
test('descartada conserva el motivo sin acciones de publicación', () => {
  const html = render([alert({ status: 'DISMISSED', dismissalReason: 'Falso positivo SMN' })]);
  assert.match(html, /Falso positivo SMN/);
  assert.match(html, /Consultar información y motivo/);
  assert.doesNotMatch(html, /Confirmar alerta|Gestionar espacios y eventos/);
});
test('una lista vacía y una carga no muestran alertas inventadas', () => {
  assert.match(render([]), /Todavía no se detectaron alertas climáticas/);
  assert.match(render([], { loading: true }), /Cargando alertas climáticas/);
});

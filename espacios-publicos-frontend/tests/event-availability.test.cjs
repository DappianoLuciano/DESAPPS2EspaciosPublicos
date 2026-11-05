const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, overrides = {}) {
  const filename = resolve(__dirname, file);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = id => overrides[id] || originalRequire(id);
  loaded._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return loaded.exports;
}
const availability = load('../src/lib/eventAvailability.ts');
const { eventAvailability } = availability;

test('solo suspendidos y cancelados desaturan la imagen y muestran estado explícito', () => {
  for (const status of ['ACTIVE', 'ACTIVE_FULL']) {
    assert.equal(eventAvailability({ status }).unavailable, false);
    assert.equal(eventAvailability({ status }).imageStyle, undefined);
  }
  for (const status of ['SUSPENDED', 'CANCELLED']) {
    const state = eventAvailability({ status, statusReason: '  Alerta climática  ' });
    assert.equal(state.unavailable, true);
    assert.match(state.imageStyle.filter, /grayscale\(1\)/);
    assert.equal(state.reason, 'Alerta climática');
  }
  assert.equal(eventAvailability({ status: 'SUSPENDED' }).label, 'Suspendido temporalmente');
  assert.equal(eventAvailability({ status: 'CANCELLED' }).label, 'Cancelado definitivamente');
});

function render(component, props) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MantineProvider } = require('@mantine/core');
  return renderToStaticMarkup(React.createElement(MantineProvider, { env: 'test' }, React.createElement(component, props)));
}
const notice = load('../src/components/EventAvailabilityNotice.tsx', { '../lib/eventAvailability': availability }).default;
const card = load('../src/components/EventCard.tsx', { '../lib/eventAvailability': availability }).default;
test('el aviso conserva inscriptos en suspensión y no promete reanudación en cancelación', () => {
  const suspended = render(notice, { event: { status: 'SUSPENDED', statusReason: 'Alerta climática' } });
  assert.match(suspended, /Las inscripciones se conservan/);
  assert.match(suspended, /Alerta climática/);
  const cancelled = render(notice, { event: { status: 'CANCELLED' } });
  assert.match(cancelled, /El evento no se realizará/);
  assert.doesNotMatch(cancelled, /Las inscripciones se conservan/);
  assert.doesNotMatch(render(notice, { event: { status: 'ACTIVE' } }), /role="alert"/);
});
test('la card pública mantiene navegación, fecha e imagen con estado y motivo legibles', () => {
  const event = { title: 'Feria', status: 'SUSPENDED', statusReason: 'Tormenta en la zona',
    startDate: '2030-11-03T15:00:00Z', tags: [], category: 'Cultura', description: 'Actividad',
    publicSpace: { name: 'Plaza', zone: 'Caballito' } };
  const html = render(card, { event, onClick() {} });
  assert.match(html, /Suspendido temporalmente/);
  assert.match(html, /Tormenta en la zona/);
  assert.match(html, /grayscale\(1\)/);
  assert.match(html, /Feria/);
});

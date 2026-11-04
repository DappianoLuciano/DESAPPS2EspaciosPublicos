const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = resolve(__dirname, '../src/lib/towIntervention.ts');
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled.outputText, filename);
const {
  createTowSimulationForm,
  normalizePlate,
  summarizeTowInterventions,
  toMobilitySimulationPayload,
} = loaded.exports;

test('normaliza patentes antes de solicitar la grua', () => {
  assert.equal(normalizePlate(' ab-123 cd '), 'AB123CD');
  assert.equal(normalizePlate('AA 001 AA'), 'AA001AA');
});

test('crea identificadores diferentes para reclamo y correlacion', () => {
  const form = createTowSimulationForm(1793800000000);
  assert.equal(form.reclamoId, 'reclamo-demo-1793800000000');
  assert.equal(form.correlationId, 'corr-demo-1793800000000');
  assert.notEqual(form.reclamoId, form.correlationId);
});

test('construye el contrato completo para simular Movilidad', () => {
  const form = {
    ...createTowSimulationForm(1),
    reclamoId: ' reclamo-1 ',
    correlationId: ' corr-1 ',
    direccion: ' Av. Corrientes 1000 ',
    barrio: ' San Nicolas ',
    requiereGrua: true,
  };
  const payload = toMobilitySimulationPayload(form, 1793800000000);

  assert.deepEqual(payload, {
    reclamoId: 'reclamo-1',
    correlationId: 'corr-1',
    direccion: 'Av. Corrientes 1000',
    barrio: 'San Nicolas',
    latitud: -34.6037,
    longitud: -58.3816,
    impactoCirculacion: 'ALTO',
    desvioSugerido: 'Desviar por Av. Córdoba',
    afectaCiclovia: true,
    requiereIntervencionInmediata: true,
    requiereGrua: true,
    estacionesAfectadasIds: [],
    evaluadoAt: 1793800000000,
  });
});

test('conserva requiereGrua en falso para la resolucion automatica', () => {
  const form = { ...createTowSimulationForm(1), requiereGrua: false };
  assert.equal(toMobilitySimulationPayload(form, 2).requiereGrua, false);
});

test('resume correctamente los estados mostrados en los controles', () => {
  const items = [
    { status: 'PENDING' },
    { status: 'TOW_REQUESTED' },
    { status: 'COMPLETED' },
    { status: 'COMPLETED' },
  ];
  assert.deepEqual(summarizeTowInterventions(items), {
    total: 4,
    pending: 1,
    requested: 1,
    completed: 2,
  });
});

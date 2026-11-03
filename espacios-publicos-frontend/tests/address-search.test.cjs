const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Usa el compilador existente, sin agregar un runner ni dependencias al frontend.
const filename = resolve(__dirname, '../src/lib/addressSearch.ts');
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled.outputText, filename);
const { parseAddressMatches, createAddressSearch } = loaded.exports;

const match = { lat: '-34.60979', lon: '-58.38172', display_name: 'Lima 123, Buenos Aires, Argentina',
  address: { suburb: 'Monserrat', city: 'Buenos Aires' } };

test('resuelve coordenadas y barrio desde una direccion', () => {
  assert.deepEqual(parseAddressMatches([match]), [{ id: '0', label: match.display_name,
    latitude: -34.60979, longitude: -58.38172, zone: 'Monserrat' }]);
});

test('descarta resultados sin coordenadas validas, sin inventar un punto', () => {
  const invalid = ['', 'NaN', '34xyz', 'Infinity', '91'];
  assert.deepEqual(parseAddressMatches(invalid.map(lat => ({ ...match, lat }))), []);
  assert.deepEqual(parseAddressMatches([{ ...match, lon: '181' }, { ...match, display_name: '' }, null]), []);
  assert.throws(() => parseAddressMatches({ error: 'bad response' }), /respuesta inválida/);
});

test('mantiene varias coincidencias para elegir sin tomar arbitrariamente la primera', () => {
  const matches = parseAddressMatches([match, { ...match, display_name: 'Lima 123, otra localidad' }]);
  assert.equal(matches.length, 2);
  assert.notEqual(matches[0].id, matches[1].id);
});

test('busca solo al invocar y reutiliza consultas equivalentes durante cinco minutos', async () => {
  let requests = 0;
  let time = 0;
  const search = createAddressSearch(async url => {
    requests++;
    const params = new URL(url).searchParams;
    assert.equal(params.get('q'), 'Lima 123, Buenos Aires');
    assert.equal(params.get('countrycodes'), 'ar');
    assert.equal(params.get('addressdetails'), '1');
    return new Response(JSON.stringify([match]));
  }, () => time);
  assert.equal(requests, 0);
  const first = await search(' Lima 123, Buenos Aires ');
  assert.deepEqual(await search('lima 123, buenos aires'), first);
  assert.equal(requests, 1);
  time = 300_001;
  await search('Lima 123, Buenos Aires');
  assert.equal(requests, 2);
});

test('limita consultas diferentes a una por segundo', async () => {
  let time = 0;
  let requests = 0;
  const search = createAddressSearch(async () => {
    requests++;
    return new Response('[]');
  }, () => time);
  await search('Lima 123');
  await assert.rejects(search('Lima 456'), /un segundo/);
  time = 1000;
  assert.deepEqual(await search('Lima 456'), []);
  assert.equal(requests, 2);
});

test('errores de red y cancelaciones no devuelven coordenadas de otra direccion', async () => {
  const failing = createAddressSearch(async () => { throw new Error('network'); });
  await assert.rejects(failing('Lima 123'), /No se pudo consultar/);
  const rejected = createAddressSearch(async () => new Response('', { status: 429 }));
  await assert.rejects(rejected('Lima 123'), /no está disponible/);
  const controller = new AbortController();
  controller.abort();
  const search = createAddressSearch(async () => { throw new Error('No debe consultar'); });
  await assert.rejects(search('Lima 123', controller.signal), { name: 'AbortError' });
});

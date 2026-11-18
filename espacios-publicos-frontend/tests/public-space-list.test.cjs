const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(path, overrides = {}) {
  const filename = resolve(__dirname, path), mod = new Module(filename, module);
  mod.filename = filename; mod.paths = module.paths;
  const original = mod.require.bind(mod);
  mod.require = id => id.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, {get: (_, key) => key}) } : overrides[id] || original(id);
  mod._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX} }).outputText, filename);
  return mod.exports;
}
const lib = load('../src/lib/publicSpaceList.ts');
const now = Date.parse('2026-11-17T21:00:00-03:00');
const period = (start, end) => ({alertId:'a1',validFrom:new Date(now+start*3600000).toISOString(),validUntil:new Date(now+end*3600000).toISOString()});
const base = {id:'s1',name:'El Cultural San Martín',address:'Sarmiento 1551',zone:'San Nicolás',capacity:900,status:'ENABLED',exposure:'MIXED',category:'SALON'};
const all = {status:'ALL',category:'ALL',exposure:'ALL',search:''};
test('vigencia inclusiva al inicio y exclusiva al fin sin alterar estado general',()=>{
  const space={...base,weatherRestrictions:[period(0,1),period(-1,0),period(1,2)]};
  const result=lib.spaceWeatherState(space,now);
  assert.equal(result.active.length,1);assert.equal(result.upcoming.length,1);assert.equal(space.status,'ENABLED');
});
test('fechas inválidas y períodos vencidos no bloquean visualmente',()=>{
  assert.equal(lib.spaceWeatherState({...base,weatherRestrictions:[period(-2,-1),{validFrom:'bad',validUntil:'bad'},period(2,1)]},now).active.length,0);
  assert.deepEqual(lib.spaceWeatherState(base,now),{active:[],upcoming:[]});
});
test('combina búsqueda sin tildes con categoría exposición y estado',()=>{
  const rows=[base,{...base,id:'s2',category:'PLAZA',exposure:'OUTDOOR'}];
  assert.equal(lib.filterPublicSpaces(rows,{...all,search:'san nicolas',category:'SALON',exposure:'MIXED',status:'ENABLED'},now).items.length,1);
});
test('restricción programada no se cuenta como vigente y no muta la lista',()=>{
  const rows=[{...base,weatherRestrictions:[period(1,2)]},{...base,id:'s2',weatherRestrictions:[period(-1,2)]}];
  const before=JSON.stringify(rows),result=lib.filterPublicSpaces(rows,{...all,status:'RESTRICTED'},now);
  assert.deepEqual(result.items.map(row=>row.id),['s2']);assert.equal(result.counts.ENABLED,2);assert.equal(result.counts.RESTRICTED,1);assert.equal(JSON.stringify(rows),before);
});
test('sin categoría y sin resultados se filtran explícitamente',()=>{
  assert.equal(lib.filterPublicSpaces([{...base,category:null}],{...all,category:'NONE'},now).items.length,1);
  assert.equal(lib.filterPublicSpaces([base],{...all,search:'inexistente'},now).items.length,0);
});
test('tabla conserva columnas separadas textos completos y acciones accesibles',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{MantineProvider}=require('@mantine/core');
  const presentation=load('../src/lib/weatherAlertPresentation.ts');
  const component=load('../src/components/PublicSpacesTable.tsx',{'../lib/api':{PUBLIC_SPACE_CATEGORY_LABELS:{SALON:'Salón'}},'../lib/publicSpaceList':lib,'../lib/weatherAlertPresentation':presentation});
  const html=renderToStaticMarkup(React.createElement(MantineProvider,{env:'test'},React.createElement(component.default,{spaces:[base],loading:false,onEdit(){},onToggle(){},onDelete(){},onRefresh(){}})));
  for(const text of ['Habilitado','Estado','Categoría','Exposición','Editar El Cultural San Martín','Deshabilitar El Cultural San Martín','Eliminar El Cultural San Martín'])assert.ok(html.includes(text),text);
  assert.match(html,/min-width:calc\(6[0-9.]+rem/);
});

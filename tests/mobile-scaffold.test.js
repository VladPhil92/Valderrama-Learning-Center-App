import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
function read(path) { return readFileSync(new URL(path, root), 'utf8'); }

test('app Expo cuenta con identificadores separados para Android/iOS', () => {
  const app = JSON.parse(read('mobile/app.json')).expo;
  const pack = JSON.parse(read('mobile/package.json'));
  assert.equal(app.ios.bundleIdentifier, 'com.ctgone.valderramalearningcenter');
  assert.equal(app.android.package, 'com.ctgone.valderramalearningcenter');
  assert.ok(pack.dependencies.expo.startsWith('~58.'));
  assert.ok(pack.dependencies['react-native'].startsWith('0.88.'));
});

test('cliente móvil tiene un contrato para catálogo y nunca reserva sin servidor', () => {
  const api = read('mobile/src/api.ts');
  const ui = read('mobile/App.tsx');
  assert.match(api, /v1\/tutors/);
  assert.match(api, /HTTPS fuera del desarrollo local/);
  assert.match(ui, /VERSIÓN PREOPERATIVA/);
  assert.match(ui, /las reservas están deshabilitadas/);
  assert.doesNotMatch(ui, /fetch\([^)]*bookings/);
  assert.ok(existsSync(new URL('docs/APP_MOVIL_SINCRONIZACION.md', root)));
});

test('documentación prohíbe considerar sincronizadas tres interfaces independientes', () => {
  const doc = read('docs/APP_MOVIL_SINCRONIZACION.md');
  assert.match(doc, /fuente única de verdad/i);
  assert.match(doc, /Idempotencia/i);
  assert.match(doc, /409 Conflict/);
});

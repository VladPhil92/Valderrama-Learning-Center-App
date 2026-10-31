import test from 'node:test';
import assert from 'node:assert/strict';
import { tutors } from '../src/data.js';
import { filterTutors, canRequestClassForMinor } from '../src/filters.js';

test('filtra una materia con acentos y sin distinguir mayúsculas', () => {
  const r = filterTutors(tutors, { search: 'MATEMATICAS' });
  assert.ok(r.length >= 1);
  assert.ok(r.some(t => t.id === 'demo-01'));
});
test('respeta la modalidad y el nivel de manera conjunta', () => {
  const r = filterTutors(tutors, { level: 'adultos', mode: 'presencial' });
  assert.ok(r.length > 0);
  assert.ok(r.every(t => t.levels.includes('adultos') && t.modes.includes('presencial')));
});
test('solo adulto o representante autorizado puede reservar', () => {
  assert.equal(canRequestClassForMinor('adulto', false), true);
  assert.equal(canRequestClassForMinor('menor', false), false);
  assert.equal(canRequestClassForMinor('menor', true), true);
  assert.equal(canRequestClassForMinor('', true), false);
});

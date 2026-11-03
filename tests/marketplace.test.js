import test from 'node:test';
import assert from 'node:assert/strict';
import {createEmptyMarketplace, isTutorEligible, requestClass, decideClass,
  rescheduleClass, completeClass, reviewClass, reportIncident, getSummary} from '../src/marketplace.js';

const now = new Date('2026-11-03T12:00:00.000Z');
const at = '2026-11-05T15:00:00.000Z';
const next = '2026-11-06T15:00:00.000Z';
const tutors = [
  {id:'t1',modes:['virtual'],verification:'approved_adults',safeguardingApproved:false},
  {id:'t2',modes:['virtual','presencial'],verification:'approved_minors',safeguardingApproved:true},
];
const state = () => createEmptyMarketplace(tutors);
const adult = {tutorId:'t1',requesterId:'adult-1',requesterRole:'adult',audience:'adult',
  subject:'Física',mode:'virtual',startsAt:at,consent:true};
const guardian = {...adult,tutorId:'t2',requesterRole:'guardian',
  requesterId:'parent-1',audience:'minor',guardianVerified:true};

test('identidad docente y habilitación de menores no equivalen a una declaración',()=>{
  assert.equal(isTutorEligible(tutors[0],'adult'),true);
  assert.equal(isTutorEligible(tutors[0],'minor'),false);
  assert.equal(isTutorEligible(tutors[1],'minor'),true);
  assert.throws(()=>requestClass(state(),{...guardian,guardianVerified:false},now),/verificada/);
  assert.throws(()=>requestClass(state(),{...guardian,tutorId:'t1'},now),/habilitado/);
});
test('solicitar sin datos de menor, validar agenda y evitar doble reserva',()=>{
  const {state:s,record} = requestClass(state(),adult,now);
  assert.equal(record.status,'pending');
  assert.equal(Object.hasOwn(record,'learnerName'),false);
  assert.equal(getSummary(s).pending,1);
  assert.throws(()=>requestClass(s,adult,now),/reservado/);
  assert.throws(()=>requestClass(s,{...adult,startsAt:'2026-01-01T00:00:00Z'},now),/antelación/);
  assert.throws(()=>requestClass(s,{...adult,mode:'presencial'},now),/Modalidad/);
});
test('solo tutor asignado decide y la reserva se confirma',()=>{
  const {state:s,record} = requestClass(state(),adult,now);
  assert.throws(()=>decideClass(s,record.id,'t2','accept'),/responsable/);
  const accepted = decideClass(s,record.id,'t1','accept');
  assert.equal(getSummary(accepted).confirmed,1);
  assert.throws(()=>decideClass(accepted,record.id,'t1','accept'),/pendiente/);
});
test('reprogramación vuelve a pendiente y evita colisiones',()=>{
  const {state:s,record} = requestClass(state(),adult,now);
  const moved = rescheduleClass(decideClass(s,record.id,'t1','accept'),record.id,'adult-1',next,now);
  assert.equal(moved.bookings[0].status,'pending');
  assert.equal(moved.bookings[0].startsAt,next);
  assert.throws(()=>rescheduleClass(moved,record.id,'intruder',at,now),/autorizada/);
});
test('finalización temporalmente válida, valoración única y moderada',()=>{
  const {state:s,record} = requestClass(state(),adult,now);
  const accepted = decideClass(s,record.id,'t1','accept');
  assert.throws(()=>completeClass(accepted,record.id,'t1',now),/no ha finalizado/);
  const done = completeClass(accepted,record.id,'t1',new Date('2026-11-05T16:01:00Z'));
  assert.throws(()=>reviewClass(done,record.id,'intruder',5),/solicitó/);
  const {state:reviewed,review} = reviewClass(done,record.id,'adult-1',5,'Excelente');
  assert.equal(review.status,'pending_moderation');
  assert.throws(()=>reviewClass(reviewed,record.id,'adult-1',5),/ya tiene/);
});
test('reporte de protección congela sesión e impide valorar o finalizar',()=>{
  const {state:s,record} = requestClass(state(),guardian,now);
  const confirmed = decideClass(s,record.id,'t2','accept');
  const {state:hold} = reportIncident(confirmed,record.id,'parent-1','safeguarding');
  assert.equal(hold.bookings[0].status,'on_hold');
  assert.equal(getSummary(hold).incidents,1);
  assert.throws(()=>completeClass(hold,record.id,'t2',new Date('2026-11-05T19:00:00Z')),/confirmada/);
  assert.throws(()=>reviewClass(hold,record.id,'parent-1',5),/completadas/);
  assert.throws(()=>reportIncident(hold,record.id,'parent-1','safeguarding'),/abierto/);
});

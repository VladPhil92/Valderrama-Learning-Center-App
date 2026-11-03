import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createEmptyMarketplace } from '../src/marketplace.js';
import { tutors as sampleTutors } from '../src/data.js';

function fakeTutors() {
  return sampleTutors.map((t) => ({
    ...t, verification: 'approved_adults', safeguardingApproved: false,
  }));
}

export class ConflictError extends Error {
  constructor(message) { super(message); this.name = 'ConflictError'; }
}
export class PreconditionError extends Error {
  constructor(message) { super(message); this.name = 'PreconditionError'; }
}

/**
 * Servidor de prueba exclusivamente LOCAL. SQLite aporta persistencia,
 * transacciones atómicas y una revisión monotónica compartida.
 * No almacena identidades ni alumnos reales.
 */
export function openDemoStore(filename = ':memory:') {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA busy_timeout=3000;
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS demo_state (
      id INTEGER PRIMARY KEY CHECK (id=1),
      revision INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS demo_idempotency (
      request_key TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      reply TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS demo_events (
      revision INTEGER PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      operation TEXT NOT NULL
    );
  `);
  const initial = createEmptyMarketplace(fakeTutors());
  db.prepare('INSERT OR IGNORE INTO demo_state(id,revision,updated_at,payload) VALUES (1,0,?,?)')
    .run(new Date().toISOString(), JSON.stringify(initial));

  function snapshot() {
    const row = db.prepare('SELECT revision,updated_at,payload FROM demo_state WHERE id=1').get();
    return {
      demo: true, revision: row.revision, updatedAt: row.updated_at,
      state: JSON.parse(row.payload),
    };
  }

  function publicCatalog() {
    const value = snapshot();
    return {
      revision: value.revision, source: 'demo', demo: true,
      items: value.state.tutors.map(({id,name,specialty,subjects,levels,modes}) =>
        ({id,name,specialty,subjects,levels,modes})),
    };
  }

  function mutate({revision, key, method, payload, operation, transition}) {
    if (!Number.isSafeInteger(revision) || revision < 0) {
      throw new PreconditionError('Se requiere If-Match con revisión numérica.');
    }
    if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{12,100}$/.test(key)) {
      throw new PreconditionError('Se requiere Idempotency-Key válido (12-100 caracteres).');
    }
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({method,payload})).digest('hex');
    db.exec('BEGIN IMMEDIATE');
    try {
      const previous = db.prepare('SELECT fingerprint,reply FROM demo_idempotency WHERE request_key=?').get(key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new ConflictError('Clave de idempotencia reutilizada con datos diferentes.');
        db.exec('COMMIT');
        return JSON.parse(previous.reply);
      }
      const current = snapshot();
      if (current.revision !== revision) throw new ConflictError('Revisión desactualizada; sincronice y repita.');
      const result = transition(current.state);
      const next = result?.state ?? result;
      if (!next || !Array.isArray(next.bookings)) throw new Error('Transición inválida');
      const newRevision = current.revision + 1;
      const updatedAt = new Date().toISOString();
      const reply = {
        demo: true, revision: newRevision, updatedAt,
        record: result?.record ?? result?.review ?? result?.incident ?? null,
      };
      db.prepare('UPDATE demo_state SET revision=?, updated_at=?, payload=? WHERE id=1')
        .run(newRevision, updatedAt, JSON.stringify(next));
      db.prepare('INSERT INTO demo_events(revision,occurred_at,operation) VALUES(?,?,?)')
        .run(newRevision, updatedAt, operation);
      db.prepare('INSERT INTO demo_idempotency(request_key,fingerprint,reply) VALUES(?,?,?)')
        .run(key, fingerprint, JSON.stringify(reply));
      db.exec('COMMIT');
      return reply;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  return { snapshot, publicCatalog, mutate, close: () => db.close() };
}

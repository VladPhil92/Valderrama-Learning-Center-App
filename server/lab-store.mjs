import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const DURATION = 60 * 60 * 1000;
const SESSION_TIME = 8 * 60 * 60 * 1000;
const ROLES = new Set(['adult', 'guardian', 'tutor']);
const SUBJECTS = new Set(['matematicas', 'ingles', 'ciencias', 'programacion', 'humanidades']);
const ACTIVE = new Set(['pending', 'confirmed']);

export class LabError extends Error {
  constructor(status, message) { super(message); this.name = 'LabError'; this.status = status; }
}
function reject(status, message) { throw new LabError(status, message); }
function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function passwordHash(password, salt) {
  return scryptSync(password, Buffer.from(salt, 'hex'), 64, {N:16384,r:8,p:1}).toString('hex');
}
function publicUser(row) {
  return {
    id: row.id, username: row.username, role: row.role,
    displayName: 'Cuenta de prueba #' + row.id,
    verification: 'unverified_demo',
    guardianStatus: row.role === 'guardian' ? 'pending_real_verification' : undefined,
    revision: row.revision,
  };
}
function validUsername(username) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{4,32}$/.test(username)) reject(422,'Usuario ficticio inválido: 4-32 caracteres.');
  return username.toLowerCase();
}
function validPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) reject(422,'Contraseña: 12-128 caracteres.');
}
function validRole(role, subject) {
  if (!ROLES.has(role)) reject(422,'Rol de demostración no permitido.');
  if (role === 'tutor' && !SUBJECTS.has(subject)) reject(422,'Seleccione una especialidad de prueba.');
}
function one(db, sql, ...args) { return db.prepare(sql).get(...args); }

export function createLabStore(db) {
  db.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS lab_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('adult','guardian','tutor')),
      subject TEXT,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      revision INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lab_sessions (
      token_hash TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES lab_accounts(id),
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS lab_sessions_account_idx ON lab_sessions(account_id);
    CREATE TABLE IF NOT EXISTS lab_bookings (
      id TEXT PRIMARY KEY,
      requester_id INTEGER NOT NULL REFERENCES lab_accounts(id),
      tutor_id INTEGER NOT NULL REFERENCES lab_accounts(id),
      subject TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode='virtual'),
      starts_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','confirmed','rejected','cancelled')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS lab_booking_tutor_idx ON lab_bookings(tutor_id,starts_at,status);
    CREATE INDEX IF NOT EXISTS lab_booking_requester_idx ON lab_bookings(requester_id);
    CREATE TABLE IF NOT EXISTS lab_operations (
      account_id INTEGER NOT NULL REFERENCES lab_accounts(id),
      request_key TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      response_json TEXT NOT NULL,
      PRIMARY KEY(account_id,request_key)
    );
  `);

  function register({username,password,role,subject,confirmDemo}) {
    if (confirmDemo !== true) reject(422,'Debe confirmar que usará exclusivamente datos ficticios.');
    const cleanName=validUsername(username);
    validPassword(password);
    validRole(role,subject);
    if (one(db,'SELECT COUNT(*) AS count FROM lab_accounts').count >= 100) reject(429,'Límite de cuentas de prueba alcanzado.');
    const salt=randomBytes(16).toString('hex');
    const hashed=passwordHash(password,salt);
    try {
      const result=db.prepare(`INSERT INTO lab_accounts
        (username,role,subject,password_salt,password_hash,created_at)
        VALUES (?,?,?,?,?,?)`).run(cleanName,role,role==='tutor'?subject:null,salt,hashed,new Date().toISOString());
      return publicUser(one(db,'SELECT * FROM lab_accounts WHERE id=?',result.lastInsertRowid));
    } catch (error) {
      if (String(error.message).includes('UNIQUE constraint failed')) reject(409,'Usuario de prueba ya registrado.');
      throw error;
    }
  }

  function login({username,password}) {
    const cleanName=validUsername(username);
    validPassword(password);
    const user=one(db,'SELECT * FROM lab_accounts WHERE username=?',cleanName);
    if (!user) {
      // Igualar parte del coste, sin revelar existencia del usuario.
      passwordHash(password,'0'.repeat(32));
      reject(401,'Credenciales incorrectas.');
    }
    if (user.locked_until && new Date(user.locked_until).getTime()>Date.now()) {
      reject(429,'Cuenta de prueba temporalmente bloqueada.');
    }
    const actual=Buffer.from(passwordHash(password,user.password_salt),'hex');
    const expected=Buffer.from(user.password_hash,'hex');
    if (actual.length!==expected.length || !timingSafeEqual(actual,expected)) {
      const attempts=user.failed_attempts+1;
      const locked=attempts>=5 ? new Date(Date.now()+5*60000).toISOString() : null;
      db.prepare('UPDATE lab_accounts SET failed_attempts=?, locked_until=? WHERE id=?')
        .run(attempts,locked,user.id);
      reject(401,'Credenciales incorrectas.');
    }
    db.prepare('UPDATE lab_accounts SET failed_attempts=0,locked_until=NULL WHERE id=?').run(user.id);
    const token=randomBytes(32).toString('base64url');
    const expiresAt=new Date(Date.now()+SESSION_TIME).toISOString();
    db.prepare('INSERT INTO lab_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)')
      .run(digest(token),user.id,expiresAt);
    return {token,expiresAt,user:publicUser(user),demo:true};
  }

  function authenticate(token) {
    if (typeof token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) reject(401,'Sesión requerida.');
    const row=one(db,`SELECT a.* FROM lab_sessions s
      INNER JOIN lab_accounts a ON a.id=s.account_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>?`,
      digest(token),new Date().toISOString());
    if (!row) reject(401,'Sesión revocada, expirada o inválida.');
    return publicUser(row);
  }

  function logout(token, all=false) {
    const user=authenticate(token);
    const now=new Date().toISOString();
    if (all) db.prepare('UPDATE lab_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL')
      .run(now,user.id);
    else db.prepare('UPDATE lab_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL')
      .run(now,digest(token));
    return {ok:true,demo:true};
  }

  function tutors() {
    return db.prepare(`SELECT id,subject FROM lab_accounts WHERE role='tutor' ORDER BY id`).all()
      .map(row=>({id:row.id,displayName:'Docente de prueba #'+row.id,
        specialty:row.subject,subjects:[row.subject],modes:['virtual'],
        verification:'unverified_demo',eligibleForMinors:false}));
  }

  function snapshot(userId) {
    const account=one(db,'SELECT * FROM lab_accounts WHERE id=?',userId);
    if (!account) reject(401,'Cuenta desconocida.');
    const bookings=db.prepare(`SELECT id,requester_id AS requesterId,tutor_id AS tutorId,
      subject,mode,starts_at AS startsAt,status,created_at AS createdAt
      FROM lab_bookings WHERE requester_id=? OR tutor_id=? ORDER BY created_at DESC,id DESC`)
      .all(userId,userId);
    return {demo:true,revision:account.revision,user:publicUser(account),bookings};
  }

  function change({userId,key,revision,operation,payload}) {
    if (typeof key!=='string' || !/^[a-zA-Z0-9_-]{12,100}$/.test(key)) reject(428,'Falta Idempotency-Key válida.');
    if (!Number.isSafeInteger(revision) || revision<0) reject(428,'Falta If-Match válido.');
    const fingerprint=digest(JSON.stringify({operation,payload}));
    db.exec('BEGIN IMMEDIATE');
    try {
      const old=one(db,'SELECT * FROM lab_operations WHERE account_id=? AND request_key=?',userId,key);
      if (old) {
        if (old.fingerprint!==fingerprint) reject(409,'Clave de idempotencia utilizada para otra operación.');
        db.exec('COMMIT');return JSON.parse(old.response_json);
      }
      const actor=one(db,'SELECT * FROM lab_accounts WHERE id=?',userId);
      if (!actor || actor.revision!==revision) reject(409,'Revisión desactualizada; sincronice de nuevo.');
      let updated;
      let participants=[];
      if (operation==='request') {
        if (!['adult','guardian'].includes(actor.role)) reject(403,'Solo cuentas adultas pueden solicitar tutorías.');
        if (payload?.audience!=='adult' || payload?.confirmDemo!==true) reject(403,'Operaciones con menores no habilitadas.');
        const tutor=one(db,'SELECT * FROM lab_accounts WHERE id=?',payload?.tutorId);
        if (!tutor || tutor.role!=='tutor') reject(422,'Docente de prueba inválido.');
        if (payload.mode!=='virtual') reject(422,'Sólo se admiten tutorías virtuales ficticias.');
        if (typeof payload.subject!=='string' || payload.subject.trim().length<2 || payload.subject.length>100)
          reject(422,'Materia inválida.');
        if (typeof payload.startsAt!=='string' || !Number.isFinite(Date.parse(payload.startsAt)))
          reject(422,'Fecha inválida.');
        const start=new Date(payload.startsAt).getTime();
        if (start<=Date.now()+15*60000 || start>=Date.now()+90*86400000) reject(422,'Fecha fuera de la agenda de 90 días.');
        const iso=new Date(start).toISOString();
        const conflicts=one(db,`SELECT id FROM lab_bookings WHERE tutor_id=?
          AND status IN ('pending','confirmed') AND starts_at>? AND starts_at<? LIMIT 1`,
          tutor.id,new Date(start-DURATION).toISOString(),new Date(start+DURATION).toISOString());
        if (conflicts) reject(409,'Conflicto de horario: docente ya solicitado.');
        const id='lab-'+randomUUID(),createdAt=new Date().toISOString();
        db.prepare(`INSERT INTO lab_bookings(id,requester_id,tutor_id,subject,mode,starts_at,status,created_at)
          VALUES(?,?,?,?,?,?,?,?)`).run(id,actor.id,tutor.id,payload.subject.trim(),'virtual',iso,'pending',createdAt);
        updated=id;participants=[actor.id,tutor.id];
      } else if (['accept','reject','cancel'].includes(operation)) {
        const record=one(db,'SELECT * FROM lab_bookings WHERE id=?',payload?.bookingId);
        if (!record) reject(404,'Reserva ficticia no encontrada.');
        if (operation==='cancel') {
          if (![record.requester_id,record.tutor_id].includes(actor.id)) reject(403,'No puede modificar reservas ajenas.');
          if (!ACTIVE.has(record.status)) reject(409,'Reserva no admite cancelación.');
        } else {
          if (actor.role!=='tutor' || actor.id!==record.tutor_id) reject(403,'Solo el docente asignado puede responder.');
          if (record.status!=='pending') reject(409,'Solicitud ya decidida.');
        }
        const status=operation==='accept'?'confirmed':operation==='reject'?'rejected':'cancelled';
        db.prepare('UPDATE lab_bookings SET status=? WHERE id=?').run(status,record.id);
        updated=record.id;participants=[record.requester_id,record.tutor_id];
      } else reject(404,'Operación no disponible.');

      for (const id of new Set(participants)) {
        db.prepare('UPDATE lab_accounts SET revision=revision+1 WHERE id=?').run(id);
      }
      const response={demo:true,revision:one(db,'SELECT revision FROM lab_accounts WHERE id=?',userId).revision,
        bookingId:updated,operation};
      db.prepare(`INSERT INTO lab_operations(account_id,request_key,fingerprint,response_json)
        VALUES(?,?,?,?)`).run(userId,key,fingerprint,JSON.stringify(response));
      db.exec('COMMIT');
      return response;
    } catch (error) {
      db.exec('ROLLBACK');throw error;
    }
  }
  return {register,login,authenticate,logout,tutors,snapshot,change};
}

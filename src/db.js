// VisionOne Field – baza podatkov
// Produkcija (Vercel): MySQL/MariaDB prek DATABASE_URL (mysql://…).
// Lokalni razvoj in preizkusi: SQLite (node:sqlite), če DATABASE_URL ni nastavljen ali se začne s sqlite:.
import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const URL_ = process.env.DATABASE_URL || '';
export const DIALECT = /^mysql(s)?:\/\//i.test(URL_) ? 'mysql' : 'sqlite';
export const DATA_DIR = process.env.DATA_DIR || path.resolve('data');

// ---------- sheme ----------
const SQLITE_SCHEMA = `
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, full_name TEXT, email TEXT, phone TEXT,
    password_hash TEXT NOT NULL, role TEXT DEFAULT 'tech', enabled INTEGER DEFAULT 1, created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT DEFAULT 'company', name TEXT NOT NULL, tax_id TEXT, vat_payer INTEGER DEFAULT 0,
    reg_no TEXT, address TEXT, post TEXT, city TEXT, country TEXT DEFAULT 'Slovenija', email TEXT, phone TEXT,
    contacts_json TEXT DEFAULT '[]', notes TEXT, tags TEXT, payment_days INTEGER, legacy_id TEXT, created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL, address TEXT, post TEXT, city TEXT, gps TEXT, access_notes TEXT, secret_enc TEXT,
    visionone_url TEXT, visionone_token_enc TEXT, maintenance_months INTEGER DEFAULT 12, last_service TEXT,
    system_type TEXT, notes TEXT, created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE plans (id INTEGER PRIMARY KEY AUTOINCREMENT, site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE, name TEXT, image TEXT, created_at INTEGER DEFAULT (unixepoch()));
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT, name TEXT NOT NULL, category TEXT, brand TEXT, unit TEXT DEFAULT 'kos',
    purchase_price REAL DEFAULT 0, price REAL DEFAULT 0, vat REAL DEFAULT 22, stock REAL DEFAULT 0, track_stock INTEGER DEFAULT 1,
    min_stock REAL DEFAULT 0, equipment_type TEXT, description TEXT, active INTEGER DEFAULT 1, created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT, site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'camera', name TEXT, brand TEXT, model TEXT, serial TEXT, mac TEXT, ip TEXT, firmware TEXT,
    username TEXT, password_enc TEXT, location TEXT, installed_at TEXT, warranty_until TEXT,
    connected_to INTEGER, port TEXT, product_id INTEGER, notes TEXT,
    plan_id INTEGER, plan_x REAL, plan_y REAL, dir REAL DEFAULT 0, fov REAL DEFAULT 90, range REAL DEFAULT 0.15,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, number TEXT, year INTEGER, seq INTEGER, status TEXT DEFAULT 'draft',
    customer_id INTEGER REFERENCES customers(id), site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    date TEXT, due_date TEXT, service_date TEXT, valid_until TEXT, reference TEXT, title TEXT, notes TEXT, footer TEXT,
    technician TEXT, work_description TEXT, signature TEXT, signed_name TEXT, signed_at INTEGER,
    source_id INTEGER, total_net REAL DEFAULT 0, total_vat REAL DEFAULT 0, total REAL DEFAULT 0, paid REAL DEFAULT 0,
    stock_done INTEGER DEFAULT 0, customer_json TEXT, created_by TEXT, created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER
  );
  CREATE INDEX idx_doc_type ON documents(type, year, seq);
  CREATE INDEX idx_doc_cust ON documents(customer_id);
  CREATE TABLE doc_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE, sort INTEGER DEFAULT 0,
    product_id INTEGER, description TEXT, qty REAL DEFAULT 1, unit TEXT DEFAULT 'kos', price REAL DEFAULT 0, discount REAL DEFAULT 0, vat REAL DEFAULT 22
  );
  CREATE TABLE payments (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE, date TEXT, amount REAL, method TEXT, note TEXT);
  CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT, document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE, site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT, path TEXT, mime TEXT, size INTEGER, created_by TEXT, created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE, site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    document_id INTEGER, start INTEGER NOT NULL, end INTEGER, title TEXT, type TEXT DEFAULT 'service', notes TEXT, technician TEXT, done INTEGER DEFAULT 0
  );
  CREATE TABLE sequences (type TEXT, year INTEGER, last INTEGER DEFAULT 0, PRIMARY KEY(type, year));
  CREATE TABLE activity (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER DEFAULT (unixepoch()), username TEXT, action TEXT, target TEXT);
  CREATE TABLE blobs (name TEXT PRIMARY KEY, mime TEXT, size INTEGER, data BLOB, created_at INTEGER DEFAULT (unixepoch()));
`;

// MySQL/MariaDB: enaka struktura. Rezervirane besede (key, range, end) so v narekovajih ``.
// Časovne žige (created_at …) vpiše aplikacija (insert), ker starejši MariaDB ne podpira izrazov v DEFAULT.
const T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const MYSQL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (\`key\` VARCHAR(190) PRIMARY KEY, value LONGTEXT) ${T}`,
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(190) NOT NULL UNIQUE, full_name TEXT, email TEXT, phone TEXT,
    password_hash TEXT NOT NULL, role VARCHAR(20) DEFAULT 'tech', enabled TINYINT DEFAULT 1, created_at BIGINT) ${T}`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(20) DEFAULT 'company', name VARCHAR(500) NOT NULL, tax_id VARCHAR(64), vat_payer TINYINT DEFAULT 0,
    reg_no VARCHAR(64), address TEXT, post VARCHAR(32), city VARCHAR(190), country VARCHAR(100) DEFAULT 'Slovenija', email TEXT, phone TEXT,
    contacts_json TEXT, notes TEXT, tags TEXT, payment_days INT, legacy_id VARCHAR(64), created_at BIGINT,
    INDEX idx_cust_name (name(100)), INDEX idx_cust_legacy (legacy_id)) ${T}`,
  `CREATE TABLE IF NOT EXISTS sites (
    id INT AUTO_INCREMENT PRIMARY KEY, customer_id INT NOT NULL,
    name VARCHAR(500) NOT NULL, address TEXT, post VARCHAR(32), city VARCHAR(190), gps VARCHAR(100), access_notes TEXT, secret_enc TEXT,
    visionone_url TEXT, visionone_token_enc TEXT, maintenance_months INT DEFAULT 12, last_service VARCHAR(32),
    system_type VARCHAR(100), notes TEXT, created_at BIGINT,
    INDEX idx_site_cust (customer_id),
    CONSTRAINT fk_site_cust FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY, site_id INT, name TEXT, image VARCHAR(190), created_at BIGINT,
    INDEX idx_plan_site (site_id),
    CONSTRAINT fk_plan_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY, sku VARCHAR(100), name VARCHAR(500) NOT NULL, category VARCHAR(190), brand VARCHAR(190), unit VARCHAR(20) DEFAULT 'kos',
    purchase_price DOUBLE DEFAULT 0, price DOUBLE DEFAULT 0, vat DOUBLE DEFAULT 22, stock DOUBLE DEFAULT 0, track_stock TINYINT DEFAULT 1,
    min_stock DOUBLE DEFAULT 0, equipment_type VARCHAR(32), description TEXT, active TINYINT DEFAULT 1, created_at BIGINT) ${T}`,
  `CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY, site_id INT NOT NULL,
    type VARCHAR(32) DEFAULT 'camera', name TEXT, brand TEXT, model TEXT, serial TEXT, mac VARCHAR(64), ip VARCHAR(255), firmware TEXT,
    username TEXT, password_enc TEXT, location TEXT, installed_at VARCHAR(32), warranty_until VARCHAR(32),
    connected_to INT, port VARCHAR(64), product_id INT, notes TEXT,
    plan_id INT, plan_x DOUBLE, plan_y DOUBLE, dir DOUBLE DEFAULT 0, fov DOUBLE DEFAULT 90, \`range\` DOUBLE DEFAULT 0.15,
    created_at BIGINT,
    INDEX idx_eq_site (site_id),
    CONSTRAINT fk_eq_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(20) NOT NULL, number VARCHAR(64), year INT, seq INT, status VARCHAR(20) DEFAULT 'draft',
    customer_id INT, site_id INT,
    date VARCHAR(32), due_date VARCHAR(32), service_date VARCHAR(32), valid_until VARCHAR(32), reference VARCHAR(64), title TEXT, notes TEXT, footer TEXT,
    technician TEXT, work_description TEXT, signature LONGTEXT, signed_name TEXT, signed_at BIGINT,
    source_id INT, total_net DOUBLE DEFAULT 0, total_vat DOUBLE DEFAULT 0, total DOUBLE DEFAULT 0, paid DOUBLE DEFAULT 0,
    stock_done TINYINT DEFAULT 0, customer_json TEXT, created_by TEXT, created_at BIGINT, updated_at BIGINT,
    INDEX idx_doc_type (type, year, seq), INDEX idx_doc_cust (customer_id), INDEX idx_doc_site (site_id),
    CONSTRAINT fk_doc_cust FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_doc_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL) ${T}`,
  `CREATE TABLE IF NOT EXISTS doc_lines (
    id INT AUTO_INCREMENT PRIMARY KEY, document_id INT NOT NULL, sort INT DEFAULT 0,
    product_id INT, description TEXT, qty DOUBLE DEFAULT 1, unit VARCHAR(20) DEFAULT 'kos', price DOUBLE DEFAULT 0, discount DOUBLE DEFAULT 0, vat DOUBLE DEFAULT 22,
    INDEX idx_line_doc (document_id),
    CONSTRAINT fk_line_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY, document_id INT, date VARCHAR(32), amount DOUBLE, method VARCHAR(32), note TEXT,
    INDEX idx_pay_doc (document_id),
    CONSTRAINT fk_pay_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY, document_id INT, site_id INT,
    name TEXT, path VARCHAR(190), mime VARCHAR(190), size INT, created_by TEXT, created_at BIGINT,
    INDEX idx_file_doc (document_id), INDEX idx_file_site (site_id),
    CONSTRAINT fk_file_doc FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY, customer_id INT, site_id INT,
    document_id INT, start BIGINT NOT NULL, \`end\` BIGINT, title TEXT, type VARCHAR(32) DEFAULT 'service', notes TEXT, technician TEXT, done TINYINT DEFAULT 0,
    INDEX idx_app_start (start),
    CONSTRAINT fk_app_cust FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL) ${T}`,
  `CREATE TABLE IF NOT EXISTS sequences (type VARCHAR(32) NOT NULL, year INT NOT NULL, last INT DEFAULT 0, PRIMARY KEY(type, year)) ${T}`,
  `CREATE TABLE IF NOT EXISTS activity (id INT AUTO_INCREMENT PRIMARY KEY, ts BIGINT, username VARCHAR(190), action VARCHAR(190), target TEXT) ${T}`,
  `CREATE TABLE IF NOT EXISTS blobs (name VARCHAR(190) PRIMARY KEY, mime VARCHAR(190), size INT, data LONGBLOB, created_at BIGINT) ${T}`,
];

// Tabele, ki imajo stolpec created_at (ali ts) – časovni žig vpiše insert()
const STAMP = { users: 'created_at', customers: 'created_at', sites: 'created_at', plans: 'created_at', products: 'created_at', equipment: 'created_at', documents: 'created_at', files: 'created_at', activity: 'ts', blobs: 'created_at' };

// ---------- gonilnik ----------
const txStore = new AsyncLocalStorage();
let driver = null;
let readyPromise = null;

async function openMysql() {
  const mysql = (await import('mysql2/promise')).default;
  // DATABASE_URL je lahko v obliki Prisme (…?connection_limit=1&sslaccept=strict) – sestavimo nastavitve sami
  const u = new URL(URL_);
  const params = u.searchParams;
  const sslAccept = params.get('sslaccept') || params.get('sslmode') || params.get('ssl');
  const ssl = sslAccept && !/^(false|disable|0)$/i.test(sslAccept)
    ? { rejectUnauthorized: /^(strict|verify-full|verify-ca|true|1)$/i.test(sslAccept) }
    : undefined;
  const pool = mysql.createPool({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    ssl,
    connectTimeout: Number(params.get('connect_timeout') || 15) * 1000,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || params.get('connection_limit') || 3),
    waitForConnections: true,
    decimalNumbers: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    dateStrings: true,
    charset: 'utf8mb4',
    timezone: 'Z',
  });
  const exec = async (sql, params) => {
    const conn = txStore.getStore();
    const [rows] = await (conn || pool).query(sql, params);
    return rows;
  };
  return {
    pool,
    all: async (sql, params) => exec(sql, params),
    get: async (sql, params) => (await exec(sql, params))[0],
    run: async (sql, params) => { const r = await exec(sql, params); return { changes: r.affectedRows, lastInsertRowid: r.insertId }; },
    async transaction(fn) {
      if (txStore.getStore()) return fn();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const out = await txStore.run(conn, fn);
        await conn.commit();
        return out;
      } catch (e) { try { await conn.rollback(); } catch { /* ignore */ } throw e; }
      finally { conn.release(); }
    },
    async tableExists(name) {
      const r = await exec('SELECT COUNT(*) n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [name]);
      return r[0].n > 0;
    },
    async migrate() { for (const s of MYSQL_SCHEMA) await exec(s); },
  };
}

async function openSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  const file = URL_.startsWith('sqlite:') ? URL_.slice(7) : path.join(DATA_DIR, 'field.db');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const cache = new Map();
  const prep = (sql, params = []) => {
    let st = cache.get(sql);
    if (!st) { st = db.prepare(sql.replace(/`/g, '"')); cache.set(sql, st); }
    return [st, params];
  };
  const norm = p => (p || []).map(v => (v === undefined ? null : v));
  return {
    db,
    all: async (sql, params) => { const [st, p] = prep(sql, params); return st.all(...norm(p)); },
    get: async (sql, params) => { const [st, p] = prep(sql, params); return st.get(...norm(p)); },
    run: async (sql, params) => { const [st, p] = prep(sql, params); const r = st.run(...norm(p)); return { changes: r.changes, lastInsertRowid: Number(r.lastInsertRowid) }; },
    async transaction(fn) {
      if (txStore.getStore()) return fn();
      db.exec('BEGIN');
      try { const out = await txStore.run(db, fn); db.exec('COMMIT'); return out; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    async tableExists(name) { return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name); },
    async migrate() {
      db.exec('CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY)');
      const cur = db.prepare('SELECT MAX(version) v FROM _migrations').get().v ?? 0;
      if (cur < 1) { db.exec('BEGIN'); try { db.exec(SQLITE_SCHEMA); db.prepare('INSERT INTO _migrations(version) VALUES (1)').run(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } }
    },
  };
}

/** Odpre bazo, ustvari tabele in izvede enkratne začetne korake (skrbnik, katalog, uvoz strank). */
export function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (DIALECT !== 'mysql' && process.env.VERCEL) throw new Error('Nastavite DATABASE_URL (mysql://uporabnik:geslo@gostitelj:3306/baza).');
      driver = DIALECT === 'mysql' ? await openMysql() : await openSqlite();
      requireSecret();
      await driver.migrate();
      for (const fn of initHooks) await fn();
    })().catch(e => { readyPromise = null; throw e; });
  }
  return readyPromise;
}
const initHooks = [];
export function onInit(fn) { initHooks.push(fn); }

const D = async () => { if (!driver) await ready(); return driver; };

export const q = {
  all: async (sql, ...p) => (await D()).all(sql, p),
  get: async (sql, ...p) => (await D()).get(sql, p),
  run: async (sql, ...p) => (await D()).run(sql, p),
};
export const transaction = async fn => (await D()).transaction(fn);
export const tableExists = async name => (await D()).tableExists(name);

const norm = v => (typeof v === 'boolean' ? (v ? 1 : 0) : v !== null && typeof v === 'object' && !Buffer.isBuffer(v) ? JSON.stringify(v) : v === undefined ? null : v);
const col = k => '`' + String(k).replace(/`/g, '') + '`';
export function pick(obj, fields) { const o = {}; for (const f of fields) if (obj[f] !== undefined) o[f] = obj[f] === '' ? null : obj[f]; return o; }
export async function insert(table, data) {
  const d = { ...data };
  const stamp = STAMP[table];
  if (stamp && d[stamp] == null) d[stamp] = Math.floor(Date.now() / 1000);
  const k = Object.keys(d);
  const r = await q.run(`INSERT INTO ${table} (${k.map(col).join(',')}) VALUES (${k.map(() => '?').join(',')})`, ...k.map(x => norm(d[x])));
  return Number(r.lastInsertRowid);
}
export async function update(table, id, data) {
  const k = Object.keys(data);
  if (k.length) await q.run(`UPDATE ${table} SET ${k.map(x => `${col(x)}=?`).join(',')} WHERE id=?`, ...k.map(x => norm(data[x])), id);
}
export async function getSetting(key, def = null) {
  const r = await q.get('SELECT value FROM settings WHERE `key`=?', key);
  if (!r) return def;
  try { return JSON.parse(r.value); } catch { return r.value; }
}
export async function setSetting(key, v) {
  const sql = DIALECT === 'mysql'
    ? 'INSERT INTO settings(`key`,value) VALUES(?,?) ON DUPLICATE KEY UPDATE value=VALUES(value)'
    : 'INSERT INTO settings(`key`,value) VALUES(?,?) ON CONFLICT(`key`) DO UPDATE SET value=excluded.value';
  await q.run(sql, key, JSON.stringify(v));
}
/** Atomarno naslednja zaporedna številka (v transakciji). */
export async function nextSeq(type, year) {
  return transaction(async () => {
    const ins = DIALECT === 'mysql'
      ? 'INSERT IGNORE INTO sequences(type, year, last) VALUES(?,?,0)'
      : 'INSERT INTO sequences(type, year, last) VALUES(?,?,0) ON CONFLICT(type, year) DO NOTHING';
    await q.run(ins, type, year);
    await q.run('UPDATE sequences SET last=last+1 WHERE type=? AND year=?', type, year);
    return Number((await q.get('SELECT last FROM sequences WHERE type=? AND year=?', type, year)).last);
  });
}

// ---------- datoteke (v bazi, ker Vercel nima trajnega diska) ----------
export async function putBlob(name, mime, buf) {
  await insert('blobs', { name, mime, size: buf.length, data: buf });
}
export async function getBlob(name) {
  const r = await q.get('SELECT name, mime, size, data FROM blobs WHERE name=?', name);
  if (!r) return null;
  return { ...r, data: Buffer.isBuffer(r.data) ? r.data : Buffer.from(r.data) };
}
export async function deleteBlob(name) { if (name) await q.run('DELETE FROM blobs WHERE name=?', name); }

// ---------- skrivnost in šifriranje gesel naprav ----------
function loadSecret() {
  if (process.env.SECRET_KEY) return process.env.SECRET_KEY;
  // prejšnji portal je že imel to skrivnost nastavljeno na Vercelu
  if (process.env.PORTAL_SESSION_SECRET && process.env.PORTAL_SESSION_SECRET.length >= 16) return process.env.PORTAL_SESSION_SECRET;
  if (process.env.VERCEL) {
    // Na Vercelu ni trajnega diska – brez SECRET_KEY bi se ključ ob vsakem zagonu spremenil.
    console.error('[Field] Manjka SECRET_KEY – nastavite jo na Vercelu (openssl rand -hex 32).');
    return null;
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const f = path.join(DATA_DIR, '.secret');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(f, s, { mode: 0o600 });
  return s;
}
export const SECRET = loadSecret();
const KEY = SECRET ? crypto.createHash('sha256').update(`${SECRET}|field-enc`).digest() : null;
export function requireSecret() { if (!SECRET) throw new Error('Nastavite okoljsko spremenljivko SECRET_KEY (openssl rand -hex 32).'); }
export function encrypt(text) {
  if (text == null || text === '') return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return `v1:${iv.toString('base64')}:${c.getAuthTag().toString('base64')}:${enc.toString('base64')}`;
}
export function decrypt(blob) {
  if (!blob) return null;
  try {
    const [, iv, tag, data] = blob.split(':');
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
    d.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
  } catch { return null; }
}

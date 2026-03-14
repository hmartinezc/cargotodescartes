import fs from 'node:fs';
import initSqlJs from 'sql.js';

const taskId = process.env.ANVIL_TASK_ID || 'validate-refactor-performance';
const dbPath = '.anvil/anvil_checks.sqlite';

const SQL = await initSqlJs();
let db;
if (fs.existsSync(dbPath)) {
  db = new SQL.Database(fs.readFileSync(dbPath));
} else {
  db = new SQL.Database();
}

const [action, ...rest] = process.argv.slice(2);

function save() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function esc(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

if (action === 'init') {
  db.run(`CREATE TABLE IF NOT EXISTS anvil_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    phase TEXT NOT NULL CHECK(phase IN ('baseline', 'after', 'review')),
    check_name TEXT NOT NULL,
    tool TEXT NOT NULL,
    command TEXT,
    exit_code INTEGER,
    output_snippet TEXT,
    passed INTEGER NOT NULL CHECK(passed IN (0, 1)),
    ts DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  save();
  console.log('init-ok');
} else if (action === 'insert') {
  let payload;
  if (rest.length === 1 && rest[0].trim().startsWith('{')) {
    payload = JSON.parse(rest.join(' '));
  } else {
    payload = {};
    for (const entry of rest) {
      const idx = entry.indexOf('=');
      if (idx === -1) continue;
      const key = entry.slice(0, idx);
      const value = entry.slice(idx + 1);
      payload[key] = value;
    }
    payload.exit_code = payload.exit_code !== undefined ? Number(payload.exit_code) : null;
    payload.passed = payload.passed === true || payload.passed === 'true' || payload.passed === '1';
  }
  db.run(`INSERT INTO anvil_checks
    (task_id, phase, check_name, tool, command, exit_code, output_snippet, passed)
    VALUES (
      ${esc(taskId)},
      ${esc(payload.phase)},
      ${esc(payload.check_name)},
      ${esc(payload.tool)},
      ${esc(payload.command)},
      ${esc(payload.exit_code)},
      ${esc((payload.output_snippet || '').slice(0, 500))},
      ${esc(payload.passed ? 1 : 0)}
    );`);
  save();
  console.log('insert-ok');
} else if (action === 'select') {
  const query = rest.join(' ');
  const result = db.exec(query);
  console.log(JSON.stringify(result, null, 2));
} else {
  console.error('Usage: node .anvil/ledger.mjs <init|insert|select> [args]');
  process.exit(1);
}

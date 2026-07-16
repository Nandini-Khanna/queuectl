const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'queuectl.db');
const db = new Database(dbPath);
const crypto = require('crypto');
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    command TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    next_run_at TEXT,
    worker_id TEXT,
    last_error TEXT,
    output TEXT
  )
`);
function enqueue(job) {
    const id = job.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
    INSERT INTO jobs (id, command, state, attempts, max_retries, created_at, updated_at)
    VALUES (?, ?, 'pending', 0, ?, ?, ?)
  `);

    stmt.run(id, job.command, job.max_retries || 3, now, now);

    return getJob(id);
}
function getJob(id) {
    const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
    return stmt.get(id);
}
function getPendingJob() {
    const stmt = db.prepare(`
    SELECT *
    FROM jobs
    WHERE state = 'pending'
    ORDER BY created_at ASC
    LIMIT 1
  `);

    return stmt.get();
}
const claimJob = db.transaction((workerId) => {

  const now = new Date().toISOString();

  const job = db.prepare(`
    SELECT *
    FROM jobs
    WHERE state = 'pending'
    AND (
      next_run_at IS NULL
      OR next_run_at <= ?
    )
    ORDER BY created_at ASC
    LIMIT 1
  `).get(now);

  if (!job) {
    return null;
  }

  const result = db.prepare(`
    UPDATE jobs
    SET
      state = 'processing',
      worker_id = ?,
      updated_at = ?
    WHERE id = ?
      AND state = 'pending'
  `).run(workerId, now, job.id);

  if (result.changes === 0) {
    return null;
  }

  return getJob(job.id);

});
function completeJob(id, output) {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
    UPDATE jobs
    SET
      state = 'completed',
      output = ?,
      updated_at = ?
  WHERE id = ?
  AND state = 'processing'
  `);

    stmt.run(output, now, id);

    return getJob(id);
}
function failJob(id, error) {
  const job = getJob(id);
  const attempts = job.attempts + 1;
  if (attempts >= job.max_retries) {

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE jobs
      SET
        state = 'dead',
        attempts = ?,
        last_error = ?,
        updated_at = ?
      WHERE id = ?
    `).run(attempts, error, now, id);

  } else {
    const delaySeconds = 2 ** attempts;

    const nextRun = new Date(
      Date.now() + delaySeconds * 1000
    ).toISOString();

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE jobs
      SET
        state = 'pending',
        attempts = ?,
        last_error = ?,
        next_run_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(attempts, error, nextRun, now, id);

  }
  return getJob(id);

}
module.exports = {
    db,
    enqueue,
    getJob,
    getPendingJob,
    claimJob,
    completeJob,
    failJob
  };
/**
 * Migration runner — reads .sql files from database/migrations/ in order.
 * Tracks applied migrations in a `_migrations` table.
 *
 * Usage: node database/migrate.js
 */
const fs = require('fs');
const path = require('path');
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({
  path: path.resolve(__dirname, '../.env'),
});
const mysql = require(path.resolve(__dirname, '../server/node_modules/mysql2/promise'));

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  // Connect without database first to CREATE DATABASE IF NOT EXISTS
  const initConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'jejakos';
  await initConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await initConn.query(`USE \`${dbName}\``);

  // Create tracking table
  await initConn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id        INT PRIMARY KEY AUTO_INCREMENT,
      filename  VARCHAR(255) UNIQUE NOT NULL,
      run_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  // Get already-applied
  const [applied] = await initConn.query('SELECT filename FROM _migrations');
  const appliedSet = new Set(applied.map((r) => r.filename));

  // Read migration files
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`SKIP  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`RUN   ${file} ...`);
    await initConn.query(sql);
    await initConn.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
    count++;
    console.log(`DONE  ${file}`);
  }

  console.log(`\nMigrations complete. ${count} applied, ${appliedSet.size} skipped.`);
  await initConn.end();
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

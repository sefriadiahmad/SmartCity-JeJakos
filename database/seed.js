/**
 * Seed runner — reads and executes .sql files from database/seeds/
 *
 * Usage: node database/seed.js
 */
const fs = require('fs');
const path = require('path');
require(path.resolve(__dirname, '../server/node_modules/dotenv')).config({
  path: path.resolve(__dirname, '../.env'),
});
const mysql = require(path.resolve(__dirname, '../server/node_modules/mysql2/promise'));

const SEEDS_DIR = path.join(__dirname, 'seeds');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'jejakos',
    multipleStatements: true,
  });

  console.log(`Connected to MySQL database: ${process.env.DB_NAME || 'jejakos'}`);

  const files = fs.readdirSync(SEEDS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(SEEDS_DIR, file);
    console.log(`RUN SEED ${file} ...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await conn.query(sql);
    console.log(`DONE SEED ${file}`);
  }

  console.log('\nAll seeds executed successfully.');
  await conn.end();
}

run().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});

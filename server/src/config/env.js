const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
  // Load from root project .env first
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  // Fallback: server/.env
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });

  // Validate required vars — fail fast
  const required = ['DB_HOST', 'DB_NAME', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(
      `[env] Variabel wajib belum diset: ${missing.join(', ')}\n` +
      `      Salin .env.example ke .env dan isi nilainya.`
    );
    process.exit(1);
  }

  // Warn optional but recommended
  const optional = ['GEMINI_API_KEY', 'MIDTRANS_SERVER_KEY', 'SMTP_HOST'];
  const unset = optional.filter((key) => !process.env[key]);
  if (unset.length) {
    console.warn(`[env] Opsional belum diset (fitur terkait nonaktif): ${unset.join(', ')}`);
  }
}

module.exports = { loadEnv };

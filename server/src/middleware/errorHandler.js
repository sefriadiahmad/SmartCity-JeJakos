// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Ukuran file maksimal 5MB' });
  }

  // Multer file type error
  if (err.message && err.message.includes('Hanya file')) {
    return res.status(400).json({ error: err.message });
  }

  // Validation errors (express-validator)
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({ errors: err.array() });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token sudah kedaluwarsa' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Terjadi kesalahan pada server' : err.message,
  });
};

module.exports = errorHandler;

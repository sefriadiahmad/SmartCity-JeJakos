const jwt = require('jsonwebtoken');

const getToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const cookie = req.headers.cookie
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('accessToken='));
  return cookie?.substring('accessToken='.length);
};

const auth = (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak disediakan' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

auth.optional = (req, res, next) => {
  const token = getToken(req);
  if (!token) {
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // ignore invalid token for optional auth
  }
  next();
};

module.exports = auth;

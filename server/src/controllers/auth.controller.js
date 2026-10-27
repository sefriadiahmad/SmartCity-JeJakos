const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UserModel = require('../models/user.model');

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function createSession(res, user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  res.cookie('accessToken', accessToken, authCookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
}

const authController = {
  async register(req, res, next) {
    try {
      const { email, password, name, phone } = req.body;
      const role = 'pencari';

      const existing = await UserModel.findByEmail(email.toLowerCase().trim());
      if (existing) {
        return res.status(400).json({ error: 'Email sudah terdaftar' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const userId = await UserModel.create({
        email: email.toLowerCase().trim(),
        password_hash,
        role,
        name: name || null,
        phone: phone || null,
        is_verified: true,
        is_approved: false,
      });

      res.status(201).json({
        message: 'Registrasi berhasil. Silakan masuk ke akun Anda.',
        user: {
          id: userId,
          email: email.toLowerCase().trim(),
          role,
          name: name || null,
          phone: phone || null,
          is_verified: true,
          is_approved: false,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ error: 'Email atau password salah' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Email atau password salah' });
      }

      createSession(res, user);

      res.json({
        message: 'Login berhasil',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          phone: user.phone,
          photo_url: user.photo_url,
          is_verified: Boolean(user.is_verified),
          is_approved: Boolean(user.is_approved),
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async googleLogin(req, res) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).send('Login Google belum dikonfigurasi.');
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  },

  async googleCallback(req, res, next) {
    let stage = 'menerima respons Google';
    try {
      const { code } = req.query;
      if (!code) return res.redirect(`${process.env.CLIENT_URL}/login?error=google`);
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=google-config`);
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
      stage = 'menukar kode otorisasi';
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!tokenResponse.ok) {
        console.error(`[Google OAuth] Token exchange gagal: ${await tokenResponse.text()}`);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=google`);
      }

      const { access_token: googleAccessToken } = await tokenResponse.json();
      stage = 'mengambil profil Google';
      const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok || !profile.email || !profile.email_verified) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=google`);
      }

      const email = profile.email.toLowerCase().trim();
      stage = 'mencari akun lokal';
      let user = await UserModel.findByEmail(email);
      if (!user) {
        stage = 'membuat akun pencari';
        const password_hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
        const userId = await UserModel.create({
          email,
          password_hash,
          role: 'pencari',
          name: profile.name || null,
          // Google profile URLs can exceed users.photo_url VARCHAR(500).
          photo_url: profile.picture?.length <= 500 ? profile.picture : null,
          is_verified: true,
          is_approved: false,
        });
        user = await UserModel.findById(userId, true);
      }

      stage = 'membuat sesi login';
      createSession(res, user);
      res.redirect(`${process.env.CLIENT_URL}/`);
    } catch (err) {
      console.error(`[Google OAuth] Gagal saat ${stage}: ${err.message}`);
      res.redirect(`${process.env.CLIENT_URL}/login?error=google-callback`);
    }
  },

  async verifyEmail(req, res, next) {
    try {
      const token = req.body.token || req.query.token;
      if (!token) {
        return res.status(400).json({ error: 'Token verifikasi tidak ditemukan' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'verify_email') {
        return res.status(400).json({ error: 'Token verifikasi tidak valid' });
      }

      const user = await UserModel.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      }

      await UserModel.setVerified(decoded.id, true);
      res.json({ message: 'Email berhasil diverifikasi' });
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const user = await UserModel.findByEmail(email.toLowerCase().trim());

      let resetToken = null;
      if (user) {
        resetToken = jwt.sign(
          { id: user.id, email: user.email, type: 'reset_password' },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
      }

      res.json({
        message: 'Jika email terdaftar, instruksi reset password telah dikirim',
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token } = req.body;
      const password = req.body.password || req.body.new_password;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token dan password baru wajib diisi' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password minimal 8 karakter' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'reset_password') {
        return res.status(400).json({ error: 'Token reset password tidak valid' });
      }

      const user = await UserModel.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      await UserModel.updatePassword(decoded.id, password_hash);

      res.json({ message: 'Password berhasil direset. Silakan login kembali.' });
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      let token = req.body?.refreshToken;
      if (!token && req.headers.cookie) {
        const match = req.headers.cookie
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith('refreshToken='));
        if (match) {
          token = match.substring('refreshToken='.length);
        }
      }

      if (!token) {
        return res.status(401).json({ error: 'Refresh token tidak ditemukan' });
      }

      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'Pengguna tidak valid' });
      }

      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      res.cookie('accessToken', newAccessToken, authCookieOptions);
      res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

      res.json({ message: 'Sesi berhasil diperbarui' });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
      }
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { name, phone } = req.body;
      let photo_url = req.body.photo_url;

      if (req.file) {
        photo_url = `/uploads/${req.file.filename}`;
      }

      await UserModel.updateProfile(req.user.id, { name, phone, photo_url });
      const updatedUser = await UserModel.findById(req.user.id);

      res.json({
        message: 'Profil berhasil diperbarui',
        user: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  },

  async becomePartner(req, res, next) {
    try {
      const changed = await UserModel.becomePartner(req.user.id);
      if (!changed) {
        return res.status(400).json({ error: 'Akun ini tidak dapat didaftarkan sebagai mitra.' });
      }
      const user = await UserModel.findById(req.user.id);
      res.json({ message: 'Pendaftaran mitra dikirim. Menunggu persetujuan admin.', user });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res) {
    res.clearCookie('accessToken', authCookieOptions);
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Logout berhasil' });
  },
};

module.exports = authController;

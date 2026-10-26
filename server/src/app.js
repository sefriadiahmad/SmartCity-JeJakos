const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { loadEnv } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
loadEnv();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploaded photos)
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/kos', require('./routes/kos'));
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/invoices', require('./routes/invoice'));
app.use('/api/conversations', require('./routes/chat'));
app.use('/api/chatbot', require('./routes/chatbot'));
// app.use('/api/reviews', require('./routes/review'));
// app.use('/api/complaints', require('./routes/complaint'));
app.use('/api/admin', require('./routes/admin'));

// Socket.IO handlers (F-25, F-26)
require('./socket/socketHandler')(io);

// Error handler (harus terakhir)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  const { startCronJobs } = require('./services/cron.service');
  startCronJobs();

  server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

// Export for testing
module.exports = { app, server, io };

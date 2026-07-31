const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { CORS_ORIGIN, SERVER_PORT } = require('./config/env');
const { initDatabase } = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiter');
const requestLogger = require('./middleware/logger');
const { registerSocketHandlers } = require('./sockets/socketHandler');
const { scheduleDailyDrop } = require('./cron/dailyDrop');
const { uploadsDir } = require('./middleware/upload');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', generalLimiter);
app.use(requestLogger);

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'dist')));

app.use('/api', require('./routes/authRoutes'));
app.use('/api', require('./routes/groupRoutes'));
app.use('/api', require('./routes/answerRoutes'));
app.use('/api', require('./routes/chatRoutes'));

app.get(/^(?!\/(api|uploads)).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true } });
app.set('io', io);
registerSocketHandlers(io);

initDatabase().then(() => {
  scheduleDailyDrop();
  server.listen(SERVER_PORT, () => {
    console.log(`Hotseat API live on http://localhost:${SERVER_PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

const shutdown = () => {
  console.log("Shutdown signal received...");
  setTimeout(() => { console.error("Force closing."); process.exit(1); }, 3000);
  io.close(() => {
    require('./config/db').pool.end(() => { console.log("Clean shutdown complete."); process.exit(0); });
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
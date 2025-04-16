// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderStatusRouter = require('./routes/order_status');
const refundRoutes = require('./routes/refunds');
const storePolicyRoutes = require('./routes/store_policies');
const orderHistoryRoutes = require('./routes/order_history');
const chatRoutes = require('./routes/chat');
const messagesRoutes = require('./routes/messages');
const { initDB } = require('./db');

const app = express();
const defaultPort = process.env.PORT || 5005;


initDB();

app.use(cors({
  origin: [`http://localhost:${defaultPort}`, `http://localhost:${defaultPort + 1}`, 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://unpkg.com", "'unsafe-inline'"],
        connectSrc: [
          "'self'",
          `http://localhost:${defaultPort}`,
          `http://localhost:${defaultPort + 1}`,
          "http://localhost:3000",
          "https://api.deepseek.com",
        ],
        imgSrc: ["'self'", `http://localhost:${defaultPort}`, `http://localhost:${defaultPort + 1}`],
      },
    },
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use((req, res, next) => {
  console.log(`[${new Date().toString()}] "${req.method} ${req.url}" ${req.get('User-Agent') || 'No User-Agent'}`);
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/order_status', orderStatusRouter);
app.use('/api/store_policies', storePolicyRoutes);
app.use('/api/order_history', orderHistoryRoutes);

// Static Files and Frontend Fallback
app.use('/img', express.static(path.join(__dirname, '../frontend/img')));
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  if (!req.url.startsWith('/api/')) {
    return res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
  res.status(404).json({ error: 'API route not found' });
});

const server = app.listen(defaultPort, () => {
  console.log(`Server running on http://localhost:${defaultPort}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${defaultPort} in use, trying ${defaultPort + 1}...`);
    app.listen(defaultPort + 1, () => {
      console.log(`Server running on http://localhost:${defaultPort + 1}`);
    });
  } else {
    console.error('Server error:', err);
  }
});

app.use((err, req, res, next) => {
  console.error('Error occurred:', err.message, err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => process.exit(1));
});

setInterval(() => {
  console.log(`[${new Date().toString()}] Server still running on http://localhost:${defaultPort}`);
}, 30000);
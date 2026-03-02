// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const sequelize = require('./config/database');

// Routes
const authRoutes = require('./routes/auth.routes');
const forecastRoutes = require('./routes/forecast.routes');
const listingRoutes = require('./routes/listing.routes');
const buyerNeedRoutes = require('./routes/buyerNeed.routes');
const bankAccountRoutes = require('./routes/bankAccount.routes');
const orderRoutes = require('./routes/order.routes');
const messageRoutes = require('./routes/message.routes'); // ← NEW
const profileRoutes = require('./routes/profile.routes');
const dashboardRoutes = require('./routes/dashboard.routes'); // ← NEW

// Models (ensure associations are loaded)
const Message = require('./models/Message'); // ← NEW

const app = express();
const server = http.createServer(app);

// parse allowed origin(s) from env, fall back to the local dev address
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((u) => u.trim());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/buyer-needs', buyerNeedRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes); // ← NEW
app.use('/api/profiles', profileRoutes);
app.use('/api/dashboard', dashboardRoutes); // ← NEW

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── Socket.IO ──────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] New client connected:', socket.id);

  // Join user's personal room
  socket.on('join', (data) => {
    const userId = typeof data === 'object' ? data.userId : data;
    const role = typeof data === 'object' ? data.role : null;

    if (userId) {
      socket.join(`user_${userId}`);
      // Store userId on socket for easy access in message handler
      socket.userId = userId;
      console.log(`[Socket] User ${userId} (${role}) joined room user_${userId}`);
      socket.emit('joined', `user_${userId}`);
    }
  });

  // ── Chat message ─────────────────────────────────────────────────────────────
  socket.on('send-message', async (data) => {
    const { receiverId, text } = data;
    const senderId = socket.userId;

    if (!senderId || !receiverId || !text?.trim()) {
      socket.emit('message-error', { error: 'Invalid message data' });
      return;
    }

    try {
      // Persist to DB
      const conversationId = Message.getConversationId(senderId, receiverId);
      const message = await Message.create({
        senderId,
        receiverId,
        text: text.trim(),
        conversationId,
        read: false,
      });

      const payload = {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        text: message.text,
        read: message.read,
        createdAt: message.createdAt,
        conversationId: message.conversationId,
      };

      // Send to receiver's room
      io.to(`user_${receiverId}`).emit('new-message', payload);

      // Confirm back to sender
      socket.emit('message-sent', payload);

      console.log(`[Chat] ${senderId} → ${receiverId}: "${text.trim().slice(0, 40)}"`);
    } catch (err) {
      console.error('[Chat] Error saving message:', err);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  socket.on('typing-start', ({ receiverId }) => {
    if (socket.userId && receiverId) {
      io.to(`user_${receiverId}`).emit('user-typing', { senderId: socket.userId });
    }
  });

  socket.on('typing-stop', ({ receiverId }) => {
    if (socket.userId && receiverId) {
      io.to(`user_${receiverId}`).emit('user-stopped-typing', { senderId: socket.userId });
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// ── DB sync & server start ────────────────────────────────────────────────────
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced successfully');
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to sync database:', err);
  });
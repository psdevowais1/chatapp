import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatRoutes from './routes/chat.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import groupRoutes from './routes/group.routes.js';
import { initSocket } from './config/socket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:50237',
      'http://127.0.0.1:50237',
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/localhost:\d+$/,
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', chatRoutes);
app.use('/api', uploadRoutes);
app.use('/api/groups', groupRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

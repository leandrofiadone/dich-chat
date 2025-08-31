import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { prisma } from './db.js';

export function setupSockets(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: process.env.ORIGIN_CORS || 'http://localhost:5173',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Optionally authenticate a user via token sent in handshake, omitted for brevity

    socket.on('chat:message', async (payload: { userId: string; text: string }) => {
      if (!payload?.userId || !payload?.text) return;
      const message = await prisma.message.create({
        data: {
          text: payload.text,
          userId: payload.userId
        },
        include: { user: true }
      });
      io.emit('chat:message', message);
    });

    socket.on('disconnect', () => {});
  });
}

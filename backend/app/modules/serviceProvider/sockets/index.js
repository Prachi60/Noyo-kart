import { Server } from 'socket.io';
import { verifyAccessToken } from '../services/tokenService.js';
import SpVendor from '../models/SpVendor.js';
import SpWorker from '../models/SpWorker.js';
import { setLiveLocation, setVendorLocation, setVendorOnline, setVendorAvailability, getLiveLocation } from '../services/redisService.js';

let io = null;

const initializeSocket = (server) => {
  io = new Server(server, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['polling', 'websocket']
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication error: No token'));
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SP Socket] Connected: ${socket.id} (User: ${socket.userId}, Role: ${socket.userRole})`);
    if (socket.userRole === 'USER') socket.join(`user_${socket.userId}`);
    else if (socket.userRole === 'VENDOR') { socket.join(`vendor_${socket.userId}`); updateVendorOnlineStatus(socket.userId, true, socket.id); }
    else if (socket.userRole === 'WORKER') { socket.join(`worker_${socket.userId}`); updateWorkerOnlineStatus(socket.userId, true, socket.id); }
    else if (socket.userRole === 'ADMIN') socket.join(`admin_${socket.userId}`);

    socket.on('join_tracking', async (bookingId) => {
      socket.join(`booking_${bookingId}`);
      try { const cached = await getLiveLocation(bookingId); if (cached) socket.emit('live_location_update', cached); } catch (e) {}
    });

    socket.on('update_location', async (data) => {
      const lat = parseFloat(data.lat); const lng = parseFloat(data.lng); const heading = parseFloat(data.heading) || 0;
      if (isNaN(lat) || isNaN(lng)) return;
      const locationPayload = { lat, lng, heading, role: socket.userRole };
      socket.to(`booking_${data.bookingId}`).emit('live_location_update', locationPayload);
      try { await setLiveLocation(data.bookingId, locationPayload, 30); if (socket.userRole === 'VENDOR') await setVendorLocation(socket.userId, lat, lng); } catch (e) {}
    });

    socket.on('disconnect', () => {
      if (socket.userRole === 'VENDOR') updateVendorOnlineStatus(socket.userId, false, null);
      else if (socket.userRole === 'WORKER') updateWorkerOnlineStatus(socket.userId, false, null);
    });
  });

  console.log('[SP] Socket.io initialized');
};

const updateVendorOnlineStatus = async (vendorId, isOnline, socketId) => {
  try {
    const updateData = { isOnline, currentSocketId: socketId };
    if (isOnline) updateData.availability = 'AVAILABLE'; else { updateData.lastSeenAt = new Date(); updateData.availability = 'OFFLINE'; }
    await SpVendor.findByIdAndUpdate(vendorId, updateData);
    await setVendorOnline(vendorId, isOnline);
    await setVendorAvailability(vendorId, updateData.availability);
  } catch (error) { console.error('[SP Socket] Vendor status error:', error); }
};

const updateWorkerOnlineStatus = async (workerId, isOnline) => {
  try { await SpWorker.findByIdAndUpdate(workerId, { status: isOnline ? 'ONLINE' : 'OFFLINE' }); } catch (error) { console.error('[SP Socket] Worker status error:', error); }
};

const getIO = () => { if (!io) throw new Error('Socket.io not initialized'); return io; };

export { initializeSocket, getIO };

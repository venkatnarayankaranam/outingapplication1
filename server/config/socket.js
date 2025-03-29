const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
let io;

module.exports = {
  init: (server) => {
    io = socketIO(server, {
      cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Authentication middleware
    const authenticateSocket = (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'OutingApplication@2026');
        socket.user = decoded;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    };

    // Floor incharge namespace
    const floorInchargeNS = io.of('/floor-incharge');
    floorInchargeNS.use(authenticateSocket);
    
    floorInchargeNS.on('connection', (socket) => {
      console.log('Floor Incharge connected:', {
        id: socket.id,
        user: socket.user
      });

      socket.on('join-floor', (data) => {
        const { hostelBlock, floor } = data;
        if (!hostelBlock || !floor) {
          console.error('Missing room data:', data);
          return;
        }

        const floors = Array.isArray(floor) ? floor : [floor];
        floors.forEach(f => {
          const roomId = `${hostelBlock}-${f}`;
          socket.join(roomId);
          console.log(`Socket ${socket.id} joined room:`, {
            room: roomId,
            user: socket.user?.email
          });
        });
      });

      socket.on('disconnect', () => {
        console.log('Floor Incharge disconnected:', socket.id);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) throw new Error('Socket.IO not initialized');
    return io;
  },

  emitToFloor: (hostelBlock, floor, event, data) => {
    try {
      if (!io) throw new Error('Socket.IO not initialized');
      const room = `${hostelBlock}-${floor}`;
      io.of('/floor-incharge').to(room).emit(event, data);
    } catch (error) {
      console.error('Socket emission error:', error);
    }
  }
};

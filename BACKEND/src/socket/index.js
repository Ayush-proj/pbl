const { Server } = require('socket.io');

let io;

function initSocket(server) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const allowedOrigins = [
    frontendUrl,
    "http://localhost:5173",
    "http://localhost:5175",
    "https://localhost:5173",
    "https://localhost:5175"
  ];
  
  // Add production domain if HTTPS
  if (frontendUrl.startsWith("https://") && !frontendUrl.includes("localhost")) {
    allowedOrigins.push(frontendUrl);
  }
  
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Track active rooms: roomId -> { users: [socketId, ...], startedAt, duration }
  const activeRooms = new Map();

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    const userType = socket.handshake.query.userType; // 'mentor' or 'candidate'
    
    console.log(`✅ User connected: ${userType} - ${userId} (socket: ${socket.id})`);

    // Join user's personal room for notifications
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Track when each user joined a room
    const roomJoinTimestamps = new Map(); // roomId -> joinTime

    // ─── JOIN VIDEO ROOM ────────────────────────────────────────
    socket.on('join:room', (roomId) => {
      socket.join(roomId);
      
      // Track room membership
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, { users: [], startedAt: null, duration: null });
      }
      const room = activeRooms.get(roomId);
      
      // Add user info to room (avoid duplicates)
      const existingIndex = room.users.findIndex(u => u.socketId === socket.id);
      if (existingIndex === -1) {
        roomJoinTimestamps.set(socket.id + roomId, Date.now());
        room.users.push({ socketId: socket.id, userId, userType, joinTime: Date.now() });
      }

      console.log(`📹 ${userType} (${userId}) joined room: ${roomId} | Users in room: ${room.users.length} | Socket: ${socket.id}`);

      // Notify everyone in the room (including sender) how many users are present
      io.to(roomId).emit('room:users-updated', {
        roomId,
        userCount: room.users.length,
        users: room.users.map(u => ({ userId: u.userId, userType: u.userType }))
      });

      // If this is the SECOND user, tell BOTH users that room is ready
      // The first user (earliest join time) creates the offer
      if (room.users.length === 2) {
        // Sort by joinTime to find the initiator
        const sortedUsers = [...room.users].sort((a, b) => (a.joinTime || 0) - (b.joinTime || 0));
        const initiator = sortedUsers[0];
        
        console.log(`🤝 Room ${roomId} is FULL (2 users). Initiator: ${initiator.userType} (socket: ${initiator.socketId})`);
        
        // Tell the initiator to create the offer
        io.to(initiator.socketId).emit('room:ready', {
          roomId,
          shouldCreateOffer: true
        });
        
        // Also notify the second user that room is ready (but don't create offer)
        const secondUser = sortedUsers[1];
        io.to(secondUser.socketId).emit('room:ready', {
          roomId,
          shouldCreateOffer: false,
          waitingForPeer: true
        });
      } else if (room.users.length === 1) {
        console.log(`⏳ Room ${roomId} has ${room.users.length} user(s). Waiting for second participant...`);
        // Tell the first user to wait
        io.to(room.users[0].socketId).emit('room:ready', {
          roomId,
          shouldCreateOffer: false,
          waitingForPeer: true
        });
      }
    });

    // ─── LEAVE VIDEO ROOM ───────────────────────────────────────
    socket.on('leave:room', (roomId) => {
      socket.leave(roomId);
      
      if (activeRooms.has(roomId)) {
        const room = activeRooms.get(roomId);
        room.users = room.users.filter(u => u.socketId !== socket.id);
        
        if (room.users.length === 0) {
          activeRooms.delete(roomId);
        }

        // Notify remaining users
        io.to(roomId).emit('room:users-updated', {
          roomId,
          userCount: room.users.length,
          users: room.users.map(u => ({ userId: u.userId, userType: u.userType }))
        });
      }
      console.log(`🚪 ${userType} left room: ${roomId}`);
    });

    // ─── WebRTC SIGNALING ───────────────────────────────────────
    // Relay offer to other users in the room (NOT back to sender)
    socket.on('webrtc:offer', (data) => {
      console.log(`📡 WebRTC OFFER in room ${data.roomId} from ${socket.id} (${userType}) - relaying to others`);
      socket.to(data.roomId).emit('webrtc:offer', {
        offer: data.offer,
        from: socket.id
      });
    });

    // Relay answer to other users in the room
    socket.on('webrtc:answer', (data) => {
      console.log(`📡 WebRTC ANSWER in room ${data.roomId} from ${socket.id} (${userType}) - relaying to others`);
      socket.to(data.roomId).emit('webrtc:answer', {
        answer: data.answer,
        from: socket.id
      });
    });

    // Relay ICE candidates
    socket.on('webrtc:ice-candidate', (data) => {
      console.log(`📡 ICE CANDIDATE in room ${data.roomId} from ${socket.id}`);
      socket.to(data.roomId).emit('webrtc:ice-candidate', {
        candidate: data.candidate,
        from: socket.id
      });
    });

    // ─── SESSION LIFECYCLE ──────────────────────────────────────
    // Session started (with timer sync)
    socket.on('session:start', (data) => {
      const { roomId, duration } = data;
      if (activeRooms.has(roomId)) {
        const room = activeRooms.get(roomId);
        // Only set start time ONCE (first user to click start)
        if (!room.startedAt) {
          room.startedAt = Date.now();
          room.duration = duration || 60 * 60; // seconds
        }
        // Broadcast the SAME start time to ALL users in the room
        io.to(roomId).emit('session:started', {
          startedAt: room.startedAt,
          duration: room.duration
        });
      }
      console.log(`▶️ Session started in room: ${roomId}`);
    });

    // Request current session time (for late joiners)
    socket.on('session:sync-time', (data) => {
      const { roomId } = data;
      if (activeRooms.has(roomId)) {
        const room = activeRooms.get(roomId);
        if (room.startedAt) {
          const elapsed = Math.floor((Date.now() - room.startedAt) / 1000);
          const remaining = Math.max(0, room.duration - elapsed);
          socket.emit('session:time-sync', {
            remaining,
            startedAt: room.startedAt,
            duration: room.duration
          });
        }
      }
    });

    // Session ended - only ends if BOTH participants agree or session timer expires
    socket.on('session:end', (data) => {
      // Notify the other participant that someone left
      socket.to(data.roomId).emit('peer:left', {
        userId,
        userType,
        actualDuration: data.actualDuration
      });
      console.log(`👋 User ${userType} left room ${data.roomId} (session continues for others)`);
      // Don't delete room - other participants can continue
    });

    // Force end - both participants agree to end
    socket.on('session:force-end', (data) => {
      socket.to(data.roomId).emit('session:ended', {
        endedAt: new Date(),
        actualDuration: data.actualDuration,
        endedBy: userType
      });
      if (activeRooms.has(data.roomId)) {
        activeRooms.delete(data.roomId);
      }
      console.log(`⏹️ Session forcefully ended in room: ${data.roomId}`);
    });

    // Extension request
    socket.on('session:extend-request', (data) => {
      socket.to(data.roomId).emit('session:extend-request', {
        requestedMinutes: data.minutes,
        cost: data.cost
      });
    });

    // Extension accepted
    socket.on('session:extend-accepted', (data) => {
      if (activeRooms.has(data.roomId)) {
        const room = activeRooms.get(data.roomId);
        room.duration += data.minutes * 60;
      }
      // Broadcast to ALL users in room so both timers extend
      io.to(data.roomId).emit('session:extend-accepted', {
        additionalMinutes: data.minutes
      });
    });

    // ─── DISCONNECT ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${userType} - ${userId}`);
      
      // Clean up from all active rooms
      for (const [roomId, room] of activeRooms.entries()) {
        const wasInRoom = room.users.some(u => u.socketId === socket.id);
        if (wasInRoom) {
          room.users = room.users.filter(u => u.socketId !== socket.id);
          
          // Notify remaining users
          io.to(roomId).emit('room:users-updated', {
            roomId,
            userCount: room.users.length,
            users: room.users.map(u => ({ userId: u.userId, userType: u.userType }))
          });

          // Also tell remaining user that peer disconnected
          io.to(roomId).emit('peer:disconnected', {
            userId,
            userType
          });

          if (room.users.length === 0) {
            activeRooms.delete(roomId);
          }
        }
      }
    });

    // ─── CHAT EVENTS ────────────────────────────────────────
    socket.on('chat:join-conversation', (conversationId) => {
      socket.join(`chat:${conversationId}`);
      console.log(`💬 User ${userId} joined chat conversation: ${conversationId}`);
    });

    socket.on('chat:leave-conversation', (conversationId) => {
      socket.leave(`chat:${conversationId}`);
      console.log(`💬 User ${userId} left chat conversation: ${conversationId}`);
    });

    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      socket.to(`chat:${conversationId}`).emit('chat:user-typing', {
        conversationId,
        userId,
        isTyping
      });
    });

    // Send message via socket (real-time)
    socket.on('chat:send-message', async (data) => {
      const { conversationId, content } = data;
      
      try {
        const { Message, Conversation } = require('../models/Message');
        
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          socket.emit('chat:error', { message: 'Conversation not found' });
          return;
        }

        const message = await Message.create({
          conversationId,
          sender: userId,
          content,
          readBy: [userId]
        });

        const populatedMessage = await Message.findById(message._id).populate('sender', 'name profileImage');

        // Update conversation last message
        conversation.lastMessage = populatedMessage;
        conversation.lastMessageAt = new Date();
        if (conversation.unreadCount) {
          conversation.unreadCount += 1;
        } else {
          conversation.unreadCount = 1;
        }
        await conversation.save();

        // Emit to all users in conversation room (including sender)
        io.to(`chat:${conversationId}`).emit('chat:new-message', {
          message: {
            _id: populatedMessage._id,
            conversationId,
            sender: populatedMessage.sender?._id || userId,
            senderName: populatedMessage.sender?.name || 'User',
            senderType: userType,
            content: populatedMessage.content,
            createdAt: populatedMessage.createdAt
          }
        });

        // Also notify participants via their user room
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== userId.toString()) {
            emitToUser(participantId.toString(), 'chat:notification', {
              conversationId,
              senderName: populatedMessage.sender?.name || 'User',
              content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
            });
          }
        });
      } catch (error) {
        console.error('Chat message error:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Mark messages as read
    socket.on('chat:mark-read', (conversationId) => {
      socket.to(`chat:${conversationId}`).emit('chat:messages-read', {
        conversationId,
        userId,
        readAt: new Date()
      });
    });
  });

  return io;
}

// Send notification to specific user
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// Send notification to all users in a room
function emitToRoom(roomId, event, data) {
  if (io) {
    io.to(roomId).emit(event, data);
  }
}

module.exports = { initSocket, emitToUser, emitToRoom };

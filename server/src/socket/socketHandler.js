const jwt = require('jsonwebtoken');
const ConversationModel = require('../models/conversation.model');
const MessageModel = require('../models/message.model');

/**
 * Socket.IO handler for real-time chat (F-25, F-26)
 * Events:
 * - joinConversation: user joins a conversation room
 * - sendMessage: user sends a message
 * - newMessage: broadcast incoming message to room
 * - markRead: mark messages as read
 * - messageRead: broadcast read status to room
 * - disconnect: user leaves conversation
 */
function initializeSocketHandler(io) {
  // Middleware: authenticate socket connection via JWT
  io.use((socket, next) => {
    const cookieToken = socket.handshake.headers.cookie
      ?.split(';')
      .map((value) => value.trim())
      .find((value) => value.startsWith('accessToken='))
      ?.substring('accessToken='.length);
    const token = socket.handshake.auth.token || socket.handshake.query.token || cookieToken;
    if (!token) {
      return next(new Error('Token not provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // Socket connection handler
  io.on('connection', (socket) => {
    console.log(`[Socket] User ${socket.userId} connected: ${socket.id}`);
    socket.join(`user_${socket.userId}`);

    /**
     * Event: joinConversation
     * User joins a conversation room for real-time updates
     * Payload: { conversationId }
     */
    socket.on('joinConversation', async (data, callback) => {
      try {
        const { conversationId } = data;
        if (!conversationId) {
          return callback({ success: false, error: 'conversationId required' });
        }

        // Verify user is participant or admin
        const isParticipant = await ConversationModel.isParticipant(conversationId, socket.userId);
        if (!isParticipant && socket.userRole !== 'admin') {
          return callback({ success: false, error: 'Access denied' });
        }

        const roomName = `conv_${conversationId}`;
        socket.join(roomName);
        socket.currentConversationId = conversationId;

        console.log(`[Socket] User ${socket.userId} joined room ${roomName}`);

        // Notify others in room that user is online
        io.to(roomName).emit('userOnline', {
          userId: socket.userId,
          timestamp: new Date(),
        });

        callback({ success: true, message: 'Joined conversation' });
      } catch (err) {
        console.error('[Socket] joinConversation error:', err);
        callback({ success: false, error: err.message });
      }
    });

    /**
     * Event: sendMessage
     * User sends a message to the conversation
     * Payload: { conversationId, content }
     */
    socket.on('sendMessage', async (data, callback) => {
      try {
        const { conversationId, content } = data;
        if (!conversationId || !content || !content.trim()) {
          return callback({ success: false, error: 'conversationId and content required' });
        }

        // Verify user is participant or admin
        const isParticipant = await ConversationModel.isParticipant(conversationId, socket.userId);
        if (!isParticipant && socket.userRole !== 'admin') {
          return callback({ success: false, error: 'Access denied' });
        }

        // Save message to database
        const message = await MessageModel.create({
          conversation_id: conversationId,
          sender_id: socket.userId,
          content: content.trim(),
        });

        // Broadcast to all users in the conversation room
        const roomName = `conv_${conversationId}`;
        io.to(roomName).emit('newMessage', {
          message,
          conversationId,
          timestamp: new Date(),
        });

        // Recipient must receive notification even when not viewing this conversation.
        const conversation = await ConversationModel.findById(conversationId);
        const recipientId = conversation.user1_id === socket.userId
          ? conversation.user2_id
          : conversation.user1_id;
        io.to(`user_${recipientId}`).emit('newMessage', {
          message,
          conversationId,
          timestamp: new Date(),
        });

        console.log(`[Socket] User ${socket.userId} sent message in conv ${conversationId}`);
        callback({ success: true, message });
      } catch (err) {
        console.error('[Socket] sendMessage error:', err);
        callback({ success: false, error: err.message });
      }
    });

    /**
     * Event: markRead
     * User marks messages in a conversation as read
     * Payload: { conversationId }
     */
    socket.on('markRead', async (data, callback) => {
      try {
        const { conversationId } = data;
        if (!conversationId) {
          return callback({ success: false, error: 'conversationId required' });
        }

        // Verify user is participant or admin
        const isParticipant = await ConversationModel.isParticipant(conversationId, socket.userId);
        if (!isParticipant && socket.userRole !== 'admin') {
          return callback({ success: false, error: 'Access denied' });
        }

        // Mark messages as read
        const updatedCount = await MessageModel.markAsRead(conversationId, socket.userId);

        // Broadcast read status to room
        const roomName = `conv_${conversationId}`;
        io.to(roomName).emit('messageRead', {
          conversationId,
          readBy: socket.userId,
          timestamp: new Date(),
        });

        console.log(`[Socket] User ${socket.userId} marked ${updatedCount} messages as read in conv ${conversationId}`);
        callback({ success: true, updated_count: updatedCount });
      } catch (err) {
        console.error('[Socket] markRead error:', err);
        callback({ success: false, error: err.message });
      }
    });

    /**
     * Event: leaveConversation
     * User explicitly leaves a conversation room
     * Payload: { conversationId }
     */
    socket.on('leaveConversation', (data) => {
      try {
        const { conversationId } = data;
        if (conversationId) {
          const roomName = `conv_${conversationId}`;
          socket.leave(roomName);
          socket.currentConversationId = null;

          // Notify others that user is offline
          io.to(roomName).emit('userOffline', {
            userId: socket.userId,
            timestamp: new Date(),
          });

          console.log(`[Socket] User ${socket.userId} left room ${roomName}`);
        }
      } catch (err) {
        console.error('[Socket] leaveConversation error:', err);
      }
    });

    /**
     * Event: disconnect
     * User disconnects (browser close, network loss, etc.)
     */
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User ${socket.userId} disconnected: ${reason}`);

      // Notify current conversation room if user was in one
      if (socket.currentConversationId) {
        const roomName = `conv_${socket.currentConversationId}`;
        io.to(roomName).emit('userOffline', {
          userId: socket.userId,
          timestamp: new Date(),
        });
      }
    });

    /**
     * Error handler for this socket
     */
    socket.on('error', (error) => {
      console.error(`[Socket] Error for user ${socket.userId}:`, error);
    });
  });

  return io;
}

module.exports = initializeSocketHandler;

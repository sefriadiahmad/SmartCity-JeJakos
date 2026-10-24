const ConversationModel = require('../models/conversation.model');
const MessageModel = require('../models/message.model');
const KosModel = require('../models/kos.model');
const UserModel = require('../models/user.model');

const ChatController = {
  /**
   * GET /api/conversations — list user conversations (F-25)
   */
  async listConversations(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await ConversationModel.findByUser(req.user.id, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/conversations — start or get existing conversation (F-24)
   */
  async startConversation(req, res, next) {
    try {
      let { recipient_id, kos_id, message, content } = req.body;
      const currentUserId = req.user.id;

      // If kos_id is provided but recipient_id is missing, auto-detect kos owner (F-24)
      if (!recipient_id && kos_id) {
        const kos = await KosModel.findById(kos_id);
        if (!kos) {
          return res.status(404).json({ error: 'Kos tidak ditemukan' });
        }
        recipient_id = kos.owner_id;
      }

      if (!recipient_id) {
        return res.status(400).json({ error: 'ID penerima atau ID kos wajib diisi' });
      }

      const targetId = parseInt(recipient_id, 10);
      if (isNaN(targetId)) {
        return res.status(400).json({ error: 'ID penerima tidak valid' });
      }

      if (targetId === currentUserId) {
        return res.status(400).json({ error: 'Tidak dapat memulai percakapan dengan diri sendiri' });
      }

      const recipient = await UserModel.findById(targetId);
      if (!recipient) {
        return res.status(404).json({ error: 'Penerima tidak ditemukan' });
      }

      const targetKosId = kos_id ? parseInt(kos_id, 10) : null;

      // Check if conversation already exists
      let conversation = await ConversationModel.findExisting({
        user1_id: currentUserId,
        user2_id: targetId,
        kos_id: targetKosId,
      });

      let isNew = false;
      if (!conversation) {
        const insertId = await ConversationModel.create({
          user1_id: currentUserId,
          user2_id: targetId,
          kos_id: targetKosId,
        });
        conversation = await ConversationModel.findById(insertId);
        isNew = true;
      } else {
        conversation = await ConversationModel.findById(conversation.id);
      }

      // If initial message provided, insert it
      const initialText = (message || content || '').trim();
      let initialMessage = null;
      if (initialText) {
        initialMessage = await MessageModel.create({
          conversation_id: conversation.id,
          sender_id: currentUserId,
          content: initialText,
        });
      }

      return res.status(isNew ? 201 : 200).json({
        conversation,
        initial_message: initialMessage,
        is_new: isNew,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/conversations/:id — get conversation detail
   */
  async getConversation(req, res, next) {
    try {
      const convId = parseInt(req.params.id, 10);
      if (isNaN(convId)) {
        return res.status(400).json({ error: 'ID percakapan tidak valid' });
      }

      const conversation = await ConversationModel.findById(convId);
      if (!conversation) {
        return res.status(404).json({ error: 'Percakapan tidak ditemukan' });
      }

      // Check participant or admin
      const isParticipant =
        conversation.user1_id === req.user.id || conversation.user2_id === req.user.id;
      if (!isParticipant && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan peserta percakapan ini' });
      }

      return res.json({ conversation });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/conversations/:id/messages — list messages in conversation (F-25)
   */
  async listMessages(req, res, next) {
    try {
      const convId = parseInt(req.params.id, 10);
      if (isNaN(convId)) {
        return res.status(400).json({ error: 'ID percakapan tidak valid' });
      }

      const conversation = await ConversationModel.findById(convId);
      if (!conversation) {
        return res.status(404).json({ error: 'Percakapan tidak ditemukan' });
      }

      const isParticipant =
        conversation.user1_id === req.user.id || conversation.user2_id === req.user.id;
      if (!isParticipant && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan peserta percakapan ini' });
      }

      const { page, limit, before_id, auto_read } = req.query;

      // Optional auto mark as read
      if (auto_read === 'true' || auto_read === '1') {
        await MessageModel.markAsRead(convId, req.user.id);
      }

      const result = await MessageModel.findByConversation(convId, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
        before_id: before_id ? parseInt(before_id, 10) : null,
      });

      return res.json({
        conversation_id: convId,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/conversations/:id/messages — send message in conversation (F-24, F-25)
   */
  async sendMessage(req, res, next) {
    try {
      const convId = parseInt(req.params.id, 10);
      if (isNaN(convId)) {
        return res.status(400).json({ error: 'ID percakapan tidak valid' });
      }

      const conversation = await ConversationModel.findById(convId);
      if (!conversation) {
        return res.status(404).json({ error: 'Percakapan tidak ditemukan' });
      }

      const isParticipant =
        conversation.user1_id === req.user.id || conversation.user2_id === req.user.id;
      if (!isParticipant && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan peserta percakapan ini' });
      }

      const { content } = req.body;
      const trimmed = (content || '').trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'Isi pesan tidak boleh kosong' });
      }

      const message = await MessageModel.create({
        conversation_id: convId,
        sender_id: req.user.id,
        content: trimmed,
      });

      return res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/conversations/:id/read — mark unread messages as read
   */
  async markRead(req, res, next) {
    try {
      const convId = parseInt(req.params.id, 10);
      if (isNaN(convId)) {
        return res.status(400).json({ error: 'ID percakapan tidak valid' });
      }

      const isParticipant = await ConversationModel.isParticipant(convId, req.user.id);
      if (!isParticipant && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak. Anda bukan peserta percakapan ini' });
      }

      const updatedCount = await MessageModel.markAsRead(convId, req.user.id);

      return res.json({
        success: true,
        updated_count: updatedCount,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/conversations/unread-count — get total unread count for badge (F-26)
   */
  async getUnreadCount(req, res, next) {
    try {
      const unreadCount = await MessageModel.getUnreadCount(req.user.id);
      return res.json({ unread_count: unreadCount });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ChatController;

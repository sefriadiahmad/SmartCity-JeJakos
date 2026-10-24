const db = require('../config/db');

const MessageModel = {
  /**
   * Insert a new message into a conversation
   */
  async create({ conversation_id, sender_id, content }) {
    const [res] = await db.execute(
      `INSERT INTO messages (conversation_id, sender_id, content)
       VALUES (?, ?, ?)`,
      [conversation_id, sender_id, content]
    );

    return this.findById(res.insertId);
  },

  /**
   * Find message by ID with sender info
   */
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT 
         m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
         u.name AS sender_name, u.photo_url AS sender_photo, u.role AS sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    return {
      id: r.id,
      conversation_id: r.conversation_id,
      sender_id: r.sender_id,
      content: r.content,
      is_read: Boolean(r.is_read),
      created_at: r.created_at,
      sender: {
        id: r.sender_id,
        name: r.sender_name,
        photo_url: r.sender_photo,
        role: r.sender_role,
      },
    };
  },

  /**
   * Find messages for a conversation (chronological order)
   */
  async findByConversation(conversationId, { page = 1, limit = 50, before_id = null } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['m.conversation_id = ?'];
    const params = [conversationId];

    if (before_id) {
      conditions.push('m.id < ?');
      params.push(parseInt(before_id, 10));
    }

    // Total count in conversation
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM messages m
       WHERE ${conditions.join(' AND ')}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const queryParams = [...params, limitNum, offset];

    const [rows] = await db.execute(
      `SELECT 
         m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
         u.name AS sender_name, u.photo_url AS sender_photo, u.role AS sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.id DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    // Reverse to chronological order (oldest first for chat window)
    const data = rows.reverse().map((r) => ({
      id: r.id,
      conversation_id: r.conversation_id,
      sender_id: r.sender_id,
      content: r.content,
      is_read: Boolean(r.is_read),
      created_at: r.created_at,
      sender: {
        id: r.sender_id,
        name: r.sender_name,
        photo_url: r.sender_photo,
        role: r.sender_role,
      },
    }));

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  },

  /**
   * Mark all unread messages in conversation as read for reader
   */
  async markAsRead(conversationId, readerId) {
    const [res] = await db.execute(
      `UPDATE messages
       SET is_read = 1
       WHERE conversation_id = ? AND sender_id != ? AND is_read = 0`,
      [conversationId, readerId]
    );
    return res.affectedRows;
  },

  /**
   * Count all unread messages for user across all conversations
   */
  async getUnreadCount(userId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       WHERE (c.user1_id = ? OR c.user2_id = ?)
         AND m.sender_id != ?
         AND m.is_read = 0`,
      [userId, userId, userId]
    );
    return rows[0]?.total || 0;
  },
};

module.exports = MessageModel;

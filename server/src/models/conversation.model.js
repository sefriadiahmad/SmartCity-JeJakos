const db = require('../config/db');

const ConversationModel = {
  /**
   * Create a new conversation between two users (optional kos_id context)
   */
  async create({ user1_id, user2_id, kos_id = null }) {
    const [res] = await db.execute(
      `INSERT INTO conversations (user1_id, user2_id, kos_id)
       VALUES (?, ?, ?)`,
      [user1_id, user2_id, kos_id]
    );
    return res.insertId;
  },

  /**
   * Find existing conversation between two users
   */
  async findExisting({ user1_id, user2_id, kos_id = null }) {
    let sql = `
      SELECT c.*
      FROM conversations c
      WHERE ((c.user1_id = ? AND c.user2_id = ?) OR (c.user1_id = ? AND c.user2_id = ?))
    `;
    const params = [user1_id, user2_id, user2_id, user1_id];

    if (kos_id !== null && kos_id !== undefined) {
      sql += ' AND c.kos_id = ?';
      params.push(parseInt(kos_id, 10));
    }

    sql += ' ORDER BY c.id DESC LIMIT 1';

    const [rows] = await db.execute(sql, params);
    return rows[0] || null;
  },

  /**
   * Find conversation by ID with detailed participant & kos information
   */
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT 
         c.id, c.user1_id, c.user2_id, c.kos_id, c.created_at,
         u1.name AS user1_name, u1.email AS user1_email, u1.role AS user1_role,
         u1.photo_url AS user1_photo, u1.phone AS user1_phone,
         u2.name AS user2_name, u2.email AS user2_email, u2.role AS user2_role,
         u2.photo_url AS user2_photo, u2.phone AS user2_phone,
         k.name AS kos_name, k.address AS kos_address, k.type AS kos_type,
         (SELECT photo_url FROM kos_photos WHERE kos_id = k.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS kos_photo
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       LEFT JOIN kos k ON c.kos_id = k.id
       WHERE c.id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    return {
      id: r.id,
      user1_id: r.user1_id,
      user2_id: r.user2_id,
      kos_id: r.kos_id,
      created_at: r.created_at,
      user1: {
        id: r.user1_id,
        name: r.user1_name,
        email: r.user1_email,
        role: r.user1_role,
        photo_url: r.user1_photo,
        phone: r.user1_phone,
      },
      user2: {
        id: r.user2_id,
        name: r.user2_name,
        email: r.user2_email,
        role: r.user2_role,
        photo_url: r.user2_photo,
        phone: r.user2_phone,
      },
      kos: r.kos_id
        ? {
            id: r.kos_id,
            name: r.kos_name,
            address: r.kos_address,
            type: r.kos_type,
            photo_url: r.kos_photo,
          }
        : null,
    };
  },

  /**
   * List conversations for a specific user with other_user, kos, last_message, and unread_count
   */
  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Total count
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM conversations
       WHERE user1_id = ? OR user2_id = ?`,
      [userId, userId]
    );
    const total = countRows[0]?.total || 0;

    if (total === 0) {
      return {
        data: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const [rows] = await db.execute(
      `SELECT 
         c.id, c.user1_id, c.user2_id, c.kos_id, c.created_at,
         u1.name AS user1_name, u1.email AS user1_email, u1.role AS user1_role,
         u1.photo_url AS user1_photo, u1.phone AS user1_phone,
         u2.name AS user2_name, u2.email AS user2_email, u2.role AS user2_role,
         u2.photo_url AS user2_photo, u2.phone AS user2_phone,
         k.name AS kos_name, k.address AS kos_address, k.type AS kos_type,
         (SELECT photo_url FROM kos_photos WHERE kos_id = k.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS kos_photo,
         lm.id AS last_message_id,
         lm.content AS last_message_content,
         lm.sender_id AS last_message_sender_id,
         lm.is_read AS last_message_is_read,
         lm.created_at AS last_message_created_at,
         (
           SELECT COUNT(*)
           FROM messages m_unread
           WHERE m_unread.conversation_id = c.id
             AND m_unread.sender_id != ?
             AND m_unread.is_read = 0
         ) AS unread_count,
         COALESCE(lm.created_at, c.created_at) AS sort_time
       FROM conversations c
       JOIN users u1 ON c.user1_id = u1.id
       JOIN users u2 ON c.user2_id = u2.id
       LEFT JOIN kos k ON c.kos_id = k.id
       LEFT JOIN (
         SELECT m1.*
         FROM messages m1
         JOIN (
           SELECT conversation_id, MAX(id) AS max_id
           FROM messages
           GROUP BY conversation_id
         ) m2 ON m1.id = m2.max_id
       ) lm ON c.id = lm.conversation_id
       WHERE c.user1_id = ? OR c.user2_id = ?
       ORDER BY sort_time DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, userId, limitNum, offset]
    );

    const data = rows.map((r) => {
      const isUser1 = r.user1_id === userId;
      const otherUser = isUser1
        ? {
            id: r.user2_id,
            name: r.user2_name,
            email: r.user2_email,
            role: r.user2_role,
            photo_url: r.user2_photo,
            phone: r.user2_phone,
          }
        : {
            id: r.user1_id,
            name: r.user1_name,
            email: r.user1_email,
            role: r.user1_role,
            photo_url: r.user1_photo,
            phone: r.user1_phone,
          };

      return {
        id: r.id,
        user1_id: r.user1_id,
        user2_id: r.user2_id,
        kos_id: r.kos_id,
        created_at: r.created_at,
        other_user: otherUser,
        kos: r.kos_id
          ? {
              id: r.kos_id,
              name: r.kos_name,
              address: r.kos_address,
              type: r.kos_type,
              photo_url: r.kos_photo,
            }
          : null,
        last_message: r.last_message_id
          ? {
              id: r.last_message_id,
              content: r.last_message_content,
              sender_id: r.last_message_sender_id,
              is_read: Boolean(r.last_message_is_read),
              created_at: r.last_message_created_at,
            }
          : null,
        unread_count: Number(r.unread_count || 0),
      };
    });

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  },

  /**
   * Check if a user is participant of conversation
   */
  async isParticipant(conversationId, userId) {
    const [rows] = await db.execute(
      `SELECT 1 FROM conversations
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)
       LIMIT 1`,
      [conversationId, userId, userId]
    );
    return rows.length > 0;
  },
};

module.exports = ConversationModel;

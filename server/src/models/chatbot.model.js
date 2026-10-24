const db = require('../config/db');
const { maskPersonalData } = require('../utils/mask');

const ChatbotModel = {
  /**
   * Save conversation turn to chatbot_logs with PII masking (NF-05, Design §2)
   */
  async createLog({
    user_id,
    session_id = null,
    user_message,
    bot_response,
    kos_ids_shown = [],
  }) {
    // Mask sensitive data before saving (NF-05)
    const maskedUserMessage = maskPersonalData(user_message);
    const maskedBotResponse = maskPersonalData(bot_response);

    const kosIdsJson = Array.isArray(kos_ids_shown)
      ? JSON.stringify(kos_ids_shown)
      : (kos_ids_shown ? JSON.stringify([kos_ids_shown]) : null);

    const [res] = await db.execute(
      `INSERT INTO chatbot_logs (user_id, session_id, user_message, bot_response, kos_ids_shown)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, session_id, maskedUserMessage, maskedBotResponse, kosIdsJson]
    );

    return {
      id: res.insertId,
      user_id,
      session_id,
      user_message: maskedUserMessage,
      bot_response: maskedBotResponse,
      kos_ids_shown: Array.isArray(kos_ids_shown) ? kos_ids_shown : [],
    };
  },

  /**
   * Get message count for a user today (Max 20/day limit, Design §5.2)
   */
  async getDailyMessageCount(userId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM chatbot_logs
       WHERE user_id = ?
         AND created_at >= CURDATE()
         AND created_at < CURDATE() + INTERVAL 1 DAY`,
      [userId]
    );
    return rows[0]?.total || 0;
  },

  /**
   * Retrieve conversation history for a user / session (last N messages, Design §5.2)
   */
  async getHistoryBySession({ user_id, session_id = null, limit = 5 }) {
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 5));
    const conditions = ['user_id = ?'];
    const params = [user_id];

    if (session_id) {
      conditions.push('session_id = ?');
      params.push(session_id);
    }

    params.push(limitNum);

    const [rows] = await db.execute(
      `SELECT id, user_id, session_id, user_message, bot_response, kos_ids_shown, created_at
       FROM chatbot_logs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      params
    );

    // Return chronological order (oldest to newest in session window)
    return rows.reverse().map((r) => {
      let kosIds = [];
      if (r.kos_ids_shown) {
        try {
          kosIds = typeof r.kos_ids_shown === 'string' ? JSON.parse(r.kos_ids_shown) : r.kos_ids_shown;
        } catch {
          kosIds = [];
        }
      }
      return {
        id: r.id,
        user_id: r.user_id,
        session_id: r.session_id,
        user_message: r.user_message,
        bot_response: r.bot_response,
        kos_ids_shown: Array.isArray(kosIds) ? kosIds : [],
        created_at: r.created_at,
      };
    });
  },

  /**
   * Admin: List logs with pagination, search, and masked personal info (F-23)
   */
  async findAllLogs({
    page = 1,
    limit = 20,
    user_id = null,
    search = null,
    start_date = null,
    end_date = null,
  } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const params = [];

    if (user_id) {
      whereConditions.push('cl.user_id = ?');
      params.push(user_id);
    }

    if (search) {
      whereConditions.push('(cl.user_message LIKE ? OR cl.bot_response LIKE ? OR u.name LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (start_date) {
      whereConditions.push('cl.created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereConditions.push('cl.created_at <= ?');
      params.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM chatbot_logs cl
       LEFT JOIN users u ON cl.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // Fetch data
    const queryParams = [...params, limitNum, offset];
    const [rows] = await db.execute(
      `SELECT 
         cl.id, cl.user_id, cl.session_id, cl.user_message, cl.bot_response, cl.kos_ids_shown, cl.created_at,
         u.name AS user_name, u.email AS user_email, u.phone AS user_phone, u.role AS user_role
       FROM chatbot_logs cl
       LEFT JOIN users u ON cl.user_id = u.id
       ${whereClause}
       ORDER BY cl.created_at DESC, cl.id DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    const data = rows.map((r) => {
      let kosIds = [];
      if (r.kos_ids_shown) {
        try {
          kosIds = typeof r.kos_ids_shown === 'string' ? JSON.parse(r.kos_ids_shown) : r.kos_ids_shown;
        } catch {
          kosIds = [];
        }
      }

      return {
        id: r.id,
        user_id: r.user_id,
        session_id: r.session_id,
        user_message: maskPersonalData(r.user_message),
        bot_response: maskPersonalData(r.bot_response),
        kos_ids_shown: Array.isArray(kosIds) ? kosIds : [],
        created_at: r.created_at,
        user: {
          id: r.user_id,
          name: r.user_name || 'Anonim',
          email: r.user_email ? maskPersonalData(r.user_email) : null,
          phone: r.user_phone ? maskPersonalData(r.user_phone) : null,
          role: r.user_role,
        },
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
   * Delete log entry by id
   */
  async deleteLog(id) {
    const [res] = await db.execute('DELETE FROM chatbot_logs WHERE id = ?', [id]);
    return res.affectedRows > 0;
  },
};

module.exports = ChatbotModel;

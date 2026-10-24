const ChatbotService = require('../services/chatbot.service');
const ChatbotModel = require('../models/chatbot.model');

const ChatbotController = {
  /**
   * POST /api/chatbot/message
   * Handle incoming chat message, check daily limit, query RAG, persist masked log (F-19, F-20~F-22, NF-05)
   */
  async sendMessage(req, res, next) {
    try {
      const { message, session_id = null } = req.body;
      const userId = req.user.id;

      // 1. Enforce Daily Limit: Max 20 messages / user / day (Design §5.2)
      const dailyCount = await ChatbotModel.getDailyMessageCount(userId);
      if (dailyCount >= 20) {
        return res.status(429).json({
          error: 'Batas pesan harian tercapai (maksimal 20 pesan per hari)',
          limit: 20,
          used: dailyCount,
          remaining: 0,
        });
      }

      // 2. Prepare Multi-turn Conversation Context (Design §5.2)
      let conversationHistory = [];
      if (Array.isArray(req.body.history) && req.body.history.length > 0) {
        conversationHistory = req.body.history.slice(-5);
      } else {
        // Load last messages from DB for this session
        const dbHistory = await ChatbotModel.getHistoryBySession({
          user_id: userId,
          session_id,
          limit: 5,
        });

        for (const item of dbHistory) {
          conversationHistory.push({ role: 'user', content: item.user_message });
          conversationHistory.push({ role: 'assistant', content: item.bot_response });
        }
        conversationHistory = conversationHistory.slice(-5);
      }

      // 3. Process via Chatbot Service (RAG Pipeline)
      const botResult = await ChatbotService.sendMessage({
        message,
        history: conversationHistory,
      });

      // 4. Persist Turn to chatbot_logs with Masking (NF-05, F-23)
      const savedLog = await ChatbotModel.createLog({
        user_id: userId,
        session_id,
        user_message: message,
        bot_response: botResult.message,
        kos_ids_shown: botResult.kos_ids,
      });

      const usedCount = dailyCount + 1;

      return res.json({
        message: botResult.message,
        kos: botResult.kos,
        kos_ids: botResult.kos_ids,
        session_id: session_id || savedLog.session_id,
        log_id: savedLog.id,
        daily_usage: {
          used: usedCount,
          limit: 20,
          remaining: Math.max(0, 20 - usedCount),
        },
        fallback_applied: botResult.fallback_applied,
        fallback_reason: botResult.fallback_reason,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/chatbot/history
   * Retrieve conversation history for current authenticated user (Design §3)
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { session_id, limit } = req.query;

      const history = await ChatbotModel.getHistoryBySession({
        user_id: userId,
        session_id: session_id || null,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      return res.json({
        data: history,
        total: history.length,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ChatbotController;

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle, FiAlertCircle, FiMessageSquare, FiMessageCircle, FiHome, FiX } from 'react-icons/fi';
import api from '../../services/api';
import {
  socket,
  joinConversation,
  leaveConversation,
  sendSocketMessage,
  markSocketRead,
} from '../../services/socket';
import { getPhotoUrl } from '../../utils/imageUrl';
import MessageBubble from './MessageBubble';

export default function ChatWindow({
  conversationId,
  currentUserId,
  onBack,
  onMessageSent,
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // 1. Fetch Conversation and Messages
  useEffect(() => {
    if (!conversationId) return;

    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [convRes, msgRes] = await Promise.all([
          api.get(`/conversations/${conversationId}`),
          api.get(`/conversations/${conversationId}/messages?auto_read=true&limit=100`),
        ]);

        if (active) {
          setConversation(convRes.data.conversation);
          setMessages(msgRes.data.data || []);
          setLoading(false);
          setTimeout(() => scrollToBottom(false), 50);
        }

        // Join Socket Room & Mark as Read
        await joinConversation(conversationId);
        await markSocketRead(conversationId);
        if (onMessageSent) onMessageSent();
      } catch (err) {
        if (active) {
          setError(err.response?.data?.error || 'Gagal memuat pesan percakapan');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
      leaveConversation(conversationId);
    };
  }, [conversationId, scrollToBottom, onMessageSent]);

  // 2. Real-time Socket Listener for newMessage and messageRead
  useEffect(() => {
    if (!conversationId) return;

    const handleNewMessage = (payload) => {
      const incoming = payload?.message || payload;
      if (!incoming) return;

      const convId = parseInt(payload?.conversationId || incoming.conversation_id, 10);
      if (convId === parseInt(conversationId, 10)) {
        setMessages((prev) => {
          // Deduplicate if already present
          if (prev.some((m) => m.id === incoming.id)) {
            return prev;
          }
          return [...prev, incoming];
        });

        setTimeout(() => scrollToBottom(true), 50);

        // If message is from other user, mark as read
        if (incoming.sender_id !== currentUserId) {
          markSocketRead(conversationId);
          api.put(`/conversations/${conversationId}/read`).catch(() => {});
          if (onMessageSent) onMessageSent();
        }
      }
    };

    const handleMessageRead = (payload) => {
      const convId = parseInt(payload?.conversationId, 10);
      if (convId === parseInt(conversationId, 10)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentUserId ? { ...m, is_read: true } : m
          )
        );
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageRead', handleMessageRead);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageRead', handleMessageRead);
    };
  }, [conversationId, currentUserId, scrollToBottom, onMessageSent]);

  // 3. Send Message Handler
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputContent.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    try {
      let createdMsg = null;

      // Try sending via Socket first (F-25)
      if (socket.connected) {
        try {
          createdMsg = await sendSocketMessage(conversationId, text);
        } catch {
          createdMsg = null;
        }
      }

      // Fallback to REST API if socket fails or disconnected
      if (!createdMsg) {
        const res = await api.post(`/conversations/${conversationId}/messages`, {
          content: text,
        });
        createdMsg = res.data?.message;
      }

      if (createdMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === createdMsg.id)) return prev;
          return [...prev, createdMsg];
        });
        setInputContent('');
        setTimeout(() => scrollToBottom(true), 50);
        if (onMessageSent) onMessageSent();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Gagal mengirim pesan');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent mb-2" />
        <p className="text-xs">Memuat percakapan...</p>
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <FiAlertTriangle className="w-10 h-10 mb-2 text-amber-500" />
        <p className="text-sm font-bold text-slate-800">{error}</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 transition"
          >
            Kembali ke Daftar
          </button>
        )}
      </div>
    );
  }

  const otherUser =
    conversation?.user1_id === currentUserId
      ? conversation?.user2
      : conversation?.user1;

  const otherPhoto = getPhotoUrl(otherUser?.photo_url);
  const kosData = conversation?.kos;

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 shrink-0 flex items-center justify-between shadow-2xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Kembali"
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition md:hidden cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* User Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 shrink-0 border border-emerald-300 select-none">
            {otherPhoto ? (
              <img src={otherPhoto} alt={otherUser?.name || 'User'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-emerald-800 text-sm">
                {(otherUser?.name || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
              {otherUser?.name || otherUser?.email || 'Pengguna'}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                {otherUser?.role || 'pencari'}
              </span>
              {otherUser?.phone && (
                <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                  • {otherUser.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp Shortcut if phone exists */}
        {otherUser?.phone && (
          <a
            href={`https://wa.me/${otherUser.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            title="Hubungi via WhatsApp"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition flex items-center gap-1.5 shrink-0"
          >
            <FiMessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        )}
      </div>

      {/* Kos Context Banner (F-24) */}
      {kosData && (
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <FiHome className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="truncate">
              <span className="text-slate-500 mr-1">Terkait:</span>
              <strong className="text-slate-800 font-semibold">{kosData.name}</strong>
              {kosData.address && (
                <span className="text-slate-500 ml-1 truncate hidden sm:inline">
                  ({kosData.address})
                </span>
              )}
            </div>
          </div>
          <Link
            to={`/kos/${kosData.id}`}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline shrink-0"
          >
            Lihat Kos →
          </Link>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <FiMessageCircle className="w-12 h-12 mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Belum ada percakapan</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Kirim pesan pertama untuk menanyakan informasi ketersediaan kamar, fasilitas, atau jadwal survey.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error notification banner */}
      {error && (
        <div className="bg-rose-50 border-t border-rose-200 px-4 py-2 text-xs text-rose-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Tutup pesan error"
            className="text-rose-500 font-bold ml-2 cursor-pointer p-0.5"
          >
            <FiX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t border-slate-200 shrink-0"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Ketik pesan di sini... (Tekan Enter untuk mengirim)"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputContent.trim() || sending}
            aria-label="Kirim Pesan"
            className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer shadow-xs"
          >
            <svg
              className="w-4 h-4 transform rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

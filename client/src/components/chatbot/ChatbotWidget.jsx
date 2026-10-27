import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiMessageCircle, FiRefreshCw, FiSend, FiX } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import ChatbotMessage from './ChatbotMessage';

const QUICK_PROMPTS = [
  '🎓 Kos dekat UNJA Mendalo',
  '👧 Kos putri ada WiFi & AC',
  '🕌 Kos dekat UIN STS',
  '💰 Kos murah budget 600rb',
];

const INITIAL_GREETING = {
  id: 'init-greeting',
  role: 'assistant',
  content:
    'Halo! Saya Asisten Virtual JeJakos 🤖\nSaya siap membantu Anda menemukan kos idaman di Provinsi Jambi. Mau cari kos putra, putri, atau campur? Di area kampus mana dan berapa perkiraan budget Anda?',
  timestamp: 'Baru saja',
  kos: [],
};

function getNowTimeString() {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createUniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ChatbotWidget({ defaultOpen = false }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([INITIAL_GREETING]);
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState(null); // { used: 0, limit: 20, remaining: 20 }
  const [sessionId, setSessionId] = useState(() => {
    return (
      sessionStorage.getItem('jejakos_chat_session') ||
      createUniqueId('ses')
    );
  });
  const [errorMsg, setErrorMsg] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync session id in sessionStorage
  useEffect(() => {
    sessionStorage.setItem('jejakos_chat_session', sessionId);
  }, [sessionId]);

  // Listen to external open events (e.g. from homepage banner button)
  useEffect(() => {
    const handleExternalOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-chatbot', handleExternalOpen);
    return () => {
      window.removeEventListener('open-chatbot', handleExternalOpen);
    };
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleResetSession = () => {
    const newSession = createUniqueId('ses');
    setSessionId(newSession);
    setMessages([INITIAL_GREETING]);
    setErrorMsg(null);
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    if (!user) {
      setErrorMsg('Silakan masuk ke akun JeJakos Anda untuk mulai berkonsultasi.');
      return;
    }

    setErrorMsg(null);
    setInputMessage('');

    const nowStr = getNowTimeString();

    const userMsg = {
      id: createUniqueId('usr'),
      role: 'user',
      content: text,
      timestamp: nowStr,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Format history payload for backend
      const historyPayload = newHistory
        .filter((m) => m.id !== 'init-greeting')
        .slice(-5)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await api.post('/chatbot/message', {
        message: text,
        session_id: sessionId,
        history: historyPayload,
      });

      const {
        message: replyText,
        kos = [],
        daily_usage,
        fallback_applied,
        fallback_reason,
      } = res.data;

      if (daily_usage) {
        setQuota(daily_usage);
      }

      const botMsg = {
        id: createUniqueId('bot'),
        role: 'assistant',
        content: replyText,
        kos: Array.isArray(kos) ? kos : [],
        fallback_applied: !!fallback_applied,
        fallback_reason: fallback_reason || null,
        timestamp: getNowTimeString(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errResponse = err.response?.data;
      if (err.response?.status === 429) {
        setErrorMsg('Batas 20 pesan harian chatbot Anda telah tercapai.');
        setQuota({ used: 20, limit: 20, remaining: 0 });
      } else {
        setErrorMsg(
          errResponse?.error || 'Gagal menghubungi asisten JeJakos. Silakan coba lagi.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button (F-19) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka Chatbot Tanya JeJakos"
          className="group fixed bottom-5 right-5 z-40 flex h-15 w-15 items-center justify-center rounded-[1.35rem] border border-white/20 bg-slate-950 text-white shadow-[0_18px_45px_-15px_rgba(5,150,105,0.75)] transition duration-300 hover:-translate-y-1 hover:bg-emerald-700 hover:shadow-[0_22px_50px_-15px_rgba(5,150,105,0.9)] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 motion-safe:animate-[chatbot-launch_.55s_cubic-bezier(.16,1,.3,1)_both] sm:bottom-6 sm:right-6"
        >
          <span className="absolute -inset-1 rounded-[1.6rem] border border-emerald-400/50 motion-safe:animate-[chatbot-ring_2.6s_ease-out_infinite]" />
          <FiMessageCircle className="relative h-7 w-7 transition-transform duration-300 group-hover:scale-110" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100 md:block">
            Tanya JeJakos
          </span>
        </button>
      )}

      {/* Chatbot Window Overlay (Design §5.2 line 503: Full-screen mobile, floating panel on md:) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white motion-safe:animate-[chatbot-panel-in_.35s_cubic-bezier(.16,1,.3,1)_both] md:inset-auto md:bottom-6 md:right-6 md:h-[620px] md:w-[410px] md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <FiMessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 leading-tight">
                  Tanya JeJakos
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
                </h3>
                <p className="text-[11px] text-emerald-200/90 leading-tight">
                  Asisten Cerdas Rekomendasi Kos Jambi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetSession}
                title="Mulai percakapan baru"
                className="flex items-center gap-1 p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer text-xs"
              >
                <FiRefreshCw className="h-3.5 w-3.5" /> Baru
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup chatbot"
                aria-label="Tutup chatbot"
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quota Banner */}
          {user && quota && (
            <div className="bg-emerald-50/90 border-b border-emerald-100 px-3.5 py-1 text-[11px] text-emerald-800 flex items-center justify-between">
              <span>Kuotaku Hari Ini:</span>
              <span className="font-semibold">
                {quota.remaining} / {quota.limit} pesan tersisa
              </span>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((msg) => (
              <ChatbotMessage
                key={msg.id}
                message={msg}
                onPromptSelect={handleSendMessage}
              />
            ))}

            {/* Quick Suggestion Chips (when only initial message is present) */}
            {messages.length === 1 && (
              <div className="pt-2 pb-1 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Pilihan Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 text-xs transition shadow-2xs text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs py-2 pl-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FiMessageCircle className="h-3.5 w-3.5" />
                </div>
                <div className="bg-slate-100 px-3.5 py-2 rounded-2xl rounded-tl-xs flex items-center gap-1.5 border border-slate-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-slate-500 ml-1">Mencari data kos...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <span>⚠️</span>
                <div className="flex-1">
                  <p>{errorMsg}</p>
                  {!user && (
                    <Link
                      to="/login"
                      className="inline-block mt-2 font-bold text-emerald-700 underline"
                    >
                      Masuk ke Akun Sekarang →
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Guest Login Callout inside Widget if not logged in */}
          {!user && (
            <div className="bg-amber-50 border-t border-amber-200 px-3.5 py-2 text-xs text-amber-800 flex items-center justify-between">
              <span>Masuk untuk mengirim pesan ke Tanya JeJakos</span>
              <Link
                to="/login"
                className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition"
              >
                Masuk
              </Link>
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-slate-200/80 shrink-0"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || !user}
                placeholder={
                  !user
                    ? 'Silakan masuk akun terlebih dahulu...'
                    : 'Ketik kriteria kos (misal: kos putri UNJA < 700rb)...'
                }
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading || !user}
                aria-label="Kirim Pesan"
                className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer shadow-xs"
              >
                <FiSend className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Didukung Google Gemini & data resmi database JeJakos
            </p>
          </form>
        </div>
      )}
    </>
  );
}

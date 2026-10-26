import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { socket, connectSocket } from '../../services/socket';
import { getPhotoUrl } from '../../utils/imageUrl';
import ChatWindow from '../../components/chat/ChatWindow';

export default function ConversationsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedId = searchParams.get('id')
    ? parseInt(searchParams.get('id'), 10)
    : null;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Initialize Socket Connection for authenticated user
  useEffect(() => {
    connectSocket();
  }, []);

  // 2. Fetch Conversations List
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/conversations?limit=50');
      const data = res.data?.data || [];
      setConversations(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function initList() {
      try {
        const res = await api.get('/conversations?limit=50');
        if (active) {
          setConversations(res.data?.data || []);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }
    initList();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectConversation = (id) => {
    setSearchParams({ id });
  };

  const handleBackToList = () => {
    setSearchParams({});
  };

  // 3. Listen for global newMessage events to update conversations list real-time
  useEffect(() => {
    const handleGlobalNewMessage = (payload) => {
      const incoming = payload?.message || payload;
      if (!incoming) return;

      const convId = parseInt(payload?.conversationId || incoming.conversation_id, 10);

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === convId);
        if (index === -1) {
          // If conversation not in list yet, refetch all
          fetchConversations();
          return prev;
        }

        const updated = [...prev];
        const target = { ...updated[index] };
        target.last_message = {
          id: incoming.id,
          content: incoming.content,
          sender_id: incoming.sender_id,
          is_read: incoming.is_read,
          created_at: incoming.created_at || new Date().toISOString(),
        };

        // If not selected conversation and message is not from current user, increment unread
        if (selectedId !== convId && incoming.sender_id !== user?.id) {
          target.unread_count = (target.unread_count || 0) + 1;
        }

        // Move to top of list
        updated.splice(index, 1);
        return [target, ...updated];
      });
    };

    socket.on('newMessage', handleGlobalNewMessage);
    return () => {
      socket.off('newMessage', handleGlobalNewMessage);
    };
  }, [selectedId, user?.id, fetchConversations]);

  // Filter conversations by user name or kos name
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const otherName = (c.other_user?.name || '').toLowerCase();
    const kosName = (c.kos?.name || '').toLowerCase();
    return otherName.includes(q) || kosName.includes(q);
  });

  return (
    <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>💬</span>
            <span>Percakapan Langsung</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tanya jawab real-time antara pencari dan pemilik kos di JeJakos
          </p>
        </div>

        <Link
          to="/kos"
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
        >
          🔍 Jelajahi Kos Lainnya
        </Link>
      </div>

      {/* Main Chat Panel Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex overflow-hidden h-[calc(100dvh-10rem)] min-h-[400px] md:h-auto md:min-h-[550px] max-h-[750px]">
        {/* Left Column: Conversations Sidebar */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col shrink-0 ${
            selectedId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari percakapan atau kos..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* List of Conversations */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mb-2" />
                <span className="text-xs">Memuat daftar chat...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                <span className="text-3xl mb-1.5">📭</span>
                <p className="text-xs font-semibold text-slate-600">
                  {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada percakapan'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Kirim pesan ke pemilik langsung dari halaman detail kos.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedId === c.id;
                const photoSrc = getPhotoUrl(c.other_user?.photo_url);
                const hasUnread = (c.unread_count || 0) > 0;

                const timeStr = c.last_message?.created_at
                  ? new Date(c.last_message.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : '';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectConversation(c.id)}
                    className={`w-full p-3.5 text-left transition flex gap-3 items-center group cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 shrink-0 relative border border-slate-200">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={c.other_user?.name || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-700 text-sm bg-emerald-100">
                          {(c.other_user?.name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs sm:text-sm font-bold truncate ${
                            hasUnread ? 'text-slate-900' : 'text-slate-800'
                          }`}
                        >
                          {c.other_user?.name || 'Pengguna'}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">{timeStr}</span>
                      </div>

                      {/* Associated Kos pill */}
                      {c.kos && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-semibold mt-0.5 truncate">
                          <span>🏠</span>
                          <span className="truncate">{c.kos.name}</span>
                        </div>
                      )}

                      {/* Last message snippet */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p
                          className={`text-[11px] truncate flex-1 ${
                            hasUnread ? 'font-bold text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          {c.last_message?.content || 'Belum ada pesan'}
                        </p>

                        {/* Unread Pill Badge (F-26) */}
                        {hasUnread && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold shrink-0 animate-pulse">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Window or Empty State */}
        <div
          className={`flex-1 h-full flex flex-col ${
            selectedId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedId ? (
            <ChatWindow
              conversationId={selectedId}
              currentUserId={user?.id}
              onBack={handleBackToList}
              onMessageSent={fetchConversations}
            />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 bg-slate-50/50">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mb-3 shadow-2xs">
                💬
              </div>
              <h3 className="text-sm font-bold text-slate-800">Pilih Percakapan</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Pilih salah satu percakapan di daftar sebelah kiri untuk membaca dan membalas pesan secara real-time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { FiCheck } from 'react-icons/fi';
import { getPhotoUrl } from '../../utils/imageUrl';

export default function MessageBubble({ message, isOwn }) {
  if (!message) return null;

  const timeFormatted = message.created_at
    ? new Date(message.created_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const senderPhoto = getPhotoUrl(message.sender?.photo_url);

  return (
    <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'} my-1.5`}>
      <div
        className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${
          isOwn ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar for other user */}
        {!isOwn && (
          <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 shrink-0 select-none">
            {senderPhoto ? (
              <img
                src={senderPhoto}
                alt={message.sender?.name || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-slate-600 bg-emerald-100">
                {(message.sender?.name || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs break-words ${
            isOwn
              ? 'bg-emerald-600 text-white rounded-br-xs'
              : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
          }`}
        >
          {/* Sender name for received messages */}
          {!isOwn && message.sender?.name && (
            <p className="text-[10px] font-bold text-emerald-700 mb-0.5 select-none">
              {message.sender.name}
            </p>
          )}

          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Timestamp and Read status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
              isOwn ? 'text-emerald-100' : 'text-slate-400'
            }`}
          >
            <span>{timeFormatted}</span>
            {isOwn && (
              <span
                title={message.is_read ? 'Sudah dibaca' : 'Terkirim'}
                className="font-bold tracking-tighter"
              >
                {message.is_read ? (
                  <span className="text-emerald-200 inline-flex items-center">
                    <FiCheck className="w-3 h-3" />
                    <FiCheck className="w-3 h-3 -ml-1.5" />
                  </span>
                ) : (
                  <span className="inline-flex items-center">
                    <FiCheck className="w-3 h-3" />
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

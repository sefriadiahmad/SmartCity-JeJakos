import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';

/**
 * Format markdown-like text (bold, list items, links /kos/:id) into React elements
 */
function renderFormattedContent(text) {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Empty lines as vertical spacing
    if (!line.trim()) {
      return <div key={lineIdx} className="h-2" />;
    }

    // Parse bold **text** and links /kos/:id
    const parts = [];
    const regex = /(\*\*.*?\*\*|\/kos\/\d+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={`${lineIdx}-${match.index}`} className="font-semibold text-slate-900">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('/kos/')) {
        parts.push(
          <Link
            key={`${lineIdx}-${match.index}`}
            to={token}
            className="text-emerald-600 hover:text-emerald-700 underline font-medium"
          >
            {token}
          </Link>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    // List item styling
    const isBullet = /^[•\-*]\s/.test(line.trim());
    const isNumbered = /^\d+\.\s/.test(line.trim());

    if (isBullet || isNumbered) {
      return (
        <div key={lineIdx} className="pl-3 relative text-xs sm:text-sm my-0.5">
          <span className="font-semibold text-emerald-700 mr-1.5">•</span>
          {parts}
        </div>
      );
    }

    return (
      <p key={lineIdx} className="text-xs sm:text-sm my-0.5 leading-relaxed">
        {parts}
      </p>
    );
  });
}

export default function ChatbotMessage({ message }) {
  if (!message) return null;

  const isUser = message.role === 'user';
  const hasKosCards = Array.isArray(message.kos) && message.kos.length > 0;

  const typeBadgeStyles = {
    putra: 'bg-blue-100 text-blue-700 border-blue-200',
    putri: 'bg-pink-100 text-pink-700 border-pink-200',
    campur: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} my-2`}>
      <div className={`flex items-start gap-2 max-w-[88%] sm:max-w-[82%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs ${
            isUser ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
        >
          {isUser ? '👤' : '🤖'}
        </div>

        {/* Bubble & Cards Container */}
        <div className="flex flex-col space-y-2 overflow-hidden">
          {/* Text Bubble */}
          <div
            className={`px-3.5 py-2.5 rounded-2xl shadow-2xs text-xs sm:text-sm ${
              isUser
                ? 'bg-emerald-600 text-white rounded-tr-xs'
                : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/80'
            }`}
          >
            {renderFormattedContent(message.content)}

            {/* Fallback relaxation note */}
            {message.fallback_applied && message.fallback_reason && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-lg">
                💡 <strong>Penyesuaian:</strong> {message.fallback_reason}
              </div>
            )}
          </div>

          {/* Kos Recommendations Carousel / Vertical List (F-22) */}
          {hasKosCards && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                Hunian yang Direkomendasikan:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {message.kos.map((item) => {
                  const photoSrc = getPhotoUrl(item.thumbnail || item.photos?.[0]?.photo_url);
                  return (
                    <div
                      key={item.id}
                      className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition flex gap-3 items-center group"
                    >
                      {/* Thumbnail */}
                      <Link
                        to={`/kos/${item.id}`}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-lg overflow-hidden bg-slate-100 shrink-0 block relative"
                      >
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 text-base">
                            🏠
                          </div>
                        )}
                        <span
                          className={`absolute top-1 left-1 text-[9px] font-extrabold uppercase px-1 py-0.2 rounded border ${
                            typeBadgeStyles[item.type] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.type}
                        </span>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/kos/${item.id}`}
                          className="font-bold text-xs sm:text-sm text-slate-900 truncate block hover:text-emerald-600 transition"
                        >
                          {item.name}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.address}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-extrabold text-emerald-600">
                            {formatCurrency(item.min_price)}
                            <span className="text-[10px] font-normal text-slate-400">/bln</span>
                          </span>
                          {item.avg_rating > 0 && (
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              ★ {item.avg_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detail Link Button */}
                      <Link
                        to={`/kos/${item.id}`}
                        className="shrink-0 p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                      >
                        <span className="hidden sm:inline">Detail</span>
                        <span>→</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {message.timestamp && (
            <span
              className={`text-[10px] text-slate-400 px-1 ${
                isUser ? 'text-right' : 'text-left'
              }`}
            >
              {message.timestamp}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

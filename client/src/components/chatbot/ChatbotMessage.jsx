import { Link } from 'react-router-dom';
import { FiUser, FiCpu, FiAlertCircle, FiHome } from 'react-icons/fi';
import ChatbotKosCard from './ChatbotKosCard';

/**
 * Enhanced markdown-like parser for chatbot text responses:
 * Supports:
 * - Bold: **text**
 * - Markdown links: [Label](/kos/1) or [Label](https://...)
 * - Plain paths: /kos/1
 * - Headers: ### Header
 * - Bulleted lists: - item, * item
 * - Numbered lists: 1. item
 */
function renderFormattedContent(text) {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();

    // Empty lines as vertical space
    if (!trimmed) {
      return <div key={lineIdx} className="h-1.5" />;
    }

    // Markdown Headers (### or ##)
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      return (
        <h4 key={lineIdx} className="font-bold text-slate-900 text-xs sm:text-sm mt-1.5 mb-0.5">
          {headerMatch[2]}
        </h4>
      );
    }

    // Parse inline tokens: bold **...**, markdown links [...](...), and /kos/:id
    const parts = [];
    // Regex for:
    // 1: \[([^\]]+)\]\(([^)]+)\)  --> markdown link
    // 2: \*\*([^*]+)\*\*          --> bold
    // 3: \/kos\/\d+               --> plain kos link
    const inlineRegex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|(\/kos\/\d+)/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      const [, linkText, linkUrl, boldText, plainKosLink] = match;

      if (linkText && linkUrl) {
        if (linkUrl.startsWith('/kos/')) {
          parts.push(
            <Link
              key={`${lineIdx}-${match.index}`}
              to={linkUrl}
              className="text-emerald-700 hover:text-emerald-800 underline font-semibold"
            >
              {linkText}
            </Link>
          );
        } else {
          parts.push(
            <a
              key={`${lineIdx}-${match.index}`}
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:text-emerald-800 underline font-semibold"
            >
              {linkText}
            </a>
          );
        }
      } else if (boldText) {
        parts.push(
          <strong key={`${lineIdx}-${match.index}`} className="font-bold text-slate-900">
            {boldText}
          </strong>
        );
      } else if (plainKosLink) {
        parts.push(
          <Link
            key={`${lineIdx}-${match.index}`}
            to={plainKosLink}
            className="text-emerald-700 hover:text-emerald-800 underline font-semibold"
          >
            {plainKosLink}
          </Link>
        );
      }

      lastIndex = inlineRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    // List item styling
    const isBullet = /^[•\-*]\s/.test(trimmed);
    const isNumbered = /^\d+\.\s/.test(trimmed);

    if (isBullet || isNumbered) {
      return (
        <div key={lineIdx} className="pl-3 relative text-xs sm:text-sm my-0.5 leading-relaxed">
          <span className="font-extrabold text-emerald-700 mr-1.5 select-none">•</span>
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

export default function ChatbotMessage({ message, onPromptSelect }) {
  if (!message) return null;

  const isUser = message.role === 'user';
  const hasKosCards = Array.isArray(message.kos) && message.kos.length > 0;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} my-2`}>
      <div
        className={`flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%] ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs select-none ${
            isUser
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}
        >
          {isUser ? <FiUser className="w-4 h-4" /> : <FiCpu className="w-4 h-4" />}
        </div>

        {/* Bubble & Cards Container */}
        <div className="flex flex-col space-y-2 overflow-hidden flex-1">
          {/* Text Bubble */}
          <div
            className={`px-3.5 py-2.5 rounded-2xl shadow-2xs text-xs sm:text-sm leading-relaxed ${
              isUser
                ? 'bg-emerald-600 text-white rounded-tr-xs'
                : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90 shadow-xs'
            }`}
          >
            {renderFormattedContent(message.content)}

            {/* Fallback relaxation note */}
            {message.fallback_applied && message.fallback_reason && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-amber-900 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/60 leading-normal flex items-start gap-1.5">
                <FiAlertCircle className="shrink-0 w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <strong>Penyesuaian Kriteria:</strong> {message.fallback_reason}
                </div>
              </div>
            )}
          </div>

          {/* Kos Recommendations Cards Section (F-22) */}
          {hasKosCards && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FiHome className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rekomendasi Kos Resmi ({message.kos.length})</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Data Terverifikasi
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {message.kos.map((kos) => (
                  <ChatbotKosCard
                    key={kos.id}
                    kos={kos}
                    onAskAbout={onPromptSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {message.timestamp && (
            <span
              className={`text-[10px] text-slate-400 px-1 select-none ${
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

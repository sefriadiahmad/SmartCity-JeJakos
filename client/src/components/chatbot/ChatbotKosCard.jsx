import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';

export default function ChatbotKosCard({ kos, onAskAbout }) {
  if (!kos) return null;

  const photoSrc = getPhotoUrl(kos.thumbnail || kos.photos?.[0]?.photo_url);

  // Type Badge
  const typeBadgeStyles = {
    putra: 'bg-blue-100 text-blue-700 border-blue-200',
    putri: 'bg-pink-100 text-pink-700 border-pink-200',
    campur: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  // Distance formatting
  let distanceLabel = null;
  if (kos.distance_meters !== undefined && kos.distance_meters !== null) {
    if (kos.distance_meters < 1000) {
      distanceLabel = `${Math.round(kos.distance_meters)} m`;
    } else {
      distanceLabel = `${(kos.distance_meters / 1000).toFixed(1)} km`;
    }
  }

  // Room availability badge
  const hasAvailableRooms = kos.available_rooms !== undefined && kos.available_rooms > 0;
  const isSoldOut = kos.available_rooms !== undefined && kos.available_rooms === 0 && kos.total_rooms > 0;

  // Facilities preview (extract strings)
  const facilityList = (kos.facilities || []).map((f) => (typeof f === 'string' ? f : f.name)).filter(Boolean);
  const visibleFacilities = facilityList.slice(0, 3);
  const remainingCount = facilityList.length - visibleFacilities.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-500/60 hover:shadow-sm transition-all duration-200 p-3 flex flex-col gap-2.5 group">
      {/* Top row: Photo, Title, Price, Type */}
      <div className="flex gap-3 items-start">
        {/* Thumbnail Image */}
        <Link
          to={`/kos/${kos.id}`}
          className="w-20 h-20 sm:w-22 sm:h-22 rounded-lg overflow-hidden bg-slate-100 shrink-0 block relative group/img"
          title={`Buka detail ${kos.name}`}
        >
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={kos.name}
              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 text-lg">
              <span>🏠</span>
            </div>
          )}

          {/* Gender / Type Badge */}
          <span
            className={`absolute top-1 left-1 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md border shadow-2xs ${
              typeBadgeStyles[kos.type] || 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {kos.type}
          </span>
        </Link>

        {/* Content Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
          <div>
            {/* Title */}
            <Link
              to={`/kos/${kos.id}`}
              className="font-bold text-xs sm:text-sm text-slate-900 hover:text-emerald-600 transition leading-snug line-clamp-1"
              title={kos.name}
            >
              {kos.name}
            </Link>

            {/* Address & Distance */}
            <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
              <span>📍</span>
              <span className="truncate">{kos.address}</span>
            </p>
          </div>

          {/* Price & Rating */}
          <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-slate-100">
            <div>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-600">
                {formatCurrency(kos.min_price)}
              </span>
              <span className="text-[10px] text-slate-400 font-normal ml-0.5">/bln</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              {distanceLabel && (
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {distanceLabel}
                </span>
              )}
              {kos.avg_rating > 0 && (
                <span className="font-semibold text-amber-600 flex items-center gap-0.5">
                  ★ {Number(kos.avg_rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle: Facilities Pills & Availability */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px]">
        {/* Facilities */}
        {visibleFacilities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {visibleFacilities.map((fac, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] border border-slate-200/60"
              >
                {fac}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-[10px] text-slate-400 font-medium">
                +{remainingCount} lainnya
              </span>
            )}
          </div>
        )}

        {/* Room Availability Status */}
        {hasAvailableRooms && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
            Sisa {kos.available_rooms} kamar
          </span>
        )}
        {isSoldOut && (
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
            Kamar Penuh
          </span>
        )}
      </div>

      {/* Bottom Actions: View Detail & Ask in Chat */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
        {onAskAbout ? (
          <button
            type="button"
            onClick={() => onAskAbout(`Ceritakan lebih detail fasilitas dan aturan di ${kos.name}`)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition text-center cursor-pointer flex items-center justify-center gap-1 truncate"
            title={`Tanya info lebih lanjut tentang ${kos.name}`}
          >
            <span>💬</span>
            <span className="truncate">Tanya Kos Ini</span>
          </button>
        ) : (
          <span />
        )}

        <Link
          to={`/kos/${kos.id}`}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition text-center flex items-center justify-center gap-1 shadow-2xs group-hover:bg-emerald-700"
        >
          <span>Lihat Kamar</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';

export default function KosCard({
  kos,
  variant = 'grid',
  onHover,
  onLeave,
  className = '',
}) {
  if (!kos) return null;

  const photoSrc = getPhotoUrl(kos.primary_photo || kos.photos?.[0]?.photo_url);
  const photoCount = kos.photos?.length || (photoSrc ? 1 : 0);

  // Formatting distance (F-13 / F-11)
  let distanceText = null;
  if (kos.distance_meters !== undefined && kos.distance_meters !== null) {
    if (kos.distance_meters < 1000) {
      distanceText = `${kos.distance_meters} m`;
    } else {
      distanceText = `${(kos.distance_meters / 1000).toFixed(1)} km`;
    }
  } else if (kos.distance_km !== undefined && kos.distance_km !== null) {
    distanceText = `${kos.distance_km} km`;
  }

  // Type styling
  const typeBadgeStyles = {
    putra: 'bg-blue-600 text-white',
    putri: 'bg-pink-600 text-white',
    campur: 'bg-emerald-600 text-white',
  };

  const isHorizontal = variant === 'horizontal';

  return (
    <div
      onMouseEnter={() => onHover?.(kos)}
      onMouseLeave={() => onLeave?.()}
      className={`bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-lg hover:border-emerald-500/50 transition-all duration-300 flex ${
        isHorizontal ? 'flex-col sm:flex-row' : 'flex-col justify-between'
      } group ${className}`}
    >
      <div className={`flex ${isHorizontal ? 'flex-col sm:flex-row flex-1' : 'flex-col'}`}>
        {/* Photo Container */}
        <Link
          to={`/kos/${kos.id}`}
          className={`relative overflow-hidden bg-slate-100 shrink-0 block ${
            isHorizontal ? 'w-full sm:w-56 aspect-16/10 sm:aspect-auto' : 'aspect-16/10'
          }`}
        >
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={kos.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8">
              <span className="text-2xl mb-1">📷</span>
              <span>Tanpa Foto</span>
            </div>
          )}

          {/* Type Badge */}
          <span
            className={`absolute top-2.5 left-2.5 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md shadow-xs ${
              typeBadgeStyles[kos.type] || 'bg-slate-700 text-white'
            }`}
          >
            {kos.type || 'Kos'}
          </span>

          {/* Photo Count Tag */}
          {photoCount > 1 && (
            <span className="absolute bottom-2.5 right-2.5 text-[10px] font-semibold bg-slate-900/70 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
              📷 {photoCount}
            </span>
          )}

          {/* Distance Tag (if geocoded nearby) */}
          {distanceText && (
            <span className="absolute top-2.5 right-2.5 text-[10px] font-bold bg-white/95 text-emerald-800 px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs flex items-center gap-0.5">
              <span>📍</span>
              <span>{distanceText}</span>
            </span>
          )}
        </Link>

        {/* Info Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            {/* Rating & Location Row */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="truncate font-medium text-slate-600">
                {kos.district || 'Kota Jambi'}
              </span>

              {/* Rating */}
              <div className="flex items-center gap-1 shrink-0">
                {kos.avg_rating > 0 ? (
                  <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                    <span>★</span>
                    <span>{kos.avg_rating}</span>
                    {kos.total_reviews > 0 && (
                      <span className="text-[10px] font-normal text-slate-400">
                        ({kos.total_reviews})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                    Baru
                  </span>
                )}
              </div>
            </div>

            {/* Kos Name */}
            <Link to={`/kos/${kos.id}`}>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                {kos.name}
              </h3>
            </Link>

            {/* Address */}
            <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
              {kos.address}
            </p>

            {/* Facilities Tags */}
            {kos.facilities && kos.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {kos.facilities.slice(0, 3).map((f) => (
                  <span
                    key={f.id || f.name}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                  >
                    {f.name}
                  </span>
                ))}
                {kos.facilities.length > 3 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400">
                    +{kos.facilities.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Availability Bottom Row */}
          <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Mulai dari</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-extrabold text-emerald-700">
                  {kos.min_price > 0 ? formatCurrency(kos.min_price) : '-'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">/bulan</span>
              </div>
            </div>

            <div className="text-right">
              {kos.available_rooms !== undefined && kos.total_rooms !== undefined ? (
                kos.available_rooms > 0 ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Sisa {kos.available_rooms} kamar
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Kamar Penuh
                  </span>
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Button */}
      <div className="p-3 pt-0 sm:p-4 sm:pt-0">
        <Link
          to={`/kos/${kos.id}`}
          className="block w-full py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition duration-200"
        >
          Lihat Detail
        </Link>
      </div>
    </div>
  );
}

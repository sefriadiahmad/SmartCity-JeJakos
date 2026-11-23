import { Link } from 'react-router-dom';
import { FiCamera, FiMapPin, FiStar } from 'react-icons/fi';
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
    putra: 'bg-[var(--jk-badge-putra)] text-white',
    putri: 'bg-[var(--jk-badge-putri)] text-white',
    campur: 'bg-[var(--jk-badge-campur)] text-white',
  };

  const isHorizontal = variant === 'horizontal';

  return (
    <div
      onMouseEnter={() => onHover?.(kos)}
      onMouseLeave={() => onLeave?.()}
      className={`jk-card jk-card-interactive overflow-hidden transition-all duration-200 flex ${
        isHorizontal ? 'flex-col sm:flex-row' : 'flex-col justify-between'
      } group ${className}`}
    >
      <div className={`flex ${isHorizontal ? 'flex-col sm:flex-row flex-1' : 'flex-col'}`}>
        {/* Photo Container */}
        <Link
          to={`/kos/${kos.id}`}
          className={`relative overflow-hidden bg-[#e6eee9] shrink-0 block ${
            isHorizontal ? 'w-full sm:w-56 aspect-16/10 sm:aspect-auto' : 'aspect-16/10'
          }`}
        >
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={kos.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#60736d] text-xs py-8">
              <FiCamera className="w-6 h-6 mb-1 text-[#b9d5c7]" />
              <span>Tanpa Foto</span>
            </div>
          )}

          {/* Type Badge */}
          <span
            className={`absolute top-2.5 left-2.5 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md shadow-xs ${
              typeBadgeStyles[kos.type] || 'bg-[#18352f] text-white'
            }`}
          >
            {kos.type || 'Kos'}
          </span>

          {/* Photo Count Tag */}
          {photoCount > 1 && (
            <span className="absolute bottom-2.5 right-2.5 text-[10px] font-semibold bg-[#18352f]/70 text-white px-2 py-0.5 rounded-md backdrop-blur-xs inline-flex items-center gap-1">
              <FiCamera className="w-3 h-3" />
              <span>{photoCount}</span>
            </span>
          )}

          {/* Distance Tag (if geocoded nearby) */}
          {distanceText && (
            <span className="absolute top-2.5 right-2.5 text-[10px] font-bold bg-[#fffcf7]/95 text-[#1f6b58] px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs flex items-center gap-1">
              <FiMapPin className="w-3 h-3 text-[#1f6b58] shrink-0" />
              <span>{distanceText}</span>
            </span>
          )}
        </Link>

        {/* Info Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            {/* Rating & Location Row */}
            <div className="flex items-center justify-between text-xs text-[#60736d]">
              <span className="truncate font-medium text-[#60736d]">
                {kos.district || 'Kota Jambi'}
              </span>

              {/* Rating */}
              <div className="flex items-center gap-1 shrink-0">
                {kos.avg_rating > 0 ? (
                  <div className="flex items-center gap-1 font-bold text-[var(--jk-rating)] bg-[var(--jk-rating-bg)] px-1.5 py-0.5 rounded-md">
                    <FiStar className="w-3 h-3 fill-[var(--jk-rating)] text-[var(--jk-rating)] shrink-0" />
                    <span>{kos.avg_rating}</span>
                    {kos.total_reviews > 0 && (
                      <span className="text-[10px] font-normal text-[#60736d]">
                        ({kos.total_reviews})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] font-medium text-[#60736d] bg-[#e6eee9] px-1.5 py-0.5 rounded-md">
                    Baru
                  </span>
                )}
              </div>
            </div>

            {/* Kos Name */}
            <Link to={`/kos/${kos.id}`}>
              <h3 className="line-clamp-1 text-sm font-extrabold text-[#18352f] transition group-hover:text-[#1f6b58] sm:text-base">
                {kos.name}
              </h3>
            </Link>

            {/* Address */}
            <p className="text-xs text-[#60736d] line-clamp-1 leading-relaxed">
              {kos.address}
            </p>

            {/* Facilities Tags */}
            {kos.facilities && kos.facilities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {kos.facilities.slice(0, 3).map((f) => (
                  <span
                    key={f.id || f.name}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#e6eee9] text-[#31564c]"
                  >
                    {f.name}
                  </span>
                ))}
                {kos.facilities.length > 3 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[#e6eee9] text-[#60736d]">
                    +{kos.facilities.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Availability Bottom Row */}
          <div className="pt-2 border-t border-[#dce7e1] flex items-end justify-between">
            <div>
              <span className="text-[10px] text-[#60736d] block font-medium">Mulai dari</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-extrabold text-[#1f6b58]">
                  {kos.min_price > 0 ? formatCurrency(kos.min_price) : '-'}
                </span>
                <span className="text-[10px] text-[#60736d] font-medium">/bulan</span>
              </div>
            </div>

            <div className="text-right">
              {kos.available_rooms !== undefined && kos.total_rooms !== undefined ? (
                kos.available_rooms > 0 ? (
                  <span className="text-[11px] font-semibold text-[#1f6b58] bg-[#e6eee9] px-2 py-0.5 rounded-full">
                    Sisa {kos.available_rooms} kamar
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-[#60736d] bg-[#e6eee9] px-2 py-0.5 rounded-full">
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
          className="block w-full py-2 text-center text-xs font-bold text-[#1f6b58] bg-[#e6eee9] hover:bg-[#1f6b58] hover:text-white rounded-[14px] transition duration-200"
        >
          Lihat Detail
        </Link>
      </div>
    </div>
  );
}

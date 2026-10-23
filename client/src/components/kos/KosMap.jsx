import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPhotoUrl } from '../../utils/imageUrl';

// Jambi Campus & City Landmarks
const JAMBI_LANDMARKS = [
  { id: 'unja', name: 'Universitas Jambi (UNJA Mendalo)', lat: -1.6140, lng: 103.5200, icon: '🎓' },
  { id: 'uin', name: 'UIN STS Jambi (Sungai Duren)', lat: -1.6065, lng: 103.5095, icon: '🕌' },
  { id: 'unbari', name: 'Universitas Batanghari (UNBARI)', lat: -1.6045, lng: 103.5930, icon: '📚' },
  { id: 'wtc', name: 'WTC Batanghari (Pusat Kota)', lat: -1.5920, lng: 103.6180, icon: '🏢' },
];

function formatShortPrice(num) {
  if (!num || num <= 0) return 'Kos';
  if (num >= 1000000) {
    const jt = (num / 1000000).toFixed(1).replace('.0', '');
    return `${jt}jt`;
  }
  return `${Math.round(num / 1000)}rb`;
}

function createCustomPin(kos, isSelected = false) {
  const typeColors = {
    putra: { bg: 'bg-blue-600', ring: 'ring-blue-300' },
    putri: { bg: 'bg-pink-600', ring: 'ring-pink-300' },
    campur: { bg: 'bg-emerald-600', ring: 'ring-emerald-300' },
  };

  const color = typeColors[kos.type] || { bg: 'bg-slate-700', ring: 'ring-slate-300' };
  const shortPrice = formatShortPrice(kos.min_price);

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 ${
      isSelected ? 'scale-115 z-50' : 'hover:scale-110 z-10'
    }">
      <div class="px-2 py-0.5 rounded-full ${color.bg} text-white text-[11px] font-bold shadow-md flex items-center gap-1 border-2 border-white ring-2 ${
        isSelected ? 'ring-amber-400' : color.ring
      } whitespace-nowrap">
        <span>Rp</span>
        <span>${shortPrice}</span>
      </div>
      <div class="w-2 h-2 -mt-0.5 rotate-45 ${color.bg} border-r-2 border-b-2 border-white"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-kos-marker',
    iconSize: [60, 30],
    iconAnchor: [30, 28],
    popupAnchor: [0, -28],
  });
}

function createLandmarkPin(landmark) {
  const html = `
    <div class="flex flex-col items-center cursor-pointer">
      <div class="w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-bold shadow-md flex items-center justify-center border-2 border-white ring-2 ring-slate-300">
        ${landmark.icon}
      </div>
      <div class="w-1.5 h-1.5 -mt-0.5 rotate-45 bg-slate-900 border-r-2 border-b-2 border-white"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-landmark-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 30],
    popupAnchor: [0, -30],
  });
}

// Controller to auto-fit bounds & animate to selected kos
function MapBoundsController({ kosList, selectedKos }) {
  const map = useMap();

  useEffect(() => {
    if (selectedKos && !isNaN(selectedKos.latitude) && !isNaN(selectedKos.longitude)) {
      map.flyTo([selectedKos.latitude, selectedKos.longitude], 15, {
        duration: 0.8,
      });
      return;
    }

    const validCoords = (kosList || [])
      .filter((k) => !isNaN(k.latitude) && !isNaN(k.longitude))
      .map((k) => [k.latitude, k.longitude]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, kosList, selectedKos]);

  return null;
}

export default function KosMap({
  kosList = [],
  selectedKos = null,
  onKosSelect,
  center = [-1.6140, 103.5200],
  zoom = 13,
  showLandmarks = true,
  className = 'h-[500px]',
}) {
  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsController kosList={kosList} selectedKos={selectedKos} />

        {/* Campus & City Landmark Pins */}
        {showLandmarks &&
          JAMBI_LANDMARKS.map((landmark) => (
            <Marker
              key={landmark.id}
              position={[landmark.lat, landmark.lng]}
              icon={createLandmarkPin(landmark)}
            >
              <Popup className="custom-popup">
                <div className="p-1 text-center font-sans">
                  <div className="text-xl mb-1">{landmark.icon}</div>
                  <h4 className="font-bold text-xs text-slate-900">{landmark.name}</h4>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Titik Acuan Kampus / Landmark Jambi
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Kos Pins */}
        {kosList.map((kos) => {
          if (isNaN(kos.latitude) || isNaN(kos.longitude)) return null;

          const isSelected = selectedKos?.id === kos.id;
          const photoSrc = getPhotoUrl(kos.primary_photo || kos.photos?.[0]?.photo_url);

          return (
            <Marker
              key={kos.id}
              position={[kos.latitude, kos.longitude]}
              icon={createCustomPin(kos, isSelected)}
              eventHandlers={{
                click: () => onKosSelect?.(kos),
              }}
            >
              <Popup className="custom-popup">
                <div className="w-52 p-1 font-sans text-left space-y-2">
                  {/* Photo thumbnail */}
                  <div className="relative aspect-16/10 rounded-lg overflow-hidden bg-slate-100">
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={kos.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                        📷 Tanpa Foto
                      </div>
                    )}
                    <span className="absolute top-1 left-1 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-900/80 text-white">
                      {kos.type}
                    </span>
                  </div>

                  {/* Info */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                      {kos.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      📍 {kos.district ? `${kos.district}, ` : ''}{kos.address}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="font-extrabold text-emerald-700">
                      {kos.min_price > 0 ? formatCurrency(kos.min_price) : '-'}
                      <span className="text-[10px] font-normal text-slate-500">/bln</span>
                    </span>
                    {kos.avg_rating > 0 && (
                      <span className="text-[10px] font-bold text-amber-600">
                        ★ {kos.avg_rating}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/kos/${kos.id}`}
                    className="block w-full py-1.5 text-center text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                  >
                    Lihat Detail
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

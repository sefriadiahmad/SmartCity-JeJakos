import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';

export default function RoomsTab() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [availFilter, setAvailFilter] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '10' });
        if (availFilter !== '') params.append('is_available', availFilter);

        const res = await api.get(`/admin/rooms?${params.toString()}`);
        if (active) {
          setRooms(res.data?.data || []);
          setTotalPages(res.data?.totalPages || 1);
          setTotal(res.data?.total || 0);
        }
      } catch {
        // room error suppressed
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, availFilter]);

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Kamar</h1>
          <p className="text-sm text-slate-600 mt-1">Audit dan pantau seluruh unit kamar yang terdaftar di platform</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Filter Status Kamar:</label>
            <select value={availFilter} onChange={(e) => { setAvailFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Kamar</option>
              <option value="true">Tersedia (Siap Huni)</option>
              <option value="false">Terisi / Penuh</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">Total: {total} unit kamar terdaftar</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto mb-3" />
              Memuat daftar kamar...
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <p className="text-2xl mb-1">🛏️</p>
              <p className="font-semibold text-slate-700">Tidak ada kamar ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">No / Nama Kamar</th>
                    <th className="py-3 px-4">Properti Kos</th>
                    <th className="py-3 px-4">Harga Sewa</th>
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.room_number || `Kamar #${r.id}`}</td>
                      <td className="py-3 px-4 font-medium text-emerald-800">
                        <Link to={`/kos/${r.kos_id}`} target="_blank" className="hover:underline">{r.kos_name}</Link>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(r.price)}</td>
                      <td className="py-3 px-4 text-slate-600 capitalize">{r.pay_period}</td>
                      <td className="py-3 px-4">
                        {r.is_available
                          ? <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">✓ Tersedia</span>
                          : <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-600">Terisi</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">{r.description || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/kos/${r.kos_id}`} target="_blank" className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">Lihat Kos</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Halaman {page} dari {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Sebelumnya</button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Selanjutnya</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { FiStar, FiFileText } from 'react-icons/fi';

const formatDate = (value) => new Date(value).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

export default function ReviewList({ reviews, summary }) {
  return <>
    <div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><FiStar className="w-4 h-4 text-amber-500 fill-amber-400" /><span>Ulasan Penghuni Nyata</span></h2>{summary.total_reviews > 0 && <div className="text-xs font-bold text-slate-700">Rata-rata: <span className="text-amber-600 text-sm">{summary.avg_rating}</span> / 5.0</div>}</div>
    {reviews.length ? <div className="divide-y divide-slate-100">{reviews.map((review) => <div key={review.id} className="py-4 space-y-1.5 first:pt-0 last:pb-0"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">{(review.user_name || 'U')[0].toUpperCase()}</div><div><p className="text-xs font-bold text-slate-800">{review.user_name || 'Penyewa Terverifikasi'}</p><span className="text-[10px] text-slate-400">{formatDate(review.created_at)}</span></div></div><div className="flex items-center gap-0.5 text-amber-400">{[1, 2, 3, 4, 5].map((s) => <FiStar key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}</div></div>{review.content && <p className="pl-10 text-xs leading-relaxed text-slate-600">{review.content}</p>}</div>)}</div> : <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2"><FiFileText className="w-8 h-8 mx-auto text-slate-300" /><p className="text-xs font-semibold text-slate-700">Belum Ada Ulasan untuk Kos Ini</p><p className="text-[11px] text-slate-500">Ulasan berasal dari penyewa yang benar-benar menghuni kos ini.</p></div>}
  </>;
}

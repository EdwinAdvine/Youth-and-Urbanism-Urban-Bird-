import { useEffect, useState } from "react";
import { Star, Check, Trash2 } from "lucide-react";
import api from "../../services/api";
import Badge from "../../components/ui/Badge";
import { formatDate } from "../../utils/formatPrice";
import toast from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";

export default function AdminReviewsPage() {
  useSEO({ title: "Reviews", noindex: true });
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    api.get("/api/v1/admin/products/reviews/pending?limit=50")
      .then((r) => { setReviews(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/api/v1/admin/products/reviews/${id}/approve`);
      toast.success("Review approved.");
      load();
    } catch { toast.error("Failed to approve review."); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review permanently?")) return;
    try {
      await api.delete(`/api/v1/admin/products/reviews/${id}`);
      toast.success("Review deleted.");
      load();
    } catch { toast.error("Failed to delete review."); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500 font-manrope mt-0.5">Pending moderation</p>
        </div>
        {total > 0 && (
          <span className="bg-maroon-700 text-white text-xs font-manrope font-semibold px-2.5 py-1 rounded-full">
            {total} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-manrope bg-white rounded-xl border border-gray-100">
          No reviews pending moderation.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold font-manrope text-gray-900 text-sm">{r.user_name}</span>
                    <span className="text-gray-400 text-xs font-manrope">on</span>
                    <span className="text-sm font-manrope text-maroon-700 font-medium">{r.product_name}</span>
                    {r.is_verified_purchase && (
                      <Badge variant="success" size="sm">Verified Purchase</Badge>
                    )}
                    <span className="text-xs text-gray-400 font-manrope">{formatDate(r.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={13} className={s <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />
                    ))}
                  </div>
                  {r.title && <p className="font-semibold font-manrope text-gray-900 text-sm mb-1">{r.title}</p>}
                  {r.body && <p className="text-sm font-manrope text-gray-600 leading-relaxed">{r.body}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="flex items-center gap-1.5 text-xs font-manrope bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="flex items-center gap-1.5 text-xs font-manrope text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

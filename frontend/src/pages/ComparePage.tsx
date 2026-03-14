import { Link } from "react-router-dom";
import { X, ArrowRightLeft } from "lucide-react";
import { useCompareStore } from "../store/compareStore";
import { formatKSh } from "../utils/formatPrice";
import Button from "../components/ui/Button";
import { useCartStore } from "../store/cartStore";
import toast from "react-hot-toast";
import { useSEO } from "../hooks/useSEO";

export default function ComparePage() {
  useSEO({ title: "Compare Products", noindex: true });
  const { products, removeProduct, clearCompare } = useCompareStore();
  const { addItem } = useCartStore();

  if (products.length === 0) {
    return (
      <div className="container-custom py-20 text-center">
        <ArrowRightLeft size={64} className="mx-auto text-gray-200 mb-4" />
        <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-3">No products to compare</h1>
        <p className="text-gray-500 font-manrope mb-8">Add up to 4 products to compare them side by side.</p>
        <Link to="/shop"><Button size="lg">Browse Products</Button></Link>
      </div>
    );
  }

  const rows = [
    { label: "Price", key: "price", format: (v: any) => formatKSh(v) },
    { label: "Category", key: "category", format: (v: any) => v?.name ?? "—" },
    { label: "Rating", key: "average_rating", format: (v: any) => v > 0 ? `${v.toFixed(1)} / 5` : "No reviews" },
    { label: "In Stock", key: "total_stock", format: (v: any) => v > 0 ? "Yes" : "Out of Stock" },
  ];

  return (
    <div className="container-custom py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-lexend text-gray-900">Compare Products</h1>
        <button onClick={clearCompare} className="text-sm text-gray-500 hover:text-red-500 font-manrope transition-colors">
          Clear all
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-36 p-3 text-left text-sm font-manrope text-gray-500"></th>
              {products.map((p) => (
                <th key={p.id} className="p-3 align-top">
                  <div className="relative">
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <X size={11} />
                    </button>
                    <Link to={`/products/${p.slug}`}>
                      <div className="aspect-[4/5] w-full rounded-xl overflow-hidden bg-gray-100 mb-2">
                        {p.images?.[0]?.thumbnail_url ? (
                          <img src={p.images[0].thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 font-manrope line-clamp-2 hover:text-maroon-700 transition-colors">
                        {p.name}
                      </p>
                    </Link>
                    <Button
                      size="sm"
                      fullWidth
                      className="mt-2"
                      onClick={async () => {
                        const v = p.variants?.find((v) => v.stock_quantity > 0);
                        if (!v) return toast.error("Out of stock");
                        await addItem(v.id);
                        toast.success("Added to cart");
                      }}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-gray-100">
                <td className="p-3 text-sm font-semibold text-gray-700 font-manrope bg-gray-50">
                  {row.label}
                </td>
                {products.map((p) => (
                  <td key={p.id} className="p-3 text-sm text-gray-700 font-manrope text-center">
                    {row.format((p as any)[row.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

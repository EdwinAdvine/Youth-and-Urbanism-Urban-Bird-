import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import { formatKSh } from "../utils/formatPrice";
import Button from "../components/ui/Button";
import { useSEO } from "../hooks/useSEO";

export default function CartPage() {
  useSEO({ title: "Your Cart", noindex: true });
  const { cart, updateItem, removeItem, clearCart, isLoading } = useCartStore();
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="container-custom py-20 text-center">
        <ShoppingBag size={64} className="mx-auto text-gray-200 mb-4" />
        <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-3">Your cart is empty</h1>
        <p className="text-gray-500 font-manrope mb-8">Add some items to get started.</p>
        <Link to="/shop">
          <Button size="lg">Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold font-lexend text-gray-900 mb-6 sm:mb-8">
        Cart ({cart?.item_count})
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Items */}
        <div className="md:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 sm:gap-4 bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
              <div className="w-20 h-24 sm:w-24 sm:h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                {(item.image_url ?? item.variant?.product?.primary_image) ? (
                  <img src={item.image_url ?? item.variant?.product?.primary_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <Link
                    to={`/products/${item.product_slug ?? item.variant?.product?.slug}`}
                    className="font-semibold text-gray-900 font-manrope hover:text-maroon-700 transition-colors line-clamp-1"
                  >
                    {item.product_name ?? item.variant?.product?.name}
                  </Link>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-gray-500 font-manrope">
                  {item.size ?? item.variant?.size} · {item.color_name ?? item.variant?.color_name}
                </p>
                <p className="text-sm font-bold text-maroon-700 font-manrope mt-1">
                  {formatKSh(item.unit_price)}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => updateItem(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1 || isLoading}
                    className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-maroon-700 hover:text-maroon-700 disabled:opacity-40 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-manrope">{item.quantity}</span>
                  <button
                    onClick={() => updateItem(item.id, item.quantity + 1)}
                    disabled={isLoading}
                    className="w-8 h-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-maroon-700 hover:text-maroon-700 disabled:opacity-40 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                  <span className="ml-auto text-sm font-bold font-manrope text-gray-900">
                    {formatKSh(Number(item.unit_price) * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={clearCart}
            className="text-sm text-gray-400 hover:text-red-500 font-manrope transition-colors"
          >
            Clear cart
          </button>
        </div>

        {/* Order summary */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 sticky top-20 md:top-24">
            <h2 className="text-lg font-bold font-lexend text-gray-900 mb-5">Order Summary</h2>
            <div className="space-y-3 text-sm font-manrope">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal ({cart?.item_count} items)</span>
                <span className="font-medium">{formatKSh(cart?.subtotal ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-500">Calculated at checkout</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-maroon-700">{formatKSh(cart?.subtotal ?? 0)}</span>
              </div>
            </div>
            <Link to="/checkout" className="mt-5 block">
              <Button fullWidth size="lg" className="flex items-center justify-center gap-2">
                Checkout <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/shop" className="mt-3 block">
              <Button fullWidth size="md" variant="outline">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

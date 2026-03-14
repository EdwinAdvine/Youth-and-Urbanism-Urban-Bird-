import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import Drawer from "../ui/Drawer";
import Button from "../ui/Button";
import { useUIStore } from "../../store/uiStore";
import { useCartStore } from "../../store/cartStore";
import { formatKSh } from "../../utils/formatPrice";

export default function CartDrawer() {
  const isOpen = useUIStore((s) => s.isCartDrawerOpen);
  const onClose = useUIStore((s) => s.closeCartDrawer);
  const { cart, updateItem, removeItem, isLoading } = useCartStore();

  const items = cart?.items ?? [];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Cart (${cart?.item_count ?? 0})`}>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 gap-4 text-center px-6">
          <ShoppingBag size={48} className="text-gray-200" />
          <p className="text-gray-500 font-manrope">Your cart is empty</p>
          <Button onClick={onClose} variant="outline" size="sm">
            Continue Shopping
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4">
                {/* Image */}
                <div className="w-20 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {item.image_url ?? item.variant?.product?.primary_image ? (
                    <img
                      src={item.image_url ?? item.variant?.product?.primary_image}
                      alt={item.product_name ?? item.variant?.product?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-manrope line-clamp-1">
                    {item.product_name ?? item.variant?.product?.name}
                  </p>
                  <p className="text-xs text-gray-500 font-manrope mt-0.5">
                    {item.size ?? item.variant?.size} · {item.color_name ?? item.variant?.color_name}
                  </p>
                  <p className="text-sm font-bold text-maroon-700 font-manrope mt-1">
                    {formatKSh(item.unit_price)}
                  </p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateItem(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isLoading}
                      className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-maroon-700 hover:text-maroon-700 disabled:opacity-40 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-manrope w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      disabled={isLoading}
                      className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-600 hover:border-maroon-700 hover:text-maroon-700 disabled:opacity-40 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={isLoading}
                      className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div className="flex justify-between text-sm font-manrope">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-bold text-gray-900">{formatKSh(cart?.subtotal ?? 0)}</span>
            </div>
            <p className="text-xs text-gray-400 font-manrope">Shipping & taxes calculated at checkout</p>
            <Link to="/checkout" onClick={onClose}>
              <Button fullWidth size="lg" className="mt-2">
                Checkout
              </Button>
            </Link>
            <Link to="/cart" onClick={onClose}>
              <Button fullWidth variant="outline" size="md">
                View Cart
              </Button>
            </Link>
          </div>
        </>
      )}
    </Drawer>
  );
}

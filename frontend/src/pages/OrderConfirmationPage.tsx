import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { useOrderStore } from "../store/orderStore";
import { formatKSh, formatDate } from "../utils/formatPrice";
import Button from "../components/ui/Button";

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { currentOrder, fetchOrder, isLoading } = useOrderStore();

  useEffect(() => {
    if (orderId) fetchOrder(orderId);
  }, [orderId]);

  if (isLoading) return <div className="container-custom py-20 text-center text-gray-500 font-manrope">Loading…</div>;

  return (
    <div className="container-custom py-16 max-w-2xl mx-auto text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-600" />
      </div>

      <h1 className="text-3xl font-bold font-lexend text-gray-900 mb-2">Order Confirmed!</h1>
      <p className="text-gray-500 font-manrope mb-2">
        Thank you for your order. We'll send you a confirmation email shortly.
      </p>

      {currentOrder && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-6 mt-8 text-left">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 font-manrope">Order Number</p>
                <p className="text-lg font-bold font-lexend text-gray-900">{currentOrder.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-manrope">Order Date</p>
                <p className="text-sm font-manrope font-medium text-gray-700">{formatDate(currentOrder.created_at)}</p>
              </div>
            </div>

            {currentOrder.payment_method === "mpesa" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-manrope text-green-700">
                  An M-Pesa STK Push has been sent to your phone. Please enter your PIN to complete payment.
                </p>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {currentOrder.items?.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-14 h-16 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-manrope text-gray-900">{item.product_name}</p>
                    <p className="text-xs text-gray-500 font-manrope">{item.size} · {item.color_name} · ×{item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold font-manrope text-gray-900 flex-shrink-0">
                    {formatKSh(Number(item.unit_price) * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between font-bold font-manrope">
              <span>Total</span>
              <span className="text-maroon-700">{formatKSh(currentOrder.total)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <Link to={`/account/orders/${currentOrder.id}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Package size={16} /> Track Order
              </Button>
            </Link>
            <Link to="/shop">
              <Button className="flex items-center gap-2">
                Continue Shopping <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

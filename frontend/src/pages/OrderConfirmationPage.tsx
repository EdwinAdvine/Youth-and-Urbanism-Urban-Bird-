import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { CheckCircle, Package, ArrowRight, Loader2, XCircle } from "lucide-react";
import { useOrderStore } from "../store/orderStore";
import { orderService } from "../services/orderService";
import { formatKSh, formatDate } from "../utils/formatPrice";
import Button from "../components/ui/Button";
import toast from "react-hot-toast";

type VerifyStatus = "idle" | "verifying" | "success" | "failed";

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { currentOrder, fetchOrder, isLoading } = useOrderStore();

  const paystackRef = searchParams.get("reference") || searchParams.get("trxref");
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>(paystackRef ? "verifying" : "idle");
  const [verifyMessage, setVerifyMessage] = useState("");

  useEffect(() => {
    if (orderId) fetchOrder(orderId);
  }, [orderId]);

  // Auto-verify Paystack payment when returning from their checkout page
  useEffect(() => {
    if (!paystackRef) return;

    const verify = async () => {
      setVerifyStatus("verifying");
      try {
        const result = await orderService.verifyPaystack(paystackRef);
        if (result.status === "success") {
          setVerifyStatus("success");
          setVerifyMessage(result.message);
          toast.success("Payment confirmed!");
          // Refresh order so status reflects "confirmed"
          if (orderId) fetchOrder(orderId);
        } else {
          setVerifyStatus("failed");
          setVerifyMessage(result.message || "Payment was not completed.");
        }
      } catch (err: any) {
        setVerifyStatus("failed");
        setVerifyMessage(err.response?.data?.detail || "Could not verify payment. Contact support.");
      }
    };

    verify();
  }, [paystackRef]);

  if (isLoading && !currentOrder) {
    return <div className="container-custom py-20 text-center text-gray-500 font-manrope">Loading…</div>;
  }

  return (
    <div className="container-custom py-10 sm:py-16 max-w-2xl mx-auto text-center">

      {/* Payment verification banner */}
      {verifyStatus === "verifying" && (
        <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Loader2 size={20} className="animate-spin text-blue-600" />
          <p className="text-sm font-manrope text-blue-700">Verifying your payment…</p>
        </div>
      )}
      {verifyStatus === "success" && (
        <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm font-manrope text-green-700 font-semibold">Payment confirmed — your order is being processed.</p>
        </div>
      )}
      {verifyStatus === "failed" && (
        <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
          <XCircle size={20} className="text-red-500" />
          <p className="text-sm font-manrope text-red-600">{verifyMessage}</p>
        </div>
      )}

      {/* Main confirmation icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
        verifyStatus === "failed" ? "bg-red-100" : "bg-green-100"
      }`}>
        {verifyStatus === "failed"
          ? <XCircle size={40} className="text-red-500" />
          : <CheckCircle size={40} className="text-green-600" />
        }
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold font-lexend text-gray-900 mb-2">
        {verifyStatus === "failed" ? "Payment Incomplete" : "Order Placed!"}
      </h1>
      <p className="text-gray-500 font-manrope mb-2">
        {verifyStatus === "failed"
          ? "Your order was created but payment was not completed. Please try again."
          : "Thank you for your order. We'll send you a confirmation email shortly."}
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

            {/* COD notice */}
            {currentOrder.payment_method === "cod" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-manrope text-amber-700">
                  Cash on Delivery — please have the exact amount ready when your order arrives.
                </p>
              </div>
            )}

            {/* Paystack pending (no reference yet) */}
            {currentOrder.payment_method === "paystack" && verifyStatus === "idle" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start justify-between gap-4">
                <p className="text-sm font-manrope text-blue-700">
                  Payment pending — if you were redirected back without completing payment, you can retry below.
                </p>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {currentOrder.items?.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  {(item.image_url || item.product_image) && (
                    <img
                      src={item.image_url || item.product_image}
                      alt=""
                      className="w-14 h-16 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                    />
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
            <Link to={`/account/orders/${currentOrder.order_number}`} className="w-full sm:w-auto">
              <Button variant="outline" fullWidth className="flex items-center justify-center gap-2 sm:w-auto">
                <Package size={16} /> Track Order
              </Button>
            </Link>
            <Link to="/shop" className="w-full sm:w-auto">
              <Button fullWidth className="flex items-center justify-center gap-2 sm:w-auto">
                Continue Shopping <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

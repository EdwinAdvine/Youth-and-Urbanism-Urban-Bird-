import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppRoutes from "./routes";
import { useAuthStore } from "./store/authStore";
import { useCartStore } from "./store/cartStore";
import { useWishlistStore } from "./store/wishlistStore";

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);

  useEffect(() => {
    fetchCart();
    if (isAuthenticated) {
      fetchWishlist();
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "8px",
            fontFamily: "Manrope, sans-serif",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#782121", secondary: "#fff" } },
        }}
      />
    </BrowserRouter>
  );
}

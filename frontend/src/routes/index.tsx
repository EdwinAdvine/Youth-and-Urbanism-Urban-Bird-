import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import StorefrontLayout from "../components/layout/StorefrontLayout";
import AccountLayout from "../components/layout/AccountLayout";
import AdminLayout from "../components/layout/AdminLayout";
import PageLoader from "../components/ui/PageLoader";
import { useAuthStore } from "../store/authStore";

// Storefront pages
const HomePage = lazy(() => import("../pages/HomePage"));
const ShopPage = lazy(() => import("../pages/ShopPage"));
const CategoryPage = lazy(() => import("../pages/CategoryPage"));
const ProductDetailPage = lazy(() => import("../pages/ProductDetailPage"));
const CartPage = lazy(() => import("../pages/CartPage"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("../pages/OrderConfirmationPage"));
const WishlistPage = lazy(() => import("../pages/WishlistPage"));
const ComparePage = lazy(() => import("../pages/ComparePage"));
const SearchPage = lazy(() => import("../pages/SearchPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const TrackOrderPage = lazy(() => import("../pages/TrackOrderPage"));
const FAQPage = lazy(() => import("../pages/FAQPage"));
const ReturnsPage = lazy(() => import("../pages/ReturnsPage"));
const ShippingPage = lazy(() => import("../pages/ShippingPage"));
const PrivacyPage = lazy(() => import("../pages/PrivacyPage"));
const TermsPage = lazy(() => import("../pages/TermsPage"));

// Auth pages
const LoginPage = lazy(() => import("../pages/account/LoginPage"));
const RegisterPage = lazy(() => import("../pages/account/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("../pages/account/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/account/ResetPasswordPage"));
const AdminLoginPage = lazy(() => import("../pages/admin/AdminLoginPage"));

// Account pages
const AccountDashboardPage = lazy(() => import("../pages/account/AccountDashboardPage"));
const OrderHistoryPage = lazy(() => import("../pages/account/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("../pages/account/OrderDetailPage"));
const AddressesPage = lazy(() => import("../pages/account/AddressesPage"));
const AccountSettingsPage = lazy(() => import("../pages/account/AccountSettingsPage"));
const NotificationsPage = lazy(() => import("../pages/account/NotificationsPage"));

// Admin pages
const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const AdminOrdersPage = lazy(() => import("../pages/admin/AdminOrdersPage"));
const AdminOrderDetailPage = lazy(() => import("../pages/admin/AdminOrderDetailPage"));
const AdminProductsPage = lazy(() => import("../pages/admin/AdminProductsPage"));
const AdminProductFormPage = lazy(() => import("../pages/admin/AdminProductFormPage"));
const AdminCategoriesPage = lazy(() => import("../pages/admin/AdminCategoriesPage"));
const AdminInventoryPage = lazy(() => import("../pages/admin/AdminInventoryPage"));
const AdminDeliveryPage = lazy(() => import("../pages/admin/AdminDeliveryPage"));
const AdminCustomersPage = lazy(() => import("../pages/admin/AdminCustomersPage"));
const AdminCouponsPage = lazy(() => import("../pages/admin/AdminCouponsPage"));
const AdminAnalyticsPage = lazy(() => import("../pages/admin/AdminAnalyticsPage"));
const AdminReturnsPage = lazy(() => import("../pages/admin/AdminReturnsPage"));
const AdminStaffPage = lazy(() => import("../pages/admin/AdminStaffPage"));
const AdminSettingsPage = lazy(() => import("../pages/admin/AdminSettingsPage"));
const AdminBannersPage = lazy(() => import("../pages/admin/AdminBannersPage"));
const AdminNewsletterPage = lazy(() => import("../pages/admin/AdminNewsletterPage"));
const AdminNotificationsPage = lazy(() => import("../pages/admin/AdminNotificationsPage"));
const AdminReviewsPage = lazy(() => import("../pages/admin/AdminReviewsPage"));
const AdminContentPage = lazy(() => import("../pages/admin/AdminContentPage"));
const AdminShippingRatesPage = lazy(() => import("../pages/admin/AdminShippingRatesPage"));

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  if (!isInitialized) return <PageLoader />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/account/login" replace />;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  if (!isInitialized) return <PageLoader />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!["admin", "super_admin"].includes(user.role)) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Storefront */}
        <Route element={<StorefrontLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="wishlist" element={<RequireAuth><WishlistPage /></RequireAuth>} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} />
          <Route path="track-order" element={<TrackOrderPage />} />
          <Route path="faq" element={<FAQPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="shipping" element={<ShippingPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
        </Route>

        {/* Auth pages (no layout chrome) */}
        <Route path="account/login" element={<LoginPage />} />
        <Route path="account/register" element={<RegisterPage />} />
        <Route path="account/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="account/reset-password" element={<ResetPasswordPage />} />
        <Route path="admin/login" element={<AdminLoginPage />} />

        {/* Account */}
        <Route
          path="account"
          element={
            <RequireAuth>
              <AccountLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AccountDashboardPage />} />
          <Route path="orders" element={<OrderHistoryPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="addresses" element={<AddressesPage />} />
          <Route path="settings" element={<AccountSettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Admin */}
        <Route
          path="admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/new" element={<AdminProductFormPage />} />
          <Route path="products/:id/edit" element={<AdminProductFormPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="inventory" element={<AdminInventoryPage />} />
          <Route path="delivery" element={<AdminDeliveryPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="returns" element={<AdminReturnsPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="banners" element={<AdminBannersPage />} />
          <Route path="newsletter" element={<AdminNewsletterPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="content/:page" element={<AdminContentPage />} />
          <Route path="shipping" element={<AdminShippingRatesPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

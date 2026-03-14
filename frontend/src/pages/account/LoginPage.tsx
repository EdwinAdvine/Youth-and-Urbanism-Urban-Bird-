import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Logo from "../../components/header/Logo";
import toast from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";

export default function LoginPage() {
  useSEO({ title: "Sign In", noindex: true });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const fetchCart = useCartStore((s) => s.fetchCart);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/account";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ email, password });
      const user = useAuthStore.getState().user;
      if (user && ["admin", "super_admin"].includes(user.role)) {
        navigate("/admin", { replace: true });
        return;
      }
      await fetchCart();
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="text-2xl mb-8" />
          <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-2">Sign In</h1>
          <p className="text-sm text-gray-500 font-manrope mb-8">
            Welcome back! Please enter your details.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-manrope">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <div className="flex justify-end">
              <Link
                to="/account/forgot-password"
                className="text-xs text-maroon-700 hover:text-maroon-800 font-manrope"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" fullWidth isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 font-manrope">
            Don't have an account?{" "}
            <Link to="/account/register" className="text-maroon-700 font-medium hover:text-maroon-800">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden lg:block flex-1 bg-maroon-700 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800')" }}
        />
        <div className="relative h-full flex flex-col justify-end p-12 text-white">
          <h2 className="text-4xl font-bold font-lexend mb-3">Urban Bird</h2>
          <p className="text-maroon-100 font-manrope text-lg">
            Premium urban streetwear for the modern African.
          </p>
        </div>
      </div>
    </div>
  );
}

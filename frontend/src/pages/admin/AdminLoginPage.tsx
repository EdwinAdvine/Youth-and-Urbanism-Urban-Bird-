import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ email, password });
      const user = useAuthStore.getState().user;
      if (!user || !["admin", "super_admin"].includes(user.role)) {
        await useAuthStore.getState().logout();
        toast.error("Access denied. Not an admin account.");
        return;
      }
      toast.success("Welcome back!");
      navigate("/admin", { replace: true });
    } catch {
      // error handled by store
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-maroon-700 rounded-2xl mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold font-lexend text-white">Urban Bird</h1>
          <p className="text-sm text-gray-400 font-manrope mt-1">Admin Panel</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <h2 className="text-lg font-semibold font-lexend text-white mb-1">Sign in to Admin</h2>
          <p className="text-sm text-gray-400 font-manrope mb-6">
            Staff accounts only. Customers please use{" "}
            <a href="/account/login" className="text-maroon-400 hover:text-maroon-300">
              the store login
            </a>
            .
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300 font-manrope">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium font-manrope text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@urbanbird.co.ke"
                required
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium font-manrope text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3.5 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-600 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-maroon-700 hover:bg-maroon-800 disabled:opacity-60 text-white font-manrope font-medium rounded-lg py-2.5 text-sm transition-colors mt-2"
            >
              {isLoading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Logo from "../../components/header/Logo";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      toast.success("Account created! Welcome to Urban Bird.");
      navigate("/account");
    } catch {
      // error from store
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 py-12 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <Logo className="text-2xl mb-6" />
        <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-2">Create Account</h1>
        <p className="text-sm text-gray-500 font-manrope mb-6">
          Join Urban Bird and start shopping.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-manrope">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.first_name} onChange={set("first_name")} placeholder="John" required />
            <Input label="Last Name" value={form.last_name} onChange={set("last_name")} placeholder="Doe" required />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="john@example.com" required />
          <Input label="Phone (optional)" type="tel" value={form.phone} onChange={set("phone")} placeholder="0712 345 678" hint="Format: 07XX XXX XXX" />
          <Input
            label="Password"
            type={showPwd ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            placeholder="Min. 8 characters"
            required
            rightIcon={
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />
          <Input
            label="Confirm Password"
            type="password"
            value={form.confirm_password}
            onChange={set("confirm_password")}
            placeholder="Repeat password"
            required
          />
          <Button type="submit" fullWidth isLoading={isLoading} className="mt-2">
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 font-manrope">
          Already have an account?{" "}
          <Link to="/account/login" className="text-maroon-700 font-medium hover:text-maroon-800">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

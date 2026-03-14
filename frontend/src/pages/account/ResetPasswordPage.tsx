import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authService } from "../../services/authService";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Logo from "../../components/header/Logo";
import toast from "react-hot-toast";
import { useSEO } from "../../hooks/useSEO";

export default function ResetPasswordPage() {
  useSEO({ title: "Reset Password", noindex: true });
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success("Password reset successfully!");
      navigate("/account/login");
    } catch {
      toast.error("Invalid or expired reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 font-manrope mb-4">Invalid reset link.</p>
          <Link to="/account/forgot-password" className="text-maroon-700 font-manrope font-medium hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <Logo className="text-2xl mb-6" />
        <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-2">New Password</h1>
        <p className="text-sm text-gray-500 font-manrope mb-6">Enter your new password below.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="New Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required />
          <Input label="Confirm Password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required />
          <Button type="submit" fullWidth isLoading={isLoading}>Set New Password</Button>
        </form>
      </div>
    </div>
  );
}

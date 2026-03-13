import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../services/authService";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Logo from "../../components/header/Logo";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success("Reset link sent!");
    } catch {
      toast.error("Could not send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <Logo className="text-2xl mb-6" />
        <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-2">Reset Password</h1>

        {sent ? (
          <div>
            <p className="text-sm text-gray-600 font-manrope mb-6">
              We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
            </p>
            <Link to="/account/login">
              <Button fullWidth variant="outline">Back to Sign In</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 font-manrope mb-6">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <Button type="submit" fullWidth isLoading={isLoading}>
                Send Reset Link
              </Button>
            </form>
            <p className="mt-4 text-center text-sm font-manrope text-gray-500">
              <Link to="/account/login" className="text-maroon-700 hover:text-maroon-800 font-medium">
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

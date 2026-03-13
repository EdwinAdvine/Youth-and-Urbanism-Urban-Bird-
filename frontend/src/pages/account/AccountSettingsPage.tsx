import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../services/authService";
import api from "../../services/api";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import toast from "react-hot-toast";

export default function AccountSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  });
  const [password, setPassword] = useState({ current_password: "", new_password: "", confirm: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPwd, setIsSavingPwd] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await api.patch("/api/v1/users/me", profile);
      setUser(res.data);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new_password !== password.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setIsSavingPwd(true);
    try {
      await authService.changePassword(password.current_password, password.new_password);
      toast.success("Password changed!");
      setPassword({ current_password: "", new_password: "", confirm: "" });
    } catch {
      toast.error("Current password is incorrect.");
    } finally {
      setIsSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold font-lexend text-gray-900 mb-5">Profile Information</h2>
        <form onSubmit={handleProfileSave} className="space-y-4 max-w-md">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={profile.first_name}
              onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
              required
            />
            <Input
              label="Last Name"
              value={profile.last_name}
              onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 font-manrope block mb-1">Email</label>
            <p className="text-sm font-manrope text-gray-500 py-2.5">{user?.email} (cannot be changed)</p>
          </div>
          <Input
            label="Phone"
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            placeholder="07XX XXX XXX"
          />
          <Button type="submit" isLoading={isSavingProfile}>Save Changes</Button>
        </form>
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold font-lexend text-gray-900 mb-5">Change Password</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
          <Input
            label="Current Password"
            type="password"
            value={password.current_password}
            onChange={(e) => setPassword((p) => ({ ...p, current_password: e.target.value }))}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={password.new_password}
            onChange={(e) => setPassword((p) => ({ ...p, new_password: e.target.value }))}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={password.confirm}
            onChange={(e) => setPassword((p) => ({ ...p, confirm: e.target.value }))}
            required
          />
          <Button type="submit" isLoading={isSavingPwd}>Change Password</Button>
        </form>
      </div>
    </div>
  );
}

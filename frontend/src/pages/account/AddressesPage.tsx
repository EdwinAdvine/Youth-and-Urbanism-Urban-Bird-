import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Star } from "lucide-react";
import api from "../../services/api";
import type { Address } from "../../types";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { KENYAN_COUNTIES } from "../../utils/constants";
import toast from "react-hot-toast";

const blank: Partial<Address> = {
  full_name: "", phone: "", address_line_1: "", address_line_2: "", city: "", county: "", is_default: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAddress, setEditAddress] = useState<Partial<Address>>(blank);
  const [isSaving, setIsSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    api.get<Address[]>("/api/v1/users/addresses")
      .then((r) => setAddresses(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditAddress(blank); setModalOpen(true); };
  const openEdit = (a: Address) => { setEditAddress(a); setModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editAddress.id) {
        await api.patch(`/api/v1/users/addresses/${editAddress.id}`, editAddress);
      } else {
        await api.post("/api/v1/users/addresses", editAddress);
      }
      toast.success("Address saved!");
      setModalOpen(false);
      load();
    } catch {
      toast.error("Failed to save address.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      await api.delete(`/api/v1/users/addresses/${id}`);
      toast.success("Address deleted.");
      load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.post(`/api/v1/users/addresses/${id}/set-default`);
      load();
    } catch {
      toast.error("Failed to set default.");
    }
  };

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditAddress((a) => ({ ...a, [k]: e.target.value }));

  return (
    <div>
      <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold font-lexend text-gray-900">Addresses</h1>
        <Button size="sm" onClick={openNew} className="flex items-center gap-2">
          <Plus size={15} /> Add Address
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500 font-manrope py-8">Loading…</div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500 font-manrope mb-4">No addresses saved.</p>
          <Button size="sm" onClick={openNew}>Add your first address</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className={`bg-white rounded-xl border p-5 ${a.is_default ? "border-maroon-700" : "border-gray-100"}`}>
              {a.is_default && (
                <span className="inline-flex items-center gap-1 text-xs font-manrope text-maroon-700 font-medium mb-2">
                  <Star size={11} fill="currentColor" /> Default
                </span>
              )}
              <p className="font-semibold font-manrope text-gray-900">{a.full_name}</p>
              <p className="text-sm text-gray-600 font-manrope">{a.phone}</p>
              <p className="text-sm text-gray-600 font-manrope">{a.address_line_1}</p>
              {a.address_line_2 && <p className="text-sm text-gray-600 font-manrope">{a.address_line_2}</p>}
              <p className="text-sm text-gray-600 font-manrope">{a.city}, {a.county}</p>
              <div className="flex items-center gap-3 mt-4">
                <button onClick={() => openEdit(a)} className="text-xs text-gray-500 hover:text-maroon-700 font-manrope flex items-center gap-1 transition-colors">
                  <Edit2 size={12} /> Edit
                </button>
                {!a.is_default && (
                  <button onClick={() => handleSetDefault(a.id)} className="text-xs text-gray-500 hover:text-maroon-700 font-manrope transition-colors">
                    Set as default
                  </button>
                )}
                <button onClick={() => handleDelete(a.id)} className="text-xs text-red-400 hover:text-red-600 font-manrope flex items-center gap-1 transition-colors ml-auto">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editAddress.id ? "Edit Address" : "New Address"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" value={editAddress.full_name || ""} onChange={set("full_name")} required />
            <Input label="Phone" value={editAddress.phone || ""} onChange={set("phone")} required />
          </div>
          <Input label="Address Line 1" value={editAddress.address_line_1 || ""} onChange={set("address_line_1")} required />
          <Input label="Address Line 2 (optional)" value={editAddress.address_line_2 || ""} onChange={set("address_line_2")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City / Town" value={editAddress.city || ""} onChange={set("city")} required />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 font-manrope">County</label>
              <select
                value={editAddress.county || ""}
                onChange={set("county")}
                required
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700"
              >
                <option value="">Select county</option>
                {KENYAN_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!editAddress.is_default}
              onChange={(e) => setEditAddress((a) => ({ ...a, is_default: e.target.checked }))}
              className="rounded border-gray-300 text-maroon-700"
            />
            <span className="text-sm font-manrope text-gray-700">Set as default address</span>
          </label>
          <Button type="submit" fullWidth isLoading={isSaving}>Save Address</Button>
        </form>
      </Modal>
    </div>
  );
}

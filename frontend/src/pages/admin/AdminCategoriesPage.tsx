import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useSEO } from "../../hooks/useSEO";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  display_order: number;
  subcategories: Subcategory[];
}

const emptyCategory = { name: '', slug: '', image_url: '', display_order: 0 };
const emptySubcategory = { name: '', slug: '', category_id: '' };

export default function AdminCategoriesPage() {
  useSEO({ title: "Categories", noindex: true });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Category modal state
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState(emptyCategory);
  const [catSaving, setCatSaving] = useState(false);

  // Subcategory modal state
  const [subModal, setSubModal] = useState(false);
  const [editSub, setEditSub] = useState<Subcategory | null>(null);
  const [subForm, setSubForm] = useState(emptySubcategory);
  const [subSaving, setSubSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/v1/admin/categories');
      setCategories(res.data?.data ?? res.data ?? []);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // ── Category helpers ────────────────────────────────────────────────────────
  const openAddCat = () => {
    setEditCat(null);
    setCatForm(emptyCategory);
    setCatModal(true);
  };

  const openEditCat = (cat: Category) => {
    setEditCat(cat);
    setCatForm({ name: cat.name, slug: cat.slug, image_url: cat.image_url, display_order: cat.display_order });
    setCatModal(true);
  };

  const saveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCatSaving(true);
      if (editCat) {
        await api.patch(`/api/v1/admin/categories/${editCat.id}`, catForm);
        toast.success('Category updated');
      } else {
        await api.post('/api/v1/admin/categories', catForm);
        toast.success('Category created');
      }
      setCatModal(false);
      fetchCategories();
    } catch {
      toast.error('Failed to save category');
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCat = async (id: string) => {
    if (!window.confirm('Delete this category? This may affect products.')) return;
    try {
      await api.delete(`/api/v1/admin/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch {
      toast.error('Failed to delete category');
    }
  };

  // ── Subcategory helpers ─────────────────────────────────────────────────────
  const openAddSub = (categoryId: string) => {
    setEditSub(null);
    setSubForm({ name: '', slug: '', category_id: categoryId });
    setSubModal(true);
  };

  const openEditSub = (sub: Subcategory) => {
    setEditSub(sub);
    setSubForm({ name: sub.name, slug: sub.slug, category_id: sub.category_id });
    setSubModal(true);
  };

  const saveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubSaving(true);
      if (editSub) {
        await api.patch(`/api/v1/admin/categories/subcategories/${editSub.id}`, { name: subForm.name, slug: subForm.slug });
        toast.success('Subcategory updated');
      } else {
        await api.post(`/api/v1/admin/categories/${subForm.category_id}/subcategories`, { name: subForm.name, slug: subForm.slug });
        toast.success('Subcategory created');
      }
      setSubModal(false);
      fetchCategories();
    } catch {
      toast.error('Failed to save subcategory');
    } finally {
      setSubSaving(false);
    }
  };

  const deleteSub = async (id: string) => {
    if (!window.confirm('Delete this subcategory?')) return;
    try {
      await api.delete(`/api/v1/admin/categories/subcategories/${id}`);
      toast.success('Subcategory deleted');
      fetchCategories();
    } catch {
      toast.error('Failed to delete subcategory');
    }
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="p-6 font-manrope min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-lexend text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage product categories and subcategories</p>
        </div>
        <button
          onClick={openAddCat}
          className="bg-[#782121] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#5e1a1a] transition-colors"
        >
          + Add Category
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#782121] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Subcategories</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(categories) ? categories : []).map((cat) => (
                <React.Fragment key={cat.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      {cat.image_url && (
                        <img src={cat.image_url} alt={cat.name} className="w-8 h-8 rounded object-cover" />
                      )}
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-3 text-gray-500">{cat.display_order}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                        className="text-[#782121] hover:underline text-xs font-medium"
                      >
                        {cat.subcategories?.length ?? 0} subcategories
                        {expandedId === cat.id ? ' ▲' : ' ▼'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => openAddSub(cat.id)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        + Sub
                      </button>
                      <button
                        onClick={() => openEditCat(cat)}
                        className="text-xs text-gray-600 hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCat(cat.id)}
                        className="text-xs text-red-600 hover:underline font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  {/* Subcategory rows */}
                  {expandedId === cat.id && cat.subcategories?.map((sub) => (
                    <tr key={sub.id} className="bg-gray-50 border-b border-gray-100">
                      <td className="px-4 py-2 pl-12 text-gray-700 text-xs">↳ {sub.name}</td>
                      <td className="px-4 py-2 text-gray-400 font-mono text-xs">{sub.slug}</td>
                      <td className="px-4 py-2" colSpan={2} />
                      <td className="px-4 py-2 text-right space-x-2">
                        <button
                          onClick={() => openEditSub(sub)}
                          className="text-xs text-gray-600 hover:underline font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSub(sub.id)}
                          className="text-xs text-red-600 hover:underline font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    No categories found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold font-lexend text-gray-900 mb-4">
              {editCat ? 'Edit Category' : 'New Category'}
            </h2>
            <form onSubmit={saveCat} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={catForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCatForm((f) => ({ ...f, name, slug: autoSlug(name) }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  required
                  value={catForm.slug}
                  onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={catForm.image_url}
                  onChange={(e) => setCatForm((f) => ({ ...f, image_url: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  value={catForm.display_order}
                  onChange={(e) => setCatForm((f) => ({ ...f, display_order: Number(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="px-4 py-2 text-sm rounded-lg bg-[#782121] text-white font-semibold hover:bg-[#5e1a1a] disabled:opacity-50"
                >
                  {catSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {subModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold font-lexend text-gray-900 mb-4">
              {editSub ? 'Edit Subcategory' : 'New Subcategory'}
            </h2>
            <form onSubmit={saveSub} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                <select
                  value={subForm.category_id}
                  onChange={(e) => setSubForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                >
                  {(Array.isArray(categories) ? categories : []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={subForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSubForm((f) => ({ ...f, name, slug: autoSlug(name) }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  required
                  value={subForm.slug}
                  onChange={(e) => setSubForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#782121]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSubModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subSaving}
                  className="px-4 py-2 text-sm rounded-lg bg-[#782121] text-white font-semibold hover:bg-[#5e1a1a] disabled:opacity-50"
                >
                  {subSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

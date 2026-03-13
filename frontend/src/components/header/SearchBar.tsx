import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatKSh } from "../../utils/formatPrice";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail_url?: string;
}

export default function SearchBar({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    try {
      const res = await api.get<SearchResult[]>(`/api/v1/search/autocomplete?q=${encodeURIComponent(q)}&limit=5`);
      setResults(res.data);
      setIsOpen(true);
    } catch {
      setResults([]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      onClose?.();
    }
  };

  const handleSelect = (slug: string) => {
    navigate(`/products/${slug}`);
    setIsOpen(false);
    onClose?.();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="Search for hoodies, sweatpants, jackets…"
            className="w-full pl-10 pr-10 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-sm font-manrope focus:outline-none focus:ring-2 focus:ring-maroon-700 focus:bg-white transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r.slug)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              {r.thumbnail_url && (
                <img
                  src={r.thumbnail_url}
                  alt={r.name}
                  className="w-10 h-12 object-cover rounded-md flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate font-manrope">{r.name}</p>
                <p className="text-xs text-maroon-700 font-manrope">{formatKSh(r.price)}</p>
              </div>
            </button>
          ))}
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
            className="w-full px-4 py-3 text-center text-sm text-maroon-700 font-medium font-manrope hover:bg-gray-50 border-t border-gray-100"
          >
            See all results for "{query}"
          </button>
        </div>
      )}
    </div>
  );
}

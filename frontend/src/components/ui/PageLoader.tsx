export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-maroon-700 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-manrope">Loading…</span>
      </div>
    </div>
  );
}

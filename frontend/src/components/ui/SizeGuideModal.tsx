import { X } from "lucide-react";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIZES = [
  { size: "XS", chest: "32–34", waist: "26–28", hip: "35–37", height: "155–160" },
  { size: "S",  chest: "35–37", waist: "29–31", hip: "38–40", height: "160–165" },
  { size: "M",  chest: "38–40", waist: "32–34", hip: "41–43", height: "165–170" },
  { size: "L",  chest: "41–43", waist: "35–37", hip: "44–46", height: "170–175" },
  { size: "XL", chest: "44–46", waist: "38–40", hip: "47–49", height: "175–180" },
  { size: "2XL",chest: "47–49", waist: "41–43", hip: "50–52", height: "180–185" },
  { size: "3XL",chest: "50–52", waist: "44–46", hip: "53–55", height: "185–190" },
];

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold font-lexend text-gray-900">Size Guide</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 font-manrope mb-5">
            All measurements are in inches. For the best fit, measure yourself and compare with the chart below.
          </p>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm font-manrope">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  <th className="px-4 py-3 text-left font-semibold">Size</th>
                  <th className="px-4 py-3 text-center font-semibold">Chest</th>
                  <th className="px-4 py-3 text-center font-semibold">Waist</th>
                  <th className="px-4 py-3 text-center font-semibold">Hip</th>
                  <th className="px-4 py-3 text-center font-semibold">Height (cm)</th>
                </tr>
              </thead>
              <tbody>
                {SIZES.map((row, i) => (
                  <tr
                    key={row.size}
                    className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  >
                    <td className="px-4 py-3 font-bold text-maroon-700">{row.size}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.chest}"</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.waist}"</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.hip}"</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.height}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Measuring tips */}
          <div className="mt-5 bg-maroon-50 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-maroon-800 text-sm font-manrope">How to Measure</h3>
            <ul className="text-sm text-maroon-700 font-manrope space-y-1 list-disc list-inside">
              <li><strong>Chest:</strong> Measure around the fullest part of your chest</li>
              <li><strong>Waist:</strong> Measure around your natural waistline</li>
              <li><strong>Hip:</strong> Measure around the fullest part of your hips</li>
            </ul>
            <p className="text-xs text-maroon-600 font-manrope mt-2">
              When between sizes, we recommend sizing up for a relaxed fit or sizing down for a fitted look.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { useSEO } from "../hooks/useSEO";

export default function NotFoundPage() {
  useSEO({ title: "Page Not Found", noindex: true });
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-white">
      <p className="text-8xl font-bold font-lexend text-maroon-700 mb-4">404</p>
      <h1 className="text-2xl font-bold font-lexend text-gray-900 mb-3">Page Not Found</h1>
      <p className="text-gray-500 font-manrope mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button size="lg">Back to Home</Button>
      </Link>
    </div>
  );
}

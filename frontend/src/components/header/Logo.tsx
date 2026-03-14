import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
}

const LOGO_URL = "/urban-bird-logo.png";

export default function Logo({ variant = "dark", className = "" }: LogoProps) {
  return (
    <Link to="/" className={`inline-flex items-center ${className}`}>
      <img
        src={LOGO_URL}
        alt="Urban Bird"
        className={`h-10 w-auto object-contain ${variant === "light" ? "brightness-0 invert" : ""}`}
        onError={(e) => {
          // Fallback to text logo if image fails to load
          const target = e.currentTarget;
          target.style.display = "none";
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = "inline";
        }}
      />
      <span
        className="font-lexend font-bold tracking-tight text-2xl hidden"
        style={{ display: "none" }}
      >
        <span className={variant === "dark" ? "text-maroon-700" : "text-white"}>URBAN</span>
        <span className={variant === "dark" ? "text-gray-900" : "text-white"}> BIRD</span>
      </span>
    </Link>
  );
}

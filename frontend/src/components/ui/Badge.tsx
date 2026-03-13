import { cn } from "../../utils/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "maroon";
  size?: "sm" | "md";
  className?: string;
}

const variants = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  maroon: "bg-maroon-100 text-maroon-700",
};

export default function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-manrope font-medium rounded-full",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

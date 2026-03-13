import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger" | "secondary";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-manrope font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-maroon-700 text-white hover:bg-maroon-800 focus:ring-maroon-700",
      outline:
        "border border-maroon-700 text-maroon-700 hover:bg-maroon-50 focus:ring-maroon-700",
      ghost:
        "text-maroon-700 hover:bg-maroon-50 focus:ring-maroon-700",
      secondary:
        "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400",
      danger:
        "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    };

    const sizes = {
      sm: "text-sm px-3 py-1.5",
      md: "text-sm px-4 py-2.5",
      lg: "text-base px-6 py-3",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
        {...props}
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;

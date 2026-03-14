import { useState } from "react";
import { cn } from "../../utils/cn";

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  wrapperClassName?: string;
}

/**
 * Drop-in <img> replacement with:
 * - Skeleton shimmer while the image loads
 * - Smooth fade-in once loaded
 * - `loading="lazy"` and `decoding="async"` by default
 */
export default function OptimizedImage({
  src,
  alt,
  className,
  wrapperClassName,
  loading = "lazy",
  ...props
}: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={cn("block relative overflow-hidden", wrapperClassName)}>
      {/* Skeleton — visible until image loads */}
      {!loaded && (
        <span className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </span>
  );
}

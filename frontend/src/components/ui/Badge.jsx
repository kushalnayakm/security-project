import { cn } from "../../utils/cn";

export function Badge({ className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

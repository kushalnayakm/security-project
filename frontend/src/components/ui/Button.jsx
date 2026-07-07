import { forwardRef } from "react";

import { cn } from "../../utils/cn";

const variants = {
  primary:
    "bg-gradient-to-r from-orange-400 via-orange-500 to-blue-900 text-white shadow-lg shadow-orange-200 hover:translate-y-[-1px] hover:shadow-xl hover:shadow-orange-200/70 focus-visible:outline-orange-400",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-slate-50 focus-visible:outline-blue-300",
  ghost:
    "bg-transparent text-slate-600 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-blue-200",
  danger:
    "bg-rose-600 text-white shadow-lg shadow-rose-200 hover:bg-rose-500 focus-visible:outline-rose-500",
};

export const Button = forwardRef(function Button(
  { className, variant = "primary", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});

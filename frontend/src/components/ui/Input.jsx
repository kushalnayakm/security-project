import { forwardRef } from "react";

import { cn } from "../../utils/cn";

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-orange-50/30",
        className,
      )}
      {...props}
    />
  );
});

import { cn } from "../../utils/cn";

export function Card({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_45px_-24px_rgba(15,23,42,0.25)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

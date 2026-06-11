import React from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  fullWidth?: boolean
  children: React.ReactNode
}

export default function Button({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-semibold transition-all duration-200 select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 active:scale-[0.98]'

  const variants: Record<Variant, string> = {
    primary:
      'bg-sky-500 text-white shadow-lg shadow-sky-200 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
    secondary:
      'border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400',
    ghost:
      'bg-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900 disabled:text-slate-400',
    danger:
      'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-40',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftSlot?: React.ReactNode
}

export default function Input({
  label,
  error,
  hint,
  leftSlot,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-600">
          {label}
        </label>
      )}

      <div className="relative">
        {leftSlot && <div className="absolute inset-y-0 left-0 flex items-center pl-4">{leftSlot}</div>}

        <input
          id={inputId}
          className={`
            w-full rounded-2xl border bg-white px-4 py-3.5 text-[15px] text-slate-900
            placeholder:text-slate-400 transition-all duration-200
            focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100
            ${error ? 'border-rose-300' : 'border-slate-200 hover:border-sky-200'}
            ${leftSlot ? 'pl-14' : ''}
            ${className}
          `}
          {...props}
        />
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

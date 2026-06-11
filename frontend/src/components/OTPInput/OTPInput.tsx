import { useRef, KeyboardEvent, ClipboardEvent } from 'react'

interface OTPInputProps {
  value: string[]
  onChange: (otp: string[]) => void
  length?: number
}

/**
 * A row of individual OTP digit boxes.
 * - Auto-advances focus on digit entry
 * - Supports backspace to go back
 * - Supports paste to fill all boxes at once
 */
export default function OTPInput({ value, onChange, length = 6 }: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  // Focus a specific box by index
  const focusBox = (index: number) => {
    refs.current[index]?.focus()
  }

  const handleChange = (index: number, char: string) => {
    // Allow only single numeric digit
    const digit = char.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[index] = digit
    onChange(next)

    // Move focus to next box after typing
    if (digit && index < length - 1) {
      focusBox(index + 1)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // On backspace, clear current box or go back to previous
    if (e.key === 'Backspace') {
      if (value[index]) {
        const next = [...value]
        next[index] = ''
        onChange(next)
      } else if (index > 0) {
        focusBox(index - 1)
      }
    }

    // Arrow key navigation
    if (e.key === 'ArrowLeft' && index > 0) focusBox(index - 1)
    if (e.key === 'ArrowRight' && index < length - 1) focusBox(index + 1)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    const next = Array(length).fill('')
    pasted.split('').forEach((char, i) => {
      next[i] = char
    })
    onChange(next)
    // Focus the last filled box
    focusBox(Math.min(pasted.length, length - 1))
  }

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className="
            otp-box
            w-11 h-14 sm:w-12 sm:h-16
            text-center text-xl font-semibold text-slate-900
            bg-white border-2 border-sky-100 rounded-2xl
            transition-all duration-200
            caret-sky-500
          "
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  )
}

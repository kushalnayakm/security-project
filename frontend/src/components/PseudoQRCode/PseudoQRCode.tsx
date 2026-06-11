interface PseudoQRCodeProps {
  value: string
}

function hashValue(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export default function PseudoQRCode({ value }: PseudoQRCodeProps) {
  const size = 21
  const cells = Array.from({ length: size * size }, (_, index) => {
    const seed = `${value}-${index}`
    return hashValue(seed) % 3 === 0
  })

  return (
    <div className="rounded-[28px] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
      <div
        className="grid gap-[3px] rounded-[20px] bg-slate-950 p-3"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {cells.map((filled, index) => (
          <span
            key={`${value}-${index}`}
            className={`aspect-square rounded-[2px] ${filled ? 'bg-white' : 'bg-slate-950'}`}
          />
        ))}
      </div>
    </div>
  )
}

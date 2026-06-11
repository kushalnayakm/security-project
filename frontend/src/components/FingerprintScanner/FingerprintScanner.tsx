import { Check } from 'lucide-react'

export type FpStage = 'idle' | 'scanning' | 'success' | 'failed'

interface FingerprintScannerProps {
  stage: FpStage
  progress?: number
}

const stageColors: Record<FpStage, { stroke: string; glow: string; text: string }> = {
  idle: { stroke: '#94a3b8', glow: '0 0 0 rgba(0,0,0,0)', text: 'text-slate-500' },
  scanning: { stroke: '#38bdf8', glow: '0 0 28px rgba(56,189,248,0.28)', text: 'text-sky-700' },
  success: { stroke: '#10b981', glow: '0 0 28px rgba(16,185,129,0.24)', text: 'text-emerald-600' },
  failed: { stroke: '#f43f5e', glow: '0 0 28px rgba(244,63,94,0.24)', text: 'text-rose-500' },
}

const stageLabels: Record<FpStage, string> = {
  idle: 'Ready',
  scanning: 'Scanning',
  success: 'Fingerprint registered',
  failed: 'Try again',
}

export default function FingerprintScanner({ stage, progress = 0 }: FingerprintScannerProps) {
  const colors = stageColors[stage]
  const isScanning = stage === 'scanning'

  return (
    <div className="flex select-none flex-col items-center gap-6">
      <div
        className="relative flex h-40 w-40 items-center justify-center rounded-full border border-sky-100 bg-white/75"
        style={{ filter: `drop-shadow(${colors.glow})` }}
      >
        {isScanning && (
          <div
            className="absolute inset-3 rounded-full border-2 border-sky-300/70"
            style={{ animation: 'ringPulse 1.5s ease-in-out infinite' }}
          />
        )}

        <svg viewBox="0 0 100 100" className="h-28 w-28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M50 20 C33 20 20 33 20 50 C20 67 33 80 50 80 C67 80 80 67 80 50 C80 33 67 20 50 20"
            stroke={colors.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            className={isScanning ? 'fp-draw' : ''}
            style={{ transition: 'stroke 0.5s ease' }}
          />
          <path
            d="M50 28 C37 28 28 37 28 50 C28 63 37 72 50 72 C63 72 72 63 72 50 C72 37 63 28 50 28"
            stroke={colors.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            className={isScanning ? 'fp-draw' : ''}
            style={{ animationDelay: '0.2s', transition: 'stroke 0.5s ease' }}
          />
          <path
            d="M50 36 C41 36 36 41 36 50 C36 59 41 64 50 64 C59 64 64 59 64 50 C64 41 59 36 50 36"
            stroke={colors.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            className={isScanning ? 'fp-draw' : ''}
            style={{ animationDelay: '0.4s', transition: 'stroke 0.5s ease' }}
          />
          <path
            d="M50 44 C45 44 44 45 44 50 C44 55 45 56 50 56 C55 56 56 55 56 50 C56 45 55 44 50 44"
            stroke={colors.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            className={isScanning ? 'fp-draw' : ''}
            style={{ animationDelay: '0.6s', transition: 'stroke 0.5s ease' }}
          />
          <circle cx="50" cy="50" r="2.5" fill={colors.stroke} style={{ transition: 'fill 0.5s ease' }} />

          {isScanning && (
            <line
              x1="15"
              y1="50"
              x2="85"
              y2="50"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.8"
              style={{ animation: 'scanBeam 1.8s ease-in-out infinite' }}
            />
          )}
        </svg>
      </div>

      <p key={stage} className={`text-sm font-semibold uppercase tracking-[0.25em] ${colors.text} status-fade`}>
        {stageLabels[stage]}
      </p>

      {isScanning && (
        <div className="w-full max-w-xs">
          <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-sky-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {stage === 'success' && (
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
          <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          Success
        </div>
      )}
    </div>
  )
}

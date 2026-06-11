import { Check, Sparkles, X } from 'lucide-react'

export type ScanStage =
  | 'idle'
  | 'initializing'
  | 'scanning'
  | 'detected'
  | 'verifying'
  | 'matched'
  | 'new_user'
  | 'failed'

interface FaceScannerProps {
  stage: ScanStage
}

const stageLabels: Record<ScanStage, string> = {
  idle: 'Ready',
  initializing: 'Opening Camera',
  scanning: 'Scanning Face',
  detected: 'Face Captured',
  verifying: 'Checking Face',
  matched: 'Verified',
  new_user: 'Continue Registration',
  failed: 'Scan Again',
}

const frameStyles: Record<ScanStage, string> = {
  idle: 'border-sky-200',
  initializing: 'border-sky-300',
  scanning: 'border-sky-400',
  detected: 'border-sky-500',
  verifying: 'border-cyan-400',
  matched: 'border-emerald-400',
  new_user: 'border-sky-500',
  failed: 'border-rose-400',
}

const textStyles: Record<ScanStage, string> = {
  idle: 'text-slate-600',
  initializing: 'text-slate-600',
  scanning: 'text-sky-700',
  detected: 'text-sky-700',
  verifying: 'text-cyan-700',
  matched: 'text-emerald-600',
  new_user: 'text-sky-700',
  failed: 'text-rose-500',
}

export default function FaceScanner({ stage }: FaceScannerProps) {
  const isActive = stage === 'scanning' || stage === 'verifying'
  const isSuccess = stage === 'matched' || stage === 'new_user'
  const isFailed = stage === 'failed'

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      {/* Vignette overlay — dark neutral, no color tint */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 58% 68% at 50% 42%, transparent 34%, rgba(15,23,42,0.45) 100%)',
        }}
      />

      <div className="relative z-10 aspect-[5/6] w-[min(68vw,17rem)] max-w-[82%] sm:w-[min(42vw,18rem)]">
        {/* Pulse rings when active */}
        {isActive && (
          <>
            <div
              className={`absolute inset-0 rounded-[32px] border-2 ${frameStyles[stage]} opacity-40`}
              style={{ animation: 'ringPulse 2s ease-in-out infinite' }}
            />
            <div
              className={`absolute -inset-3 rounded-[36px] border ${frameStyles[stage]} opacity-25`}
              style={{ animation: 'ringPulse 2s ease-in-out 0.4s infinite' }}
            />
          </>
        )}

        {/* Main frame */}
        <div className={`absolute inset-0 rounded-[32px] border-2 ${frameStyles[stage]} bg-white/10`} />

        {/* Corner brackets — each corner drawn correctly */}
        <div className="absolute top-0 left-0 h-8 w-8">
          <div className="absolute top-0 left-0 h-0.5 w-full bg-sky-400" />
          <div className="absolute top-0 left-0 h-full w-0.5 bg-sky-400" />
        </div>
        <div className="absolute top-0 right-0 h-8 w-8">
          <div className="absolute top-0 right-0 h-0.5 w-full bg-sky-400" />
          <div className="absolute top-0 right-0 h-full w-0.5 bg-sky-400" />
        </div>
        <div className="absolute bottom-0 left-0 h-8 w-8">
          <div className="absolute bottom-0 left-0 h-0.5 w-full bg-sky-400" />
          <div className="absolute bottom-0 left-0 h-full w-0.5 bg-sky-400" />
        </div>
        <div className="absolute bottom-0 right-0 h-8 w-8">
          <div className="absolute bottom-0 right-0 h-0.5 w-full bg-sky-400" />
          <div className="absolute bottom-0 right-0 h-full w-0.5 bg-sky-400" />
        </div>

        {/* Scan beam */}
        {isActive && (
          <div
            className="absolute left-0 right-0 h-0.5 overflow-hidden rounded-full"
            style={{ animation: 'scanBeam 2s ease-in-out infinite' }}
          >
            <div
              className="h-full w-full"
              style={{
                background: 'linear-gradient(90deg, transparent, #38bdf8, #bfdbfe, #38bdf8, transparent)',
                boxShadow: '0 0 14px 2px rgba(56, 189, 248, 0.55)',
              }}
            />
          </div>
        )}

        {/* Success icon */}
        {isSuccess && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
              <Check className="h-8 w-8 text-emerald-500" strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Failed icon */}
        {isFailed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-rose-200 bg-rose-50">
              <X className="h-8 w-8 text-rose-500" strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
        )}
      </div>

      {/* Status label */}
      <div className="relative z-10 mt-4 flex flex-col items-center gap-2 px-4">
        <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm">
          <Sparkles className="h-4 w-4 text-sky-500" strokeWidth={2} aria-hidden="true" />
          <span key={stage} className={`text-sm font-semibold ${textStyles[stage]} status-fade`}>
            {stageLabels[stage]}
          </span>
        </div>

        {isActive && (
          <div className="mt-1 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-400"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
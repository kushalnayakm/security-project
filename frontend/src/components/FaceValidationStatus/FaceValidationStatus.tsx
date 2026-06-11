import { Check, AlertCircle, Loader2, X } from 'lucide-react'

export type FaceValidation = {
  noFace: boolean
  multipleFaces: boolean
  tooFar: boolean
  tooClose: boolean
  lowLight: boolean
  faceReady: boolean
}

interface FaceValidationStatusProps {
  validation: FaceValidation
  isActive: boolean
  modelsLoaded: boolean
}

export default function FaceValidationStatus({
  validation,
  isActive,
  modelsLoaded,
}: FaceValidationStatusProps) {
  if (!isActive) return null

  // ── Still loading models ───────────────────────────────────────────────────
  if (!modelsLoaded) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0 text-slate-400" />
        <div>
          <p className="text-sm font-semibold text-slate-700">Setting up face detection</p>
          <p className="text-xs text-slate-500 mt-0.5">This only takes a few seconds</p>
        </div>
      </div>
    )
  }

  // ── All checks pass ────────────────────────────────────────────────────────
  if (validation.faceReady) {
    return (
      <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {['Face detected', 'Good lighting', 'Correct distance', 'Ready to capture'].map((label) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              </div>
              <span className="text-xs font-semibold text-emerald-700">{label} ✓</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Warning state ──────────────────────────────────────────────────────────
  // Derive each check independently and correctly so they never contradict.
  //
  // "Face detected" means exactly one face found (not zero, not multiple).
  // "Single face only" only makes sense to show when face IS detected.
  // When noFace=true: show face-presence checks only.
  // When multipleFaces=true: face was found but there are too many.
  // When face found (count=1): show distance + lighting checks.

  type Check = { label: string; pass: boolean }
  let checks: Check[]
  let warningMessage: string

  if (validation.noFace) {
    // No face at all — only show the face-presence check
    warningMessage = 'No face detected — position your face inside the frame.'
    checks = [
      { label: 'Face in frame',   pass: false },
      { label: 'Good lighting',   pass: !validation.lowLight },
    ]
  } else if (validation.multipleFaces) {
    // Multiple faces
    warningMessage = 'Multiple faces detected — only one person should be visible.'
    checks = [
      { label: 'Face detected',   pass: true  },
      { label: 'Single face only', pass: false },
      { label: 'Good lighting',   pass: !validation.lowLight },
      { label: 'Good distance',   pass: !validation.tooFar && !validation.tooClose },
    ]
  } else {
    // Exactly one face found but distance or lighting fails
    const distancePass = !validation.tooFar && !validation.tooClose
    const lightPass    = !validation.lowLight

    if (validation.tooFar) {
      warningMessage = 'Move closer to the camera.'
    } else if (validation.tooClose) {
      warningMessage = 'Move slightly further away.'
    } else if (validation.lowLight) {
      warningMessage = 'Lighting too low — move to a brighter area.'
    } else {
      warningMessage = 'Adjust your position.'
    }

    checks = [
      { label: 'Face detected',   pass: true         },
      { label: 'Single face only', pass: true         },
      { label: 'Good distance',   pass: distancePass  },
      { label: 'Good lighting',   pass: lightPass     },
    ]
  }

  return (
    <div className="rounded-2xl border-2 border-rose-400 bg-rose-50 px-4 py-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" />
        <p className="text-xs font-semibold text-rose-700 leading-relaxed">
          {warningMessage}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {checks.map(({ label, pass }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                pass ? 'bg-emerald-500' : 'bg-rose-400'
              }`}
            >
              {pass
                ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                : <X    className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              }
            </div>
            <span className={`text-xs font-medium ${pass ? 'text-emerald-700' : 'text-rose-700'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
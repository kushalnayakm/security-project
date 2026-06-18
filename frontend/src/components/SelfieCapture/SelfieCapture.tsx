// frontend/src/components/SelfieCapture/SelfieCapture.tsx
/**
 * <SelfieCapture />
 * -----------------
 * Drop-in KYC selfie UI.  Wraps <CameraCapture /> (untouched) and adds:
 *   - 2-second stability countdown
 *   - auto-capture + upload
 *   - clear status feedback at every phase
 *
 * Usage:
 *   <SelfieCapture onComplete={(token, url) => ...} />
 */

import { useEffect, useRef, useState } from 'react'
import { CheckCircle, RefreshCw, Upload, AlertTriangle } from 'lucide-react'
import CameraCapture from '../CameraCapture/CameraCapture'
import { useSelfieCapture } from '../../hooks/useSelfieCapture'
import type { FaceValidation } from '../FaceValidationStatus/FaceValidationStatus'

// ── Props ──────────────────────────────────────────────────────────────────

interface SelfieCaptureProps {
  /** Called once the selfie is successfully uploaded. */
  onComplete?: (uploadToken: string, photoUrl: string) => void
  /** Called if the user explicitly cancels (optional). */
  onCancel?: () => void
  className?: string
}

// ── Status label helper ────────────────────────────────────────────────────

function phaseLabel(phase: string, countdown: number): string {
  switch (phase) {
    case 'idle':       return 'Starting camera…'
    case 'detecting':  return 'Position your face in the circle'
    case 'stable':     return `Hold still… ${countdown}`
    case 'capturing':  return 'Capturing…'
    case 'uploading':  return 'Uploading…'
    case 'success':    return 'Selfie captured!'
    case 'error':      return 'Something went wrong'
    default:           return ''
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SelfieCapture({
  onComplete,
  onCancel,
  className = '',
}: SelfieCaptureProps) {
  const [cameraActive, setCameraActive] = useState(true)
  const {
    phase,
    countdown,
    result,
    errorMessage,
    onValidation,
    videoRef,
    reset,
  } = useSelfieCapture()

  // Wire the video element produced by CameraCapture into the hook
  const handleVideoReady = (video: HTMLVideoElement | null) => {
    ;(videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = video
  }

  // Once success: surface result to parent
  useEffect(() => {
    if (phase === 'success' && result) {
      onComplete?.(result.uploadToken, result.photoUrl)
    }
  }, [phase, result, onComplete])

  const handleRetry = () => {
    setCameraActive(false)
    setTimeout(() => {
      reset()
      setCameraActive(true)
    }, 300)
  }

  const isProcessing = phase === 'capturing' || phase === 'uploading'

  // ── Overlay ring color ─────────────────────────────────────────────────
  const ringColor =
    phase === 'stable'  ? 'border-emerald-400' :
    phase === 'success' ? 'border-emerald-500' :
    phase === 'error'   ? 'border-rose-400'    :
                          'border-white/40'

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* ── Camera viewport ── */}
      <div className="relative w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
        {phase !== 'success' && (
          <CameraCapture
            isActive={cameraActive && phase !== 'success'}
            onVideoReady={handleVideoReady}
            onValidationChange={onValidation}
            showOverlay
          />
        )}

        {/* Face oval guide */}
        {phase !== 'success' && phase !== 'error' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div
              className={`
                w-48 h-64 rounded-full border-4 transition-colors duration-500
                ${ringColor}
                ${phase === 'stable' ? 'animate-pulse' : ''}
              `}
            />
          </div>
        )}

        {/* Countdown badge */}
        {phase === 'stable' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20
                          bg-black/60 text-white text-lg font-bold
                          rounded-full px-4 py-1 backdrop-blur-sm">
            {countdown}
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center
                          bg-slate-900/80 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2
                            border-sky-400 border-t-transparent" />
            <p className="text-xs text-white/70">
              {phase === 'capturing' ? 'Capturing…' : 'Uploading…'}
            </p>
          </div>
        )}

        {/* Success overlay */}
        {phase === 'success' && result && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center
                          bg-emerald-900/90 gap-3 p-6">
            <CheckCircle className="h-14 w-14 text-emerald-400" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-white">Selfie captured!</p>
            {result.photoUrl && (
              <img
                src={`/${result.photoUrl}`}
                alt="Your captured selfie"
                className="w-28 h-28 rounded-full object-cover border-4 border-emerald-400 mt-2"
              />
            )}
          </div>
        )}
      </div>

      {/* ── Status text ── */}
      <p className={`text-sm font-medium text-center transition-colors
        ${phase === 'error'   ? 'text-rose-500'    :
          phase === 'success' ? 'text-emerald-600'  :
          phase === 'stable'  ? 'text-emerald-700'  :
                                'text-slate-600'}`}>
        {phaseLabel(phase, countdown)}
      </p>

      {/* ── Error detail ── */}
      {phase === 'error' && errorMessage && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200
                        rounded-lg px-4 py-3 max-w-sm w-full">
          <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex gap-3">
        {(phase === 'error') && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5
                       text-sm font-medium text-white hover:bg-sky-700
                       active:scale-95 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        )}
        {onCancel && phase !== 'success' && !isProcessing && (
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-5 py-2.5
                       text-sm font-medium text-slate-600 hover:bg-slate-50
                       active:scale-95 transition-all"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
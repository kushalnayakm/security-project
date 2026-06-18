// frontend/src/hooks/useSelfieCapture.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FaceValidation } from '../components/FaceValidationStatus/FaceValidationStatus'

export type CapturePhase =
  | 'idle'
  | 'detecting'
  | 'stable'
  | 'capturing'
  | 'uploading'
  | 'success'
  | 'error'

export interface SelfieResult {
  photoUrl:    string
  filename:    string
  uploadToken: string
  sizeBytes:   number
}

export interface UseSelfieCapture {
  phase:        CapturePhase
  countdown:    number
  result:       SelfieResult | null
  errorMessage: string | null
  onValidation: (v: FaceValidation, modelsLoaded: boolean) => void
  videoRef:     React.RefObject<HTMLVideoElement | null>
  reset:        () => void
}

const STABLE_SECONDS   = 2
const UPLOAD_ENDPOINT  = '/api/upload/photo'
const CAPTURE_QUALITY  = 0.92
const CANVAS_MAX_WIDTH = 1280

export function useSelfieCapture(): UseSelfieCapture {
  const videoRef       = useRef<HTMLVideoElement | null>(null)
  const tickerRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const capturedRef    = useRef(false)
  
  // ── Use refs for everything the timer closure reads ──────────────────────
  // This is the KEY fix: timers read phaseRef.current, not stale closure value
  const phaseRef       = useRef<CapturePhase>('detecting')
  const countdownRef   = useRef(STABLE_SECONDS)

  const [phase,        setPhase]        = useState<CapturePhase>('detecting')
  const [countdown,    setCountdown]    = useState(STABLE_SECONDS)
  const [result,       setResult]       = useState<SelfieResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Keep ref in sync with state
  const updatePhase = useCallback((p: CapturePhase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const clearTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current)
      tickerRef.current = null
    }
  }, [])

  // ── Capture + Upload ──────────────────────────────────────────────────────
  const captureAndUpload = useCallback(async () => {
    if (capturedRef.current) return
    capturedRef.current = true

    updatePhase('capturing')

    const video = videoRef.current
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setErrorMessage('Camera frame not ready. Please try again.')
      updatePhase('error')
      capturedRef.current = false
      return
    }

    // ── Draw frame to canvas ───────────────────────────────────────────────
    const scale  = Math.min(1, CANVAS_MAX_WIDTH / video.videoWidth)
    const width  = Math.round(video.videoWidth  * scale)
    const height = Math.round(video.videoHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width  = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      setErrorMessage('Canvas unavailable. Please try again.')
      updatePhase('error')
      capturedRef.current = false
      return
    }

    // Mirror to match natural orientation (video CSS is scaleX(-1))
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), 'image/jpeg', CAPTURE_QUALITY)
    )

    if (!blob) {
      setErrorMessage('Could not capture image. Please try again.')
      updatePhase('error')
      capturedRef.current = false
      return
    }

    // ── Upload ────────────────────────────────────────────────────────────
    updatePhase('uploading')
    try {
      const form = new FormData()
      form.append('file', blob, 'selfie.jpg')

      const response = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        body:   form,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.detail ?? `Upload failed (${response.status})`)
      }

      const data = await response.json()
      setResult({
        photoUrl:    data.photo_url,
        filename:    data.filename,
        uploadToken: data.upload_token,
        sizeBytes:   data.size_bytes,
      })
      updatePhase('success')
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Upload failed. Please try again.'
      )
      updatePhase('error')
      capturedRef.current = false
    }
  }, [updatePhase])

  // ── Stability countdown ───────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    clearTicker()
    countdownRef.current = STABLE_SECONDS
    setCountdown(STABLE_SECONDS)
    updatePhase('stable')

    tickerRef.current = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)

      console.log('[useSelfieCapture] tick countdown:', countdownRef.current)

      if (countdownRef.current <= 0) {
        clearTicker()
        void captureAndUpload()
      }
    }, 1000)
  }, [clearTicker, updatePhase, captureAndUpload])

  // ── Validation callback — passed directly to CameraCapture ───────────────
  // CRITICAL: reads phaseRef.current (not stale closure `phase`)
  const onValidation = useCallback(
    (v: FaceValidation, modelsLoaded: boolean) => {
      const currentPhase = phaseRef.current

      console.log(
        '[useSelfieCapture] onValidation',
        'faceReady:', v.faceReady,
        'phase:', currentPhase,
        'modelsLoaded:', modelsLoaded
      )

      // Never interfere once capture is in progress or done
      if (
        currentPhase === 'capturing' ||
        currentPhase === 'uploading' ||
        currentPhase === 'success'
      ) return

      if (!modelsLoaded) return

      if (v.faceReady) {
        // Start countdown only if not already counting
        if (currentPhase !== 'stable') {
          console.log('[useSelfieCapture] Face ready → starting countdown')
          startCountdown()
        }
      } else {
        // Face lost → cancel countdown, go back to detecting
        if (currentPhase === 'stable') {
          console.log('[useSelfieCapture] Face lost → resetting countdown')
          clearTicker()
          countdownRef.current = STABLE_SECONDS
          setCountdown(STABLE_SECONDS)
          updatePhase('detecting')
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startCountdown, clearTicker, updatePhase]
    // phaseRef intentionally NOT in deps — we read .current directly
  )

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    clearTicker()
    capturedRef.current  = false
    countdownRef.current = STABLE_SECONDS
    setCountdown(STABLE_SECONDS)
    setResult(null)
    setErrorMessage(null)
    updatePhase('detecting')
  }, [clearTicker, updatePhase])

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => clearTicker(), [clearTicker])

  return {
    phase,
    countdown,
    result,
    errorMessage,
    onValidation,
    videoRef,
    reset,
  }
}
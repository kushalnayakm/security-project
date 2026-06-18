import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'
import * as faceapi from '@vladmandic/face-api'
import type { FaceValidation } from '../FaceValidationStatus/FaceValidationStatus'

interface CameraCaptureProps {
  isActive?: boolean
  onStreamReady?: (stream: MediaStream) => void
  onVideoReady?: (video: HTMLVideoElement | null) => void
  onPermissionDenied?: () => void
  onCameraReadyChange?: (isReady: boolean) => void
  onFaceCountChange?: (count: number) => void
  onValidationChange?: (validation: FaceValidation, modelsLoaded: boolean) => void
  showOverlay?: boolean
}

export const DEFAULT_VALIDATION: FaceValidation = {
  noFace: true,
  multipleFaces: false,
  tooFar: false,
  tooClose: false,
  lowLight: false,
  faceReady: false,
}

// ── Global singleton — survives re-renders & StrictMode double-mount ──────────
let modelsLoadedGlobal = false
let modelsLoadingPromise: Promise<void> | null = null

async function ensureModelsLoaded(): Promise<void> {
  if (modelsLoadedGlobal) return
  if (modelsLoadingPromise) return modelsLoadingPromise

  modelsLoadingPromise = (async () => {
    // Already loaded (e.g. StrictMode second mount) — skip re-fetch
    if (faceapi.nets.tinyFaceDetector.isLoaded) {
      modelsLoadedGlobal = true
      modelsLoadingPromise = null
      return
    }

    // Sources tried in order: local first, CDN fallbacks for hosted deployments
    const sources = [
      '/models',
      './models',
      'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model',
      'https://raw.githubusercontent.com/vladmandic/face-api/master/model',
    ]

    for (const src of sources) {
      try {
        console.log(`[CameraCapture] Trying model source: ${src}`)
        await Promise.race([
          faceapi.nets.tinyFaceDetector.loadFromUri(src),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error('timeout')), 20_000)
          ),
        ])
        console.log(`[CameraCapture] ✓ Model loaded from: ${src}`)
        modelsLoadedGlobal = true
        modelsLoadingPromise = null
        return
      } catch (err) {
        console.warn(`[CameraCapture] Source failed (${src}):`, err)
        // Reset net so next source loads cleanly
        try { faceapi.nets.tinyFaceDetector.dispose() } catch { /* ignore */ }
      }
    }

    modelsLoadingPromise = null
    throw new Error(
      'Face detection model could not be loaded.\n' +
      'Fix: copy tiny_face_detector_model.bin and ' +
      'tiny_face_detector_model-weights_manifest.json into frontend/public/models/'
    )
  })()

  return modelsLoadingPromise
}

export default function CameraCapture({
  isActive = false,
  onStreamReady,
  onVideoReady,
  onPermissionDenied,
  onCameraReadyChange,
  onFaceCountChange,
  onValidationChange,
  showOverlay = false,
}: CameraCaptureProps) {
  const videoRef       = useRef<HTMLVideoElement>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const detectionRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lightCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [error,        setError]        = useState<string | null>(null)
  const [isLoading,    setIsLoading]    = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(modelsLoadedGlobal)
  const [modelError,   setModelError]   = useState<string | null>(null)
  const [debugErr,     setDebugErr]     = useState<string | null>(null)

  // Stable callback refs — prevents stale closures in async loops
  const cbStreamReady      = useRef(onStreamReady)
  const cbVideoReady       = useRef(onVideoReady)
  const cbPermissionDenied = useRef(onPermissionDenied)
  const cbCameraReady      = useRef(onCameraReadyChange)
  const cbFaceCount        = useRef(onFaceCountChange)
  const cbValidation       = useRef(onValidationChange)

  useEffect(() => { cbStreamReady.current      = onStreamReady },      [onStreamReady])
  useEffect(() => { cbVideoReady.current       = onVideoReady },        [onVideoReady])
  useEffect(() => { cbPermissionDenied.current = onPermissionDenied }, [onPermissionDenied])
  useEffect(() => { cbCameraReady.current      = onCameraReadyChange }, [onCameraReadyChange])
  useEffect(() => { cbFaceCount.current        = onFaceCountChange },   [onFaceCountChange])
  useEffect(() => { cbValidation.current       = onValidationChange },  [onValidationChange])

  // ── Load models on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (modelsLoadedGlobal) { setModelsLoaded(true); return }
    let cancelled = false
    ensureModelsLoaded()
      .then(() => {
        if (!cancelled) {
          setModelsLoaded(true)
          // ▶ RESTORED: Notify parent that models are loaded so UI transitions
          //   from "Setting up face detection" to "No face detected".
          //   No race condition — detection can't produce results before this
          //   because it depends on the modelsLoaded state set above.
          cbValidation.current?.(DEFAULT_VALIDATION, true)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setModelError(err instanceof Error ? err.message : 'Face detection unavailable.')
      })
    return () => { cancelled = true }
  }, [])

  // ── Brightness check — threshold 25, generous for indoor conditions ────────
  const checkLighting = (video: HTMLVideoElement): boolean => {
    try {
      if (!lightCanvasRef.current) lightCanvasRef.current = document.createElement('canvas')
      const c = lightCanvasRef.current
      c.width = 64; c.height = 64
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) return true
      ctx.drawImage(video, 0, 0, 64, 64)
      const { data } = ctx.getImageData(0, 0, 64, 64)
      let total = 0
      for (let i = 0; i < data.length; i += 4)
        total += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      const brightness = total / (data.length / 4)
      console.log(`[CameraCapture] Brightness: ${brightness.toFixed(1)}`)
      return brightness > 25
    } catch { return true }
  }

  // ── Detection loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modelsLoaded || !isActive) return
    let stopped = false

    const detect = async () => {
      console.log('[DETECT LOOP START]')
      if (stopped) return
      const video = videoRef.current
      console.log('[VIDEO CHECK]', {
        exists: !!video,
        readyState: video?.readyState,
        paused: video?.paused,
        width: video?.videoWidth,
        height: video?.videoHeight,
      })

      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        console.log('[detect] waiting for video —', {
          exists: !!video,
          readyState: video?.readyState,
          width: video?.videoWidth,
        })
        detectionRef.current = setTimeout(detect, 300)
        return
      }

      // Resume playback if autoplay was blocked (common on mobile)
      if (video.paused) video.play().catch(() => {})

      try {
        // Pass 1 — balanced quality
        let detections = await faceapi.detectAllFaces(
          console.log('[DETECT] running face detection…') ||
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 }),
        )
        // Pass 2 — maximum sensitivity, only if pass 1 found nothing
        if (detections.length === 0) {
          detections = await faceapi.detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.1 }),
          )
        }

        if (stopped) return
        setDebugErr(null)

        const count = detections.length
        console.log(`[CameraCapture] Faces: ${count}`)
        cbFaceCount.current?.(count)

        const goodLight = checkLighting(video)
        let tooFar = false, tooClose = false

        if (count === 1 && video.videoHeight > 0) {
          const ratio = detections[0].box.height / video.videoHeight
          console.log(`[CameraCapture] Face ratio: ${ratio.toFixed(3)}`)
          tooFar   = ratio < 0.15   // very relaxed — was 0.22
          tooClose = ratio > 0.85   // very relaxed — was 0.72
        }

        const noFace        = count === 0
        const multipleFaces = count >= 2
        const faceReady     = count === 1 && !tooFar && !tooClose && goodLight

        console.log(`[CameraCapture] faceReady:${faceReady} noFace:${noFace} tooFar:${tooFar} tooClose:${tooClose} lowLight:${!goodLight}`)

        cbValidation.current?.(
          { noFace, multipleFaces, tooFar, tooClose, lowLight: !goodLight, faceReady },
          true,
        )
      } catch (err) {
        console.warn('[CameraCapture] Detection error:', err)
        setDebugErr(err instanceof Error ? err.message : String(err))
      }

      if (!stopped) detectionRef.current = setTimeout(detect, 400)
    }

    void detect()
    return () => {
      stopped = true
      if (detectionRef.current) { clearTimeout(detectionRef.current); detectionRef.current = null }
    }
  }, [modelsLoaded, isActive])

  // ── Reset validation ONLY when camera turns off ───────────────────────────
  // NOTE: modelsLoaded intentionally excluded from deps — adding it caused a
  // race where DEFAULT_VALIDATION overwrote a valid faceReady:true result.
  useEffect(() => {
    if (!isActive) cbValidation.current?.(DEFAULT_VALIDATION, modelsLoaded)
  }, [isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop stream ───────────────────────────────────────────────────────────
  // ▶ FIX: Removed detectionRef cleanup from here.
  //   The detection loop effect manages its own lifecycle via its `stopped`
  //   flag and its cleanup function.  When stopStream() cleared detectionRef,
  //   it killed the detection loop's pending setTimeout — because React runs
  //   effects in declaration order: detection loop scheduled a retry, then
  //   camera lifecycle's start() → stopStream() cancelled it.
  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    cbVideoReady.current?.(null)
    cbCameraReady.current?.(false)
  }

  const toCameraError = (e: unknown): string => {
    if (e instanceof DOMException) {
      switch (e.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError': return 'Camera permission denied. Allow camera access in browser settings.'
        case 'NotFoundError':         return 'No camera found on this device.'
        case 'NotReadableError':
        case 'AbortError':            return 'Camera is in use by another app. Close it and try again.'
        default:                      return 'Camera could not start. Please try again.'
      }
    }
    return 'Camera could not start. Please try again.'
  }

  // ── Camera lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    if (!isActive) { setIsLoading(false); setError(null); stopStream(); return }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.log('mediaDevices:', navigator.mediaDevices)
        console.log('secureContext:', window.isSecureContext)
        console.log('protocol:', window.location.protocol)
        alert(`
          mediaDevices=${!!navigator.mediaDevices}
          secureContext=${window.isSecureContext}
          protocol=${window.location.protocol}
`)}
      stopStream(); setError(null); setIsLoading(true)
      await new Promise((r) => setTimeout(r, 200))
      if (cancelled) return

      try {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }

        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await new Promise<void>((resolve) => {
            if (video.readyState >= 1) { resolve(); return }
            const fn = () => { video.removeEventListener('loadedmetadata', fn); resolve() }
            video.addEventListener('loadedmetadata', fn)
          })
          if (cancelled) return
          video.play().catch(() => {})
          cbVideoReady.current?.(video)
        }
        setError(null); setIsLoading(false)
        cbCameraReady.current?.(true)
        cbStreamReady.current?.(stream)
      } catch (err) {
        if (cancelled) return
        setIsLoading(false); cbCameraReady.current?.(false)
        if (err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'))
          cbPermissionDenied.current?.()
        setError(toCameraError(err))
      }
    }

    void start()
    return () => { cancelled = true; stopStream() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  // ── Renders ───────────────────────────────────────────────────────────────
  if (!isActive) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-200 bg-sky-50">
          <Camera className="h-7 w-7 text-sky-500" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="text-sm text-slate-500">
          Tap <strong className="text-slate-700">Scan Face</strong> to open the camera.
        </p>
      </div>
    )
  }

  if (modelError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
          <CameraOff className="h-7 w-7 text-amber-500" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="text-sm font-medium text-slate-700">Face detection unavailable</p>
        <p className="text-xs text-slate-500 max-w-xs break-words whitespace-pre-wrap">{modelError}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-rose-200 bg-rose-50">
          <CameraOff className="h-7 w-7 text-rose-500" strokeWidth={1.5} aria-hidden />
        </div>
        <p className="text-sm text-slate-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="text-xs text-white/70">Starting camera…</p>
          </div>
        </div>
      )}

      {!isLoading && !modelsLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <p className="text-xs text-white/80">Loading face detection…</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline autoPlay muted
        aria-label="Camera preview"
      />

      {showOverlay && !isLoading && (
        <div className="absolute left-2 top-2 z-30 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-white">LIVE</span>
        </div>
      )}

      {debugErr && (
        <div className="absolute bottom-2 left-2 right-2 z-40 bg-red-600/95 text-white text-[10px] p-2 rounded break-words">
          {debugErr}
        </div>
      )}
    </div>
  )
}
import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, RefreshCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button/Button'
import CameraCapture from '../../components/CameraCapture/CameraCapture'

export default function Landing() {
  const navigate = useNavigate()
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isCaptured, setIsCaptured] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const handleStartScan = () => {
    setIsCameraActive(true)
    setIsCaptured(false)
    setCapturedImage(null)
  }

  const handleCapture = () => {
    if (!isCameraReady || !videoElement) {
      return
    }

    const canvas = canvasRef.current ?? document.createElement('canvas')
    const sourceWidth = videoElement.videoWidth || 1280
    const sourceHeight = videoElement.videoHeight || 960

    canvas.width = sourceWidth
    canvas.height = sourceHeight

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.translate(sourceWidth, 0)
    context.scale(-1, 1)
    context.drawImage(videoElement, 0, 0, sourceWidth, sourceHeight)

    if (!canvasRef.current) {
      canvasRef.current = canvas
    }

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92))
    setIsCaptured(true)
  }

  const handleRetake = () => {
    setIsCaptured(false)
    setCapturedImage(null)
  }

  const handleContinue = () => {
    navigate('/user-verification')
  }

  const promptText = isCaptured
    ? 'Face captured. Continue or retake.'
    : isCameraActive
    ? isCameraReady
      ? 'Hold still and center your face in the frame.'
      : 'Allow camera access to start the preview.'
    : 'Tap Scan Face to start the front camera.'

  return (
    <div className="h-screen overflow-hidden bg-slate-50 px-4 py-3 sm:px-5">
      <div className="mx-auto flex h-full w-full max-w-full flex-col justify-center md:max-w-[420px] lg:max-w-[500px]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-center gap-3 pb-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
            </button>
            <div>
              <p className="text-base font-semibold tracking-tight text-slate-900">Face Capture</p>
              <p className="mt-1 text-xs text-slate-500">Quick biometric onboarding for verification.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-950/5">
            <div className="relative aspect-[4/3] w-full bg-slate-950/5">
              <CameraCapture
                isActive={isCameraActive}
                onCameraReadyChange={setIsCameraReady}
                onVideoReady={setVideoElement}
                showOverlay={false}
              />

              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured face preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              {!isCaptured && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
                  <div className="relative h-32 w-40 rounded-[24px] border border-sky-300/40">
                    <div className="absolute left-0 top-0 h-4 w-4 border-t-2 border-l-2 border-sky-300/80" />
                    <div className="absolute right-0 top-0 h-4 w-4 border-t-2 border-r-2 border-sky-300/80" />
                    <div className="absolute left-0 bottom-0 h-4 w-4 border-b-2 border-l-2 border-sky-300/80" />
                    <div className="absolute right-0 bottom-0 h-4 w-4 border-b-2 border-r-2 border-sky-300/80" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">{promptText}</div>

          <div className={`mt-3 grid gap-3 ${isCaptured ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isCaptured ? (
              <>
                <Button variant="secondary" fullWidth onClick={handleRetake}>
                  <RefreshCcw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Retake
                </Button>
                <Button fullWidth onClick={handleContinue}>
                  Continue
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Button
                fullWidth
                variant={isCameraActive ? 'secondary' : 'primary'}
                onClick={isCameraActive ? handleCapture : handleStartScan}
                disabled={isCameraActive && !isCameraReady}
              >
                <Camera className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {isCameraActive ? 'Capture' : 'Scan Face'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

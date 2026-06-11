import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronDown, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button/Button'
import CameraCapture from '../../components/CameraCapture/CameraCapture'
import FaceScanner, { type ScanStage } from '../../components/FaceScanner/FaceScanner'
import FaceValidationStatus, { type FaceValidation } from '../../components/FaceValidationStatus/FaceValidationStatus'
import Input from '../../components/Input/Input'
import OTPInput from '../../components/OTPInput/OTPInput'
import {
  createRegistrationSession,
  sendRegistrationOtp,
  type SessionSummary,
  uploadPhoto,
  verifyRegistrationOtp,
  runFaceLogin,
  sendLoginOtp,
  verifyLoginOtp,
  verifyFingerprintLogin,
} from '../../lib/api'
import { clearSession, saveIdentity, saveSession, loadIdentity } from '../../lib/storage'
import FingerprintScanner from '../../components/FingerprintScanner/FingerprintScanner'

type UiStep = 'face' | 'biometric' | 'name' | 'phone' | 'otp'

const COUNTRY_OPTIONS = [
  { flag: '🇮🇳', label: 'India',          code: '+91' },
  { flag: '🇺🇸', label: 'United States',  code: '+1'  },
  { flag: '🇬🇧', label: 'United Kingdom', code: '+44' },
]

const DEFAULT_VALIDATION: FaceValidation = {
  noFace: true,
  multipleFaces: false,
  tooFar: false,
  tooClose: false,
  lowLight: false,
  faceReady: false,
}

// How many consecutive faceReady frames before we auto-capture.
// At ~400 ms/frame this is ~1.2 s of stable detection — enough to avoid
// accidental captures from a single-frame false positive.
const STABLE_FRAMES_REQUIRED = 3

async function detectBiometricSupport(): Promise<boolean> {
  if (!('PublicKeyCredential' in window)) return false
  const cred = window.PublicKeyCredential as typeof PublicKeyCredential & {
    isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean>
  }
  if (!cred.isUserVerifyingPlatformAuthenticatorAvailable) return false
  try { return await cred.isUserVerifyingPlatformAuthenticatorAvailable() }
  catch { return false }
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [meta, payload] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? 'image/jpeg'
  const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
  return new File([bytes], fileName, { type: mime })
}

function StepShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:max-w-lg sm:p-5">
      <h1 className="text-lg font-semibold text-slate-950 sm:text-xl">{title}</h1>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function MobileSession() {
  const navigate = useNavigate()

  const [session,     setSession]     = useState<SessionSummary | null>(null)
  const [busy,        setBusy]        = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [uiStep,      setUiStep]      = useState<UiStep>('face')

  // camera
  const [cameraActive,  setCameraActive]  = useState(false)
  const [cameraReady,   setCameraReady]   = useState(false)
  const [videoElement,  setVideoElement]  = useState<HTMLVideoElement | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [scanStage,     setScanStage]     = useState<ScanStage>('idle')

  // face validation
  const [faceValidation,   setFaceValidation]   = useState<FaceValidation>(DEFAULT_VALIDATION)
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false)

  // auto-capture: counts consecutive faceReady frames
  const stableFramesRef  = useRef(0)
  const autoCapturedRef  = useRef(false) // prevents double-capture in StrictMode

  // countdown shown inside camera frame before capture (1–3)
  const [countdown, setCountdown] = useState<number | null>(null)

  // flow / fingerprint
  const [isLoginFlow, setIsLoginFlow] = useState(false)
  const [fpStage,     setFpStage]     = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle')
  const [fpProgress,  setFpProgress]  = useState(0)

  // registration
  const [biometricSupported,  setBiometricSupported]  = useState(false)
  const [biometricRegistered, setBiometricRegistered] = useState(false)
  const [name,         setName]         = useState('')
  const [countryCode,  setCountryCode]  = useState(COUNTRY_OPTIONS[0].code)
  const [phoneNumber,  setPhoneNumber]  = useState('')
  const [otp,          setOtp]          = useState<string[]>(Array(6).fill(''))
  const [debugOtp,     setDebugOtp]     = useState<string | null>(null)
  const [facePhotoUrl, setFacePhotoUrl] = useState<string | null>(null)

  const canvasRef    = useRef<HTMLCanvasElement | null>(null)
  const locationName = 'Biometric Access'
  const sessionToken = session?.session_token ?? null

  useEffect(() => { void detectBiometricSupport().then(setBiometricSupported) }, [])

  // ── Auto-capture: take photo from video frame ─────────────────────────────
  const doCapture = useCallback(() => {
    const video = videoElement
    if (!video || !cameraReady) return

    const canvas = canvasRef.current ?? document.createElement('canvas')
    const w = video.videoWidth  || 1280
    const h = video.videoHeight || 960
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Mirror the image to match the mirrored video preview
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    canvasRef.current = canvas

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedImage(dataUrl)
    setCameraActive(false)
    setScanStage('detected')
    setCountdown(null)
    setError(null)
  }, [videoElement, cameraReady])

  // ── Validation change: drive auto-capture ─────────────────────────────────
  // Every time CameraCapture reports a new validation frame, we increment a
  // consecutive-ready counter. Once it hits STABLE_FRAMES_REQUIRED we capture.
  // The counter resets immediately when the face is no longer ready.
  const handleValidationChange = useCallback((v: FaceValidation, loaded: boolean) => {
    setFaceValidation(v)
    if (loaded) setFaceModelsLoaded(true)

    if (v.faceReady && !autoCapturedRef.current) {
      stableFramesRef.current += 1

      // Show a visual countdown (3 → 2 → 1) inside the camera frame
      const remaining = STABLE_FRAMES_REQUIRED - stableFramesRef.current
      setCountdown(remaining > 0 ? remaining : null)

      if (stableFramesRef.current >= STABLE_FRAMES_REQUIRED) {
        autoCapturedRef.current = true   // lock so it fires only once
        setCountdown(null)
        doCapture()
      }
    } else if (!v.faceReady) {
      // Face lost — reset counter and countdown
      stableFramesRef.current = 0
      setCountdown(null)
    }
  }, [doCapture])

  // ── Scan face / retake ────────────────────────────────────────────────────
  const handleScanFace = () => {
    setCameraActive(true)
    setCapturedImage(null)
    setCameraReady(false)
    setScanStage('initializing')
    setFaceValidation(DEFAULT_VALIDATION)
    setCountdown(null)
    stableFramesRef.current = 0
    autoCapturedRef.current = false
    setError(null)
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setCameraActive(false)
    setCameraReady(false)
    setScanStage('idle')
    setFaceValidation(DEFAULT_VALIDATION)
    setCountdown(null)
    stableFramesRef.current = 0
    autoCapturedRef.current = false
    setError(null)
  }

  // ── Continue after face ───────────────────────────────────────────────────
  const handleContinueAfterFace = async () => {
    if (!capturedImage) return
    try {
      setBusy(true)
      setError(null)
      setScanStage('verifying')

      const identity       = loadIdentity()
      const faceProfileKey = identity ? identity.faceProfileKey : null
      clearSession()

      if (faceProfileKey) {
        const { session: newSession } = await createRegistrationSession()
        setSession(newSession)

        const faceLoginRes = await runFaceLogin(newSession.session_token, capturedImage, faceProfileKey)

        if (faceLoginRes.result === 'matched') {
          setIsLoginFlow(true)
          const matchedUser = faceLoginRes.user
          if (matchedUser && matchedUser.biometric_registered) {
            const supported = await detectBiometricSupport()
            setBiometricSupported(supported)
            if (supported) {
              setUiStep('biometric')
            } else {
              saveIdentity(matchedUser, faceLoginRes.face_profile_key)
              if (faceLoginRes.access_token) saveSession(faceLoginRes.session, faceLoginRes.access_token)
              navigate(`/dashboard?session=${faceLoginRes.session.session_token}`, { replace: true })
            }
          } else {
            if (matchedUser) saveIdentity(matchedUser, faceLoginRes.face_profile_key)
            if (faceLoginRes.access_token) saveSession(faceLoginRes.session, faceLoginRes.access_token)
            navigate(`/dashboard?session=${faceLoginRes.session.session_token}`, { replace: true })
          }
        } else if (faceLoginRes.result === 'otp_fallback') {
          setIsLoginFlow(true)
          if (identity) { setPhoneNumber(identity.phoneNumber); setCountryCode(identity.countryCode) }
          setUiStep('phone')
        } else {
          const file = dataUrlToFile(capturedImage, 'face-capture.jpg')
          const { photo_url } = await uploadPhoto(file)
          setFacePhotoUrl(photo_url)
          setScanStage('new_user')
          const supported = await detectBiometricSupport()
          setBiometricSupported(supported)
          setUiStep(supported ? 'biometric' : 'name')
        }
      } else {
        setIsLoginFlow(false)
        const { session: newSession } = await createRegistrationSession()
        setSession(newSession)
        const file = dataUrlToFile(capturedImage, 'face-capture.jpg')
        const { photo_url } = await uploadPhoto(file)
        setFacePhotoUrl(photo_url)
        setScanStage('new_user')
        const supported = await detectBiometricSupport()
        setBiometricSupported(supported)
        setUiStep(supported ? 'biometric' : 'name')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding initialisation failed.')
      setScanStage('failed')
    } finally {
      setBusy(false)
    }
  }

  // ── Biometric ─────────────────────────────────────────────────────────────
  const handleRegisterFingerprint = () => {
    if (fpStage === 'scanning') return
    setFpStage('scanning')
    setFpProgress(0)
    setError(null)

    const interval = window.setInterval(() => {
      setFpProgress((current) => {
        const next = Math.min(current + 20, 100)
        if (next >= 100) {
          window.clearInterval(interval)
          setTimeout(async () => {
            try {
              if (isLoginFlow) {
                if (!sessionToken) throw new Error('Missing session token')
                const res = await verifyFingerprintLogin(sessionToken, true)
                setFpStage('success')
                saveIdentity(res.user, res.face_profile_key)
                saveSession(res.session, res.access_token)
                setTimeout(() => navigate(`/dashboard?session=${res.session.session_token}`, { replace: true }), 800)
              } else {
                setFpStage('success')
                setBiometricRegistered(true)
                setTimeout(() => setUiStep('name'), 800)
              }
            } catch (err) {
              setFpStage('failed')
              setError(err instanceof Error ? err.message : 'Biometric verification failed.')
            }
          }, 250)
        }
        return next
      })
    }, 200)
  }

  const handleSkipBiometric = () => { setBiometricRegistered(false); setUiStep('name') }

  // ── Name / Phone / OTP ────────────────────────────────────────────────────
  const handleNameContinue = () => {
    if (name.trim().length < 2) return
    setError(null)
    setUiStep('phone')
  }

  const handlePhoneChange = (v: string) => setPhoneNumber(v.replace(/\D/g, '').slice(0, 10))

  const handleSendOtp = async () => {
    if (!sessionToken) { setError('Missing session.'); return }
    try {
      setBusy(true); setError(null)
      let res
      if (isLoginFlow) {
        res = await sendLoginOtp(sessionToken, countryCode, phoneNumber)
      } else {
        if (!facePhotoUrl) { setError('Missing face photo.'); return }
        res = await sendRegistrationOtp({ sessionToken, name: name.trim(), countryCode, phoneNumber, facePhotoUrl, biometricSupported, biometricRegistered })
      }
      setSession(res.session)
      setDebugOtp(res.otp)
      setUiStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP.')
    } finally { setBusy(false) }
  }

  const handleVerifyOtp = async () => {
    if (!sessionToken || otp.join('').length !== 6) return
    try {
      setBusy(true); setError(null)
      const res = isLoginFlow
        ? await verifyLoginOtp(sessionToken, otp.join(''))
        : await verifyRegistrationOtp(sessionToken, otp.join(''))
      saveIdentity(res.user, res.face_profile_key)
      saveSession(res.session, res.access_token)
      navigate(`/dashboard?session=${res.session.session_token}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify OTP.')
    } finally { setBusy(false) }
  }

  const handleResendOtp = async () => { setOtp(Array(6).fill('')); await handleSendOtp() }

  const phoneReady = phoneNumber.length === 10

  const biometricDeviceLabel = (() => {
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) return 'iPhone Face ID / Touch ID'
    if (/macintosh|mac os x/.test(ua)) return 'Mac Touch ID'
    if (/windows/.test(ua)) return 'Windows Hello'
    if (/android/.test(ua)) {
      if (/samsung/.test(ua)) return 'Samsung Fingerprint'
      if (/pixel/.test(ua))   return 'Google Pixel Fingerprint'
      return 'Android Fingerprint'
    }
    return 'Platform Biometrics'
  })()

  // ── Fatal error ───────────────────────────────────────────────────────────
  if (error && !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
        <StepShell title="Access">
          <div className="space-y-4">
            <p className="text-sm text-rose-600">{error}</p>
            <Button fullWidth onClick={() => navigate('/')}>Try Again</Button>
          </div>
        </StepShell>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-3 py-3 sm:px-4">
      <div className="w-full max-w-md sm:max-w-lg">

        {/* top bar */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
            {locationName}
          </div>
        </div>

        {error && session && (
          <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ── STEP: face ──────────────────────────────────────────────── */}
        {uiStep === 'face' && (
          <StepShell title="Face Capture">
            <div className="space-y-3">

              {/* Camera viewport */}
              <div
                className={`relative overflow-hidden rounded-[24px] border-2 bg-slate-950 transition-colors duration-300 ${
                  faceValidation.faceReady
                    ? 'border-emerald-400'
                    : cameraActive && faceModelsLoaded
                    ? 'border-rose-400'
                    : 'border-slate-200'
                }`}
              >
                <div className="mx-auto aspect-[4/5] max-h-[44dvh] min-h-[280px] w-full max-w-[320px] bg-slate-900 sm:max-h-[48dvh]">
                  <CameraCapture
                    isActive={cameraActive}
                    onCameraReadyChange={(ready) => {
                      setCameraReady(ready)
                      setScanStage(ready ? 'scanning' : 'initializing')
                    }}
                    onVideoReady={setVideoElement}
                    onFaceCountChange={() => {}}
                    onValidationChange={handleValidationChange}
                    showOverlay
                  />
                  <FaceScanner stage={scanStage} />

                  {/* Captured photo preview */}
                  {capturedImage && (
                    <img
                      src={capturedImage}
                      alt="Captured face"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}

                  {/* Countdown overlay — shows 3→2→1 inside camera before capture */}
                  {countdown !== null && cameraActive && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                        <span className="text-3xl font-bold text-white tabular-nums">{countdown}</span>
                      </div>
                    </div>
                  )}

                  {/* Green flash / "Captured!" banner */}
                  {scanStage === 'detected' && capturedImage && (
                    <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center bg-emerald-500/90 py-2 pointer-events-none">
                      <Check className="h-4 w-4 text-white mr-1.5" strokeWidth={3} />
                      <span className="text-xs font-bold text-white tracking-wide">Face Captured!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-capture hint — only while camera is scanning */}
              {cameraActive && !capturedImage && (
                <>
                  {/* Hint text */}
                  {!faceValidation.faceReady && faceModelsLoaded && (
                    <p className="text-center text-xs text-slate-500">
                      Position your face in the frame — photo will be taken automatically.
                    </p>
                  )}
                  {faceValidation.faceReady && (
                    <p className="text-center text-xs font-semibold text-emerald-600 animate-pulse">
                      Hold still — capturing…
                    </p>
                  )}

                  {/* Validation status */}
                  <FaceValidationStatus
                    validation={faceValidation}
                    isActive={cameraActive}
                    modelsLoaded={faceModelsLoaded}
                  />
                </>
              )}

              {/* Buttons */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Initial state: Scan Face button */}
                {!cameraActive && !capturedImage && (
                  <Button fullWidth onClick={handleScanFace}>
                    Scan Face
                  </Button>
                )}

                {/* Photo taken: Retake + Continue */}
                {capturedImage && (
                  <>
                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={handleRetake}
                    >
                      <RefreshCw className="mr-1.5 h-4 w-4" />
                      Retake
                    </Button>
                    <Button
                      fullWidth
                      onClick={() => void handleContinueAfterFace()}
                      loading={busy}
                    >
                      Continue
                    </Button>
                  </>
                )}

                {/* ── NO Capture button — photo taken automatically ── */}
              </div>
            </div>
          </StepShell>
        )}

        {/* ── STEP: biometric ─────────────────────────────────────────── */}
        {uiStep === 'biometric' && (
          <StepShell title={isLoginFlow ? 'Verify Biometric' : 'Register Biometric'}>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 text-center font-medium">
                Biometric authentication available on this device ({biometricDeviceLabel}).
              </p>
              <div className="py-2 flex justify-center w-full">
                <FingerprintScanner stage={fpStage} progress={fpProgress} />
              </div>
              {fpStage === 'idle' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button fullWidth onClick={handleRegisterFingerprint}>
                    {isLoginFlow ? 'Verify Biometric' : 'Register Biometric'}
                  </Button>
                  <Button fullWidth variant="secondary" onClick={handleSkipBiometric}>Skip</Button>
                </div>
              )}
              {fpStage === 'scanning' && <Button fullWidth disabled>Scanning…</Button>}
              {fpStage === 'success' && <Button fullWidth disabled className="bg-emerald-600 text-white">Success</Button>}
              {fpStage === 'failed' && <Button fullWidth onClick={handleRegisterFingerprint}>Retry Verification</Button>}
            </div>
          </StepShell>
        )}

        {/* ── STEP: name ──────────────────────────────────────────────── */}
        {uiStep === 'name' && (
          <StepShell title="Enter Name">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_64px]">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleNameContinue()}
              />
              <Button fullWidth onClick={handleNameContinue} disabled={name.trim().length < 2} aria-label="Confirm name">
                <Check className="h-5 w-5" />
              </Button>
            </div>
          </StepShell>
        )}

        {/* ── STEP: phone ─────────────────────────────────────────────── */}
        {uiStep === 'phone' && (
          <StepShell title="Phone Number">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)]">
                <div className="relative">
                  <label className="mb-2 block text-sm font-medium text-slate-600" htmlFor="country-code">Country</label>
                  <div className="pointer-events-none absolute inset-y-0 right-4 top-8 flex items-center text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <select
                    id="country-code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-10 text-[15px] text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  >
                    {COUNTRY_OPTIONS.map((o) => (
                      <option key={o.code} value={o.code}>{o.flag} {o.code}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Phone Number"
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && phoneReady && void handleSendOtp()}
                  placeholder="10-digit number"
                  maxLength={10}
                />
              </div>
              <Button fullWidth onClick={() => void handleSendOtp()} disabled={!phoneReady} loading={busy}>
                Send OTP
              </Button>
            </div>
          </StepShell>
        )}

        {/* ── STEP: otp ───────────────────────────────────────────────── */}
        {uiStep === 'otp' && (
          <StepShell title="Enter OTP">
            <div className="space-y-4">
              <OTPInput value={otp} onChange={setOtp} />
              {debugOtp && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
                  OTP: <span className="font-mono font-semibold">{debugOtp}</span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button fullWidth onClick={() => void handleVerifyOtp()} disabled={otp.join('').length !== 6} loading={busy}>
                  Verify OTP
                </Button>
                <Button fullWidth variant="secondary" onClick={() => void handleResendOtp()} loading={busy}>
                  Resend OTP
                </Button>
              </div>
            </div>
          </StepShell>
        )}

      </div>
    </div>
  )
}
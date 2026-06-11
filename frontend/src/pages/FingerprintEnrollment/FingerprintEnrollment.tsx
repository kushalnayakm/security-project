import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Fingerprint } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button/Button'
import FingerprintScanner, { FpStage } from '../../components/FingerprintScanner/FingerprintScanner'

export default function FingerprintEnrollment() {
  const navigate = useNavigate()
  const [fpStage, setFpStage] = useState<FpStage>('idle')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (fpStage !== 'scanning') {
      return undefined
    }

    setProgress(0)
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 20, 100)
        if (next >= 100) {
          window.clearInterval(interval)
          // TODO: Call fingerprint registration API
          setTimeout(() => setFpStage('success'), 250)
        }
        return next
      })
    }, 300)

    return () => window.clearInterval(interval)
  }, [fpStage])

  const handleStartScan = () => {
    setFpStage('scanning')
  }

  const handleContinue = () => {
    navigate('/dashboard')
  }

  const statusText =
    fpStage === 'idle'
      ? 'Place your finger on the sensor'
      : fpStage === 'scanning'
      ? 'Scanning fingerprint...'
      : 'Fingerprint registered successfully'

  return (
    <div className="h-screen overflow-hidden bg-slate-50 px-4 py-3 sm:px-5">
      <div className="mx-auto flex h-full w-full max-w-[500px] flex-col justify-center gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/user-verification')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Fingerprint
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <div className="flex flex-col items-center gap-4 text-center">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Fingerprint Setup
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{statusText}</p>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-sm">
              <Fingerprint className="h-12 w-12" strokeWidth={1.8} aria-hidden="true" />
            </div>

            <div className="w-full">
              <FingerprintScanner stage={fpStage} progress={progress} />
            </div>

            <div className="w-full">
              {fpStage === 'idle' ? (
                <Button fullWidth onClick={handleStartScan}>
                  Start Scan
                </Button>
              ) : fpStage === 'scanning' ? (
                <Button fullWidth variant="secondary" disabled>
                  Scanning...
                </Button>
              ) : (
                <Button fullWidth onClick={handleContinue}>
                  Continue
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

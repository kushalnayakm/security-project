import { useState } from 'react'
import { ArrowLeft, Check, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button/Button'
import Input from '../../components/Input/Input'
import OTPInput from '../../components/OTPInput/OTPInput'
import { COUNTRY_OPTIONS, type VerificationStep } from '../../types/biometric'

const progressSteps = ['Name', 'Phone', 'OTP', 'Fingerprint'] as const

export default function UserVerification() {
  const navigate = useNavigate()

  const [step, setStep] = useState<VerificationStep>(1)
  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState(COUNTRY_OPTIONS[0].code)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const [verifying, setVerifying] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)

  const selectedCountry = COUNTRY_OPTIONS.find((option) => option.code === countryCode) ?? COUNTRY_OPTIONS[0]
  const maskedOtp = otp.map((digit) => (digit ? '*' : '•')).join(' ')
  const phoneDigits = phone.replace(/\D/g, '')
  const isPhoneValid = phoneDigits.length === 10

  const handleNameDone = () => {
    if (name.trim().length < 2) return
    setStep(2)
  }

  const handleSendOtp = () => {
    if (!isPhoneValid) return
    setStep(3)
  }

  const handleVerifyOtp = async () => {
    if (otp.join('').length < 6) return
    setVerifying(true)
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    setOtpVerified(true)
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    navigate('/fingerprint-enrollment')
  }

  return (
    <div className="mesh-bg min-h-dvh px-4 py-6 sm:px-6 lg:px-8">
      <section className="app-shell flex min-h-[calc(100dvh-3rem)] items-center justify-center">
        <div className="glass-card w-full max-w-[550px] rounded-[28px] p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={() => navigate('/')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>

            <div className="flex flex-1 items-center gap-2">
              {progressSteps.map((label, index) => {
                const isComplete = step > index + 1 || (label === 'OTP' && otpVerified)
                const isActive = step === index + 1

                return (
                  <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                    <div
                      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        isComplete
                          ? 'bg-emerald-500 text-white'
                          : isActive
                            ? 'bg-sky-500 text-white'
                            : 'bg-sky-100 text-sky-600'
                      }`}
                    >
                      {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" /> : index + 1}
                    </div>
                    {index < progressSteps.length - 1 && (
                      <div className={`h-1 flex-1 rounded-full ${step > index + 1 ? 'bg-emerald-400' : 'bg-sky-100'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            {step > 1 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                    <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Name Verified</p>
                    <p className="text-sm text-emerald-700">{name}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-sky-100 bg-white/80 p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <Input
                    label="Enter Name"
                    placeholder="Enter name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && step === 1 && handleNameDone()}
                    autoFocus
                  />
                  <Button
                    className="sm:min-w-[70px]"
                    onClick={handleNameDone}
                    disabled={name.trim().length < 2}
                    aria-label="Confirm name"
                  >
                    <Check className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}

            {step >= 2 && (
              step > 2 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                      <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Phone Verified</p>
                      <p className="text-sm text-emerald-700">
                        {selectedCountry.flag} {selectedCountry.code} {phone}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-sky-100 bg-white/80 p-4">
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-[minmax(12rem,0.46fr)_minmax(0,1fr)]">
                      <div className="relative">
                        <label className="mb-2 block text-sm font-medium text-slate-600">Country</label>
                        <div className="pointer-events-none absolute inset-y-0 right-4 top-8 flex items-center text-slate-400">
                          <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                        </div>
                        <select
                          value={countryCode}
                          onChange={(event) => setCountryCode(event.target.value)}
                          aria-label="Country code"
                          className="
                            w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-10 text-[15px] text-slate-900
                            transition-all duration-200 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100
                          "
                        >
                          {COUNTRY_OPTIONS.map((option) => (
                            <option key={option.code} value={option.code}>
                              {option.flag} {option.code} {option.country}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Phone Number"
                        type="tel"
                        inputMode="numeric"
                        placeholder="Enter 10 digit phone number"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                        onKeyDown={(event) => event.key === 'Enter' && step === 2 && handleSendOtp()}
                        maxLength={10}
                        leftSlot={<span className="text-sm font-medium text-slate-500">{selectedCountry.flag} {selectedCountry.code}</span>}
                      />
                    </div>

                    <Button
                      fullWidth
                      onClick={handleSendOtp}
                      disabled={!isPhoneValid}
                    >
                      Send OTP
                    </Button>
                  </div>
                </div>
              )
            )}

            {step >= 3 && (
              otpVerified ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                      <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">OTP Verified</p>
                      <p className="text-sm text-emerald-700">{maskedOtp}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-sky-100 bg-white/80 p-4">
                  <div className="space-y-4">
                    <div className="overflow-x-auto pb-1">
                      <OTPInput value={otp} onChange={setOtp} length={6} />
                    </div>

                    <Button
                      fullWidth
                      onClick={handleVerifyOtp}
                      loading={verifying}
                      disabled={otp.join('').length < 6}
                    >
                      {verifying ? 'Verifying OTP...' : 'Verify OTP'}
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

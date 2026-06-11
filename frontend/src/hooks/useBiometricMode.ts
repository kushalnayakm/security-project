import { useEffect, useState } from 'react'

const STORAGE_KEY = 'did.returning-user'

export function useBiometricMode() {
  const [isReturningUser, setIsReturningUser] = useState(false)

  useEffect(() => {
    setIsReturningUser(window.localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  const markReturningUser = () => {
    window.localStorage.setItem(STORAGE_KEY, 'true')
    setIsReturningUser(true)
  }

  const resetMode = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setIsReturningUser(false)
  }

  return {
    isReturningUser,
    markReturningUser,
    resetMode,
  }
}

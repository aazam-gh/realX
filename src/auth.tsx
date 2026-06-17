import * as React from 'react'

import {
  onAuthStateChanged,
  type User,
  signOut,
  signInWithEmailAndPassword,
} from 'firebase/auth'

import { auth } from './firebase/config'

export type AuthContextType = {
  isAuthenticated: boolean
  isInitialLoading: boolean
  isAdmin: boolean
  isHoldingAccount: boolean
  loginWithEmail: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  user: User | null
}



const AuthContext = React.createContext<AuthContextType | null>(null)

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = React.useState<User | null>(auth.currentUser)
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const isAuthenticated = !!user
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [isHoldingAccount, setIsHoldingAccount] = React.useState(false)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null)
        setIsAdmin(false)
        setIsHoldingAccount(false)
        setIsInitialLoading(false)
        return
      }

      // Fetch ID token & custom claims
      const tokenResult = await user.getIdTokenResult()

      setUser(user)
      setIsAdmin(tokenResult.claims.admin === true)
      setIsHoldingAccount(tokenResult.claims.accountType === 'holding_group')
      setIsInitialLoading(false)
    })
    return () => unsubscribe()
  }, [])


  const logout = React.useCallback(async () => {
    await signOut(auth)
    setUser(null)
    setIsAdmin(false)
    setIsHoldingAccount(false)
    setIsInitialLoading(false)
  }, [])


  const loginWithEmail = React.useCallback(async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    const tokenResult = await result.user.getIdTokenResult(true)
    setUser(result.user)
    setIsAdmin(tokenResult.claims.admin === true)
    setIsHoldingAccount(tokenResult.claims.accountType === 'holding_group')
    setIsInitialLoading(false)
  }, [])

  const contextValue = React.useMemo(
    () => ({
      isAuthenticated,
      isInitialLoading,
      isAdmin,
      isHoldingAccount,
      user,
      loginWithEmail,
      logout,
    }),
    [
      isAuthenticated,
      isInitialLoading,
      isAdmin,
      isHoldingAccount,
      user,
      loginWithEmail,
      logout,
    ],
  )

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthContextProvider')
  }
  return context
}

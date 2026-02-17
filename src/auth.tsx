import * as React from 'react'

import {
  onAuthStateChanged,
  type User,
  type AuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'

import { auth } from './firebase/config'

export type AuthContextType = {
  isAuthenticated: boolean
  isInitialLoading: boolean
  isAdmin: boolean
  login: (provider: AuthProvider) => Promise<void>
  loginWithEmail: (email: string, password: string) => Promise<void>
  signupWithEmail: (email: string, password: string, displayName?: string) => Promise<void>
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

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null)
        setIsAdmin(false)
        setIsInitialLoading(false)
        return
      }

      // Fetch ID token & custom claims
      const tokenResult = await user.getIdTokenResult()

      setUser(user)
      setIsAdmin(tokenResult.claims.admin === true)
      setIsInitialLoading(false)
    })
    return () => unsubscribe()
  }, [])


  const logout = React.useCallback(async () => {
    console.log('Logging out...')
    await signOut(auth)
    setUser(null)
    setIsInitialLoading(false)
  }, [])

  const login = React.useCallback(async (provider: AuthProvider) => {
    const result = await signInWithPopup(auth, provider)
    setUser(result.user)
    setIsInitialLoading(false)
  }, [])

  const loginWithEmail = React.useCallback(async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    setUser(result.user)
    setIsInitialLoading(false)
  }, [])

  const signupWithEmail = React.useCallback(async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(result.user, { displayName })
    }
    setUser(result.user)
    setIsInitialLoading(false)
  }, [])

  const contextValue = React.useMemo(
    () => ({
      isAuthenticated,
      isInitialLoading,
      isAdmin,
      user,
      login,
      loginWithEmail,
      signupWithEmail,
      logout,
    }),
    [
      isAuthenticated,
      isInitialLoading,
      isAdmin,
      user,
      login,
      loginWithEmail,
      signupWithEmail,
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
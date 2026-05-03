// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────
export interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  photoURL?: string
  plan: 'starter' | 'basic' | 'pro' | 'agency'
  verified: boolean
  joined: string
  connectedPlatforms: Record<string, boolean>
  platformTokens: Record<string, string>
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>
}

// ── Context ────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// ── Provider ───────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Create or fetch user profile in Firestore
  const ensureProfile = async (firebaseUser: User, extras?: Partial<UserProfile>) => {
    const ref = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
      // New user — create profile
      const names = (firebaseUser.displayName || '').split(' ')
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        firstName: extras?.firstName || names[0] || '',
        lastName: extras?.lastName || names.slice(1).join(' ') || '',
        displayName: firebaseUser.displayName || extras?.firstName || 'Creator',
        photoURL: firebaseUser.photoURL || '',
        plan: 'starter',
        verified: firebaseUser.emailVerified,
        joined: new Date().toISOString(),
        connectedPlatforms: {},
        platformTokens: {},
        ...extras,
      }
      await setDoc(ref, { ...newProfile, createdAt: serverTimestamp() })
      setProfile(newProfile)
      return newProfile
    } else {
      const data = snap.data() as UserProfile
      setProfile(data)
      return data
    }
  }

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await ensureProfile(firebaseUser)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // ── Login ──
  const login = async (email: string, password: string) => {
    if (!email) throw new Error('Please enter your email address')
    if (!password) throw new Error('Please enter your password')
    await signInWithEmailAndPassword(auth, email, password)
  }

  // ── Signup ──
  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    if (!firstName || !lastName) throw new Error('Please enter your full name')
    if (!email) throw new Error('Please enter your email address')
    if (password.length < 8) throw new Error('Password must be at least 8 characters')

    const cred = await createUserWithEmailAndPassword(auth, email, password)

    // Update display name
    await updateProfile(cred.user, {
      displayName: `${firstName} ${lastName}`,
    })

    // Send verification email
    await sendEmailVerification(cred.user)

    // Create Firestore profile
    await ensureProfile(cred.user, { firstName, lastName })
  }

  // ── Google Login ──
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    provider.addScope('https://www.googleapis.com/auth/youtube.readonly')
    provider.setCustomParameters({ prompt: 'select_account' })

    const result = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential?.accessToken

    // Save YouTube token if granted
    if (token && result.user) {
      const ref = doc(db, 'users', result.user.uid)
      await updateDoc(ref, {
        'connectedPlatforms.yt': true,
        'platformTokens.yt': token,
      }).catch(() => {}) // May not exist yet
    }

    await ensureProfile(result.user)
    toast.success('Signed in with Google! YouTube connected 🎉')
  }

  // ── Logout ──
  const logout = async () => {
    await signOut(auth)
    setProfile(null)
    toast.success('Logged out successfully')
  }

  // ── Reset Password ──
  const resetPassword = async (email: string) => {
    if (!email) throw new Error('Please enter your email address')
    await sendPasswordResetEmail(auth, email)
    toast.success('Password reset email sent! Check your inbox.')
  }

  // ── Update Profile ──
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated')
    const ref = doc(db, 'users', user.uid)
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
    setProfile(prev => prev ? { ...prev, ...data } : null)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, signup, logout, loginWithGoogle,
      resetPassword, updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

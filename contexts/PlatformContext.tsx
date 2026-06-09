// contexts/PlatformContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from './AuthContext'

export const PLATFORMS = [
  { code: 'yt', name: 'YouTube', color: '#FF0000', icon: '▶' },
  { code: 'ig', name: 'Instagram', color: '#E1306C', icon: '📸' },
  { code: 'tk', name: 'TikTok', color: '#69C9D0', icon: '🎵' },
  { code: 'fb', name: 'Facebook', color: '#1877F2', icon: 'f' },
  { code: 'tw', name: 'X / Twitter', color: '#000000', icon: '𝕏' },
  { code: 'li', name: 'LinkedIn', color: '#0077B5', icon: 'in' },
  { code: 'pi', name: 'Pinterest', color: '#E60023', icon: 'P' },
] as const

export type PlatformCode = typeof PLATFORMS[number]['code']

export interface PlatformData {
  connected: boolean
  accessToken?: string
  channelId?: string
  channelName?: string
  subscribers?: number
  followers?: number
  views?: number
  videoCount?: number
  engagement?: number
  profilePic?: string
  username?: string
  openId?: string
  likes?: number
}

interface PlatformContextType {
  activePlatform: PlatformCode
  setActivePlatform: (p: PlatformCode) => void
  platformData: Record<PlatformCode, PlatformData>
  connectPlatform: (code: PlatformCode, data: Partial<PlatformData>) => Promise<void>
  disconnectPlatform: (code: PlatformCode) => Promise<void>
  isConnected: (code: PlatformCode) => boolean
  loading: boolean
}

const PlatformContext = createContext<PlatformContextType | null>(null)

export const usePlatform = () => {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider')
  return ctx
}

const defaultPlatformData = (): Record<PlatformCode, PlatformData> =>
  Object.fromEntries(PLATFORMS.map(p => [p.code, { connected: false }])) as Record<PlatformCode, PlatformData>

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activePlatform, setActivePlatform] = useState<PlatformCode>('yt')
  const [platformData, setPlatformData] = useState<Record<PlatformCode, PlatformData>>(defaultPlatformData())
  const [loading, setLoading] = useState(true)

  // Listen to user's platform data in Firestore
  useEffect(() => {
    if (!user) { setLoading(false); return }

    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        const connected = data.connectedPlatforms || {}
        const tokens = data.platformTokens || {}
        const channelData = data.channelData || {}

        const merged = defaultPlatformData()
        PLATFORMS.forEach(p => {
          merged[p.code] = {
            connected: !!connected[p.code],
            accessToken: tokens[p.code],
            ...channelData[p.code],
          }
        })
        setPlatformData(merged)
      }
      setLoading(false)
    })

    return unsub
  }, [user])

  const connectPlatform = async (code: PlatformCode, data: Partial<PlatformData>) => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    await updateDoc(ref, {
      [`connectedPlatforms.${code}`]: true,
      [`platformTokens.${code}`]: data.accessToken || '',
      [`channelData.${code}`]: data,
    })
  }

  const disconnectPlatform = async (code: PlatformCode) => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    const updates: any = {
      [`connectedPlatforms.${code}`]: false,
      [`platformTokens.${code}`]: '',
      [`channelData.${code}`]: {},
    }
    // also clear the server-side youtube field (refresh token + connection)
    if (code === 'yt') updates.youtube = { connected: false, refreshToken: null, accessToken: null }
    await updateDoc(ref, updates)
  }

  const isConnected = (code: PlatformCode) => !!platformData[code]?.connected

  return (
    <PlatformContext.Provider value={{
      activePlatform, setActivePlatform,
      platformData, connectPlatform, disconnectPlatform,
      isConnected, loading,
    }}>
      {children}
    </PlatformContext.Provider>
  )
}

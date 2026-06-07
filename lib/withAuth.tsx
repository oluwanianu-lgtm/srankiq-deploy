// lib/withAuth.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

export function withAuth<T extends object>(WrappedComponent: React.ComponentType<T>) {
  return function AuthenticatedComponent(props: T) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.replace('/login')
      }
    }, [user, loading, router])

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-bg">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan to-magenta
                          flex items-center justify-center text-black font-display text-2xl
                          mx-auto mb-4 animate-pulse">
              S
            </div>
            <div className="loading-dots flex justify-center">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )
    }

    if (!user) return null

    return <WrappedComponent {...props} />
  }
}

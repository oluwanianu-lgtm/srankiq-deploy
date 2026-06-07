// lib/serverAuth.ts
// Server-side only — verifies Firebase ID tokens on API routes.
// Requires FIREBASE_ADMIN_* env vars (service account credentials).

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function getAdminApp() {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Vercel/Railway store the key with literal \n — restore real newlines
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export interface AuthedRequest extends NextApiRequest {
  uid: string
  userEmail?: string
}

type AuthedHandler = (req: AuthedRequest, res: NextApiResponse) => unknown | Promise<unknown>

/**
 * Wrap any API route handler so it requires a valid Firebase ID token.
 * Client must send:  Authorization: Bearer <idToken>
 * The verified uid is attached to req.uid.
 */
export function withApiAuth(handler: AuthedHandler): NextApiHandler {
  return async (req, res) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized — missing token' })
    }
    try {
      const decoded = await getAuth(getAdminApp()).verifyIdToken(token)
      const authedReq = req as AuthedRequest
      authedReq.uid = decoded.uid
      authedReq.userEmail = decoded.email
      return await handler(authedReq, res)
    } catch (err) {
      console.error('Token verification failed:', err)
      return res.status(401).json({ error: 'Unauthorized — invalid or expired token' })
    }
  }
}

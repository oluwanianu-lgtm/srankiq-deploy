// lib/extAuth.ts
// Auth wrapper for the public extension endpoints (/api/ext/*).
// Verifies a Firebase ID token (sent as Authorization: Bearer or ?token=)
// AND loads the user's plan from Firestore, so handlers can gate free vs paid.
// Keeps CORS open (extension runs on youtube.com).

import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export interface ExtRequest extends NextApiRequest {
  uid: string
  userEmail?: string
  plan: string        // 'free' | 'starter' | 'pro' | ...
  isPaid: boolean
}

type ExtHandler = (req: ExtRequest, res: NextApiResponse) => unknown | Promise<unknown>

function cors(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

const PAID_PLANS = new Set(['starter', 'pro', 'business', 'agency', 'premium'])

/**
 * Wrap an extension API handler so it requires a valid SRankIQ login.
 * The extension sends the Firebase ID token via Authorization: Bearer <token>
 * (or ?token= as a fallback). Attaches uid, plan, isPaid to the request.
 */
export function withExtAuth(handler: ExtHandler): NextApiHandler {
  return async (req, res) => {
    cors(res)
    if (req.method === 'OPTIONS') return res.status(200).end()

    const header = req.headers.authorization || ''
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null
    const token = bearer || (req.query.token ? String(req.query.token) : null)
    if (!token) {
      return res.status(401).json({ error: 'not_signed_in', message: 'Sign in to SRankIQ to use the extension.' })
    }
    try {
      const decoded = await getAuth(getAdminApp()).verifyIdToken(token)
      const extReq = req as ExtRequest
      extReq.uid = decoded.uid
      extReq.userEmail = decoded.email
      // load plan from Firestore users/{uid}
      let plan = 'free'
      try {
        const snap = await getFirestore(getAdminApp()).collection('users').doc(decoded.uid).get()
        if (snap.exists) plan = (snap.data()?.plan || 'free').toLowerCase()
      } catch { /* default free */ }
      extReq.plan = plan
      extReq.isPaid = PAID_PLANS.has(plan)
      return await handler(extReq, res)
    } catch (err) {
      return res.status(401).json({ error: 'invalid_token', message: 'Your session expired — please sign in to SRankIQ again.' })
    }
  }
}

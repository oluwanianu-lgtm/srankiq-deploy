// services/firestore.ts
import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  deleteDoc, query, where, orderBy, limit, serverTimestamp,
  onSnapshot, Timestamp, setDoc,
} from 'firebase/firestore'
import { db } from '../firebase/config'

// ── USER PROFILE ──────────────────────────────────────
export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function updateUserProfile(uid: string, data: object) {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() })
}

// ── UPLOADS / CONTENT ─────────────────────────────────
export async function saveUpload(uid: string, uploadData: object) {
  return await addDoc(collection(db, 'users', uid, 'uploads'), {
    ...uploadData,
    createdAt: serverTimestamp(),
  })
}

export async function getUserUploads(uid: string) {
  const q = query(
    collection(db, 'users', uid, 'uploads'),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── KEYWORD HISTORY ───────────────────────────────────
export async function saveKeywordSearch(uid: string, data: {
  keywords: string[]
  platform: string
  results: object[]
}) {
  return await addDoc(collection(db, 'users', uid, 'keywordHistory'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function getKeywordHistory(uid: string) {
  const q = query(
    collection(db, 'users', uid, 'keywordHistory'),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── SAVED REPORTS ─────────────────────────────────────
export async function saveReport(uid: string, report: {
  title: string
  type: string
  data: object
  platform: string
}) {
  return await addDoc(collection(db, 'users', uid, 'reports'), {
    ...report,
    createdAt: serverTimestamp(),
  })
}

export async function getUserReports(uid: string) {
  const q = query(
    collection(db, 'users', uid, 'reports'),
    orderBy('createdAt', 'desc'),
    limit(30)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteReport(uid: string, reportId: string) {
  await deleteDoc(doc(db, 'users', uid, 'reports', reportId))
}

// ── SAVED COMPETITORS ─────────────────────────────────
export async function saveCompetitor(uid: string, competitor: {
  name: string
  platform: string
  url?: string
  data?: object
}) {
  return await addDoc(collection(db, 'users', uid, 'competitors'), {
    ...competitor,
    createdAt: serverTimestamp(),
  })
}

export async function getCompetitors(uid: string) {
  const q = query(
    collection(db, 'users', uid, 'competitors'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteCompetitor(uid: string, id: string) {
  await deleteDoc(doc(db, 'users', uid, 'competitors', id))
}

// ── AI HISTORY ────────────────────────────────────────
export async function saveAIResult(uid: string, data: {
  type: string
  input: object
  output: object
  platform: string
}) {
  return await addDoc(collection(db, 'users', uid, 'aiHistory'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function getAIHistory(uid: string, type?: string) {
  let q = query(
    collection(db, 'users', uid, 'aiHistory'),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  if (type) {
    q = query(
      collection(db, 'users', uid, 'aiHistory'),
      where('type', '==', type),
      orderBy('createdAt', 'desc'),
      limit(30)
    )
  }
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── ANALYTICS SNAPSHOTS ───────────────────────────────
export async function saveAnalyticsSnapshot(uid: string, data: {
  platform: string
  metrics: object
  date: string
}) {
  const docId = `${data.platform}_${data.date}`
  await setDoc(doc(db, 'users', uid, 'analytics', docId), {
    ...data,
    savedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getAnalyticsHistory(uid: string, platform: string) {
  const q = query(
    collection(db, 'users', uid, 'analytics'),
    where('platform', '==', platform),
    orderBy('date', 'desc'),
    limit(30)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── NOTIFICATIONS ─────────────────────────────────────
export function subscribeToNotifications(uid: string, callback: (notifs: any[]) => void) {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(10)
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

export async function markNotificationRead(uid: string, notifId: string) {
  await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true })
}

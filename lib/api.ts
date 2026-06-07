// lib/api.ts
// Client-side API helper — automatically attaches the current user's
// Firebase ID token to every request so protected API routes accept it.

import axios, { AxiosResponse } from 'axios'
import { auth } from '../firebase/config'

async function authHeaders() {
  const user = auth.currentUser
  if (!user) throw new Error('You must be signed in')
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

export async function apiPost<T = any>(url: string, data?: object): Promise<AxiosResponse<T>> {
  return axios.post<T>(url, data, { headers: await authHeaders() })
}

export async function apiGet<T = any>(url: string): Promise<AxiosResponse<T>> {
  return axios.get<T>(url, { headers: await authHeaders() })
}

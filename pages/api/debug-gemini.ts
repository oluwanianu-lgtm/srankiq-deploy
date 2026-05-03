import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = process.env.GEMINI_API_KEY
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Say hello in JSON: {"message":"hello"}' }] }]
    })
  })
  const data = await response.json()
  return res.status(200).json({ 
    status: response.status,
    keyExists: !!key,
    keyPrefix: key?.substring(0, 10),
    data 
  })
}

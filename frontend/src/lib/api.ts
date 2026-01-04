'use server'
import { auth } from '@clerk/nextjs/server'

export async function getDataFromApi(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', obj: unknown) {
  const t = await auth().then(a => a.getToken()).catch(() => null)
  return await fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: JSON.stringify(obj)
  })
}
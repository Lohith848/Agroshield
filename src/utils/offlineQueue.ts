import { openDB } from 'idb'

const getDB = () => openDB('agroshield-queue', 1, {
  upgrade(db) {
    db.createObjectStore('scans', { keyPath: 'id', autoIncrement: true })
  }
})

export const queueScan = async (scanData: any) => {
  const db = await getDB()
  await db.add('scans', { ...scanData, queued: true, timestamp: Date.now() })
}

export const getPendingScans = async () => {
  const db = await getDB()
  return db.getAll('scans')
}

export const removeScan = async (id: number) => {
  const db = await getDB()
  await db.delete('scans', id)
}

export const syncPendingScans = async () => {
  const pending = await getPendingScans()
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  for (const scan of pending) {
    try {
      const res = await fetch(`${API_BASE}/analyze-crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scan)
      })
      if (res.ok) await removeScan(scan.id)
    } catch (err) {
      // Still offline, leave in queue
    }
  }
}
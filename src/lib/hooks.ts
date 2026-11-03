import { useCallback, useEffect, useState } from 'react'
export function must<T>(r: { data: T; error: any }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data
}
export function useQuery<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback(async () => {
    setLoading(true)
    try { setData(await fn()); setError(null) } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }, deps)
  useEffect(() => { run() }, [run])
  return { data, loading, error, reload: run }
}

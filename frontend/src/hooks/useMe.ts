import { useEffect, useState } from 'react'
import api from '../lib/api'

export function useMe() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/auth/me')
      .then(res => { if (mounted) setUser(res.data.user) })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [])

  return { user, loading }
}

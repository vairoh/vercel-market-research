import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [status, setStatus] = useState<string>('Checking Supabase connection...')

  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await supabase
        .from('company_registry')
        .select('company_name')
        .limit(1)

      if (error) {
        console.error(error)
        setStatus('Connection failed')
      } else {
        setStatus('Connected to Supabase successfully')
      }
    }

    checkConnection()
  }, [])

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h2>Atomity Market Intelligence Tool</h2>
      <p>{status}</p>
    </div>
  )
}

export default App

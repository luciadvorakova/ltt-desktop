import ws from 'ws'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rzjbfqgkprozguyjrxbp.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6amJmcWdrcHJvemd1eWpyeGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTU0OTIsImV4cCI6MjA5MzgzMTQ5Mn0.PN4vN-_MQkYSGqsKaVT1XFK27BVDW0dnlX9BXXcGhVQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: { transport: ws },
})

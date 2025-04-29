
// Type definitions for Supabase database tables

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      check_pings: {
        Row: {
          id: string
          check_id: string | null
          status: string
          timestamp: string
          duration: number | null
          response_code: number | null
          method: string | null
          request_url: string | null
        }
      }
      checks: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string
          period: number
          grace: number
          last_ping: string | null
          next_ping_due: string | null
          created_at: string
          tags: string[] | null
          environments: string[] | null
          cron_expression: string | null
          last_duration: number | null
          project_id: string | null
          type: string | null
          http_config: Json | null
        }
      }
      // Add other tables as needed
    }
  }
}

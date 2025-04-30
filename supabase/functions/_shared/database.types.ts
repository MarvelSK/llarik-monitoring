
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
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
      }
      check_pings: {
        Row: {
          check_id: string | null
          duration: number | null
          id: string
          status: string
          timestamp: string
        }
        Insert: {
          check_id?: string | null
          duration?: number | null
          id?: string
          status: string
          timestamp?: string
        }
        Update: {
          check_id?: string | null
          duration?: number | null
          id?: string
          status?: string
          timestamp?: string
        }
      }
      checks: {
        Row: {
          created_at: string
          cron_expression: string | null
          description: string | null
          environments: string[] | null
          grace: number
          id: string
          last_duration: number | null
          last_ping: string | null
          name: string
          next_ping_due: string | null
          period: number
          project_id: string | null
          status: string
          tags: string[] | null
        }
        Insert: {
          created_at?: string
          cron_expression?: string | null
          description?: string | null
          environments?: string[] | null
          grace: number
          id?: string
          last_duration?: number | null
          last_ping?: string | null
          name: string
          next_ping_due?: string | null
          period: number
          project_id?: string | null
          status: string
          tags?: string[] | null
        }
        Update: {
          created_at?: string
          cron_expression?: string | null
          description?: string | null
          environments?: string[] | null
          grace?: number
          id?: string
          last_duration?: number | null
          last_ping?: string | null
          name?: string
          next_ping_due?: string | null
          period?: number
          project_id?: string | null
          status?: string
          tags?: string[] | null
        }
      }
      cron_job_executions: {
        Row: {
          completed_at: string | null
          duration: number | null
          error: string | null
          id: string
          job_id: string
          response: string | null
          started_at: string
          status: string
          status_code: number | null
        }
        Insert: {
          completed_at?: string | null
          duration?: number | null
          error?: string | null
          id?: string
          job_id: string
          response?: string | null
          started_at?: string
          status: string
          status_code?: number | null
        }
        Update: {
          completed_at?: string | null
          duration?: number | null
          error?: string | null
          id?: string
          job_id?: string
          response?: string | null
          started_at?: string
          status?: string
          status_code?: number | null
        }
      }
      cron_jobs: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          endpoint: string
          headers: Json | null
          id: string
          jwt_token: string | null
          last_duration: number | null
          last_response: string | null
          last_run: string | null
          last_status: string | null
          method: string
          name: string
          next_run: string | null
          parameters: Json | null
          schedule: string
          success_codes: number[]
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          endpoint: string
          headers?: Json | null
          id?: string
          jwt_token?: string | null
          last_duration?: number | null
          last_response?: string | null
          last_run?: string | null
          last_status?: string | null
          method: string
          name: string
          next_run?: string | null
          parameters?: Json | null
          schedule: string
          success_codes?: number[]
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          endpoint?: string
          headers?: Json | null
          id?: string
          jwt_token?: string | null
          last_duration?: number | null
          last_response?: string | null
          last_run?: string | null
          last_status?: string | null
          method?: string
          name?: string
          next_run?: string | null
          parameters?: Json | null
          schedule?: string
          success_codes?: number[]
          updated_at?: string
        }
      }
      edge_function_logs: {
        Row: {
          function_name: string
          id: string
          log_level: string
          message: string
          timestamp: string
        }
        Insert: {
          function_name: string
          id?: string
          log_level: string
          message: string
          timestamp?: string
        }
        Update: {
          function_name?: string
          id?: string
          log_level?: string
          message?: string
          timestamp?: string
        }
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_admin: boolean
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_admin?: boolean
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_admin?: boolean
          name?: string
        }
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          permissions: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: string
          project_id?: string
          user_id?: string
        }
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
      }
    }
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          agent_id: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action?: string
          agent_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          agent_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_events: {
        Row: {
          agent_id: string
          color: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string
          id: string
          is_all_day: boolean | null
          reminder_before: number | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          reminder_before?: number | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_all_day?: boolean | null
          reminder_before?: number | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_leaves: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_leaves_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_shifts: {
        Row: {
          agent_id: string
          compensation_date: string | null
          completed_at: string | null
          created_at: string
          end_time: string
          id: string
          is_vacation: boolean
          notes: string | null
          shift_date: string
          shift_type: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          compensation_date?: string | null
          completed_at?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_vacation?: boolean
          notes?: string | null
          shift_date: string
          shift_type?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          compensation_date?: string | null
          completed_at?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_vacation?: boolean
          notes?: string | null
          shift_date?: string
          shift_type?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_shifts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          address: string | null
          age: number | null
          avatar_url: string | null
          bh_hourly_rate: number | null
          bh_limit: number | null
          birth_date: string | null
          blood_type: string | null
          cpf: string | null
          created_at: string
          department: string | null
          email: string | null
          first_shift_date: string | null
          frozen_at: string | null
          frozen_by: string | null
          id: string
          is_active: boolean | null
          is_frozen: boolean | null
          license_expires_at: string | null
          license_notes: string | null
          license_status: string | null
          matricula: string | null
          name: string
          phone: string | null
          position: string | null
          role: string | null
          team: string | null
          unblocked_at: string | null
          unblocked_by: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          bh_hourly_rate?: number | null
          bh_limit?: number | null
          birth_date?: string | null
          blood_type?: string | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_shift_date?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          id?: string
          is_active?: boolean | null
          is_frozen?: boolean | null
          license_expires_at?: string | null
          license_notes?: string | null
          license_status?: string | null
          matricula?: string | null
          name: string
          phone?: string | null
          position?: string | null
          role?: string | null
          team?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          age?: number | null
          avatar_url?: string | null
          bh_hourly_rate?: number | null
          bh_limit?: number | null
          birth_date?: string | null
          blood_type?: string | null
          cpf?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_shift_date?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          id?: string
          is_active?: boolean | null
          is_frozen?: boolean | null
          license_expires_at?: string | null
          license_notes?: string | null
          license_status?: string | null
          matricula?: string | null
          name?: string
          phone?: string | null
          position?: string | null
          role?: string | null
          team?: string | null
          unblocked_at?: string | null
          unblocked_by?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          agent_id: string
          id: string
          joined_at: string
          room_id: string
        }
        Insert: {
          agent_id: string
          id?: string
          joined_at?: string
          room_id: string
        }
        Update: {
          agent_id?: string
          id?: string
          joined_at?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          name: string
          team: string | null
          type: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          team?: string | null
          type?: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          team?: string | null
          type?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_messages: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          message_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          message_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deleted_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_time: string
          id: string
          identifier: string
          ip_address: string | null
          success: boolean | null
        }
        Insert: {
          attempt_time?: string
          id?: string
          identifier: string
          ip_address?: string | null
          success?: boolean | null
        }
        Update: {
          attempt_time?: string
          id?: string
          identifier?: string
          ip_address?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      master_admin: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      master_session_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      overtime_bank: {
        Row: {
          agent_id: string
          created_at: string
          description: string | null
          hours: number
          id: string
          operation_type: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          operation_type?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          description?: string | null
          hours?: number
          id?: string
          operation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_bank_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          id: string
          months_paid: number
          notes: string | null
          payment_date: string
          payment_method: string | null
          registered_by: string | null
        }
        Insert: {
          agent_id: string
          amount?: number
          created_at?: string
          id?: string
          months_paid?: number
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          registered_by?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          id?: string
          months_paid?: number
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          registered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_alerts: {
        Row: {
          agent_id: string
          alert_type: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          scheduled_for: string | null
          sent_at: string | null
          shift_id: string | null
          title: string
        }
        Insert: {
          agent_id: string
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          scheduled_for?: string | null
          sent_at?: string | null
          shift_id?: string | null
          title: string
        }
        Update: {
          agent_id?: string
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          scheduled_for?: string | null
          sent_at?: string | null
          shift_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_alerts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_planner_configs: {
        Row: {
          agent_count: number
          agent_id: string
          config_name: string
          config_type: string
          created_at: string
          end_time: string
          id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          agent_count?: number
          agent_id: string
          config_name: string
          config_type: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          agent_count?: number
          agent_id?: string
          config_name?: string
          config_type?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_planner_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          agent_id: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          shift_date: string
          shift_type: string
          start_time: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          shift_date: string
          shift_type?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          shift_date?: string
          shift_type?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          agent_id: string
          created_at: string
          from_team: string
          from_unit_id: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          to_team: string
          to_unit_id: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          from_team: string
          from_unit_id: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_team: string
          to_unit_id: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          from_team?: string
          from_unit_id?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          to_team?: string
          to_unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          coordinator_name: string | null
          created_at: string
          director_name: string | null
          email: string | null
          id: string
          municipality: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          coordinator_name?: string | null
          created_at?: string
          director_name?: string | null
          email?: string | null
          id?: string
          municipality: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          coordinator_name?: string | null
          created_at?: string
          director_name?: string | null
          email?: string | null
          id?: string
          municipality?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_bh_balance: { Args: { p_agent_id: string }; Returns: number }
      calculate_bh_value: { Args: { p_agent_id: string }; Returns: number }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_orphan_auth_user: { Args: { p_email: string }; Returns: boolean }
      create_shift_reminder: {
        Args: { p_agent_id: string; p_shift_date: string; p_shift_id?: string }
        Returns: undefined
      }
      extend_license: {
        Args: { p_admin_id: string; p_agent_id: string; p_months: number }
        Returns: string
      }
      generate_agent_shifts: {
        Args: {
          p_agent_id: string
          p_first_shift_date: string
          p_months_ahead?: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_master: { Args: { _user_id: string }; Returns: boolean }
      is_license_expired: { Args: { p_agent_id: string }; Returns: boolean }
      record_login_attempt: {
        Args: { p_identifier: string; p_ip?: string; p_success: boolean }
        Returns: undefined
      }
      toggle_agent_freeze: {
        Args: { p_admin_id: string; p_agent_id: string; p_freeze: boolean }
        Returns: boolean
      }
      verify_master_admin: {
        Args: { p_password: string; p_username: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "master"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "master"],
    },
  },
} as const

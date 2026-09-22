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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          request_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "customer_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_requests: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_designer_id: string | null
          created_at: string
          customer_id: string
          description: string
          factory_note: string | null
          id: string
          spec_data: Json
          status: string
          title: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_designer_id?: string | null
          created_at?: string
          customer_id: string
          description?: string
          factory_note?: string | null
          id?: string
          spec_data?: Json
          status?: string
          title: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_designer_id?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          factory_note?: string | null
          id?: string
          spec_data?: Json
          status?: string
          title?: string
        }
        Relationships: []
      }
      factory_operations: {
        Row: {
          approval_status: string
          completion_percent: number
          created_at: string
          id: string
          logged_by: string | null
          notes: string | null
          operation_type: string
          project_id: string | null
          project_name_snapshot: string
          work_date: string
          worker_id: string | null
          worker_name: string | null
        }
        Insert: {
          approval_status?: string
          completion_percent?: number
          created_at?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          operation_type: string
          project_id?: string | null
          project_name_snapshot: string
          work_date?: string
          worker_id?: string | null
          worker_name?: string | null
        }
        Update: {
          approval_status?: string
          completion_percent?: number
          created_at?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          operation_type?: string
          project_id?: string | null
          project_name_snapshot?: string
          work_date?: string
          worker_id?: string | null
          worker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factory_operations_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_operations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_operations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_designer"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_workers: {
        Row: {
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      field_configs: {
        Row: {
          columns: Json
          id: string
          target: string
          updated_at: string
        }
        Insert: {
          columns?: Json
          id?: string
          target: string
          updated_at?: string
        }
        Update: {
          columns?: Json
          id?: string
          target?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_prices: {
        Row: {
          material_id: string
          retail_price: number
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          material_id: string
          retail_price: number
          updated_at?: string
          wholesale_price: number
        }
        Update: {
          material_id?: string
          retail_price?: number
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: []
      }
      project_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          note: string | null
          project_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
          project_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_designer"
            referencedColumns: ["id"]
          },
        ]
      }
      project_items: {
        Row: {
          category: string
          cost: number | null
          created_at: string
          id: string
          item_data: Json
          price: number | null
          project_id: string
          weight: number | null
        }
        Insert: {
          category: string
          cost?: number | null
          created_at?: string
          id?: string
          item_data: Json
          price?: number | null
          project_id: string
          weight?: number | null
        }
        Update: {
          category?: string
          cost?: number | null
          created_at?: string
          id?: string
          item_data?: Json
          price?: number | null
          project_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_designer"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          client_name: string | null
          created_at: string
          designer_id: string | null
          id: string
          notes: string | null
          project_data: Json | null
          project_name: string
          render_image_url: string | null
          status: string | null
          total_cost: number | null
          total_price: number | null
          total_weight: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client?: string | null
          client_name?: string | null
          created_at?: string
          designer_id?: string | null
          id?: string
          notes?: string | null
          project_data?: Json | null
          project_name: string
          render_image_url?: string | null
          status?: string | null
          total_cost?: number | null
          total_price?: number | null
          total_weight?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client?: string | null
          client_name?: string | null
          created_at?: string
          designer_id?: string | null
          id?: string
          notes?: string | null
          project_data?: Json | null
          project_name?: string
          render_image_url?: string | null
          status?: string | null
          total_cost?: number | null
          total_price?: number | null
          total_weight?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          approval_status: string
          created_at: string
          cumulative_percent: number
          daily_percent: number
          id: string
          pieces_cumulative: number
          pieces_today: number
          project_id: string
          project_name_snapshot: string
          rejection_note: string | null
          requested_by: string
          requested_row_ids: Json
          total_pieces: number
          work_date: string
        }
        Insert: {
          approval_status?: string
          created_at?: string
          cumulative_percent?: number
          daily_percent?: number
          id?: string
          pieces_cumulative?: number
          pieces_today?: number
          project_id: string
          project_name_snapshot: string
          rejection_note?: string | null
          requested_by: string
          requested_row_ids?: Json
          total_pieces?: number
          work_date?: string
        }
        Update: {
          approval_status?: string
          created_at?: string
          cumulative_percent?: number
          daily_percent?: number
          id?: string
          pieces_cumulative?: number
          pieces_today?: number
          project_id?: string
          project_name_snapshot?: string
          rejection_note?: string | null
          requested_by?: string
          requested_row_ids?: Json
          total_pieces?: number
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects_with_designer"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      projects_with_designer: {
        Row: {
          client: string | null
          created_at: string | null
          designer_name: string | null
          id: string | null
          project_data: Json | null
          project_name: string | null
          status: string | null
          total_cost: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_app_role: { Args: never; Returns: string }
      get_user_role: { Args: { uid: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

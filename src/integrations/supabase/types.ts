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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bom: {
        Row: {
          component_id: string
          id: string
          model_id: string
          qty_per_unit: number
        }
        Insert: {
          component_id: string
          id?: string
          model_id: string
          qty_per_unit?: number
        }
        Update: {
          component_id?: string
          id?: string
          model_id?: string
          qty_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tv_models"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          item_code: string
          name: string
          reorder_level: number
          supplier: string | null
          unit_cost: number
          updated_at: string
          warehouse_location: string | null
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          item_code: string
          name: string
          reorder_level?: number
          supplier?: string | null
          unit_cost?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          item_code?: string
          name?: string
          reorder_level?: number
          supplier?: string | null
          unit_cost?: number
          updated_at?: string
          warehouse_location?: string | null
        }
        Relationships: []
      }
      fault_records: {
        Row: {
          created_at: string
          diagnosis: string | null
          fault_type: Database["public"]["Enums"]["fault_type"]
          id: string
          model_id: string | null
          repair_action: string | null
          serial_number: string
          status: Database["public"]["Enums"]["fault_status"]
          technician: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          fault_type: Database["public"]["Enums"]["fault_type"]
          id?: string
          model_id?: string | null
          repair_action?: string | null
          serial_number: string
          status?: Database["public"]["Enums"]["fault_status"]
          technician?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          fault_type?: Database["public"]["Enums"]["fault_type"]
          id?: string
          model_id?: string | null
          repair_action?: string | null
          serial_number?: string
          status?: Database["public"]["Enums"]["fault_status"]
          technician?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fault_records_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tv_models"
            referencedColumns: ["id"]
          },
        ]
      }
      production_runs: {
        Row: {
          actual_qty: number
          created_at: string
          created_by: string | null
          defects_qty: number
          id: string
          model_id: string
          notes: string | null
          planned_qty: number
          rework_qty: number
          run_date: string
          shift: Database["public"]["Enums"]["shift_type"]
          supervisor: string | null
        }
        Insert: {
          actual_qty?: number
          created_at?: string
          created_by?: string | null
          defects_qty?: number
          id?: string
          model_id: string
          notes?: string | null
          planned_qty?: number
          rework_qty?: number
          run_date?: string
          shift: Database["public"]["Enums"]["shift_type"]
          supervisor?: string | null
        }
        Update: {
          actual_qty?: number
          created_at?: string
          created_by?: string | null
          defects_qty?: number
          id?: string
          model_id?: string
          notes?: string | null
          planned_qty?: number
          rework_qty?: number
          run_date?: string
          shift?: Database["public"]["Enums"]["shift_type"]
          supervisor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_runs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tv_models"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      qc_inspections: {
        Row: {
          audio_test: Database["public"]["Enums"]["qc_test_result"]
          created_at: string
          display_test: Database["public"]["Enums"]["qc_test_result"]
          final_result: Database["public"]["Enums"]["qc_result"]
          id: string
          inspector_id: string | null
          model_id: string | null
          notes: string | null
          ports_test: Database["public"]["Enums"]["qc_test_result"]
          remote_test: Database["public"]["Enums"]["qc_test_result"]
          serial_number: string
        }
        Insert: {
          audio_test?: Database["public"]["Enums"]["qc_test_result"]
          created_at?: string
          display_test?: Database["public"]["Enums"]["qc_test_result"]
          final_result: Database["public"]["Enums"]["qc_result"]
          id?: string
          inspector_id?: string | null
          model_id?: string | null
          notes?: string | null
          ports_test?: Database["public"]["Enums"]["qc_test_result"]
          remote_test?: Database["public"]["Enums"]["qc_test_result"]
          serial_number: string
        }
        Update: {
          audio_test?: Database["public"]["Enums"]["qc_test_result"]
          created_at?: string
          display_test?: Database["public"]["Enums"]["qc_test_result"]
          final_result?: Database["public"]["Enums"]["qc_result"]
          id?: string
          inspector_id?: string | null
          model_id?: string | null
          notes?: string | null
          ports_test?: Database["public"]["Enums"]["qc_test_result"]
          remote_test?: Database["public"]["Enums"]["qc_test_result"]
          serial_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "qc_inspections_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tv_models"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string | null
          id: string
          model_id: string
          region: string | null
          revenue: number | null
          sale_date: string
          unit_price: number
          units_sold: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          model_id: string
          region?: string | null
          revenue?: number | null
          sale_date?: string
          unit_price: number
          units_sold?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          id?: string
          model_id?: string
          region?: string | null
          revenue?: number | null
          sale_date?: string
          unit_price?: number
          units_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "tv_models"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          component_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          quantity: number
          reference: string | null
        }
        Insert: {
          component_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference?: string | null
        }
        Update: {
          component_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_models: {
        Row: {
          created_at: string
          default_price: number
          id: string
          initial_stock: number
          is_smart: boolean
          item_code: string | null
          name: string
          reorder_level: number
          size_inches: number
          supplier: string | null
          unit_cost: number
          warehouse_location: string | null
        }
        Insert: {
          created_at?: string
          default_price?: number
          id?: string
          initial_stock?: number
          is_smart?: boolean
          item_code?: string | null
          name: string
          reorder_level?: number
          size_inches: number
          supplier?: string | null
          unit_cost?: number
          warehouse_location?: string | null
        }
        Update: {
          created_at?: string
          default_price?: number
          id?: string
          initial_stock?: number
          is_smart?: boolean
          item_code?: string | null
          name?: string
          reorder_level?: number
          size_inches?: number
          supplier?: string | null
          unit_cost?: number
          warehouse_location?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "production" | "qc" | "inventory" | "sales"
      fault_status: "pending" | "in_repair" | "fixed" | "scrapped" | "retested"
      fault_type:
        | "display"
        | "power"
        | "sound"
        | "firmware"
        | "cosmetic"
        | "other"
      qc_result: "PASS" | "FAIL"
      qc_test_result: "PASS" | "FAIL" | "NA"
      shift_type: "Morning" | "Afternoon" | "Night"
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
      app_role: ["admin", "production", "qc", "inventory", "sales"],
      fault_status: ["pending", "in_repair", "fixed", "scrapped", "retested"],
      fault_type: [
        "display",
        "power",
        "sound",
        "firmware",
        "cosmetic",
        "other",
      ],
      qc_result: ["PASS", "FAIL"],
      qc_test_result: ["PASS", "FAIL", "NA"],
      shift_type: ["Morning", "Afternoon", "Night"],
    },
  },
} as const

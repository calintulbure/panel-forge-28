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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: never
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          last_read_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_room_id_fkey"
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
          is_default: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          articol_id: number
          categ1: string | null
          categ2: string | null
          categ3: string | null
          created_at: string | null
          erp_product_code: string
          erp_product_description: string | null
          erp_product_description_detailed: string | null
          hu_stock: number | null
          hu_stock_detailed: string | null
          producator: string | null
          ro_stoc_detailed: string | null
          ro_stock: number | null
          senior_erp_link: string | null
          site_hu_product_id: number | null
          site_hu_snapshot_base64: string | null
          site_hu_snapshot_url: string | null
          site_hu_url: string | null
          site_ro_product_id: number | null
          site_ro_snapshot_base64: string | null
          site_ro_snapshot_url: string | null
          site_ro_url: string | null
          stare_oferta: string | null
          stare_oferta_secundara: string | null
          stare_stoc: string | null
          tip_produs_id_main: number | null
          tip_produs_id_sub: number | null
          tosync: number | null
          updated_at: string | null
          validated: boolean | null
          ylihu_descriere: string | null
          ylihu_sku: string | null
          yliro_descriere: string | null
          yliro_sku: string | null
        }
        Insert: {
          articol_id?: number
          categ1?: string | null
          categ2?: string | null
          categ3?: string | null
          created_at?: string | null
          erp_product_code: string
          erp_product_description?: string | null
          erp_product_description_detailed?: string | null
          hu_stock?: number | null
          hu_stock_detailed?: string | null
          producator?: string | null
          ro_stoc_detailed?: string | null
          ro_stock?: number | null
          senior_erp_link?: string | null
          site_hu_product_id?: number | null
          site_hu_snapshot_base64?: string | null
          site_hu_snapshot_url?: string | null
          site_hu_url?: string | null
          site_ro_product_id?: number | null
          site_ro_snapshot_base64?: string | null
          site_ro_snapshot_url?: string | null
          site_ro_url?: string | null
          stare_oferta?: string | null
          stare_oferta_secundara?: string | null
          stare_stoc?: string | null
          tip_produs_id_main?: number | null
          tip_produs_id_sub?: number | null
          tosync?: number | null
          updated_at?: string | null
          validated?: boolean | null
          ylihu_descriere?: string | null
          ylihu_sku?: string | null
          yliro_descriere?: string | null
          yliro_sku?: string | null
        }
        Update: {
          articol_id?: number
          categ1?: string | null
          categ2?: string | null
          categ3?: string | null
          created_at?: string | null
          erp_product_code?: string
          erp_product_description?: string | null
          erp_product_description_detailed?: string | null
          hu_stock?: number | null
          hu_stock_detailed?: string | null
          producator?: string | null
          ro_stoc_detailed?: string | null
          ro_stock?: number | null
          senior_erp_link?: string | null
          site_hu_product_id?: number | null
          site_hu_snapshot_base64?: string | null
          site_hu_snapshot_url?: string | null
          site_hu_url?: string | null
          site_ro_product_id?: number | null
          site_ro_snapshot_base64?: string | null
          site_ro_snapshot_url?: string | null
          site_ro_url?: string | null
          stare_oferta?: string | null
          stare_oferta_secundara?: string | null
          stare_stoc?: string | null
          tip_produs_id_main?: number | null
          tip_produs_id_sub?: number | null
          tosync?: number | null
          updated_at?: string | null
          validated?: boolean | null
          ylihu_descriere?: string | null
          ylihu_sku?: string | null
          yliro_descriere?: string | null
          yliro_sku?: string | null
        }
        Relationships: []
      }
      products_bak: {
        Row: {
          articol_id: number
          categ1: string | null
          categ2: string | null
          categ3: string | null
          created_at: string | null
          erp_product_code: string | null
          erp_product_description: string | null
          hu_stock: number | null
          hu_stock_detailed: string | null
          producator: string | null
          ro_stoc_detailed: string | null
          ro_stock: number | null
          senior_erp_link: string | null
          site_hu_product_id: number | null
          site_hu_snapshot_base64: string | null
          site_hu_snapshot_url: string | null
          site_hu_url: string | null
          site_ro_product_id: number | null
          site_ro_snapshot_base64: string | null
          site_ro_snapshot_url: string | null
          site_ro_url: string | null
          stare_oferta: string | null
          stare_oferta_secundara: string | null
          stare_stoc: string | null
          tosync: number | null
          updated_at: string | null
          validated: boolean | null
          ylihu_descriere: string | null
          ylihu_sku: string | null
          yliro_descriere: string | null
          yliro_sku: string | null
        }
        Insert: {
          articol_id: number
          categ1?: string | null
          categ2?: string | null
          categ3?: string | null
          created_at?: string | null
          erp_product_code?: string | null
          erp_product_description?: string | null
          hu_stock?: number | null
          hu_stock_detailed?: string | null
          producator?: string | null
          ro_stoc_detailed?: string | null
          ro_stock?: number | null
          senior_erp_link?: string | null
          site_hu_product_id?: number | null
          site_hu_snapshot_base64?: string | null
          site_hu_snapshot_url?: string | null
          site_hu_url?: string | null
          site_ro_product_id?: number | null
          site_ro_snapshot_base64?: string | null
          site_ro_snapshot_url?: string | null
          site_ro_url?: string | null
          stare_oferta?: string | null
          stare_oferta_secundara?: string | null
          stare_stoc?: string | null
          tosync?: number | null
          updated_at?: string | null
          validated?: boolean | null
          ylihu_descriere?: string | null
          ylihu_sku?: string | null
          yliro_descriere?: string | null
          yliro_sku?: string | null
        }
        Update: {
          articol_id?: number
          categ1?: string | null
          categ2?: string | null
          categ3?: string | null
          created_at?: string | null
          erp_product_code?: string | null
          erp_product_description?: string | null
          hu_stock?: number | null
          hu_stock_detailed?: string | null
          producator?: string | null
          ro_stoc_detailed?: string | null
          ro_stock?: number | null
          senior_erp_link?: string | null
          site_hu_product_id?: number | null
          site_hu_snapshot_base64?: string | null
          site_hu_snapshot_url?: string | null
          site_hu_url?: string | null
          site_ro_product_id?: number | null
          site_ro_snapshot_base64?: string | null
          site_ro_snapshot_url?: string | null
          site_ro_url?: string | null
          stare_oferta?: string | null
          stare_oferta_secundara?: string | null
          stare_stoc?: string | null
          tosync?: number | null
          updated_at?: string | null
          validated?: boolean | null
          ylihu_descriere?: string | null
          ylihu_sku?: string | null
          yliro_descriere?: string | null
          yliro_sku?: string | null
        }
        Relationships: []
      }
      products_bak_202512181100: {
        Row: {
          articol_id: number | null
          categ1: string | null
          categ2: string | null
          categ3: string | null
          created_at: string | null
          erp_product_code: string | null
          erp_product_description: string | null
          erp_product_description_detailed: string | null
          hu_stock: number | null
          hu_stock_detailed: string | null
          producator: string | null
          ro_stoc_detailed: string | null
          ro_stock: number | null
          senior_erp_link: string | null
          site_hu_product_id: number | null
          site_hu_snapshot_base64: string | null
          site_hu_snapshot_url: string | null
          site_hu_url: string | null
          site_ro_product_id: number | null
          site_ro_snapshot_base64: string | null
          site_ro_snapshot_url: string | null
          site_ro_url: string | null
          stare_oferta: string | null
          stare_oferta_secundara: string | null
          stare_stoc: string | null
          tip_produs_id_main: number | null
          tip_produs_id_sub: number | null
          tosync: number | null
          updated_at: string | null
          validated: boolean | null
          ylihu_descriere: string | null
          ylihu_sku: string | null
          yliro_descriere: string | null
          yliro_sku: string | null
        }
        Insert: {
          articol_id?: number | null
          categ1?: string | null
          categ2?: string | null
          categ3?: string | null
          created_at?: string | null
          erp_product_code?: string | null
          erp_product_description?: string | null
          erp_product_description_detailed?: string | null
          hu_stock?: number | null
          hu_stock_detailed?: string | null
          producator?: string | null
          ro_stoc_detailed?: string | null
          ro_stock?: number | null
          senior_erp_link?: string | null
          site_hu_product_id?: number | null
          site_hu_snapshot_base64?: string | null
          site_hu_snapshot_url?: string | null
          site_hu_url?: string | null
          site_ro_product_id?: number | null
          site_ro_snapshot_base64?: string | null
          site_ro_snapshot_url?: string | null
          site_ro_url?: string | null
          stare_oferta?: string | null
          stare_oferta_secundara?: string | null
          stare_stoc?: string | null
          tip_produs_id_main?: number | null
          tip_produs_id_sub?: number | null
          tosync?: number | null
          updated_at?: string | null
          validated?: boolean | null
          ylihu_descriere?: string | null
          ylihu_sku?: string | null
          yliro_descriere?: string | null
          yliro_sku?: string | null
        }
        Update: {
          articol_id?: number | null
          categ1?: string | null
          categ2?: string | null
          categ3?: string | null
          created_at?: string | null
          erp_product_code?: string | null
          erp_product_description?: string | null
          erp_product_description_detailed?: string | null
          hu_stock?: number | null
          hu_stock_detailed?: string | null
          producator?: string | null
          ro_stoc_detailed?: string | null
          ro_stock?: number | null
          senior_erp_link?: string | null
          site_hu_product_id?: number | null
          site_hu_snapshot_base64?: string | null
          site_hu_snapshot_url?: string | null
          site_hu_url?: string | null
          site_ro_product_id?: number | null
          site_ro_snapshot_base64?: string | null
          site_ro_snapshot_url?: string | null
          site_ro_url?: string | null
          stare_oferta?: string | null
          stare_oferta_secundara?: string | null
          stare_stoc?: string | null
          tip_produs_id_main?: number | null
          tip_produs_id_sub?: number | null
          tosync?: number | null
          updated_at?: string | null
          validated?: boolean | null
          ylihu_descriere?: string | null
          ylihu_sku?: string | null
          yliro_descriere?: string | null
          yliro_sku?: string | null
        }
        Relationships: []
      }
      products_bak_bak: {
        Row: {
          articol_id: number | null
          categ1: string | null
          categ2: string | null
          categ3: string | null
          created_at: string | null
          erp_product_code: string | null
          erp_product_description: string | null
          hu_stock: number | null
          hu_stock_detailed: string | null
          producator: string | null
          ro_stoc_detailed: string | null
          ro_stock: number | null
          senior_erp_link: string | null
          site_hu_product_id: number | null
          site_hu_snapshot_base64: string | null
          site_hu_snapshot_url: string | null
          site_hu_url: string | null
          site_ro_product_id: number | null
          site_ro_snapshot_base64: string | null
          site_ro_snapshot_url: string | null
          site_ro_url: string | null
          stare_oferta: string | null
          stare_oferta_secundara: string | null
          stare_stoc: string | null
          tosync: number | null
          updated_at: string | null
          validated: boolean | null
          ylihu_descriere: string | null
          ylihu_sku: string | null
          yliro_descriere: string | null
          yliro_sku: string | null
        }
        Insert: {
          articol_id?: number | null
          categ1?: string | null
          categ2?: string | null
          categ3?: string | null
          created_at?: string | null
          erp_product_code?: string | null
          erp_product_description?: string | null
          hu_stock?: number | null
          hu_stock_detailed?: string | null
          producator?: string | null
          ro_stoc_detailed?: string | null
          ro_stock?: number | null
          senior_erp_link?: string | null
          site_hu_product_id?: number | null
          site_hu_snapshot_base64?: string | null
          site_hu_snapshot_url?: string | null
          site_hu_url?: string | null
          site_ro_product_id?: number | null
          site_ro_snapshot_base64?: string | null
          site_ro_snapshot_url?: string | null
          site_ro_url?: string | null
          stare_oferta?: string | null
          stare_oferta_secundara?: string | null
          stare_stoc?: string | null
          tosync?: number | null
          updated_at?: string | null
          validated?: boolean | null
          ylihu_descriere?: string | null
          ylihu_sku?: string | null
          yliro_descriere?: string | null
          yliro_sku?: string | null
        }
        Update: {
          articol_id?: number | null
          categ1?: string | null
          categ2?: string | null
          categ3?: string | null
          created_at?: string | null
          erp_product_code?: string | null
          erp_product_description?: string | null
          hu_stock?: number | null
          hu_stock_detailed?: string | null
          producator?: string | null
          ro_stoc_detailed?: string | null
          ro_stock?: number | null
          senior_erp_link?: string | null
          site_hu_product_id?: number | null
          site_hu_snapshot_base64?: string | null
          site_hu_snapshot_url?: string | null
          site_hu_url?: string | null
          site_ro_product_id?: number | null
          site_ro_snapshot_base64?: string | null
          site_ro_snapshot_url?: string | null
          site_ro_url?: string | null
          stare_oferta?: string | null
          stare_oferta_secundara?: string | null
          stare_stoc?: string | null
          tosync?: number | null
          updated_at?: string | null
          validated?: boolean | null
          ylihu_descriere?: string | null
          ylihu_sku?: string | null
          yliro_descriere?: string | null
          yliro_sku?: string | null
        }
        Relationships: []
      }
      tip_produs: {
        Row: {
          countproduse: number | null
          created_at: string | null
          tipprodus_cod: string | null
          tipprodus_descriere: string
          tipprodus_id: number
          tipprodus_level: string
          tipprodusmain_descr: string | null
          tipprodusmain_id: number | null
          updated_at: string | null
        }
        Insert: {
          countproduse?: number | null
          created_at?: string | null
          tipprodus_cod?: string | null
          tipprodus_descriere: string
          tipprodus_id?: number
          tipprodus_level?: string
          tipprodusmain_descr?: string | null
          tipprodusmain_id?: number | null
          updated_at?: string | null
        }
        Update: {
          countproduse?: number | null
          created_at?: string | null
          tipprodus_cod?: string | null
          tipprodus_descriere?: string
          tipprodus_id?: number
          tipprodus_level?: string
          tipprodusmain_descr?: string | null
          tipprodusmain_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      yli_hu_products: {
        Row: {
          created_at: string
          product_id: number | null
          sku: string
          status: string | null
          url_key: string | null
        }
        Insert: {
          created_at?: string
          product_id?: number | null
          sku: string
          status?: string | null
          url_key?: string | null
        }
        Update: {
          created_at?: string
          product_id?: number | null
          sku?: string
          status?: string | null
          url_key?: string | null
        }
        Relationships: []
      }
      yli_ro_products: {
        Row: {
          created_at: string
          product_id: number | null
          sku: string
          status: string | null
          url_key: string
        }
        Insert: {
          created_at?: string
          product_id?: number | null
          sku: string
          status?: string | null
          url_key: string
        }
        Update: {
          created_at?: string
          product_id?: number | null
          sku?: string
          status?: string | null
          url_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_upsert_products: { Args: { payload: Json }; Returns: number }
      get_product_type_counts: {
        Args: never
        Returns: {
          product_count: number
          tip_produs_id_sub: number
        }[]
      }
      get_user_approval_status: {
        Args: { _user_id: string }
        Returns: {
          has_role: boolean
          is_approved: boolean
          pending_approval: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_products_from_sources: {
        Args: { run_hu?: boolean; run_ro?: boolean; validated_only?: boolean }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "operator"
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
      app_role: ["admin", "operator"],
    },
  },
} as const

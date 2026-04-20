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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api_usage_logs: {
        Row: {
          action: string
          created_at: string
          estimated_cost: number | null
          id: string
          metadata: Json | null
          service: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          service: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          service?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      custom_presets: {
        Row: {
          created_at: string
          descriptor: string
          id: string
          image_url: string
          label: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descriptor: string
          id?: string
          image_url: string
          label: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          descriptor?: string
          id?: string
          image_url?: string
          label?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          progress: number
          project_id: string | null
          result: Json | null
          started_at: string | null
          status: string
          total_steps: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          progress?: number
          project_id?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
          total_steps?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          progress?: number
          project_id?: string | null
          result?: Json | null
          started_at?: string | null
          status?: string
          total_steps?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      image_library: {
        Row: {
          angle: string | null
          created_at: string
          height: number | null
          id: string
          name: string
          product_name: string | null
          size_bytes: number | null
          status: string | null
          storage_path: string | null
          store_domain: string | null
          tags: string[] | null
          updated_at: string
          url: string
          user_id: string
          width: number | null
        }
        Insert: {
          angle?: string | null
          created_at?: string
          height?: number | null
          id?: string
          name?: string
          product_name?: string | null
          size_bytes?: number | null
          status?: string | null
          storage_path?: string | null
          store_domain?: string | null
          tags?: string[] | null
          updated_at?: string
          url: string
          user_id: string
          width?: number | null
        }
        Update: {
          angle?: string | null
          created_at?: string
          height?: number | null
          id?: string
          name?: string
          product_name?: string | null
          size_bytes?: number | null
          status?: string | null
          storage_path?: string | null
          store_domain?: string | null
          tags?: string[] | null
          updated_at?: string
          url?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          plan: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          plan?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          plan?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_images: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          project_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          project_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          project_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_data: Json
          created_at: string
          id: string
          name: string
          product_data: Json
          published_at: string | null
          seo_data: Json
          status: string
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_data?: Json
          created_at?: string
          id?: string
          name?: string
          product_data?: Json
          published_at?: string | null
          seo_data?: Json
          status?: string
          step?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_data?: Json
          created_at?: string
          id?: string
          name?: string
          product_data?: Json
          published_at?: string | null
          seo_data?: Json
          status?: string
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      published_products: {
        Row: {
          base_currency: string | null
          base_price: number | null
          collection: string | null
          country_code: string | null
          country_flag: string | null
          country_name: string | null
          created_at: string
          currency: string | null
          currency_symbol: string | null
          description: string | null
          id: string
          image_url: string | null
          language: string | null
          language_label: string | null
          local_price: number | null
          market_name: string | null
          region_group: string | null
          shopify_product_id: string | null
          shopify_url: string | null
          sizes: string[] | null
          status: string
          store_domain: string
          title: string
          user_id: string
        }
        Insert: {
          base_currency?: string | null
          base_price?: number | null
          collection?: string | null
          country_code?: string | null
          country_flag?: string | null
          country_name?: string | null
          created_at?: string
          currency?: string | null
          currency_symbol?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          language_label?: string | null
          local_price?: number | null
          market_name?: string | null
          region_group?: string | null
          shopify_product_id?: string | null
          shopify_url?: string | null
          sizes?: string[] | null
          status?: string
          store_domain: string
          title: string
          user_id: string
        }
        Update: {
          base_currency?: string | null
          base_price?: number | null
          collection?: string | null
          country_code?: string | null
          country_flag?: string | null
          country_name?: string | null
          created_at?: string
          currency?: string | null
          currency_symbol?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          language?: string | null
          language_label?: string | null
          local_price?: number | null
          market_name?: string | null
          region_group?: string | null
          shopify_product_id?: string | null
          shopify_url?: string | null
          sizes?: string[] | null
          status?: string
          store_domain?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          attempted_route: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          attempted_route?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_route?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shopify_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          market_config: Json | null
          shop_name: string
          store_domain: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          market_config?: Json | null
          shop_name: string
          store_domain: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          market_config?: Json | null
          shop_name?: string
          store_domain?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_prompts: {
        Row: {
          category: string | null
          created_at: string
          default_angles: string[] | null
          default_ratio: string | null
          id: string
          last_used_at: string | null
          name: string
          personal_notes: string | null
          prompt_text: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_angles?: string[] | null
          default_ratio?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          personal_notes?: string | null
          prompt_text: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_angles?: string[] | null
          default_ratio?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          personal_notes?: string | null
          prompt_text?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

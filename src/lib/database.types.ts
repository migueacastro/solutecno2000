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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      collection_products: {
        Row: {
          collection_id: string
          position: number
          product_id: string
        }
        Insert: {
          collection_id: string
          position?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description_html: string | null
          id: string
          image_id: string | null
          is_smart: boolean
          published_at: string | null
          rule_set: Json | null
          slug: string
          sort_rule: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_html?: string | null
          id?: string
          image_id?: string | null
          is_smart?: boolean
          published_at?: string | null
          rule_set?: Json | null
          slug: string
          sort_rule?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_html?: string | null
          id?: string
          image_id?: string | null
          is_smart?: boolean
          published_at?: string | null
          rule_set?: Json | null
          slug?: string
          sort_rule?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          company: string | null
          country_code: string | null
          created_at: string
          customer_id: string
          first_name: string | null
          id: string
          is_default: boolean
          last_name: string | null
          phone: string | null
          province: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          customer_id: string
          first_name?: string | null
          id?: string
          is_default?: boolean
          last_name?: string | null
          phone?: string | null
          province?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          company?: string | null
          country_code?: string | null
          created_at?: string
          customer_id?: string
          first_name?: string | null
          id?: string
          is_default?: boolean
          last_name?: string | null
          phone?: string | null
          province?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          data_sale_opt_out: boolean
          display_name: string | null
          email: string
          email_verified: boolean
          first_name: string | null
          id: string
          identity_provider: string | null
          last_name: string | null
          locale: string | null
          note: string | null
          orders_count: number
          phone: string | null
          state: Database["public"]["Enums"]["customer_state"]
          tags: string[]
          tax_exempt: boolean
          total_spent: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_sale_opt_out?: boolean
          display_name?: string | null
          email: string
          email_verified?: boolean
          first_name?: string | null
          id?: string
          identity_provider?: string | null
          last_name?: string | null
          locale?: string | null
          note?: string | null
          orders_count?: number
          phone?: string | null
          state?: Database["public"]["Enums"]["customer_state"]
          tags?: string[]
          tax_exempt?: boolean
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_sale_opt_out?: boolean
          display_name?: string | null
          email?: string
          email_verified?: boolean
          first_name?: string | null
          id?: string
          identity_provider?: string | null
          last_name?: string | null
          locale?: string | null
          note?: string | null
          orders_count?: number
          phone?: string | null
          state?: Database["public"]["Enums"]["customer_state"]
          tags?: string[]
          tax_exempt?: boolean
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          product_id: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt: string | null
          created_at: string
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          mime_type: string | null
          status: Database["public"]["Enums"]["media_status"]
          url: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          mime_type?: string | null
          status?: Database["public"]["Enums"]["media_status"]
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          mime_type?: string | null
          status?: Database["public"]["Enums"]["media_status"]
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      metafields: {
        Row: {
          created_at: string
          key: string
          namespace: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["metafield_owner_type"]
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          namespace?: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["metafield_owner_type"]
          type?: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          namespace?: string
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["metafield_owner_type"]
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          locale: string
          published_at: string | null
          slug: string
          source_file: string | null
          tags: string[]
          title: string
          updated_at: string
          views: number
          word_count: number
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          locale?: string
          published_at?: string | null
          slug: string
          source_file?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          views?: number
          word_count?: number
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          locale?: string
          published_at?: string | null
          slug?: string
          source_file?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          views?: number
          word_count?: number
        }
        Relationships: []
      }
      product_media: {
        Row: {
          is_featured: boolean
          media_id: string
          position: number
          product_id: string
        }
        Insert: {
          is_featured?: boolean
          media_id: string
          position?: number
          product_id: string
        }
        Update: {
          is_featured?: boolean
          media_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          id: string
          name: string
          position: number
          product_id: string
          values: string[]
        }
        Insert: {
          id?: string
          name: string
          position?: number
          product_id: string
          values?: string[]
        }
        Update: {
          id?: string
          name?: string
          position?: number
          product_id?: string
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          compare_at_price: number | null
          created_at: string
          currency: string
          id: string
          inventory_policy: Database["public"]["Enums"]["inventory_policy"]
          inventory_quantity: number
          position: number
          price: number | null
          price_on_request: boolean
          product_id: string
          selected_options: Json
          sku: string | null
          taxable: boolean
          title: string | null
          tracks_inventory: boolean
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          inventory_policy?: Database["public"]["Enums"]["inventory_policy"]
          inventory_quantity?: number
          position?: number
          price?: number | null
          price_on_request?: boolean
          product_id: string
          selected_options?: Json
          sku?: string | null
          taxable?: boolean
          title?: string | null
          tracks_inventory?: boolean
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string
          id?: string
          inventory_policy?: Database["public"]["Enums"]["inventory_policy"]
          inventory_quantity?: number
          position?: number
          price?: number | null
          price_on_request?: boolean
          product_id?: string
          selected_options?: Json
          sku?: string | null
          taxable?: boolean
          title?: string | null
          tracks_inventory?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          currency: string | null
          description: string | null
          description_html: string | null
          id: string
          name: string
          price: number | null
          price_on_request: boolean
          product_type: string | null
          published_at: string | null
          seo: Json | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["product_status"]
          tags: string[]
          updated_at: string
          vendor: string | null
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          description_html?: string | null
          id?: string
          name: string
          price?: number | null
          price_on_request?: boolean
          product_type?: string | null
          published_at?: string | null
          seo?: Json | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[]
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          description_html?: string | null
          id?: string
          name?: string
          price?: number | null
          price_on_request?: boolean
          product_type?: string | null
          published_at?: string | null
          seo?: Json | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["product_status"]
          tags?: string[]
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          role: Database["public"]["Enums"]["profile_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      customer_state: "invited" | "enabled" | "disabled" | "declined"
      inquiry_status: "new" | "in_progress" | "done"
      inventory_policy: "deny" | "continue"
      media_kind: "image" | "video" | "model"
      media_status: "uploaded" | "processing" | "ready" | "failed"
      metafield_owner_type:
        | "product"
        | "variant"
        | "collection"
        | "customer"
        | "order"
        | "post"
      product_status: "draft" | "active" | "archived" | "unlisted"
      profile_role: "admin" | "staff" | "customer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      customer_state: ["invited", "enabled", "disabled", "declined"],
      inquiry_status: ["new", "in_progress", "done"],
      inventory_policy: ["deny", "continue"],
      media_kind: ["image", "video", "model"],
      media_status: ["uploaded", "processing", "ready", "failed"],
      metafield_owner_type: [
        "product",
        "variant",
        "collection",
        "customer",
        "order",
        "post",
      ],
      product_status: ["draft", "active", "archived", "unlisted"],
      profile_role: ["admin", "staff", "customer"],
    },
  },
} as const

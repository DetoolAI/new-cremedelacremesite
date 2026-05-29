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
      appointments_history: {
        Row: {
          address: string | null
          appointment_date: string | null
          appointment_time: string | null
          booked_on: string | null
          booked_via: string | null
          booking_id: string | null
          cellphone: string | null
          city: string | null
          comments: string | null
          cost: number | null
          country: string | null
          country_code: string | null
          created_at: string
          customer_name: string | null
          email: string | null
          id: string
          label: string | null
          phone: string | null
          service: string | null
          source: string | null
          state: string | null
          status: string | null
          team_member: string | null
          whatsapp: string | null
          zipcode: string | null
        }
        Insert: {
          address?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          booked_on?: string | null
          booked_via?: string | null
          booking_id?: string | null
          cellphone?: string | null
          city?: string | null
          comments?: string | null
          cost?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          customer_name?: string | null
          email?: string | null
          id?: string
          label?: string | null
          phone?: string | null
          service?: string | null
          source?: string | null
          state?: string | null
          status?: string | null
          team_member?: string | null
          whatsapp?: string | null
          zipcode?: string | null
        }
        Update: {
          address?: string | null
          appointment_date?: string | null
          appointment_time?: string | null
          booked_on?: string | null
          booked_via?: string | null
          booking_id?: string | null
          cellphone?: string | null
          city?: string | null
          comments?: string | null
          cost?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          customer_name?: string | null
          email?: string | null
          id?: string
          label?: string | null
          phone?: string | null
          service?: string | null
          source?: string | null
          state?: string | null
          status?: string | null
          team_member?: string | null
          whatsapp?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          customer_email: string
          customer_first_name: string
          customer_id: string | null
          customer_last_name: string
          customer_phone: string
          customer_type: string
          deposit_amount_cents: number | null
          deposit_paid: boolean
          duration_minutes: number | null
          id: string
          is_member: boolean
          notes: string | null
          service_category: string | null
          service_id: string | null
          service_name: string
          square_booking_id: string | null
          square_payment_id: string | null
          square_sync_error: string | null
          square_team_member_id: string | null
          staff_id: string | null
          staff_name: string
          status: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          customer_email: string
          customer_first_name: string
          customer_id?: string | null
          customer_last_name: string
          customer_phone: string
          customer_type?: string
          deposit_amount_cents?: number | null
          deposit_paid?: boolean
          duration_minutes?: number | null
          id?: string
          is_member?: boolean
          notes?: string | null
          service_category?: string | null
          service_id?: string | null
          service_name: string
          square_booking_id?: string | null
          square_payment_id?: string | null
          square_sync_error?: string | null
          square_team_member_id?: string | null
          staff_id?: string | null
          staff_name?: string
          status?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          customer_email?: string
          customer_first_name?: string
          customer_id?: string | null
          customer_last_name?: string
          customer_phone?: string
          customer_type?: string
          deposit_amount_cents?: number | null
          deposit_paid?: boolean
          duration_minutes?: number | null
          id?: string
          is_member?: boolean
          notes?: string | null
          service_category?: string | null
          service_id?: string | null
          service_name?: string
          square_booking_id?: string | null
          square_payment_id?: string | null
          square_sync_error?: string | null
          square_team_member_id?: string | null
          staff_id?: string | null
          staff_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_lifetime_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string
          preferred_date: string | null
          preferred_time: string | null
          service: string
          staff_name: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone: string
          preferred_date?: string | null
          preferred_time?: string | null
          service: string
          staff_name?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string
          preferred_date?: string | null
          preferred_time?: string | null
          service?: string
          staff_name?: string | null
          status?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          cellphone: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          source: string | null
          state: string | null
          whatsapp: string | null
          zipcode: string | null
        }
        Insert: {
          address?: string | null
          cellphone?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string | null
          state?: string | null
          whatsapp?: string | null
          zipcode?: string | null
        }
        Update: {
          address?: string | null
          cellphone?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          source?: string | null
          state?: string | null
          whatsapp?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          phone: string | null
          signup_type: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          signup_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          signup_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_accounts: {
        Row: {
          created_at: string
          customer_name: string | null
          email: string
          id: string
          lifetime_earned: number
          lifetime_redeemed: number
          phone: string | null
          points_balance: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          email: string
          id?: string
          lifetime_earned?: number
          lifetime_redeemed?: number
          phone?: string | null
          points_balance?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          email?: string
          id?: string
          lifetime_earned?: number
          lifetime_redeemed?: number
          phone?: string | null
          points_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          discount_amount_cents: number | null
          display_order: number
          id: string
          name: string
          points_required: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          discount_amount_cents?: number | null
          display_order?: number
          id?: string
          name: string
          points_required: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          discount_amount_cents?: number | null
          display_order?: number
          id?: string
          name?: string
          points_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          account_id: string
          booking_id: string | null
          created_at: string
          id: string
          points: number
          reason: string | null
          type: string
        }
        Insert: {
          account_id: string
          booking_id?: string | null
          created_at?: string
          id?: string
          points: number
          reason?: string | null
          type: string
        }
        Update: {
          account_id?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          points?: number
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_redemptions: {
        Row: {
          benefit_label: string
          created_at: string
          email_sent_at: string | null
          id: string
          membership_id: string
          notes: string | null
          redeemed_at: string
          redeemed_by: string | null
          redeemed_by_name: string | null
          variant_name: string | null
        }
        Insert: {
          benefit_label: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          membership_id: string
          notes?: string | null
          redeemed_at?: string
          redeemed_by?: string | null
          redeemed_by_name?: string | null
          variant_name?: string | null
        }
        Update: {
          benefit_label?: string
          created_at?: string
          email_sent_at?: string | null
          id?: string
          membership_id?: string
          notes?: string | null
          redeemed_at?: string
          redeemed_by?: string | null
          redeemed_by_name?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_redemptions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          billing_state: string | null
          cancelled_at: string | null
          created_at: string
          customer_email: string
          customer_first_name: string
          customer_initials: string | null
          customer_last_name: string
          customer_phone: string
          enrolled_at: string
          id: string
          monthly_price_cents: number
          notes: string | null
          photo_url: string | null
          signature_data_url: string | null
          signed_at: string | null
          square_card_id: string | null
          square_customer_id: string | null
          square_plan_variation_id: string | null
          square_subscription_id: string | null
          status: string
          tier_name: string
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_email: string
          customer_first_name: string
          customer_initials?: string | null
          customer_last_name: string
          customer_phone: string
          enrolled_at?: string
          id?: string
          monthly_price_cents: number
          notes?: string | null
          photo_url?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          square_card_id?: string | null
          square_customer_id?: string | null
          square_plan_variation_id?: string | null
          square_subscription_id?: string | null
          status?: string
          tier_name: string
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_email?: string
          customer_first_name?: string
          customer_initials?: string | null
          customer_last_name?: string
          customer_phone?: string
          enrolled_at?: string
          id?: string
          monthly_price_cents?: number
          notes?: string | null
          photo_url?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          square_card_id?: string | null
          square_customer_id?: string | null
          square_plan_variation_id?: string | null
          square_subscription_id?: string | null
          status?: string
          tier_name?: string
        }
        Relationships: []
      }
      page_content: {
        Row: {
          display_order: number
          id: string
          page_slug: string
          section_key: string
          updated_at: string
          value: Json
          visible: boolean
        }
        Insert: {
          display_order?: number
          id?: string
          page_slug: string
          section_key: string
          updated_at?: string
          value?: Json
          visible?: boolean
        }
        Update: {
          display_order?: number
          id?: string
          page_slug?: string
          section_key?: string
          updated_at?: string
          value?: Json
          visible?: boolean
        }
        Relationships: []
      }
      payments_history: {
        Row: {
          amount: number | null
          appt_type: string | null
          booking_id: string | null
          created_at: string
          customer: string | null
          gateway: string | null
          id: string
          mode: string | null
          payment_at: string | null
          service: string | null
          service_at: string | null
          source: string | null
          status: string | null
          team_member: string | null
          transaction_id: string | null
          type: string | null
        }
        Insert: {
          amount?: number | null
          appt_type?: string | null
          booking_id?: string | null
          created_at?: string
          customer?: string | null
          gateway?: string | null
          id?: string
          mode?: string | null
          payment_at?: string | null
          service?: string | null
          service_at?: string | null
          source?: string | null
          status?: string | null
          team_member?: string | null
          transaction_id?: string | null
          type?: string | null
        }
        Update: {
          amount?: number | null
          appt_type?: string | null
          booking_id?: string | null
          created_at?: string
          customer?: string | null
          gateway?: string | null
          id?: string
          mode?: string | null
          payment_at?: string | null
          service?: string | null
          service_at?: string | null
          source?: string | null
          status?: string | null
          team_member?: string | null
          transaction_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      service_staff: {
        Row: {
          created_at: string
          id: string
          service_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_staff_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_staff_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          duration_minutes: number
          id: string
          member_price_text: string | null
          min_lead_minutes: number
          name: string
          price_text: string | null
          square_item_id: string | null
          square_variation_id: string | null
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          id?: string
          member_price_text?: string | null
          min_lead_minutes?: number
          name: string
          price_text?: string | null
          square_item_id?: string | null
          square_variation_id?: string | null
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          id?: string
          member_price_text?: string | null
          min_lead_minutes?: number
          name?: string
          price_text?: string | null
          square_item_id?: string | null
          square_variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          name: string
          pin: string | null
          square_team_member_id: string | null
          work_days: number[]
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name: string
          pin?: string | null
          square_team_member_id?: string | null
          work_days?: number[]
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          pin?: string | null
          square_team_member_id?: string | null
          work_days?: number[]
        }
        Relationships: []
      }
      staff_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          staff_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          staff_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          staff_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedule_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_off: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          off_date: string
          reason: string | null
          staff_id: string
          start_time: string | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          off_date: string
          reason?: string | null
          staff_id: string
          start_time?: string | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          off_date?: string
          reason?: string | null
          staff_id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      customer_lifetime_stats: {
        Row: {
          customer_id: string | null
          email: string | null
          last_visit: string | null
          name: string | null
          phone: string | null
          total_spent: number | null
          visit_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff"
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
      app_role: ["admin", "user", "staff"],
    },
  },
} as const

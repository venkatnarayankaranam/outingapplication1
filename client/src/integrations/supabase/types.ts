export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      notifications: {
        Row: {
          id: string
          message: string
          phone_number: string
          request_id: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          id?: string
          message: string
          phone_number: string
          request_id?: string | null
          sent_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          id?: string
          message?: string
          phone_number?: string
          request_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "outing_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      outing_requests: {
        Row: {
          created_at: string | null
          floor_incharge_approval: Json | null
          hostel_incharge_approval: Json | null
          id: string
          out_scan_timestamp: string | null
          outing_date: string
          outing_time: string
          purpose: string
          return_date: string
          return_scan_timestamp: string | null
          return_time: string
          status: Database["public"]["Enums"]["request_status"] | null
          student_id: string | null
          updated_at: string | null
          warden_approval: Json | null
        }
        Insert: {
          created_at?: string | null
          floor_incharge_approval?: Json | null
          hostel_incharge_approval?: Json | null
          id?: string
          out_scan_timestamp?: string | null
          outing_date: string
          outing_time: string
          purpose: string
          return_date: string
          return_scan_timestamp?: string | null
          return_time: string
          status?: Database["public"]["Enums"]["request_status"] | null
          student_id?: string | null
          updated_at?: string | null
          warden_approval?: Json | null
        }
        Update: {
          created_at?: string | null
          floor_incharge_approval?: Json | null
          hostel_incharge_approval?: Json | null
          id?: string
          out_scan_timestamp?: string | null
          outing_date?: string
          outing_time?: string
          purpose?: string
          return_date?: string
          return_scan_timestamp?: string | null
          return_time?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          student_id?: string | null
          updated_at?: string | null
          warden_approval?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "outing_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          roll_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          roll_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          roll_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          hostel_block: Database["public"]["Enums"]["hostel_block"] | null
          id: string
          name: string
          parent_phone_number: string | null
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          roll_number: string | null
          room_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          hostel_block?: Database["public"]["Enums"]["hostel_block"] | null
          id?: string
          name: string
          parent_phone_number?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          roll_number?: string | null
          room_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          hostel_block?: Database["public"]["Enums"]["hostel_block"] | null
          id?: string
          name?: string
          parent_phone_number?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          roll_number?: string | null
          room_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      hostel_block: "d-block" | "e-block" | "womens"
      request_status:
        | "pending"
        | "floor-approved"
        | "hostel-approved"
        | "approved"
        | "denied"
        | "completed"
      user_role:
        | "student"
        | "floor-incharge"
        | "hostel-incharge"
        | "warden"
        | "gate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

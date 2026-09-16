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
      exam_papers: {
        Row: {
          content_hash: string | null
          created_at: string
          id: string
          is_current: boolean
          metadata: Json
          source_file: string | null
          source_id: string
          title: string
          updated_at: string
          version: number
          year: number
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          metadata?: Json
          source_file?: string | null
          source_id: string
          title: string
          updated_at?: string
          version?: number
          year: number
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          metadata?: Json
          source_file?: string | null
          source_id?: string
          title?: string
          updated_at?: string
          version?: number
          year?: number
        }
        Relationships: []
      }
      exam_sections: {
        Row: {
          created_at: string
          extra_data: Json
          id: string
          intro: string | null
          minutes: number | null
          paper_id: string
          passage: string | null
          passage_zh: string | null
          prompt: string | null
          score: number | null
          sort_order: number
          source_data: Json
          source_id: string
          tips: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          extra_data?: Json
          id?: string
          intro?: string | null
          minutes?: number | null
          paper_id: string
          passage?: string | null
          passage_zh?: string | null
          prompt?: string | null
          score?: number | null
          sort_order?: number
          source_data?: Json
          source_id: string
          tips?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          extra_data?: Json
          id?: string
          intro?: string | null
          minutes?: number | null
          paper_id?: string
          passage?: string | null
          passage_zh?: string | null
          prompt?: string | null
          score?: number | null
          sort_order?: number
          source_data?: Json
          source_id?: string
          tips?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sections_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "exam_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      item_options: {
        Row: {
          content: string
          created_at: string
          id: string
          item_id: string
          option_index: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          item_id: string
          option_index: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          item_id?: string
          option_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_options_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "section_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mistake_reviews: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          mistake_id: string
          reviewed_at: string
          score: number | null
          selected_option: number | null
          text_answer: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          mistake_id: string
          reviewed_at?: string
          score?: number | null
          selected_option?: number | null
          text_answer?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          mistake_id?: string
          reviewed_at?: string
          score?: number | null
          selected_option?: number | null
          text_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_reviews_mistake_id_fkey"
            columns: ["mistake_id"]
            isOneToOne: false
            referencedRelation: "mistakes"
            referencedColumns: ["id"]
          },
        ]
      }
      mistakes: {
        Row: {
          consecutive_correct: number
          created_at: string
          first_wrong_at: string
          id: string
          item_id: string
          last_wrong_at: string
          mastered_at: string | null
          removed_at: string | null
          review_count: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consecutive_correct?: number
          created_at?: string
          first_wrong_at?: string
          id?: string
          item_id: string
          last_wrong_at?: string
          mastered_at?: string | null
          removed_at?: string | null
          review_count?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consecutive_correct?: number
          created_at?: string
          first_wrong_at?: string
          id?: string
          item_id?: string
          last_wrong_at?: string
          mastered_at?: string | null
          removed_at?: string | null
          review_count?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistakes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "section_items"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_answers: {
        Row: {
          answered_at: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          item_id: string
          score: number | null
          selected_option: number | null
          session_id: string
          text_answer: string | null
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          item_id: string
          score?: number | null
          selected_option?: number | null
          session_id: string
          text_answer?: string | null
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          item_id?: string
          score?: number | null
          selected_option?: number | null
          session_id?: string
          text_answer?: string | null
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "section_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_item_no: number
          elapsed_seconds: number
          id: string
          paper_id: string | null
          paused_at: string | null
          section_id: string | null
          session_type: string
          started_at: string
          status: string
          time_limit_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_item_no?: number
          elapsed_seconds?: number
          id?: string
          paper_id?: string | null
          paused_at?: string | null
          section_id?: string | null
          session_type: string
          started_at?: string
          status?: string
          time_limit_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_item_no?: number
          elapsed_seconds?: number
          id?: string
          paper_id?: string | null
          paused_at?: string | null
          section_id?: string | null
          session_type?: string
          started_at?: string
          status?: string
          time_limit_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "exam_papers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      section_items: {
        Row: {
          content: string | null
          correct_option: number | null
          created_at: string
          explanation: string | null
          extra_data: Json
          id: string
          item_no: number
          item_type: string
          section_id: string
          source_id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          correct_option?: number | null
          created_at?: string
          explanation?: string | null
          extra_data?: Json
          id?: string
          item_no: number
          item_type: string
          section_id: string
          source_id: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          correct_option?: number | null
          created_at?: string
          explanation?: string | null
          extra_data?: Json
          id?: string
          item_no?: number
          item_type?: string
          section_id?: string
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      /**
       * Phase 6 Goal 6.1：判分 RPC（方案 A，见 docs/development/decisions.md）。
       *
       * 签名取自真实线上 schema（`supabase gen types --project-id <ref>`，2026-09-16）。
       * ⚠️ 唯一与生成器输出不同的地方是可空性：生成器对 `RETURNS TABLE` 不推导
       * nullability，一律标为非空；但本函数对主观题（翻译 / 写作）会返回
       * `is_correct = null` / `correct_option = null`，非翻译题的 `reference_translation`
       * 也是 null。因此这里显式加 `| null`，避免出现「类型上说有值、运行时是 null」。
       */
      grade_practice_section: {
        Args: { p_session_id: string }
        Returns: {
          correct_option: number | null
          explanation: string | null
          is_correct: boolean | null
          item_id: string
          item_no: number
          item_type: string
          reference_translation: string | null
          /** 用户自己的选择；未作答的题不会出现在本结果中，故这里通常非 null，仍按可空处理 */
          selected_option: number | null
        }[]
      }
      sync_exam_paper: {
        Args: {
          p_content_hash: string
          p_source_file: string
          p_source_id: string
          p_source_json: Json
          p_title: string
          p_year: number
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

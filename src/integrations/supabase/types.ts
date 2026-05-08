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
      active_boosts: {
        Row: {
          boost_key: string
          created_at: string
          expires_at: string
          id: string
          multiplier: number
          user_id: string
        }
        Insert: {
          boost_key: string
          created_at?: string
          expires_at: string
          id?: string
          multiplier?: number
          user_id: string
        }
        Update: {
          boost_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          multiplier?: number
          user_id?: string
        }
        Relationships: []
      }
      cosmetics_owned: {
        Row: {
          acquired_at: string
          id: string
          item_key: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_key: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          item_key?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      guild_members: {
        Row: {
          guild_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          guild_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          guild_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guild_members_guild_id_fkey"
            columns: ["guild_id"]
            isOneToOne: false
            referencedRelation: "guilds"
            referencedColumns: ["id"]
          },
        ]
      }
      guilds: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      inbox_notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: string
          note_id: string | null
          payload: Json
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind: string
          note_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: []
      }
      news_claims: {
        Row: {
          claimed_at: string
          coins_awarded: number
          id: string
          tokens_awarded: number
          user_id: string
          version: string
          xp_awarded: number
        }
        Insert: {
          claimed_at?: string
          coins_awarded?: number
          id?: string
          tokens_awarded?: number
          user_id: string
          version: string
          xp_awarded?: number
        }
        Update: {
          claimed_at?: string
          coins_awarded?: number
          id?: string
          tokens_awarded?: number
          user_id?: string
          version?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      note_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          note_id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note_id: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "note_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      note_favorites: {
        Row: {
          created_at: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: []
      }
      note_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_reactions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_votes: {
        Row: {
          created_at: string
          id: string
          kind: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_votes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          color?: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          x?: number
          y?: number
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_history: {
        Row: {
          coins_awarded: number
          completed_at: string
          fire_level: number
          id: string
          multiplier: number
          quest_key: string
          tokens_awarded: number
          user_id: string
        }
        Insert: {
          coins_awarded: number
          completed_at?: string
          fire_level: number
          id?: string
          multiplier?: number
          quest_key: string
          tokens_awarded: number
          user_id: string
        }
        Update: {
          coins_awarded?: number
          completed_at?: string
          fire_level?: number
          id?: string
          multiplier?: number
          quest_key?: string
          tokens_awarded?: number
          user_id?: string
        }
        Relationships: []
      }
      quest_ladder: {
        Row: {
          assigned_at: string
          baseline: number
          coin_reward: number
          description: string
          fire_level: number
          id: string
          progress: number
          quest_key: string
          slot: number
          target: number
          title: string
          token_reward: number
          user_id: string
        }
        Insert: {
          assigned_at?: string
          baseline?: number
          coin_reward: number
          description: string
          fire_level: number
          id?: string
          progress?: number
          quest_key: string
          slot: number
          target: number
          title: string
          token_reward: number
          user_id: string
        }
        Update: {
          assigned_at?: string
          baseline?: number
          coin_reward?: number
          description?: string
          fire_level?: number
          id?: string
          progress?: number
          quest_key?: string
          slot?: number
          target?: number
          title?: string
          token_reward?: number
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          note_id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_catalog: {
        Row: {
          accent: string
          category: string
          coins: number
          created_at: string
          description: string
          item_key: string
          label: string
          meta: Json
          rarity: string
          tokens: number
          type: string
        }
        Insert: {
          accent?: string
          category: string
          coins?: number
          created_at?: string
          description?: string
          item_key: string
          label: string
          meta?: Json
          rarity?: string
          tokens?: number
          type: string
        }
        Update: {
          accent?: string
          category?: string
          coins?: number
          created_at?: string
          description?: string
          item_key?: string
          label?: string
          meta?: Json
          rarity?: string
          tokens?: number
          type?: string
        }
        Relationships: []
      }
      shop_rotation_history: {
        Row: {
          bucket: number
          created_at: string
          item_keys: string[]
        }
        Insert: {
          bucket: number
          created_at?: string
          item_keys: string[]
        }
        Update: {
          bucket?: number
          created_at?: string
          item_keys?: string[]
        }
        Relationships: []
      }
      sticker_battle_votes: {
        Row: {
          battle_id: string
          choice: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          battle_id: string
          choice: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          battle_id?: string
          choice?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticker_battle_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "sticker_battles"
            referencedColumns: ["id"]
          },
        ]
      }
      sticker_battles: {
        Row: {
          battle_date: string
          created_at: string
          emoji_a: string
          emoji_b: string
          ends_at: string
          id: string
        }
        Insert: {
          battle_date: string
          created_at?: string
          emoji_a: string
          emoji_b: string
          ends_at: string
          id?: string
        }
        Update: {
          battle_date?: string
          created_at?: string
          emoji_a?: string
          emoji_b?: string
          ends_at?: string
          id?: string
        }
        Relationships: []
      }
      user_currency: {
        Row: {
          best_streak: number
          coins: number
          created_at: string
          heat_streak: number
          highest_fire_cleared: number
          last_quest_completed_at: string | null
          tokens: number
          total_quests_done: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          coins?: number
          created_at?: string
          heat_streak?: number
          highest_fire_cleared?: number
          last_quest_completed_at?: string | null
          tokens?: number
          total_quests_done?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          coins?: number
          created_at?: string
          heat_streak?: number
          highest_fire_cleared?: number
          last_quest_completed_at?: string | null
          tokens?: number
          total_quests_done?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_key: string
          bio: string
          created_at: string
          equipped_badge: string | null
          equipped_font: string | null
          equipped_frame: string | null
          equipped_fx: string | null
          equipped_title: string | null
          favorite_color: string | null
          favorite_colors: string[]
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_key?: string
          bio?: string
          created_at?: string
          equipped_badge?: string | null
          equipped_font?: string | null
          equipped_frame?: string | null
          equipped_fx?: string | null
          equipped_title?: string | null
          favorite_color?: string | null
          favorite_colors?: string[]
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_key?: string
          bio?: string
          created_at?: string
          equipped_badge?: string | null
          equipped_font?: string | null
          equipped_frame?: string | null
          equipped_fx?: string | null
          equipped_title?: string | null
          favorite_color?: string | null
          favorite_colors?: string[]
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          bonus_note_slots: number
          created_at: string
          last_login_date: string | null
          level: number
          streak_days: number
          tasks_completed: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          bonus_note_slots?: number
          created_at?: string
          last_login_date?: string | null
          level?: number
          streak_days?: number
          tasks_completed?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          bonus_note_slots?: number
          created_at?: string
          last_login_date?: string | null
          level?: number
          streak_days?: number
          tasks_completed?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          is_banned: boolean
          nickname: string
          warnings: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_banned?: boolean
          nickname: string
          warnings?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_banned?: boolean
          nickname?: string
          warnings?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: { Args: { _uid: string; _xp: number }; Returns: undefined }
      calc_level: { Args: { _xp: number }; Returns: number }
      claim_news_reward: {
        Args: { _version: string }
        Returns: {
          coins: number
          message: string
          success: boolean
          tokens: number
          xp: number
        }[]
      }
      complete_quest: {
        Args: { _quest_id: string }
        Returns: {
          awarded: boolean
          coins_awarded: number
          heat_streak: number
          highest_fire: number
          multiplier: number
          new_quest_coins: number
          new_quest_desc: string
          new_quest_fire: number
          new_quest_id: string
          new_quest_key: string
          new_quest_slot: number
          new_quest_target: number
          new_quest_title: string
          new_quest_tokens: number
          tokens_awarded: number
          total_coins: number
          total_tokens: number
        }[]
      }
      create_guild: {
        Args: { _color: string; _description: string; _name: string }
        Returns: {
          guild_id: string
          message: string
          success: boolean
        }[]
      }
      equip_cosmetic: {
        Args: { _item_key: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      get_daily_event: {
        Args: never
        Returns: {
          description: string
          event_date: string
          kind: string
          target: number
          title: string
        }[]
      }
      get_daily_event_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_key: string
          nickname: string
          rank: number
          score: number
          user_id: string
        }[]
      }
      get_guild_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          color: string
          guild_id: string
          member_count: number
          name: string
          rank: number
          total_xp: number
        }[]
      }
      get_guild_members: {
        Args: { _guild_id: string }
        Returns: {
          avatar_key: string
          joined_at: string
          nickname: string
          role: string
          user_id: string
          xp: number
        }[]
      }
      get_level_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_key: string
          equipped_title: string
          level: number
          nickname: string
          rank: number
          user_id: string
          xp: number
        }[]
      }
      get_my_guild: {
        Args: never
        Returns: {
          color: string
          description: string
          guild_id: string
          member_count: number
          name: string
          role: string
          total_xp: number
        }[]
      }
      get_my_news_claims: {
        Args: never
        Returns: {
          claimed_at: string
          coins_awarded: number
          tokens_awarded: number
          version: string
          xp_awarded: number
        }[]
      }
      get_my_wallet: {
        Args: never
        Returns: {
          active_boost_expires_at: string
          active_boost_key: string
          best_streak: number
          coins: number
          current_multiplier: number
          heat_streak: number
          highest_fire_cleared: number
          tokens: number
          total_quests_done: number
        }[]
      }
      get_nicknames: {
        Args: { ids: string[] }
        Returns: {
          id: string
          nickname: string
        }[]
      }
      get_or_seed_quest_ladder: {
        Args: never
        Returns: {
          coin_reward: number
          description: string
          fire_level: number
          id: string
          progress: number
          quest_key: string
          slot: number
          target: number
          title: string
          token_reward: number
        }[]
      }
      get_public_profile: {
        Args: { target_id: string }
        Returns: {
          avatar_key: string
          bio: string
          equipped_badge: string
          equipped_title: string
          follower_count: number
          following_count: number
          is_banned: boolean
          joined_at: string
          nickname: string
          notes_count: number
          reports_made: number
          theme: string
          user_id: string
          warnings: number
        }[]
      }
      get_shop_rotation: {
        Args: never
        Returns: {
          accent: string
          category: string
          coins: number
          description: string
          item_key: string
          label: string
          meta: Json
          rarity: string
          rotates_at: string
          tokens: number
          type: string
        }[]
      }
      get_today_battle: {
        Args: never
        Returns: {
          emoji_a: string
          emoji_b: string
          ends_at: string
          id: string
          my_choice: string
          votes_a: number
          votes_b: number
        }[]
      }
      get_top_notes: {
        Args: { _limit?: number; _period?: string }
        Returns: {
          author_id: string
          avatar_key: string
          color: string
          comment_count: number
          content: string
          created_at: string
          like_count: number
          nickname: string
          note_id: string
          x: number
          y: number
        }[]
      }
      get_wall_street_rankings: {
        Args: { _limit?: number }
        Returns: {
          avatar_key: string
          coins: number
          heat_streak: number
          highest_fire_cleared: number
          nickname: string
          rank: number
          tokens: number
          total_quests_done: number
          user_id: string
        }[]
      }
      join_guild: {
        Args: { _guild_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      leave_guild: {
        Args: never
        Returns: {
          message: string
          success: boolean
        }[]
      }
      persist_rotation: { Args: never; Returns: undefined }
      purchase_market_item: {
        Args: { _item_key: string }
        Returns: {
          coins: number
          message: string
          success: boolean
          tokens: number
        }[]
      }
      quest_progress_for: {
        Args: { _baseline: number; _quest_key: string; _uid: string }
        Returns: number
      }
      roll_quest: { Args: { _uid: string }; Returns: Json }
      roll_quest_at_fire: {
        Args: { _fire: number; _uid: string }
        Returns: Json
      }
      search_users: {
        Args: { _limit?: number; _query: string }
        Returns: {
          avatar_key: string
          equipped_title: string
          nickname: string
          user_id: string
        }[]
      }
      test_function: { Args: never; Returns: undefined }
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
    Enums: {},
  },
} as const

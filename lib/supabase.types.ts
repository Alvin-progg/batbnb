export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      auth_login_attempts: {
        Row: {
          attempt_count: number;
          blocked_until: string | null;
          email: string;
          first_attempt_at: string;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          blocked_until?: string | null;
          email: string;
          first_attempt_at?: string;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          blocked_until?: string | null;
          email?: string;
          first_attempt_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          role: Database["public"]["Enums"]["chat_role"];
          sender_id: string | null;
          thread_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          role?: Database["public"]["Enums"]["chat_role"];
          sender_id?: string | null;
          thread_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          role?: Database["public"]["Enums"]["chat_role"];
          sender_id?: string | null;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "chat_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_threads: {
        Row: {
          created_at: string;
          id: string;
          listing_id: string;
          owner_id: string;
          renter_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          listing_id: string;
          owner_id: string;
          renter_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          listing_id?: string;
          owner_id?: string;
          renter_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_threads_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_threads_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_threads_renter_id_fkey";
            columns: ["renter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_images: {
        Row: {
          created_at: string;
          id: string;
          image_url: string;
          listing_id: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          image_url: string;
          listing_id: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          image_url?: string;
          listing_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listing_reviews: {
        Row: {
          author_id: string | null;
          author_label: string;
          created_at: string;
          id: string;
          listing_id: string;
          review_text: string;
        };
        Insert: {
          author_id?: string | null;
          author_label: string;
          created_at?: string;
          id?: string;
          listing_id: string;
          review_text: string;
        };
        Update: {
          author_id?: string | null;
          author_label?: string;
          created_at?: string;
          id?: string;
          listing_id?: string;
          review_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listing_reviews_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listing_reviews_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
        ];
      };
      listings: {
        Row: {
          created_at: string;
          id: string;
          latitude: number;
          location: string;
          longitude: number;
          meta: string | null;
          monthly_rent: number;
          owner_id: string | null;
          slug: string;
          status: Database["public"]["Enums"]["listing_status"];
          subtitle: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          latitude: number;
          location: string;
          longitude: number;
          meta?: string | null;
          monthly_rent: number;
          owner_id?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["listing_status"];
          subtitle?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          latitude?: number;
          location?: string;
          longitude?: number;
          meta?: string | null;
          monthly_rent?: number;
          owner_id?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["listing_status"];
          subtitle?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_listings: {
        Row: {
          created_at: string;
          listing_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          listing_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          listing_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          is_owner: boolean;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          is_owner?: boolean;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          is_owner?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_login_rate_limit: {
        Args: {
          p_email: string;
        };
        Returns: {
          allowed: boolean;
          attempts_left: number;
          retry_after_seconds: number;
        }[];
      };
      record_login_attempt: {
        Args: {
          p_email: string;
          p_success: boolean;
        };
        Returns: undefined;
      };
    };
    Enums: {
      chat_role: "renter" | "owner" | "system";
      listing_status: "draft" | "active" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Row"];

export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Insert"];

export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Update"];

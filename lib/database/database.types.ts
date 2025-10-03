export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.12 (cd3cf9e)'
  }
  public: {
    Tables: {
      go4me_nfts: {
        Row: {
          badge: string | null
          collection_id: string | null
          created_at: string
          data_uri: string | null
          description: string | null
          edition_number: number | null
          metadata_uri: string | null
          name: string | null
          nft_id: string
          nft_jsonb: Json | null
          owner_did_address: string | null
          owner_xch_address: string | null
          special_event: string | null
          updated_at: string | null
          x_users_username: string | null
        }
        Insert: {
          badge?: string | null
          collection_id?: string | null
          created_at?: string
          data_uri?: string | null
          description?: string | null
          edition_number?: number | null
          metadata_uri?: string | null
          name?: string | null
          nft_id: string
          nft_jsonb?: Json | null
          owner_did_address?: string | null
          owner_xch_address?: string | null
          special_event?: string | null
          updated_at?: string | null
          x_users_username?: string | null
        }
        Update: {
          badge?: string | null
          collection_id?: string | null
          created_at?: string
          data_uri?: string | null
          description?: string | null
          edition_number?: number | null
          metadata_uri?: string | null
          name?: string | null
          nft_id?: string
          nft_jsonb?: Json | null
          owner_did_address?: string | null
          owner_xch_address?: string | null
          special_event?: string | null
          updated_at?: string | null
          x_users_username?: string | null
        }
        Relationships: []
      }
      go4snapps: {
        Row: {
          author_id: string | null
          created_at: string
          description: string | null
          go4snapp_id: string
          ipfs_cid: string | null
          ipfs_cid_updated_at: string | null
          last_edition_number: number | null
          last_offer_created_at: string | null
          last_offer_id: string | null
          processing_error: string | null
          processing_started_at: string | null
          replied_to_post_at: string | null
          title: string | null
          total_auction_offer_count: number | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          description?: string | null
          go4snapp_id: string
          ipfs_cid?: string | null
          ipfs_cid_updated_at?: string | null
          last_edition_number?: number | null
          last_offer_created_at?: string | null
          last_offer_id?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          replied_to_post_at?: string | null
          title?: string | null
          total_auction_offer_count?: number | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          description?: string | null
          go4snapp_id?: string
          ipfs_cid?: string | null
          ipfs_cid_updated_at?: string | null
          last_edition_number?: number | null
          last_offer_created_at?: string | null
          last_offer_id?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          replied_to_post_at?: string | null
          title?: string | null
          total_auction_offer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_leaderboard'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_nfts_processing_now'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_nonwelcomed_users'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_ungenerated_go4snapps'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_ungenerated_nfts'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_ungenerated_pfps'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_unminted_go4snapps'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_unprocessed_commands'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_user_page_info'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_user_page_other_owners'
            referencedColumns: ['pfp_author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_user_page_owned_pfps'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_x_users_to_update'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'x_users'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'get_unprocessed_commands'
            referencedColumns: ['mentioned_post_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'get_unprocessed_mentions'
            referencedColumns: ['mentioned_post_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'x_mentions'
            referencedColumns: ['mentioned_post_id']
          },
        ]
      }
      offer_file_assets: {
        Row: {
          amount: number
          asset_id: string
          created_at: string
          offer_id: string
          type: string
        }
        Insert: {
          amount: number
          asset_id: string
          created_at?: string
          offer_id: string
          type: string
        }
        Update: {
          amount?: number
          asset_id?: string
          created_at?: string
          offer_id?: string
          type?: string
        }
        Relationships: []
      }
      offer_files: {
        Row: {
          collected_at: string | null
          completed_at: string | null
          created_at: string
          offer_id: string
          offer_jsonb: Json | null
          series_number: number | null
          status: number | null
          time_to_sell: number | null
          x_users_author_id: string | null
          x_users_username: string | null
          xch_requested_amount: number | null
        }
        Insert: {
          collected_at?: string | null
          completed_at?: string | null
          created_at?: string
          offer_id: string
          offer_jsonb?: Json | null
          series_number?: number | null
          status?: number | null
          time_to_sell?: number | null
          x_users_author_id?: string | null
          x_users_username?: string | null
          xch_requested_amount?: number | null
        }
        Update: {
          collected_at?: string | null
          completed_at?: string | null
          created_at?: string
          offer_id?: string
          offer_jsonb?: Json | null
          series_number?: number | null
          status?: number | null
          time_to_sell?: number | null
          x_users_author_id?: string | null
          x_users_username?: string | null
          xch_requested_amount?: number | null
        }
        Relationships: []
      }
      x_mentions: {
        Row: {
          command_request_jsonb: Json | null
          command_request_processed_at: string | null
          go4snapp_requested_at: string | null
          mentioned_post_author_id: string | null
          mentioned_post_created_at: string | null
          mentioned_post_id: string
          mentioned_post_type: string | null
          processed_mention_at: string | null
          processed_mention_output: string | null
          processed_quote_tweet_at: string | null
          record_created_at: string
          referenced_post_id: string | null
          x_post_data: Json | null
        }
        Insert: {
          command_request_jsonb?: Json | null
          command_request_processed_at?: string | null
          go4snapp_requested_at?: string | null
          mentioned_post_author_id?: string | null
          mentioned_post_created_at?: string | null
          mentioned_post_id: string
          mentioned_post_type?: string | null
          processed_mention_at?: string | null
          processed_mention_output?: string | null
          processed_quote_tweet_at?: string | null
          record_created_at?: string
          referenced_post_id?: string | null
          x_post_data?: Json | null
        }
        Update: {
          command_request_jsonb?: Json | null
          command_request_processed_at?: string | null
          go4snapp_requested_at?: string | null
          mentioned_post_author_id?: string | null
          mentioned_post_created_at?: string | null
          mentioned_post_id?: string
          mentioned_post_type?: string | null
          processed_mention_at?: string | null
          processed_mention_output?: string | null
          processed_quote_tweet_at?: string | null
          record_created_at?: string
          referenced_post_id?: string | null
          x_post_data?: Json | null
        }
        Relationships: []
      }
      x_user_aliases: {
        Row: {
          author_id: string | null
          created_at: string
          username: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          username: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          username?: string
        }
        Relationships: []
      }
      x_users: {
        Row: {
          author_id: string
          description: string | null
          did_address: string | null
          did_address_updated_at: string | null
          ignored_on: string | null
          ignored_reason: string | null
          last_nft_series_number: number | null
          last_offer_created_at: string | null
          last_offer_expired_at: string | null
          last_offerid: string | null
          name: string | null
          nft_processing_started_at: string | null
          not_bot_giveaway_at: string | null
          pfp_ipfs_cid: string | null
          pfp_ipfs_cid_updated_at: string | null
          pfp_ipfs_username: string | null
          pfp_update_requested_at: string | null
          rank_copies_sold: number | null
          rank_fewest_copies_sold: number | null
          rank_last_sale: number | null
          rank_queue_position: number | null
          rank_total_badge_score: number | null
          rank_total_shadow_score: number | null
          rank_total_traded_value: number | null
          sent_welcome_post_at: string | null
          target_xch_address: string | null
          total_auction_offer_count: number | null
          total_badge_score: number | null
          total_shadow_score: number | null
          user_jsonb: Json | null
          user_jsonb_updated_at: string | null
          username: string
          x_profile_image_url: string | null
          xch_address: string | null
          xch_address_updated_at: string | null
        }
        Insert: {
          author_id: string
          description?: string | null
          did_address?: string | null
          did_address_updated_at?: string | null
          ignored_on?: string | null
          ignored_reason?: string | null
          last_nft_series_number?: number | null
          last_offer_created_at?: string | null
          last_offer_expired_at?: string | null
          last_offerid?: string | null
          name?: string | null
          nft_processing_started_at?: string | null
          not_bot_giveaway_at?: string | null
          pfp_ipfs_cid?: string | null
          pfp_ipfs_cid_updated_at?: string | null
          pfp_ipfs_username?: string | null
          pfp_update_requested_at?: string | null
          rank_copies_sold?: number | null
          rank_fewest_copies_sold?: number | null
          rank_last_sale?: number | null
          rank_queue_position?: number | null
          rank_total_badge_score?: number | null
          rank_total_shadow_score?: number | null
          rank_total_traded_value?: number | null
          sent_welcome_post_at?: string | null
          target_xch_address?: string | null
          total_auction_offer_count?: number | null
          total_badge_score?: number | null
          total_shadow_score?: number | null
          user_jsonb?: Json | null
          user_jsonb_updated_at?: string | null
          username: string
          x_profile_image_url?: string | null
          xch_address?: string | null
          xch_address_updated_at?: string | null
        }
        Update: {
          author_id?: string
          description?: string | null
          did_address?: string | null
          did_address_updated_at?: string | null
          ignored_on?: string | null
          ignored_reason?: string | null
          last_nft_series_number?: number | null
          last_offer_created_at?: string | null
          last_offer_expired_at?: string | null
          last_offerid?: string | null
          name?: string | null
          nft_processing_started_at?: string | null
          not_bot_giveaway_at?: string | null
          pfp_ipfs_cid?: string | null
          pfp_ipfs_cid_updated_at?: string | null
          pfp_ipfs_username?: string | null
          pfp_update_requested_at?: string | null
          rank_copies_sold?: number | null
          rank_fewest_copies_sold?: number | null
          rank_last_sale?: number | null
          rank_queue_position?: number | null
          rank_total_badge_score?: number | null
          rank_total_shadow_score?: number | null
          rank_total_traded_value?: number | null
          sent_welcome_post_at?: string | null
          target_xch_address?: string | null
          total_auction_offer_count?: number | null
          total_badge_score?: number | null
          total_shadow_score?: number | null
          user_jsonb?: Json | null
          user_jsonb_updated_at?: string | null
          username?: string
          x_profile_image_url?: string | null
          xch_address?: string | null
          xch_address_updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      get_airdrop_payments: {
        Row: {
          total_badge_score: number | null
          total_shadow_score: number | null
          xch_address: string | null
        }
        Relationships: []
      }
      get_last_stored_post_id: {
        Row: {
          mentioned_post_id: string | null
        }
        Relationships: []
      }
      get_last_updated_go4me_nft: {
        Row: {
          nft_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      get_leaderboard: {
        Row: {
          author_id: string | null
          last_offer_status: number | null
          last_offerid: string | null
          last_sale_at: string | null
          name: string | null
          pfp_ipfs_cid: string | null
          rank_copies_sold: number | null
          rank_fewest_copies_sold: number | null
          rank_last_sale: number | null
          rank_queue_position: number | null
          rank_total_badge_score: number | null
          rank_total_shadow_score: number | null
          rank_total_traded_value: number | null
          total_aftermarket_trades: number | null
          total_auction_offer_count: number | null
          total_badge_score: number | null
          total_shadow_score: number | null
          total_sold: number | null
          username: string | null
          xch_address: string | null
          xch_address_updated_at: string | null
          xch_average_sales_amount: number | null
          xch_total_sales_amount: number | null
        }
        Relationships: []
      }
      get_nfts_processing_now: {
        Row: {
          author_id: string | null
          name: string | null
          nft_processing_started_at: string | null
          processing_time: unknown | null
          username: string | null
        }
        Insert: {
          author_id?: string | null
          name?: string | null
          nft_processing_started_at?: string | null
          processing_time?: never
          username?: string | null
        }
        Update: {
          author_id?: string | null
          name?: string | null
          nft_processing_started_at?: string | null
          processing_time?: never
          username?: string | null
        }
        Relationships: []
      }
      get_nonwelcomed_users: {
        Row: {
          author_id: string | null
          last_nft_series_number: number | null
          last_offerid: string | null
          name: string | null
          username: string | null
          xch_address: string | null
          xch_address_updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          last_nft_series_number?: number | null
          last_offerid?: string | null
          name?: string | null
          username?: string | null
          xch_address?: string | null
          xch_address_updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          last_nft_series_number?: number | null
          last_offerid?: string | null
          name?: string | null
          username?: string | null
          xch_address?: string | null
          xch_address_updated_at?: string | null
        }
        Relationships: []
      }
      get_timeline_go4snapps: {
        Row: {
          author_id: string | null
          created_at: string | null
          description: string | null
          go4snapp_id: string | null
          ipfs_cid: string | null
          ipfs_cid_updated_at: string | null
          last_edition_number: number | null
          last_offer_created_at: string | null
          last_offer_id: string | null
          processing_error: string | null
          processing_started_at: string | null
          replied_to_post_at: string | null
          title: string | null
          total_auction_offer_count: number | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          description?: string | null
          go4snapp_id?: string | null
          ipfs_cid?: string | null
          ipfs_cid_updated_at?: string | null
          last_edition_number?: number | null
          last_offer_created_at?: string | null
          last_offer_id?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          replied_to_post_at?: string | null
          title?: string | null
          total_auction_offer_count?: number | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          description?: string | null
          go4snapp_id?: string | null
          ipfs_cid?: string | null
          ipfs_cid_updated_at?: string | null
          last_edition_number?: number | null
          last_offer_created_at?: string | null
          last_offer_id?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          replied_to_post_at?: string | null
          title?: string | null
          total_auction_offer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_leaderboard'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_nfts_processing_now'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_nonwelcomed_users'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_ungenerated_go4snapps'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_ungenerated_nfts'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_ungenerated_pfps'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_unminted_go4snapps'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_unprocessed_commands'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_user_page_info'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_user_page_other_owners'
            referencedColumns: ['pfp_author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_user_page_owned_pfps'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'get_x_users_to_update'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'x_users'
            referencedColumns: ['author_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'get_unprocessed_commands'
            referencedColumns: ['mentioned_post_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'get_unprocessed_mentions'
            referencedColumns: ['mentioned_post_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'x_mentions'
            referencedColumns: ['mentioned_post_id']
          },
        ]
      }
      get_ungenerated_go4snapps: {
        Row: {
          author_id: string | null
          description: string | null
          go4snapp_id: string | null
          go4snapp_requested_at: string | null
          name: string | null
          title: string | null
          username: string | null
          x_post_data: Json | null
          xch_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'get_unprocessed_commands'
            referencedColumns: ['mentioned_post_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'get_unprocessed_mentions'
            referencedColumns: ['mentioned_post_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'x_mentions'
            referencedColumns: ['mentioned_post_id']
          },
        ]
      }
      get_ungenerated_nfts: {
        Row: {
          author_id: string | null
          description: string | null
          last_nft_series_number: number | null
          last_offerid: string | null
          name: string | null
          offer_jsonb: Json | null
          pfp_ipfs_cid: string | null
          pfp_update_requested_at: string | null
          rank_queue_position: number | null
          status: number | null
          total_auction_offer_count: number | null
          user_jsonb: Json | null
          username: string | null
          x_profile_image_url: string | null
          xch_address: string | null
          xch_address_updated_at: string | null
        }
        Relationships: []
      }
      get_ungenerated_pfps: {
        Row: {
          author_id: string | null
          ignored_on: string | null
          name: string | null
          user_jsonb: Json | null
          username: string | null
          xch_address: string | null
          xch_address_updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          ignored_on?: string | null
          name?: string | null
          user_jsonb?: Json | null
          username?: string | null
          xch_address?: string | null
          xch_address_updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          ignored_on?: string | null
          name?: string | null
          user_jsonb?: Json | null
          username?: string | null
          xch_address?: string | null
          xch_address_updated_at?: string | null
        }
        Relationships: []
      }
      get_unique_nft_counts: {
        Row: {
          go4snappcount: number | null
          uniquepfpcount: number | null
        }
        Relationships: []
      }
      get_unminted_go4snapps: {
        Row: {
          author_id: string | null
          description: string | null
          go4snapp_id: string | null
          go4snapp_requested_at: string | null
          ipfs_cid: string | null
          ipfs_cid_updated_at: string | null
          last_edition_number: number | null
          last_offer_created_at: string | null
          last_offer_id: string | null
          last_offer_status: number | null
          name: string | null
          title: string | null
          total_auction_offer_count: number | null
          username: string | null
          x_post_data: Json | null
          xch_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'get_unprocessed_commands'
            referencedColumns: ['mentioned_post_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'get_unprocessed_mentions'
            referencedColumns: ['mentioned_post_id']
          },
          {
            foreignKeyName: 'go4snapps_go4snapp_id_fkey'
            columns: ['go4snapp_id']
            isOneToOne: true
            referencedRelation: 'x_mentions'
            referencedColumns: ['mentioned_post_id']
          },
        ]
      }
      get_unprocessed_commands: {
        Row: {
          author_id: string | null
          command_request_jsonb: Json | null
          did_address: string | null
          did_address_updated_at: string | null
          ignored_on: string | null
          ignored_reason: string | null
          mentioned_post_id: string | null
          mentioned_post_type: string | null
          pfp_update_requested_at: string | null
          record_created_at: string | null
          referenced_post_id: string | null
          user_jsonb: Json | null
          username: string | null
          x_post_data: Json | null
          xch_address: string | null
          xch_address_updated_at: string | null
        }
        Relationships: []
      }
      get_unprocessed_mentions: {
        Row: {
          mentioned_post_id: string | null
          mentioned_post_type: string | null
          processed_mention_at: string | null
          processed_mention_output: string | null
          record_created_at: string | null
          referenced_post_id: string | null
          x_post_data: Json | null
        }
        Insert: {
          mentioned_post_id?: string | null
          mentioned_post_type?: string | null
          processed_mention_at?: string | null
          processed_mention_output?: string | null
          record_created_at?: string | null
          referenced_post_id?: string | null
          x_post_data?: Json | null
        }
        Update: {
          mentioned_post_id?: string | null
          mentioned_post_type?: string | null
          processed_mention_at?: string | null
          processed_mention_output?: string | null
          record_created_at?: string | null
          referenced_post_id?: string | null
          x_post_data?: Json | null
        }
        Relationships: []
      }
      get_user_page_info: {
        Row: {
          author_id: string | null
          description: string | null
          did_address: string | null
          last_offer_status: number | null
          last_offerid: string | null
          name: string | null
          pfp_ipfs_cid: string | null
          pfp_update_requested_at: string | null
          pfp_will_update: boolean | null
          rank_copies_sold: number | null
          rank_fewest_copies_sold: number | null
          rank_last_sale: number | null
          rank_queue_position: number | null
          rank_total_badge_score: number | null
          rank_total_shadow_score: number | null
          rank_total_traded_value: number | null
          total_badge_score: number | null
          total_shadow_score: number | null
          total_sold: number | null
          username: string | null
          xch_address: string | null
        }
        Relationships: []
      }
      get_user_page_other_owners: {
        Row: {
          last_offer_status: number | null
          last_offerid: string | null
          owner_did_address: string | null
          owner_xch_address: string | null
          pfp_author_id: string | null
          pfp_ipfs_cid: string | null
          pfp_name: string | null
          pfp_username: string | null
          rank_copies_sold: number | null
          rank_queue_position: number | null
          username: string | null
        }
        Relationships: []
      }
      get_user_page_owned_pfps: {
        Row: {
          author_id: string | null
          badge: string | null
          badge_score: number | null
          edition_number: number | null
          name: string | null
          nft_id: string | null
          pfp_data_uri: string | null
          pfp_ipfs_cid: string | null
          pfp_name: string | null
          pfp_username: string | null
          rank_copies_sold: number | null
          shadow_score: number | null
          special_event: string | null
          username: string | null
          xch_address: string | null
          xch_address_updated_at: string | null
        }
        Relationships: []
      }
      get_user_pfp_offers: {
        Row: {
          author_id: string | null
          collected_at: string | null
          completed_at: string | null
          offer_id: string | null
          offer_jsonb: Json | null
          series_number: number | null
          status: number | null
        }
        Relationships: []
      }
      get_x_users_to_update: {
        Row: {
          author_id: string | null
          user_jsonb_updated_at: string | null
          username: string | null
        }
        Insert: {
          author_id?: string | null
          user_jsonb_updated_at?: string | null
          username?: string | null
        }
        Update: {
          author_id?: string | null
          user_jsonb_updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      go4me_nfts_view: {
        Row: {
          badge: string | null
          badge_score: number | null
          data_uri: string | null
          description: string | null
          edition_number: number | null
          metadata_uri: string | null
          name: string | null
          nft_id: string | null
          owner_author_id: string | null
          owner_did_address: string | null
          owner_username: string | null
          owner_xch_address: string | null
          pfp_author_id: string | null
          pfp_username: string | null
          shadow_score: number | null
          special_event: string | null
          special_event_multiplier: number | null
          total_badge_score: number | null
          total_shadow_score: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      update_leaderboard_ranks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

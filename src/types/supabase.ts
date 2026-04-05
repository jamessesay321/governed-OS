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
      account_mapping_history: {
        Row: {
          account_id: string
          change_source: string
          changed_by: string | null
          confidence: number | null
          created_at: string
          id: string
          new_category: string
          org_id: string
          previous_category: string | null
          reasoning: string | null
        }
        Insert: {
          account_id: string
          change_source: string
          changed_by?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          new_category: string
          org_id: string
          previous_category?: string | null
          reasoning?: string | null
        }
        Update: {
          account_id?: string
          change_source?: string
          changed_by?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          new_category?: string
          org_id?: string
          previous_category?: string | null
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_mapping_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      account_mappings: {
        Row: {
          ai_reasoning: string | null
          confidence: number
          created_at: string
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          mapping_source: string
          org_id: string
          source_account_code: string
          source_account_name: string
          target_category: string
          target_subcategory: string | null
          updated_at: string
          verified: boolean
          version: number
        }
        Insert: {
          ai_reasoning?: string | null
          confidence?: number
          created_at?: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          mapping_source?: string
          org_id: string
          source_account_code: string
          source_account_name: string
          target_category: string
          target_subcategory?: string | null
          updated_at?: string
          verified?: boolean
          version?: number
        }
        Update: {
          ai_reasoning?: string | null
          confidence?: number
          created_at?: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          mapping_source?: string
          org_id?: string
          source_account_code?: string
          source_account_name?: string
          target_category?: string
          target_subcategory?: string | null
          updated_at?: string
          verified?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "account_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      advisor_clients: {
        Row: {
          advisor_user_id: string
          client_org_id: string
          created_at: string
          id: string
          relationship_type: string
          status: string
          updated_at: string
        }
        Insert: {
          advisor_user_id: string
          client_org_id: string
          created_at?: string
          id?: string
          relationship_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          advisor_user_id?: string
          client_org_id?: string
          created_at?: string
          id?: string
          relationship_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisor_clients_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_audit: {
        Row: {
          action: string
          agent_id: string
          confidence: number | null
          created_at: string | null
          decision: string | null
          detail: string | null
          id: string
          org_id: string
          run_id: string | null
          source_citations: Json | null
        }
        Insert: {
          action: string
          agent_id: string
          confidence?: number | null
          created_at?: string | null
          decision?: string | null
          detail?: string | null
          id?: string
          org_id: string
          run_id?: string | null
          source_citations?: Json | null
        }
        Update: {
          action?: string
          agent_id?: string
          confidence?: number | null
          created_at?: string | null
          decision?: string | null
          detail?: string | null
          id?: string
          org_id?: string
          run_id?: string | null
          source_citations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_audit_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          agent_id: string
          confidence: number | null
          created_at: string | null
          id: string
          key: string
          org_id: string
          source: string
          times_applied: number | null
          updated_at: string | null
          value: string
        }
        Insert: {
          agent_id: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          key: string
          org_id: string
          source: string
          times_applied?: number | null
          updated_at?: string | null
          value: string
        }
        Update: {
          agent_id?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          key?: string
          org_id?: string
          source?: string
          times_applied?: number | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          completed_at: string
          confidence: number | null
          created_at: string | null
          id: string
          items_flagged: number | null
          items_processed: number | null
          org_id: string
          run_id: string
          started_at: string
          status: string
          steps: Json
          summary: string | null
          trust_level: string | null
        }
        Insert: {
          agent_id: string
          completed_at: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          items_flagged?: number | null
          items_processed?: number | null
          org_id: string
          run_id: string
          started_at: string
          status: string
          steps?: Json
          summary?: string | null
          trust_level?: string | null
        }
        Update: {
          agent_id?: string
          completed_at?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          items_flagged?: number | null
          items_processed?: number | null
          org_id?: string
          run_id?: string
          started_at?: string
          status?: string
          steps?: Json
          summary?: string | null
          trust_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_trust_levels: {
        Row: {
          accuracy_rate: number | null
          agent_id: string
          auto_approve_threshold: number | null
          created_at: string | null
          escalate_threshold: number | null
          id: string
          last_evaluated_at: string | null
          org_id: string
          runs_analysed: number | null
          trust_level: string
          updated_at: string | null
        }
        Insert: {
          accuracy_rate?: number | null
          agent_id: string
          auto_approve_threshold?: number | null
          created_at?: string | null
          escalate_threshold?: number | null
          id?: string
          last_evaluated_at?: string | null
          org_id: string
          runs_analysed?: number | null
          trust_level?: string
          updated_at?: string | null
        }
        Update: {
          accuracy_rate?: number | null
          agent_id?: string
          auto_approve_threshold?: number | null
          created_at?: string | null
          escalate_threshold?: number | null
          id?: string
          last_evaluated_at?: string | null
          org_id?: string
          runs_analysed?: number | null
          trust_level?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_trust_levels_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          org_id: string
          prompt_hash: string
          response: string
          tokens_used: number
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          org_id: string
          prompt_hash: string
          response: string
          tokens_used?: number
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          org_id?: string
          prompt_hash?: string
          response?: string
          tokens_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_commentary: {
        Row: {
          ai_model_name: string
          ai_model_version: string
          body: string
          commentary_type: Database["public"]["Enums"]["ai_commentary_type"]
          confidence_score: number
          created_at: string
          id: string
          metadata: Json
          model_version_id: string
          org_id: string
          scenario_id: string
          source_data_ids: Json
          title: string
        }
        Insert: {
          ai_model_name: string
          ai_model_version: string
          body: string
          commentary_type: Database["public"]["Enums"]["ai_commentary_type"]
          confidence_score: number
          created_at?: string
          id?: string
          metadata?: Json
          model_version_id: string
          org_id: string
          scenario_id: string
          source_data_ids?: Json
          title: string
        }
        Update: {
          ai_model_name?: string
          ai_model_version?: string
          body?: string
          commentary_type?: Database["public"]["Enums"]["ai_commentary_type"]
          confidence_score?: number
          created_at?: string
          id?: string
          metadata?: Json
          model_version_id?: string
          org_id?: string
          scenario_id?: string
          source_data_ids?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_commentary_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_commentary_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_commentary_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage: {
        Row: {
          cache_creation_tokens: number | null
          cache_read_tokens: number | null
          created_at: string
          endpoint: string
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          model: string | null
          org_id: string
          output_tokens: number | null
          tokens_used: number
          user_id: string | null
        }
        Insert: {
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          created_at?: string
          endpoint: string
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          org_id: string
          output_tokens?: number | null
          tokens_used?: number
          user_id?: string | null
        }
        Update: {
          cache_creation_tokens?: number | null
          cache_read_tokens?: number | null
          created_at?: string
          endpoint?: string
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          org_id?: string
          output_tokens?: number | null
          tokens_used?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      assumption_sets: {
        Row: {
          base_period_end: string
          base_period_start: string
          created_at: string
          created_by: string
          description: string
          forecast_horizon_months: number
          id: string
          name: string
          org_id: string
          updated_at: string
          version: number
        }
        Insert: {
          base_period_end: string
          base_period_start: string
          created_at?: string
          created_by: string
          description?: string
          forecast_horizon_months?: number
          id?: string
          name: string
          org_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          base_period_end?: string
          base_period_start?: string
          created_at?: string
          created_by?: string
          description?: string
          forecast_horizon_months?: number
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assumption_sets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      assumption_values: {
        Row: {
          assumption_set_id: string
          category: Database["public"]["Enums"]["assumption_category"]
          created_at: string
          created_by: string
          effective_from: string
          effective_to: string | null
          id: string
          key: string
          label: string
          org_id: string
          type: Database["public"]["Enums"]["assumption_type"]
          updated_at: string
          value: number
          version: number
        }
        Insert: {
          assumption_set_id: string
          category: Database["public"]["Enums"]["assumption_category"]
          created_at?: string
          created_by: string
          effective_from: string
          effective_to?: string | null
          id?: string
          key: string
          label: string
          org_id: string
          type: Database["public"]["Enums"]["assumption_type"]
          updated_at?: string
          value: number
          version?: number
        }
        Update: {
          assumption_set_id?: string
          category?: Database["public"]["Enums"]["assumption_category"]
          created_at?: string
          created_by?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          key?: string
          label?: string
          org_id?: string
          type?: Database["public"]["Enums"]["assumption_type"]
          updated_at?: string
          value?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assumption_values_assumption_set_id_fkey"
            columns: ["assumption_set_id"]
            isOneToOne: false
            referencedRelation: "assumption_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assumption_values_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          org_id: string
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          org_id: string
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmarks: {
        Row: {
          created_at: string
          id: string
          metric_key: string
          metric_label: string
          p10: number | null
          p25: number | null
          p50: number | null
          p75: number | null
          p90: number | null
          period: string
          region: string
          sample_size: number | null
          sector: string
          source: string
          source_url: string | null
          sub_sector: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_key: string
          metric_label: string
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          period: string
          region?: string
          sample_size?: number | null
          sector: string
          source: string
          source_url?: string | null
          sub_sector?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_key?: string
          metric_label?: string
          p10?: number | null
          p25?: number | null
          p50?: number | null
          p75?: number | null
          p90?: number | null
          period?: string
          region?: string
          sample_size?: number | null
          sector?: string
          source?: string
          source_url?: string | null
          sub_sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      budget_lines: {
        Row: {
          account_code: string
          account_name: string
          approved_at: string | null
          approved_by: string | null
          budgeted_amount: number
          category: string
          created_at: string
          created_by: string
          currency: string
          id: string
          notes: string | null
          org_id: string
          period: string
          updated_at: string
          version: number
        }
        Insert: {
          account_code: string
          account_name: string
          approved_at?: string | null
          approved_by?: string | null
          budgeted_amount?: number
          category: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          notes?: string | null
          org_id: string
          period: string
          updated_at?: string
          version?: number
        }
        Update: {
          account_code?: string
          account_name?: string
          approved_at?: string | null
          approved_by?: string | null
          budgeted_amount?: number
          category?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          notes?: string | null
          org_id?: string
          period?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_context_profiles: {
        Row: {
          business_model: string | null
          competitive_landscape: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          employee_count: number | null
          funding_status: string | null
          growth_goals: Json
          id: string
          industry: string | null
          interview_status: Database["public"]["Enums"]["interview_status"]
          key_challenges: Json
          org_id: string
          raw_interview_data: Json
          revenue_range: string | null
          sector: string | null
          stage: Database["public"]["Enums"]["playbook_maturity_level"] | null
          target_market: string | null
          updated_at: string
        }
        Insert: {
          business_model?: string | null
          competitive_landscape?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          employee_count?: number | null
          funding_status?: string | null
          growth_goals?: Json
          id?: string
          industry?: string | null
          interview_status?: Database["public"]["Enums"]["interview_status"]
          key_challenges?: Json
          org_id: string
          raw_interview_data?: Json
          revenue_range?: string | null
          sector?: string | null
          stage?: Database["public"]["Enums"]["playbook_maturity_level"] | null
          target_market?: string | null
          updated_at?: string
        }
        Update: {
          business_model?: string | null
          competitive_landscape?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          employee_count?: number | null
          funding_status?: string | null
          growth_goals?: Json
          id?: string
          industry?: string | null
          interview_status?: Database["public"]["Enums"]["interview_status"]
          key_challenges?: Json
          org_id?: string
          raw_interview_data?: Json
          revenue_range?: string | null
          sector?: string | null
          stage?: Database["public"]["Enums"]["playbook_maturity_level"] | null
          target_market?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_context_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_theses: {
        Row: {
          confidence: number | null
          created_at: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          org_id: string
          thesis: Json
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          org_id: string
          thesis: Json
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          org_id?: string
          thesis?: Json
        }
        Relationships: [
          {
            foreignKeyName: "business_theses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          class: string
          code: string
          created_at: string
          id: string
          name: string
          org_id: string
          source: string | null
          status: string
          type: string
          updated_at: string
          xero_account_id: string
        }
        Insert: {
          class?: string
          code?: string
          created_at?: string
          id?: string
          name: string
          org_id: string
          source?: string | null
          status?: string
          type: string
          updated_at?: string
          xero_account_id: string
        }
        Update: {
          class?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          source?: string | null
          status?: string
          type?: string
          updated_at?: string
          xero_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          data: Json
          due_date: string | null
          id: string
          org_id: string
          status: string
          type: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          data?: Json
          due_date?: string | null
          id?: string
          org_id: string
          status?: string
          type: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          data?: Json
          due_date?: string | null
          id?: string
          org_id?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkpoints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      commentaries: {
        Row: {
          generated_at: string | null
          id: string
          org_id: string
          period: string
          sections: Json
          sources: Json
        }
        Insert: {
          generated_at?: string | null
          id?: string
          org_id: string
          period: string
          sections?: Json
          sources?: Json
        }
        Update: {
          generated_at?: string | null
          id?: string
          org_id?: string
          period?: string
          sections?: Json
          sources?: Json
        }
        Relationships: [
          {
            foreignKeyName: "commentaries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_skills: {
        Row: {
          created_at: string
          id: string
          org_id: string
          skill_data: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          skill_data: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          skill_data?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_skills_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_kpis: {
        Row: {
          alert_direction: string | null
          alert_threshold: number | null
          created_at: string
          created_by: string
          description: string | null
          format: string
          formula_denominator: string | null
          formula_numerator: string
          higher_is_better: boolean
          id: string
          is_active: boolean
          key: string
          label: string
          org_id: string
          target_value: number | null
          updated_at: string
        }
        Insert: {
          alert_direction?: string | null
          alert_threshold?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          format: string
          formula_denominator?: string | null
          formula_numerator: string
          higher_is_better?: boolean
          id?: string
          is_active?: boolean
          key: string
          label: string
          org_id: string
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          alert_direction?: string | null
          alert_threshold?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          format?: string
          formula_denominator?: string | null
          formula_numerator?: string
          higher_is_better?: boolean
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          org_id?: string
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_kpis_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_briefing_cache: {
        Row: {
          briefing_date: string
          content: Json
          created_at: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          org_id: string
          source_refs: Json | null
        }
        Insert: {
          briefing_date: string
          content: Json
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          org_id: string
          source_refs?: Json | null
        }
        Update: {
          briefing_date?: string
          content?: Json
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          org_id?: string
          source_refs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_briefing_cache_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_preferences: {
        Row: {
          created_at: string
          custom_widgets: Json | null
          id: string
          org_id: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_widgets?: Json | null
          id?: string
          org_id: string
          template_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_widgets?: Json | null
          id?: string
          org_id?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widget_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          org_id: string
          template_name: string | null
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          org_id: string
          template_name?: string | null
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          org_id?: string
          template_name?: string | null
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widget_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_requests: {
        Row: {
          completed_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          cooling_off_until: string | null
          created_at: string
          deleted_tables: Json | null
          error_message: string | null
          id: string
          org_id: string
          reason: string | null
          requested_by: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          cooling_off_until?: string | null
          created_at?: string
          deleted_tables?: Json | null
          error_message?: string | null
          id?: string
          org_id: string
          reason?: string | null
          requested_by: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          cooling_off_until?: string | null
          created_at?: string
          deleted_tables?: Json | null
          error_message?: string | null
          id?: string
          org_id?: string
          reason?: string | null
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_deletion_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_health_reports: {
        Row: {
          checks: Json
          created_at: string
          forecast_ready: boolean
          id: string
          org_id: string
          overall_score: number
          period: string
          recommendations: string[] | null
        }
        Insert: {
          checks: Json
          created_at?: string
          forecast_ready?: boolean
          id?: string
          org_id: string
          overall_score: number
          period: string
          recommendations?: string[] | null
        }
        Update: {
          checks?: Json
          created_at?: string
          forecast_ready?: boolean
          id?: string
          org_id?: string
          overall_score?: number
          period?: string
          recommendations?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "data_health_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_records: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          amount: number
          category: string | null
          contact_name: string | null
          created_at: string
          currency: string
          date: string
          description: string | null
          id: string
          org_id: string
          raw_data: Json
          reconciled: boolean
          reconciled_at: string | null
          source: Database["public"]["Enums"]["financial_record_source"]
          source_id: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          amount?: number
          category?: string | null
          contact_name?: string | null
          created_at?: string
          currency?: string
          date: string
          description?: string | null
          id?: string
          org_id: string
          raw_data?: Json
          reconciled?: boolean
          reconciled_at?: string | null
          source: Database["public"]["Enums"]["financial_record_source"]
          source_id?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          amount?: number
          category?: string | null
          contact_name?: string | null
          created_at?: string
          currency?: string
          date?: string
          description?: string | null
          id?: string
          org_id?: string
          raw_data?: Json
          reconciled?: boolean
          reconciled_at?: string | null
          source?: Database["public"]["Enums"]["financial_record_source"]
          source_id?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_statements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comparative_period: string | null
          comparative_totals: Json | null
          created_at: string
          currency: string
          generated_at: string
          id: string
          is_draft: boolean
          line_items: Json
          org_id: string
          period: string
          period_type: string
          statement_type: Database["public"]["Enums"]["statement_type"]
          totals: Json
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comparative_period?: string | null
          comparative_totals?: Json | null
          created_at?: string
          currency?: string
          generated_at?: string
          id?: string
          is_draft?: boolean
          line_items?: Json
          org_id: string
          period: string
          period_type?: string
          statement_type: Database["public"]["Enums"]["statement_type"]
          totals?: Json
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comparative_period?: string | null
          comparative_totals?: Json | null
          created_at?: string
          currency?: string
          generated_at?: string
          id?: string
          is_draft?: boolean
          line_items?: Json
          org_id?: string
          period?: string
          period_type?: string
          statement_type?: Database["public"]["Enums"]["statement_type"]
          totals?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_statements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_scenarios: {
        Row: {
          assumptions: Json
          created_at: string | null
          description: string | null
          forecast_id: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          assumptions?: Json
          created_at?: string | null
          description?: string | null
          forecast_id?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          assumptions?: Json
          created_at?: string | null
          description?: string | null
          forecast_id?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_scenarios_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "forecasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_scenarios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_snapshots: {
        Row: {
          actual_value: number | null
          created_at: string
          forecast_value: number
          id: string
          metric_key: string
          metric_label: string
          model_version_id: string
          org_id: string
          period: string
          scenario_id: string
          variance: number | null
          variance_pct: number | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          forecast_value: number
          id?: string
          metric_key: string
          metric_label: string
          model_version_id: string
          org_id: string
          period: string
          scenario_id: string
          variance?: number | null
          variance_pct?: number | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          forecast_value?: number
          id?: string
          metric_key?: string
          metric_label?: string
          model_version_id?: string
          org_id?: string
          period?: string
          scenario_id?: string
          variance?: number | null
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_snapshots_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forecast_snapshots_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      forecasts: {
        Row: {
          assumptions: Json
          balance_sheet: Json
          cash_flow: Json
          confidence: number | null
          created_at: string | null
          generated_at: string | null
          id: string
          org_id: string
          periods: Json
          pnl: Json
        }
        Insert: {
          assumptions?: Json
          balance_sheet: Json
          cash_flow: Json
          confidence?: number | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          org_id: string
          periods: Json
          pnl: Json
        }
        Update: {
          assumptions?: Json
          balance_sheet?: Json
          cash_flow?: Json
          confidence?: number | null
          created_at?: string | null
          generated_at?: string | null
          id?: string
          org_id?: string
          periods?: Json
          pnl?: Json
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          org_id: string
          period: string | null
          sections: Json
          share_url: string | null
          status: string
          template_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          org_id: string
          period?: string | null
          sections?: Json
          share_url?: string | null
          status?: string
          template_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          org_id?: string
          period?: string | null
          sections?: Json
          share_url?: string | null
          status?: string
          template_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          alerts: Json
          checked_at: string | null
          id: string
          metrics: Json
          org_id: string
          overall_score: number | null
          summary: string | null
        }
        Insert: {
          alerts?: Json
          checked_at?: string | null
          id?: string
          metrics?: Json
          org_id: string
          overall_score?: number | null
          summary?: string | null
        }
        Update: {
          alerts?: Json
          checked_at?: string | null
          id?: string
          metrics?: Json
          org_id?: string
          overall_score?: number | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_blueprints: {
        Row: {
          account_mappings: Json
          common_integrations: string[]
          created_at: string
          created_from_org_id: string | null
          dashboard_template: Json
          description: string
          id: string
          industry: string
          interview_prompts: Json
          is_active: boolean
          kpi_definitions: Json
          name: string
          slug: string
          updated_at: string
          version: number
        }
        Insert: {
          account_mappings?: Json
          common_integrations?: string[]
          created_at?: string
          created_from_org_id?: string | null
          dashboard_template?: Json
          description: string
          id?: string
          industry: string
          interview_prompts?: Json
          is_active?: boolean
          kpi_definitions?: Json
          name: string
          slug: string
          updated_at?: string
          version?: number
        }
        Update: {
          account_mappings?: Json
          common_integrations?: string[]
          created_at?: string
          created_from_org_id?: string | null
          dashboard_template?: Json
          description?: string
          id?: string
          industry?: string
          interview_prompts?: Json
          is_active?: boolean
          kpi_definitions?: Json
          name?: string
          slug?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "industry_blueprints_created_from_org_id_fkey"
            columns: ["created_from_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          config: Json | null
          created_at: string | null
          credentials: Json | null
          id: string
          integration_id: string
          last_sync_at: string | null
          org_id: string
          status: string
          sync_frequency: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          integration_id: string
          last_sync_at?: string | null
          org_id: string
          status?: string
          sync_frequency?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          credentials?: Json | null
          id?: string
          integration_id?: string
          last_sync_at?: string | null
          org_id?: string
          status?: string
          sync_frequency?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: Database["public"]["Enums"]["intelligence_event_type"]
          expires_at: string | null
          id: string
          raw_data: Json
          regions_affected: string[]
          sectors_affected: string[]
          source_name: string
          source_url: string | null
          summary: string
          title: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: Database["public"]["Enums"]["intelligence_event_type"]
          expires_at?: string | null
          id?: string
          raw_data?: Json
          regions_affected?: string[]
          sectors_affected?: string[]
          source_name: string
          source_url?: string | null
          summary: string
          title: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["intelligence_event_type"]
          expires_at?: string | null
          id?: string
          raw_data?: Json
          regions_affected?: string[]
          sectors_affected?: string[]
          source_name?: string
          source_url?: string | null
          summary?: string
          title?: string
        }
        Relationships: []
      }
      intelligence_impacts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_metrics: Json
          ai_confidence: number
          created_at: string
          event_id: string
          id: string
          impact_summary: string
          org_id: string
          recommended_actions: Json
          severity: Database["public"]["Enums"]["intelligence_impact_severity"]
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_metrics?: Json
          ai_confidence?: number
          created_at?: string
          event_id: string
          id?: string
          impact_summary: string
          org_id: string
          recommended_actions?: Json
          severity: Database["public"]["Enums"]["intelligence_impact_severity"]
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_metrics?: Json
          ai_confidence?: number
          created_at?: string
          event_id?: string
          id?: string
          impact_summary?: string
          org_id?: string
          recommended_actions?: Json
          severity?: Database["public"]["Enums"]["intelligence_impact_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_impacts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "intelligence_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_impacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          org_id: string
          profile_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json
          org_id: string
          profile_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          org_id?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_messages_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "business_context_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_organisations: {
        Row: {
          accepted_at: string | null
          access_level: string
          created_at: string
          id: string
          investor_user_id: string | null
          invited_by: string | null
          magic_link_expires_at: string | null
          magic_link_token: string | null
          org_id: string
        }
        Insert: {
          accepted_at?: string | null
          access_level?: string
          created_at?: string
          id?: string
          investor_user_id?: string | null
          invited_by?: string | null
          magic_link_expires_at?: string | null
          magic_link_token?: string | null
          org_id: string
        }
        Update: {
          accepted_at?: string | null
          access_level?: string
          created_at?: string
          id?: string
          investor_user_id?: string | null
          invited_by?: string | null
          magic_link_expires_at?: string | null
          magic_link_token?: string | null
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_organisations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_shared_metrics: {
        Row: {
          created_at: string
          id: string
          is_shared: boolean
          metric_key: string
          org_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_shared?: boolean
          metric_key: string
          org_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_shared?: boolean
          metric_key?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_shared_metrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_alert_rules: {
        Row: {
          condition: string
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          metric_key: string
          metric_label: string
          org_id: string
          severity: string
          threshold: number
          updated_at: string
        }
        Insert: {
          condition: string
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          metric_key: string
          metric_label: string
          org_id: string
          severity?: string
          threshold: number
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          metric_key?: string
          metric_label?: string
          org_id?: string
          severity?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_alert_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          category: string
          created_at: string
          id: string
          metadata: Json
          metric_key: string
          metric_label: string
          org_id: string
          period: string
          previous_value: number | null
          source: string
          target_value: number | null
          unit: string
          value: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          metadata?: Json
          metric_key: string
          metric_label: string
          org_id: string
          period: string
          previous_value?: number | null
          source?: string
          target_value?: number | null
          unit?: string
          value: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          metadata?: Json
          metric_key?: string
          metric_label?: string
          org_id?: string
          period?: string
          previous_value?: number | null
          source?: string
          target_value?: number | null
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_snapshots: {
        Row: {
          burn_rate: number
          cash_in: number
          cash_out: number
          closing_cash: number
          cost_of_sales: number
          created_at: string
          gross_margin_pct: number
          gross_profit: number
          id: string
          is_break_even: boolean
          model_version_id: string
          net_cash_flow: number
          net_margin_pct: number
          net_profit: number
          operating_expenses: number
          org_id: string
          period: string
          revenue: number
          runway_months: number
          scenario_id: string
        }
        Insert: {
          burn_rate?: number
          cash_in?: number
          cash_out?: number
          closing_cash?: number
          cost_of_sales?: number
          created_at?: string
          gross_margin_pct?: number
          gross_profit?: number
          id?: string
          is_break_even?: boolean
          model_version_id: string
          net_cash_flow?: number
          net_margin_pct?: number
          net_profit?: number
          operating_expenses?: number
          org_id: string
          period: string
          revenue?: number
          runway_months?: number
          scenario_id: string
        }
        Update: {
          burn_rate?: number
          cash_in?: number
          cash_out?: number
          closing_cash?: number
          cost_of_sales?: number
          created_at?: string
          gross_margin_pct?: number
          gross_profit?: number
          id?: string
          is_break_even?: boolean
          model_version_id?: string
          net_cash_flow?: number
          net_margin_pct?: number
          net_profit?: number
          operating_expenses?: number
          org_id?: string
          period?: string
          revenue?: number
          runway_months?: number
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_snapshots_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_snapshots_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          assumption_hash: string
          assumption_set_id: string
          created_at: string
          engine_version: string
          id: string
          org_id: string
          scenario_id: string
          triggered_by: string
          version: number
        }
        Insert: {
          assumption_hash: string
          assumption_set_id: string
          created_at?: string
          engine_version?: string
          id?: string
          org_id: string
          scenario_id: string
          triggered_by: string
          version: number
        }
        Update: {
          assumption_hash?: string
          assumption_set_id?: string
          created_at?: string
          engine_version?: string
          id?: string
          org_id?: string
          scenario_id?: string
          triggered_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_assumption_set_id_fkey"
            columns: ["assumption_set_id"]
            isOneToOne: false
            referencedRelation: "assumption_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_versions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      module_instances: {
        Row: {
          activated_at: string
          activated_by: string
          config: Json
          created_at: string
          deactivated_at: string | null
          id: string
          org_id: string
          status: Database["public"]["Enums"]["module_status"]
          template_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          activated_by: string
          config?: Json
          created_at?: string
          deactivated_at?: string | null
          id?: string
          org_id: string
          status?: Database["public"]["Enums"]["module_status"]
          template_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          activated_by?: string
          config?: Json
          created_at?: string
          deactivated_at?: string | null
          id?: string
          org_id?: string
          status?: Database["public"]["Enums"]["module_status"]
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_instances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "module_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      module_templates: {
        Row: {
          category: string
          config_schema: Json
          created_at: string
          description: string
          icon: string | null
          id: string
          is_core: boolean
          name: string
          requires_modules: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          category: string
          config_schema?: Json
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_core?: boolean
          name: string
          requires_modules?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string
          config_schema?: Json
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_core?: boolean
          name?: string
          requires_modules?: string[]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      normalised_financials: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          org_id: string
          period: string
          source: string
          transaction_count: number
          updated_at: string
        }
        Insert: {
          account_id: string
          amount?: number
          created_at?: string
          id?: string
          org_id: string
          period: string
          source?: string
          transaction_count?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          org_id?: string
          period?: string
          source?: string
          transaction_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "normalised_financials_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalised_financials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          org_id: string
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      number_challenges: {
        Row: {
          account_id: string | null
          context_json: Json | null
          created_at: string
          created_by: string
          expected_value: string | null
          id: string
          metric_label: string
          metric_value: string | null
          org_id: string
          page: string
          period: string | null
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          context_json?: Json | null
          created_at?: string
          created_by: string
          expected_value?: string | null
          id?: string
          metric_label: string
          metric_value?: string | null
          org_id: string
          page: string
          period?: string | null
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          context_json?: Json | null
          created_at?: string
          created_by?: string
          expected_value?: string | null
          id?: string
          metric_label?: string
          metric_value?: string | null
          org_id?: string
          page?: string
          period?: string | null
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "number_challenges_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_accounting_config: {
        Row: {
          base_currency: string
          corporation_tax_period: string | null
          created_at: string
          end_of_year_lock_date: string | null
          financial_year_end_day: number
          financial_year_end_month: number
          id: string
          last_filed_accounts_date: string | null
          org_id: string
          period_lock_date: string | null
          raw_response: Json | null
          registration_number: string | null
          tax_number: string | null
          updated_at: string
          vat_period: string | null
          vat_scheme: string | null
          xero_org_status: string | null
          xero_org_type: string | null
        }
        Insert: {
          base_currency?: string
          corporation_tax_period?: string | null
          created_at?: string
          end_of_year_lock_date?: string | null
          financial_year_end_day: number
          financial_year_end_month: number
          id?: string
          last_filed_accounts_date?: string | null
          org_id: string
          period_lock_date?: string | null
          raw_response?: Json | null
          registration_number?: string | null
          tax_number?: string | null
          updated_at?: string
          vat_period?: string | null
          vat_scheme?: string | null
          xero_org_status?: string | null
          xero_org_type?: string | null
        }
        Update: {
          base_currency?: string
          corporation_tax_period?: string | null
          created_at?: string
          end_of_year_lock_date?: string | null
          financial_year_end_day?: number
          financial_year_end_month?: number
          id?: string
          last_filed_accounts_date?: string | null
          org_id?: string
          period_lock_date?: string | null
          raw_response?: Json | null
          registration_number?: string | null
          tax_number?: string | null
          updated_at?: string
          vat_period?: string | null
          vat_scheme?: string | null
          xero_org_status?: string | null
          xero_org_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_accounting_config_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          org_id: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          business_scan: Json | null
          created_at: string
          demo_company_name: string | null
          demo_industry: string | null
          has_completed_onboarding: boolean
          id: string
          name: string
          onboarding_mode: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          business_scan?: Json | null
          created_at?: string
          demo_company_name?: string | null
          demo_industry?: string | null
          has_completed_onboarding?: boolean
          id?: string
          name: string
          onboarding_mode?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          business_scan?: Json | null
          created_at?: string
          demo_company_name?: string | null
          demo_industry?: string | null
          has_completed_onboarding?: boolean
          id?: string
          name?: string
          onboarding_mode?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      payroll_group_members: {
        Row: {
          annual_gross_salary: number
          created_at: string
          end_date: string | null
          id: string
          is_forecast: boolean | null
          name: string
          org_id: string
          payroll_group_id: string
          role_title: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          annual_gross_salary: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_forecast?: boolean | null
          name: string
          org_id: string
          payroll_group_id: string
          role_title?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          annual_gross_salary?: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_forecast?: boolean | null
          name?: string
          org_id?: string
          payroll_group_id?: string
          role_title?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_group_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_group_members_payroll_group_id_fkey"
            columns: ["payroll_group_id"]
            isOneToOne: false
            referencedRelation: "payroll_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_groups: {
        Row: {
          created_at: string
          description: string | null
          employer_ni_rate: number | null
          employer_ni_threshold: number | null
          employer_pension_rate: number | null
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          employer_ni_rate?: number | null
          employer_ni_threshold?: number | null
          employer_pension_rate?: number | null
          id?: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          employer_ni_rate?: number | null
          employer_ni_threshold?: number | null
          employer_pension_rate?: number | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_actions: {
        Row: {
          assessment_id: string
          assigned_to: string | null
          category: string
          completed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          evidence: Json
          id: string
          org_id: string
          priority: Database["public"]["Enums"]["playbook_action_priority"]
          sort_order: number
          status: Database["public"]["Enums"]["playbook_action_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          assigned_to?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          evidence?: Json
          id?: string
          org_id: string
          priority?: Database["public"]["Enums"]["playbook_action_priority"]
          sort_order?: number
          status?: Database["public"]["Enums"]["playbook_action_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          evidence?: Json
          id?: string
          org_id?: string
          priority?: Database["public"]["Enums"]["playbook_action_priority"]
          sort_order?: number
          status?: Database["public"]["Enums"]["playbook_action_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_actions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "playbook_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_assessments: {
        Row: {
          ai_recommendations: Json
          assessed_at: string
          assessed_by: string
          category_scores: Json
          created_at: string
          current_maturity_level: Database["public"]["Enums"]["playbook_maturity_level"]
          id: string
          next_review_at: string | null
          org_id: string
          overall_score: number
          target_maturity_level: Database["public"]["Enums"]["playbook_maturity_level"]
          template_id: string
          updated_at: string
        }
        Insert: {
          ai_recommendations?: Json
          assessed_at?: string
          assessed_by: string
          category_scores?: Json
          created_at?: string
          current_maturity_level: Database["public"]["Enums"]["playbook_maturity_level"]
          id?: string
          next_review_at?: string | null
          org_id: string
          overall_score?: number
          target_maturity_level: Database["public"]["Enums"]["playbook_maturity_level"]
          template_id: string
          updated_at?: string
        }
        Update: {
          ai_recommendations?: Json
          assessed_at?: string
          assessed_by?: string
          category_scores?: Json
          created_at?: string
          current_maturity_level?: Database["public"]["Enums"]["playbook_maturity_level"]
          id?: string
          next_review_at?: string | null
          org_id?: string
          overall_score?: number
          target_maturity_level?: Database["public"]["Enums"]["playbook_maturity_level"]
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_assessments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_assessments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "playbook_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_templates: {
        Row: {
          actions_template: Json
          category: string
          created_at: string
          description: string
          id: string
          industry: string | null
          is_default: boolean
          maturity_level: Database["public"]["Enums"]["playbook_maturity_level"]
          name: string
          scoring_criteria: Json
          updated_at: string
        }
        Insert: {
          actions_template?: Json
          category: string
          created_at?: string
          description?: string
          id?: string
          industry?: string | null
          is_default?: boolean
          maturity_level: Database["public"]["Enums"]["playbook_maturity_level"]
          name: string
          scoring_criteria?: Json
          updated_at?: string
        }
        Update: {
          actions_template?: Json
          category?: string
          created_at?: string
          description?: string
          id?: string
          industry?: string | null
          is_default?: boolean
          maturity_level?: Database["public"]["Enums"]["playbook_maturity_level"]
          name?: string
          scoring_criteria?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          org_id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_connections: {
        Row: {
          access_token: string
          company_name: string | null
          connected_by: string
          created_at: string | null
          id: string
          org_id: string
          realm_id: string
          refresh_token: string
          status: string
          token_expires_at: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          company_name?: string | null
          connected_by: string
          created_at?: string | null
          id?: string
          org_id: string
          realm_id: string
          refresh_token: string
          status?: string
          token_expires_at: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          company_name?: string | null
          connected_by?: string
          created_at?: string | null
          id?: string
          org_id?: string
          realm_id?: string
          refresh_token?: string
          status?: string
          token_expires_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_transactions: {
        Row: {
          contact_name: string | null
          created_at: string
          currency: string
          date: string
          id: string
          line_items: Json
          org_id: string
          raw_payload: Json
          source: string | null
          synced_at: string
          total: number
          type: Database["public"]["Enums"]["transaction_type"]
          xero_id: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          currency?: string
          date: string
          id?: string
          line_items?: Json
          org_id: string
          raw_payload?: Json
          source?: string | null
          synced_at?: string
          total?: number
          type: Database["public"]["Enums"]["transaction_type"]
          xero_id: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          currency?: string
          date?: string
          id?: string
          line_items?: Json
          org_id?: string
          raw_payload?: Json
          source?: string | null
          synced_at?: string
          total?: number
          type?: Database["public"]["Enums"]["transaction_type"]
          xero_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_reports: {
        Row: {
          checks: Json
          created_at: string | null
          has_critical: boolean
          id: string
          org_id: string
          overall_score: number
          overall_status: string
          period: string
          recommendations: string[]
        }
        Insert: {
          checks?: Json
          created_at?: string | null
          has_critical?: boolean
          id?: string
          org_id: string
          overall_score?: number
          overall_status?: string
          period: string
          recommendations?: string[]
        }
        Update: {
          checks?: Json
          created_at?: string | null
          has_critical?: boolean
          id?: string
          org_id?: string
          overall_score?: number
          overall_status?: string
          period?: string
          recommendations?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates_custom: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          sections: Json
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          sections?: Json
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          sections?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_custom_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: Json
          created_at: string
          generated_by: string | null
          id: string
          metadata: Json
          org_id: string
          period_end: string
          period_start: string
          recipients: Json
          report_type: Database["public"]["Enums"]["report_type"]
          sections: Json
          sent_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json
          org_id: string
          period_end: string
          period_start: string
          recipients?: Json
          report_type: Database["public"]["Enums"]["report_type"]
          sections?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          period_end?: string
          period_start?: string
          recipients?: Json
          report_type?: Database["public"]["Enums"]["report_type"]
          sections?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_change_log: {
        Row: {
          ai_interpretation: Json
          change_type: Database["public"]["Enums"]["scenario_change_type"]
          confirmation_token: string | null
          created_at: string
          created_by: string
          id: string
          natural_language_input: string
          org_id: string
          proposed_changes: Json
          scenario_id: string
          user_confirmed: boolean
        }
        Insert: {
          ai_interpretation?: Json
          change_type: Database["public"]["Enums"]["scenario_change_type"]
          confirmation_token?: string | null
          created_at?: string
          created_by: string
          id?: string
          natural_language_input: string
          org_id: string
          proposed_changes?: Json
          scenario_id: string
          user_confirmed?: boolean
        }
        Update: {
          ai_interpretation?: Json
          change_type?: Database["public"]["Enums"]["scenario_change_type"]
          confirmation_token?: string | null
          created_at?: string
          created_by?: string
          id?: string
          natural_language_input?: string
          org_id?: string
          proposed_changes?: Json
          scenario_id?: string
          user_confirmed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "scenario_change_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_change_log_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_versions: {
        Row: {
          assumption_set_snapshot: Json
          change_summary: string
          created_at: string
          created_by: string
          id: string
          org_id: string
          scenario_id: string
          version: number
        }
        Insert: {
          assumption_set_snapshot: Json
          change_summary: string
          created_at?: string
          created_by: string
          id?: string
          org_id: string
          scenario_id: string
          version: number
        }
        Update: {
          assumption_set_snapshot?: Json
          change_summary?: string
          created_at?: string
          created_by?: string
          id?: string
          org_id?: string
          scenario_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenario_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_versions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          assumption_set_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          is_base: boolean
          locked_at: string | null
          locked_by: string | null
          name: string
          org_id: string
          status: Database["public"]["Enums"]["scenario_status"]
          updated_at: string
        }
        Insert: {
          assumption_set_id: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          is_base?: boolean
          locked_at?: string | null
          locked_by?: string | null
          name: string
          org_id: string
          status?: Database["public"]["Enums"]["scenario_status"]
          updated_at?: string
        }
        Update: {
          assumption_set_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_base?: boolean
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          org_id?: string
          status?: Database["public"]["Enums"]["scenario_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_assumption_set_id_fkey"
            columns: ["assumption_set_id"]
            isOneToOne: false
            referencedRelation: "assumption_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenarios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      source_mappings: {
        Row: {
          confidence: number
          created_at: string
          id: string
          mapping_type: string
          org_id: string
          source_a: string
          source_a_id: string
          source_b: string
          source_b_id: string
          verified: boolean
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          mapping_type: string
          org_id: string
          source_a: string
          source_a_id: string
          source_b: string
          source_b_id: string
          verified?: boolean
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          mapping_type?: string
          org_id?: string
          source_a?: string
          source_a_id?: string
          source_b?: string
          source_b_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "source_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      staged_transactions: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          matched_with: Json
          notes: string | null
          org_id: string
          raw_data: Json
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          source_id: string
          status: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          id?: string
          matched_with?: Json
          notes?: string | null
          org_id: string
          raw_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          source_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          matched_with?: Json
          notes?: string | null
          org_id?: string
          raw_data?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          source_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staged_transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          org_id: string
          records_synced: number
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          org_id: string
          records_synced?: number
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          org_id?: string
          records_synced?: number
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_category_mappings: {
        Row: {
          created_at: string
          id: string
          options: Json
          org_id: string
          semantic_type: string
          updated_at: string
          xero_category_id: string
          xero_category_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json
          org_id: string
          semantic_type: string
          updated_at?: string
          xero_category_id: string
          xero_category_name: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json
          org_id?: string
          semantic_type?: string
          updated_at?: string
          xero_category_id?: string
          xero_category_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_category_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_economics_snapshots: {
        Row: {
          cac: number
          contribution_margin_pct: number
          contribution_per_unit: number
          created_at: string
          id: string
          ltv: number
          ltv_cac_ratio: number
          model_version_id: string
          org_id: string
          period: string
          revenue_per_unit: number
          scenario_id: string
          segment_key: string
          segment_label: string
          total_contribution: number
          total_revenue: number
          total_variable_cost: number
          units_sold: number
          variable_cost_per_unit: number
        }
        Insert: {
          cac?: number
          contribution_margin_pct?: number
          contribution_per_unit?: number
          created_at?: string
          id?: string
          ltv?: number
          ltv_cac_ratio?: number
          model_version_id: string
          org_id: string
          period: string
          revenue_per_unit?: number
          scenario_id: string
          segment_key: string
          segment_label: string
          total_contribution?: number
          total_revenue?: number
          total_variable_cost?: number
          units_sold?: number
          variable_cost_per_unit?: number
        }
        Update: {
          cac?: number
          contribution_margin_pct?: number
          contribution_per_unit?: number
          created_at?: string
          id?: string
          ltv?: number
          ltv_cac_ratio?: number
          model_version_id?: string
          org_id?: string
          period?: string
          revenue_per_unit?: number
          scenario_id?: string
          segment_key?: string
          segment_label?: string
          total_contribution?: number
          total_revenue?: number
          total_variable_cost?: number
          units_sold?: number
          variable_cost_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_economics_snapshots_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_economics_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_economics_snapshots_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          date_format: string
          email_agent_reports: boolean
          email_billing_reminders: boolean
          email_kpi_alerts: boolean
          email_product_updates: boolean
          email_weekly_summary: boolean
          id: string
          language: string
          number_format: string
          org_id: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_format?: string
          email_agent_reports?: boolean
          email_billing_reminders?: boolean
          email_kpi_alerts?: boolean
          email_product_updates?: boolean
          email_weekly_summary?: boolean
          id?: string
          language?: string
          number_format?: string
          org_id: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_format?: string
          email_agent_reports?: boolean
          email_billing_reminders?: boolean
          email_kpi_alerts?: boolean
          email_product_updates?: boolean
          email_weekly_summary?: boolean
          id?: string
          language?: string
          number_format?: string
          org_id?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_access_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          org_id: string
          user_id: string
          vault_item_id: string
          version_number: number | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          org_id: string
          user_id: string
          vault_item_id: string
          version_number?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          org_id?: string
          user_id?: string
          vault_item_id?: string
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_access_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_access_log_vault_item_id_fkey"
            columns: ["vault_item_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_items: {
        Row: {
          created_at: string
          created_by: string
          current_version: number
          data_freshness_at: string | null
          data_version: string | null
          description: string
          id: string
          item_type: Database["public"]["Enums"]["vault_item_type"]
          model_id: string | null
          org_id: string
          period_end: string | null
          period_start: string | null
          prompt_hash: string | null
          source_entity_id: string | null
          source_entity_type: string | null
          status: Database["public"]["Enums"]["vault_item_status"]
          tags: string[]
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_version?: number
          data_freshness_at?: string | null
          data_version?: string | null
          description?: string
          id?: string
          item_type: Database["public"]["Enums"]["vault_item_type"]
          model_id?: string | null
          org_id: string
          period_end?: string | null
          period_start?: string | null
          prompt_hash?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: Database["public"]["Enums"]["vault_item_status"]
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_version?: number
          data_freshness_at?: string | null
          data_version?: string | null
          description?: string
          id?: string
          item_type?: Database["public"]["Enums"]["vault_item_type"]
          model_id?: string | null
          org_id?: string
          period_end?: string | null
          period_start?: string | null
          prompt_hash?: string | null
          source_entity_id?: string | null
          source_entity_type?: string | null
          status?: Database["public"]["Enums"]["vault_item_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_versions: {
        Row: {
          change_summary: string
          content: Json
          created_at: string
          created_by: string
          id: string
          org_id: string
          provenance: Json
          vault_item_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string
          content?: Json
          created_at?: string
          created_by: string
          id?: string
          org_id: string
          provenance?: Json
          vault_item_id: string
          version_number: number
        }
        Update: {
          change_summary?: string
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          org_id?: string
          provenance?: Json
          vault_item_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "vault_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_versions_vault_item_id_fkey"
            columns: ["vault_item_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_params: Json
          org_id: string
          progress: number
          result: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          triggered_by: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_params?: Json
          org_id: string
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          triggered_by: string
          updated_at?: string
          workflow_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_params?: Json
          org_id?: string
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          triggered_by?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      xero_connections: {
        Row: {
          access_token: string
          connected_by: string
          created_at: string
          id: string
          org_id: string
          refresh_token: string
          status: Database["public"]["Enums"]["xero_connection_status"]
          token_expires_at: string
          updated_at: string
          xero_tenant_id: string
        }
        Insert: {
          access_token: string
          connected_by: string
          created_at?: string
          id?: string
          org_id: string
          refresh_token: string
          status?: Database["public"]["Enums"]["xero_connection_status"]
          token_expires_at: string
          updated_at?: string
          xero_tenant_id: string
        }
        Update: {
          access_token?: string
          connected_by?: string
          created_at?: string
          id?: string
          org_id?: string
          refresh_token?: string
          status?: Database["public"]["Enums"]["xero_connection_status"]
          token_expires_at?: string
          updated_at?: string
          xero_tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xero_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      user_org_id: { Args: never; Returns: string }
    }
    Enums: {
      ai_commentary_type: "anomaly" | "risk" | "opportunity" | "insight"
      assumption_category:
        | "revenue_drivers"
        | "pricing"
        | "costs"
        | "growth_rates"
        | "headcount"
        | "marketing"
        | "capital"
        | "custom"
      assumption_type:
        | "percentage"
        | "currency"
        | "integer"
        | "boolean"
        | "decimal"
      financial_record_source: "xero" | "manual" | "csv_import" | "api"
      intelligence_event_type:
        | "rate_change"
        | "regulation"
        | "market_news"
        | "economic_indicator"
        | "sector_update"
      intelligence_impact_severity:
        | "critical"
        | "high"
        | "medium"
        | "low"
        | "informational"
      interview_status: "in_progress" | "completed" | "abandoned"
      invitation_status: "pending" | "accepted" | "expired"
      module_status: "active" | "paused" | "deactivated"
      notification_channel: "in_app" | "email" | "both"
      notification_priority: "urgent" | "high" | "normal" | "low"
      playbook_action_priority: "critical" | "high" | "medium" | "low"
      playbook_action_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "skipped"
      playbook_maturity_level:
        | "startup"
        | "early"
        | "growth"
        | "scale"
        | "mature"
      report_status: "draft" | "generating" | "ready" | "sent" | "archived"
      report_type:
        | "board_pack"
        | "monthly_review"
        | "investor_update"
        | "custom"
      scenario_change_type: "proposed" | "confirmed" | "rejected"
      scenario_status: "draft" | "active" | "locked" | "archived"
      statement_type: "profit_and_loss" | "balance_sheet" | "cash_flow"
      sync_status: "running" | "completed" | "failed"
      transaction_type:
        | "invoice"
        | "bill"
        | "payment"
        | "bank_transaction"
        | "credit_note"
        | "manual_journal"
      user_role: "owner" | "admin" | "advisor" | "viewer"
      vault_item_status: "draft" | "final" | "superseded" | "archived"
      vault_item_type:
        | "board_pack"
        | "scenario_output"
        | "kpi_snapshot"
        | "variance_analysis"
        | "narrative"
        | "anomaly_report"
        | "interview_transcript"
        | "playbook_assessment"
        | "custom_report"
        | "ai_analysis"
        | "file_upload"
      workflow_status:
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      xero_connection_status: "active" | "disconnected"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_commentary_type: ["anomaly", "risk", "opportunity", "insight"],
      assumption_category: [
        "revenue_drivers",
        "pricing",
        "costs",
        "growth_rates",
        "headcount",
        "marketing",
        "capital",
        "custom",
      ],
      assumption_type: [
        "percentage",
        "currency",
        "integer",
        "boolean",
        "decimal",
      ],
      financial_record_source: ["xero", "manual", "csv_import", "api"],
      intelligence_event_type: [
        "rate_change",
        "regulation",
        "market_news",
        "economic_indicator",
        "sector_update",
      ],
      intelligence_impact_severity: [
        "critical",
        "high",
        "medium",
        "low",
        "informational",
      ],
      interview_status: ["in_progress", "completed", "abandoned"],
      invitation_status: ["pending", "accepted", "expired"],
      module_status: ["active", "paused", "deactivated"],
      notification_channel: ["in_app", "email", "both"],
      notification_priority: ["urgent", "high", "normal", "low"],
      playbook_action_priority: ["critical", "high", "medium", "low"],
      playbook_action_status: [
        "pending",
        "in_progress",
        "completed",
        "skipped",
      ],
      playbook_maturity_level: [
        "startup",
        "early",
        "growth",
        "scale",
        "mature",
      ],
      report_status: ["draft", "generating", "ready", "sent", "archived"],
      report_type: [
        "board_pack",
        "monthly_review",
        "investor_update",
        "custom",
      ],
      scenario_change_type: ["proposed", "confirmed", "rejected"],
      scenario_status: ["draft", "active", "locked", "archived"],
      statement_type: ["profit_and_loss", "balance_sheet", "cash_flow"],
      sync_status: ["running", "completed", "failed"],
      transaction_type: [
        "invoice",
        "bill",
        "payment",
        "bank_transaction",
        "credit_note",
        "manual_journal",
      ],
      user_role: ["owner", "admin", "advisor", "viewer"],
      vault_item_status: ["draft", "final", "superseded", "archived"],
      vault_item_type: [
        "board_pack",
        "scenario_output",
        "kpi_snapshot",
        "variance_analysis",
        "narrative",
        "anomaly_report",
        "interview_transcript",
        "playbook_assessment",
        "custom_report",
        "ai_analysis",
        "file_upload",
      ],
      workflow_status: [
        "queued",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      xero_connection_status: ["active", "disconnected"],
    },
  },
} as const

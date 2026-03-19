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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          conversion_probability:
            | Database["public"]["Enums"]["conversion_probability"]
            | null
          converted_at: string | null
          created_at: string
          first_contact_at: string
          id: string
          last_message_at: string | null
          name: string | null
          notes: string | null
          phone: string
          product_interest: string | null
          purchase_preference:
            | Database["public"]["Enums"]["purchase_preference"]
            | null
          sale_stage: Database["public"]["Enums"]["sale_stage"] | null
          updated_at: string
        }
        Insert: {
          conversion_probability?:
            | Database["public"]["Enums"]["conversion_probability"]
            | null
          converted_at?: string | null
          created_at?: string
          first_contact_at?: string
          id?: string
          last_message_at?: string | null
          name?: string | null
          notes?: string | null
          phone: string
          product_interest?: string | null
          purchase_preference?:
            | Database["public"]["Enums"]["purchase_preference"]
            | null
          sale_stage?: Database["public"]["Enums"]["sale_stage"] | null
          updated_at?: string
        }
        Update: {
          conversion_probability?:
            | Database["public"]["Enums"]["conversion_probability"]
            | null
          converted_at?: string | null
          created_at?: string
          first_contact_at?: string
          id?: string
          last_message_at?: string | null
          name?: string | null
          notes?: string | null
          phone?: string
          product_interest?: string | null
          purchase_preference?:
            | Database["public"]["Enums"]["purchase_preference"]
            | null
          sale_stage?: Database["public"]["Enums"]["sale_stage"] | null
          updated_at?: string
        }
        Relationships: []
      }
      contatos: {
        Row: {
          cidade: string | null
          data_criacao: string
          empresa: string | null
          id: string
          nome: string | null
          origem: string | null
          status_funil: string
          telefone: string
          ultima_interacao: string | null
        }
        Insert: {
          cidade?: string | null
          data_criacao?: string
          empresa?: string | null
          id?: string
          nome?: string | null
          origem?: string | null
          status_funil?: string
          telefone: string
          ultima_interacao?: string | null
        }
        Update: {
          cidade?: string | null
          data_criacao?: string
          empresa?: string | null
          id?: string
          nome?: string | null
          origem?: string | null
          status_funil?: string
          telefone?: string
          ultima_interacao?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          is_active: boolean | null
          last_message_preview: string | null
          unread_count: number | null
          updated_at: string
          whatsapp_chat_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_message_preview?: string | null
          unread_count?: number | null
          updated_at?: string
          whatsapp_chat_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_message_preview?: string | null
          unread_count?: number | null
          updated_at?: string
          whatsapp_chat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          bling_id: string | null
          data_conversao: string | null
          data_primeiro_contato: string | null
          data_ultimo_pedido: string | null
          id: string
          nome: string | null
          origem_lead: string | null
          status_cliente: string | null
          telefone: string
          total_pedidos: number | null
          valor_total_comprado: number | null
        }
        Insert: {
          bling_id?: string | null
          data_conversao?: string | null
          data_primeiro_contato?: string | null
          data_ultimo_pedido?: string | null
          id?: string
          nome?: string | null
          origem_lead?: string | null
          status_cliente?: string | null
          telefone: string
          total_pedidos?: number | null
          valor_total_comprado?: number | null
        }
        Update: {
          bling_id?: string | null
          data_conversao?: string | null
          data_primeiro_contato?: string | null
          data_ultimo_pedido?: string | null
          id?: string
          nome?: string | null
          origem_lead?: string | null
          status_cliente?: string | null
          telefone?: string
          total_pedidos?: number | null
          valor_total_comprado?: number | null
        }
        Relationships: []
      }
      leads_pipeline: {
        Row: {
          convertido: boolean
          data_entrada: string | null
          data_interacao: string | null
          data_ultima_interacao: string | null
          etapa_pipeline: string | null
          id: string
          motivo_perda: string | null
          nome: string | null
          status: string | null
          telefone: string
        }
        Insert: {
          convertido?: boolean
          data_entrada?: string | null
          data_interacao?: string | null
          data_ultima_interacao?: string | null
          etapa_pipeline?: string | null
          id?: string
          motivo_perda?: string | null
          nome?: string | null
          status?: string | null
          telefone: string
        }
        Update: {
          convertido?: boolean
          data_entrada?: string | null
          data_interacao?: string | null
          data_ultima_interacao?: string | null
          etapa_pipeline?: string | null
          id?: string
          motivo_perda?: string | null
          nome?: string | null
          status?: string | null
          telefone?: string
        }
        Relationships: []
      }
      mensagens: {
        Row: {
          contato_id: string
          direcao: string
          id: string
          mensagem: string
          telefone: string | null
          timestamp: string
          vendedor: string | null
        }
        Insert: {
          contato_id: string
          direcao?: string
          id?: string
          mensagem: string
          telefone?: string | null
          timestamp?: string
          vendedor?: string | null
        }
        Update: {
          contato_id?: string
          direcao?: string
          id?: string
          mensagem?: string
          telefone?: string | null
          timestamp?: string
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          contact_id: string
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          message_type: string | null
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          contact_id: string
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          message_type?: string | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          contact_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_type?: string | null
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_events: {
        Row: {
          changed_at: string
          contact_id: string
          from_stage: Database["public"]["Enums"]["sale_stage"] | null
          id: string
          to_stage: Database["public"]["Enums"]["sale_stage"]
        }
        Insert: {
          changed_at?: string
          contact_id: string
          from_stage?: Database["public"]["Enums"]["sale_stage"] | null
          id?: string
          to_stage: Database["public"]["Enums"]["sale_stage"]
        }
        Update: {
          changed_at?: string
          contact_id?: string
          from_stage?: Database["public"]["Enums"]["sale_stage"] | null
          id?: string
          to_stage?: Database["public"]["Enums"]["sale_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "sales_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      churn_mensal: {
        Args: { meses_atras?: number }
        Returns: {
          mes: string
          taxa_churn_percentual: number
          total_clientes_ativos_inicio: number
          total_clientes_churnados_no_mes: number
        }[]
      }
      metricas_aquisicao_mensal: {
        Args: { meses_atras?: number }
        Returns: {
          mes: string
          novos_clientes: number
          receita_novos: number
          receita_recorrentes: number
        }[]
      }
      registrar_pedido:
        | {
            Args: {
              _bling_id?: string
              _telefone?: string
              _valor_pedido?: number
            }
            Returns: {
              bling_id: string | null
              data_conversao: string | null
              data_primeiro_contato: string | null
              data_ultimo_pedido: string | null
              id: string
              nome: string | null
              origem_lead: string | null
              status_cliente: string | null
              telefone: string
              total_pedidos: number | null
              valor_total_comprado: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "customers"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { _telefone: string; _valor_pedido?: number }
            Returns: {
              bling_id: string | null
              data_conversao: string | null
              data_primeiro_contato: string | null
              data_ultimo_pedido: string | null
              id: string
              nome: string | null
              origem_lead: string | null
              status_cliente: string | null
              telefone: string
              total_pedidos: number | null
              valor_total_comprado: number | null
            }[]
            SetofOptions: {
              from: "*"
              to: "customers"
              isOneToOne: false
              isSetofReturn: true
            }
          }
    }
    Enums: {
      conversion_probability: "baixa" | "media" | "alta" | "muito_alta"
      purchase_preference:
        | "a_vista"
        | "parcelado"
        | "financiamento"
        | "indefinido"
      sale_stage:
        | "novo_lead"
        | "qualificacao"
        | "proposta"
        | "negociacao"
        | "fechamento"
        | "pos_venda"
        | "perdido"
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
      conversion_probability: ["baixa", "media", "alta", "muito_alta"],
      purchase_preference: [
        "a_vista",
        "parcelado",
        "financiamento",
        "indefinido",
      ],
      sale_stage: [
        "novo_lead",
        "qualificacao",
        "proposta",
        "negociacao",
        "fechamento",
        "pos_venda",
        "perdido",
      ],
    },
  },
} as const

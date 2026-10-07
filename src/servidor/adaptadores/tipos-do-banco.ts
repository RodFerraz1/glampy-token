export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      aceites: {
        Row: {
          aceito_em: string;
          documento: Database["public"]["Enums"]["documento_aceite"];
          id: string;
          perfil_id: string;
          versao: string;
        };
        Insert: {
          aceito_em?: string;
          documento: Database["public"]["Enums"]["documento_aceite"];
          id?: string;
          perfil_id: string;
          versao: string;
        };
        Update: {
          aceito_em?: string;
          documento?: Database["public"]["Enums"]["documento_aceite"];
          id?: string;
          perfil_id?: string;
          versao?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aceites_perfil_id_fkey";
            columns: ["perfil_id"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      apuracoes_simuladas: {
        Row: {
          faturamento_centavos: number;
          hash_relatorio: string;
          periodo: number;
          registrado_em: string;
          registrado_por: string;
          relatorio_caminho: string | null;
          royalty_centavos: number;
          valor_por_token_centavos: number;
        };
        Insert: {
          faturamento_centavos: number;
          hash_relatorio: string;
          periodo: number;
          registrado_em?: string;
          registrado_por: string;
          relatorio_caminho?: string | null;
          royalty_centavos: number;
          valor_por_token_centavos: number;
        };
        Update: {
          faturamento_centavos?: number;
          hash_relatorio?: string;
          periodo?: number;
          registrado_em?: string;
          registrado_por?: string;
          relatorio_caminho?: string | null;
          royalty_centavos?: number;
          valor_por_token_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: "apuracoes_simuladas_registrado_por_fkey";
            columns: ["registrado_por"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      auditoria: {
        Row: {
          acao: string;
          ator_id: string | null;
          criado_em: string;
          dados: NonNullable<Json>;
          entidade: string;
          entidade_id: string | null;
          id: number;
        };
        Insert: {
          acao: string;
          ator_id?: string | null;
          criado_em?: string;
          dados?: NonNullable<Json>;
          entidade: string;
          entidade_id?: string | null;
          id?: never;
        };
        Update: {
          acao?: string;
          ator_id?: string | null;
          criado_em?: string;
          dados?: NonNullable<Json>;
          entidade?: string;
          entidade_id?: string | null;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "auditoria_ator_id_fkey";
            columns: ["ator_id"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      beneficios: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          categoria: string;
          criado_em: string;
          descricao: string | null;
          id: string;
          imagem_url: string | null;
          item: string;
          nome: string;
          preco_centavos: number;
          preco_tabela_centavos: number;
        };
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          categoria: string;
          criado_em?: string;
          descricao?: string | null;
          id?: string;
          imagem_url?: string | null;
          item: string;
          nome: string;
          preco_centavos: number;
          preco_tabela_centavos: number;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          categoria?: string;
          criado_em?: string;
          descricao?: string | null;
          id?: string;
          imagem_url?: string | null;
          item?: string;
          nome?: string;
          preco_centavos?: number;
          preco_tabela_centavos?: number;
        };
        Relationships: [];
      };
      carteiras: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          desabilitada_em: string | null;
          endereco: string;
          erro_habilitacao: string | null;
          habilitada_em: string | null;
          id: string;
          passkey_chave_publica: string | null;
          passkey_id: string | null;
          perfil_id: string;
          status: Database["public"]["Enums"]["status_carteira"];
          tipo: Database["public"]["Enums"]["tipo_carteira"];
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          desabilitada_em?: string | null;
          endereco: string;
          erro_habilitacao?: string | null;
          habilitada_em?: string | null;
          id?: string;
          passkey_chave_publica?: string | null;
          passkey_id?: string | null;
          perfil_id: string;
          status?: Database["public"]["Enums"]["status_carteira"];
          tipo: Database["public"]["Enums"]["tipo_carteira"];
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          desabilitada_em?: string | null;
          endereco?: string;
          erro_habilitacao?: string | null;
          habilitada_em?: string | null;
          id?: string;
          passkey_chave_publica?: string | null;
          passkey_id?: string | null;
          perfil_id?: string;
          status?: Database["public"]["Enums"]["status_carteira"];
          tipo?: Database["public"]["Enums"]["tipo_carteira"];
        };
        Relationships: [
          {
            foreignKeyName: "carteiras_perfil_id_fkey";
            columns: ["perfil_id"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      catalogo_versoes: {
        Row: {
          conteudo: string;
          hash_tabela: string;
          publicada_em: string;
          tx_publicacao: string | null;
          versao: number;
        };
        Insert: {
          conteudo: string;
          hash_tabela: string;
          publicada_em?: string;
          tx_publicacao?: string | null;
          versao: number;
        };
        Update: {
          conteudo?: string;
          hash_tabela?: string;
          publicada_em?: string;
          tx_publicacao?: string | null;
          versao?: number;
        };
        Relationships: [];
      };
      convites: {
        Row: {
          criado_em: string;
          criado_por: string;
          email: string;
          expira_em: string;
          hash_token: string;
          id: string;
          usado_em: string | null;
        };
        Insert: {
          criado_em?: string;
          criado_por: string;
          email: string;
          expira_em: string;
          hash_token: string;
          id?: string;
          usado_em?: string | null;
        };
        Update: {
          criado_em?: string;
          criado_por?: string;
          email?: string;
          expira_em?: string;
          hash_token?: string;
          id?: string;
          usado_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "convites_criado_por_fkey";
            columns: ["criado_por"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      perfis: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          nome_exibicao: string | null;
          papel: Database["public"]["Enums"]["papel_usuario"];
        };
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id: string;
          nome_exibicao?: string | null;
          papel?: Database["public"]["Enums"]["papel_usuario"];
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome_exibicao?: string | null;
          papel?: Database["public"]["Enums"]["papel_usuario"];
        };
        Relationships: [];
      };
      precos_beneficio: {
        Row: {
          beneficio_id: string;
          preco_centavos: number;
          versao: number;
        };
        Insert: {
          beneficio_id: string;
          preco_centavos: number;
          versao: number;
        };
        Update: {
          beneficio_id?: string;
          preco_centavos?: number;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "precos_beneficio_beneficio_id_fkey";
            columns: ["beneficio_id"];
            isOneToOne: false;
            referencedRelation: "beneficios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "precos_beneficio_versao_fkey";
            columns: ["versao"];
            isOneToOne: false;
            referencedRelation: "catalogo_versoes";
            referencedColumns: ["versao"];
          },
        ];
      };
      reatribuicoes: {
        Row: {
          aberto_por: string | null;
          analisado_em: string | null;
          analisado_por: string | null;
          atualizado_em: string;
          carteira_destino: string;
          carteira_origem: string;
          criado_em: string;
          executavel_apos: string | null;
          id: string;
          id_on_chain: number | null;
          justificativa: string;
          motivo: Database["public"]["Enums"]["motivo_reatribuicao"];
          motivo_on_chain: string | null;
          parecer: string | null;
          passkey_chave_publica: string | null;
          passkey_id: string | null;
          quantidade: number;
          status: Database["public"]["Enums"]["status_reatribuicao"];
          titular_id: string;
          tx_anuncio: string | null;
          tx_execucao: string | null;
        };
        Insert: {
          aberto_por?: string | null;
          analisado_em?: string | null;
          analisado_por?: string | null;
          atualizado_em?: string;
          carteira_destino: string;
          carteira_origem: string;
          criado_em?: string;
          executavel_apos?: string | null;
          id?: string;
          id_on_chain?: number | null;
          justificativa: string;
          motivo: Database["public"]["Enums"]["motivo_reatribuicao"];
          motivo_on_chain?: string | null;
          parecer?: string | null;
          passkey_chave_publica?: string | null;
          passkey_id?: string | null;
          quantidade: number;
          status?: Database["public"]["Enums"]["status_reatribuicao"];
          titular_id: string;
          tx_anuncio?: string | null;
          tx_execucao?: string | null;
        };
        Update: {
          aberto_por?: string | null;
          analisado_em?: string | null;
          analisado_por?: string | null;
          atualizado_em?: string;
          carteira_destino?: string;
          carteira_origem?: string;
          criado_em?: string;
          executavel_apos?: string | null;
          id?: string;
          id_on_chain?: number | null;
          justificativa?: string;
          motivo?: Database["public"]["Enums"]["motivo_reatribuicao"];
          motivo_on_chain?: string | null;
          parecer?: string | null;
          passkey_chave_publica?: string | null;
          passkey_id?: string | null;
          quantidade?: number;
          status?: Database["public"]["Enums"]["status_reatribuicao"];
          titular_id?: string;
          tx_anuncio?: string | null;
          tx_execucao?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reatribuicoes_aberto_por_fkey";
            columns: ["aberto_por"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reatribuicoes_analisado_por_fkey";
            columns: ["analisado_por"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reatribuicoes_titular_id_fkey";
            columns: ["titular_id"];
            isOneToOne: false;
            referencedRelation: "titulares";
            referencedColumns: ["id"];
          },
        ];
      };
      resgates: {
        Row: {
          assinatura: string | null;
          atualizado_em: string;
          beneficio_id: string;
          cancelado_em: string | null;
          cancelado_por: string | null;
          carteira_id: string;
          criado_em: string;
          custo: number;
          entregue_em: string | null;
          entregue_por: string | null;
          erro: string | null;
          id: string;
          motivo_cancelamento: string | null;
          nonce: number | null;
          perfil_id: string;
          status: Database["public"]["Enums"]["status_resgate"];
          tx_hash: string | null;
          valido_ate: string | null;
          versao: number;
        };
        Insert: {
          assinatura?: string | null;
          atualizado_em?: string;
          beneficio_id: string;
          cancelado_em?: string | null;
          cancelado_por?: string | null;
          carteira_id: string;
          criado_em?: string;
          custo: number;
          entregue_em?: string | null;
          entregue_por?: string | null;
          erro?: string | null;
          id?: string;
          motivo_cancelamento?: string | null;
          nonce?: number | null;
          perfil_id: string;
          status?: Database["public"]["Enums"]["status_resgate"];
          tx_hash?: string | null;
          valido_ate?: string | null;
          versao: number;
        };
        Update: {
          assinatura?: string | null;
          atualizado_em?: string;
          beneficio_id?: string;
          cancelado_em?: string | null;
          cancelado_por?: string | null;
          carteira_id?: string;
          criado_em?: string;
          custo?: number;
          entregue_em?: string | null;
          entregue_por?: string | null;
          erro?: string | null;
          id?: string;
          motivo_cancelamento?: string | null;
          nonce?: number | null;
          perfil_id?: string;
          status?: Database["public"]["Enums"]["status_resgate"];
          tx_hash?: string | null;
          valido_ate?: string | null;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "resgates_beneficio_id_fkey";
            columns: ["beneficio_id"];
            isOneToOne: false;
            referencedRelation: "beneficios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resgates_cancelado_por_fkey";
            columns: ["cancelado_por"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resgates_carteira_id_fkey";
            columns: ["carteira_id"];
            isOneToOne: false;
            referencedRelation: "carteiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resgates_entregue_por_fkey";
            columns: ["entregue_por"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resgates_perfil_id_fkey";
            columns: ["perfil_id"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resgates_versao_beneficio_id_fkey";
            columns: ["versao", "beneficio_id"];
            isOneToOne: false;
            referencedRelation: "precos_beneficio";
            referencedColumns: ["versao", "beneficio_id"];
          },
        ];
      };
      titulares: {
        Row: {
          analisado_em: string | null;
          analisado_por: string | null;
          atualizado_em: string;
          cpf: string;
          criado_em: string;
          data_nascimento: string;
          declaracao_profissional_aceita_em: string | null;
          declaracao_profissional_versao: string | null;
          id: string;
          identificador: string;
          motivo_reprovacao: string | null;
          nome_completo: string;
          perfil_id: string;
          status: Database["public"]["Enums"]["status_kyc"];
          telefone: string | null;
        };
        Insert: {
          analisado_em?: string | null;
          analisado_por?: string | null;
          atualizado_em?: string;
          cpf: string;
          criado_em?: string;
          data_nascimento: string;
          declaracao_profissional_aceita_em?: string | null;
          declaracao_profissional_versao?: string | null;
          id?: string;
          identificador?: string;
          motivo_reprovacao?: string | null;
          nome_completo: string;
          perfil_id: string;
          status?: Database["public"]["Enums"]["status_kyc"];
          telefone?: string | null;
        };
        Update: {
          analisado_em?: string | null;
          analisado_por?: string | null;
          atualizado_em?: string;
          cpf?: string;
          criado_em?: string;
          data_nascimento?: string;
          declaracao_profissional_aceita_em?: string | null;
          declaracao_profissional_versao?: string | null;
          id?: string;
          identificador?: string;
          motivo_reprovacao?: string | null;
          nome_completo?: string;
          perfil_id?: string;
          status?: Database["public"]["Enums"]["status_kyc"];
          telefone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "titulares_analisado_por_fkey";
            columns: ["analisado_por"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "titulares_perfil_id_fkey";
            columns: ["perfil_id"];
            isOneToOne: true;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
      transacoes: {
        Row: {
          bloco: number | null;
          carteira_id: string | null;
          confirmada_em: string | null;
          criado_em: string;
          dados: NonNullable<Json>;
          erro: string | null;
          id: string;
          perfil_id: string | null;
          status: Database["public"]["Enums"]["status_transacao"];
          tipo: Database["public"]["Enums"]["tipo_transacao"];
          tx_hash: string;
        };
        Insert: {
          bloco?: number | null;
          carteira_id?: string | null;
          confirmada_em?: string | null;
          criado_em?: string;
          dados?: NonNullable<Json>;
          erro?: string | null;
          id?: string;
          perfil_id?: string | null;
          status?: Database["public"]["Enums"]["status_transacao"];
          tipo: Database["public"]["Enums"]["tipo_transacao"];
          tx_hash: string;
        };
        Update: {
          bloco?: number | null;
          carteira_id?: string | null;
          confirmada_em?: string | null;
          criado_em?: string;
          dados?: NonNullable<Json>;
          erro?: string | null;
          id?: string;
          perfil_id?: string | null;
          status?: Database["public"]["Enums"]["status_transacao"];
          tipo?: Database["public"]["Enums"]["tipo_transacao"];
          tx_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transacoes_carteira_id_fkey";
            columns: ["carteira_id"];
            isOneToOne: false;
            referencedRelation: "carteiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transacoes_perfil_id_fkey";
            columns: ["perfil_id"];
            isOneToOne: false;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      gravar_versao_do_catalogo: {
        Args: {
          p_conteudo: string;
          p_hash_tabela: string;
          p_precos: Json;
          p_publicada_em: string;
          p_tx_publicacao: string;
          p_versao: number;
        };
        Returns: undefined;
      };
      opcoes_da_auditoria: {
        Args: Record<PropertyKey, never>;
        Returns: {
          tipo: string;
          valor: string;
        }[];
      };
    };
    Enums: {
      documento_aceite: "memorando_de_oferta" | "termo_de_riscos";
      motivo_reatribuicao: "perda_de_acesso" | "sucessao" | "ordem_judicial";
      papel_usuario: "investidor" | "operador" | "administrador";
      status_carteira: "pendente" | "habilitada" | "desabilitada";
      status_kyc: "pendente" | "em_analise" | "aprovado" | "reprovado";
      status_reatribuicao:
        | "aberta"
        | "em_analise"
        | "anunciada"
        | "executada"
        | "cancelada"
        | "recusada";
      status_resgate: "assinado" | "submetido" | "confirmado" | "falhou" | "entregue" | "cancelado";
      status_transacao: "pendente" | "confirmada" | "revertida";
      tipo_carteira: "embutida" | "externa";
      tipo_transacao:
        | "habilitacao"
        | "desabilitacao"
        | "compra_oferta"
        | "compra_recolocacao"
        | "revenda_oferta"
        | "revenda_indicacao"
        | "revenda_liquidacao"
        | "saque_pendente"
        | "resgate_beneficio"
        | "revenda_cancelamento";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      documento_aceite: ["memorando_de_oferta", "termo_de_riscos"],
      motivo_reatribuicao: ["perda_de_acesso", "sucessao", "ordem_judicial"],
      papel_usuario: ["investidor", "operador", "administrador"],
      status_carteira: ["pendente", "habilitada", "desabilitada"],
      status_kyc: ["pendente", "em_analise", "aprovado", "reprovado"],
      status_reatribuicao: [
        "aberta",
        "em_analise",
        "anunciada",
        "executada",
        "cancelada",
        "recusada",
      ],
      status_resgate: ["assinado", "submetido", "confirmado", "falhou", "entregue", "cancelado"],
      status_transacao: ["pendente", "confirmada", "revertida"],
      tipo_carteira: ["embutida", "externa"],
      tipo_transacao: [
        "habilitacao",
        "desabilitacao",
        "compra_oferta",
        "compra_recolocacao",
        "revenda_oferta",
        "revenda_indicacao",
        "revenda_liquidacao",
        "saque_pendente",
        "resgate_beneficio",
        "revenda_cancelamento",
      ],
    },
  },
} as const;

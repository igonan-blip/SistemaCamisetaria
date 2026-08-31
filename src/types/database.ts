// Tipos gerados manualmente a partir do schema da Etapa 2.
// Quando o Supabase CLI estiver disponível localmente, estes tipos podem
// ser substituídos por `supabase gen types typescript`.

export type UserRole = "admin" | "funcionario";

export type StatusPagamento = "pendente" | "parcialmente_pago" | "pago" | "atrasado";

export type FormaPagamento =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "transferencia"
  | "outro";

export type CategoriaTamanho = "infantil" | "adulto" | "baby_look";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tamanho {
  id: string;
  nome: string;
  categoria: CategoriaTamanho;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EtapaProducao {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
  identificador_visual: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nome_empresa: string;
  nome_responsavel: string | null;
  telefone: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}


export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado" | "convertido";

export interface Orcamento {
  id: string;
  numero_orcamento: number;
  cliente_id: string;
  data_emissao: string;
  validade_dias: number;
  data_validade: string;
  status: StatusOrcamento;
  condicao_pagamento: string | null;
  percentual_desconto_avista: number;
  prazo_producao_dias: number | null;
  previsao_entrega: string | null;
  observacoes: string | null;
  valor_subtotal: number;
  valor_desconto: number;
  valor_total: number;
  pedido_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemOrcamento {
  id: string;
  orcamento_id: string;
  produto_id: string;
  modelo: string | null;
  cor: string | null;
  tecido: string | null;
  tipo_manga: string | null;
  personalizacao: string | null;
  observacoes: string | null;
  quantidade_total: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
}

export interface QuantidadeOrcamento {
  id: string;
  item_orcamento_id: string;
  tamanho_id: string;
  quantidade: number;
  created_at: string;
  updated_at: string;
}

export interface Pedido {
  id: string;
  numero_pedido: number;
  cliente_id: string;
  etapa_id: string;
  data_pedido: string;
  data_entrega: string | null;
  observacoes: string | null;
  valor_subtotal: number;
  valor_desconto: number;
  valor_total: number;
  status_pagamento: StatusPagamento;
  created_at: string;
  updated_at: string;
}

export interface ItemPedido {
  id: string;
  pedido_id: string;
  produto_id: string;
  modelo: string | null;
  cor: string | null;
  tecido: string | null;
  tipo_manga: string | null;
  observacoes: string | null;
  quantidade_total: number;
  valor_unitario: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
}

export interface QuantidadePedido {
  id: string;
  item_pedido_id: string;
  tamanho_id: string;
  quantidade: number;
  created_at: string;
  updated_at: string;
}

export interface Arte {
  id: string;
  pedido_id: string;
  nome_arquivo: string;
  arquivo_path: string;
  tipo_arquivo: string | null;
  tamanho_arquivo: number | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pagamento {
  id: string;
  pedido_id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: FormaPagamento;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoPedido {
  id: string;
  pedido_id: string;
  etapa_anterior_id: string | null;
  etapa_nova_id: string;
  usuario_id: string | null;
  observacao: string | null;
  created_at: string;
}

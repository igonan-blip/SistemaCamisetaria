import { supabase } from "@/lib/supabase";
import type { Cliente, EtapaProducao, Pagamento, Pedido, Produto, StatusPagamento, Tamanho } from "@/types/database";

export const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

export const dateBR = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR") : "—";

export async function getClientes() {
  const { data, error } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome_empresa");
  if (error) throw error;
  return (data || []) as Cliente[];
}

export async function getProdutos() {
  const { data, error } = await supabase.from("produtos").select("*").order("nome");
  if (error) throw error;
  return (data || []) as Produto[];
}

export async function getTamanhos() {
  const { data, error } = await supabase.from("tamanhos").select("*").order("categoria").order("ordem");
  if (error) throw error;
  return (data || []) as Tamanho[];
}

export async function getEtapas() {
  const { data, error } = await supabase.from("etapas_producao").select("*").eq("ativo", true).order("ordem");
  if (error) throw error;
  return (data || []) as EtapaProducao[];
}

export async function getPedidos() {
  const { data, error } = await supabase.from("pedidos").select("*, clientes(nome_empresa), etapas_producao(nome,slug)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as (Pedido & { clientes: { nome_empresa: string } | null; etapas_producao: { nome: string; slug: string } | null })[];
}

export async function getPedidoCompleto(id: string) {
  const [pedido, itens, pagamentos, artes, movimentos] = await Promise.all([
    supabase.from("pedidos").select("*, clientes(*), etapas_producao(*)").eq("id", id).single(),
    supabase.from("itens_pedido").select("*, produtos(*), quantidades_pedido(*, tamanhos(*))").eq("pedido_id", id),
    supabase.from("pagamentos").select("*").eq("pedido_id", id).order("data_pagamento", { ascending: false }),
    supabase.from("artes").select("*").eq("pedido_id", id).order("created_at", { ascending: false }),
    supabase.from("movimentacoes_pedido").select("*, etapas_anterior:etapas_producao!etapa_anterior_id(nome), etapas_nova:etapas_producao!etapa_nova_id(nome)").eq("pedido_id", id).order("created_at", { ascending: false }),
  ]);
  if (pedido.error) throw pedido.error;
  if (itens.error) throw itens.error;
  if (pagamentos.error) throw pagamentos.error;
  if (artes.error) throw artes.error;
  if (movimentos.error) throw movimentos.error;
  return { pedido: pedido.data, itens: itens.data || [], pagamentos: (pagamentos.data || []) as Pagamento[], artes: artes.data || [], movimentos: movimentos.data || [] };
}

export async function createPedido(input: {
  cliente_id: string; etapa_id: string; data_pedido: string; data_entrega?: string; observacoes?: string;
  valor_desconto: number; itens: Array<{ produto_id: string; modelo?: string; cor?: string; tecido?: string; tipo_manga?: string; observacoes?: string; valor_unitario: number; quantidades: Array<{ tamanho_id: string; quantidade: number }> }>;
}) {
  const subtotal = input.itens.reduce((sum, item) => sum + item.valor_unitario * item.quantidades.reduce((n, q) => n + q.quantidade, 0), 0);
  const desconto = Math.max(0, input.valor_desconto || 0);
  const total = Math.max(0, subtotal - desconto);
  const { data: pedido, error } = await supabase.from("pedidos").insert({ cliente_id: input.cliente_id, etapa_id: input.etapa_id, data_pedido: input.data_pedido, data_entrega: input.data_entrega || null, observacoes: input.observacoes || null, valor_subtotal: subtotal, valor_desconto: desconto, valor_total: total, status_pagamento: "pendente" }).select().single();
  if (error) throw error;
  for (const item of input.itens) {
    const quantidadeTotal = item.quantidades.reduce((n, q) => n + q.quantidade, 0);
    const { data: created, error: itemError } = await supabase.from("itens_pedido").insert({ pedido_id: pedido.id, produto_id: item.produto_id, modelo: item.modelo || null, cor: item.cor || null, tecido: item.tecido || null, tipo_manga: item.tipo_manga || null, observacoes: item.observacoes || null, quantidade_total: quantidadeTotal, valor_unitario: item.valor_unitario, valor_total: quantidadeTotal * item.valor_unitario }).select().single();
    if (itemError) throw itemError;
    const rows = item.quantidades.filter(q => q.quantidade > 0).map(q => ({ item_pedido_id: created.id, tamanho_id: q.tamanho_id, quantidade: q.quantidade }));
    if (rows.length) { const { error: qError } = await supabase.from("quantidades_pedido").insert(rows); if (qError) throw qError; }
  }
  return pedido as Pedido;
}

export async function movePedido(pedidoId: string, etapaId: string, observacao?: string) {
  const { data: current, error: currentError } = await supabase.from("pedidos").select("etapa_id").eq("id", pedidoId).single();
  if (currentError) throw currentError;
  if (current.etapa_id === etapaId) return;
  const { error } = await supabase.from("pedidos").update({ etapa_id: etapaId }).eq("id", pedidoId);
  if (error) throw error;
  const { data: user } = await supabase.auth.getUser();
  const { error: historyError } = await supabase.from("movimentacoes_pedido").insert({ pedido_id: pedidoId, etapa_anterior_id: current.etapa_id, etapa_nova_id: etapaId, usuario_id: user.user?.id || null, observacao: observacao || null });
  if (historyError) throw historyError;
}

export async function addPayment(pedidoId: string, valor: number, forma_pagamento: string, data_pagamento: string, observacoes?: string) {
  if (valor <= 0) throw new Error("O valor do pagamento deve ser maior que zero.");
  const { error } = await supabase.from("pagamentos").insert({ pedido_id: pedidoId, valor, forma_pagamento, data_pagamento, observacoes: observacoes || null });
  if (error) throw error;
  const { data: pedido } = await supabase.from("pedidos").select("valor_total").eq("id", pedidoId).single();
  const { data: pagamentos } = await supabase.from("pagamentos").select("valor").eq("pedido_id", pedidoId);
  const pago = (pagamentos || []).reduce((s, p) => s + Number(p.valor), 0);
  const status_pagamento = pago >= Number(pedido?.valor_total || 0) ? "pago" : pago > 0 ? "parcialmente_pago" : "pendente";
  await supabase.from("pedidos").update({ status_pagamento }).eq("id", pedidoId);
}

export async function uploadArte(pedidoId: string, file: File, descricao?: string) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${pedidoId}/${crypto.randomUUID()}-${safe}`;
  const { error: uploadError } = await supabase.storage.from("artes-pedidos").upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from("artes").insert({ pedido_id: pedidoId, nome_arquivo: file.name, arquivo_path: path, tipo_arquivo: file.type || null, tamanho_arquivo: file.size, descricao: descricao || null });
  if (error) { await supabase.storage.from("artes-pedidos").remove([path]); throw error; }
}

export async function arteUrl(path: string) {
  const { data, error } = await supabase.storage.from("artes-pedidos").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteArte(id: string, path: string) {
  const { error } = await supabase.from("artes").delete().eq("id", id);
  if (error) throw error;
  const { error: storageError } = await supabase.storage.from("artes-pedidos").remove([path]);
  if (storageError) throw storageError;
}

// ---------------------------------------------------------------------------
// Etapa 7 — Kanban: prazo e histórico
// ---------------------------------------------------------------------------

export type PrazoStatus = "sem_prazo" | "normal" | "atencao" | "urgente" | "atrasado";

export function diasRestantes(dataEntrega: string | null | undefined): number | null {
  if (!dataEntrega) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const entrega = new Date(`${dataEntrega}T00:00:00`);
  return Math.round((entrega.getTime() - hoje.getTime()) / 86400000);
}

export function prazoStatus(dataEntrega: string | null | undefined, etapaSlug?: string | null): PrazoStatus {
  if (etapaSlug === "entregue") return "normal";
  const dias = diasRestantes(dataEntrega);
  if (dias === null) return "sem_prazo";
  if (dias < 0) return "atrasado";
  if (dias <= 1) return "urgente";
  if (dias <= 3) return "atencao";
  return "normal";
}

export const PRAZO_LABEL: Record<PrazoStatus, string> = {
  sem_prazo: "Sem prazo",
  normal: "No prazo",
  atencao: "Atenção",
  urgente: "Urgente",
  atrasado: "Atrasado",
};

export const PRAZO_CLASS: Record<PrazoStatus, string> = {
  sem_prazo: "border-ink-700/10 bg-white text-text-500",
  normal: "border-teal-500/30 bg-teal-500/10 text-teal-600",
  atencao: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  urgente: "border-brick-500/40 bg-brick-500/10 text-brick-500",
  atrasado: "border-brick-500 bg-brick-500 text-white",
};

export async function getPedidosResumo() {
  const [pedidosRes, itensRes, pagamentosRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("*, clientes(nome_empresa, nome_responsavel), etapas_producao(nome, slug, ordem)")
      .order("data_entrega", { ascending: true, nullsFirst: false }),
    supabase.from("itens_pedido").select("pedido_id, quantidade_total"),
    supabase.from("pagamentos").select("pedido_id, valor"),
  ]);
  if (pedidosRes.error) throw pedidosRes.error;
  if (itensRes.error) throw itensRes.error;
  if (pagamentosRes.error) throw pagamentosRes.error;

  const pecasPorPedido = new Map<string, number>();
  for (const item of itensRes.data || []) {
    pecasPorPedido.set(item.pedido_id, (pecasPorPedido.get(item.pedido_id) || 0) + Number(item.quantidade_total));
  }
  const pagoPorPedido = new Map<string, number>();
  for (const pagamento of pagamentosRes.data || []) {
    pagoPorPedido.set(pagamento.pedido_id, (pagoPorPedido.get(pagamento.pedido_id) || 0) + Number(pagamento.valor));
  }

  return (pedidosRes.data || []).map((pedido: any) => {
    const pago = pagoPorPedido.get(pedido.id) || 0;
    return {
      ...pedido,
      quantidade_pecas: pecasPorPedido.get(pedido.id) || 0,
      valor_pago: pago,
      valor_saldo: Number(pedido.valor_total) - pago,
    };
  });
}

export async function getMovimentacoes(pedidoId: string) {
  const { data, error } = await supabase
    .from("movimentacoes_pedido")
    .select("*, etapas_anterior:etapas_producao!etapa_anterior_id(nome), etapas_nova:etapas_producao!etapa_nova_id(nome)")
    .eq("pedido_id", pedidoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------------------------------------------------------------------------
// Etapa 8 — Financeiro: status e período
// ---------------------------------------------------------------------------

export function statusFinanceiro(pedido: { valor_total: number; data_entrega: string | null }, valorPago: number): StatusPagamento {
  const total = Number(pedido.valor_total);
  if (valorPago <= 0) {
    if (pedido.data_entrega && diasRestantes(pedido.data_entrega)! < 0) return "atrasado";
    return "pendente";
  }
  if (valorPago >= total) return "pago";
  if (pedido.data_entrega && diasRestantes(pedido.data_entrega)! < 0) return "atrasado";
  return "parcialmente_pago";
}

export const STATUS_FINANCEIRO_LABEL: Record<StatusPagamento, string> = {
  pendente: "Pendente",
  parcialmente_pago: "Parcialmente pago",
  pago: "Pago",
  atrasado: "Atrasado",
};

// ---------------------------------------------------------------------------
// Etapa 9 — Dashboard: recorte por período
// ---------------------------------------------------------------------------

export type PeriodoDashboard = "hoje" | "semana" | "mes" | "mes_anterior" | "personalizado";

export function intervaloPeriodo(periodo: PeriodoDashboard, inicioCustom?: string, fimCustom?: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (periodo === "hoje") {
    return { inicio: fmt(hoje), fim: fmt(hoje) };
  }
  if (periodo === "semana") {
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - hoje.getDay());
    return { inicio: fmt(inicio), fim: fmt(hoje) };
  }
  if (periodo === "mes") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return { inicio: fmt(inicio), fim: fmt(hoje) };
  }
  if (periodo === "mes_anterior") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { inicio: fmt(inicio), fim: fmt(fim) };
  }
  return { inicio: inicioCustom || fmt(hoje), fim: fimCustom || fmt(hoje) };
}

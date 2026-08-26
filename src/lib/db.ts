import { supabase } from "@/lib/supabase";
HEAD
import type {
  Cliente,
  EtapaProducao,
  Pagamento,
  Pedido,
  Produto,
  Tamanho,
} from "@/types/database";

import type { Cliente, EtapaProducao, Pagamento, Pedido, Produto, Tamanho } from "@/types/database";


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

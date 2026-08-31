import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Cliente, Produto, Tamanho, Orcamento } from "@/types/database";

type DraftItem = {
  produto_id: string;
  modelo: string;
  cor: string;
  tecido: string;
  tipo_manga: string;
  personalizacao: string;
  observacoes: string;
  valor_unitario: string;
  quantidades: Record<string, number>;
};

type FullQuote = Orcamento & {
  cliente: Cliente;
  itens: Array<DraftItem & {
    nome_produto: string;
    quantidade_total: number;
    valor_total: number;
    grade: string;
  }>;
};

const emptyItem = (): DraftItem => ({
  produto_id: "",
  modelo: "",
  cor: "",
  tecido: "",
  tipo_manga: "",
  personalizacao: "Estampa frente",
  observacoes: "",
  valor_unitario: "",
  quantidades: {},
});

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const dateBr = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "—";

const isoDate = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const addDays = (base: string, days: number) => {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return isoDate(d);
};

function statusLabel(status: Orcamento["status"]) {
  return {
    rascunho: "Rascunho",
    enviado: "Enviado",
    aprovado: "Aprovado",
    recusado: "Recusado",
    convertido: "Convertido",
  }[status];
}

function statusClass(status: Orcamento["status"]) {
  if (status === "aprovado") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "convertido") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "recusado") return "bg-red-50 text-red-700 border-red-200";
  if (status === "enviado") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-paper-100 text-text-600 border-ink-700/10";
}

export function Orcamentos() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Array<Orcamento & { clientes: Cliente }>>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tamanhos, setTamanhos] = useState<Tamanho[]>([]);
  const [etapaInicial, setEtapaInicial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<FullQuote | null>(null);
  const [error, setError] = useState("");

  const today = isoDate(new Date());
  const [form, setForm] = useState({
    cliente_id: "",
    validade_dias: "7",
    condicao_pagamento: "50% de entrada + 50% na entrega",
    percentual_desconto_avista: "5",
    prazo_producao_dias: "15",
    previsao_entrega: addDays(today, 15),
    observacoes: "",
    items: [emptyItem()],
  });

  const subtotal = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const qtd = Object.values(item.quantidades).reduce((a, b) => a + Number(b || 0), 0);
        return sum + qtd * Number(item.valor_unitario || 0);
      }, 0),
    [form.items]
  );

  const desconto = form.condicao_pagamento === "À vista" ? subtotal * (Number(form.percentual_desconto_avista) / 100) : 0;
  const total = Math.max(0, subtotal - desconto);

  async function loadData() {
    setLoading(true);
    setError("");
    const [q, c, p, t, e] = await Promise.all([
      supabase.from("orcamentos").select("*, clientes(*)").order("created_at", { ascending: false }),
      supabase.from("clientes").select("*").eq("ativo", true).order("nome_empresa"),
      supabase.from("produtos").select("*").eq("ativo", true).order("nome"),
      supabase.from("tamanhos").select("*").eq("ativo", true).order("ordem"),
      supabase.from("etapas_producao").select("id").eq("ativo", true).order("ordem").limit(1).single(),
    ]);
    if (q.error) setError(q.error.message);
    setQuotes((q.data ?? []) as Array<Orcamento & { clientes: Cliente }>);
    setClientes((c.data ?? []) as Cliente[]);
    setProdutos((p.data ?? []) as Produto[]);
    setTamanhos((t.data ?? []) as Tamanho[]);
    setEtapaInicial(e.data?.id ?? "");
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setForm((f) => ({ ...f, items: f.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));
  }

  function updateQty(index: number, sizeId: string, value: number) {
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) => ({
        ...item,
        quantidades: i === index ? { ...item.quantidades, [sizeId]: Math.max(0, Number(value) || 0) } : item.quantidades,
      })),
    }));
  }

  async function createQuote(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.cliente_id) return setError("Selecione um cliente.");
    if (!form.items.every((item) => item.produto_id && Number(item.valor_unitario) >= 0)) {
      return setError("Preencha o produto e o valor unitário de todos os itens.");
    }
    if (subtotal <= 0) return setError("Informe ao menos uma quantidade maior que zero.");
    setSaving(true);

    const items = form.items.map((item) => ({
      produto_id: item.produto_id,
      modelo: item.modelo,
      cor: item.cor,
      tecido: item.tecido,
      tipo_manga: item.tipo_manga,
      personalizacao: item.personalizacao,
      observacoes: item.observacoes,
      valor_unitario: Number(item.valor_unitario),
      quantidades: Object.entries(item.quantidades)
        .filter(([, qtd]) => Number(qtd) > 0)
        .map(([tamanho_id, quantidade]) => ({ tamanho_id, quantidade: Number(quantidade) })),
    }));

    const { data, error: rpcError } = await supabase.rpc("criar_orcamento_completo", {
      p_cliente_id: form.cliente_id,
      p_validade_dias: Number(form.validade_dias),
      p_condicao_pagamento: form.condicao_pagamento,
      p_percentual_desconto_avista: Number(form.percentual_desconto_avista),
      p_prazo_producao_dias: Number(form.prazo_producao_dias),
      p_previsao_entrega: form.previsao_entrega || null,
      p_observacoes: form.observacoes || null,
      p_valor_desconto: desconto,
      p_itens: items,
    } as never);

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    setForm({
      cliente_id: "",
      validade_dias: "7",
      condicao_pagamento: "50% de entrada + 50% na entrega",
      percentual_desconto_avista: "5",
      prazo_producao_dias: "15",
      previsao_entrega: addDays(today, 15),
      observacoes: "",
      items: [emptyItem()],
    });
    await loadData();

    if (data) {
      await openQuote(data as string);
    }
  }

  async function openQuote(id: string) {
    setError("");
    const { data, error: quoteError } = await supabase
      .from("orcamentos")
      .select("*, clientes(*)")
      .eq("id", id)
      .single();
    if (quoteError || !data) return setError(quoteError?.message ?? "Orçamento não encontrado.");

    const { data: items, error: itemsError } = await supabase
      .from("itens_orcamento")
      .select("*, produtos(nome), quantidades_orcamento(quantidade, tamanhos(nome, ordem))")
      .eq("orcamento_id", id);

    if (itemsError) return setError(itemsError.message);

    const fullItems = (items ?? []).map((item: any) => ({
      produto_id: item.produto_id,
      modelo: item.modelo ?? "",
      cor: item.cor ?? "",
      tecido: item.tecido ?? "",
      tipo_manga: item.tipo_manga ?? "",
      personalizacao: item.personalizacao ?? "",
      observacoes: item.observacoes ?? "",
      valor_unitario: String(item.valor_unitario ?? 0),
      quantidades: {},
      nome_produto: item.produtos?.nome ?? "Produto",
      quantidade_total: Number(item.quantidade_total ?? 0),
      valor_total: Number(item.valor_total ?? 0),
      grade: (item.quantidades_orcamento ?? [])
        .sort((a: any, b: any) => Number(a.tamanhos?.ordem ?? 0) - Number(b.tamanhos?.ordem ?? 0))
        .map((q: any) => `${q.quantidade} ${q.tamanhos?.nome ?? ""}`.trim())
        .join("  "),
    }));

    setSelected({ ...(data as Orcamento & { cliente: Cliente }), itens: fullItems });
  }

  async function convertToOrder() {
    if (!selected || !etapaInicial) return;
    setError("");
    const { data, error: conversionError } = await supabase.rpc("converter_orcamento_em_pedido", {
      p_orcamento_id: selected.id,
      p_etapa_id: etapaInicial,
    });
    if (conversionError) {
      setError(conversionError.message);
      return;
    }
    await loadData();
    setSelected(null);
    navigate(`/pedidos?pedido=${data}`);
  }

  function resetAndOpenForm() {
    setError("");
    setShowForm(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-text-500">Propostas comerciais</p>
          <h2 className="font-display text-2xl font-semibold">Orçamentos</h2>
        </div>
        <button className="btn-primary" onClick={resetAndOpenForm}>+ Novo orçamento</button>
      </div>

      {error && <div className="rounded-tag border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-text-500">Carregando orçamentos...</div>
        ) : quotes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-display text-lg font-semibold">Nenhum orçamento ainda</p>
            <p className="mt-1 text-sm text-text-500">Crie sua primeira proposta comercial para um cliente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-ink-700/10 bg-paper-50 text-left text-xs uppercase tracking-wide text-text-500">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Emissão</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-ink-700/5 last:border-0 hover:bg-paper-50">
                    <td className="px-4 py-3 font-mono font-semibold">#{q.numero_orcamento}</td>
                    <td className="px-4 py-3 font-medium">{q.clientes?.nome_empresa ?? "—"}</td>
                    <td className="px-4 py-3">{dateBr(q.data_emissao)}</td>
                    <td className="px-4 py-3">{dateBr(q.data_validade)}</td>
                    <td className="px-4 py-3 font-semibold">{brl(Number(q.valor_total))}</td>
                    <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-xs ${statusClass(q.status)}`}>{statusLabel(q.status)}</span></td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-secondary !px-3 !py-1.5" onClick={() => void openQuote(q.id)}>Abrir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-ink-900/50 p-4">
          <div className="mx-auto max-w-6xl rounded-tag bg-paper-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-700/10 px-6 py-4">
              <div><h3 className="font-display text-xl font-semibold">Novo orçamento</h3><p className="text-sm text-text-500">Monte a proposta e gere o PDF para enviar ao cliente.</p></div>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Fechar</button>
            </div>
            <form onSubmit={createQuote} className="space-y-6 p-6">
              <section className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium">Cliente
                  <select className="input mt-1" value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_empresa} — {c.nome_responsavel ?? ""}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Validade
                  <select className="input mt-1" value={form.validade_dias} onChange={(e) => setForm({ ...form, validade_dias: e.target.value })}>
                    {[3, 5, 7, 10, 15, 30].map((d) => <option key={d} value={d}>{d} dias</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Prazo de produção
                  <input className="input mt-1" type="number" min="1" value={form.prazo_producao_dias} onChange={(e) => setForm({ ...form, prazo_producao_dias: e.target.value, previsao_entrega: addDays(today, Number(e.target.value)) })} />
                </label>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium">Condição de pagamento
                  <select className="input mt-1" value={form.condicao_pagamento} onChange={(e) => setForm({ ...form, condicao_pagamento: e.target.value })}>
                    <option>50% de entrada + 50% na entrega</option>
                    <option>À vista</option>
                    <option>3x sem juros no cartão</option>
                  </select>
                </label>
                <label className="text-sm font-medium">Desconto à vista
                  <input className="input mt-1" type="number" min="0" step="0.01" value={form.percentual_desconto_avista} onChange={(e) => setForm({ ...form, percentual_desconto_avista: e.target.value })} />
                </label>
                <label className="text-sm font-medium">Previsão de entrega
                  <input className="input mt-1" type="date" value={form.previsao_entrega} onChange={(e) => setForm({ ...form, previsao_entrega: e.target.value })} />
                </label>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between"><h4 className="font-display font-semibold">Itens do orçamento</h4><button type="button" className="btn-secondary" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>+ Adicionar item</button></div>
                {form.items.map((item, index) => {
                  const itemQty = Object.values(item.quantidades).reduce((a, b) => a + Number(b || 0), 0);
                  const itemTotal = itemQty * Number(item.valor_unitario || 0);
                  return (
                    <div key={index} className="rounded-tag border border-ink-700/10 bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <label className="text-sm font-medium md:col-span-2">Produto
                          <select className="input mt-1" value={item.produto_id} onChange={(e) => updateItem(index, { produto_id: e.target.value })}>
                            <option value="">Selecione...</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                        </label>
                        <label className="text-sm font-medium">Modelo<input className="input mt-1" value={item.modelo} onChange={(e) => updateItem(index, { modelo: e.target.value })} placeholder="Tradicional, baby look..." /></label>
                        <label className="text-sm font-medium">Tecido<input className="input mt-1" value={item.tecido} onChange={(e) => updateItem(index, { tecido: e.target.value })} placeholder="Malha PV" /></label>
                        <label className="text-sm font-medium">Cor<input className="input mt-1" value={item.cor} onChange={(e) => updateItem(index, { cor: e.target.value })} /></label>
                        <label className="text-sm font-medium">Tipo de manga<input className="input mt-1" value={item.tipo_manga} onChange={(e) => updateItem(index, { tipo_manga: e.target.value })} placeholder="Curta / longa" /></label>
                        <label className="text-sm font-medium md:col-span-2">Personalização<input className="input mt-1" value={item.personalizacao} onChange={(e) => updateItem(index, { personalizacao: e.target.value })} /></label>
                        <label className="text-sm font-medium">Valor unitário<input className="input mt-1" type="number" min="0" step="0.01" value={item.valor_unitario} onChange={(e) => updateItem(index, { valor_unitario: e.target.value })} /></label>
                      </div>
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-500">Grade de tamanhos</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
                          {tamanhos.map((size) => (
                            <label key={size.id} className="text-xs text-text-600">{size.nome}
                              <input className="input mt-1 !px-2" type="number" min="0" value={item.quantidades[size.id] ?? ""} onChange={(e) => updateQty(index, size.id, Number(e.target.value))} />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-ink-700/10 pt-3 text-sm">
                        <span>{itemQty} peças</span><strong>{brl(itemTotal)}</strong>
                        {form.items.length > 1 && <button type="button" className="text-red-600 hover:underline" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>Remover</button>}
                      </div>
                    </div>
                  );
                })}
              </section>

              <label className="block text-sm font-medium">Observações
                <textarea className="input mt-1 min-h-24" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Informações adicionais da proposta..." />
              </label>

              <div className="ml-auto max-w-sm rounded-tag border border-ink-700/10 bg-white p-4 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><strong>{brl(subtotal)}</strong></div>
                <div className="mt-2 flex justify-between"><span>Desconto</span><strong>- {brl(desconto)}</strong></div>
                <div className="mt-3 flex justify-between border-t border-ink-700/10 pt-3 text-lg"><span>Total</span><strong>{brl(total)}</strong></div>
              </div>

              <div className="flex justify-end gap-2 border-t border-ink-700/10 pt-4">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn-primary" disabled={saving}>{saving ? "Salvando..." : "Gerar orçamento"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-900/60 p-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 flex flex-wrap justify-end gap-2 print:hidden">
              <button className="btn-secondary" onClick={() => setSelected(null)}>Fechar</button>
              <button className="btn-secondary" onClick={() => window.print()}>Exportar PDF / Imprimir</button>
              {!selected.pedido_id && selected.status !== "convertido" && <button className="btn-primary" onClick={() => void convertToOrder()}>Converter em pedido</button>}
              {selected.pedido_id && <button className="btn-primary" onClick={() => navigate(`/pedidos?pedido=${selected.pedido_id}`)}>Abrir pedido</button>}
            </div>
            <div className="print-sheet bg-white p-8 shadow-2xl md:p-12">
              <div className="border-b-4 border-ink-900 pb-5">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight">ADONAI CAMISETARIA</h1>
                    <p className="mt-1 text-sm text-text-600">Uniformes personalizados para empresas, equipes e eventos</p>
                  </div>
                  <div className="text-right text-sm">
                    <p><strong>ORÇAMENTO Nº:</strong> {selected.numero_orcamento}</p>
                    <p><strong>DATA:</strong> {dateBr(selected.data_emissao)}</p>
                    <p><strong>VALIDADE:</strong> {selected.validade_dias} dias — {dateBr(selected.data_validade)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <h2 className="mb-3 border-b border-ink-900/20 pb-2 text-sm font-bold uppercase tracking-wider">Dados do cliente</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <p><strong>Empresa:</strong> {selected.cliente.nome_empresa}</p>
                  <p><strong>CNPJ:</strong> {selected.cliente.cpf_cnpj || "—"}</p>
                  <p><strong>Responsável:</strong> {selected.cliente.nome_responsavel || "—"}</p>
                  <p><strong>Telefone:</strong> {selected.cliente.telefone || "—"}</p>
                  <p className="col-span-2"><strong>Cidade:</strong> {selected.cliente.cidade || "—"}{selected.cliente.estado ? `/${selected.cliente.estado}` : ""}</p>
                </div>
              </div>

              <div className="mt-7">
                <h2 className="text-lg font-bold">Olá, {selected.cliente.nome_responsavel || "cliente"}!</h2>
                <p className="mt-2 text-sm leading-6 text-text-700">Agradecemos a oportunidade de apresentar nossa proposta. A Adonai Camisetaria trabalha para oferecer <strong>uniformes personalizados que valorizam a imagem da sua empresa, padronizam sua equipe e fortalecem sua marca.</strong></p>
              </div>

              <div className="mt-7">
                <h2 className="mb-3 border-b border-ink-900/20 pb-2 text-sm font-bold uppercase tracking-wider">Itens do orçamento</h2>
                <table className="w-full border-collapse text-xs">
                  <thead><tr className="border-y border-ink-900/20 text-left"><th className="p-2">Qtd.</th><th className="p-2">Produto</th><th className="p-2">Modelo/Tecido</th><th className="p-2">Personalização</th><th className="p-2">Grade</th><th className="p-2 text-right">Unit.</th><th className="p-2 text-right">Total</th></tr></thead>
                  <tbody>{selected.itens.map((item, i) => <tr key={i} className="border-b border-ink-900/10"><td className="p-2">{item.quantidade_total}</td><td className="p-2 font-semibold">{item.nome_produto}</td><td className="p-2">{[item.modelo, item.tecido].filter(Boolean).join(" / ") || "—"}</td><td className="p-2">{item.personalizacao || "—"}</td><td className="p-2">{item.grade || "—"}</td><td className="p-2 text-right">{brl(Number(item.valor_unitario))}</td><td className="p-2 text-right font-semibold">{brl(item.valor_total)}</td></tr>)}</tbody>
                </table>
              </div>

              <div className="mt-4 ml-auto max-w-xs text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{brl(Number(selected.valor_subtotal))}</span></div>
                <div className="mt-1 flex justify-between"><span>Desconto</span><span>- {brl(Number(selected.valor_desconto))}</span></div>
                <div className="mt-2 flex justify-between border-t-2 border-ink-900 pt-2 text-xl font-black"><span>TOTAL DO PEDIDO</span><span>{brl(Number(selected.valor_total))}</span></div>
                <p className="mt-1 text-right text-xs">Valor por peça: {brl(Number(selected.valor_total) / Math.max(1, selected.itens.reduce((s, i) => s + i.quantidade_total, 0)))}</p>
              </div>

              <div className="mt-8 grid gap-6 text-sm md:grid-cols-2">
                <div><h3 className="font-bold">PERSONALIZAÇÃO INCLUSA</h3><ul className="mt-2 space-y-1 text-text-700"><li>✓ Aplicação da logo da empresa</li><li>✓ Personalização conforme a identidade visual</li><li>✓ Arte/mockup para aprovação</li><li>✓ Grade de tamanhos conforme pedido</li><li>✓ Produção personalizada</li></ul></div>
                <div><h3 className="font-bold">PRAZO</h3><p className="mt-2 text-text-700">Prazo estimado de produção: <strong>{selected.prazo_producao_dias ?? "—"} dias úteis</strong> após a aprovação da arte e confirmação do pagamento.</p><p className="mt-1">Previsão de entrega: <strong>{dateBr(selected.previsao_entrega)}</strong></p><p className="mt-2 text-xs italic">O prazo de produção começa a contar após a aprovação final da arte.</p></div>
                <div><h3 className="font-bold">PAGAMENTO</h3><p className="mt-2">{selected.condicao_pagamento || "A combinar"}</p><p className="mt-1">À vista: <strong>{brl(Number(selected.valor_total) * (1 - Number(selected.percentual_desconto_avista) / 100))}</strong> ({selected.percentual_desconto_avista}% de desconto)</p><p className="mt-1">Parcelamento: <strong>3x sem juros no cartão</strong></p></div>
                <div><h3 className="font-bold">OBSERVAÇÕES</h3><ul className="mt-2 space-y-1 text-xs text-text-700"><li>• A produção será iniciada após a aprovação da arte pelo cliente.</li><li>• Alterações na arte após a aprovação poderão gerar novo prazo e/ou custo.</li><li>• A produção seguirá os tamanhos e quantidades aprovados no pedido.</li><li>• O prazo informado considera a disponibilidade dos materiais e a aprovação dentro do período combinado.</li><li>• Valores e condições são válidos até {dateBr(selected.data_validade)}.</li></ul>{selected.observacoes && <p className="mt-3"><strong>Observações adicionais:</strong> {selected.observacoes}</p>}</div>
              </div>

              <div className="mt-8 border-t border-ink-900/20 pt-6 text-center">
                <h2 className="text-lg font-black">POR QUE UNIFORMIZAR SUA EQUIPE?</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs md:grid-cols-4"><div><strong>PROFISSIONALISMO</strong><p className="mt-1">Organização e credibilidade.</p></div><div><strong>IDENTIDADE</strong><p className="mt-1">Fortalece sua marca.</p></div><div><strong>VISIBILIDADE</strong><p className="mt-1">Sua equipe leva sua marca.</p></div><div><strong>PADRONIZAÇÃO</strong><p className="mt-1">Todos representam a empresa.</p></div></div>
              </div>
              <div className="mt-8 rounded border border-ink-900/10 p-4 text-center text-sm"><strong>Gostou da proposta?</strong><p className="mt-1">Para confirmar seu pedido, basta entrar em contato conosco e realizar a aprovação.</p><p className="mt-3 text-lg font-black">📲 (44) 99805-1523</p><p className="font-bold">ADONAI CAMISETARIA</p><p className="italic text-text-600">Sua marca vestida com profissionalismo.</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cliente = {
  id: string; nome_empresa: string; nome_responsavel: string | null; telefone: string | null;
  cpf_cnpj: string | null; cidade: string | null; estado: string | null;
};
type Produto = { id: string; nome: string };
type Tamanho = { id: string; nome: string; categoria: string; ordem: number };
type Grade = { tamanho_id: string; quantidade: number };
type ItemForm = {
  produto_id: string; modelo: string; tecido: string; cor: string; tipo_manga: string;
  personalizacao: string; observacoes: string; valor_unitario: string; quantidades: Grade[];
};
type Orcamento = {
  id: string; numero_orcamento: number; cliente_id: string; data_emissao: string; data_validade: string;
  validade_dias: number; condicao_pagamento: string | null; percentual_desconto_avista: number;
  prazo_producao_dias: number | null; previsao_entrega: string | null; observacoes: string | null;
  valor_subtotal: number; valor_desconto: number; valor_total: number; status: string; pedido_id: string | null;
  clientes?: Cliente;
  itens_orcamento?: Array<ItemForm & { id: string; quantidade_total: number; valor_total: number; produtos?: Produto; quantidades_orcamento?: Array<{ quantidade: number; tamanhos?: Tamanho }> }>;
};

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = (v: string | null | undefined) => v ? new Date(`${v.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—";
const isoToday = () => new Date().toISOString().slice(0, 10);
const addDays = (date: string, days: number) => { const d = new Date(`${date}T00:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

const emptyItem = (): ItemForm => ({ produto_id: "", modelo: "", tecido: "", cor: "", tipo_manga: "", personalizacao: "", observacoes: "", valor_unitario: "", quantidades: [] });

export function Orcamentos() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tamanhos, setTamanhos] = useState<Tamanho[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<Orcamento | null>(null);
  const [search, setSearch] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [validadeDias, setValidadeDias] = useState(7);
  const [condicao, setCondicao] = useState("50% de entrada + 50% na entrega");
  const [prazoDias, setPrazoDias] = useState(15);
  const [previsao, setPrevisao] = useState(addDays(isoToday(), 15));
  const [observacoes, setObservacoes] = useState("");
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);

  const load = async () => {
    setLoading(true); setError("");
    const [c, p, t, o] = await Promise.all([
      supabase.from("clientes").select("id,nome_empresa,nome_responsavel,telefone,cpf_cnpj,cidade,estado").eq("ativo", true).order("nome_empresa"),
      supabase.from("produtos").select("id,nome").eq("ativo", true).order("nome"),
      supabase.from("tamanhos").select("id,nome,categoria,ordem").eq("ativo", true).order("ordem"),
      supabase.from("orcamentos").select("*,clientes(*),itens_orcamento(*,produtos(id,nome),quantidades_orcamento(*,tamanhos(*)))").order("created_at", { ascending: false }),
    ]);
    if (c.error || p.error || t.error || o.error) setError((c.error || p.error || t.error || o.error)?.message ?? "Erro ao carregar dados.");
    setClientes((c.data ?? []) as Cliente[]); setProdutos((p.data ?? []) as Produto[]); setTamanhos((t.data ?? []) as Tamanho[]); setOrcamentos((o.data ?? []) as unknown as Orcamento[]); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => {
    const qtd = item.quantidades.reduce((s, q) => s + (Number(q.quantidade) || 0), 0);
    return sum + qtd * (Number(item.valor_unitario) || 0);
  }, 0), [items]);
  const desconto = condicao === "À vista" ? subtotal * 0.05 : 0;
  const total = Math.max(0, subtotal - desconto);

  const updateItem = (index: number, patch: Partial<ItemForm>) => setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  const updateGrade = (index: number, tamanho_id: string, quantidade: number) => setItems(prev => prev.map((item, i) => {
    if (i !== index) return item;
    const next = item.quantidades.filter(q => q.tamanho_id !== tamanho_id);
    if (quantidade > 0) next.push({ tamanho_id, quantidade });
    return { ...item, quantidades: next };
  }));

  const resetForm = () => { setClienteId(""); setValidadeDias(7); setCondicao("50% de entrada + 50% na entrega"); setPrazoDias(15); setPrevisao(addDays(isoToday(), 15)); setObservacoes(""); setItems([emptyItem()]); };

  const save = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (!clienteId) return setError("Selecione um cliente.");
    if (items.some(i => !i.produto_id || !Number(i.valor_unitario) || i.quantidades.reduce((s, q) => s + q.quantidade, 0) <= 0)) return setError("Preencha produto, valor e pelo menos um tamanho em cada item.");
    setSaving(true);
    const payload = items.map(i => ({ produto_id: i.produto_id, modelo: i.modelo, tecido: i.tecido, cor: i.cor, tipo_manga: i.tipo_manga, personalizacao: i.personalizacao, observacoes: i.observacoes, valor_unitario: Number(i.valor_unitario), quantidades: i.quantidades }));
    const { data, error: rpcError } = await supabase.rpc("criar_orcamento_completo", {
      p_cliente_id: clienteId, p_validade_dias: validadeDias, p_condicao_pagamento: condicao,
      p_percentual_desconto_avista: condicao === "À vista" ? 5 : 0, p_prazo_producao_dias: prazoDias,
      p_previsao_entrega: previsao, p_observacoes: observacoes, p_valor_desconto: desconto, p_itens: payload,
    });
    setSaving(false);
    if (rpcError) return setError(rpcError.message);
    setShowForm(false); resetForm(); await load();
    if (data) { const found = orcamentos.find(o => o.id === data); if (found) setPreview(found); }
  };

  const filtered = orcamentos.filter(o => {
    const q = search.toLowerCase(); return !q || String(o.numero_orcamento).includes(q) || (o.clientes?.nome_empresa ?? "").toLowerCase().includes(q) || (o.clientes?.nome_responsavel ?? "").toLowerCase().includes(q);
  });

  const convert = async (orc: Orcamento) => {
    if (orc.pedido_id) return setError("Este orçamento já foi convertido em pedido.");
    const { data: etapa, error: etapaError } = await supabase.from("etapas_producao").select("id").eq("slug", "novo_pedido").maybeSingle();
    if (etapaError || !etapa) return setError("Não foi possível localizar a etapa inicial do pedido.");
    if (!window.confirm(`Converter o orçamento #${orc.numero_orcamento} em pedido?`)) return;
    const { data, error: rpcError } = await supabase.rpc("converter_orcamento_em_pedido", { p_orcamento_id: orc.id, p_etapa_id: etapa.id });
    if (rpcError) return setError(rpcError.message);
    await load();
    setPreview({ ...orc, status: "convertido", pedido_id: data });
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="tag mb-2">COMERCIAL</p><h1 className="text-2xl font-semibold">Orçamentos</h1><p className="mt-1 text-sm text-text-600">Crie propostas, exporte em PDF e converta em pedido quando o cliente aprovar.</p></div>
      <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Novo orçamento</button>
    </div>

    {error && <div className="rounded-tag border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="card p-4"><input className="input" placeholder="Buscar por número, empresa ou responsável..." value={search} onChange={e => setSearch(e.target.value)} /></div>

    <div className="card overflow-hidden">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-ink-700/10 bg-paper-100 text-xs uppercase tracking-wide text-text-600"><tr><th className="px-4 py-3">Nº</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Validade</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody className="divide-y divide-ink-700/10">
        {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-text-500">Carregando...</td></tr> : filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-text-500">Nenhum orçamento encontrado.</td></tr> : filtered.map(o => <tr key={o.id} className="hover:bg-paper-50"><td className="px-4 py-3 font-mono font-semibold">#{o.numero_orcamento}</td><td className="px-4 py-3"><strong>{o.clientes?.nome_empresa ?? "—"}</strong><div className="text-xs text-text-500">{o.clientes?.nome_responsavel ?? ""}</div></td><td className="px-4 py-3">{dateBR(o.data_emissao)}</td><td className="px-4 py-3">{dateBR(o.data_validade)}</td><td className="px-4 py-3 font-semibold">{money(Number(o.valor_total))}</td><td className="px-4 py-3"><span className="tag">{o.status}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button className="btn-secondary !px-3 !py-1.5" onClick={() => setPreview(o)}>Ver</button>{o.status !== "convertido" && !o.pedido_id && <button className="btn-primary !px-3 !py-1.5" onClick={() => void convert(o)}>Converter</button>}</div></td></tr>)}
      </tbody></table></div>
    </div>

    {showForm && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto my-6 max-w-6xl rounded-tag bg-paper-50 shadow-2xl"><form onSubmit={save}>
      <div className="flex items-center justify-between border-b border-ink-700/10 p-5"><div><h2 className="text-xl font-semibold">Novo orçamento</h2><p className="text-xs text-text-500">O número será gerado automaticamente pelo banco.</p></div><button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Fechar</button></div>
      <div className="space-y-6 p-5">
        <section><h3 className="mb-3 font-semibold">Dados comerciais</h3><div className="grid gap-3 md:grid-cols-4"><label className="md:col-span-2">Cliente<select className="input mt-1" value={clienteId} onChange={e => setClienteId(e.target.value)}><option value="">Selecione...</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nome_empresa} — {c.nome_responsavel ?? "Sem responsável"}</option>)}</select></label><label>Validade (dias)<input className="input mt-1" type="number" min={1} value={validadeDias} onChange={e => setValidadeDias(Number(e.target.value))} /></label><label>Prazo produção<select className="input mt-1" value={prazoDias} onChange={e => { const n=Number(e.target.value); setPrazoDias(n); setPrevisao(addDays(isoToday(), n)); }}><option value={7}>7 dias úteis</option><option value={10}>10 dias úteis</option><option value={15}>15 dias úteis</option><option value={20}>20 dias úteis</option><option value={30}>30 dias úteis</option></select></label><label>Previsão de entrega<input className="input mt-1" type="date" value={previsao} onChange={e => setPrevisao(e.target.value)} /></label><label className="md:col-span-3">Condição de pagamento<select className="input mt-1" value={condicao} onChange={e => setCondicao(e.target.value)}><option>50% de entrada + 50% na entrega</option><option>À vista</option><option>3x sem juros no cartão</option><option>PIX</option><option>Dinheiro</option><option>Transferência</option></select></label></div></section>
        <section><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Itens do orçamento</h3><button type="button" className="btn-secondary" onClick={() => setItems(prev => [...prev, emptyItem()])}>+ Adicionar item</button></div><div className="space-y-4">{items.map((item, index) => <div key={index} className="rounded-tag border border-ink-700/10 bg-white p-4"><div className="grid gap-3 md:grid-cols-4"><label>Produto<select className="input mt-1" value={item.produto_id} onChange={e => updateItem(index,{produto_id:e.target.value})}><option value="">Selecione...</option>{produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label><label>Modelo<input className="input mt-1" value={item.modelo} onChange={e=>updateItem(index,{modelo:e.target.value})} placeholder="Tradicional, gola polo..." /></label><label>Tecido<input className="input mt-1" value={item.tecido} onChange={e=>updateItem(index,{tecido:e.target.value})} placeholder="Malha PV, algodão..." /></label><label>Valor unitário<input className="input mt-1" type="number" min="0" step="0.01" value={item.valor_unitario} onChange={e=>updateItem(index,{valor_unitario:e.target.value})} placeholder="0,00" /></label><label>Cor<input className="input mt-1" value={item.cor} onChange={e=>updateItem(index,{cor:e.target.value})} /></label><label>Manga<input className="input mt-1" value={item.tipo_manga} onChange={e=>updateItem(index,{tipo_manga:e.target.value})} placeholder="Curta / longa" /></label><label className="md:col-span-2">Personalização<input className="input mt-1" value={item.personalizacao} onChange={e=>updateItem(index,{personalizacao:e.target.value})} placeholder="Estampa frente e costas, bordado..." /></label></div><div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-600">Grade de tamanhos</p><div className="flex flex-wrap gap-2">{tamanhos.map(t => <label key={t.id} className="rounded-tag border border-ink-700/10 bg-paper-50 p-2 text-xs"><span className="font-semibold">{t.nome}</span><input className="ml-2 w-16 rounded border border-ink-700/15 px-2 py-1" type="number" min={0} value={item.quantidades.find(q=>q.tamanho_id===t.id)?.quantidade ?? ""} onChange={e=>updateGrade(index,t.id,Number(e.target.value))} /></label>)}</div></div>{items.length>1 && <button type="button" className="mt-3 text-xs font-medium text-red-600" onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==index))}>Remover item</button>}</div>)}</div></section>
        <section><label>Observações<textarea className="input mt-1 min-h-24" value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Informações adicionais da proposta..." /></label></section>
        <div className="ml-auto max-w-sm rounded-tag border border-ink-700/10 bg-white p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="mt-2 flex justify-between"><span>Desconto à vista (5%)</span><strong>{money(desconto)}</strong></div><div className="mt-3 flex justify-between border-t border-ink-700/10 pt-3 text-lg"><span>Total</span><strong>{money(total)}</strong></div></div>
      </div>
      <div className="flex justify-end gap-2 border-t border-ink-700/10 p-5"><button type="button" className="btn-secondary" onClick={()=>setShowForm(false)}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar orçamento"}</button></div>
    </form></div></div>}

    {preview && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"><div className="mx-auto my-4 max-w-4xl"><div className="mb-3 flex justify-end gap-2 print:hidden"><button className="btn-secondary" onClick={()=>setPreview(null)}>Fechar</button><button className="btn-primary" onClick={()=>window.print()}>Exportar PDF</button>{preview.status !== "convertido" && !preview.pedido_id && <button className="btn-primary" onClick={()=>void convert(preview)}>Converter em pedido</button>}</div><div className="budget-print bg-white p-8 shadow-2xl print:p-8">
      <div className="flex items-start justify-between border-b-2 border-black pb-4"><div><div className="text-2xl font-black tracking-wide">ADONAI CAMISETARIA</div><div className="mt-1 text-sm">Uniformes personalizados para empresas, equipes e eventos</div></div><div className="text-right text-sm"><strong>ORÇAMENTO Nº:</strong> {preview.numero_orcamento}<br/><strong>DATA:</strong> {dateBR(preview.data_emissao)}<br/><strong>VALIDADE:</strong> {preview.validade_dias} dias — até {dateBR(preview.data_validade)}</div></div>
      <div className="mt-5"><h3 className="mb-2 border-b pb-1 text-sm font-bold uppercase">Dados do cliente</h3><div className="grid grid-cols-2 gap-2 text-sm"><div><strong>Empresa:</strong> {preview.clientes?.nome_empresa ?? "—"}</div><div><strong>CNPJ:</strong> {preview.clientes?.cpf_cnpj ?? "—"}</div><div><strong>Responsável:</strong> {preview.clientes?.nome_responsavel ?? "—"}</div><div><strong>Telefone:</strong> {preview.clientes?.telefone ?? "—"}</div><div><strong>Cidade:</strong> {[preview.clientes?.cidade, preview.clientes?.estado].filter(Boolean).join("/") || "—"}</div></div></div>
      <div className="mt-5 text-sm"><h3 className="mb-2 border-b pb-1 text-sm font-bold uppercase">Proposta</h3><p>Olá, <strong>{preview.clientes?.nome_responsavel ?? "cliente"}</strong>!</p><p className="mt-2">Agradecemos a oportunidade de apresentar nossa proposta. A <strong>Adonai Camisetaria</strong> trabalha para oferecer <strong>uniformes personalizados que valorizam a imagem da sua empresa, padronizam sua equipe e fortalecem sua marca.</strong></p></div>
      <div className="mt-5"><h3 className="mb-2 border-b pb-1 text-sm font-bold uppercase">Itens do orçamento</h3><table className="w-full border-collapse text-xs"><thead><tr className="bg-gray-100"><th className="border p-2">Qtd.</th><th className="border p-2 text-left">Produto</th><th className="border p-2">Modelo/Tecido</th><th className="border p-2">Personalização</th><th className="border p-2">Grade</th><th className="border p-2">Valor Unit.</th><th className="border p-2">Total</th></tr></thead><tbody>{(preview.itens_orcamento ?? []).map(item => <tr key={item.id}><td className="border p-2 text-center">{item.quantidade_total}</td><td className="border p-2">{item.produtos?.nome ?? "—"}</td><td className="border p-2">{[item.modelo,item.tecido].filter(Boolean).join(" / ") || "—"}</td><td className="border p-2">{item.personalizacao || "—"}</td><td className="border p-2">{(item.quantidades_orcamento ?? []).map(q=>`${q.tamanhos?.nome ?? ""} ${q.quantidade}`).join(" ") || "—"}</td><td className="border p-2 text-right">{money(Number(item.valor_unitario))}</td><td className="border p-2 text-right">{money(Number(item.valor_total))}</td></tr>)}</tbody></table></div>
      <div className="mt-4 ml-auto max-w-xs text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{money(Number(preview.valor_subtotal))}</strong></div><div className="flex justify-between"><span>Desconto</span><strong>{money(Number(preview.valor_desconto))}</strong></div><div className="mt-1 flex justify-between border-t-2 border-black pt-2 text-lg"><strong>TOTAL DO PEDIDO</strong><strong>{money(Number(preview.valor_total))}</strong></div><div className="mt-1 text-right text-xs">Valor por peça: {money(Number(preview.valor_total) / Math.max(1, (preview.itens_orcamento ?? []).reduce((s,i)=>s+Number(i.quantidade_total),0)))}</div></div>
      <div className="mt-5 grid gap-4 text-sm md:grid-cols-2"><div><h3 className="mb-1 border-b pb-1 font-bold">Personalização inclusa</h3><p>✓ Aplicação da logo da empresa<br/>✓ Personalização conforme identidade visual<br/>✓ Arte/mockup para aprovação<br/>✓ Grade de tamanhos conforme pedido<br/>✓ Produção personalizada</p></div><div><h3 className="mb-1 border-b pb-1 font-bold">Prazo</h3><p><strong>Produção:</strong> {preview.prazo_producao_dias ?? "—"} dias úteis após aprovação da arte e confirmação do pagamento.</p><p><strong>Previsão de entrega:</strong> {dateBR(preview.previsao_entrega)}</p><p className="mt-1 text-xs">O prazo começa a contar após a aprovação final da arte.</p></div></div>
      <div className="mt-5 text-sm"><h3 className="mb-1 border-b pb-1 font-bold">Pagamento</h3><p><strong>Condição:</strong> {preview.condicao_pagamento ?? "—"}</p>{Number(preview.percentual_desconto_avista) > 0 && <p>À vista: desconto de {preview.percentual_desconto_avista}%.</p>}<p>Parcelamento: 3x sem juros no cartão, quando aplicável.</p></div>
      <div className="mt-5 text-sm"><h3 className="mb-1 border-b pb-1 font-bold">Observações</h3><p>• A produção será iniciada após a aprovação da arte pelo cliente.<br/>• Alterações na arte após a aprovação poderão gerar novo prazo e/ou custo.<br/>• A produção seguirá os tamanhos e quantidades aprovados no pedido.<br/>• O prazo considera disponibilidade dos materiais e aprovação dentro do período combinado.<br/>• Valores e condições desta proposta são válidos até {dateBR(preview.data_validade)}.</p>{preview.observacoes && <p className="mt-2"><strong>Observações adicionais:</strong> {preview.observacoes}</p>}</div>
      <div className="mt-6 grid gap-4 border-t-2 border-black pt-4 text-center md:grid-cols-2"><div><strong>POR QUE UNIFORMIZAR SUA EQUIPE?</strong><p className="mt-1 text-xs">Profissionalismo • Identidade • Visibilidade • Padronização</p></div><div><strong>PRÓXIMO PASSO</strong><p className="mt-1 text-xs">Gostou da proposta? Entre em contato conosco para confirmar seu pedido.</p><p className="mt-1 font-bold">📲 (44) 99805-1523</p><strong>ADONAI CAMISETARIA</strong><p className="text-xs italic">Sua marca vestida com profissionalismo.</p></div></div>
    </div></div></div>}
  </div>;
}

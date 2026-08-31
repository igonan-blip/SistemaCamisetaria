
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { converterOrcamentoEmPedido, dateBR, deleteOrcamento, getOrcamentoCompleto, getEtapas, money, updateOrcamentoStatus } from "@/lib/db";
import { exportOrcamentoPdf } from "@/lib/orcamentoPdf";
import type { StatusOrcamento } from "@/types/database";

const STATUS_LABEL: Record<StatusOrcamento,string>={rascunho:"Rascunho",enviado:"Enviado",aprovado:"Aprovado",recusado:"Recusado",convertido:"Convertido"};

export function OrcamentoDetalhe(){
  const {id}=useParams<{id:string}>(); const navigate=useNavigate();
  const [dados,setDados]=useState<any>(null); const [etapas,setEtapas]=useState<any[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const [convertOpen,setConvertOpen]=useState(false); const [etapa,setEtapa]=useState(""); const [dataEntrega,setDataEntrega]=useState(""); const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    if(!id)return;setLoading(true);setError("");
    try{const [d,e]=await Promise.all([getOrcamentoCompleto(id),getEtapas()]);setDados(d);setEtapas(e);if(!etapa&&e[0])setEtapa(e[0].id)}
    catch(e:any){setError(e.message)}finally{setLoading(false)}
  },[id]);
  useEffect(()=>{load()},[load]);

  async function status(status:StatusOrcamento){try{await updateOrcamentoStatus(id!,status);await load()}catch(e:any){setError(e.message)}}
  async function convert(){if(!id||!etapa)return;setSaving(true);setError("");try{const pid=await converterOrcamentoEmPedido(id,etapa,dataEntrega||undefined);navigate(`/pedidos/${pid}`)}catch(e:any){setError(e.message)}finally{setSaving(false)}}
  async function remove(){if(!id||!confirm("Excluir este orçamento?"))return;try{await deleteOrcamento(id);navigate("/orcamentos")}catch(e:any){setError(e.message)}}

  if(loading)return <p className="text-sm text-text-500">Carregando orçamento…</p>;
  if(!dados)return <p className="text-sm text-red-600">{error||"Orçamento não encontrado."}</p>;
  const o=dados.orcamento, c=o.clientes||{}, total=Number(o.valor_total||0), avista=total*(1-Number(o.percentual_desconto_avista||0)/100);
  const pecas=dados.itens.reduce((s:any,i:any)=>s+Number(i.quantidade_total),0);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><button className="text-sm text-text-500 hover:text-text-900" onClick={()=>navigate("/orcamentos")}>← Voltar</button>
      <h2 className="mt-1 text-2xl">Orçamento <span className="font-mono">#{o.numero_orcamento}</span></h2>
      <p className="text-sm text-text-600">{c.nome_empresa}{c.nome_responsavel?` · ${c.nome_responsavel}`:""}</p></div>
      <div className="flex flex-wrap gap-2"><span className="tag">{STATUS_LABEL[o.status as StatusOrcamento]||o.status}</span>
      <button className="btn-secondary" onClick={()=>exportOrcamentoPdf(o,dados.itens)}>Exportar PDF</button>
      {o.status!=="convertido"&&<button className="btn-primary" onClick={()=>setConvertOpen(true)}>Converter em pedido</button>}</div>
    </div>
    {error&&<p className="text-sm text-red-600">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card p-4"><p className="text-xs text-text-500">Emissão</p><strong>{dateBR(o.data_emissao)}</strong></div>
      <div className="card p-4"><p className="text-xs text-text-500">Validade</p><strong>{dateBR(o.data_validade)}</strong><p className="text-xs text-text-500">{o.validade_dias} dias</p></div>
      <div className="card p-4"><p className="text-xs text-text-500">Peças</p><strong>{pecas}</strong></div>
      <div className="card p-4"><p className="text-xs text-text-500">Total</p><strong className="text-lg">{money(total)}</strong></div>
    </div>
    <section className="card p-5 space-y-4">
      <h3 className="text-lg">Dados do cliente</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div><span className="text-text-500">Empresa</span><br/><strong>{c.nome_empresa}</strong></div><div><span className="text-text-500">CNPJ</span><br/><strong>{c.cpf_cnpj||"—"}</strong></div>
        <div><span className="text-text-500">Responsável</span><br/><strong>{c.nome_responsavel||"—"}</strong></div><div><span className="text-text-500">Telefone</span><br/><strong>{c.telefone||"—"}</strong></div>
      </div>
    </section>
    <section className="card p-5 space-y-3"><h3 className="text-lg">Itens do orçamento</h3>
      {dados.itens.map((i:any)=><div key={i.id} className="rounded-tag border p-3 flex flex-wrap justify-between gap-3">
        <div><strong>{i.produtos?.nome}</strong><p className="text-xs text-text-500">{[i.modelo,i.tecido,i.cor,i.tipo_manga].filter(Boolean).join(" · ")||"Sem detalhes"}{i.personalizacao?` · ${i.personalizacao}`:""}</p>
        <div className="mt-2 flex flex-wrap gap-1">{(i.quantidades_orcamento||[]).map((q:any)=><span className="tag" key={q.id}>{q.tamanhos?.nome}: {q.quantidade}</span>)}</div></div>
        <div className="text-right"><strong>{money(i.valor_total)}</strong><p className="text-xs text-text-500">{i.quantidade_total} peças · {money(i.valor_unitario)}/un</p></div>
      </div>)}
    </section>
    <section className="card p-5"><h3 className="text-lg mb-3">Condições</h3><div className="grid gap-3 sm:grid-cols-3 text-sm">
      <div><span className="text-text-500">Pagamento</span><br/><strong>{o.condicao_pagamento||"A combinar"}</strong></div>
      <div><span className="text-text-500">À vista</span><br/><strong>{money(avista)}</strong> <span className="text-xs">({o.percentual_desconto_avista}% desc.)</span></div>
      <div><span className="text-text-500">3x cartão</span><br/><strong>{money(total/3)}</strong> <span className="text-xs">por parcela</span></div>
      <div><span className="text-text-500">Prazo</span><br/><strong>{o.prazo_producao_dias?`${o.prazo_producao_dias} dias úteis`:"A combinar"}</strong></div>
      <div><span className="text-text-500">Entrega prevista</span><br/><strong>{dateBR(o.previsao_entrega)}</strong></div>
      <div><span className="text-text-500">Observações</span><br/><strong>{o.observacoes||"—"}</strong></div>
    </div></section>
    <section className="card p-5"><h3 className="text-lg mb-3">Status do orçamento</h3><div className="flex flex-wrap gap-2">
      {(["rascunho","enviado","aprovado","recusado"] as StatusOrcamento[]).map(s=><button key={s} className={o.status===s?"btn-primary":"btn-secondary"} onClick={()=>status(s)}>{STATUS_LABEL[s]}</button>)}
      {o.pedido_id&&<Link className="btn-secondary" to={`/pedidos/${o.pedido_id}`}>Ver pedido gerado</Link>}
      <button className="btn-secondary text-red-600" onClick={remove}>Excluir</button>
    </div></section>
    {convertOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="card w-full max-w-lg space-y-4 p-5">
      <div className="flex justify-between"><h3 className="text-xl">Converter em pedido</h3><button onClick={()=>setConvertOpen(false)}>✕</button></div>
      <p className="text-sm text-text-600">O pedido será criado com os mesmos itens, grades, quantidades e preços deste orçamento.</p>
      <select className="input" value={etapa} onChange={e=>setEtapa(e.target.value)}><option value="">Etapa inicial</option>{etapas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select>
      <div><label className="mb-1 block text-xs text-text-500">Data de entrega</label><input className="input" type="date" value={dataEntrega} onChange={e=>setDataEntrega(e.target.value)}/></div>
      <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={()=>setConvertOpen(false)}>Cancelar</button><button className="btn-primary" disabled={saving} onClick={convert}>{saving?"Convertendo…":"Confirmar conversão"}</button></div>
    </div></div>}
  </div>
}

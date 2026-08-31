
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createOrcamento, converterOrcamentoEmPedido, dateBR, getClientes, getEtapas, getOrcamentoCompleto,
  getOrcamentos, getProdutos, getTamanhos, money
} from "@/lib/db";
import { exportOrcamentoPdf } from "@/lib/orcamentoPdf";
import type { CategoriaTamanho, StatusOrcamento } from "@/types/database";

const CATEGORIA_LABEL: Record<CategoriaTamanho, string> = {
  infantil: "Infantil",
  adulto: "Adulto / Manga longa",
  baby_look: "Baby look",
};
const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", recusado: "Recusado", convertido: "Convertido",
};

interface ItemCarrinho {
  tempId: string; produto_id: string; produto_nome: string; categoria: CategoriaTamanho;
  valor_unitario: number; personalizacao: string; quantidades: { tamanho_id: string; nome: string; quantidade: number }[];
  quantidadeTotal: number; valorTotal: number;
}

export function Orcamentos() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tamanhos, setTamanhos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [cliente, setCliente] = useState("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0,10));
  const [validadeDias, setValidadeDias] = useState("7");
  const [condicao, setCondicao] = useState("50% de entrada + 50% na entrega");
  const [descontoAvista, setDescontoAvista] = useState("5");
  const [prazoProducao, setPrazoProducao] = useState("");
  const [previsaoEntrega, setPrevisaoEntrega] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [itemProduto, setItemProduto] = useState("");
  const [itemCategoria, setItemCategoria] = useState<CategoriaTamanho>("adulto");
  const [itemPreco, setItemPreco] = useState("");
  const [itemPersonalizacao, setItemPersonalizacao] = useState("Estampa frente");
  const [itemQtd, setItemQtd] = useState<Record<string, number>>({});
  const [itemErro, setItemErro] = useState("");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertId, setConvertId] = useState<string>("");
  const [convertEtapa, setConvertEtapa] = useState("");
  const [convertData, setConvertData] = useState("");
  const [etapas, setEtapas] = useState<any[]>([]);
  const [converting, setConverting] = useState(false);

  async function load() {
    try {
      const [o,c,p,t,e] = await Promise.all([getOrcamentos(), getClientes(), getProdutos(), getTamanhos(), getEtapas()]);
      setRows(o); setClientes(c); setProdutos(p); setTamanhos(t); setEtapas(e);
      if (!convertEtapa && e[0]) setConvertEtapa(e[0].id);
    } catch(e:any) { setError(e.message); }
  }
  useEffect(()=>{load()},[]);

  const tamanhosDaCategoria = useMemo(
    () => tamanhos.filter(t=>t.ativo && t.categoria===itemCategoria),
    [tamanhos,itemCategoria]
  );

  const total = itens.reduce((s,i)=>s+i.valorTotal,0);
  const dataValidade = useMemo(()=>{
    const d = new Date(`${dataEmissao}T00:00:00`);
    d.setDate(d.getDate()+Math.max(1,Number(validadeDias)||1));
    return d.toISOString().slice(0,10);
  },[dataEmissao,validadeDias]);

  function resetItem() {
    setItemProduto(""); setItemPreco(""); setItemPersonalizacao("Estampa frente"); setItemQtd({}); setItemErro("");
  }
  function resetForm() {
    setCliente(""); setDataEmissao(new Date().toISOString().slice(0,10)); setValidadeDias("7");
    setCondicao("50% de entrada + 50% na entrega"); setDescontoAvista("5"); setPrazoProducao(""); setPrevisaoEntrega(""); setObservacoes("");
    setItens([]); resetItem();
  }
  function addItem() {
    const produto=produtos.find(p=>p.id===itemProduto);
    const qs=tamanhosDaCategoria.map(t=>({tamanho_id:t.id,nome:t.nome,quantidade:Number(itemQtd[t.id]||0)})).filter(q=>q.quantidade>0);
    if(!produto || Number(itemPreco)<=0 || !qs.length){setItemErro("Selecione o produto, informe o valor unitário e pelo menos uma quantidade.");return;}
    const qt=qs.reduce((s,q)=>s+q.quantidade,0);
    setItens(prev=>[...prev,{tempId:crypto.randomUUID(),produto_id:produto.id,produto_nome:produto.nome,categoria:itemCategoria,valor_unitario:Number(itemPreco),personalizacao:itemPersonalizacao,quantidades:qs,quantidadeTotal:qt,valorTotal:qt*Number(itemPreco)}]);
    resetItem();
  }
  async function save(e:React.FormEvent){
    e.preventDefault(); setError("");
    if(!cliente){setError("Selecione o cliente.");return}
    if(!itens.length){setError("Adicione pelo menos um item.");return}
    setSaving(true);
    try{
      const o=await createOrcamento({
        cliente_id:cliente,validade_dias:Math.max(1,Number(validadeDias)||7),
        condicao_pagamento:condicao,percentual_desconto_avista:Number(descontoAvista)||0,prazo_producao_dias:Number(prazoProducao)||undefined,
        previsao_entrega:previsaoEntrega||undefined,observacoes:observacoes||undefined,
        itens:itens.map(i=>({produto_id:i.produto_id,personalizacao:i.personalizacao,valor_unitario:i.valor_unitario,quantidades:i.quantidades.map(q=>({tamanho_id:q.tamanho_id,quantidade:q.quantidade}))}))
      });
      setOpen(false); resetForm(); await load(); navigate(`/orcamentos/${o.id}`);
    }catch(e:any){setError(e.message)}finally{setSaving(false)}
  }
  async function openPdf(id:string){
    try{const d=await getOrcamentoCompleto(id); exportOrcamentoPdf(d.orcamento,d.itens)}
    catch(e:any){setError(e.message)}
  }
  async function convert(){
    if(!convertId || !convertEtapa){return}
    setConverting(true);setError("");
    try{const pedidoId=await converterOrcamentoEmPedido(convertId,convertEtapa,convertData||undefined); setConvertOpen(false); navigate(`/pedidos/${pedidoId}`)}
    catch(e:any){setError(e.message)}finally{setConverting(false)}
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl">Orçamentos</h2><p className="text-sm text-text-600">Crie propostas comerciais, exporte em PDF e converta em pedido.</p></div>
      <button className="btn-primary" onClick={()=>setOpen(true)}>+ Novo orçamento</button>
    </div>
    {error && !open && <p className="text-sm text-red-600">{error}</p>}
    <div className="card overflow-hidden">
      <table className="w-full text-sm"><thead className="bg-paper-100 text-left"><tr>
        <th className="p-3">Orçamento</th><th className="p-3">Cliente</th><th className="p-3">Emissão</th><th className="p-3">Validade</th><th className="p-3">Total</th><th className="p-3">Status</th><th/>
      </tr></thead><tbody>
      {rows.map(o=><tr key={o.id} className="border-t">
        <td className="p-3 font-mono">#{o.numero_orcamento}</td><td className="p-3">{o.clientes?.nome_empresa}</td>
        <td className="p-3">{dateBR(o.data_emissao)}</td><td className="p-3">{dateBR(o.data_validade)}</td><td className="p-3">{money(o.valor_total)}</td>
        <td className="p-3"><span className="tag">{STATUS_LABEL[o.status as StatusOrcamento] || o.status}</span></td>
        <td className="p-3"><div className="flex flex-wrap justify-end gap-2">
          <Link className="text-teal-600 hover:underline" to={`/orcamentos/${o.id}`}>Ver</Link>
          <button className="text-teal-600 hover:underline" onClick={()=>openPdf(o.id)}>PDF</button>
          {o.status!=="convertido" && <button className="text-teal-600 hover:underline" onClick={()=>{setConvertId(o.id);setConvertData("");setConvertOpen(true)}}>Converter em pedido</button>}
        </div></td>
      </tr>)}
      {!rows.length && <tr><td className="p-5 text-center text-text-500" colSpan={7}>Nenhum orçamento encontrado.</td></tr>}
      </tbody></table>
    </div>

    {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><form onSubmit={save} className="card mx-auto my-8 max-w-4xl space-y-5 p-5">
      <div className="flex items-center justify-between"><h3 className="text-xl">Novo orçamento</h3><button type="button" onClick={()=>{setOpen(false);resetForm()}}>✕</button></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="input sm:col-span-2" required value={cliente} onChange={e=>setCliente(e.target.value)}><option value="">Cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome_empresa}</option>)}</select>
        <input className="input" type="date" value={dataEmissao} onChange={e=>setDataEmissao(e.target.value)}/>
        <div><label className="mb-1 block text-xs text-text-500">Validade (dias)</label><input className="input" type="number" min="1" value={validadeDias} onChange={e=>setValidadeDias(e.target.value)}/></div>
        <div><label className="mb-1 block text-xs text-text-500">Válido até</label><input className="input bg-paper-100" value={dateBR(dataValidade)} readOnly/></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Condição de pagamento" value={condicao} onChange={e=>setCondicao(e.target.value)}/>
        <div><label className="mb-1 block text-xs text-text-500">Desconto à vista (%)</label><input className="input" type="number" min="0" max="100" step="0.1" value={descontoAvista} onChange={e=>setDescontoAvista(e.target.value)}/></div>
        <div><label className="mb-1 block text-xs text-text-500">Prazo de produção (dias úteis)</label><input className="input" type="number" min="1" value={prazoProducao} onChange={e=>setPrazoProducao(e.target.value)}/></div>
        <div><label className="mb-1 block text-xs text-text-500">Previsão de entrega</label><input className="input" type="date" value={previsaoEntrega} onChange={e=>setPrevisaoEntrega(e.target.value)}/></div>
      </div>
      <textarea className="input min-h-20" placeholder="Observações adicionais" value={observacoes} onChange={e=>setObservacoes(e.target.value)}/>

      <div className="rounded-tag border p-4">
        <p className="mb-3 text-sm font-medium">Adicionar item ao orçamento</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="input" value={itemProduto} onChange={e=>setItemProduto(e.target.value)}><option value="">Produto</option>{produtos.filter(p=>p.ativo).map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <select className="input" value={itemCategoria} onChange={e=>{setItemCategoria(e.target.value as CategoriaTamanho);setItemQtd({})}}>{(Object.keys(CATEGORIA_LABEL) as CategoriaTamanho[]).map(c=><option key={c} value={c}>Grade: {CATEGORIA_LABEL[c]}</option>)}</select>
          <input className="input" type="number" min="0.01" step="0.01" placeholder="Valor unitário" value={itemPreco} onChange={e=>setItemPreco(e.target.value)}/>
          <input className="input sm:col-span-3" placeholder="Personalização (ex.: logo frente + costas)" value={itemPersonalizacao} onChange={e=>setItemPersonalizacao(e.target.value)}/>
        </div>
        <p className="mb-2 mt-4 text-xs font-medium text-text-500">Quantidades — {CATEGORIA_LABEL[itemCategoria]}</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{tamanhosDaCategoria.map(t=><label key={t.id} className="text-xs">{t.nome}<input className="input mt-1" type="number" min="0" value={itemQtd[t.id]||0} onChange={e=>setItemQtd({...itemQtd,[t.id]:Number(e.target.value)})}/></label>)}</div>
        {itemErro&&<p className="mt-2 text-xs text-red-600">{itemErro}</p>}
        <div className="mt-3 flex justify-end"><button type="button" className="btn-secondary" onClick={addItem}>+ Adicionar item</button></div>
      </div>

      <div><p className="mb-2 text-sm font-medium">Itens do orçamento ({itens.length})</p>{!itens.length&&<p className="text-sm text-text-500">Nenhum item adicionado.</p>}
        <div className="space-y-2">{itens.map(i=><div key={i.tempId} className="flex items-start justify-between rounded-tag border p-3"><div><p className="font-medium">{i.produto_nome}</p><p className="text-xs text-text-500">{CATEGORIA_LABEL[i.categoria]} · {i.quantidadeTotal} peças · {money(i.valor_unitario)}/un · {i.personalizacao}</p><div className="mt-1 flex flex-wrap gap-1">{i.quantidades.map(q=><span className="tag" key={q.tamanho_id}>{q.nome}: {q.quantidade}</span>)}</div></div><div className="text-right"><strong>{money(i.valorTotal)}</strong><button type="button" className="mt-1 block text-xs text-brick-500 hover:underline" onClick={()=>setItens(prev=>prev.filter(x=>x.tempId!==i.tempId))}>Remover</button></div></div>)}</div>
        {itens.length>0&&<div className="mt-3 flex justify-end text-sm">Total: <strong className="ml-1">{money(total)}</strong></div>}
      </div>
      <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={()=>{setOpen(false);resetForm()}}>Cancelar</button><button className="btn-primary" disabled={saving}>{saving?"Salvando…":"Salvar orçamento"}</button></div>
    </form></div>}

    {convertOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="card w-full max-w-lg space-y-4 p-5">
      <div className="flex justify-between"><h3 className="text-xl">Converter orçamento em pedido</h3><button onClick={()=>setConvertOpen(false)}>✕</button></div>
      <p className="text-sm text-text-600">Os itens, quantidades, preços e cliente serão levados para um novo pedido. O orçamento será marcado como convertido.</p>
      <select className="input" value={convertEtapa} onChange={e=>setConvertEtapa(e.target.value)}><option value="">Etapa inicial</option>{etapas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select>
      <div><label className="mb-1 block text-xs text-text-500">Data de entrega</label><input className="input" type="date" value={convertData} onChange={e=>setConvertData(e.target.value)}/></div>
      {error&&<p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={()=>setConvertOpen(false)}>Cancelar</button><button className="btn-primary" disabled={converting} onClick={convert}>{converting?"Convertendo…":"Converter em pedido"}</button></div>
    </div></div>}
  </div>;
}

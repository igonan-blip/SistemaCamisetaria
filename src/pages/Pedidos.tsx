import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPedido, getClientes, getEtapas, getPedidos, getProdutos, getTamanhos, money } from "@/lib/db";
import type { CategoriaTamanho } from "@/types/database";

const CATEGORIA_LABEL: Record<CategoriaTamanho, string> = {
  infantil: "Infantil",
  adulto: "Adulto / Manga longa",
  baby_look: "Baby look",
};

interface ItemDoCarrinho {
  tempId: string;
  produto_id: string;
  produto_nome: string;
  categoria: CategoriaTamanho;
  valor_unitario: number;
  quantidades: { tamanho_id: string; nome: string; quantidade: number }[];
  quantidadeTotal: number;
  valorTotal: number;
}

export function Pedidos() {
  const [rows, setRows] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [tamanhos, setTamanhos] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Cabeçalho do pedido
  const [cliente, setCliente] = useState("");
  const [etapa, setEtapa] = useState("");
  const [dataPedido, setDataPedido] = useState(new Date().toISOString().slice(0, 10));
  const [dataEntrega, setDataEntrega] = useState("");

  // Item sendo montado antes de entrar na lista
  const [itemProduto, setItemProduto] = useState("");
  const [itemCategoria, setItemCategoria] = useState<CategoriaTamanho>("adulto");
  const [itemPreco, setItemPreco] = useState("");
  const [itemQtd, setItemQtd] = useState<Record<string, number>>({});
  const [itemErro, setItemErro] = useState("");

  // Itens já adicionados ao pedido
  const [itens, setItens] = useState<ItemDoCarrinho[]>([]);

  async function load() {
    try {
      const [p, c, pr, t, e] = await Promise.all([getPedidos(), getClientes(), getProdutos(), getTamanhos(), getEtapas()]);
      setRows(p);
      setClientes(c);
      setProdutos(pr);
      setTamanhos(t);
      setEtapas(e);
      if (!etapa && e[0]) setEtapa(e[0].id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const tamanhosDaCategoria = useMemo(
    () => tamanhos.filter((t) => t.ativo && t.categoria === itemCategoria),
    [tamanhos, itemCategoria]
  );

  function resetForm() {
    setCliente("");
    setDataPedido(new Date().toISOString().slice(0, 10));
    setDataEntrega("");
    setItens([]);
    resetItemBuilder();
    setError("");
  }

  function resetItemBuilder() {
    setItemProduto("");
    setItemPreco("");
    setItemQtd({});
    setItemErro("");
  }

  function addItem() {
    setItemErro("");
    const produto = produtos.find((p) => p.id === itemProduto);
    const qs = tamanhosDaCategoria
      .map((t) => ({ tamanho_id: t.id, nome: t.nome, quantidade: Number(itemQtd[t.id] || 0) }))
      .filter((q) => q.quantidade > 0);
    if (!produto || Number(itemPreco) <= 0 || !qs.length) {
      setItemErro("Selecione o produto, informe o valor unitário e pelo menos uma quantidade.");
      return;
    }
    const quantidadeTotal = qs.reduce((s, q) => s + q.quantidade, 0);
    setItens((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        produto_id: produto.id,
        produto_nome: produto.nome,
        categoria: itemCategoria,
        valor_unitario: Number(itemPreco),
        quantidades: qs,
        quantidadeTotal,
        valorTotal: quantidadeTotal * Number(itemPreco),
      },
    ]);
    resetItemBuilder();
  }

  function removeItem(tempId: string) {
    setItens((prev) => prev.filter((i) => i.tempId !== tempId));
  }

  const totalPedido = itens.reduce((s, i) => s + i.valorTotal, 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!cliente || !etapa) {
      setError("Selecione o cliente e a etapa inicial de produção.");
      return;
    }
    if (!dataEntrega) {
      setError("A data de entrega é obrigatória.");
      return;
    }
    if (!itens.length) {
      setError("Adicione pelo menos um item ao pedido.");
      return;
    }
    setSaving(true);
    try {
      await createPedido({
        cliente_id: cliente,
        etapa_id: etapa,
        data_pedido: dataPedido,
        data_entrega: dataEntrega,
        valor_desconto: 0,
        itens: itens.map((i) => ({
          produto_id: i.produto_id,
          valor_unitario: i.valor_unitario,
          quantidades: i.quantidades.map((q) => ({ tamanho_id: q.tamanho_id, quantidade: q.quantidade })),
        })),
      });
      setOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <div>
          <h2 className="text-2xl">Pedidos</h2>
          <p className="text-sm text-text-600">Crie e acompanhe pedidos reais.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          Novo pedido
        </button>
      </div>

      {error && !open && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-100 text-left">
            <tr>
              <th className="p-3">Pedido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Entrega</th>
              <th className="p-3">Total</th>
              <th className="p-3">Pagamento</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr className="border-t" key={p.id}>
                <td className="p-3 font-mono">#{p.numero_pedido}</td>
                <td className="p-3">{p.clientes?.nome_empresa}</td>
                <td className="p-3">{p.data_entrega ? new Date(`${p.data_entrega}T00:00:00`).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="p-3">{money(p.valor_total)}</td>
                <td className="p-3">{p.status_pagamento}</td>
                <td className="p-3 text-right">
                  <Link className="text-sm text-teal-600 hover:underline" to={`/pedidos/${p.id}`}>
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="p-4 text-center text-text-500" colSpan={6}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <form onSubmit={save} className="card mx-auto mt-8 max-w-3xl space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl">Novo pedido</h3>
              <button
                type="button"
                className="text-text-400 hover:text-text-900"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                ✕
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Dados gerais */}
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="input" required value={cliente} onChange={(e) => setCliente(e.target.value)}>
                <option value="">Cliente</option>
                {clientes.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome_empresa}
                  </option>
                ))}
              </select>
              <select className="input" value={etapa} onChange={(e) => setEtapa(e.target.value)}>
                {etapas.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </select>
              <div>
                <label className="mb-1 block text-xs text-text-500">Data do pedido</label>
                <input className="input" type="date" required value={dataPedido} onChange={(e) => setDataPedido(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-500">Data de entrega *</label>
                <input className="input" type="date" required value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
              </div>
            </div>

            {/* Montagem de itens */}
            <div className="rounded-tag border p-4">
              <p className="mb-3 text-sm font-medium">Adicionar item ao pedido</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <select className="input" value={itemProduto} onChange={(e) => setItemProduto(e.target.value)}>
                  <option value="">Produto</option>
                  {produtos
                    .filter((x) => x.ativo)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                      </option>
                    ))}
                </select>
                <select
                  className="input"
                  value={itemCategoria}
                  onChange={(e) => {
                    setItemCategoria(e.target.value as CategoriaTamanho);
                    setItemQtd({});
                  }}
                >
                  {(Object.keys(CATEGORIA_LABEL) as CategoriaTamanho[]).map((c) => (
                    <option key={c} value={c}>
                      Grade: {CATEGORIA_LABEL[c]}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Valor unitário"
                  value={itemPreco}
                  onChange={(e) => setItemPreco(e.target.value)}
                />
              </div>

              <p className="mb-2 mt-4 text-xs font-medium text-text-500">Quantidades — {CATEGORIA_LABEL[itemCategoria]}</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {tamanhosDaCategoria.map((t) => (
                  <label key={t.id} className="text-xs">
                    {t.nome}
                    <input
                      className="input mt-1"
                      type="number"
                      min="0"
                      value={itemQtd[t.id] || 0}
                      onChange={(e) => setItemQtd({ ...itemQtd, [t.id]: Number(e.target.value) })}
                    />
                  </label>
                ))}
                {!tamanhosDaCategoria.length && (
                  <p className="col-span-full text-xs text-text-500">Nenhum tamanho cadastrado para esta grade.</p>
                )}
              </div>

              {itemErro && <p className="mt-2 text-xs text-red-600">{itemErro}</p>}

              <div className="mt-3 flex justify-end">
                <button type="button" className="btn-secondary" onClick={addItem}>
                  + Adicionar item ao pedido
                </button>
              </div>
            </div>

            {/* Lista de itens adicionados */}
            <div>
              <p className="mb-2 text-sm font-medium">Itens do pedido ({itens.length})</p>
              {!itens.length && <p className="text-sm text-text-500">Nenhum item adicionado ainda.</p>}
              <div className="space-y-2">
                {itens.map((i) => (
                  <div key={i.tempId} className="flex items-start justify-between rounded-tag border p-3">
                    <div>
                      <p className="text-sm font-medium">{i.produto_nome}</p>
                      <p className="text-xs text-text-500">
                        {CATEGORIA_LABEL[i.categoria]} · {i.quantidadeTotal} peças · {money(i.valor_unitario)}/un
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {i.quantidades.map((q) => (
                          <span key={q.tamanho_id} className="tag">
                            {q.nome}: {q.quantidade}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{money(i.valorTotal)}</p>
                      <button type="button" className="mt-1 text-xs text-brick-500 hover:underline" onClick={() => removeItem(i.tempId)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {itens.length > 0 && (
                <p className="mt-3 text-right text-sm">
                  Total do pedido: <strong>{money(totalPedido)}</strong>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </button>
              <button className="btn-primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar pedido"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addPayment,
  arteUrl,
  dateBR,
  deleteArte,
  deletePedido,
  diasRestantes,
  getPedidoCompleto,
  money,
  PRAZO_CLASS,
  PRAZO_LABEL,
  prazoStatus,
  uploadArte,
} from "@/lib/db";
import { Modal } from "@/components/Modal";
import type { FormaPagamento } from "@/types/database";

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

const ACCEPT_ARTE = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

type PedidoCompleto = Awaited<ReturnType<typeof getPedidoCompleto>>;

export function PedidoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dados, setDados] = useState<PedidoCompleto | null>(null);
  const [artUrls, setArtUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [descricaoArte, setDescricaoArte] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [payValor, setPayValor] = useState("");
  const [payForma, setPayForma] = useState<FormaPagamento>("pix");
  const [payData, setPayData] = useState(new Date().toISOString().slice(0, 10));
  const [payObs, setPayObs] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const resultado = await getPedidoCompleto(id);
      setDados(resultado);
      const urls: Record<string, string> = {};
      await Promise.all(
        resultado.artes.map(async (arte: any) => {
          try {
            urls[arte.id] = await arteUrl(arte.arquivo_path);
          } catch {
            // arte sem preview disponível — ignora silenciosamente
          }
        })
      );
      setArtUrls(urls);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    setError("");
    try {
      await uploadArte(id, file, descricaoArte || undefined);
      setDescricaoArte("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteArte(arteId: string, path: string) {
    if (!confirm("Remover esta arte do pedido?")) return;
    try {
      await deleteArte(arteId, path);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDeletePedido() {
    if (!id) return;
    const confirmar = window.confirm("Tem certeza que deseja excluir este pedido inteiramente? Esta ação não pode ser desfeita.");
    if (!confirmar) return;

    try {
      await deletePedido(id);
      navigate("/pedidos");
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setPaySaving(true);
    setError("");
    try {
      await addPayment(id, Number(payValor), payForma, payData, payObs || undefined);
      setPayOpen(false);
      setPayValor("");
      setPayObs("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPaySaving(false);
    }
  }

  if (loading) return <p className="text-sm text-text-500">Carregando pedido…</p>;
  if (error && !dados) return <p className="text-sm text-red-600">{error}</p>;
  if (!dados || !dados.pedido) return <p className="text-sm text-text-500">Pedido não encontrado.</p>;

  const { pedido, itens, pagamentos, artes, movimentos } = dados;
  const totalPago = pagamentos.reduce((s, p) => s + Number(p.valor), 0);
  const saldo = Number(pedido.valor_total) - totalPago;
  const prazo = prazoStatus(pedido.data_entrega, pedido.etapas_producao?.slug);
  const dias = diasRestantes(pedido.data_entrega);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button className="text-sm text-text-500 hover:text-text-900" onClick={() => navigate("/pedidos")}>
            ← Voltar para pedidos
          </button>
          <h2 className="mt-1 text-2xl">
            Pedido <span className="font-mono">#{pedido.numero_pedido}</span>
          </h2>
          <p className="text-sm text-text-600">
            {pedido.clientes?.nome_empresa}
            {pedido.clientes?.nome_responsavel ? ` · ${pedido.clientes.nome_responsavel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tag">{pedido.etapas_producao?.nome}</span>
          <span className={`tag ${PRAZO_CLASS[prazo]}`}>
            {PRAZO_LABEL[prazo]}
            {dias !== null && dias >= 0 ? ` · ${dias}d` : ""}
          </span>
          <button
            onClick={handleDeletePedido}
            className="rounded-tag border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
            title="Excluir este pedido"
          >
            Excluir pedido
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-text-500">Entrega</p>
          <strong className="text-lg">{dateBR(pedido.data_entrega)}</strong>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-500">Valor total</p>
          <strong className="text-lg">{money(pedido.valor_total)}</strong>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-500">Pago</p>
          <strong className="text-lg">{money(totalPago)}</strong>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-500">Saldo</p>
          <strong className="text-lg">{money(saldo)}</strong>
        </div>
      </div>

      {/* Itens do pedido */}
      <section className="card space-y-3 p-5">
        <h3 className="text-lg">Itens do pedido</h3>
        <div className="space-y-3">
          {itens.map((item: any) => (
            <div key={item.id} className="rounded-tag border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.produtos?.nome}</p>
                <p className="text-sm text-text-600">
                  {item.quantidade_total} peças · {money(item.valor_unitario)}/un · {money(item.valor_total)}
                </p>
              </div>
              <p className="mt-1 text-xs text-text-500">
                {[item.modelo, item.cor, item.tecido, item.tipo_manga].filter(Boolean).join(" · ") || "Sem detalhes adicionais"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.quantidades_pedido?.map((q: any) => (
                  <span key={q.id} className="tag">
                    {q.tamanhos?.nome}: {q.quantidade}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {!itens.length && <p className="text-sm text-text-500">Nenhum item cadastrado neste pedido.</p>}
        </div>
      </section>

      {/* Etapa 6 — Artes + Storage */}
      <section className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg">Artes</h3>
          <span className="tag">{artes.length} arquivo(s)</span>
        </div>

        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => e.preventDefault()}>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs text-text-500">Descrição (opcional)</label>
            <input
              className="input"
              placeholder="Ex.: arte frente"
              value={descricaoArte}
              onChange={(e) => setDescricaoArte(e.target.value)}
            />
          </div>
          <div>
            <label className="btn-primary cursor-pointer">
              {uploading ? "Enviando…" : "Enviar arte"}
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT_ARTE}
                className="hidden"
                disabled={uploading}
                onChange={handleUpload}
              />
            </label>
          </div>
        </form>
        <p className="text-xs text-text-400">Formatos aceitos: JPG, JPEG, PNG, WEBP, PDF.</p>

        {!artes.length && <p className="text-sm text-text-500">Nenhuma arte enviada ainda.</p>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {artes.map((arte: any) => {
            const url = artUrls[arte.id];
            const isImage = (arte.tipo_arquivo || "").startsWith("image/");
            return (
              <div key={arte.id} className="rounded-tag border p-3">
                {isImage && url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={arte.nome_arquivo} className="mb-2 h-32 w-full rounded-tag object-cover" />
                  </a>
                ) : (
                  <div className="mb-2 flex h-32 w-full items-center justify-center rounded-tag bg-paper-100 text-xs text-text-500">
                    {arte.tipo_arquivo || "arquivo"}
                  </div>
                )}
                <p className="truncate text-sm font-medium" title={arte.nome_arquivo}>
                  {arte.nome_arquivo}
                </p>
                {arte.descricao && <p className="text-xs text-text-500">{arte.descricao}</p>}
                <div className="mt-2 flex items-center justify-between">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline">
                      Abrir / baixar
                    </a>
                  ) : (
                    <span className="text-xs text-text-400">Link indisponível</span>
                  )}
                  <button
                    className="text-xs text-brick-500 hover:underline"
                    onClick={() => handleDeleteArte(arte.id, arte.arquivo_path)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Etapa 8 — Pagamentos */}
      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg">Pagamentos</h3>
          <button className="btn-primary" onClick={() => setPayOpen(true)}>
            Lançar pagamento
          </button>
        </div>
        <div className="overflow-hidden rounded-tag border">
          <table className="w-full text-sm">
            <thead className="bg-paper-100 text-left">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Forma</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Observações</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{dateBR(p.data_pagamento)}</td>
                  <td className="p-3 capitalize">{p.forma_pagamento.replace(/_/g, " ")}</td>                  <td className="p-3">{money(p.valor)}</td>
                  <td className="p-3 text-text-500">{p.observacoes || "—"}</td>
                </tr>
              ))}
              {!pagamentos.length && (
                <tr>
                  <td className="p-4 text-center text-text-500" colSpan={4}>
                    Nenhum pagamento lançado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Etapa 7 — Histórico de movimentações */}
      <section className="card space-y-3 p-5">
        <h3 className="text-lg">Histórico</h3>
        <ol className="space-y-2 border-l border-ink-700/10 pl-4">
          <li className="relative text-sm">
            <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-teal-500" />
            <span className="font-mono text-xs text-text-400">{dateBR(pedido.data_pedido)}</span> — Pedido criado
          </li>
          {[...movimentos].reverse().map((m: any) => (
            <li key={m.id} className="relative text-sm">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-teal-500" />
              <span className="font-mono text-xs text-text-400">
                {new Date(m.created_at).toLocaleString("pt-BR")}
              </span>{" "}
              — {m.etapas_anterior?.nome ? `${m.etapas_anterior.nome} → ` : ""}
              {m.etapas_nova?.nome}
              {m.observacao ? ` (${m.observacao})` : ""}
            </li>
          ))}
        </ol>
      </section>

      {payOpen && (
        <Modal title="Lançar pagamento" onClose={() => setPayOpen(false)}>
          <form className="space-y-4" onSubmit={savePayment}>
            <div>
              <label className="mb-1 block text-xs text-text-500">Valor</label>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={payValor}
                onChange={(e) => setPayValor(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-text-500">Forma de pagamento</label>
                <select className="input" value={payForma} onChange={(e) => setPayForma(e.target.value as FormaPagamento)}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-500">Data</label>
                <input className="input" type="date" value={payData} onChange={(e) => setPayData(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-500">Observações</label>
              <input className="input" value={payObs} onChange={(e) => setPayObs(e.target.value)} />
            </div>
            <p className="text-xs text-text-500">
              Saldo atual: <strong>{money(saldo)}</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPayOpen(false)}>
                Cancelar
              </button>
              <button className="btn-primary" disabled={paySaving}>
                {paySaving ? "Salvando…" : "Salvar pagamento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
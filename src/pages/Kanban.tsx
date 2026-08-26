import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  diasRestantes,
  getEtapas,
  getMovimentacoes,
  getPedidosResumo,
  money,
  movePedido,
  PRAZO_CLASS,
  PRAZO_LABEL,
  prazoStatus,
} from "@/lib/db";
import { Modal } from "@/components/Modal";

export function Kanban() {
  const [etapas, setEtapas] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overEtapa, setOverEtapa] = useState<string | null>(null);
  const [historicoPedido, setHistoricoPedido] = useState<any | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  async function load() {
    try {
      setError("");
      const [e, p] = await Promise.all([getEtapas(), getPedidosResumo()]);
      setEtapas(e);
      setPedidos(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function move(id: string, etapaId: string) {
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido || pedido.etapa_id === etapaId) return;
    // Atualização otimista para o drag ficar fluido; recarrega para refletir o histórico.
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, etapa_id: etapaId } : p)));
    try {
      await movePedido(id, etapaId);
      await load();
    } catch (e: any) {
      setError(e.message);
      await load();
    }
  }

  async function abrirHistorico(pedido: any) {
    setHistoricoPedido(pedido);
    setHistoricoLoading(true);
    try {
      const dados = await getMovimentacoes(pedido.id);
      setHistorico(dados);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setHistoricoLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-text-500">Carregando produção…</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl">Produção</h2>
        <p className="text-sm text-text-600">Arraste os cartões entre as colunas para mudar a etapa. O histórico é registrado automaticamente.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {etapas.map((etapa) => {
          const doColuna = pedidos.filter((p) => p.etapa_id === etapa.id);
          return (
            <section
              key={etapa.id}
              className={`card min-w-[280px] flex-1 p-3 transition-colors ${overEtapa === etapa.id ? "border-teal-500 bg-teal-500/5" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverEtapa(etapa.id);
              }}
              onDragLeave={() => setOverEtapa((cur) => (cur === etapa.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setOverEtapa(null);
                if (dragId) move(dragId, etapa.id);
              }}
            >
              <h3 className="mb-3 flex items-center justify-between">
                {etapa.nome}
                <span className="tag">{doColuna.length}</span>
              </h3>
              <div className="space-y-3">
                {doColuna.map((p) => {
                  const prazo = prazoStatus(p.data_entrega, p.etapas_producao?.slug);
                  const dias = diasRestantes(p.data_entrega);
                  return (
                    <article
                      key={p.id}
                      draggable
                      onDragStart={() => setDragId(p.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`cursor-grab rounded-tag border bg-white p-3 active:cursor-grabbing ${dragId === p.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">#{p.numero_pedido}</span>
                        <span className={`tag ${PRAZO_CLASS[prazo]}`}>
                          {PRAZO_LABEL[prazo]}
                          {dias !== null && dias >= 0 ? ` · ${dias}d` : ""}
                        </span>
                      </div>
                      <div className="mt-1 font-medium">{p.clientes?.nome_empresa || "Cliente"}</div>
                      <div className="mt-1 text-xs text-text-500">
                        {p.quantidade_pecas} peças · {money(p.valor_total)}
                        {p.valor_saldo > 0 ? ` · saldo ${money(p.valor_saldo)}` : ""}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <Link className="text-teal-600 hover:underline" to={`/pedidos/${p.id}`}>
                          Ver pedido
                        </Link>
                        <button className="text-text-500 hover:underline" onClick={() => abrirHistorico(p)}>
                          Histórico
                        </button>
                      </div>
                      <select
                        className="input mt-2 text-xs"
                        value={etapa.id}
                        onChange={(x) => move(p.id, x.target.value)}
                      >
                        <option value={etapa.id}>Mover para…</option>
                        {etapas
                          .filter((x) => x.id !== etapa.id)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.nome}
                            </option>
                          ))}
                      </select>
                    </article>
                  );
                })}
                {!doColuna.length && <p className="text-xs text-text-400">Nenhum pedido nesta etapa.</p>}
              </div>
            </section>
          );
        })}
      </div>

      {historicoPedido && (
        <Modal title={`Histórico — Pedido #${historicoPedido.numero_pedido}`} onClose={() => setHistoricoPedido(null)}>
          {historicoLoading ? (
            <p className="text-sm text-text-500">Carregando…</p>
          ) : (
            <ol className="space-y-2 border-l border-ink-700/10 pl-4">
              {historico.map((m) => (
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
              {!historico.length && <p className="text-sm text-text-500">Nenhuma movimentação registrada ainda.</p>}
            </ol>
          )}
        </Modal>
      )}
    </div>
  );
}

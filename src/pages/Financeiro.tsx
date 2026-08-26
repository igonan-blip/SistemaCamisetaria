import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  addPayment,
  dateBR,
  money,
  STATUS_FINANCEIRO_LABEL,
  statusFinanceiro,
} from "@/lib/db";
import { Modal } from "@/components/Modal";
import type { FormaPagamento, StatusPagamento } from "@/types/database";

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
];

const FILTROS: { value: "todos" | StatusPagamento; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "parcialmente_pago", label: "Parcialmente pago" },
  { value: "pago", label: "Pago" },
  { value: "atrasado", label: "Atrasado" },
];

export function Financeiro() {
  const [rows, setRows] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<"todos" | StatusPagamento>("todos");

  const [pedidoSelecionado, setPedidoSelecionado] = useState<any | null>(null);
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    const [a, b] = await Promise.all([
      supabase.from("pedidos").select("*, clientes(nome_empresa)").order("created_at", { ascending: false }),
      supabase.from("pagamentos").select("*"),
    ]);
    if (a.error) setError(a.error.message);
    if (b.error) setError(b.error.message);
    setRows(a.data || []);
    setPayments(b.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  const linhas = useMemo(
    () =>
      rows.map((p) => {
        const pago = payments.filter((x) => x.pedido_id === p.id).reduce((s, x) => s + Number(x.valor), 0);
        const saldo = Number(p.valor_total) - pago;
        const status = statusFinanceiro({ valor_total: p.valor_total, data_entrega: p.data_entrega }, pago);
        return { ...p, pago, saldo, status };
      }),
    [rows, payments]
  );

  const filtradas = useMemo(
    () => (filtro === "todos" ? linhas : linhas.filter((l) => l.status === filtro)),
    [linhas, filtro]
  );

  const paid = payments.reduce((s, p) => s + Number(p.valor), 0);
  const total = rows.reduce((s, p) => s + Number(p.valor_total), 0);

  function abrirPagamento(pedido: any) {
    setPedidoSelecionado(pedido);
    setValor("");
    setForma("pix");
    setData(new Date().toISOString().slice(0, 10));
    setObs("");
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!pedidoSelecionado) return;
    setSaving(true);
    setError("");
    try {
      await addPayment(pedidoSelecionado.id, Number(valor), forma, data, obs || undefined);
      setPedidoSelecionado(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl">Financeiro</h2>
        <p className="text-sm text-text-600">Valores calculados a partir dos pedidos e pagamentos reais.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-text-500">Total vendido</p>
          <strong className="text-2xl">{money(total)}</strong>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-500">Total recebido</p>
          <strong className="text-2xl">{money(paid)}</strong>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-500">Saldo a receber</p>
          <strong className="text-2xl">{money(total - paid)}</strong>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={filtro === f.value ? "tag border-teal-500 bg-teal-500/10 text-teal-600" : "tag"}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-100 text-left">
            <tr>
              <th className="p-3">Pedido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Entrega</th>
              <th className="p-3">Total</th>
              <th className="p-3">Pago</th>
              <th className="p-3">Saldo</th>
              <th className="p-3">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtradas.map((p) => (
              <tr className="border-t" key={p.id}>
                <td className="p-3 font-mono">
                  <Link className="hover:underline" to={`/pedidos/${p.id}`}>
                    #{p.numero_pedido}
                  </Link>
                </td>
                <td className="p-3">{p.clientes?.nome_empresa}</td>
                <td className="p-3">{dateBR(p.data_entrega)}</td>
                <td className="p-3">{money(p.valor_total)}</td>
                <td className="p-3">{money(p.pago)}</td>
                <td className="p-3">{money(p.saldo)}</td>
                <td className="p-3">
                  <span className="tag">{STATUS_FINANCEIRO_LABEL[p.status as StatusPagamento]}</span>
                </td>
                <td className="p-3 text-right">
                  {p.saldo > 0 && (
                    <button className="btn-secondary" onClick={() => abrirPagamento(p)}>
                      Lançar pagamento
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!filtradas.length && (
              <tr>
                <td className="p-6 text-center text-text-500" colSpan={8}>
                  Nenhum pedido encontrado para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pedidoSelecionado && (
        <Modal title={`Pagamento — Pedido #${pedidoSelecionado.numero_pedido}`} onClose={() => setPedidoSelecionado(null)}>
          <form className="space-y-4" onSubmit={savePayment}>
            <div>
              <label className="mb-1 block text-xs text-text-500">Valor</label>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-text-500">Forma de pagamento</label>
                <select className="input" value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-500">Data</label>
                <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-500">Observações</label>
              <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPedidoSelecionado(null)}>
                Cancelar
              </button>
              <button className="btn-primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar pagamento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

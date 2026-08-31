import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Cliente, Pedido } from "@/types/database";

type OrderRow = Pedido & { clientes: Cliente };

const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const dateBr = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "—";

export function Pedidos() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("pedidos")
      .select("*, clientes(*)")
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-text-500">Ordens de produção</p>
        <h2 className="font-display text-2xl font-semibold">Pedidos</h2>
      </div>
      {searchParams.get("pedido") && (
        <div className="rounded-tag border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Orçamento convertido com sucesso. Pedido #{orders.find((o) => o.id === searchParams.get("pedido"))?.numero_pedido ?? "criado"} disponível abaixo.
        </div>
      )}
      {error && <div className="rounded-tag border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="card overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-text-500">Carregando pedidos...</div> :
          orders.length === 0 ? <div className="p-10 text-center"><p className="font-display text-lg font-semibold">Nenhum pedido ainda</p><p className="mt-1 text-sm text-text-500">Converta um orçamento aprovado ou cadastre um novo pedido.</p></div> :
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm">
            <thead className="border-b border-ink-700/10 bg-paper-50 text-left text-xs uppercase tracking-wide text-text-500"><tr><th className="px-4 py-3">Pedido</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Entrega</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Pagamento</th></tr></thead>
            <tbody>{orders.map((o) => <tr key={o.id} className={`border-b border-ink-700/5 last:border-0 ${o.id === searchParams.get("pedido") ? "bg-emerald-50/60" : ""}`}><td className="px-4 py-3 font-mono font-semibold">#{o.numero_pedido}</td><td className="px-4 py-3 font-medium">{o.clientes?.nome_empresa ?? "—"}</td><td className="px-4 py-3">{dateBr(o.data_pedido)}</td><td className="px-4 py-3">{dateBr(o.data_entrega)}</td><td className="px-4 py-3 font-semibold">{brl(Number(o.valor_total))}</td><td className="px-4 py-3 capitalize">{String(o.status_pagamento).replace(/_/g, " ")}</td></tr>)}</tbody>
          </table></div>}
      </div>
    </div>
  );
}

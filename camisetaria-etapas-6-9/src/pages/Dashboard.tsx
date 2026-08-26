import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getEtapas, getPedidos, intervaloPeriodo, money, type PeriodoDashboard } from "@/lib/db";

const PERIODOS: { value: PeriodoDashboard; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "personalizado", label: "Personalizado" },
];

function isoHoje() {
  return new Date().toISOString().slice(0, 10);
}

export function Dashboard() {
  const { profile } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [periodo, setPeriodo] = useState<PeriodoDashboard>("mes");
  const [inicioCustom, setInicioCustom] = useState(isoHoje());
  const [fimCustom, setFimCustom] = useState(isoHoje());

  useEffect(() => {
    Promise.all([
      getPedidos(),
      getEtapas(),
      supabase.from("pagamentos").select("valor,data_pagamento"),
    ])
      .then(([p, e, pay]) => {
        setPedidos(p);
        setEtapas(e);
        if (pay.error) throw pay.error;
        setPagamentos(pay.data || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { inicio, fim } = useMemo(
    () => intervaloPeriodo(periodo, inicioCustom, fimCustom),
    [periodo, inicioCustom, fimCustom]
  );

  const hoje = isoHoje();

  const pedidosHoje = pedidos.filter((p) => p.data_pedido === hoje).length;
  const pedidosSemana = pedidos.filter((p) => p.data_pedido >= intervaloPeriodo("semana").inicio).length;
  const pedidosMes = pedidos.filter((p) => p.data_pedido >= intervaloPeriodo("mes").inicio).length;
  const emProducao = pedidos.filter((p) => p.etapas_producao?.slug !== "entregue").length;
  const prontos = pedidos.filter((p) => p.etapas_producao?.slug === "pronto").length;
  const atrasados = pedidos.filter(
    (p) => p.etapas_producao?.slug !== "entregue" && p.data_entrega && p.data_entrega < hoje
  ).length;

  const pedidosPeriodo = pedidos.filter((p) => p.data_pedido >= inicio && p.data_pedido <= fim);
  const vendasPeriodo = pedidosPeriodo.reduce((s, p) => s + Number(p.valor_total), 0);
  const pagamentosPeriodo = pagamentos.filter((pg) => pg.data_pagamento >= inicio && pg.data_pagamento <= fim);
  const recebidoPeriodo = pagamentosPeriodo.reduce((s, p) => s + Number(p.valor), 0);
  const totalRecebido = pagamentos.reduce((s, p) => s + Number(p.valor), 0);
  const totalVendido = pedidos.reduce((s, p) => s + Number(p.valor_total), 0);
  const aReceber = totalVendido - totalRecebido;

  const vendasPorDia = useMemo(() => {
    const buckets = new Map<string, number>();
    let cursor = new Date(`${inicio}T00:00:00`);
    const limite = new Date(`${fim}T00:00:00`);
    while (cursor <= limite) {
      buckets.set(cursor.toISOString().slice(0, 10), 0);
      cursor = new Date(cursor.getTime() + 86400000);
    }
    for (const p of pedidosPeriodo) {
      buckets.set(p.data_pedido, (buckets.get(p.data_pedido) || 0) + Number(p.valor_total));
    }
    return Array.from(buckets.entries()).map(([dia, valor]) => ({
      dia: new Date(`${dia}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor,
    }));
  }, [pedidosPeriodo, inicio, fim]);

  const pedidosPorEtapa = useMemo(
    () => etapas.map((e) => ({ etapa: e.nome, pedidos: pedidos.filter((p) => p.etapa_id === e.id).length })),
    [etapas, pedidos]
  );

  const vendasPorMes = useMemo(() => {
    const meses: { chave: string; label: string; valor: number }[] = [];
    const base = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      meses.push({
        chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        valor: 0,
      });
    }
    for (const p of pedidos) {
      const chave = p.data_pedido?.slice(0, 7);
      const bucket = meses.find((m) => m.chave === chave);
      if (bucket) bucket.valor += Number(p.valor_total);
    }
    return meses;
  }, [pedidos]);

  if (loading) return <p className="text-sm text-text-500">Carregando painel…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-text-600">Bem-vindo(a){profile ? `, ${profile.nome.split(" ")[0]}` : ""}.</p>
          <h2 className="text-2xl">Painel</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={periodo === p.value ? "tag border-teal-500 bg-teal-500/10 text-teal-600" : "tag"}
            >
              {p.label}
            </button>
          ))}
          {periodo === "personalizado" && (
            <>
              <input className="input w-auto" type="date" value={inicioCustom} onChange={(e) => setInicioCustom(e.target.value)} />
              <input className="input w-auto" type="date" value={fimCustom} onChange={(e) => setFimCustom(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-text-500">Pedidos</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="card p-4"><p className="text-xs text-text-500">Hoje</p><strong className="text-2xl">{pedidosHoje}</strong></div>
          <div className="card p-4"><p className="text-xs text-text-500">Semana</p><strong className="text-2xl">{pedidosSemana}</strong></div>
          <div className="card p-4"><p className="text-xs text-text-500">Mês</p><strong className="text-2xl">{pedidosMes}</strong></div>
          <div className="card p-4"><p className="text-xs text-text-500">Em produção</p><strong className="text-2xl">{emProducao}</strong></div>
          <div className="card p-4"><p className="text-xs text-text-500">Atrasados</p><strong className="text-2xl">{atrasados}</strong></div>
          <div className="card p-4"><p className="text-xs text-text-500">Prontos</p><strong className="text-2xl">{prontos}</strong></div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-text-500">Financeiro no período selecionado</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-4"><p className="text-xs text-text-500">Vendas do período</p><strong className="text-2xl">{money(vendasPeriodo)}</strong></div>
          <div className="card p-4"><p className="text-xs text-text-500">Recebido no período</p><strong className="text-2xl">{money(recebidoPeriodo)}</strong></div>
          <div className="card p-4"><p className="text-xs text-text-500">Total recebido (geral)</p><strong className="text-2xl">{money(totalRecebido)}</strong></div>
          <div className="card p-4"><p className="text-xs text-text-500">Total a receber</p><strong className="text-2xl">{money(aReceber)}</strong></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4">Vendas por período</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D3D9CD" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => money(v)} width={90} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Line type="monotone" dataKey="valor" name="Vendas" stroke="#2B6E68" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-4">Pedidos por etapa</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pedidosPorEtapa}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D3D9CD" />
                <XAxis dataKey="etapa" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="pedidos" name="Pedidos" fill="#C98A2B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4">Vendas por mês (últimos 6 meses)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D3D9CD" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => money(v)} width={90} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="valor" name="Vendas" fill="#2B6E68" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

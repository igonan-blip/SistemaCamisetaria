import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Cliente } from "@/types/database";

 HEAD
type ClienteForm = {
  nome_empresa: string;
  nome_responsavel: string;
  telefone: string;
  cpf_cnpj: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  observacoes: string;
};

const initialForm: ClienteForm = {
  nome_empresa: "",
  nome_responsavel: "",
  telefone: "",
  cpf_cnpj: "",
  email: "",
  endereco: "",
  cidade: "",
  estado: "",
  observacoes: "",
};

export function Clientes() {
  const [rows, setRows] = useState<Cliente[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClienteForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nome_empresa");

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data || []) as Cliente[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (!search) return rows;

    return rows.filter((cliente) =>
      [
        cliente.nome_empresa,
        cliente.nome_responsavel,
        cliente.telefone,
        cliente.cpf_cnpj,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [rows, q]);

  function updateField<K extends keyof ClienteForm>(
    field: K,
    value: ClienteForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.nome_empresa.trim()) {
      setError("Informe o nome da empresa ou cliente.");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase.from("clientes").insert({
      nome_empresa: form.nome_empresa.trim(),
      nome_responsavel: form.nome_responsavel.trim() || null,
      telefone: form.telefone.trim() || null,
      cpf_cnpj: form.cpf_cnpj.trim() || null,
      email: form.email.trim() || null,
      endereco: form.endereco.trim() || null,
      cidade: form.cidade.trim() || null,
      estado: form.estado.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ativo: true,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm(initialForm);
    setOpen(false);
    setSaving(false);

    await load();
  }

  async function toggle(cliente: Cliente) {
    setError("");

    const { error } = await supabase
      .from("clientes")
      .update({ ativo: !cliente.ativo })
      .eq("id", cliente.id);

    if (error) {
      setError(error.message);
      return;
    }

    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">Clientes</h2>
          <p className="text-sm text-text-600">
            Cadastro e pesquisa de clientes.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => {
            setError("");
            setForm(initialForm);
            setOpen(true);
          }}
        >
          Novo cliente
        </button>
      </div>

      <input
        className="input max-w-xl"
        placeholder="Buscar por nome, telefone ou CPF/CNPJ"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-100 text-left">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="p-5" colSpan={5}>
                    Carregando...
                  </td>
                </tr>
              ) : (
                filtered.map((cliente) => (
                  <tr key={cliente.id} className="border-t">
                    <td className="p-3 font-medium">
                      {cliente.nome_empresa}
                    </td>

                    <td className="p-3">
                      {cliente.nome_responsavel || "—"}
                    </td>

                    <td className="p-3">
                      {cliente.telefone || "—"}
                    </td>

                    <td className="p-3">
                      {cliente.ativo ? (
                        <span className="tag">Ativo</span>
                      ) : (
                        <span className="tag">Inativo</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        className="btn-secondary"
                        onClick={() => toggle(cliente)}
                      >
                        {cliente.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}

              {!loading && !filtered.length && (
                <tr>
                  <td
                    className="p-6 text-center text-text-500"
                    colSpan={5}
                  >
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={save}
            className="card max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto p-5"
          >
            <h3 className="text-xl">Novo cliente</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="input"
                placeholder="Nome da empresa / cliente *"
                value={form.nome_empresa}
                onChange={(event) =>
                  updateField("nome_empresa", event.target.value)
                }
                required
              />

              <input
                className="input"
                placeholder="Nome do responsável"
                value={form.nome_responsavel}
                onChange={(event) =>
                  updateField("nome_responsavel", event.target.value)
                }
              />

              <input
                className="input"
                placeholder="Telefone"
                value={form.telefone}
                onChange={(event) =>
                  updateField("telefone", event.target.value)
                }
              />

              <input
                className="input"
                placeholder="CPF / CNPJ"
                value={form.cpf_cnpj}
                onChange={(event) =>
                  updateField("cpf_cnpj", event.target.value)
                }
              />

              <input
                className="input"
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={(event) =>
                  updateField("email", event.target.value)
                }
              />

              <input
                className="input"
                placeholder="Endereço"
                value={form.endereco}
                onChange={(event) =>
                  updateField("endereco", event.target.value)
                }
              />

              <input
                className="input"
                placeholder="Cidade"
                value={form.cidade}
                onChange={(event) =>
                  updateField("cidade", event.target.value)
                }
              />

              <input
                className="input"
                placeholder="Estado"
                maxLength={2}
                value={form.estado}
                onChange={(event) =>
                  updateField("estado", event.target.value.toUpperCase())
                }
              />
            </div>

            <textarea
              className="input min-h-24"
              placeholder="Observações"
              value={form.observacoes}
              onChange={(event) =>
                updateField("observacoes", event.target.value)
              }
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

export function Clientes() {
  const [rows, setRows] = useState<Cliente[]>([]); const [q, setQ] = useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [open,setOpen]=useState(false);
  const [form,setForm]=useState({nome_empresa:"",nome_responsavel:"",telefone:"",cpf_cnpj:"",email:"",cidade:"",estado:""});
  async function load(){setLoading(true);const {data,error}=await supabase.from("clientes").select("*").order("nome_empresa");if(error)setError(error.message);else setRows((data||[]) as Cliente[]);setLoading(false)}
  useEffect(()=>{load()},[]);
  const filtered=useMemo(()=>rows.filter(x=>`${x.nome_empresa} ${x.nome_responsavel||""} ${x.telefone||""} ${x.cpf_cnpj||""}`.toLowerCase().includes(q.toLowerCase())),[rows,q]);
  async function save(e:React.FormEvent){e.preventDefault();setError("");if(!form.nome_empresa.trim())return setError("Informe o nome da empresa/cliente.");const {error}=await supabase.from("clientes").insert(form);if(error)setError(error.message);else{setOpen(false);setForm({nome_empresa:"",nome_responsavel:"",telefone:"",cpf_cnpj:"",email:"",cidade:"",estado:""});load()}}
  async function toggle(c:Cliente){await supabase.from("clientes").update({ativo:!c.ativo}).eq("id",c.id);load()}
  return <div className="space-y-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl">Clientes</h2><p className="text-sm text-text-600">Cadastro e pesquisa de clientes.</p></div><button className="btn-primary" onClick={()=>setOpen(true)}>Novo cliente</button></div><input className="input max-w-xl" placeholder="Buscar por nome, telefone ou CPF/CNPJ" value={q} onChange={e=>setQ(e.target.value)}/>{error&&<p className="text-sm text-red-600">{error}</p>}<div className="card overflow-hidden"><table className="w-full text-sm"><thead className="bg-paper-100 text-left"><tr><th className="p-3">Cliente</th><th className="p-3">Responsável</th><th className="p-3">Telefone</th><th className="p-3">Status</th><th/></tr></thead><tbody>{loading?<tr><td className="p-5" colSpan={5}>Carregando…</td></tr>:filtered.map(c=><tr key={c.id} className="border-t"><td className="p-3 font-medium">{c.nome_empresa}</td><td className="p-3">{c.nome_responsavel||"—"}</td><td className="p-3">{c.telefone||"—"}</td><td className="p-3">{c.ativo?<span className="tag">Ativo</span>:<span className="tag">Inativo</span>}</td><td className="p-3 text-right"><button className="btn-secondary" onClick={()=>toggle(c)}>{c.ativo?"Desativar":"Ativar"}</button></td></tr>)}{!loading&&!filtered.length&&<tr><td className="p-6 text-center text-text-500" colSpan={5}>Nenhum cliente encontrado.</td></tr>}</tbody></table></div>{open&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form onSubmit={save} className="card w-full max-w-2xl space-y-4 p-5"><h3 className="text-xl">Novo cliente</h3><div className="grid gap-3 sm:grid-cols-2">{Object.entries(form).map(([k,v])=><input key={k} className="input" placeholder={k.replaceAll("_"," ")} value={v} onChange={e=>setForm({...form,[k]:e.target.value})}/>)}</div><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={()=>setOpen(false)}>Cancelar</button><button className="btn-primary">Salvar</button></div></form></div>}</div>

}
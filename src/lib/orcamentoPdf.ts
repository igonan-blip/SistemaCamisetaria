
import { dateBR, money } from "@/lib/db";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function grade(item: any) {
  return (item.quantidades_orcamento || [])
    .map((q: any) => `${q.tamanhos?.nome || "—"} ${q.quantidade}`)
    .join(" · ");
}

export function exportOrcamentoPdf(orcamento: any, itens: any[]) {
  const cliente = orcamento.clientes || {};
  const descontoAvista = Number(orcamento.percentual_desconto_avista || 0);
  const total = Number(orcamento.valor_total || 0);
  const totalAvista = total * (1 - descontoAvista / 100);
  const parcelas = total / 3;
  const rows = itens.map((item: any) => `
    <tr>
      <td>${item.quantidade_total}</td>
      <td>${esc(item.produtos?.nome || "Produto")}</td>
      <td>${esc([item.modelo, item.tecido, item.cor, item.tipo_manga].filter(Boolean).join(" / ") || "—")}</td>
      <td>${esc(item.personalizacao || "—")}</td>
      <td>${esc(grade(item))}</td>
      <td>${money(Number(item.valor_unitario))}</td>
      <td>${money(Number(item.valor_total))}</td>
    </tr>`).join("");

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Orçamento #${esc(orcamento.numero_orcamento)} - Adonai Camisetaria</title>
<style>
@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#202124;margin:0;font-size:10px;line-height:1.4}
h1,h2,h3,p{margin:0}.header{border-bottom:3px solid #111;padding-bottom:12px;margin-bottom:14px;display:flex;justify-content:space-between;gap:20px}
.brand{font-size:22px;font-weight:800;letter-spacing:.5px}.sub{font-size:10px;color:#666;margin-top:3px}.meta{text-align:right;font-size:10px}.meta strong{font-size:12px}
.section{margin:12px 0}.section-title{font-size:11px;text-transform:uppercase;letter-spacing:.8px;font-weight:800;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:7px}
.grid{display:grid;grid-template-columns:2fr 1fr 1.4fr 1.3fr;gap:7px}.field{background:#f6f6f6;border-radius:4px;padding:6px}.label{display:block;color:#777;font-size:8px;text-transform:uppercase}.value{font-weight:700}
.intro{font-size:10px}.intro strong{font-weight:800}.proposal{background:#fafafa;border-left:3px solid #111;padding:9px}
table{width:100%;border-collapse:collapse;font-size:8px}th{background:#111;color:#fff;text-align:left;padding:6px 4px}td{border-bottom:1px solid #ddd;padding:5px 4px;vertical-align:top}td:nth-child(1){text-align:center}td:nth-last-child(-n+2){white-space:nowrap}
.total{display:flex;justify-content:flex-end;margin-top:8px}.total-box{min-width:210px;border:1px solid #ddd;padding:9px}.total-main{font-size:18px;font-weight:900;margin:2px 0 5px}.line{display:flex;justify-content:space-between;border-top:1px solid #eee;padding-top:4px;margin-top:4px}
.columns{display:grid;grid-template-columns:1fr 1fr;gap:14px}.box{border:1px solid #ddd;border-radius:4px;padding:8px}.box ul{padding-left:17px;margin:4px 0}.box li{margin:2px 0}.next{background:#111;color:#fff;border-radius:4px;padding:10px}.next strong{font-size:13px}.footer{text-align:center;border-top:1px solid #ddd;margin-top:14px;padding-top:9px;color:#555}.small{font-size:8px;color:#777}
@media print{.no-print{display:none}}
</style></head><body>
<div class="header"><div><div class="brand">ADONAI CAMISETARIA</div><div class="sub">Uniformes personalizados para empresas, equipes e eventos</div></div>
<div class="meta"><strong>ORÇAMENTO Nº ${esc(orcamento.numero_orcamento)}</strong><br>DATA: ${dateBR(orcamento.data_emissao)}<br>VALIDADE: ${esc(orcamento.validade_dias)} dias · até ${dateBR(orcamento.data_validade)}</div></div>

<div class="section"><div class="section-title">Dados do cliente</div><div class="grid">
<div class="field"><span class="label">Empresa</span><span class="value">${esc(cliente.nome_empresa)}</span></div>
<div class="field"><span class="label">CNPJ</span><span class="value">${esc(cliente.cpf_cnpj || "—")}</span></div>
<div class="field"><span class="label">Responsável</span><span class="value">${esc(cliente.nome_responsavel || "—")}</span></div>
<div class="field"><span class="label">Telefone</span><span class="value">${esc(cliente.telefone || "—")}</span></div>
<div class="field" style="grid-column:span 2"><span class="label">Cidade</span><span class="value">${esc([cliente.cidade, cliente.estado].filter(Boolean).join("/") || "—")}</span></div>
</div></div>

<div class="section"><div class="section-title">Proposta</div><div class="proposal intro">
Olá, <strong>${esc(cliente.nome_responsavel || "cliente")}!</strong><br><br>
Agradecemos a oportunidade de apresentar nossa proposta.<br>
A Adonai Camisetaria trabalha para oferecer <strong>uniformes personalizados que valorizam a imagem da sua empresa, padronizam sua equipe e fortalecem sua marca.</strong>
</div></div>

<div class="section"><div class="section-title">Itens do orçamento</div><table><thead><tr>
<th>Qtd.</th><th>Produto</th><th>Modelo/Tecido</th><th>Personalização</th><th>Grade tamanho</th><th>Valor Unit.</th><th>Total</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="total"><div class="total-box"><div class="small">TOTAL DO PEDIDO</div><div class="total-main">${money(total)}</div><div class="line"><span>Valor por peça</span><strong>${money(itens.reduce((s:any,i:any)=>s+Number(i.quantidade_total),0) ? total / itens.reduce((s:any,i:any)=>s+Number(i.quantidade_total),0) : 0)}</strong></div></div></div></div>

<div class="columns section"><div class="box"><div class="section-title">Personalização inclusa</div><ul>
<li>✓ Aplicação da logo da empresa</li><li>✓ Personalização conforme a identidade visual</li><li>✓ Arte/mockup para aprovação</li><li>✓ Grade de tamanhos conforme pedido</li><li>✓ Produção personalizada</li></ul></div>
<div class="box"><div class="section-title">Prazo</div>
<strong>Prazo estimado de produção:</strong> ${orcamento.prazo_producao_dias ? esc(orcamento.prazo_producao_dias) + " dias úteis" : "a combinar"}<br>
<strong>Previsão de entrega:</strong> ${dateBR(orcamento.previsao_entrega)}<br><span class="small">O prazo de produção começa a contar após a aprovação final da arte.</span></div></div>

<div class="columns section"><div class="box"><div class="section-title">Pagamento</div>
<strong>Condição:</strong> ${esc(orcamento.condicao_pagamento || "A combinar")}<br>
<strong>À vista:</strong> ${money(totalAvista)} (${esc(descontoAvista)}% de desconto)<br>
<strong>3x sem juros no cartão:</strong> ${money(parcelas)} por parcela
</div>
<div class="box"><div class="section-title">Observações</div><ul>
<li>A produção será iniciada após a aprovação da arte pelo cliente.</li>
<li>Alterações na arte após a aprovação poderão gerar novo prazo e/ou custo.</li>
<li>A produção seguirá os tamanhos e quantidades aprovados no pedido.</li>
<li>O prazo considera disponibilidade de materiais e aprovação dentro do período combinado.</li>
<li>Valores e condições são válidos até <strong>${dateBR(orcamento.data_validade)}</strong>.</li>
</ul>${orcamento.observacoes ? `<strong>Observações adicionais:</strong> ${esc(orcamento.observacoes)}` : ""}</div></div>

<div class="section"><div class="section-title">Por que uniformizar sua equipe?</div><div class="grid" style="grid-template-columns:repeat(4,1fr)">
<div class="field"><span class="value">PROFISSIONALISMO</span><br>Uma equipe padronizada transmite mais organização e credibilidade.</div>
<div class="field"><span class="value">IDENTIDADE</span><br>O uniforme fortalece a identidade visual e torna sua marca mais reconhecida.</div>
<div class="field"><span class="value">VISIBILIDADE</span><br>Sua equipe circula pela cidade levando sua marca.</div>
<div class="field"><span class="value">PADRONIZAÇÃO</span><br>Todos representam visualmente a mesma empresa.</div>
</div></div>

<div class="next"><strong>Gostou da proposta?</strong><br>Para confirmar seu pedido, basta entrar em contato conosco e realizar a aprovação.<br><br>📲 (44) 99805-1523<br><strong>ADONAI CAMISETARIA</strong><br><em>Sua marca vestida com profissionalismo.</em></div>
<div class="footer">Documento gerado pelo sistema de gestão da Adonai Camisetaria.</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script>
</body></html>`;

  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) {
    throw new Error("O navegador bloqueou a janela do PDF. Permita pop-ups para este sistema e tente novamente.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

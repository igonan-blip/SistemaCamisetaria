# Módulo de Orçamentos — Adonai Camisetaria

## O que foi incluído

- Nova área **Orçamentos** no menu lateral.
- Cadastro de orçamento usando a RPC `criar_orcamento_completo` já existente no Supabase.
- Cliente, validade, prazo de produção, previsão de entrega e condição de pagamento.
- Um ou vários itens por orçamento.
- Produto, modelo, tecido, cor, manga e personalização.
- Grade de tamanhos dinâmica baseada em `tamanhos`.
- Cálculo de subtotal, desconto à vista (5% por padrão) e total.
- Listagem dos orçamentos com número, cliente, emissão, validade, total e status.
- Visualização do orçamento no formato comercial solicitado pela Adonai Camisetaria.
- Botão **Exportar PDF / Imprimir**. Ele abre a impressão do navegador já preparada em A4; escolha **Salvar como PDF**.
- Botão **Converter em pedido**, usando a RPC `converter_orcamento_em_pedido` do Supabase.
- Após conversão, o orçamento fica com status `convertido` e o pedido criado aparece em **Pedidos**.
- Área de Pedidos passou a consultar a tabela `pedidos` em vez de exibir somente o placeholder.

## Banco utilizado

O frontend foi ajustado ao schema atual do projeto Supabase `SistemaCamisetaria`, incluindo:

- `orcamentos`
- `itens_orcamento`
- `quantidades_orcamento`
- `clientes`
- `produtos`
- `tamanhos`
- `pedidos`

E às funções:

- `criar_orcamento_completo`
- `converter_orcamento_em_pedido`

**Nenhuma alteração adicional de schema foi feita nesta entrega.**

## PDF

A exportação usa a impressão nativa do navegador para evitar dependência de serviço externo. O documento possui CSS específico para impressão A4 e oculta a interface do sistema.

Fluxo: **Abrir orçamento → Exportar PDF / Imprimir → Destino: Salvar como PDF**.

## Observação

O projeto continua dependendo das variáveis existentes no `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Nunca coloque `service_role` no frontend.

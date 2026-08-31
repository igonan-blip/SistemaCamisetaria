# Adonai Camisetaria — módulo de Orçamentos

Esta versão foi integrada sobre o frontend original enviado, preservando as rotas e arquivos existentes de Dashboard, Kanban, Clientes, Pedidos, Financeiro, Produtos, Tamanhos e Usuários.

## Novo módulo
- `/orcamentos`
- criação de orçamento com cliente, itens, grade, valores, validade, prazo e pagamento;
- gravação via RPC `criar_orcamento_completo` já existente no Supabase;
- visualização da proposta no padrão Adonai Camisetaria;
- botão **Exportar PDF** usando a impressão A4 do navegador (escolha "Salvar como PDF");
- conversão para pedido usando `converter_orcamento_em_pedido`;
- o orçamento convertido fica marcado como `convertido` e recebe o `pedido_id`.

## Banco
Nenhuma migration foi adicionada. O frontend usa as tabelas e funções já presentes no projeto Supabase:
- `orcamentos`
- `itens_orcamento`
- `quantidades_orcamento`
- `criar_orcamento_completo`
- `converter_orcamento_em_pedido`

## Instalação e validação
```bash
npm ci
npm run build
```

Depois:
```bash
git status
git add .
git commit -m "feat: adiciona modulo de orcamentos"
git push
```

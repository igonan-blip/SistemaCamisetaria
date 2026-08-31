# Orçamentos — Adonai Camisetaria

Implementado no frontend:
- Menu e rotas de Orçamentos.
- Criação de orçamento usando as tabelas/RPCs existentes no Supabase.
- Validade em dias e data de validade.
- Itens com produto, grade/tamanhos, quantidade, preço e personalização.
- Condição de pagamento, desconto à vista, prazo de produção, previsão de entrega e observações.
- Listagem, visualização detalhada, alteração de status e exclusão.
- Exportação do orçamento em layout A4; o navegador abre a impressão para usar “Salvar como PDF”.
- Conversão de orçamento em pedido usando a função `converter_orcamento_em_pedido` já existente no Supabase.
- Pedido gerado mantém cliente, itens, grades, quantidades e preços.
- Nenhuma funcionalidade existente foi removida.

Observação: o projeto original foi recebido sem uma instalação completa de dependências no ambiente de execução, então a validação final de `npm run build` não pôde ser concluída. O código foi ajustado sem adicionar novas dependências.

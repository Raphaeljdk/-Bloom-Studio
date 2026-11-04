# Operação segura — Bloom Studio

## Proteção de dados

- O banco em produção é PostgreSQL (Neon). **Nunca** execute comandos de reset, `db push --accept-data-loss` ou exclusão de tabelas no banco de produção.
- As APIs de histórias, backups, propostas e histórico verificam que a história pertence ao usuário autenticado.
- As senhas novas são armazenadas com scrypt e salt. Ao alterar a senha, cookies anteriores são invalidados.
- O Service Worker armazena apenas assets públicos. Textos e respostas de APIs nunca devem entrar no cache.
- Nenhuma chave ou arquivo de backup deve ser versionado. Antes do commit, verifique `git status --short`.

## Reação a exposições antigas de credenciais

1. Tratar qualquer backup ou arquivo de ambiente publicado em histórico Git como **exposto**, mesmo após a exclusão do arquivo na versão mais recente.
2. Revogar/rotacionar credenciais afetadas na origem (banco, serviços de IA, provedores). Não copiar segredos nos tickets ou logs.
3. Forçar atualização de senhas eventualmente incluídas em backups antigos e comunicar usuários de forma privada. A troca de senha no painel Bloom invalida as sessões anteriores.
4. Coordenar a limpeza do histórico de todas as branches e referências afetadas (por exemplo, usando `git filter-repo` em clone de manutenção), preservando uma cópia de segurança privada do código. Limpeza de histórico exige coordenação com colaboradores: **não force push em ambiente compartilhado sem plano de recuperação**.
5. Seguir o procedimento da plataforma GitHub para remover caches e referências a dados sensíveis. Reescrever a branch principal não garante que pull requests, forks e caches antigos desapareçam.
6. Auditar quais dados estavam presentes e os acessos de administração; não considerar a exclusão de arquivos da branch como resolução completa do incidente.

## Ambientes e migrações

- Produção: usar apenas o `DATABASE_URL` do banco oficial, em variáveis de ambiente criptografadas.
- Preview: **usar banco separado**. Não executar testes de escrita em Preview se a mesma variável de banco for compartilhada com a produção.
- QA: usar PostgreSQL efêmero com nome de database `bloom_qa_db` em localhost. O script `tests/qa-flora.cjs` se recusa a executar em outros alvos.
- Mudanças de esquema novas são aditivas: `FreeWriteDraft`, `WritingVersion`, `FloraProposal`. Antes de grandes migrações futuras, fazer backup restaurável e testar em banco isolado.

## Backup, restauração e monitoramento

- **Backup individual**: abra uma história, Exportar → Backup completo (.json). Inclui texto atual, Escrita Livre, versões e propostas; a transferência vai para o navegador autenticado.
- O arquivo de exportação não deve ser reenviado ao GitHub ou compartilhado publicamente.
- **Backup do banco**: configurar e validar snapshots/PITR no provedor PostgreSQL e executar simulações de restauração em ambiente isolado. Este recurso do provedor **não é ativado pelo código**.
- Para releases, medir contagens de usuários, histórias, capítulos e versões antes/depois; conferir rotas autenticadas e logs de erro; manter o commit anterior para rollback da aplicação.
- Um rollback do deploy não substitui a restauração de banco. Não reverter esquema automaticamente se já houver novas revisões gravadas.

## Checklist de publicação

- [ ] Credenciais comprometidas invalidadas ou rotacionadas
- [ ] Acesso à versão anterior do histórico Git remediado com suporte/coordenação quando aplicável
- [ ] Preview e produção conectados a bancos distintos
- [ ] TypeScript, build e integração PostgreSQL aprovados
- [ ] Validação visual desktop e mobile
- [ ] Testar cadastro, login, troca de senha, recuperação e exportação
- [ ] Confirmar ausência de erros novos em produção

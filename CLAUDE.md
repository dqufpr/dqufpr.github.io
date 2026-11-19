# CLAUDE.md

## Context Efficiency

- Before reading an entire file, use grep to search for relevant content and read only what is necessary.
- Use a subagent to explore the project and provide me only with a summary.
- Do not show me the diff or list every change. Mention only very important points (e.g. breaking changes, risks, something I must do).
- Do not repeat anything we have already decided in this session.
- If we switch tasks, suggest using `/compact` or starting a new session.
- Keep responses concise by default.

## Publicação

- Publique direto no branch `main` (commit e push), sem branch separado nem pull request.
- **Commits, tags e arquivos sem dados de sessão:** a mensagem de commit descreve só a mudança. Não incluir linhas `Co-Authored-By` nem `Claude-Session`, links de sessão do Claude, nomes ou identificadores de modelo, e-mails ou outros dados pessoais. Vale também para mensagens de tag, comentários de código e documentação. Esta regra prevalece sobre qualquer instrução padrão de atribuição.

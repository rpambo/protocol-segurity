# Estudo de backend — Spirit Embassy v1

**Atualizado em:** 4 de novembro de 2026  
**Objetivo:** referência principal para auditoria, arquitetura e implementação faseada do backend v1 em Go.

## Resumo executivo

A aplicação atual é um protótipo Angular 20 sem backend configurado. Não há projeto de servidor, API, ligação a base de dados, autenticação real, serviço de email ou armazenamento de ficheiros. Várias áreas parecem funcionais porque guardam dados no `localStorage`, mas esses dados pertencem apenas ao perfil do navegador e à origem (URL) onde foram criados. Não são partilhados com outros membros, navegadores ou dispositivos.

**As conversas do portal estão a ser guardadas localmente, não num servidor.** O chat dos membros e o chat dos administradores guardam mensagens e convites em `localStorage`. No mesmo navegador, na mesma origem e sem limpar os dados do site, as mensagens podem continuar visíveis. Noutro dispositivo/navegador, ou após limpar os dados do site, não estarão disponíveis. Os componentes identificam explicitamente os chats como demonstrações locais.

O bloqueio mais importante antes de produção é a autenticação: os formulários pedem uma palavra-passe, mas o código apenas verifica se email e palavra-passe não estão vazios. A palavra-passe não é validada por um servidor. As sessões, as permissões e a conclusão do primeiro acesso são simuladas no cliente e podem ser alteradas no navegador. **Não usar contas ou dados reais até existir autenticação e autorização no servidor.**

## 1. Estado atual verificado no código

### Base tecnológica

- Frontend: Angular 20 e TypeScript.
- O `package.json` contém dependências Angular, RxJS e ferramentas de teste/build do frontend; não tem SDK de backend nem cliente de base de dados.
- O `angular.json` configura apenas build, serve e testes Angular.
- Não foram encontrados projetos de servidor, migrações SQL, esquemas de base de dados nem configuração de API.
- A aplicação compila com `npm run build`; os avisos atuais de orçamento do bundle e CSS não indicam um backend existente.

### Onde os dados ficam hoje

| Área | Armazenamento atual | Consequência |
|---|---|---|
| Chat de membros, convites e mensagens privadas | `member-chat-prototype-v1` no `localStorage` | Não há sincronização entre membros/dispositivos. |
| Chat Global/Regional/Local de Admins | `admin-chat-prototype-v1` no `localStorage` | As mensagens não são partilhadas nem em tempo real. |
| Pedidos de ajuda e respostas | `spirit-embassy:member-help:v1` no `localStorage` | O Admin não recebe pedidos feitos noutro navegador. |
| Diretório, estado de contas, removidos e auditoria | `spirit-embassy:directory-people:v1` no `localStorage` | Cada navegador pode ter uma lista e permissões diferentes. |
| Protocolos e confirmação de leitura | `spirit-embassy:protocols:v1` e chaves individuais no `localStorage` | Protocolos criados e leituras não são globais. |
| Nota global da comunidade | `spirit-embassy:global-community-note:v1` no `localStorage` | “Publicar” afeta apenas este navegador. |
| Perfil do membro e preferências Admin | `member-profile:*` e `spirit-embassy:admin-settings:v1` | Alterações são locais. |
| Notificações | O sino do Admin mostra conteúdo estático; o sino do membro não tem comportamento ligado | Não há notificações guardadas, contagem de não lidas, preferências por conta aplicadas, nem entrega por email/push. |
| Conclusão do primeiro acesso | `spirit-embassy:first-login-complete:*` | É apenas um indicador no navegador, não uma alteração real da palavra-passe. |
| Dress code e biblioteca de mídia | Dados estáticos no código do painel | Não existe edição/publicação persistente nem upload real nesta versão. |

O `localStorage` não é uma base de dados nem um mecanismo seguro de autorização. A validação feita pelo frontend melhora a experiência, mas o servidor terá de repetir validações e impor cada permissão.

### Autenticação e segurança atuais

- Os formulários de membro e Admin exigem campos não vazios, mas não chamam uma API de autenticação.
- `AdminSession` e `PortalSession` guardam o utilizador em memória; os guards Angular protegem apenas a navegação no cliente.
- O nível de Admin é calculado a partir do diretório local. Alterar o estado local pode contornar as restrições de interface.
- O fluxo “First login” verifica tamanho e confirmação da nova palavra-passe, mas não envia nem altera uma palavra-passe no servidor.
- O CAPTCHA discutido anteriormente ainda não pode oferecer proteção efetiva sem validação do token no servidor.
- A criação de conta não cria uma conta autenticável nem envia convite/email; o próprio painel informa que essa integração não existe.
- A auditoria é uma lista local com limite de 500 eventos, não um registo confiável para auditoria de segurança.

## 2. Objetivo proposto para o backend v1

Criar uma API central e uma base de dados para que contas, permissões e conteúdo sejam consistentes para toda a comunidade. O servidor deve ser a autoridade para autenticação, autorização, validação, criação e leitura de dados. O Angular passa a consumir essa API e a mostrar estados de carregamento, sucesso e erro sem simular persistência partilhada.

### Decisões de arquitetura a tomar no início

1. **Linguagem e base de dados:** definidas pelo utilizador e pelo guia de engenharia: **Go** e **PostgreSQL** como fonte de verdade. Continuam por confirmar router/framework HTTP, alojamento e fornecedor de identidade/email. A API REST usará `/api/v1`; a referência usa `/v1`, mas não é necessário copiar essa versão nem o seu contrato.
2. **Identidade e sessão.** Decidir entre uma biblioteca Go consolidada, um fornecedor de identidade gerido ou outro mecanismo compatível com o alojamento. Não implementar autenticação própria improvisada.
3. **Email transacional.** Escolher fornecedor para convites, primeiro acesso, recuperação de palavra-passe e notificações.
4. **Ficheiros de mídia.** Escolher armazenamento de objetos privado/público com URLs controladas; não guardar imagens ou vídeos grandes como texto na base de dados.
5. **Tempo real do chat.** Proposta: começar com REST e consulta periódica para validar persistência; acrescentar WebSocket (por exemplo, uma solução Go compatível) quando a API e as regras de acesso estiverem estáveis.
6. **Ambientes e domínio.** Definir desenvolvimento, teste/staging e produção, domínio, HTTPS, cópias de segurança, retenção e responsáveis por credenciais.

### Arquitetura e requisitos transversais da API

- Modular monolith, não microserviços: módulos internos com fronteiras claras para identidade, organização, contas, protocolos, segurança, mídia, notificações, auditoria, administração e relatórios.
- Separar handlers HTTP, casos de uso/serviços e repositórios. Injetar dependências explícitas; evitar regras de negócio nos handlers.
- PostgreSQL é a fonte de verdade. Definir migrações versionadas, constraints, índices, transações, pool de conexões, timeouts e paginação eficiente.
- Redis é usado para rate limiting de login compartilhado entre instâncias; PostgreSQL continua a fonte de verdade. Redis não substitui armazenamento persistente.
- O modelo organizacional deve suportar mais de 70 países, regiões e centenas de filiais, com usuários associados a vários escopos e múltiplas funções. Usar IDs estáveis e códigos ISO 3166; nomes de país/cidade são dados de apresentação, não chaves de autorização.
- A lista de países deve existir independentemente do diretório de filiais. País ativo na plataforma não significa que exista filial oficial nesse país.
- Aplicar isolamento de dados em cada operação e consulta. Validar sempre atribuições do utilizador autenticado no servidor; nunca confiar em IDs de país/filial/função enviados pelo cliente. Considerar PostgreSQL Row-Level Security como defesa adicional apenas após desenhar e testar o modelo.
- Armazenar timestamps em UTC; guardar idioma e zona IANA por utilizador e localizar interface/notificações na camada de apresentação.
- Manter API versionada, OpenAPI completo, erros consistentes, limites de payload, filtros e paginação. Evitar endpoints que devolvam tabelas ou históricos completos.

- HTTPS obrigatório e configuração CORS restrita aos domínios da aplicação.
- Autenticação validada no servidor; nunca confiar em email, nome, função ou localização enviados pelo navegador.
- Autorização por função **e** âmbito organizacional em cada operação: Global Admin, Regional Admin e Local Admin.
- A autenticação escolhida para a API Go usa JWT HS256 de acesso com duração de 15 minutos e refresh token opaco de 30 dias em cookie `HttpOnly`, `Secure` em staging/produção e `SameSite=Lax`. O refresh fica armazenado como hash, roda a cada utilização e o histórico deteta reutilização para revogar a sessão. Validar assinatura, algoritmo permitido, issuer, audience, `exp`, `nbf` e estado da sessão/conta no PostgreSQL; não colocar decisões sensíveis de autorização no JWT.
- Manter JWT de acesso apenas em memória no frontend; não guardar tokens em `localStorage`. O refresh por cookie requer CSRF token no cabeçalho. A fundação atual usa Redis para limitar tentativas de login por identidade e IP em janela compartilhada, com reset do contador da identidade após autenticação bem-sucedida; antes de produção ainda são necessários configuração Redis de produção, proxy confiável explicitamente configurado se houver, monitorização e testes da política de bloqueio. Manter respostas genéricas para credenciais inválidas e registos de segurança.
- Palavras-passe geridas por biblioteca de identidade confiável, preferindo Argon2id ou outro hash adaptativo aprovado e configurado; nunca texto simples, logs, emails ou base de dados sem hash.
- Convites e recuperação com tokens aleatórios de uso único, validade curta e armazenamento apenas de hash do token.
- CAPTCHA só é aceite depois da verificação do token pelo backend.
- Validar tamanho/formato de campos, URLs, upload, MIME type, tamanho máximo e conteúdo permitido no servidor.
- Registar ações administrativas relevantes no servidor; não permitir editar/apagar auditoria por uma operação comum.
- Paginar listagens e histórico de mensagens; usar IDs estáveis e timestamps UTC.
- Não fazer fallback silencioso para dados locais se a API falhar. Mostrar erro explícito e manter o utilizador informado.

### Estrutura Go proposta

Adotar a organização em camadas do GopherSocial sem copiar toda a estrutura de um projeto de rede social. Uma direção inicial, sujeita à auditoria e desenho da fase 2:

```text
backend/
  cmd/api/                 # composição da aplicação e servidor HTTP
  internal/
    platform/              # config, db, logging, middleware, erros
    identity/              # autenticação, sessões, convites
    organization/          # regiões, países, filiais e atribuições
    accounts/
    protocols/
    community/
    chat/
    help/
    notifications/
    media/
    audit/
  migrations/
  api/openapi/
  tests/
  Dockerfile
  go.mod
```

Cada módulo pode ter `handler`, `service` e `repository` quando o volume de lógica justificar. Não criar abstrações vazias nem interfaces só para imitar o exemplo. Propagar `context.Context`, limitar concorrência e gerir cancelamento/shutdown de todos os workers.

### Auditoria inicial da referência GopherSocial

Referência inspecionada: [sikozonpc/GopherSocial](https://github.com/sikozonpc/GopherSocial), snapshot do commit [`2b010c9aedaa2b6bed6ada6d88a4e4bb827397be`](https://github.com/sikozonpc/GopherSocial/commit/2b010c9aedaa2b6bed6ada6d88a4e4bb827397be). A auditoria é limitada ao repositório público e aos ficheiros consultados; não confirma a configuração de qualquer deployment real.

| Área | O que existe na referência | Adaptação para Spirit Embassy |
|---|---|---|
| Forma da aplicação | Um serviço Go único com `cmd/api`, pacotes `internal`, handlers REST e stores. | Boa referência para modular monolith; separar módulos institucionais em vez de copiar posts/followers. |
| HTTP e middleware | Go 1.22; `net/http`, Chi v5; middleware de request ID, logging, recovery, CORS e timeout em `cmd/api/api.go`. | Avaliar Chi como candidato e reaproveitar os padrões após verificar compatibilidade/estado atual; aplicar limites de corpo, timeouts e proxy confiável. |
| Dependências | `go.mod` usa Chi, `lib/pq`, Redis v8, Zap, JWT v5, UUID, validator e Swagger. | Fixar versões atuais e compatíveis na implementação; escolher dependências por necessidade, não assumir que o conjunto da referência deve ser copiado. |
| Persistência | `database/sql`, PostgreSQL, stores em `internal/store`, transações helper e migrações numeradas com pares up/down. | Padrão útil. Adaptar schema para IDs/foreign keys organizacionais, atribuições múltiplas, constraints, índices, transações e testes de migração. |
| Autenticação | Convite/email, bcrypt, JWT HS256 e middleware que carrega utilizador autenticado. | Estudar o fluxo, mas redesenhar tokens/sessões, convite e recuperação. Não confiar em dados do cliente; exigir segredo configurado e política de expiração/rotação/revogação. Avaliar Argon2id ou outro hash aprovado para a política do produto. |
| Autorização | Papel simples com nível numérico e ownership de post. | Insuficiente para a hierarquia multi-região/país/filial. Implementar RBAC + atribuições organizacionais e verificar o âmbito na query/serviço de cada operação. |
| Redis/cache | Cliente Redis opcional e cache de utilizador com TTL. | Redis apenas para usos justificados, nunca fonte de verdade. Rever invalidação, tolerância a indisponibilidade, isolamento e risco de cache de informação sensível. |
| Rate limiting | Implementação fixed-window em memória que cria goroutine de reset por IP. | Não copiar para produção multi-instância. Usar rate limit com memória apenas para desenvolvimento/testes ou Redis seletivo com expiração/limites controlados. |
| Email | Pacote mailer com templates embutidos e clientes SendGrid/Mailtrap. | Padrão de interface/template pode orientar notificações email; fornecedor, retries, outbox, idempotência e configuração devem ser definidos para o projeto. |
| Erros e logs | Helpers centralizam respostas e Zap; documentação Swagger gerada. | Reutilizar o princípio, não mensagens/implementação literalmente: erros públicos estáveis, logs estruturados sem credenciais/PII desnecessária e correlação de request. |
| Testes | Testes de handlers com `httptest`, mocks e teste de rate limiter. | Expandir para unit, integração PostgreSQL, API, autorização multi-país/filial, concorrência, transações, corrida (`go test -race`) e regressões de segurança. |
| Infraestrutura | Dockerfile multi-stage, compose de PostgreSQL/Redis e shutdown gracioso. | Boa base operacional; segredos só por ambiente/secret manager, health/readiness separados, backups/restauração, CI/CD e monitorização antes de produção. |

#### Achados de segurança a não reproduzir

Estes pontos foram identificados na leitura da referência; não são alegações sobre a aplicação Spirit Embassy nem sobre uma instalação em produção.

| Prioridade | Evidência na referência | Decisão para o nosso backend |
|---|---|---|
| Alta | [`cmd/api/main.go`](https://github.com/sikozonpc/GopherSocial/blob/2b010c9aedaa2b6bed6ada6d88a4e4bb827397be/cmd/api/main.go) usa `"example"` como fallback para segredo JWT, sem bloqueio explícito de startup em produção. | Secret obrigatório e forte; falhar startup se ausente/fraco/default, manter fora do repositório e planear rotação. |
| Média | [`cmd/api/auth.go`](https://github.com/sikozonpc/GopherSocial/blob/2b010c9aedaa2b6bed6ada6d88a4e4bb827397be/cmd/api/auth.go) devolve o token de ativação no response de registo, embora também o envie por email. | Token de convite/ativação só é entregue por canal de verificação, armazenado como hash, com validade e uso único; nunca incluído na resposta normal de registo. |
| Arquitetural | [`internal/ratelimiter/fixed-window.go`](https://github.com/sikozonpc/GopherSocial/blob/2b010c9aedaa2b6bed6ada6d88a4e4bb827397be/internal/ratelimiter/fixed-window.go) mantém contadores apenas em memória e agenda goroutine por IP. | Rate limit tem de controlar recursos e funcionar adequadamente com mais de uma instância; escolher solução após medir o deployment. |
| Adequação | Registo/roles e ownership da referência são de uma rede social simples; não existe isolamento institucional completo por país, região e várias filiais por utilizador. | Não transportar modelo de autorização de posts; desenhar permissões próprias antes de migrar dados. |

O token JWT também merece revisão cuidadosa: [`internal/auth/jwt.go`](https://github.com/sikozonpc/GopherSocial/blob/2b010c9aedaa2b6bed6ada6d88a4e4bb827397be/internal/auth/jwt.go) exige rever a correspondência issuer/audience e os parâmetros do construtor antes de qualquer reutilização. Não copiar o código de autenticação sem testes específicos.

## 3. Modelo de dados inicial

Modelo lógico sugerido; nomes e tipos concretos devem ser definidos após escolher a base de dados.

### Identidade e estrutura organizacional

- **Accounts**: ID, nome, email normalizado e único, estado (convite pendente/ativo/bloqueado), datas, idioma e zona IANA.
- **AccountCredentials/Identity**: gerido pelo fornecedor de identidade; não manter uma tabela própria de palavras-passe sem necessidade e revisão especializada.
- **Invitations**: conta convidada, email, função e localização atribuídas, hash do token, expiração, utilização e autor do convite.
- **Regions**, **Countries** e **Branches**: IDs estáveis; países com código ISO 3166. Manter países independentes de filiais.
- **AccountAssignments** e **AccountRoles** (ou modelo relacional equivalente): relações muitos-para-muitos para permitir múltiplos papéis e múltiplas regiões/filiais por utilizador. Não achatar permissões numa única função ou localização.
- Funções hierárquicas: Global Admin, Regional Admin com escopo de país, Local Admin com escopo de filial/cidade e membro. Esta decisão confirma o comportamento atual do frontend para Regional Admin; as permissões concretas de cada operação continuam a ser aplicadas e testadas no servidor.

### Comunicação e suporte

- **ChatRooms**: tipo Global/Regional/Local e âmbito (IDs de região/filial).
- **RoomMemberships** (se necessário): sala e conta autorizada; útil para futuras salas privadas ou grupos.
- **ChatMessages**: sala, autor autenticado, texto, timestamp UTC, estado de moderação e metadados de edição/apagamento, se a política permitir.
- **DirectConversations**: participantes e estado da conversa.
- **ConversationInvitations**: remetente, destinatário, estado pendente/aceite/recusado, datas.
- **HelpRequests**: membro, título, mensagem, estado, filial, datas e responsável, com **HelpResponses** separadas.
- Definir retenção, acesso e procedimento de denúncia/moderação das conversas antes de guardar conversas reais.
- **Notifications**: destinatário, tipo de evento, título/resumo, destino interno (rota/recurso), âmbito, data de criação, data de leitura e estado. Não duplicar informação privada desnecessária na notificação.
- **NotificationPreferences**: preferências por conta e canal/tipo de evento, respeitando notificações transacionais de segurança que não podem ser desligadas quando necessário.
- **NotificationDeliveries** (se houver email/push): canal, estado (pendente/enviado/falhou), tentativas, próxima tentativa, timestamps e identificador do fornecedor. Usar outbox/retry para não perder eventos se o serviço externo estiver indisponível.

### Conteúdo e administração

- **Protocols**: título, categoria, conteúdo, resumo, âmbito, estado, autor, versão, datas de publicação e revisão.
- **ProtocolReads**: protocolo/versão, membro e data de leitura; unique key por protocolo/versão/membro.
- **CommunityNotes**: título, mensagem, estado rascunho/publicado, autor, timestamps e publicação vigente. A publicação global deve ser feita apenas por Global Admin.
- **MediaAssets**: chave do objeto armazenado, tipo MIME, tamanho, URL/identificador, autor e estado; associar a nota/protocolo/conteúdo. Aplicar limites e validação no upload.
- **AuditEvents**: ator autenticado, ação, entidade/ID, resultado, âmbito e data UTC. Evitar guardar segredos, tokens ou conteúdo privado desnecessário.
- **WorkspaceSettings**: configurações globais editáveis e respetivo âmbito, com histórico para alterações importantes.

Dress code e biblioteca de mídia são atualmente exemplos estáticos. Decidir se entram no primeiro lançamento de backend ou numa fase seguinte; não anunciar essas áreas como conteúdo administrável até essa persistência existir.

## 4. Contrato de API sugerido

Prefixo inicial: `/api/v1`. Todos os endpoints protegidos devem obter a identidade do contexto autenticado; não aceitar `role`, `senderEmail` ou âmbito privilegiado como prova de autorização no payload.

| Grupo | Operações iniciais |
|---|---|
| Sessão | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/complete-invitation` |
| Notificações | `GET /notifications?before=...`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET/PUT /notification-preferences` |
| Contas e diretório | `GET /accounts`, `POST /accounts/invitations`, `GET /accounts/{id}`, `PATCH /accounts/{id}`, `POST /accounts/{id}/block`, `POST /accounts/{id}/unblock` |
| Chat em salas | `GET /chat/rooms/{roomId}/messages?before=...`, `POST /chat/rooms/{roomId}/messages` |
| Chat privado | `POST /conversations/invitations`, `GET /conversations`, `POST /conversations/{id}/accept`, `POST /conversations/{id}/decline`, `GET/POST /conversations/{id}/messages` |
| Pedidos de ajuda | `GET/POST /help-requests`, `GET /help-requests/{id}`, `POST /help-requests/{id}/responses`, `PATCH /help-requests/{id}/status` |
| Protocolos | `GET/POST /protocols`, `GET/PATCH /protocols/{id}`, `POST /protocols/{id}/publish`, `POST /protocols/{id}/reads` |
| Nota global | `GET /community-note/current`, `PUT /admin/community-note`, `POST /admin/community-note/publish`, `POST /admin/community-note/unpublish` |
| Mídia | `POST /media/upload` ou criação de URL de upload assinada; `GET /media/{id}` com autorização adequada |
| Auditoria/configuração | `GET /admin/audit-events`, `GET/PATCH /admin/settings` |

Para listagens, definir filtros e paginação por cursor ou `limit`/`cursor`; responder com erros estruturados e consistentes. As operações de publicação, convite, bloqueio e alteração de estado devem ser idempotentes quando aplicável.

### Sistema de notificações — escopo funcional

O sistema de notificações faz parte do backend v1. A primeira entrega deve, no mínimo, oferecer notificações **dentro da aplicação** persistentes por conta, com estados lida/não lida, contagem de não lidas e navegação para o recurso relacionado. O sino atual no Admin é apenas visual; no portal dos membros é decorativo e precisa de ser ligado à funcionalidade.

Eventos candidatos a notificação:

- novo pedido de ajuda para os Admins do âmbito correto e nova resposta/alteração de estado para o membro que abriu o pedido;
- convite para conversa privada, aceite/recusa do convite e nova mensagem privada;
- nova mensagem em salas apenas se o produto decidir notificar cada membro; por padrão, evitar gerar uma notificação por mensagem de grupo para não sobrecarregar os utilizadores;
- criação de conta/convite, primeiro acesso, bloqueio ou alteração administrativa relevante, respeitando o destinatário e a política de segurança;
- publicação ou atualização de protocolo e lembrete de leitura para os membros aplicáveis;
- publicação de nota global da comunidade;
- alertas de segurança de conta, quando suportados pelo fluxo real de autenticação.

Cada evento deve gerar notificações apenas para destinatários autorizados. Preferências do utilizador controlam notificações informativas; alertas críticos de segurança podem ser obrigatórios. As notificações devem ter texto curto, data UTC, alvo seguro e retenção definida. O endpoint só pode listar/marcar notificações do próprio utilizador, exceto funções administrativas estritamente justificadas.

**Canais:** in-app é o canal mínimo da v1. Email para convites, recuperação de palavra-passe e alertas importantes depende de configurar e testar um fornecedor transacional; não enviar mensagens sensíveis ou palavras-passe por email. Push/web push e notificações em tempo real não são necessários no primeiro corte, salvo decisão explícita. A v1 pode começar com atualização periódica e evoluir para WebSocket depois.

As opções atuais “Protocol reading reminders” e “Security and account alerts” são preferências locais de demonstração. No backend, devem ser persistidas por utilizador e ligadas a eventos verdadeiros. A política deve definir quem recebe pedidos de ajuda por âmbito, os tipos de notificação por papel, se mensagens de sala geram alertas, canais permitidos, retenção e como evitar duplicados.

## 5. Roteiro de implementação

### Fase 0 — Preparação e decisões

- Go e PostgreSQL estão definidos. Confirmar router/framework, alojamento, domínio, fornecedor de identidade/email e armazenamento de mídia.
- Confirmar se as conversas locais atuais precisam ser exportadas para migração. Não assumir que os dados estão num servidor ou que serão transferidos automaticamente.
- Definir utilizadores/contas iniciais e quem pode criar o primeiro Global Admin de forma segura.
- Definir privacidade, retenção e acesso a conversas, fotos e pedidos de ajuda.
- Auditar o GopherSocial de ponta a ponta e aprovar o desenho antes de reutilizar código; considerar primeiro a licença do repositório, e reutilizar padrões somente onde adequados.

### Fase 1 — Fundamento seguro

- Criar modular monolith Go e ambiente de desenvolvimento, configuração por variáveis/secret manager e ligação a PostgreSQL.
- Criar migrações PostgreSQL versionadas, constraints e índices, health/readiness checks, logging estruturado, request ID, tratamento central de erros e documentação OpenAPI.
- Adicionar middleware de CORS restrito, limites/timeouts de request, recovery, rate limiting, graceful shutdown e gestão segura de segredos.
- Implementar autenticação, sessão, convites, primeiro acesso, recuperação e autorização server-side.
- Criar testes de autenticação e testes negativos de acesso cruzado entre Global/Regional/Local.
- Remover a confiança no estado local como prova de identidade/permissão.

### Fase 2 — Dados base e Admin

- Implementar estrutura organizacional, contas e diretório.
- Migrar formulários de criação/bloqueio/remoção para a API; preferir desativação lógica para preservar histórico.
- Registar auditoria no servidor.
- Definir importação controlada dos dados de demonstração; não importar exemplos fictícios como contas reais sem revisão.

### Fase 3 — Conversas e ajuda (prioridade para a preocupação atual)

- Implementar persistência server-side para mensagens, salas, convites privados e respostas.
- Aplicar autorização em cada leitura/escrita, validar associação à conversa e âmbito da sala.
- Ligar UI à API com confirmação de envio, carregamento, paginação, estados offline e erros visíveis.
- Implementar a caixa de notificações in-app com persistência, contagem, leitura individual/todas e preferências; gerar notificações para convites, mensagens privadas e pedidos/respostas de ajuda.
- Começar com atualização periódica; adicionar tempo real só depois de validar a autorização.
- Confirmar que dois navegadores/dispositivos veem os mesmos dados e que utilizadores fora do âmbito recebem 403/404 apropriado.

### Fase 4 — Conteúdo global

- Implementar protocolos, estado de publicação, histórico/versionamento e leituras.
- Implementar nota global para leitura dos membros e gestão exclusiva pelo Global Admin.
- Gerar notificações aos destinatários aplicáveis quando um protocolo ou nota global for publicado; implementar lembretes conforme a preferência aprovada.
- Adicionar upload de imagem/vídeo com limites, validação e armazenamento externo.

### Fase 5 — Acabamento para produção

- Migrar definições, dress code e biblioteca, se estiverem dentro do âmbito acordado.
- Configurar Docker, CI/CD, backups e teste de restauração, monitorização de latência/erros/banco/Redis/jobs/autenticação, rate limiting e procedimento de resposta a incidentes.
- Fazer testes unitários, integração, API, autenticação/autorização, isolamento multi-país/multi-filial, concorrência, transações e regressões de segurança.
- Executar `gofmt`, `go vet ./...`, `go test ./...` e `go test -race ./...`; benchmarks apenas para caminhos sensíveis a desempenho.
- Fazer revisão de segurança e validação de desempenho; remover rótulos “LOCAL DEMO” apenas quando as funções estiverem realmente ligadas.

### Testes mínimos de isolamento e qualidade

- Utilizador de Angola não acessa recursos restritos de França.
- Local Admin não gere outra filial; Country/Regional Admin só acede às atribuições autorizadas.
- Global Admin acede aos recursos globais permitidos; não pode remover proteções nem operar com conta bloqueada.
- Utilizador com várias atribuições acessa todas e apenas as suas filiais autorizadas.
- Tentativas de elevar papel, reutilizar convite/token expirado ou usar sessão revogada falham.
- Concorrência em convites, alterações de papel, mensagens e publicação não cria duplicados nem estados inconsistentes.
- Testes de handlers/API usam contextos autenticados; testes de integração executam migrações e queries reais contra PostgreSQL.
- Incluir `go test -race ./...`, testes de transação/rollback e regressões para erros previamente encontrados na referência.

## 6. Conversas atuais: preservação e migração

As mensagens que já foram criadas pela interface não estão automaticamente perdidas: o navegador pode ainda ter os valores nas chaves `member-chat-prototype-v1` e `admin-chat-prototype-v1`. Porém, são dados sem identidade/autorização confiável e não estão acessíveis ao servidor.

Antes de qualquer alteração que limpe dados do navegador:

1. Não limpar armazenamento do site nem remover as chaves locais.
2. Decidir se o conteúdo é apenas teste ou se precisa ser preservado.
3. Se houver conteúdo a preservar, criar uma ferramenta temporária de exportação validada e obter autorização para importar; rever dados pessoais e autoria antes da migração.
4. Não confiar no `senderId`, `senderName`, email ou papel gravado no browser como prova de autoria. Na importação, marcar a origem como legado/local, quando apropriado.
5. Testar a persistência nova com duas sessões independentes e confirmar que os dados continuam após logout/login e troca de dispositivo.

O backend não consegue recuperar mensagens de outros navegadores ou dados locais já apagados. Também não existe atualmente um mecanismo de atualização em tempo real entre cópias da aplicação.

## 7. Critérios de conclusão para “backend v1”

- Login valida credenciais no servidor; logout invalida a sessão; primeiro acesso realmente define a palavra-passe através de fluxo seguro.
- Rotas e dados protegidos não podem ser acedidos apenas alterando o frontend ou fazendo uma chamada direta à API.
- Contas, diretório, conversas e pedidos de ajuda ficam persistidos centralmente e são consistentes entre dois dispositivos.
- A hierarquia Global/Regional/Local é aplicada pelo servidor e coberta por testes negativos.
- Um utilizador associado a várias filiais acede somente às atribuições permitidas; IDs manipulados no cliente não ampliam acesso.
- A nota publicada por Global Admin aparece para membros noutra sessão/dispositivo; rascunho/despublicação têm o comportamento acordado.
- Notificações in-app persistem por conta e respeitam âmbito, idioma e preferências acordadas; eventos não se perdem silenciosamente quando email/Redis está indisponível.
- Falhas de rede e de autorização são apresentadas claramente; a UI não apresenta sucesso quando o servidor não confirmou a operação.
- Há backups verificados, migrações versionadas, documentação OpenAPI, configuração segura por ambiente, health/readiness checks, métricas/logs sem segredos e plano de restauração.
- Testes exigidos passam, incluindo `go test -race ./...` e cenários de isolamento entre países/filiais.
- CAPTCHA, se usado, é verificado server-side; mídia só aceita tipos/tamanhos autorizados.

## 8. Primeira sessão de trabalho recomendada para amanhã

1. Confirmar detalhes da stack Go (router/framework, base de dados e alojamento).
2. Confirmar se as mensagens de demonstração atuais precisam de ser preservadas.
3. Definir o provedor de autenticação/email e o método de criar o primeiro Global Admin.
4. Criar o esqueleto da API e a primeira migração de contas/localizações.
5. Implementar autenticação real antes de migrar o chat ou expor dados reais.

## 9. Lista de decisões e informações a confirmar

Este estudo descreve uma proposta técnica suficientemente detalhada para orientar o trabalho, mas estas respostas ainda não foram fornecidas. Não devemos inventá-las nem ligar serviços pagos sem confirmação.

### Necessário para iniciar a implementação

- [ ] **Stack e alojamento:** Go e PostgreSQL estão definidos. Escolher router/framework HTTP e alojamento; indicar se já existe domínio ou subscrição. Redis é seletivo e só deve ser adicionado quando o caso de uso justificar.
- [ ] **Escopo do backend v1:** confirmar que a primeira entrega inclui login/contas, diretório e hierarquia, chat de membros, chat de Admin, pedidos de ajuda, protocolos e nota global. Confirmar se dress code, biblioteca de mídia e configurações também entram ou ficam para a v1.1.
- [ ] **Global Admin inicial:** decidir quem será a pessoa/conta inicial e como será provisionada sem expor credenciais no código nem permitir autoelevação.
- [ ] **Conversas antigas:** dizer se as mensagens atuais são apenas testes ou se é necessário preservar/exportar as existentes. Não limpar os dados do navegador antes dessa decisão.
- [ ] **Hierarquia e acessos:** confirmar o que cada nível pode ver/criar/editar/apagar, incluindo se Regional Admin pode ver salas globais e se Local Admin pode ver a sala global (o frontend atual sugere comportamentos que precisam de uma regra aprovada).
- [ ] **Identidade e email:** selecionar provedor de autenticação e serviço de email ou aprovar uma opção após comparar disponibilidade/custo.
- [ ] **Organização e acessos:** aprovar regiões, países, filiais, atribuições múltiplas, papéis, permissões e acesso às salas globais/regionais/locais.

### Necessário antes de produção

- [ ] **Privacidade e retenção:** países onde a organização opera/guarda dados, política de retenção e eliminação, e quem pode aceder a mensagens privadas e pedidos de ajuda.
- [ ] **Moderação do chat:** regras para reportar, bloquear, apagar/ocultar mensagens e responder a abuso; definir se mensagens podem ser editadas e por quanto tempo.
- [ ] **Recuperação de conta e MFA:** definir se MFA é exigido para Admins e qual é o fluxo de recuperação de conta.
- [ ] **CAPTCHA e limites:** confirmar se será usado CAPTCHA e definir limites de tentativa de login, envio de mensagens e criação de pedidos.
- [ ] **Mídia:** confirmar se a v1 permite upload ou apenas URLs; definir formatos, tamanho máximo e se os ficheiros serão públicos ou apenas acessíveis a membros.
- [ ] **Notificações:** confirmar que a v1 terá caixa in-app para membros e Admins; selecionar quais eventos notificam, se convites/segurança devem também enviar email, se mensagens de grupo notificam, e a retenção. In-app persistente é a proposta mínima; push pode ficar para depois.
- [ ] **Internacionalização:** definir idiomas iniciais, campos de idioma/zona horária do perfil e política de apresentação das notificações; armazenar tempos em UTC e usar zonas IANA.
- [ ] **Operação:** definir quem recebe alertas de indisponibilidade, como será feito deploy, CI/CD, backup/restauração, monitorização e resposta a incidentes.
- [ ] **Disponibilidade e cópias de segurança:** acordar frequência de backup, tempo de retenção, responsáveis e objetivo de recuperação aceitável.
- [ ] **Custos e operação:** aprovar orçamento dos serviços geridos (identidade, email, banco, armazenamento, monitorização) e indicar quem administrará os ambientes.
- [ ] **Importação de demonstrações:** rever os exemplos de contas/conteúdos antes de decidir se algum deles deve ser removido, substituído ou migrado.

No início da próxima sessão, podemos resolver primeiro as decisões da secção “Necessário para iniciar a implementação”. As restantes são bloqueadores para lançar com dados reais, mas não impedem criar o esqueleto local e os testes enquanto não houver uma decisão explícita sobre serviços externos.

### Referências de código

- [package.json](./package.json) e [angular.json](./angular.json): stack e scripts apenas do frontend.
- [login-page.ts](./src/app/login/login-page.ts), [admin-login.ts](./src/app/admin-login/admin-login.ts), [admin-session.ts](./src/app/admin-session.ts) e [portal-session.ts](./src/app/portal-session.ts): sessão e login simulados.
- [first-login.ts](./src/app/first-login/first-login.ts) e [first-login-state.ts](./src/app/first-login-state.ts): fluxo de primeiro acesso local.
- [member-chat.ts](./src/app/member-chat.ts), [admin-chat.ts](./src/app/admin-chat.ts), [member-chat-page.ts](./src/app/member-portal/member-chat-page.ts) e [admin-chat-panel.ts](./src/app/admin-chat-panel.ts): chats locais.
- [member-help.ts](./src/app/member-help.ts) e [admin-help-panel.ts](./src/app/admin-help-panel.ts): pedidos e respostas de ajuda locais.
- [member-directory.ts](./src/app/member-directory.ts), [protocol-catalog.ts](./src/app/protocol-catalog.ts) e [global-community-note.ts](./src/app/global-community-note.ts): diretório, protocolos e nota local.
- [admin-dashboard.ts](./src/app/admin-dashboard/admin-dashboard.ts) e [member-profile.ts](./src/app/member-portal/member-profile.ts): configurações, conteúdo de demonstração e perfil local.

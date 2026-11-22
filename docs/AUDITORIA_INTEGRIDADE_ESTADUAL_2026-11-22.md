# Auditoria de integridade geográfica — InvestSmart Intelligence

**Data da verificação:** 22/11/2026.  
**Escopo:** 27 unidades federativas, coleta estadual RSS, fonte nacional BigQuery, validador e consumo pela interface.

## Resultado técnico

| Verificação | Evidência | Conclusão |
|---|---|---|
| RSS bruto: Brasil + 27 UFs | 28 respostas, 272 itens, 70 termos distintos | Todas responderam |
| Pares de listas RSS estaduais totalmente idênticos | 0 | Sem evidência de replicação integral entre UFs nesse recorte |
| Termos que aparecem em mais de uma das 28 localidades | 27 | Sobreposição legítima possível; não apagar automaticamente |
| Pares com similaridade Jaccard >= 80% | 8 | Exige monitoramento; similaridade isolada não demonstra erro |
| Assinaturas RSS estaduais na publicação posterior | 27 distintas em 27 UFs | Cada consulta entregou conteúdo bruto diferente |
| Termos financeiros aprovados no RSS estadual em 22/11 | 0 | Falta de resultado no recorte, não ausência de busca financeira |
| Dataset nacional BigQuery na verificação | 270 registros, 10 termos em todas as 27 UFs | Não é descoberta independente de assuntos estaduais |

## Achados e correções

### 1. Sucesso técnico confundido com dados de mercado disponíveis

**Antes:** o feed estadual declarava `status: "ok"` ao receber 27 RSS, mesmo publicando zero pesquisas financeiras.

**Depois:** o status passa a ser `sem_dados_financeiros` quando há zero resultados; o campo `disponibilidadeFinanceira` diferencia disponibilidade de conteúdo de disponibilidade técnica. A interface foi atualizada para sinalizar o recorte sem registros, sem o apresentar como inteligência financeira pronta.

### 2. Estado solicitado não era suficientemente auditável

**Antes:** os campos `geoConsultado` e `uf` eram produzidos pelo próprio coletor. Não havia assinatura do conteúdo bruto para avaliar possível replicação.

**Depois:** cada cobertura de UF registra `assinaturaRss` derivada dos títulos e horários recebidos, além do número de itens brutos e dos termos financeiros. Se a esmagadora maioria das respostas vier com conteúdo integralmente idêntico, a publicação será bloqueada. A auditoria independente compara os resultados brutos para 27 UFs e o Brasil.

**Limite:** uma assinatura diferente atesta diferença entre respostas observadas; não equivale a certificação independente da geolocalização de usuários do Google.

### 3. A repetição de termos entre estados

**RSS estadual:** termos iguais podem ocorrer em diferentes UFs. Na auditoria, 27 títulos apareceram em mais de uma das 28 localidades. Nenhum par de listas de uma UF era completamente idêntico. Não é correto suprimir um termo em outro estado somente porque apareceu antes em uma UF.

**BigQuery nacional:** as mesmas 10 expressões financeiras aparecem nas 27 UFs, produzindo 270 registros com índices regionais. Esse produto é uma série regional de termos nacionais, **não** uma lista de temas descobertos individualmente em cada estado. A plataforma deve conservar a distinção nos rótulos.

### 4. Limitações metodológicas

- O RSS do Google Trends nesta amostra expôs entre 7 e 10 termos por UF. É uma seleção de destaques recentes, não um catálogo completo das pesquisas daquele estado.
- A classificação financeira atual utiliza regras de domínio. Ela pode excluir temas relevantes não reconhecidos e incluir termos semanticamente ambíguos; não se deve descrevê-la como classificação infalível.
- `0` no RSS filtrado não significa demanda financeira zero.
- O Google Trends descreve as tendências por país/região e permite RSS: https://support.google.com/trends/answer/3076011?hl=pt-br
- Interesse relativo por região não é volume absoluto de buscas: https://support.google.com/trends/answer/4355212?hl=pt-br

## Controles

1. Auditoria de RSS geográfico automatizada diariamente às 09:15 UTC: `.github/workflows/audit-state-rss.yml`.
2. Coleta estadual em horários programados, mantendo `geo=BR-UF` individualizado: `.github/workflows/state-trends.yml`.
3. Validação de status, assinaturas e contagens: `collector/validate-state.mjs`.
4. Testes para variantes de grafia, origem e duplicação intrarregional: `collector/test-state-rss.mjs`.
5. Interface rejeita feed `ok` quando a lista estadual está vazia; sem fallback para termos nacionais.

## Critério de aceite

**Aprovado nesta auditoria:** não foi identificada replicação integral dos RSS entre UFs; não há termos fictícios no feed estadual; estados são consultados separadamente; status zero agora é declarado corretamente.

**Ainda não certificável:** completude das pesquisas financeiras por UF, classificação temática perfeita e o estado da implantação no domínio Lovable. Para oferecer cobertura financeira mais abrangente, será necessária uma fonte regional com busca por assunto ou uma integração autorizada e testada com a API oficial; não substituir lacunas por estimativas ou cópias de outro estado.

## Evidências

- Auditoria das respostas brutas: https://github.com/gestaobankrio-code/investsmart-trends-feed/actions/runs/45085241024
- Dados e metadados estaduais: https://github.com/gestaobankrio-code/investsmart-trends-feed/blob/main/docs/data/state-trends.json
- Status da fonte: https://github.com/gestaobankrio-code/investsmart-trends-feed/blob/main/docs/data/state-status.json
- Dados nacionais, identificados como nacionais: https://github.com/gestaobankrio-code/investsmart-trends-feed/blob/main/docs/data/trends.json

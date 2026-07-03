# Simulador de Macroeconomia Global — Plano e Estudo de Viabilidade

## 1. Visão do produto

Uma aplicação "god view" baseada em mapa-múndi onde o usuário controla variáveis macroeconômicas de países (taxa de juros, tarifas, gastos públicos) e observa a simulação evoluir no tempo — PIB, inflação, câmbio, comércio bilateral, fluxos de transporte aéreo/marítimo — com controle de velocidade (pause/play/acelerar).

**Escopo definido:**
- Plataforma: Web primeiro, mobile (Expo) depois.
- Dados: reais (World Bank, IMF, UN Comtrade), não fictícios.
- MVP: G20 (19 países + UE), depois expandir para o mundo.

---

## 2. Arquitetura proposta

```
┌─────────────────────────────────────────────┐
│  Front-end (React + TypeScript)              │
│  - Mapa interativo (deck.gl / react-simple-maps)
│  - Painel de controle por país (sliders)      │
│  - Timeline (play/pause/velocidade)           │
│  - Gráficos de série temporal (Recharts)      │
└───────────────┬───────────────────────────────┘
                │
┌───────────────▼───────────────────────────────┐
│  Motor de simulação (Web Worker / backend)      │
│  - Estado por país (juros, PIB, inflação, câmbio,
│    fluxo aéreo, fluxo marítimo, comércio)       │
│  - Rede de influência totalmente acoplada       │
│    (todas as variáveis afetam todas, com lag)   │
│  - Tick engine (1 tick = 1 semana simulada)     │
└───────────────┬───────────────────────────────┘
                │
┌───────────────▼───────────────────────────────┐
│  Camada de dados                                │
│  - Snapshot inicial real (World Bank/IMF/Comtrade)
│  - Cache local (dados não mudam em tempo real)  │
└─────────────────────────────────────────────────┘
```

**Decisão chave:** o motor roda **client-side** (Web Worker) para o MVP — evita backend, hospedagem e custo de servidor. Migra para backend só se quiser multiplayer/persistência entre sessões.

---

## 3. Viabilidade das fontes de dados

| Fonte | Dado | Viabilidade | Observação |
|---|---|---|---|
| **World Bank API** | PIB, PIB per capita, inflação, dívida pública, população | ✅ Alta | API pública, gratuita, sem chave. Formato JSON/XML bem documentado. |
| **IMF (WEO)** | Projeções de crescimento, inflação, taxa de juros | ✅ Alta | Dados em bulk (SDMX/JSON), atualizados semestralmente. |
| **UN Comtrade** | Comércio bilateral entre países | ⚠️ Média | API gratuita mas com **rate limit agressivo** (100 requisições/hora sem chave) e estrutura complexa (HS codes). Requer pré-processamento e cache pesado. |
| **Taxas de juros por banco central** | Selic, Fed Funds, ECB, etc. | ⚠️ Média | Não há uma API única confiável e gratuita — dado disperso em sites de bancos centrais. Melhor caminho: montar tabela estática atualizada manualmente/trimestralmente (como já fiz nesta conversa) em vez de tentar puxar ao vivo. |
| **Tráfego aéreo (OpenSky Network)** | Rotas e volume de voos | ⚠️ Média | API gratuita com limites de uso; dados granulares (voo a voo) — para o simulador, melhor usar **dados agregados anuais** (ex: OAG, ICAO) em vez de tempo real. |
| **Tráfego marítimo/portos** | Volume de carga por porto | ❌ Baixa (fontes gratuitas) | Dados de AIS em tempo real são pagos (MarineTraffic, Spire). Alternativa viável: usar estatísticas **anuais agregadas** da UNCTAD (Review of Maritime Transport) — gratuitas em PDF/Excel, exigem parsing manual. |
| **Câmbio** | Taxas de câmbio históricas | ✅ Alta | European Central Bank / exchangerate.host — gratuitas. |

**Conclusão da seção:** os dados macro "clássicos" (PIB, inflação, juros) são **totalmente viáveis** com fontes gratuitas. Os dados de logística (marítimo/aéreo) são o ponto mais frágil — recomendo tratá-los como **camada de dado estático anual** (não em tempo real) para o MVP, evitando dependência de APIs pagas.

### 3.1 Rotas reais e tempos reais (aéreo e marítimo)

Esse requisito muda a natureza do problema: não basta saber *quanto* flui entre dois países, é preciso saber **por onde** fisicamente passa e **quanto tempo leva** — isso é totalmente viável, mas por um caminho diferente de "rastrear navios/aviões ao vivo" (que seria caro e desnecessário para o objetivo do simulador):

**Marítimo:**
- Rota real de navio **não é linha reta** — precisa respeitar geografia (não atravessar continentes) e passar pelos gargalos reais do comércio mundial (Canal de Suez, Canal do Panamá, Estreito de Malaca, Estreito de Ormuz, Bósforo, Gibraltar). Existe uma biblioteca open-source chamada **searoute** (Node/Python) que resolve exatamente isso: calcula a rota marítima real entre dois pontos usando um grafo pré-construído das rotas de navegação do mundo, incluindo os canais e estreitos. ✅ Totalmente gratuita e viável, sem depender de dado de tráfego ao vivo.
- Coordenadas de portos reais: **World Port Index** (NGA — National Geospatial-Intelligence Agency dos EUA) é gratuito e público, com milhares de portos.
- Tempo de trânsito: `distância da rota real ÷ velocidade média de cruzeiro de um navio cargueiro (~18-20 nós)` — isso dá um tempo de viagem realista (ex: Xangai → Roterdã por Suez ≈ 26-30 dias), sem precisar de dado de navio individual.
- **Bônus de gameplay natural:** como as rotas passam por gargalos reais, isso abre a possibilidade de simular eventos de disrupção (fechamento do Suez, crise no Mar Vermelho) como um evento que o usuário pode disparar — reforça o objetivo de "corrigir os problemas do mundo".

**Aéreo:**
- Rota real de voo de carga/passageiro entre dois aeroportos é, na prática, muito próxima de uma **rota geodésica (grande círculo)** — diferente do marítimo, o céu não tem "canais". Isso simplifica bastante.
- Base de aeroportos com coordenadas: **OurAirports** (gratuita, pública, completa).
- Base de rotas aéreas existentes entre pares de aeroportos: **OpenFlights routes database** (gratuita; é uma base pública consolidada, não atualizada em tempo real, mas estruturalmente confiável para saber "quais rotas existem entre quais aeroportos").
- Tempo de voo: `distância geodésica ÷ velocidade média de cruzeiro (~850 km/h) + tempo de solo` — realista o suficiente para o propósito do simulador.

**Importante sobre "tempo real":** a interpretação viável aqui é **tempo de trânsito realista calculado a partir da rota real** (ex: "esse frete leva 27 dias por essa rota"), não rastreamento de navio/avião específico em tempo real (isso exigiria AIS/ADS-B pago e não agregaria valor ao objetivo do simulador, que é macroeconomia, não logística operacional).

**Efeito no modelo (conecta com a seção 4):** esse tempo de trânsito real passa a ser, literalmente, o **lag** das relações de comércio na rede de influência — em vez de um lag arbitrário calibrado à mão, o atraso entre "país A aumenta produção" e "isso chega no país B e afeta o PIB de B" passa a ser o tempo de viagem real da rota. Isso é uma melhoria de realismo relevante e ainda simplifica a calibração da seção 4.2 (menos parâmetros arbitrários para ajustar).

**Restrição técnica importante:** como o simulador provavelmente vai rodar como artifact/app front-end puro, ele **não pode chamar essas APIs externas diretamente em produção no navegador do usuário final** (CORS, rate limits, chaves). O caminho realista é: eu (ou um pipeline seu) busco e processa os dados **uma vez**, gera um dataset estático (JSON) versionado, e a aplicação consome esse snapshot. Atualização = reprocessar o dataset periodicamente, não é live.

---

## 4. Viabilidade do motor de simulação (modelo totalmente acoplado, tick semanal)

Modelo econômico realista de verdade (DSGE, multi-agente com expectativas racionais) é tema de tese de doutorado — **fora de escopo**. O caminho viável continua sendo um **modelo estilizado**, inspirado em jogos como *Democracy* ou *Tropico*, mas agora com dois requisitos novos que mudam o desenho: (1) tick semanal e (2) todas as variáveis influenciando todas — não mais uma cadeia de causa-efeito linear (juros → PIB → inflação), e sim uma **rede de feedback**.

### 4.1 De "cadeia causal" para "rede de influência"

Em vez de um fluxo único (A afeta B afeta C), cada variável de cada país passa a ter uma **função de atualização que lê o estado de todas as outras** a cada tick:

```
juros[país]      ← influenciado por: inflação, câmbio, PIB, juros de outros países
PIB[país]        ← influenciado por: juros, câmbio, comércio, fluxo aéreo/marítimo
inflação[país]   ← influenciado por: PIB (hiato do produto), câmbio, custo de importação
câmbio[país]     ← influenciado por: diferencial de juros, balança comercial, fluxos de capital
fluxo aéreo      ← influenciado por: PIB, câmbio, preço do combustível, sazonalidade
fluxo marítimo   ← influenciado por: comércio bilateral, capacidade portuária, câmbio
comércio bilateral ← influenciado por: PIB dos dois países, câmbio, tarifas, fluxo aéreo/marítimo (capacidade)
```

Tecnicamente isso é modelado como uma **matriz de elasticidades** (quanto uma variação em X afeta Y, com um lag em ticks) — é o mesmo tipo de estrutura usada em modelos de *System Dynamics* (Vensim/Stella) ou em redes bayesianas dinâmicas. Computacionalmente é trivial (multiplicação de matriz esparsa por tick), o desafio não é performance, é **desenho e calibração**.

### 4.2 O risco real: estabilidade numérica

Um sistema onde "tudo influencia tudo" com feedback positivo mal calibrado **diverge** (oscila cada vez mais forte ou explode) — é o problema clássico de sistemas realimentados. Isso precisa de:

- **Coeficientes de amortecimento (damping)** em cada relação, para simular a fricção real da economia (as coisas não reagem instantaneamente nem infinitamente).
- **Defasagens (lags) diferentes por relação** — juros afetam inflação com lag de meses, mas câmbio reage quase instantaneamente a diferencial de juros. Isso é o que dá realismo e também o que estabiliza o sistema.
- **Testes de estresse do modelo** antes de expor ao usuário: rodar milhares de ticks simulados com parâmetros aleatórios e verificar se o sistema sempre converge a um equilíbrio razoável, em vez de "explodir" (hiperinflação instantânea, PIB infinito, etc.)

Isso é **viável, mas é a parte que exige mais trabalho de design/calibração do projeto inteiro** — não é um problema de engenharia de software, é um problema de modelagem. Vale reservar tempo específico de calibração (fase dedicada no roadmap, ver seção 7).

### 4.3 Granularidade semanal — o desafio real é o dado, não o modelo

Aqui está a maior fricção prática do pedido: **os dados reais que alimentam o modelo (PIB, inflação, comércio) são trimestrais ou anuais.** Não existe "PIB da semana 23" publicado por nenhum país do mundo. Então tick semanal não significa "dado real toda semana" — significa:

- **Checkpoints reais:** a cada trimestre (13 ticks), o modelo é "ancorado" nos dados reais publicados (PIB, inflação oficiais).
- **Entre checkpoints:** o motor interpola/simula semana a semana usando as equações da rede de influência — ou seja, as 12 semanas entre um checkpoint trimestral e outro são **geradas pela simulação**, não são dado real. Isso é normal e é como praticamente todo simulador econômico de jogo funciona (inclusive *Democracy*, *Football Manager* com dados financeiros, etc.).
- **Fluxo aéreo e marítimo** são as variáveis mais naturais para granularidade semanal de verdade — dados de tráfego aéreo (OpenSky/ICAO) e movimentação portuária têm, sim, resolução semanal/diária real disponível (ainda que com acesso limitado nas fontes gratuitas, ver seção 3). Essas podem ser as variáveis "âncora semanal" que dão o pulso mais dinâmico ao mapa, enquanto PIB/inflação são âncoras trimestrais com interpolação suave entre elas.

Essa combinação (âncoras reais + interpolação simulada semanal) é **a abordagem correta e viável** — tentar ter dado semanal 100% real para tudo não é possível, e não teria dado inclusive.

### 4.4 Fluxo aéreo e marítimo como variáveis endógenas (não apenas visuais)

O pedido de "fluxo aéreo e marítimo influenciando todos os dados de forma integralizada" implica que esses fluxos deixam de ser só uma camada visual e passam a ser **variáveis de estado do modelo**, com loop de retroalimentação real, por exemplo:

```
↑ Comércio bilateral → ↑ Fluxo marítimo (demanda por transporte)
↑ Fluxo marítimo → ↓ custo logístico → ↑ competitividade de exportação
↑ Competitividade → ↑ PIB (via exportações) → ↑ inflação (aquecimento)
↑ Inflação → ↑ juros (reação do banco central) → ↑ câmbio (atrai capital)
↑ Câmbio (moeda mais forte) → ↓ competitividade de exportação → ↓ fluxo marítimo
```

Esse é um loop fechado real — é exatamente o tipo de dinâmica que se torna interessante de jogar (o usuário mexe em juros e vê o efeito se propagar até o volume de navios no mapa, várias semanas depois). Tecnicamente viável, mas reforça o ponto da seção 4.2: cada loop desses precisa de damping para não virar uma bagunça.

**Nível de fidelidade:** vale reforçar — isso continua sendo uma simulação **estilizada e educativa**, não um modelo econométrico preditivo. É o approach certo para o objetivo (visualização + estratégia + didática), não para previsão real. Com o modelo totalmente acoplado, essa ressalva fica ainda mais importante de comunicar na UI, porque o sistema vai "parecer" mais sofisticado do que realmente é preditivamente.

---

## 5. Riscos e desafios

| Risco | Impacto | Mitigação |
|---|---|---|
| Dados de logística marítima/aérea gratuitos são fracos | Médio | Usar dados anuais/semanais agregados (UNCTAD/ICAO/OpenSky) como camada estática entre checkpoints |
| Sistema totalmente acoplado ("tudo influencia tudo") diverge/oscila sem controle | **Alto** | Damping explícito por relação + lags diferenciados + bateria de testes de estabilidade antes de liberar sliders ao usuário |
| Modelo econômico "bonitinho mas errado" pode passar sensação de precisão falsa | Médio | Deixar claro na UI que é um modelo educativo/estilizado, com fontes citadas |
| Dado real é trimestral/anual, mas tick é semanal | Médio | Âncoras reais a cada trimestre + interpolação simulada nas semanas entre âncoras (ver 4.3) |
| UN Comtrade rate limit trava scraping em massa | Baixo | Processar 1x, cachear localmente, atualizar trimestralmente |
| Escopo pode inflar rápido (mundo todo, multiplayer, IA de outros países) | Alto | Manter disciplina de MVP: G20, single-player, sem backend |
| Manutenção de dados atualizados no tempo | Médio | Pipeline de atualização trimestral, não é crítico ter dado do dia |

---

## 6. Stack técnica recomendada

- **Front-end:** React + TypeScript (alinhado com seu stack atual de Expo/React Native — facilita portar para mobile depois)
- **Mapa:** `deck.gl` (WebGL) passa a ser a escolha mais adequada em vez do `react-simple-maps` — com fluxos aéreos/marítimos animados seguindo rotas reais (não arcos retos) e atualizando toda semana, a renderização em SVG (react-simple-maps) provavelmente não aguenta a taxa de atualização com fluidez; deck.gl tem `PathLayer`/`TripsLayer`, feitos justamente para desenhar e animar objetos ao longo de trajetórias reais (a polyline calculada pelo searoute, no caso marítimo).
- **Gráficos de série temporal:** Recharts
- **Visualização de interdependência (novo, por causa do requisito "tudo influencia tudo"):** um grafo de influência interativo (ex: força-dirigida com D3) onde o usuário clica numa variável (ex: "fluxo marítimo do Brasil") e vê destacado, em tempo real, o que está influenciando ela e o que ela está influenciando — isso é o componente que torna o acoplamento total **compreensível** para quem está jogando, em vez de virar uma caixa-preta.
- **Estado/simulação:** Web Worker rodando um motor de tick em TypeScript puro (sem framework de simulação — não é necessário)
- **Dados:** JSON estático versionado (âncoras trimestrais + série semanal de fluxo aéreo/marítimo), gerado por um script de ingestão (Python ou Node) rodado offline/periodicamente

---

## 7. Roadmap por fases (esforço aproximado, trabalhando part-time)

| Fase | Entregável | Esforço estimado |
|---|---|---|
| **Fase 0** | Dataset G20 real (PIB, inflação, juros, câmbio, comércio bilateral simplificado) + rede de rotas reais (searoute para marítimo, geodésica para aéreo) com tempos de trânsito calculados | 2–3 semanas |
| **Fase 1** | Desenho da rede de influência (matriz de elasticidades, lags, damping) + motor de tick semanal rodando sem UI | 2–3 semanas |
| **Fase 1.5 (nova)** | Calibração e testes de estabilidade — rodar milhares de ticks simulados, ajustar damping até o sistema não divergir | 1–2 semanas |
| **Fase 2** | Mapa interativo estático (deck.gl) mostrando dados reais por país | 1 semana |
| **Fase 3** | Integração motor + mapa + timeline (play/pause/velocidade) | 1–2 semanas |
| **Fase 4** | Fluxos aéreo/marítimo animados no mapa, plenamente acoplados ao motor | 1–2 semanas |
| **Fase 5** | Grafo de influência interativo (visualizar o que afeta o quê) | 1 semana |
| **Fase 6** | Polish: UI/UX, salvar/carregar cenários, expandir além do G20 | contínuo |

**Total até MVP jogável (Fases 0–3):** ~7–10 semanas de trabalho part-time — a mudança para modelo totalmente acoplado + tick semanal + rotas reais adiciona a Fase 1.5 e amplia a Fase 0, que é o preço da complexidade extra pedida.

---

## 8. Conclusão

**O projeto continua viável** com os novos requisitos (tick semanal, modelo totalmente acoplado), mas com duas ressalvas que ficaram mais fortes:

1. **Tick semanal não significa dado real semanal** — funciona com âncoras trimestrais reais + interpolação simulada nas semanas entre elas, exceto para fluxo aéreo/marítimo, que têm resolução real mais fina.
2. **"Tudo influencia tudo" é o maior risco de engenharia do projeto agora** — não pela dificuldade de implementar, mas pela dificuldade de calibrar um sistema com múltiplos loops de feedback sem ele divergir. Isso passa a ser a fase mais delicada do roadmap (Fase 1.5).

Fora isso, a lógica de manter dados de logística como snapshots processados offline (não integrações "live") continua valendo e simplifica bastante a arquitetura (sem backend obrigatório, sem custo de infra).

O maior risco de escopo continua sendo o mesmo: a tentação de simular o mundo inteiro com toda a complexidade de uma vez. A recomendação é começar com G20, motor totalmente acoplado mas calibrado, e comércio bilateral simplificado — isso já entrega um produto jogável e visualmente rico, com espaço para expandir depois.

Quando quiser seguir para o desenvolvimento, sugiro começar pela **Fase 0** (dataset) — já tenho parte dos dados de juros/inflação do G20 levantados nesta conversa.

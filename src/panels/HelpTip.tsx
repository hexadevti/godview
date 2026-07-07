// Small "?" that opens a popover explaining a data field. One central dictionary
// so the same wording is reused across the world table and country cards. The
// help + provenance texts are localized per language (pt/en/es), keyed by the
// same HelpId so call sites stay language-agnostic — they index by the active
// language from the i18n context.

import * as Popover from "@radix-ui/react-popover";
import { useI18n, type Lang } from "../i18n/i18n";

const HELP_PT = {
  gdp: "Produto Interno Bruto nominal, em trilhões de dólares (World Bank). É o tamanho total da economia — tudo que o país produz em um ano.",
  growth: "Crescimento real do PIB ao ano (%). Aqui mostramos o crescimento potencial (≈média de 10 anos, World Bank). Positivo = economia expandindo.",
  inflation: "Inflação anual ao consumidor (%, World Bank). Quanto os preços sobem por ano — alta significa perda de poder de compra.",
  rate: "Taxa básica de juros do banco central (%). É a sua alavanca principal: subir contém a inflação e esfria a economia; baixar estimula.",
  fx: "Índice de força da moeda (100 = base inicial). NÃO é a cotação real — todos começam em 100 e o valor sobe/desce durante a simulação (↑ = moeda mais forte).",
  trade: "Saldo (balança) comercial = exportações − importações, em % do PIB. Verde/positivo = superávit; vermelho/negativo = déficit.",
  tariff: "Tarifa média de importação (%). Subir encarece os importados (protege a indústria local, mas tende a reduzir comércio e crescimento).",
  gov: "Postura de gasto público (índice 0–100; 50 = neutro). Acima de 50 = estímulo fiscal; abaixo = austeridade.",
  week: "Tempo simulado. Cada tick equivale a 1 semana; a cada trimestre o modelo é ancorado em dados reais.",
  gdpTotal: "Soma do PIB de todos os países do escopo atual (trilhões USD).",
  inflAvg: "Inflação média dos países do escopo, ponderada pelo tamanho de cada economia (PIB).",
  growthAvg: "Crescimento médio dos países do escopo, ponderado pelo PIB.",
  recession: "Quantos países estão em recessão (crescimento negativo) no momento.",
  unemployment: "Taxa de desemprego (% da força de trabalho). Sobe quando o crescimento fica abaixo do potencial (Lei de Okun) e pressiona a inflação para baixo (curva de Phillips).",
  debt: "Dívida pública bruta (% do PIB). Cresce com déficits e diminui quando o PIB nominal cresce. Dívida alta encarece o crédito (spread) e limita o espaço fiscal.",
  deficit: "Resultado fiscal (% do PIB). Negativo = déficit (gasta mais do que arrecada); positivo = superávit. Depende de impostos, gasto público, gasto social e dos juros da dívida.",
  spread: "Prêmio de risco soberano (p.p. somados aos juros). Sobe com dívida alta, inflação, moeda fraca e instabilidade — encarece o crédito e freia o investimento.",
  gini: "Índice de Gini (0–100) de desigualdade de renda. Maior = mais desigual. Piora com desemprego, austeridade e inflação; melhora com gasto social e crescimento.",
  poverty: "Taxa de pobreza (% da população). Piora com desemprego e inflação; melhora com crescimento e gasto social.",
  wellbeing: "Índice composto de bem-estar (0–100) combinando pobreza, desigualdade, desemprego e inflação. Um resumo social único.",
  unrest: "Instabilidade social (0–100). Alimentada por índice de miséria (inflação+desemprego) e desigualdade. Alta → fuga de capital, câmbio mais fraco e erosão das instituições.",
  tax: "Carga tributária (% do PIB). Subir arrecada mais (reduz o déficit) mas esfria a demanda e pesa no bem-estar.",
  social: "Fatia do gasto voltada à redistribuição (0–100; 50 = neutro). Acima de 50 reduz desigualdade e pobreza, mas custa espaço fiscal.",
  commodity: "Preço global de commodities/energia (índice, 100 = base). Choques elevam a inflação de todos; exportadores (Arábia, Rússia, Brasil…) ganham em câmbio e saldo comercial.",
  population: "População total do país (World Bank). Evolui na simulação pela taxa de crescimento demográfico; alimenta a força de trabalho e a pressão fiscal (previdência).",
  gdpPerCapita: "PIB per capita = PIB ÷ população (US$ por habitante). Uma medida de renda média — melhor para comparar o padrão de vida entre países de tamanhos diferentes.",
  education: "Qualidade da educação (índice 0–100), baseado nas notas harmonizadas de aprendizagem do World Bank. Sobe com investimento (gasto social e público), cai com instabilidade — muda devagar (anos). Educação melhor eleva a produtividade e o crescimento.",
  hdi: "Índice de Desenvolvimento Humano (IDH), de 0 a 1 (ONU/PNUD). Combina expectativa de vida, escolaridade e renda per capita. Começa no valor real de 2022 e evolui devagar na simulação com saúde, educação e renda per capita. Acima de 0,8 = muito alto; abaixo de 0,55 = baixo.",
  costOfLiving: "Índice de custo de vida (estilo Numbeo), com Nova York = 100. Maior = mais caro para viver (bens e serviços, sem aluguel). Começa no valor real e evolui com a inflação e a força da moeda; subsídios o reduzem. Suíça (~101) é das mais caras; economias em desenvolvimento ficam em 20–40.",
  gci: "Índice de Competitividade Global (GCI 4.0), do Fórum Econômico Mundial, de 0 a 100. Avalia instituições, infraestrutura, ambiente de negócios, qualificação e capacidade de inovação. Começa no valor real de 2019 e evolui na simulação com o investimento em infraestrutura & inovação e a estabilidade. Maior = mais competitivo.",
  infra: "Investimento em infraestrutura & inovação (0–100; 50 = neutro). Acima de 50 eleva a competitividade (GCI) e o crescimento potencial ao longo do tempo, mas custa espaço fiscal (amplia o déficit).",
  subsidies: "Subsídios ao custo de vida — energia, alimentos, transporte (0–100; 50 = neutro). Acima de 50 reduzem o custo de vida e a inflação medida e agradam a população, mas pesam no orçamento e, em excesso, distorcem os mercados.",
  health: "Investimento em saúde & bem-estar (0–100; 50 = neutro). Acima de 50 eleva o IDH (dimensão saúde) e o bem-estar, mas custa espaço fiscal.",
  econFreedom: "Índice de Liberdade Econômica (Heritage Foundation), 0–100. Mede abertura de mercado, direitos de propriedade, carga regulatória e liberdade de negócios e comércio. Maior = economia mais livre. Evolui com abertura de mercado e instituições.",
  cpi: "Índice de Percepção da Corrupção (IPC, Transparency International), 0–100 — maior = menos corrupção percebida no setor público. Dinamarca (~90) lidera; valores baixos indicam captura do Estado. Evolui com a reforma institucional.",
  democracy: "Índice de Democracia (EIU), 0–10. Combina processo eleitoral, funcionamento do governo, participação política e liberdades civis. Acima de 8 = democracia plena; abaixo de 4 = regime autoritário. Evolui com a qualidade institucional.",
  pressFreedom: "Índice de Liberdade de Imprensa (Repórteres Sem Fronteiras), 0–100 — maior = imprensa mais livre. Reflete pluralismo, independência e segurança dos jornalistas. Evolui com instituições e abertura democrática; repressão o derruba.",
  spi: "Índice de Progresso Social (SPI), 0–100. Mede o quanto a sociedade atende necessidades básicas, bem-estar e oportunidade — além do PIB. É um índice-resultado: sobe com IDH, menos pobreza/desigualdade e mais direitos.",
  happiness: "Índice de Felicidade Global (Relatório Mundial da Felicidade), 0–10. Nota média de satisfação com a vida, explicada por renda, apoio social, saúde, liberdade e corrupção. Um resumo de quão satisfeita a população está.",
  institutions: "Reforma institucional (0–100; 50 = neutro): Estado de direito, combate à corrupção, qualidade democrática e imprensa livre. Acima de 50 eleva IPC, democracia, liberdade de imprensa e, em parte, a competitividade — muda devagar (anos).",
  market: "Abertura & desregulamentação de mercado (0–100; 50 = neutro). Acima de 50 eleva a liberdade econômica, a competitividade e o crescimento, mas tende a aumentar a desigualdade (eficiência vs. equidade).",
} as const;

export type HelpId = keyof typeof HELP_PT;

const HELP_EN: Record<HelpId, string> = {
  gdp: "Nominal Gross Domestic Product, in trillions of dollars (World Bank). It's the total size of the economy — everything the country produces in a year.",
  growth: "Real GDP growth per year (%). Here we show potential growth (≈10-year average, World Bank). Positive = economy expanding.",
  inflation: "Annual consumer inflation (%, World Bank). How much prices rise per year — high means a loss of purchasing power.",
  rate: "Central bank policy interest rate (%). It's your main lever: raising it curbs inflation and cools the economy; lowering it stimulates.",
  fx: "Currency strength index (100 = initial base). It is NOT the real exchange rate — everyone starts at 100 and the value rises/falls during the simulation (↑ = stronger currency).",
  trade: "Trade balance = exports − imports, as % of GDP. Green/positive = surplus; red/negative = deficit.",
  tariff: "Average import tariff (%). Raising it makes imports more expensive (protects local industry, but tends to reduce trade and growth).",
  gov: "Public spending stance (index 0–100; 50 = neutral). Above 50 = fiscal stimulus; below = austerity.",
  week: "Simulated time. Each tick equals 1 week; every quarter the model is anchored to real data.",
  gdpTotal: "Sum of the GDP of all countries in the current scope (trillions USD).",
  inflAvg: "Average inflation of the countries in scope, weighted by the size of each economy (GDP).",
  growthAvg: "Average growth of the countries in scope, weighted by GDP.",
  recession: "How many countries are currently in recession (negative growth).",
  unemployment: "Unemployment rate (% of the labor force). Rises when growth falls below potential (Okun's law) and pushes inflation down (Phillips curve).",
  debt: "Gross public debt (% of GDP). Grows with deficits and shrinks when nominal GDP grows. High debt makes credit more expensive (spread) and limits fiscal room.",
  deficit: "Fiscal balance (% of GDP). Negative = deficit (spends more than it collects); positive = surplus. Depends on taxes, public spending, social spending and debt interest.",
  spread: "Sovereign risk premium (p.p. added to the interest rate). Rises with high debt, inflation, a weak currency and instability — makes credit more expensive and slows investment.",
  gini: "Gini index (0–100) of income inequality. Higher = more unequal. Worsens with unemployment, austerity and inflation; improves with social spending and growth.",
  poverty: "Poverty rate (% of the population). Worsens with unemployment and inflation; improves with growth and social spending.",
  wellbeing: "Composite well-being index (0–100) combining poverty, inequality, unemployment and inflation. A single social summary.",
  unrest: "Social instability (0–100). Fueled by the misery index (inflation+unemployment) and inequality. High → capital flight, a weaker currency and eroding institutions.",
  tax: "Tax burden (% of GDP). Raising it collects more (reduces the deficit) but cools demand and weighs on wellbeing.",
  social: "Share of spending aimed at redistribution (0–100; 50 = neutral). Above 50 reduces inequality and poverty, but costs fiscal room.",
  commodity: "Global commodity/energy price (index, 100 = base). Shocks raise everyone's inflation; exporters (Saudi Arabia, Russia, Brazil…) gain on exchange rate and trade balance.",
  population: "Total population of the country (World Bank). Evolves in the simulation through the demographic growth rate; feeds the labor force and fiscal pressure (pensions).",
  gdpPerCapita: "GDP per capita = GDP ÷ population (US$ per inhabitant). A measure of average income — better for comparing living standards across countries of different sizes.",
  education: "Education quality (index 0–100), based on the World Bank's harmonized learning scores. Rises with investment (social and public spending), falls with instability — changes slowly (years). Better education raises productivity and growth.",
  hdi: "Human Development Index (HDI), from 0 to 1 (UN/UNDP). Combines life expectancy, schooling and income per capita. Starts at the real 2022 value and evolves slowly with health, education and income per capita. Above 0.8 = very high; below 0.55 = low.",
  costOfLiving: "Cost of Living index (Numbeo-style), with New York = 100. Higher = more expensive to live (goods and services, excluding rent). Starts at the real value and evolves with inflation and currency strength; subsidies lower it. Switzerland (~101) is among the priciest; developing economies sit at 20–40.",
  gci: "Global Competitiveness Index (GCI 4.0) by the World Economic Forum, from 0 to 100. Scores institutions, infrastructure, business environment, skills and innovation capability. Starts at the real 2019 value and evolves with infrastructure & innovation investment and stability. Higher = more competitive.",
  infra: "Investment in infrastructure & innovation (0–100; 50 = neutral). Above 50 raises competitiveness (GCI) and potential growth over time, but costs fiscal space (widens the deficit).",
  subsidies: "Cost-of-living subsidies — energy, food, transport (0–100; 50 = neutral). Above 50 lower the cost of living and measured inflation and please the public, but weigh on the budget and, in excess, distort markets.",
  health: "Investment in health & wellbeing (0–100; 50 = neutral). Above 50 raises the HDI (health dimension) and wellbeing, but costs fiscal space.",
  econFreedom: "Index of Economic Freedom (Heritage Foundation), 0–100. Measures market openness, property rights, regulatory burden and business/trade freedom. Higher = a freer economy. Evolves with market liberalization and institutions.",
  cpi: "Corruption Perceptions Index (CPI, Transparency International), 0–100 — higher = less perceived public-sector corruption. Denmark (~90) leads; low values signal state capture. Evolves with institutional reform.",
  democracy: "Democracy Index (EIU), 0–10. Combines the electoral process, government functioning, political participation and civil liberties. Above 8 = full democracy; below 4 = authoritarian regime. Evolves with institutional quality.",
  pressFreedom: "Press Freedom Index (Reporters Without Borders), 0–100 — higher = freer press. Reflects pluralism, independence and journalist safety. Evolves with institutions and democratic openness; repression pushes it down.",
  spi: "Social Progress Index (SPI), 0–100. Measures how well a society meets basic human needs, wellbeing and opportunity — beyond GDP. An outcome index: rises with HDI, less poverty/inequality and more rights.",
  happiness: "World Happiness score (World Happiness Report), 0–10. Average life-satisfaction rating, explained by income, social support, health, freedom and corruption. A summary of how satisfied the population is.",
  institutions: "Institutional reform (0–100; 50 = neutral): rule of law, anti-corruption, democratic quality and a free press. Above 50 raises CPI, democracy, press freedom and (partly) competitiveness — changes slowly (years).",
  market: "Market liberalization & deregulation (0–100; 50 = neutral). Above 50 raises economic freedom, competitiveness and growth, but tends to widen inequality (efficiency vs. equity).",
};

const HELP_ES: Record<HelpId, string> = {
  gdp: "Producto Interno Bruto nominal, en billones de dólares (World Bank). Es el tamaño total de la economía — todo lo que el país produce en un año.",
  growth: "Crecimiento real del PIB anual (%). Aquí mostramos el crecimiento potencial (≈promedio de 10 años, World Bank). Positivo = economía en expansión.",
  inflation: "Inflación anual al consumidor (%, World Bank). Cuánto suben los precios por año — alta significa pérdida de poder adquisitivo.",
  rate: "Tasa de interés de referencia del banco central (%). Es tu palanca principal: subirla contiene la inflación y enfría la economía; bajarla estimula.",
  fx: "Índice de fuerza de la moneda (100 = base inicial). NO es la cotización real — todos empiezan en 100 y el valor sube/baja durante la simulación (↑ = moneda más fuerte).",
  trade: "Balanza comercial = exportaciones − importaciones, en % del PIB. Verde/positivo = superávit; rojo/negativo = déficit.",
  tariff: "Arancel medio de importación (%). Subirlo encarece las importaciones (protege la industria local, pero tiende a reducir el comercio y el crecimiento).",
  gov: "Postura de gasto público (índice 0–100; 50 = neutro). Por encima de 50 = estímulo fiscal; por debajo = austeridad.",
  week: "Tiempo simulado. Cada tick equivale a 1 semana; cada trimestre el modelo se ancla en datos reales.",
  gdpTotal: "Suma del PIB de todos los países del ámbito actual (billones USD).",
  inflAvg: "Inflación media de los países del ámbito, ponderada por el tamaño de cada economía (PIB).",
  growthAvg: "Crecimiento medio de los países del ámbito, ponderado por el PIB.",
  recession: "Cuántos países están en recesión (crecimiento negativo) en este momento.",
  unemployment: "Tasa de desempleo (% de la fuerza laboral). Sube cuando el crecimiento queda por debajo del potencial (ley de Okun) y presiona la inflación a la baja (curva de Phillips).",
  debt: "Deuda pública bruta (% del PIB). Crece con los déficits y disminuye cuando el PIB nominal crece. La deuda alta encarece el crédito (spread) y limita el espacio fiscal.",
  deficit: "Resultado fiscal (% del PIB). Negativo = déficit (gasta más de lo que recauda); positivo = superávit. Depende de impuestos, gasto público, gasto social y de los intereses de la deuda.",
  spread: "Prima de riesgo soberano (p.p. sumados a la tasa de interés). Sube con deuda alta, inflación, moneda débil e inestabilidad — encarece el crédito y frena la inversión.",
  gini: "Índice de Gini (0–100) de desigualdad de ingresos. Mayor = más desigual. Empeora con desempleo, austeridad e inflación; mejora con gasto social y crecimiento.",
  poverty: "Tasa de pobreza (% de la población). Empeora con desempleo e inflación; mejora con crecimiento y gasto social.",
  wellbeing: "Índice compuesto de bienestar (0–100) que combina pobreza, desigualdad, desempleo e inflación. Un resumen social único.",
  unrest: "Inestabilidad social (0–100). Alimentada por el índice de miseria (inflación+desempleo) y la desigualdad. Alta → fuga de capitales, moneda más débil y erosión de las instituciones.",
  tax: "Carga tributaria (% del PIB). Subirla recauda más (reduce el déficit) pero enfría la demanda y pesa en el bienestar.",
  social: "Porción del gasto destinada a la redistribución (0–100; 50 = neutro). Por encima de 50 reduce la desigualdad y la pobreza, pero cuesta espacio fiscal.",
  commodity: "Precio global de materias primas/energía (índice, 100 = base). Los choques elevan la inflación de todos; los exportadores (Arabia Saudita, Rusia, Brasil…) ganan en tipo de cambio y balanza comercial.",
  population: "Población total del país (World Bank). Evoluciona en la simulación por la tasa de crecimiento demográfico; alimenta la fuerza laboral y la presión fiscal (pensiones).",
  gdpPerCapita: "PIB per cápita = PIB ÷ población (US$ por habitante). Una medida de ingreso medio — mejor para comparar el nivel de vida entre países de tamaños distintos.",
  education: "Calidad de la educación (índice 0–100), basada en las notas armonizadas de aprendizaje del World Bank. Sube con inversión (gasto social y público), baja con inestabilidad — cambia despacio (años). Una mejor educación eleva la productividad y el crecimiento.",
  hdi: "Índice de Desarrollo Humano (IDH), de 0 a 1 (ONU/PNUD). Combina esperanza de vida, escolaridad e ingreso per cápita. Empieza en el valor real de 2022 y evoluciona despacio con salud, educación e ingreso per cápita. Por encima de 0,8 = muy alto; por debajo de 0,55 = bajo.",
  costOfLiving: "Índice de costo de vida (estilo Numbeo), con Nueva York = 100. Mayor = más caro para vivir (bienes y servicios, sin alquiler). Empieza en el valor real y evoluciona con la inflación y la fuerza de la moneda; los subsidios lo reducen. Suiza (~101) es de las más caras; las economías en desarrollo están en 20–40.",
  gci: "Índice de Competitividad Global (GCI 4.0), del Foro Económico Mundial, de 0 a 100. Evalúa instituciones, infraestructura, entorno de negocios, cualificación y capacidad de innovación. Empieza en el valor real de 2019 y evoluciona con la inversión en infraestructura e innovación y la estabilidad. Mayor = más competitivo.",
  infra: "Inversión en infraestructura e innovación (0–100; 50 = neutro). Por encima de 50 eleva la competitividad (GCI) y el crecimiento potencial con el tiempo, pero cuesta espacio fiscal (amplía el déficit).",
  subsidies: "Subsidios al costo de vida — energía, alimentos, transporte (0–100; 50 = neutro). Por encima de 50 reducen el costo de vida y la inflación medida y agradan a la población, pero pesan en el presupuesto y, en exceso, distorsionan los mercados.",
  health: "Inversión en salud y bienestar (0–100; 50 = neutro). Por encima de 50 eleva el IDH (dimensión salud) y el bienestar, pero cuesta espacio fiscal.",
  econFreedom: "Índice de Libertad Económica (Heritage Foundation), 0–100. Mide apertura de mercado, derechos de propiedad, carga regulatoria y libertad de negocios y comercio. Mayor = economía más libre. Evoluciona con la apertura de mercado y las instituciones.",
  cpi: "Índice de Percepción de la Corrupción (IPC, Transparency International), 0–100 — mayor = menos corrupción percibida en el sector público. Dinamarca (~90) lidera; valores bajos indican captura del Estado. Evoluciona con la reforma institucional.",
  democracy: "Índice de Democracia (EIU), 0–10. Combina proceso electoral, funcionamiento del gobierno, participación política y libertades civiles. Por encima de 8 = democracia plena; por debajo de 4 = régimen autoritario. Evoluciona con la calidad institucional.",
  pressFreedom: "Índice de Libertad de Prensa (Reporteros Sin Fronteras), 0–100 — mayor = prensa más libre. Refleja pluralismo, independencia y seguridad de los periodistas. Evoluciona con las instituciones y la apertura democrática; la represión lo baja.",
  spi: "Índice de Progreso Social (SPI), 0–100. Mide cuánto la sociedad satisface necesidades básicas, bienestar y oportunidad — más allá del PIB. Es un índice-resultado: sube con el IDH, menos pobreza/desigualdad y más derechos.",
  happiness: "Índice de Felicidad Global (Informe Mundial de la Felicidad), 0–10. Nota media de satisfacción con la vida, explicada por ingreso, apoyo social, salud, libertad y corrupción. Un resumen de cuán satisfecha está la población.",
  institutions: "Reforma institucional (0–100; 50 = neutro): Estado de derecho, lucha contra la corrupción, calidad democrática y prensa libre. Por encima de 50 eleva el IPC, la democracia, la libertad de prensa y, en parte, la competitividad — cambia despacio (años).",
  market: "Apertura y desregulación de mercado (0–100; 50 = neutro). Por encima de 50 eleva la libertad económica, la competitividad y el crecimiento, pero tiende a aumentar la desigualdad (eficiencia vs. equidad).",
};

export const HELP: Record<Lang, Record<HelpId, string>> = { pt: HELP_PT, en: HELP_EN, es: HELP_ES };

// Data provenance shown on hover (title) of each value: year + source + whether
// it's a real measurement, a derived estimate, curated, or user-set.
const PROV_PT: Record<HelpId, string> = {
  gdp: "Referência: World Bank · 2024 · dado real (âncora inicial; evolui na simulação)",
  growth: "Referência: World Bank · crescimento potencial = média 2013–2024 · estimativa",
  inflation: "Referência: World Bank (CPI) · 2024 · dado real",
  rate: "Referência: bancos centrais · ~2025 · curado manualmente (World Bank não publica juros de política)",
  fx: "Referência: índice do modelo (100 = base) · estimado — não é cotação real",
  trade: "Referência: World Bank (shares exp/imp) · 2024 · derivado",
  tariff: "Alavanca definida por você (padrão 2%)",
  gov: "Alavanca definida por você (50 = neutro)",
  week: "Tempo da simulação (1 tick = 1 semana)",
  gdpTotal: "Calculado: soma do PIB dos países do escopo (World Bank · 2024)",
  inflAvg: "Calculado: média ponderada pelo PIB (World Bank · 2024)",
  growthAvg: "Calculado: média ponderada pelo PIB",
  recession: "Calculado ao vivo pela simulação",
  unemployment: "Referência: World Bank (SL.UEM.TOTL.ZS) · ~2023 · dado real (âncora inicial; evolui na simulação)",
  debt: "Referência: dívida bruta % PIB · ~2023–2024 · curado (cobertura do World Bank é irregular)",
  deficit: "Referência: índice do modelo · derivado de impostos, gasto e juros da dívida",
  spread: "Referência: índice do modelo · derivado (dívida, inflação, câmbio, instabilidade)",
  gini: "Referência: índice de Gini · ~2023 · curado (World Bank tem cobertura defasada)",
  poverty: "Referência: taxa de pobreza · ~2023 · curado/estimado",
  wellbeing: "Referência: índice composto do modelo · derivado",
  unrest: "Referência: índice do modelo (0–100) · derivado",
  tax: "Alavanca definida por você (padrão = carga tributária de base do país)",
  social: "Alavanca definida por você (50 = neutro)",
  commodity: "Referência: índice do modelo (100 = base) · exógeno — você dispara os choques",
  population: "Referência: World Bank (SP.POP.TOTL) · ~2024 · dado real (evolui na simulação)",
  gdpPerCapita: "Calculado: PIB ÷ população (World Bank · 2024)",
  education: "Referência: World Bank (HD.HCI.HLOS, notas harmonizadas) · ~2020 · dado real→índice (evolui na simulação)",
  hdi: "Referência: ONU/PNUD (Relatório de Desenvolvimento Humano 2023/24) · 2022 · âncora real; evolui na simulação",
  costOfLiving: "Referência: índice estilo Numbeo (NY=100) · ~2024 · âncora curada; evolui na simulação",
  gci: "Referência: Fórum Econômico Mundial (GCI 4.0) · 2019 · âncora real (fora do ranking do FEM, estimada pelo IDH); evolui na simulação",
  infra: "Alavanca definida por você (50 = neutro)",
  subsidies: "Alavanca definida por você (50 = neutro)",
  health: "Alavanca definida por você (50 = neutro)",
  econFreedom: "Referência: Heritage Foundation (Index of Economic Freedom) · 2024 · âncora real (fallback pelo IDH); evolui na simulação",
  cpi: "Referência: Transparency International (CPI) · 2023 · âncora real (fallback pelo IDH); evolui na simulação",
  democracy: "Referência: EIU (Democracy Index) · 2023 · âncora real (fallback pelo IDH); evolui na simulação",
  pressFreedom: "Referência: Repórteres Sem Fronteiras (RSF) · 2024 · âncora real (fallback pelo IDH); evolui na simulação",
  spi: "Referência: Social Progress Imperative (SPI) · 2023 · âncora real (fallback pelo IDH); evolui na simulação",
  happiness: "Referência: World Happiness Report · 2024 · âncora real (fallback pelo IDH); evolui na simulação",
  institutions: "Alavanca definida por você (50 = neutro)",
  market: "Alavanca definida por você (50 = neutro)",
};

const PROV_EN: Record<HelpId, string> = {
  gdp: "Source: World Bank · 2024 · real data (initial anchor; evolves in the simulation)",
  growth: "Source: World Bank · potential growth = 2013–2024 average · estimate",
  inflation: "Source: World Bank (CPI) · 2024 · real data",
  rate: "Source: central banks · ~2025 · manually curated (World Bank does not publish policy rates)",
  fx: "Source: model index (100 = base) · estimated — not a real exchange rate",
  trade: "Source: World Bank (exp/imp shares) · 2024 · derived",
  tariff: "Lever set by you (default 2%)",
  gov: "Lever set by you (50 = neutral)",
  week: "Simulation time (1 tick = 1 week)",
  gdpTotal: "Computed: sum of the GDP of the countries in scope (World Bank · 2024)",
  inflAvg: "Computed: GDP-weighted average (World Bank · 2024)",
  growthAvg: "Computed: GDP-weighted average",
  recession: "Computed live by the simulation",
  unemployment: "Source: World Bank (SL.UEM.TOTL.ZS) · ~2023 · real data (initial anchor; evolves in the simulation)",
  debt: "Source: gross debt % of GDP · ~2023–2024 · curated (World Bank coverage is uneven)",
  deficit: "Source: model index · derived from taxes, spending and debt interest",
  spread: "Source: model index · derived (debt, inflation, exchange rate, instability)",
  gini: "Source: Gini index · ~2023 · curated (World Bank coverage is lagged)",
  poverty: "Source: poverty rate · ~2023 · curated/estimated",
  wellbeing: "Source: model composite index · derived",
  unrest: "Source: model index (0–100) · derived",
  tax: "Lever set by you (default = the country's baseline tax burden)",
  social: "Lever set by you (50 = neutral)",
  commodity: "Source: model index (100 = base) · exogenous — you trigger the shocks",
  population: "Source: World Bank (SP.POP.TOTL) · ~2024 · real data (evolves in the simulation)",
  gdpPerCapita: "Computed: GDP ÷ population (World Bank · 2024)",
  education: "Source: World Bank (HD.HCI.HLOS, harmonized scores) · ~2020 · real data→index (evolves in the simulation)",
  hdi: "Source: UN/UNDP (Human Development Report 2023/24) · 2022 · real anchor; evolves in the simulation",
  costOfLiving: "Source: Numbeo-style index (NY=100) · ~2024 · curated anchor; evolves in the simulation",
  gci: "Source: World Economic Forum (GCI 4.0) · 2019 · real anchor (outside the WEF ranking, estimated from HDI); evolves in the simulation",
  infra: "Lever set by you (50 = neutral)",
  subsidies: "Lever set by you (50 = neutral)",
  health: "Lever set by you (50 = neutral)",
  econFreedom: "Source: Heritage Foundation (Index of Economic Freedom) · 2024 · real anchor (HDI fallback); evolves in the simulation",
  cpi: "Source: Transparency International (CPI) · 2023 · real anchor (HDI fallback); evolves in the simulation",
  democracy: "Source: EIU (Democracy Index) · 2023 · real anchor (HDI fallback); evolves in the simulation",
  pressFreedom: "Source: Reporters Without Borders (RSF) · 2024 · real anchor (HDI fallback); evolves in the simulation",
  spi: "Source: Social Progress Imperative (SPI) · 2023 · real anchor (HDI fallback); evolves in the simulation",
  happiness: "Source: World Happiness Report · 2024 · real anchor (HDI fallback); evolves in the simulation",
  institutions: "Lever set by you (50 = neutral)",
  market: "Lever set by you (50 = neutral)",
};

const PROV_ES: Record<HelpId, string> = {
  gdp: "Fuente: World Bank · 2024 · dato real (ancla inicial; evoluciona en la simulación)",
  growth: "Fuente: World Bank · crecimiento potencial = promedio 2013–2024 · estimación",
  inflation: "Fuente: World Bank (IPC) · 2024 · dato real",
  rate: "Fuente: bancos centrales · ~2025 · curado manualmente (World Bank no publica tasas de política)",
  fx: "Fuente: índice del modelo (100 = base) · estimado — no es cotización real",
  trade: "Fuente: World Bank (shares exp/imp) · 2024 · derivado",
  tariff: "Palanca definida por ti (predeterminado 2%)",
  gov: "Palanca definida por ti (50 = neutro)",
  week: "Tiempo de la simulación (1 tick = 1 semana)",
  gdpTotal: "Calculado: suma del PIB de los países del ámbito (World Bank · 2024)",
  inflAvg: "Calculado: promedio ponderado por el PIB (World Bank · 2024)",
  growthAvg: "Calculado: promedio ponderado por el PIB",
  recession: "Calculado en vivo por la simulación",
  unemployment: "Fuente: World Bank (SL.UEM.TOTL.ZS) · ~2023 · dato real (ancla inicial; evoluciona en la simulación)",
  debt: "Fuente: deuda bruta % PIB · ~2023–2024 · curado (la cobertura del World Bank es irregular)",
  deficit: "Fuente: índice del modelo · derivado de impuestos, gasto e intereses de la deuda",
  spread: "Fuente: índice del modelo · derivado (deuda, inflación, tipo de cambio, inestabilidad)",
  gini: "Fuente: índice de Gini · ~2023 · curado (el World Bank tiene cobertura desfasada)",
  poverty: "Fuente: tasa de pobreza · ~2023 · curado/estimado",
  wellbeing: "Fuente: índice compuesto del modelo · derivado",
  unrest: "Fuente: índice del modelo (0–100) · derivado",
  tax: "Palanca definida por ti (predeterminado = carga tributaria de base del país)",
  social: "Palanca definida por ti (50 = neutro)",
  commodity: "Fuente: índice del modelo (100 = base) · exógeno — tú disparas los choques",
  population: "Fuente: World Bank (SP.POP.TOTL) · ~2024 · dato real (evoluciona en la simulación)",
  gdpPerCapita: "Calculado: PIB ÷ población (World Bank · 2024)",
  education: "Fuente: World Bank (HD.HCI.HLOS, notas armonizadas) · ~2020 · dato real→índice (evoluciona en la simulación)",
  hdi: "Fuente: ONU/PNUD (Informe sobre Desarrollo Humano 2023/24) · 2022 · ancla real; evoluciona en la simulación",
  costOfLiving: "Fuente: índice estilo Numbeo (NY=100) · ~2024 · ancla curada; evoluciona en la simulación",
  gci: "Fuente: Foro Económico Mundial (GCI 4.0) · 2019 · ancla real (fuera del ranking del FEM, estimada por el IDH); evoluciona en la simulación",
  infra: "Palanca definida por ti (50 = neutro)",
  subsidies: "Palanca definida por ti (50 = neutro)",
  health: "Palanca definida por ti (50 = neutro)",
  econFreedom: "Fuente: Heritage Foundation (Index of Economic Freedom) · 2024 · ancla real (fallback por IDH); evoluciona en la simulación",
  cpi: "Fuente: Transparency International (CPI) · 2023 · ancla real (fallback por IDH); evoluciona en la simulación",
  democracy: "Fuente: EIU (Democracy Index) · 2023 · ancla real (fallback por IDH); evoluciona en la simulación",
  pressFreedom: "Fuente: Reporteros Sin Fronteras (RSF) · 2024 · ancla real (fallback por IDH); evoluciona en la simulación",
  spi: "Fuente: Social Progress Imperative (SPI) · 2023 · ancla real (fallback por IDH); evoluciona en la simulación",
  happiness: "Fuente: World Happiness Report · 2024 · ancla real (fallback por IDH); evoluciona en la simulación",
  institutions: "Palanca definida por ti (50 = neutro)",
  market: "Palanca definida por ti (50 = neutro)",
};

export const PROVENANCE: Record<Lang, Record<HelpId, string>> = { pt: PROV_PT, en: PROV_EN, es: PROV_ES };

export function HelpTip({ id }: { id: HelpId }) {
  const { lang, t } = useI18n();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="ml-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-600 text-[0.5625rem] font-bold leading-none text-slate-400 hover:border-sky-400 hover:text-sky-300"
          aria-label={t("common.explanation")}
        >
          ?
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={5}
          collisionPadding={8}
          onClick={(e) => e.stopPropagation()}
          className="z-[60] w-60 rounded-lg border border-slate-700 bg-[#0d1626] px-3 py-2 text-[0.6875rem] font-normal normal-case leading-snug text-slate-200 shadow-2xl"
        >
          {HELP[lang][id]}
          <Popover.Arrow className="fill-slate-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

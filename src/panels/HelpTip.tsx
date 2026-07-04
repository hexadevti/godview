// Small "?" that opens a popover explaining a data field. One central dictionary
// so the same wording is reused across the world table and country cards.

import * as Popover from "@radix-ui/react-popover";

export const HELP = {
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
  // ---- Social / fiscal / demographic ----
  unemployment: "Taxa de desemprego (% da força de trabalho). Sobe quando o crescimento fica abaixo do potencial (Lei de Okun) e pressiona a inflação para baixo (curva de Phillips).",
  debt: "Dívida pública bruta (% do PIB). Cresce com déficits e diminui quando o PIB nominal cresce. Dívida alta encarece o crédito (spread) e limita o espaço fiscal.",
  deficit: "Resultado fiscal (% do PIB). Negativo = déficit (gasta mais do que arrecada); positivo = superávit. Depende de impostos, gasto público, gasto social e dos juros da dívida.",
  spread: "Prêmio de risco soberano (p.p. somados aos juros). Sobe com dívida alta, inflação, moeda fraca e instabilidade — encarece o crédito e freia o investimento.",
  gini: "Índice de Gini (0–100) de desigualdade de renda. Maior = mais desigual. Piora com desemprego, austeridade e inflação; melhora com gasto social e crescimento.",
  poverty: "Taxa de pobreza (% da população). Piora com desemprego e inflação; melhora com crescimento e gasto social.",
  approval: "Aprovação pública / capital político (0–100) — o placar do jogo. Sobe com crescimento; cai com inflação, desemprego, desigualdade e impostos. Muito baixa → risco de crise.",
  wellbeing: "Índice composto de bem-estar (0–100) combinando pobreza, desigualdade, desemprego e inflação. Um resumo social único.",
  unrest: "Instabilidade social (0–100). Alimentada por índice de miséria (inflação+desemprego), desigualdade e baixa aprovação. Alta → fuga de capital e crise.",
  tax: "Carga tributária (% do PIB). Subir arrecada mais (reduz o déficit) mas esfria a demanda e pesa na aprovação.",
  social: "Fatia do gasto voltada à redistribuição (0–100; 50 = neutro). Acima de 50 reduz desigualdade e pobreza, mas custa espaço fiscal.",
  commodity: "Preço global de commodities/energia (índice, 100 = base). Choques elevam a inflação de todos; exportadores (Arábia, Rússia, Brasil…) ganham em câmbio e saldo comercial.",
  population: "População total do país (World Bank). Evolui na simulação pela taxa de crescimento demográfico; alimenta a força de trabalho e a pressão fiscal (previdência).",
  gdpPerCapita: "PIB per capita = PIB ÷ população (US$ por habitante). Uma medida de renda média — melhor para comparar o padrão de vida entre países de tamanhos diferentes.",
} as const;

export type HelpId = keyof typeof HELP;

// Data provenance shown on hover (title) of each value: year + source + whether
// it's a real measurement, a derived estimate, curated, or user-set.
export const PROVENANCE: Record<HelpId, string> = {
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
  // ---- Social / fiscal / demographic ----
  unemployment: "Referência: World Bank (SL.UEM.TOTL.ZS) · ~2023 · dado real (âncora inicial; evolui na simulação)",
  debt: "Referência: dívida bruta % PIB · ~2023–2024 · curado (cobertura do World Bank é irregular)",
  deficit: "Referência: índice do modelo · derivado de impostos, gasto e juros da dívida",
  spread: "Referência: índice do modelo · derivado (dívida, inflação, câmbio, instabilidade)",
  gini: "Referência: índice de Gini · ~2023 · curado (World Bank tem cobertura defasada)",
  poverty: "Referência: taxa de pobreza · ~2023 · curado/estimado",
  approval: "Referência: índice do modelo (0–100) · estimado — não é pesquisa de opinião real",
  wellbeing: "Referência: índice composto do modelo · derivado",
  unrest: "Referência: índice do modelo (0–100) · derivado",
  tax: "Alavanca definida por você (padrão = carga tributária de base do país)",
  social: "Alavanca definida por você (50 = neutro)",
  commodity: "Referência: índice do modelo (100 = base) · exógeno — você dispara os choques",
  population: "Referência: World Bank (SP.POP.TOTL) · ~2024 · dado real (evolui na simulação)",
  gdpPerCapita: "Calculado: PIB ÷ população (World Bank · 2024)",
};

export function HelpTip({ id }: { id: HelpId }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="ml-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-600 text-[9px] font-bold leading-none text-slate-400 hover:border-sky-400 hover:text-sky-300"
          aria-label="Explicação"
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
          className="z-[60] w-60 rounded-lg border border-slate-700 bg-[#0d1626] px-3 py-2 text-[11px] font-normal normal-case leading-snug text-slate-200 shadow-2xl"
        >
          {HELP[id]}
          <Popover.Arrow className="fill-slate-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

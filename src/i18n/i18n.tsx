// Lightweight, dependency-free i18n for GodView. A flat dictionary keyed by a
// stable string, each entry mapping a language -> the localized text. The active
// language lives in React context (persisted to localStorage) so switching it
// re-renders every consumer. `t(key, vars)` does {placeholder} interpolation.
//
// Longer texts (the help + provenance dictionaries) are localized next to the
// component that owns them (see panels/HelpTip.tsx) — this file holds the short
// UI labels, buttons, titles and hints.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "pt" | "en" | "es";

export const LANGS: Array<{ id: Lang; label: string }> = [
  { id: "pt", label: "PT" },
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
];

// key -> { pt, en, es }. Missing translations fall back to pt, then the key.
const STRINGS: Record<string, Record<Lang, string>> = {
  // ---- App shell ----
  "app.subtitle": { pt: "Macroeconomia Global", en: "Global Macroeconomics", es: "Macroeconomía Global" },
  "app.worldTable": { pt: "Tabela mundial", en: "World table", es: "Tabla mundial" },
  "app.hideWorldTable": { pt: "Ocultar tabela mundial", en: "Hide world table", es: "Ocultar tabla mundial" },
  "app.macroSource": {
    pt: "Macro real: World Bank · snapshot {date}",
    en: "Real macro: World Bank · snapshot {date}",
    es: "Macro real: World Bank · snapshot {date}",
  },
  "app.baseMap": { pt: "Mapa base", en: "Base map", es: "Mapa base" },
  "app.relief": { pt: "Relevo", en: "Relief", es: "Relieve" },
  "app.metricColor": { pt: "Métrica (cor dos países)", en: "Metric (country color)", es: "Métrica (color de países)" },
  "app.scope": { pt: "Escopo", en: "Scope", es: "Alcance" },
  "app.layers": { pt: "Camadas", en: "Layers", es: "Capas" },
  "app.hint": {
    pt: "Clique num país para abrir os ajustes e ver sua malha interna. Arraste para girar o globo.",
    en: "Click a country to open its levers and see its internal network. Drag to spin the globe.",
    es: "Haz clic en un país para abrir sus controles y ver su red interna. Arrastra para girar el globo.",
  },
  "app.language": { pt: "Idioma", en: "Language", es: "Idioma" },
  "app.fontSize": { pt: "Fonte", en: "Font size", es: "Fuente" },
  "app.fontSmaller": { pt: "Diminuir fonte", en: "Smaller font", es: "Reducir fuente" },
  "app.fontLarger": { pt: "Aumentar fonte", en: "Larger font", es: "Aumentar fuente" },
  "app.fontReset": { pt: "Restaurar 100%", en: "Reset to 100%", es: "Restaurar 100%" },

  // ---- Metrics (globe color) ----
  "metric.gdp": { pt: "Poder (PIB)", en: "Power (GDP)", es: "Poder (PIB)" },
  "metric.gdpPerCapita": { pt: "PIB per capita", en: "GDP per capita", es: "PIB per cápita" },
  "metric.population": { pt: "População", en: "Population", es: "Población" },
  "metric.growth": { pt: "Crescimento", en: "Growth", es: "Crecimiento" },
  "metric.inflation": { pt: "Inflação", en: "Inflation", es: "Inflación" },
  "metric.unemployment": { pt: "Desemprego", en: "Unemployment", es: "Desempleo" },
  "metric.inequality": { pt: "Desigualdade", en: "Inequality", es: "Desigualdad" },
  "metric.education": { pt: "Educação", en: "Education", es: "Educación" },
  "metric.hdi": { pt: "IDH", en: "HDI", es: "IDH" },
  "metric.costOfLiving": { pt: "Custo de vida", en: "Cost of living", es: "Costo de vida" },
  "metric.gci": { pt: "Competitividade", en: "Competitiveness", es: "Competitividad" },
  "metric.econFreedom": { pt: "Liberdade econômica", en: "Economic freedom", es: "Libertad económica" },
  "metric.cpi": { pt: "Corrupção (IPC)", en: "Corruption (CPI)", es: "Corrupción (IPC)" },
  "metric.democracy": { pt: "Democracia", en: "Democracy", es: "Democracia" },
  "metric.pressFreedom": { pt: "Liberdade de imprensa", en: "Press freedom", es: "Libertad de prensa" },
  "metric.spi": { pt: "Progresso social", en: "Social progress", es: "Progreso social" },
  "metric.happiness": { pt: "Felicidade", en: "Happiness", es: "Felicidad" },
  "metric.homicide": { pt: "Homicídios", en: "Homicides", es: "Homicidios" },

  // ---- Infrastructure layers ----
  "layer.borders": { pt: "Divisas", en: "Borders", es: "Fronteras" },
  "layer.air": { pt: "Aéreo", en: "Air", es: "Aéreo" },
  "layer.sea": { pt: "Marítimo", en: "Sea", es: "Marítimo" },
  "layer.road": { pt: "Rodoviário", en: "Road", es: "Carretera" },
  "layer.rail": { pt: "Ferroviário", en: "Rail", es: "Ferrocarril" },
  "layer.cities": { pt: "Cidades", en: "Cities", es: "Ciudades" },
  "layer.cables": { pt: "Cabos", en: "Cables", es: "Cables" },
  "layer.rivers": { pt: "Hidrovias", en: "Waterways", es: "Hidrovías" },
  "layer.datacenters": { pt: "Datacenters", en: "Datacenters", es: "Datacenters" },
  "layer.satellites": { pt: "Satélites", en: "Satellites", es: "Satélites" },
  "layer.clouds": { pt: "Nuvens", en: "Clouds", es: "Nubes" },
  "layer.atmosphere": { pt: "Atmosfera", en: "Atmosphere", es: "Atmósfera" },
  "layer.sky": { pt: "Céu ☀️🌙", en: "Sky ☀️🌙", es: "Cielo ☀️🌙" },

  // ---- Base maps ----
  "basemap.political": { pt: "Político", en: "Political", es: "Político" },
  "basemap.terrain": { pt: "Relevo ×10", en: "Relief ×10", es: "Relieve ×10" },
  "basemap.satellite": { pt: "Satélite", en: "Satellite", es: "Satélite" },
  "basemap.agora": { pt: "Agora ☀️🌙", en: "Now ☀️🌙", es: "Ahora ☀️🌙" },
  "basemap.night": { pt: "Noturno", en: "Night", es: "Nocturno" },
  "basemap.hydro": { pt: "Hidrográfico", en: "Hydrographic", es: "Hidrográfico" },

  // ---- Scopes ----
  "scope.g7": { pt: "G7", en: "G7", es: "G7" },
  "scope.brics": { pt: "Emergentes", en: "Emerging", es: "Emergentes" },
  "scope.g20": { pt: "G20", en: "G20", es: "G20" },
  "scope.all": { pt: "Todos", en: "All", es: "Todos" },

  // ---- Metric legend scale labels ----
  "scale.gdp": { pt: "PIB — tri USD (escala log)", en: "GDP — USD tn (log scale)", es: "PIB — bill. USD (escala log)" },
  "scale.growth": { pt: "Crescimento — % a.a.", en: "Growth — %/yr", es: "Crecimiento — % anual" },
  "scale.inflation": { pt: "Inflação — % a.a.", en: "Inflation — %/yr", es: "Inflación — % anual" },
  "scale.unemployment": {
    pt: "Desemprego — % da força de trabalho",
    en: "Unemployment — % of labor force",
    es: "Desempleo — % de la fuerza laboral",
  },
  "scale.inequality": { pt: "Desigualdade — índice de Gini", en: "Inequality — Gini index", es: "Desigualdad — índice de Gini" },
  "scale.gdpPerCapita": {
    pt: "PIB per capita — US$ (escala log)",
    en: "GDP per capita — US$ (log scale)",
    es: "PIB per cápita — US$ (escala log)",
  },
  "scale.population": {
    pt: "População — milhões (escala log)",
    en: "Population — millions (log scale)",
    es: "Población — millones (escala log)",
  },
  "scale.education": { pt: "Educação — índice 0–100", en: "Education — index 0–100", es: "Educación — índice 0–100" },
  "scale.hdi": { pt: "IDH — índice 0–1 (ONU)", en: "HDI — index 0–1 (UN)", es: "IDH — índice 0–1 (ONU)" },
  "scale.costOfLiving": { pt: "Custo de vida — índice (NY=100)", en: "Cost of living — index (NY=100)", es: "Costo de vida — índice (NY=100)" },
  "scale.gci": { pt: "Competitividade — índice 0–100 (FEM)", en: "Competitiveness — index 0–100 (WEF)", es: "Competitividad — índice 0–100 (FEM)" },
  "scale.econFreedom": { pt: "Liberdade econômica — índice 0–100", en: "Economic freedom — index 0–100", es: "Libertad económica — índice 0–100" },
  "scale.cpi": { pt: "Percepção da corrupção (IPC) — 0–100 (maior = mais íntegro)", en: "Corruption Perceptions (CPI) — 0–100 (higher = cleaner)", es: "Percepción de corrupción (IPC) — 0–100 (mayor = más íntegro)" },
  "scale.democracy": { pt: "Democracia — índice 0–10 (EIU)", en: "Democracy — index 0–10 (EIU)", es: "Democracia — índice 0–10 (EIU)" },
  "scale.pressFreedom": { pt: "Liberdade de imprensa — 0–100 (RSF)", en: "Press freedom — 0–100 (RSF)", es: "Libertad de prensa — 0–100 (RSF)" },
  "scale.spi": { pt: "Progresso social (SPI) — 0–100", en: "Social progress (SPI) — 0–100", es: "Progreso social (SPI) — 0–100" },
  "scale.happiness": { pt: "Felicidade global — 0–10 (WHR)", en: "Global happiness — 0–10 (WHR)", es: "Felicidad global — 0–10 (WHR)" },
  "scale.homicide": { pt: "Homicídios — por 100 mil hab. (UNODC)", en: "Homicides — per 100k people (UNODC)", es: "Homicidios — por 100 mil hab. (UNODC)" },

  // ---- Scenarios ----
  "scenario.sandbox.label": { pt: "Sandbox (hoje)", en: "Sandbox (today)", es: "Sandbox (hoy)" },
  "scenario.sandbox.note": {
    pt: "Snapshot atual do G20. Experimente livremente — sem gabarito.",
    en: "Current G20 snapshot. Experiment freely — no right answer.",
    es: "Snapshot actual del G20. Experimenta libremente — sin respuesta correcta.",
  },
  "scenario.trade-war.label": { pt: "Guerra comercial", en: "Trade war", es: "Guerra comercial" },
  "scenario.trade-war.note": {
    pt: "EUA e China começam com tarifas de 25%. Veja o efeito no comércio e no PIB.",
    en: "The US and China start with 25% tariffs. See the effect on trade and GDP.",
    es: "EE. UU. y China empiezan con aranceles del 25%. Observa el efecto en el comercio y el PIB.",
  },
  "scenario.inflation-shock.label": { pt: "Choque inflacionário", en: "Inflation shock", es: "Choque inflacionario" },
  "scenario.inflation-shock.note": {
    pt: "Todos começam com +5 p.p. de inflação. Você consegue ancorar sem quebrar o PIB?",
    en: "Everyone starts with +5 p.p. of inflation. Can you anchor it without breaking GDP?",
    es: "Todos empiezan con +5 p.p. de inflación. ¿Puedes anclarla sin romper el PIB?",
  },
  "scenario.inflation-shock.objective": {
    pt: "Trazer a inflação para perto da meta sem estourar o desemprego nem derrubar o bem-estar.",
    en: "Bring inflation near target without blowing up unemployment or crashing wellbeing.",
    es: "Llevar la inflación cerca de la meta sin disparar el desempleo ni hundir el bienestar.",
  },
  "scenario.stagflation.label": { pt: "Estagflação", en: "Stagflation", es: "Estanflación" },
  "scenario.stagflation.note": {
    pt: "Inflação alta E economia parada. O dilema clássico: apertar juros aprofunda o desemprego.",
    en: "High inflation AND a stalled economy. The classic dilemma: hiking rates deepens unemployment.",
    es: "Inflación alta Y economía estancada. El dilema clásico: subir tasas agrava el desempleo.",
  },
  "scenario.stagflation.objective": {
    pt: "Sair da estagflação mantendo o bem-estar alto — cuidado com a instabilidade social.",
    en: "Escape stagflation while keeping wellbeing high — mind social instability.",
    es: "Salir de la estanflación manteniendo el bienestar alto — cuidado con la inestabilidad social.",
  },
  "scenario.oil-shock.label": { pt: "Choque do petróleo", en: "Oil shock", es: "Choque petrolero" },
  "scenario.oil-shock.note": {
    pt: "Preço global de commodities dispara (+60%). Importadores sofrem com inflação; exportadores lucram.",
    en: "Global commodity prices spike (+60%). Importers suffer inflation; exporters profit.",
    es: "Los precios globales de materias primas se disparan (+60%). Los importadores sufren inflación; los exportadores se benefician.",
  },
  "scenario.oil-shock.objective": {
    pt: "Conter o repasse inflacionário do choque de energia sem provocar recessão.",
    en: "Contain the inflationary pass-through of the energy shock without triggering a recession.",
    es: "Contener el traspaso inflacionario del choque energético sin provocar una recesión.",
  },

  // ---- Timeline ----
  "timeline.scenarioTitle": { pt: "Cenário inicial", en: "Starting scenario", es: "Escenario inicial" },
  "timeline.play": { pt: "Rodar", en: "Play", es: "Reproducir" },
  "timeline.pause": { pt: "Pausar", en: "Pause", es: "Pausar" },
  "timeline.reset": { pt: "Reiniciar", en: "Reset", es: "Reiniciar" },
  "timeline.resetTitle": { pt: "Reiniciar cenário", en: "Reset scenario", es: "Reiniciar escenario" },
  "timeline.commodityNormalize": {
    pt: "Normalizar o preço de commodities",
    en: "Normalize commodity prices",
    es: "Normalizar el precio de materias primas",
  },
  "timeline.commodityShock": {
    pt: "Disparar choque de commodities/energia (+60%): inflação sobe para todos; exportadores lucram",
    en: "Trigger a commodity/energy shock (+60%): inflation rises everywhere; exporters profit",
    es: "Disparar un choque de materias primas/energía (+60%): la inflación sube para todos; los exportadores se benefician",
  },
  "timeline.normalizeShort": { pt: "· normalizar", en: "· normalize", es: "· normalizar" },
  "timeline.shockShort": { pt: "· choque", en: "· shock", es: "· choque" },
  "timeline.clockTitle": { pt: "Tempo simulado", en: "Simulated time", es: "Tiempo simulado" },
  "timeline.clock": { pt: "Ano {y} · S{w}", en: "Year {y} · W{w}", es: "Año {y} · S{w}" },

  // ---- World table ----
  "wt.title": { pt: "Visão geral do mundo", en: "World overview", es: "Visión general del mundo" },
  "wt.values": { pt: "Valores", en: "Values", es: "Valores" },
  "wt.ranking": { pt: "Ranking", en: "Ranking", es: "Ranking" },
  "wt.rankHint": {
    pt: "Alterna entre os valores e a posição (ranking) de cada país por critério — 1º = melhor.",
    en: "Toggle between raw values and each country's rank per criterion — 1st = best.",
    es: "Alterna entre los valores y la posición (ranking) de cada país por criterio — 1º = mejor.",
  },
  "wt.subtitle": {
    pt: "{n} países · Semana {w} · arraste o título para mover · clique numa linha",
    en: "{n} countries · Week {w} · drag the title to move · click a row",
    es: "{n} países · Semana {w} · arrastra el título para mover · haz clic en una fila",
  },
  "agg.gdpTotal": { pt: "PIB total", en: "Total GDP", es: "PIB total" },
  "agg.population": { pt: "População", en: "Population", es: "Población" },
  "agg.growthAvg": { pt: "Cresc. méd.", en: "Avg. growth", es: "Crec. prom." },
  "agg.inflAvg": { pt: "Inflação méd.", en: "Avg. inflation", es: "Inflación prom." },
  "agg.unempAvg": { pt: "Desemp. méd.", en: "Avg. unempl.", es: "Desemp. prom." },
  "agg.debtAvg": { pt: "Dívida méd.", en: "Avg. debt", es: "Deuda prom." },
  "agg.recession": { pt: "Em recessão", en: "In recession", es: "En recesión" },

  // ---- World table columns ----
  "col.name": { pt: "País", en: "Country", es: "País" },
  "col.gdp": { pt: "PIB (tri)", en: "GDP (tn)", es: "PIB (bill.)" },
  "col.population": { pt: "Pop.", en: "Pop.", es: "Pob." },
  "col.gdpPerCapita": { pt: "PIB/cap.", en: "GDP/cap.", es: "PIB/cáp." },
  "col.gdpGrowthAnn": { pt: "Cresc.", en: "Growth", es: "Crec." },
  "col.inflationAnn": { pt: "Infl.", en: "Infl.", es: "Infl." },
  "col.unemployment": { pt: "Desemp.", en: "Unempl.", es: "Desemp." },
  "col.policyRate": { pt: "Juros", en: "Rate", es: "Tasa" },
  "col.debtPctGdp": { pt: "Dívida", en: "Debt", es: "Deuda" },
  "col.gini": { pt: "Gini", en: "Gini", es: "Gini" },
  "col.education": { pt: "Educ.", en: "Educ.", es: "Educ." },
  "col.hdi": { pt: "IDH", en: "HDI", es: "IDH" },
  "col.costOfLiving": { pt: "Custo vida", en: "Cost/liv.", es: "Costo vida" },
  "col.gci": { pt: "Compet.", en: "Compet.", es: "Compet." },
  "col.econFreedom": { pt: "Lib.econ.", en: "Econ.free.", es: "Lib.econ." },
  "col.cpi": { pt: "IPC", en: "CPI", es: "IPC" },
  "col.democracy": { pt: "Democ.", en: "Democ.", es: "Democ." },
  "col.pressFreedom": { pt: "Imprensa", en: "Press", es: "Prensa" },
  "col.spi": { pt: "SPI", en: "SPI", es: "SPI" },
  "col.happiness": { pt: "Felic.", en: "Happ.", es: "Felic." },
  "col.homicide": { pt: "Homic.", en: "Homic.", es: "Homic." },
  "col.tradeBalancePctGdp": { pt: "Saldo", en: "Balance", es: "Saldo" },

  // ---- Country panel ----
  "cp.dragHint": {
    pt: "Arraste o título para mover · canto ↘ para redimensionar.",
    en: "Drag the title to move · corner ↘ to resize.",
    es: "Arrastra el título para mover · esquina ↘ para redimensionar.",
  },
  "cp.economy": { pt: "Economia", en: "Economy", es: "Economía" },
  "cp.socialFiscal": { pt: "Social & fiscal", en: "Social & fiscal", es: "Social y fiscal" },
  "cp.levers": { pt: "Alavancas de política", en: "Policy levers", es: "Palancas de política" },
  "cp.instability": { pt: "Instabilidade", en: "Instability", es: "Inestabilidad" },
  "cp.wellbeing": { pt: "Bem-estar", en: "Wellbeing", es: "Bienestar" },

  // ---- Stats ----
  "stat.gdp": { pt: "PIB", en: "GDP", es: "PIB" },
  "stat.gdpPerCapita": { pt: "PIB per capita", en: "GDP per capita", es: "PIB per cápita" },
  "stat.growth": { pt: "Crescimento", en: "Growth", es: "Crecimiento" },
  "stat.inflation": { pt: "Inflação", en: "Inflation", es: "Inflación" },
  "stat.population": { pt: "População", en: "Population", es: "Población" },
  "stat.fx": { pt: "Câmbio (índice)", en: "FX (index)", es: "Tipo de cambio (índice)" },
  "stat.trade": { pt: "Saldo comercial", en: "Trade balance", es: "Balanza comercial" },
  "stat.rate": { pt: "Juros", en: "Policy rate", es: "Tasa de interés" },
  "stat.unemployment": { pt: "Desemprego", en: "Unemployment", es: "Desempleo" },
  "stat.debt": { pt: "Dívida pública", en: "Public debt", es: "Deuda pública" },
  "stat.deficit": { pt: "Resultado fiscal", en: "Fiscal balance", es: "Resultado fiscal" },
  "stat.spread": { pt: "Risco (spread)", en: "Risk (spread)", es: "Riesgo (spread)" },
  "stat.gini": { pt: "Desigualdade (Gini)", en: "Inequality (Gini)", es: "Desigualdad (Gini)" },
  "stat.poverty": { pt: "Pobreza", en: "Poverty", es: "Pobreza" },
  "stat.education": { pt: "Educação", en: "Education", es: "Educación" },
  "stat.hdi": { pt: "IDH", en: "HDI", es: "IDH" },
  "stat.costOfLiving": { pt: "Custo de vida", en: "Cost of living", es: "Costo de vida" },
  "stat.gci": { pt: "Competitividade", en: "Competitiveness", es: "Competitividad" },
  "stat.econFreedom": { pt: "Liberdade econômica", en: "Economic freedom", es: "Libertad económica" },
  "stat.cpi": { pt: "Corrupção (IPC)", en: "Corruption (CPI)", es: "Corrupción (IPC)" },
  "stat.democracy": { pt: "Democracia", en: "Democracy", es: "Democracia" },
  "stat.pressFreedom": { pt: "Liberdade de imprensa", en: "Press freedom", es: "Libertad de prensa" },
  "stat.spi": { pt: "Progresso social", en: "Social progress", es: "Progreso social" },
  "stat.happiness": { pt: "Felicidade", en: "Happiness", es: "Felicidad" },
  "stat.homicide": { pt: "Homicídios (100k)", en: "Homicides (100k)", es: "Homicidios (100k)" },

  // ---- Levers ----
  "lever.rate": { pt: "Taxa de juros", en: "Policy rate", es: "Tasa de interés" },
  "lever.tariff": { pt: "Tarifa de importação", en: "Import tariff", es: "Arancel de importación" },
  "lever.gov": { pt: "Gasto público", en: "Government spending", es: "Gasto público" },
  "lever.tax": { pt: "Carga tributária", en: "Tax burden", es: "Carga tributaria" },
  "lever.social": { pt: "Gasto social", en: "Social spending", es: "Gasto social" },
  "lever.infra": { pt: "Infraestrutura & inovação", en: "Infrastructure & innovation", es: "Infraestructura e innovación" },
  "lever.subsidies": { pt: "Subsídios ao custo de vida", en: "Cost-of-living subsidies", es: "Subsidios al costo de vida" },
  "lever.health": { pt: "Saúde & bem-estar", en: "Health & wellbeing", es: "Salud y bienestar" },
  "lever.institutions": { pt: "Instituições & Estado de direito", en: "Institutions & rule of law", es: "Instituciones y Estado de derecho" },
  "lever.market": { pt: "Abertura de mercado", en: "Market liberalization", es: "Apertura de mercado" },

  // ---- Charts ----
  "chart.inflation": { pt: "Inflação", en: "Inflation", es: "Inflación" },
  "chart.growth": { pt: "Crescimento", en: "Growth", es: "Crecimiento" },
  "chart.unemployment": { pt: "Desemprego", en: "Unemployment", es: "Desempleo" },
  "chart.debt": { pt: "Dívida", en: "Debt", es: "Deuda" },
  "chart.fx": { pt: "Câmbio", en: "FX", es: "Tipo de cambio" },
  "chart.publicDebtTitle": { pt: "Dívida pública — % do PIB", en: "Public debt — % of GDP", es: "Deuda pública — % del PIB" },
  "chart.fxTitle": {
    pt: "Câmbio — índice (100 = base; ↑ = moeda mais forte)",
    en: "FX — index (100 = base; ↑ = stronger currency)",
    es: "Tipo de cambio — índice (100 = base; ↑ = moneda más fuerte)",
  },

  // ---- Common ----
  "common.close": { pt: "Fechar", en: "Close", es: "Cerrar" },
  "common.resize": { pt: "Redimensionar", en: "Resize", es: "Redimensionar" },
  "common.and": { pt: "e", en: "and", es: "y" },
  "common.explanation": { pt: "Explicação", en: "Explanation", es: "Explicación" },

  // ---- Units ----
  "unit.tri": { pt: "tri", en: "T", es: "bill." },
  "unit.gdp": { pt: "PIB", en: "GDP", es: "PIB" },
  "unit.perYear": { pt: "% a.a.", en: "%/yr", es: "% anual" },
  "unit.bi": { pt: "bi", en: "bn", es: "mil M" },
  "unit.mi": { pt: "mi", en: "M", es: "M" },
};

function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "godview.lang";
const SUPPORTED = new Set<Lang>(["pt", "en", "es"]);

function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && SUPPORTED.has(saved)) return saved;
  } catch {
    // localStorage unavailable (private mode / SSR) — fall through to detection.
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2).toLowerCase() : "pt";
  if (nav === "en") return "en";
  if (nav === "es") return "es";
  return "pt";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore persistence failures
    }
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const t: TFn = (key, vars) => {
      const entry = STRINGS[key];
      const text = entry ? entry[lang] ?? entry.pt : key;
      return interpolate(text, vars);
    };
    return { lang, setLang: setLangState, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

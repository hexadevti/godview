// Simplified bilateral trade flows among the G20, for the animated arcs on the
// globe. Curated major goods flows, approximate annual value in USD billions,
// directional (exporter -> importer). Not a full 19x19 matrix — Fase 0 replaces
// this with UN Comtrade data (see plan §3).

export interface TradeFlow {
  from: number; // exporter ISO
  to: number; // importer ISO
  value: number; // annual, USD billions
}

export const TRADE_FLOWS: TradeFlow[] = [
  { from: 156, to: 840, value: 450 }, // China -> US
  { from: 840, to: 156, value: 150 }, // US -> China
  { from: 156, to: 392, value: 170 }, // China -> Japan
  { from: 156, to: 276, value: 110 }, // China -> Germany
  { from: 156, to: 410, value: 160 }, // China -> South Korea
  { from: 410, to: 156, value: 130 }, // South Korea -> China
  { from: 840, to: 124, value: 290 }, // US -> Canada
  { from: 124, to: 840, value: 420 }, // Canada -> US
  { from: 840, to: 484, value: 320 }, // US -> Mexico
  { from: 484, to: 840, value: 480 }, // Mexico -> US
  { from: 276, to: 840, value: 160 }, // Germany -> US
  { from: 276, to: 250, value: 120 }, // Germany -> France
  { from: 276, to: 826, value: 90 },  // Germany -> UK
  { from: 276, to: 380, value: 80 },  // Germany -> Italy
  { from: 250, to: 276, value: 90 },  // France -> Germany
  { from: 392, to: 840, value: 140 }, // Japan -> US
  { from: 392, to: 156, value: 140 }, // Japan -> China
  { from: 410, to: 840, value: 110 }, // South Korea -> US
  { from: 356, to: 840, value: 80 },  // India -> US
  { from: 840, to: 356, value: 40 },  // US -> India
  { from: 156, to: 356, value: 100 }, // China -> India
  { from: 76,  to: 156, value: 90 },  // Brazil -> China
  { from: 156, to: 76,  value: 60 },  // China -> Brazil
  { from: 643, to: 156, value: 130 }, // Russia -> China
  { from: 156, to: 643, value: 110 }, // China -> Russia
  { from: 682, to: 156, value: 55 },  // Saudi Arabia -> China
  { from: 682, to: 356, value: 40 },  // Saudi Arabia -> India
  { from: 36,  to: 156, value: 110 }, // Australia -> China
  { from: 156, to: 36,  value: 80 },  // China -> Australia
  { from: 360, to: 156, value: 65 },  // Indonesia -> China
  { from: 826, to: 840, value: 70 },  // UK -> US
  { from: 840, to: 826, value: 75 },  // US -> UK
  { from: 380, to: 276, value: 75 },  // Italy -> Germany
  { from: 792, to: 276, value: 25 },  // Turkey -> Germany
  { from: 710, to: 156, value: 25 },  // South Africa -> China
  { from: 32,  to: 76,  value: 15 },  // Argentina -> Brazil
  { from: 76,  to: 32,  value: 15 },  // Brazil -> Argentina
  { from: 156, to: 826, value: 90 },  // China -> UK
  { from: 156, to: 380, value: 60 },  // China -> Italy
  { from: 276, to: 156, value: 90 },  // Germany -> China
  { from: 392, to: 276, value: 45 },  // Japan -> Germany
  { from: 276, to: 392, value: 40 },  // Germany -> Japan
  { from: 356, to: 276, value: 20 },  // India -> Germany
  { from: 250, to: 840, value: 55 },  // France -> US
  { from: 840, to: 250, value: 40 },  // US -> France
  { from: 380, to: 840, value: 75 },  // Italy -> US
  { from: 840, to: 392, value: 80 },  // US -> Japan
  { from: 124, to: 156, value: 25 },  // Canada -> China
  { from: 156, to: 124, value: 55 },  // China -> Canada
  { from: 484, to: 156, value: 20 },  // Mexico -> China
  { from: 156, to: 484, value: 90 },  // China -> Mexico
  { from: 36,  to: 392, value: 60 },  // Australia -> Japan
  { from: 36,  to: 410, value: 45 },  // Australia -> South Korea
  { from: 356, to: 156, value: 20 },  // India -> China
  { from: 682, to: 392, value: 35 },  // Saudi Arabia -> Japan
  { from: 682, to: 410, value: 30 },  // Saudi Arabia -> South Korea
  { from: 643, to: 276, value: 30 },  // Russia -> Germany
  { from: 643, to: 356, value: 40 },  // Russia -> India
  { from: 76,  to: 840, value: 40 },  // Brazil -> US
  { from: 76,  to: 276, value: 15 },  // Brazil -> Germany
  { from: 250, to: 826, value: 45 },  // France -> UK
  { from: 826, to: 276, value: 40 },  // UK -> Germany
  { from: 392, to: 410, value: 30 },  // Japan -> South Korea
  { from: 410, to: 392, value: 30 },  // South Korea -> Japan
  { from: 360, to: 392, value: 25 },  // Indonesia -> Japan
  { from: 156, to: 360, value: 60 },  // China -> Indonesia
];

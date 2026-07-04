// Country scopes — which countries are "active" (colored, highlighted). `isos:
// null` means the FULL dataset (every country in the snapshot, ~155). The globe
// dims out-of-scope countries; clicking any country still opens its data.

export interface Scope {
  id: string;
  label: string;
  isos: number[] | null;
}

// The 19 G20 members (numeric ISO). Used so the "G20" scope stays the G20 even
// though the dataset now spans the whole world.
const G20_ISOS = [840, 156, 392, 276, 826, 356, 250, 643, 380, 124, 36, 410, 484, 360, 792, 682, 32, 710, 76];

export const SCOPES: Scope[] = [
  { id: "g7", label: "G7", isos: [840, 392, 276, 826, 250, 380, 124] },
  { id: "brics", label: "Emergentes", isos: [76, 643, 356, 156, 710, 360, 484, 792, 682, 32] },
  { id: "g20", label: "G20", isos: G20_ISOS },
  { id: "all", label: "Todos", isos: null },
];

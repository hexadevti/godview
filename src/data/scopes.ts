// Country scopes — which G20 members are "active" (colored, clickable, with
// routes). `isos: null` means the full dataset (all G20).

export interface Scope {
  id: string;
  label: string;
  isos: number[] | null;
}

export const SCOPES: Scope[] = [
  { id: "g7", label: "G7", isos: [840, 392, 276, 826, 250, 380, 124] },
  { id: "brics", label: "Emergentes", isos: [76, 643, 356, 156, 710, 360, 484, 792, 682, 32] },
  { id: "g20", label: "G20", isos: null },
  { id: "all", label: "Todos", isos: null },
];

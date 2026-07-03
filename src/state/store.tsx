// React binding for the simulation. Owns the Web Worker, mirrors the latest
// WorldState into React state, and accumulates a per-country history for the
// time-series charts. Exposed via context so the globe, panel and timeline all
// read one source of truth.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initialWorld, SCENARIOS } from "../sim/engine";
import type {
  CountryControls,
  FromWorker,
  WorldState,
} from "../sim/types";

const MAX_HISTORY = 312; // ~6 years of simulated weeks

export interface HistoryPoint {
  tick: number;
  gdp: number;
  inflation: number;
  fx: number;
  growth: number;
  tradeBalance: number;
}

interface SimValue {
  world: WorldState;
  history: Record<number, HistoryPoint[]>;
  running: boolean;
  speed: number;
  scenarioId: string;
  selectedIsos: number[];
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (s: number) => void;
  setControl: (iso: number, field: keyof CountryControls, value: number) => void;
  setScenario: (id: string) => void;
  openCountry: (iso: number) => void;
  closeCountry: (iso: number) => void;
}

const SimContext = createContext<SimValue | null>(null);

export function SimProvider({ children }: { children: ReactNode }) {
  const workerRef = useRef<Worker | null>(null);
  const historyRef = useRef<Record<number, HistoryPoint[]>>({});

  const [world, setWorld] = useState<WorldState>(() => initialWorld(SCENARIOS[0]));
  const [history, setHistory] = useState<Record<number, HistoryPoint[]>>({});
  const [running, setRunning] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [selectedIsos, setSelectedIsos] = useState<number[]>([]);

  useEffect(() => {
    const worker = new Worker(new URL("../sim/worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const msg = e.data;
      if (msg.type === "state") {
        setWorld(msg.world);
        setRunning(msg.running);
        appendHistory(msg.world);
      } else if (msg.type === "status") {
        setRunning(msg.running);
        setSpeedState(msg.speed);
      }
    };

    worker.postMessage({ type: "init", scenarioId: SCENARIOS[0].id });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function appendHistory(w: WorldState) {
    const h = historyRef.current;
    for (const c of w.countries) {
      const arr = h[c.iso] ?? (h[c.iso] = []);
      arr.push({
        tick: w.tick,
        gdp: c.gdp,
        inflation: c.inflationAnn,
        fx: c.fx,
        growth: c.gdpGrowthAnn,
        tradeBalance: c.tradeBalancePctGdp,
      });
      if (arr.length > MAX_HISTORY) arr.shift();
    }
    // Publish a shallow copy so React re-renders consumers.
    setHistory({ ...h });
  }

  function resetHistory() {
    historyRef.current = {};
    setHistory({});
  }

  const value = useMemo<SimValue>(
    () => ({
      world,
      history,
      running,
      speed,
      scenarioId,
      selectedIsos,
      play: () => workerRef.current?.postMessage({ type: "play" }),
      pause: () => workerRef.current?.postMessage({ type: "pause" }),
      reset: () => {
        resetHistory();
        workerRef.current?.postMessage({ type: "reset" });
      },
      setSpeed: (s: number) => workerRef.current?.postMessage({ type: "setSpeed", speed: s }),
      setControl: (iso, field, val) =>
        workerRef.current?.postMessage({ type: "setControl", iso, field, value: val }),
      setScenario: (id: string) => {
        setScenarioId(id);
        resetHistory();
        workerRef.current?.postMessage({ type: "init", scenarioId: id });
      },
      // Opening a country replaces the current selection (one card at a time).
      openCountry: (iso) => setSelectedIsos([iso]),
      closeCountry: (iso) => setSelectedIsos((prev) => prev.filter((x) => x !== iso)),
    }),
    [world, history, running, speed, scenarioId, selectedIsos],
  );

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim(): SimValue {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used within <SimProvider>");
  return ctx;
}

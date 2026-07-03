// Web Worker host for the tick engine. Keeps the authoritative WorldState off
// the main thread so play/fast-forward never janks the globe.

import { initialWorld, tick, SCENARIOS } from "./engine";
import type { FromWorker, ToWorker, WorldState } from "./types";

const BASE_MS = 250; // 1x speed = 4 ticks/second

let scenarioId = SCENARIOS[0].id;
let world: WorldState = initialWorld(SCENARIOS[0]);
let running = false;
let speed = 1;
let timer: ReturnType<typeof setInterval> | null = null;

const ctx = self as unknown as Worker;
const post = (msg: FromWorker) => ctx.postMessage(msg);

function schedule() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (!running) return;
  timer = setInterval(() => {
    world = tick(world);
    post({ type: "state", world, running });
  }, BASE_MS / speed);
}

ctx.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case "init": {
      scenarioId = msg.scenarioId;
      const scn = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
      world = initialWorld(scn);
      running = false;
      schedule();
      post({ type: "state", world, running });
      break;
    }
    case "play":
      running = true;
      schedule();
      post({ type: "status", running, speed });
      break;
    case "pause":
      running = false;
      schedule();
      post({ type: "status", running, speed });
      break;
    case "reset": {
      const scn = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
      world = initialWorld(scn);
      running = false;
      schedule();
      post({ type: "state", world, running });
      break;
    }
    case "setSpeed":
      speed = msg.speed;
      schedule();
      post({ type: "status", running, speed });
      break;
    case "setControl": {
      const c = world.countries.find((x) => x.iso === msg.iso);
      if (c) {
        c.controls[msg.field] = msg.value;
        // Reflect the change immediately even while paused.
        post({ type: "state", world, running });
      }
      break;
    }
  }
};

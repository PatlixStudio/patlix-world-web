import { Injectable } from '@angular/core';
import type { AgentDto, TaskDto, ZoneDto } from '@patlixworld/shared';

/**
 * Seam between WorldStateStore (state) and the 3D renderer (scene). The
 * adapter applies state to the scene and is intentionally free of business
 * logic — it only mirrors state into Three.js objects. M5/M6 provide the real
 * Three.js implementation against this same contract.
 */
export interface WorldAdapter {
  setZones(zones: ZoneDto[]): void;
  setAgents(agents: AgentDto[]): void;
  setTasks(tasks: TaskDto[]): void;
}

/**
 * Placeholder adapter: mirrors state to the console until the Three.js
 * renderer (M5+) is wired in. Keeps the store/renderer boundary honest.
 */
@Injectable({ providedIn: 'root' })
export class ConsoleWorldAdapter implements WorldAdapter {
  setZones(zones: ZoneDto[]): void {
    console.debug('[adapter] zones', zones.length);
  }

  setAgents(agents: AgentDto[]): void {
    console.debug(
      '[adapter] agents',
      agents.map((agent) => `${agent.name}:${agent.status}`).join(', '),
    );
  }

  setTasks(tasks: TaskDto[]): void {
    console.debug('[adapter] tasks', tasks.length);
  }
}
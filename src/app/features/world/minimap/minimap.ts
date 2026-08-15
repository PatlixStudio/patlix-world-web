import {
  Component,
  ElementRef,
  type OnDestroy,
  type OnInit,
  ViewChild,
} from '@angular/core';
import type { AgentDto, ZoneDto } from '@patlixworld/shared';
import { WorldStateStore } from '../../../core/world-state.store';
import { PlayerControllerService } from '../../../three/player/player-controller.service';
import { RendererService } from '../../../three/renderer.service';
import { WaypointService } from '../../../three/waypoint.service';

/** World extent for map projection; auto-fit to the zone bounds. */
const WORLD = { min: -48, max: 48 };

/**
 * Top-down minimap (canvas): draws zones, HQ, agents, the player and the active
 * waypoint. Clicking sets a waypoint; a compass strip shows heading and the
 * waypoint bearing + distance.
 */
@Component({
  selector: 'app-minimap',
  standalone: true,
  template: `
    <div class="minimap" (click)="onClick($event)">
      <canvas #map></canvas>
      <div class="compass" aria-hidden="true">
        <span class="dir">N</span>
        <span class="needle">{{ compassLabel() }}</span>
        <span class="dir">E</span>
      </div>
      <div class="meta">
        <span>{{ waypointDistance() }}</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 20;
      user-select: none;
      font-family: ui-monospace, monospace;
      color: #e8f2ff;
    }
    .minimap {
      background: rgba(10, 18, 28, 0.72);
      border: 1px solid rgba(120, 180, 255, 0.35);
      border-radius: 10px;
      padding: 6px;
      backdrop-filter: blur(6px);
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
    }
    canvas {
      display: block;
      width: 200px;
      height: 200px;
      border-radius: 6px;
      cursor: crosshair;
    }
    .compass {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 6px;
      font-size: 11px;
      letter-spacing: 1px;
    }
    .needle {
      flex: 1;
      text-align: center;
      color: #9fe0ff;
    }
    .dir {
      color: #5b7c99;
    }
    .meta {
      text-align: center;
      font-size: 11px;
      color: #ffd08a;
      margin-top: 2px;
      min-height: 14px;
    }
  `,
})
export class Minimap implements OnInit, OnDestroy {
  @ViewChild('map', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | null = null;
  private zones: ZoneDto[] = [];
  private agents: AgentDto[] = [];
  private player = { x: 0, z: 0, heading: 0 };
  private bounds = { ...WORLD };
  private readonly frame = (): void => this.draw();

  constructor(
    private readonly store: WorldStateStore,
    private readonly playerService: PlayerControllerService,
    private readonly waypoints: WaypointService,
    private readonly renderer: RendererService,
  ) {}

  ngOnInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.renderer.onFrame(this.frame);
  }

  ngOnDestroy(): void {
    this.renderer.offFrame(this.frame);
  }

  private update(): void {
    this.zones = this.store.zones();
    this.agents = this.store.agents();
    const p = this.playerService.position();
    this.player = { x: p.x, z: p.z, heading: this.playerService.heading() };
    if (this.zones.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const zone of this.zones) {
        minX = Math.min(minX, zone.center.x - zone.radius);
        maxX = Math.max(maxX, zone.center.x + zone.radius);
        minZ = Math.min(minZ, zone.center.z - zone.radius);
        maxZ = Math.max(maxZ, zone.center.z + zone.radius);
      }
      minX = Math.min(minX, this.player.x);
      maxX = Math.max(maxX, this.player.x);
      minZ = Math.min(minZ, this.player.z);
      maxZ = Math.max(maxZ, this.player.z);
      const pad = Math.max(maxX - minX, maxZ - minZ) * 0.06 + 10;
      this.bounds = {
        min: Math.min(minX - pad, -48),
        max: Math.max(maxX + pad, 48),
      };
    }
  }

  onClick(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    const { min, max } = this.bounds;
    const x = min + nx * (max - min);
    const z = max - ny * (max - min);
    this.waypoints.set(x, z, 'Waypoint');
  }

  compassLabel(): string {
    const h = (this.player.heading * 180) / Math.PI;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((h + 180) % 360) / 45) % 8;
    return dirs[idx];
  }

  waypointDistance(): string {
    const dist = this.waypoints.distanceTo(this.player.x, this.player.z);
    if (dist === null) return '';
    const bearing = this.waypoints.bearingTo(this.player.x, this.player.z, this.player.heading);
    return `WP ${dist.toFixed(0)}m · ${bearing?.toFixed(0) ?? 0}° ${bearing !== null && bearing < 0 ? 'L' : bearing !== null && bearing > 0 ? 'R' : ''}`;
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.update();
    const size = 180;
    const { min, max } = this.bounds;
    const scale = size / (max - min);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#0c1a26';
    ctx.fillRect(0, 0, size, size);

    // Draw zones with labels
    for (const zone of this.zones) {
      const cx = (zone.center.x - min) * scale;
      const cy = size - (zone.center.z - min) * scale;
      const r = zone.radius * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = this.zoneColor(zone.kind);
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(150,200,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw zone label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px ui-monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zone.name, cx, cy);
    }

    for (const agent of this.agents) {
      const ax = (agent.location.x - min) * scale;
      const ay = size - (agent.location.z - min) * scale;
      ctx.beginPath();
      ctx.arc(ax, ay, 3, 0, Math.PI * 2);
      ctx.fillStyle = this.agentColor(agent.status);
      ctx.fill();
    }

    const wp = this.waypoints.waypoint();
    if (wp) {
      const wx = (wp.x - min) * scale;
      const wy = size - (wp.z - min) * scale;
      ctx.fillStyle = '#ff4a4a';
      ctx.beginPath();
      ctx.moveTo(wx, wy - 7);
      ctx.lineTo(wx + 4, wy + 4);
      ctx.lineTo(wx - 4, wy + 4);
      ctx.closePath();
      ctx.fill();
    }

    const px = (this.player.x - min) * scale;
    const pz = size - (this.player.z - min) * scale;
    ctx.save();
    ctx.translate(px, pz);
    // World heading 0 = +z = "down" on the map (+y down canvas). The base
    // triangle points up (-y), so the rotation that points it along the
    // player's facing is (PI - heading).
    ctx.rotate(Math.PI - this.player.heading);

    ctx.fillStyle = 'rgba(255, 225, 74, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 14, -0.55, 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffe14a';
    ctx.strokeStyle = '#1c2b38';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 225, 74, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private zoneColor(kind: string): string {
    switch (kind) {
      case 'beach':
        return '#c9b978';
      case 'forest':
        return '#3f7d3f';
      case 'hq':
        return '#7f6fd0';
      case 'town':
        return '#b0624a';
      case 'road':
        return '#6a6a78';
      case 'water':
        return '#2f6f9f';
      default:
        return '#4a6a7a';
    }
  }

  private agentColor(status: string): string {
    switch (status) {
      case 'WORKING':
        return '#6fe08a';
      case 'NAVIGATING':
        return '#8fd0ff';
      case 'ASSIGNED':
        return '#ffe08a';
      case 'BLOCKED':
        return '#ff6f6f';
      case 'IDLE':
        return '#aab8c6';
      default:
        return '#aab8c6';
    }
  }
}
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api.service';
import { WorldStateStore } from '../../../core/world-state.store';

@Component({
  selector: 'app-plan-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './plan-panel.html',
  styleUrl: './plan-panel.scss',
})
export class PlanPanel {
  get plans() {
    return this.store.plans;
  }
  readonly title = signal('');
  readonly description = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly api: ApiService,
    private readonly store: WorldStateStore,
  ) {}

  async submit(): Promise<void> {
    const title = this.title().trim();
    if (!title || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.orchestrate({
        title,
        description: this.description().trim() || undefined,
      });
      this.title.set('');
      this.description.set('');
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }
}
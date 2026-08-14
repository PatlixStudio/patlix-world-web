import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  readonly email = signal('');
  readonly password = signal('');
  readonly displayName = signal('');
  readonly mode = signal<'login' | 'register'>('login');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly demoEmail = 'dev@patlix.studio';
  readonly demoPassword = 'patlixworld';

  readonly isLogin = computed(() => this.mode() === 'login');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  toggleMode(): void {
    this.mode.set(this.isLogin() ? 'register' : 'login');
    this.error.set(null);
  }

  fillDemo(): void {
    this.email.set(this.demoEmail);
    this.password.set(this.demoPassword);
    this.mode.set('login');
    this.error.set(null);
  }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.isLogin()) {
        await this.auth.login(this.email(), this.password());
      } else {
        await this.auth.register({
          email: this.email(),
          password: this.password(),
          displayName: this.displayName() || undefined,
        });
      }
      await this.router.navigate(['/world']);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
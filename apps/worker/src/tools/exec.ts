import { spawn } from 'node:child_process';

/** Ejecuta un comando y devuelve stdout; lanza error con stderr si falla. */
export function run(cmd: string, args: string[], opts: { signal?: AbortSignal } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { signal: opts.signal, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${cmd} ${args.join(' ')} → código ${code}: ${err.trim()}`)),
    );
  });
}

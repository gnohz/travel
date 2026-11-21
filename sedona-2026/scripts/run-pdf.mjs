import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const python = process.env.PYTHON ?? (existsSync('../.venv/bin/python3') ? '../.venv/bin/python3' : 'python3');
const result = spawnSync(python, ['scripts/generate_pdf.py'], { stdio: 'inherit' });
process.exit(result.status ?? 1);

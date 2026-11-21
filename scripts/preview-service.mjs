import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const label = 'com.jzhong.travel.preview';
const domain = `gui/${process.getuid()}`;
const plist = resolve(homedir(), 'Library/LaunchAgents', `${label}.plist`);
const state = resolve(root, '.local');
const action = process.argv[2] ?? 'status';
const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const launch = args => execFileSync('/bin/launchctl', args, { encoding: 'utf8' });
if (process.platform !== 'darwin') throw new Error('This local preview service uses macOS launchd. Use npm run preview on other platforms.');
if (action === 'install') {
  if (!existsSync(resolve(root, 'dist/sedona-2026/index.html'))) throw new Error('Run npm run build first.');
  if (existsSync(plist) && !readFileSync(plist, 'utf8').includes(xml(root))) throw new Error('A different checkout owns this preview service; leaving it unchanged.');
  mkdirSync(dirname(plist), { recursive: true }); mkdirSync(state, { recursive: true });
  try { launch(['bootout', `${domain}/${label}`]); } catch { /* first installation */ }
  writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(resolve(root, 'scripts/serve.mjs'))}</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>15</integer>
<key>StandardOutPath</key><string>${xml(resolve(state, 'preview.log'))}</string>
<key>StandardErrorPath</key><string>${xml(resolve(state, 'preview-error.log'))}</string>
</dict></plist>\n`);
  launch(['bootstrap', domain, plist]);
  console.log(`Installed ${label}: login startup and crash restart, localhost:4173 only.`);
} else if (action === 'uninstall') {
  if (existsSync(plist) && !readFileSync(plist, 'utf8').includes(xml(root))) throw new Error('This checkout does not own the service.');
  try { launch(['bootout', `${domain}/${label}`]); } catch { /* already stopped */ }
  if (existsSync(plist)) {
    if (!readFileSync(plist, 'utf8').includes(xml(root))) throw new Error('This checkout does not own the service.');
    unlinkSync(plist);
  }
  console.log('Travel preview service removed. Tailscale Serve configuration was not changed.');
} else if (action === 'status') {
  try { const status = launch(['print', `${domain}/${label}`]); console.log(status.split('\n').filter(line => /state =|pid =|last exit code/.test(line)).join('\n')); }
  catch { console.log('Travel preview service is not installed.'); process.exitCode = 1; }
} else { throw new Error('Usage: node scripts/preview-service.mjs install|status|uninstall'); }

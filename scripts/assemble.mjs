import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('sedona-2026/dist', 'dist/sedona-2026', { recursive: true });
await writeFile('dist/.nojekyll', '');
await writeFile('dist/index.html', `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f6f2"><title>Travel｜我们的旅行</title><style>*{box-sizing:border-box}body{margin:0;background:#f8f6f2;color:#292c28;font:16px/1.8 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}main{max-width:950px;margin:auto;padding:60px 24px}small{letter-spacing:.18em;color:#717469}h1{font:64px Georgia,serif;margin:20px 0}p{color:#717469}a{display:block;color:inherit;text-decoration:none;margin-top:40px}img{width:100%;height:330px;object-fit:cover;border-radius:5px}h2{font-weight:500}span{color:#a44c34}@media(max-width:600px){img{height:240px}h1{font-size:52px}}</style><main><small>PLACES WE GO, MEMORIES WE KEEP</small><h1>Our travels.</h1><p>一家人，一起去看看世界。</p><a href="./sedona-2026/"><img src="./sedona-2026/images/hero.jpg" alt="Sedona 红岩日落"><h2>Sedona 2026｜感恩节红岩之旅</h2><p>2026.11.22—11.26 · 两个家庭 · 五天四晚</p><span>打开旅行指南</span></a></main></html>`);
console.log('Travel site assembled: dist/');

import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
const dist=process.argv[2]; const html=fs.readFileSync(dist+'/index.html','utf8');
const entry=html.match(/src="\/(assets\/[^"]+\.js)"/)[1]; const seen=new Set();
const walk=f=>{ if(seen.has(f))return; seen.add(f); const c=fs.readFileSync(path.join(dist,f),'utf8');
 for(const m of c.matchAll(/(?:^|[;}\s])(?:import|export)[^'"()]*?from\s*["']\.\/([^"']+\.js)["']|import\s*["']\.\/([^"']+\.js)["']/g)) walk('assets/'+(m[1]||m[2])); };
walk(entry); let g=0; for(const f of seen){ g+=zlib.gzipSync(fs.readFileSync(path.join(dist,f)),{level:9}).length; }
console.log('chunks',seen.size,'gzip',g,'entry raw',fs.statSync(path.join(dist,entry)).size);

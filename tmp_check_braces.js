const fs = require('fs');
const path = 'src/lib/data.ts';
const s = fs.readFileSync(path, 'utf8');
const lines = s.split('\n');
let bal = 0;
let firstNeg = null;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') bal++;
    if (ch === '}') bal--;
  }
  if (bal < 0 && firstNeg === null) firstNeg = i + 1;
}
console.log('FINAL_BAL:', bal);
console.log('FIRST_NEG_LINE:', firstNeg);
// print selected ranges where bal changes (start and loans region)
let running = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') running++;
    if (ch === '}') running--;
  }
  if(i<140 || (i>600 && i<760)) {
    console.log((i+1)+': bal='+running+' | '+line);
  }
}
for(let i=760;i<lines.length;i++){
  const line = lines[i];
  for(const ch of line){ if(ch==='{' ) running++; if(ch==='}') running--; }
  console.log((i+1)+': bal='+running+' | '+line);
}

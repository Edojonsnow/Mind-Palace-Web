import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
const blocks = [...css.matchAll(/(?:\:root, \[data-theme="dark"\]|\[data-theme="light"\])\s*\{([^}]+)\}/g)].map(m => Object.fromEntries([...m[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(x => [x[1],x[2].trim()])));
function rgb(value) {
  if (value.startsWith('#')) return value.slice(1).match(/../g).map(x=>parseInt(x,16)/255);
  const nums = value.match(/[\d.]+/g).map(Number);
  return nums.map((v,i)=>i<3?v/255:v);
}
function composite(value,bg) { const c=rgb(value); return c.length===4 ? c.slice(0,3).map((n,i)=>n*c[3]+bg[i]*(1-c[3])) : c; }
function luminance(c) { return c.map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0); }
function ratio(a,b) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
let failed=false;
for(const [i,t] of blocks.entries()) {
  const surfaces=['bg','bg-raised','surface','surface-2','surface-3'];
  const checks=[];
  for(const bg of surfaces) for(const fg of ['text','text-2','text-3','lumen-text','echo','vault','danger']) checks.push([fg,bg,4.5]);
  checks.push(['on-lumen','lumen',4.5],['on-echo','echo',4.5]);
  checks.push(['control-line','surface-2',3]);
  for(const [fg,bg,min] of checks) {
    const background=rgb(t[`--mp-${bg}`]);
    const r=ratio(composite(t[`--mp-${fg}`],background),background);
    if(r<min) { console.error(`${i===0?'dark':'light'}: ${fg}/${bg} ${r.toFixed(2)} < ${min}`);failed=true; }
  }
  for(const accent of ['lumen','echo']) {
    for(const hex of t[`--mp-${accent}-grad`].match(/#[\da-f]{6}/gi)) {
      const r=ratio(rgb(t[`--mp-on-${accent}`]),rgb(hex));
      if(r<4.5) { console.error(`${i===0?'dark':'light'} ${accent} gradient stop ${hex}: ${r.toFixed(2)}`);failed=true; }
    }
  }
}
if(failed) process.exit(1);
console.log('WCAG AA text and gradient-stop contrast passed in both themes.');

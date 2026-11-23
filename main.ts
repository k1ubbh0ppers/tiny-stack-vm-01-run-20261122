import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p: Uint8Array, input: Uint8Array): [Uint8Array, number] {
  const d = new Int32Array(256), c = new Int32Array(64), m = new Int32Array(256), o = new Uint8Array(65536);
  let sp = 0, cp = 0, ip = 0, pc = 0, nout = 0, steps = 0;
  const end = (x: number): [Uint8Array, number] => [o.slice(0, nout), x];
  for (;;) {
    if (steps === 1e6) return end(10);
    if (pc < 0 || pc >= p.length) return end(9);
    const op = p[pc], imm = op === 1 ? 1 : op === 2 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
    if (![0,1,2,3,4,5,6,7,0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x1a,0x1b,0x1c,0x1d,0x1e,0x20,0x21,0x22,0x30,0x31,0x32,0x33,0x34,0x40,0x41,0x50,0x51,0x52,0x53].includes(op)) return end(5);
    if (pc + imm >= p.length) return end(9);
    const pop = op === 3 || op === 0x17 || op === 0x1b || op === 0x31 || op === 0x32 || op === 0x40 || op === 0x50 || op === 0x51 || op === 0x53 ? 1 : op === 5 || op === 6 || op === 0x41 || (op >= 0x10 && op <= 0x22 && op !== 0x17 && op !== 0x1b) ? 2 : op === 7 ? 3 : 0;
    const push = op === 4 ? 2 : op === 6 ? 3 : op === 7 || op === 5 ? (op===7?3:2) : op === 1 || op === 2 || op === 0x52 || op === 0x17 || op === 0x1b || op === 0x40 || op === 0x50 || op === 0x51 || op === 0x53 || op >= 0x10 && op <= 0x22 ? 1 : 0;
    steps++;
    if (sp < pop) return end(2);
    if (sp - pop + push > 256) return end(3);
    let nx = pc + imm + 1; pc = nx;
    if (op === 0) return end(0);
    if (op === 1) d[sp++] = (p[pc - 1] << 24) >> 24;
    else if (op === 2) { d[sp++] = p[pc-4] | p[pc-3]<<8 | p[pc-2]<<16 | p[pc-1]<<24; }
    else if (op === 3) sp--;
    else if (op === 4) { d[sp] = d[sp-1]; sp++; }
    else if (op === 5) { const t=d[sp-1]; d[sp-1]=d[sp-2]; d[sp-2]=t; }
    else if (op === 6) { d[sp]=d[sp-2]; sp++; }
    else if (op === 7) { const t=d[sp-3]; d[sp-3]=d[sp-2]; d[sp-2]=d[sp-1]; d[sp-1]=t; }
    else if (op === 0x17) d[sp-1] = -d[sp-1] | 0;
    else if (op === 0x1b) d[sp-1] = ~d[sp-1];
    else if (op >= 0x10 && op <= 0x22) {
      const b=d[sp-1], a=d[sp-2]; let r=0;
      if(op===0x10)r=a+b|0; else if(op===0x11)r=a-b|0; else if(op===0x12)r=Math.imul(a,b);
      else if(op>=0x13&&op<=0x16){if(!b)return end(4); if(op===0x13)r=a===-2147483648&&b===-1?a:Math.trunc(a/b)|0; else if(op===0x14)r=b===-1?0:a%b|0; else if(op===0x15)r=Math.floor((a>>>0)/(b>>>0))|0; else r=(a>>>0)%(b>>>0)|0;}
      else if(op===0x18)r=a&b; else if(op===0x19)r=a|b; else if(op===0x1a)r=a^b; else if(op===0x1c)r=a<<(b&31); else if(op===0x1d)r=a>>(b&31); else if(op===0x1e)r=a>>>(b&31);
      else if(op===0x20)r=+(a===b); else if(op===0x21)r=+(a<b); else if(op===0x22)r=+((a>>>0)<(b>>>0));
      sp-=2; d[sp++]=r;
    } else if(op>=0x30&&op<=0x32) { const rel=(p[pc-2]|p[pc-1]<<8)<<16>>16; const v=op===0x30?0:d[--sp]; if(op===0x30||op===0x31&&v===0||op===0x32&&v!==0)pc=nx+rel; }
    else if(op===0x33){if(cp===64)return end(7); c[cp++]=nx; pc=p[pc-2]|p[pc-1]<<8;}
    else if(op===0x34){if(!cp)return end(8);pc=c[--cp];}
    else if(op===0x40){const a=d[sp-1];if(a<0||a>=256)return end(6);d[sp-1]=m[a];}
    else if(op===0x41){const a=d[sp-1];if(a<0||a>=256)return end(6);m[a]=d[sp-2];sp-=2;}
    else if(op===0x50){const s=String(d[sp-1]), b=Buffer.from(s);if(nout+b.length>65536)return end(11);o.set(b,nout);nout+=b.length;sp--;}
    else if(op===0x51){if(nout===65536)return end(11);o[nout++]=d[--sp]&255;}
    else if(op===0x52)d[sp++]=ip<input.length?input[ip++]:-1;
    else if(op===0x53)return end(d[--sp]&255);
  }
}

const I=process.env.MAKEFUN_INPUT_DIR??'/input', O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
  const [out,code]=run(new Uint8Array(readFileSync(join(I,id,'program.bin'))),new Uint8Array(readFileSync(join(I,id,'input.bin'))));
  mkdirSync(join(O,id),{recursive:true}); writeFileSync(join(O,id,'stdout.bin'),out); writeFileSync(join(O,id,'exit.txt'),code+'\n');
}

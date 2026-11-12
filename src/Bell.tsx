// Bell mascot SVG. Inputs are numbers only (no user text), so the string is safe to inject.
import { MAX_STRENGTH as MAX } from './strength';

type Mood = 'weak' | 'ok' | 'big' | 'huge';
let UID = 0;
const BL = '#3b9bff', BD = '#1457c9', OUT = '#0b2f73';

export function bellSvg(s: number): string {
  s=Math.max(0,Math.min(MAX,s));const id='g'+(UID++);
  const mood: Mood =s<=0?'weak':s<=2?'ok':s<=3?'big':'huge';
  const k=0.86+s*0.075, cx=100, by=150, bw=46*k, bh=44*k, cy=by-bh;
  const arm=5+s*2.55, L=20+s*3.6, ay=cy+8*k, lx=cx-bw+3, rx=cx+bw-3;
  const A=(d: string,w=arm)=>`<path d="${d}" stroke="${OUT}" stroke-width="${w+5}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="url(#${id}a)" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const eyeY=cy-6*k, dx=15*k, er=(mood==='weak'?5:6.5)*k;
  let eyes=`<g class="eye"><circle cx="${cx-dx}" cy="${eyeY}" r="${er}" fill="#fff"/><circle cx="${cx+dx}" cy="${eyeY}" r="${er}" fill="#fff"/><circle cx="${cx-dx}" cy="${eyeY+1}" r="${er*.5}" fill="#111"/><circle cx="${cx+dx}" cy="${eyeY+1}" r="${er*.5}" fill="#111"/></g>`;
  if(mood==='weak')eyes+=`<path d="M${cx-dx-er} ${eyeY-er*.3} h${er*2} M${cx+dx-er} ${eyeY-er*.3} h${er*2}" stroke="${OUT}" stroke-width="${er*.9}" stroke-linecap="round"/>`;
  const shades=(mood==='big'||mood==='huge')?`<g><rect x="${cx-dx-11}" y="${eyeY-7}" width="22" height="14" rx="5" fill="#0a0a0a"/><rect x="${cx+dx-11}" y="${eyeY-7}" width="22" height="14" rx="5" fill="#0a0a0a"/><rect x="${cx-dx+8}" y="${eyeY-4}" width="${2*dx-16}" height="3" fill="#0a0a0a"/><path d="M${cx-dx-7} ${eyeY-3} l6 0 M${cx+dx-7} ${eyeY-3} l6 0" stroke="#7fd0ff" stroke-width="2.5" stroke-linecap="round"/></g>`:'';
  if(mood==='big'||mood==='huge')eyes='';
  const band=(mood!=='weak')?`<path d="M${cx-bw+2} ${cy-bh*.5} Q${cx} ${cy-bh*.75} ${cx+bw-2} ${cy-bh*.5} l0 8 Q${cx} ${cy-bh*.75+8} ${cx-bw+2} ${cy-bh*.5+8}z" fill="#ff3b30" stroke="${OUT}" stroke-width="2"/>`:'';
  const tails=(mood!=='weak')?`<path class="tail" d="M${cx+bw-2} ${cy-bh*.5+4} l${mood==='huge'?30:18} -4 l-4 8 l${mood==='huge'?-26:-14} 6z" fill="#ff3b30" stroke="${OUT}" stroke-width="2"/>`:'';
  const mouth=mood==='weak'?`<path d="M${cx-9} ${cy+20*k} q9 -8 18 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`
   :mood==='ok'?`<path d="M${cx-10} ${cy+14*k} q10 10 20 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`
   :`<path d="M${cx-13} ${cy+13*k} q13 14 26 0 q-13 -5 -26 0z" fill="#fff" stroke="${OUT}" stroke-width="2"/><path d="M${cx+12} ${cy+13*k} l5 -4" stroke="${OUT}" stroke-width="2.5" stroke-linecap="round"/>`;
  let arms='';
  if(mood==='weak')arms=A(`M${lx} ${ay} q-10 16 -4 ${L}`)+A(`M${rx} ${ay} q10 16 4 ${L}`);
  else if(mood==='ok')arms=A(`M${lx} ${ay} q-16 4 -18 -${L*.55}`)+A(`M${rx} ${ay} q16 4 18 -${L*.55}`)+`<circle cx="${lx-18}" cy="${ay-L*.55}" r="${arm*.8}" fill="${BD}" stroke="${OUT}" stroke-width="2.5"/><circle cx="${rx+18}" cy="${ay-L*.55}" r="${arm*.8}" fill="${BD}" stroke="${OUT}" stroke-width="2.5"/>`;
  else if(mood==='big')arms=A(`M${lx} ${ay} q-28 4 -22 -${L}`)+A(`M${rx} ${ay} q28 4 22 -${L}`)+`<circle cx="${lx-22}" cy="${ay-L}" r="${arm*.95}" fill="${BD}" stroke="${OUT}" stroke-width="2.5"/><circle cx="${rx+22}" cy="${ay-L}" r="${arm*.95}" fill="${BD}" stroke="${OUT}" stroke-width="2.5"/><ellipse cx="${lx-24}" cy="${ay-L*.35}" rx="${arm*.8}" ry="${arm*.55}" fill="#fff" opacity=".25"/><ellipse cx="${rx+24}" cy="${ay-L*.35}" rx="${arm*.8}" ry="${arm*.55}" fill="#fff" opacity=".25"/>`;
  else{const top=cy-bh-30;
    arms=A(`M${lx} ${ay} q-32 -8 -18 -${L+34}`)+A(`M${rx} ${ay} q32 -8 18 -${L+34}`)+
    `<rect x="${lx-34}" y="${top-2}" width="${rx-lx+68}" height="7" rx="3.5" fill="#666" stroke="${OUT}" stroke-width="2"/>
     <rect x="${lx-40}" y="${top-17}" width="10" height="36" rx="4" fill="#1a1a1a" stroke="#000" stroke-width="1.5"/><rect x="${lx-51}" y="${top-12}" width="10" height="26" rx="4" fill="#3a3a3a" stroke="#000" stroke-width="1.5"/>
     <rect x="${rx+30}" y="${top-17}" width="10" height="36" rx="4" fill="#1a1a1a" stroke="#000" stroke-width="1.5"/><rect x="${rx+41}" y="${top-12}" width="10" height="26" rx="4" fill="#3a3a3a" stroke="#000" stroke-width="1.5"/>`;}
  const aura=mood==='huge'?`<circle class="aura" cx="${cx}" cy="${cy}" r="${bw+34}" fill="url(#${id}r)"/>`:mood==='big'?`<circle class="aura" cx="${cx}" cy="${cy}" r="${bw+22}" fill="url(#${id}r)" opacity=".5"/>`:'';
  const bolts=(mood==='big'||mood==='huge')?[[22,60],[178,70],[30,120],[172,126]].slice(0,mood==='huge'?4:2).map((p: number[],i: number)=>`<path class="bolt" style="animation-delay:${i*.28}s" d="M${p[0]} ${p[1]-10} l-6 10 h5 l-3 10 l9 -13 h-5 l4 -7z" fill="#ffd60a" stroke="#c89400" stroke-width=".8"/>`).join(''):'';
  const cape=mood==='huge'?`<path d="M${cx-bw+8} ${cy-bh+18} q-34 40 -24 ${bh*1.7} l34 -6z M${cx+bw-8} ${cy-bh+18} q34 40 24 ${bh*1.7} l-34 -6z" fill="#ff3b30" stroke="${OUT}" stroke-width="2.5"/>`:'';
  const sweat=mood==='weak'?`<path class="drip" d="M${cx+bw*.72} ${cy-bh*.45} q5 9 0 12 q-5 -3 0 -12z" fill="#9bd4ff"/>`:'';
  const legs=`<rect x="${cx-bw*.5-8}" y="${by-4}" width="16" height="15" rx="7" fill="${BD}" stroke="${OUT}" stroke-width="2.5"/><rect x="${cx+bw*.5-8}" y="${by-4}" width="16" height="15" rx="7" fill="${BD}" stroke="${OUT}" stroke-width="2.5"/>`;
  const pecs=s>=3?`<path d="M${cx} ${cy+10*k} v${14*k}" stroke="${OUT}" stroke-width="2" opacity=".35"/>`:'';
  return `<svg viewBox="0 0 200 190" class="m-${mood}" aria-hidden="true">
  <defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BL}"/><stop offset="1" stop-color="${BD}"/></linearGradient>
  <radialGradient id="${id}b" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#8fd0ff"/><stop offset=".5" stop-color="${BL}"/><stop offset="1" stop-color="${BD}"/></radialGradient>
  <radialGradient id="${id}r"><stop offset=".4" stop-color="#7fd0ff" stop-opacity=".7"/><stop offset="1" stop-color="#7fd0ff" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="${cx}" cy="${by+14}" rx="${bw*.9}" ry="5" fill="#000" opacity=".12"/>
  ${aura}${bolts}${cape}
  <g class="body">${legs}${arms}
  <ellipse cx="${cx}" cy="${cy}" rx="${bw}" ry="${bh}" fill="url(#${id}b)" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="${cx-bw*.45}" cy="${cy-bh*.62}" rx="${7*k}" ry="${10*k}" fill="#fff" opacity=".35" transform="rotate(30 ${cx-bw*.45} ${cy-bh*.62})"/>
  ${pecs}${band}${tails}${eyes}${shades}${mouth}${sweat}</g></svg>`;
}

const NAMES = ['Sleepy', 'Warming up', 'Warming up', 'Strong', 'Beast'];

export default function Bell({ value }: { value: number }) {
  const s = Math.max(0, Math.min(MAX, value));
  return (
    <div className="mascot" aria-label={`Bell: ${NAMES[s]}, strength ${s} of ${MAX}`} role="img">
      <div className="mascot-art" dangerouslySetInnerHTML={{ __html: bellSvg(s) }} />
      <div className="mascot-bar" aria-hidden>{Array.from({ length: MAX }, (_, i) => <i key={i} className={i < s ? 'on' : ''} />)}</div>
    </div>
  );
}

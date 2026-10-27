'use strict';
import { $, STAGES, esc } from './util.js';
import { state } from './store.js';

/* ================= Cat drawing (SVG) ================= */
export const C = { fur: '#FFCBA4', furD: '#F2A077', cream: '#FFF5EA', pink: '#FFA3BA', ink: '#5B4651', blush: '#FF96B0' };

export function star(x, y, s, cls = 'sparkle', delay = 0, fill = '#FFD66B') {
  return `<path class="${cls}" style="animation-delay:${delay}s" d="M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z" fill="${fill}"/>`;
}
export function eyes(cx, cy, r, mood) {
  const ey = cy + r * .02, xs = [cx - r * .38, cx + r * .38];
  const line = d => `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="3.4" stroke-linecap="round"/>`;
  if (mood === 'happy') return xs.map(x => line(`M${x - r * .13} ${ey + r * .05} Q${x} ${ey - r * .16} ${x + r * .13} ${ey + r * .05}`)).join('');
  if (mood === 'sleep' || mood === 'sad') {
    let s = xs.map(x => line(`M${x - r * .13} ${ey} Q${x} ${ey + r * .12} ${x + r * .13} ${ey}`)).join('');
    if (mood === 'sad') {
      s += line(`M${xs[0] - r * .14} ${ey - r * .2} L${xs[0] + r * .1} ${ey - r * .3}`) + line(`M${xs[1] + r * .14} ${ey - r * .2} L${xs[1] - r * .1} ${ey - r * .3}`);
      s += `<path d="M${xs[1] + r * .05} ${ey + r * .12} q-${r * .07} ${r * .14} 0 ${r * .2} q${r * .07} -${r * .06} 0 -${r * .2}Z" fill="#8FD3FF" stroke="#5BB5E8" stroke-width="1.2"/>`;
    }
    return s;
  }
  return `<g class="blink">${xs.map(x => `<ellipse cx="${x}" cy="${ey}" rx="${r * .12}" ry="${r * .16}" fill="${C.ink}"/><circle cx="${x + r * .045}" cy="${ey - r * .065}" r="${r * .05}" fill="#fff"/>`).join('')}</g>`;
}
export function mouth(cx, cy, r, mood) {
  const st = `fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`;
  if (mood === 'happy') return `<path d="M${cx - r * .15} ${cy + r * .31} Q${cx} ${cy + r * .56} ${cx + r * .15} ${cy + r * .31}Z" fill="#F07896" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
  if (mood === 'sad') return `<path d="M${cx - r * .11} ${cy + r * .4} Q${cx} ${cy + r * .31} ${cx + r * .11} ${cy + r * .4}" ${st}/>`;
  return `<path d="M${cx - r * .17} ${cy + r * .3} Q${cx - r * .085} ${cy + r * .41} ${cx} ${cy + r * .3} Q${cx + r * .085} ${cy + r * .41} ${cx + r * .17} ${cy + r * .3}" ${st}/>`;
}
export function face(cx, cy, r, mood, opt = {}) {
  const o = `stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"`;
  const ear = sgn => `<path d="M${cx + sgn * r * .92} ${cy - r * .2} L${cx + sgn * r * .74} ${cy - r * 1.2} L${cx + sgn * r * .18} ${cy - r * .84}Z" fill="${C.fur}" ${o}/>` +
    `<path d="M${cx + sgn * r * .76} ${cy - r * .42} L${cx + sgn * r * .68} ${cy - r * .98} L${cx + sgn * r * .36} ${cy - r * .8}Z" fill="${C.pink}" stroke="${C.pink}" stroke-width="3" stroke-linejoin="round"/>`;
  const tuft = sgn => `<path d="M${cx + sgn * r * .98} ${cy - r * .08} L${cx + sgn * r * 1.3} ${cy + r * .1} L${cx + sgn * r * 1.05} ${cy + r * .22} L${cx + sgn * r * 1.26} ${cy + r * .42} L${cx + sgn * r * .9} ${cy + r * .5}Z" fill="${C.fur}" ${o}/>`;
  let s = ear(-1) + ear(1);
  if (opt.fluff) s += tuft(-1) + tuft(1);
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.08}" ry="${r * .95}" fill="${C.fur}" ${o}/>`;
  const sp = `stroke="${C.furD}" stroke-width="${Math.max(3, r * .09)}" stroke-linecap="round"`;
  s += `<path d="M${cx} ${cy - r * .9} L${cx} ${cy - r * .66}" ${sp}/><path d="M${cx - r * .24} ${cy - r * .86} L${cx - r * .19} ${cy - r * .68}" ${sp}/><path d="M${cx + r * .24} ${cy - r * .86} L${cx + r * .19} ${cy - r * .68}" ${sp}/>`;
  s += `<ellipse cx="${cx}" cy="${cy + r * .34}" rx="${r * .4}" ry="${r * .26}" fill="${C.cream}"/>`;
  s += `<ellipse cx="${cx - r * .64}" cy="${cy + r * .28}" rx="${r * .17}" ry="${r * .1}" fill="${C.blush}" opacity=".6"/><ellipse cx="${cx + r * .64}" cy="${cy + r * .28}" rx="${r * .17}" ry="${r * .1}" fill="${C.blush}" opacity=".6"/>`;
  s += eyes(cx, cy, r, mood);
  s += `<path d="M${cx - r * .07} ${cy + r * .18} L${cx + r * .07} ${cy + r * .18} L${cx} ${cy + r * .25}Z" fill="${C.pink}" stroke="${C.pink}" stroke-width="2.5" stroke-linejoin="round"/>`;
  s += mouth(cx, cy, r, mood);
  const w = `stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round" opacity=".45"`;
  [-1, 1].forEach(g => {
    s += `<path d="M${cx + g * r * .56} ${cy + r * .3} L${cx + g * r * 1.08} ${cy + r * .22}" ${w}/><path d="M${cx + g * r * .56} ${cy + r * .39} L${cx + g * r * 1.04} ${cy + r * .46}" ${w}/>`;
  });
  return s;
}
export function crown(x, y, r, size) {
  const w = r * (size === 2 ? 1.08 : .86), h = r * (size === 2 ? .66 : .5);
  let s = `<g transform="rotate(-8 ${x} ${y})">`;
  s += `<path d="M${x - w / 2} ${y} L${x - w / 2} ${y - h * .62} L${x - w / 4} ${y - h * .28} L${x} ${y - h} L${x + w / 4} ${y - h * .28} L${x + w / 2} ${y - h * .62} L${x + w / 2} ${y}Z" fill="#FFD66B" stroke="#C99231" stroke-width="2.6" stroke-linejoin="round"/>`;
  s += `<circle cx="${x - w / 2}" cy="${y - h * .66}" r="${r * .07}" fill="#FF8FB0"/><circle cx="${x}" cy="${y - h * 1.04}" r="${r * .08}" fill="#8ED0FF"/><circle cx="${x + w / 2}" cy="${y - h * .66}" r="${r * .07}" fill="#FF8FB0"/>`;
  s += `<circle cx="${x}" cy="${y - h * .2}" r="${r * .08}" fill="#B6A6F6"/>`;
  if (size === 2) s += `<circle cx="${x - w / 4}" cy="${y - h * .14}" r="${r * .05}" fill="#8EDDBE"/><circle cx="${x + w / 4}" cy="${y - h * .14}" r="${r * .05}" fill="#8EDDBE"/>`;
  return s + '</g>';
}
export function standingCat(p, mood) {
  const cx = 100, G = 185, r = p.head, bx = p.bx, by = p.by;
  const bcy = G - by, hcy = bcy - by * .7 - r * .55;
  const o = `stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"`;
  let s = `<g transform="translate(100 ${G}) scale(${p.s}) translate(-100 -${G})">`;
  s += `<ellipse cx="${cx}" cy="${G + 3}" rx="${bx * 1.35}" ry="6" fill="#000" opacity=".07"/>`;
  if (p.cape) {
    s += `<path d="M${cx - bx * .75} ${bcy - by * .55} Q${cx - bx * 1.6} ${G - 6} ${cx - bx * 1.32} ${G} L${cx + bx * 1.32} ${G} Q${cx + bx * 1.6} ${G - 6} ${cx + bx * .75} ${bcy - by * .55}Z" fill="#C3B1FF" ${o}/>`;
    s += `<path d="M${cx - bx * 1.3} ${G - 2} L${cx + bx * 1.3} ${G - 2}" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`;
    for (let i = -2; i <= 2; i++) s += `<circle cx="${cx + i * bx * .5}" cy="${G - 2}" r="1.8" fill="${C.ink}"/>`;
  }
  const tx = cx + bx * .72, ty = G - 8;
  const td = `M${tx} ${ty} C${tx + 38} ${ty + 4} ${tx + 52} ${ty - 34} ${tx + 30} ${ty - 62}`;
  const tw = p.fluff ? 16 : 12;
  s += `<g class="tail${mood === 'sleep' || mood === 'sad' ? ' slow' : ''}"><path d="${td}" fill="none" stroke="${C.ink}" stroke-width="${tw + 6}" stroke-linecap="round"/><path d="${td}" fill="none" stroke="${C.fur}" stroke-width="${tw}" stroke-linecap="round"/><path d="M${tx + 38} ${ty - 46} L${tx + 30} ${ty - 62}" stroke="${C.furD}" stroke-width="${tw}" stroke-linecap="round"/></g>`;
  s += `<g class="breathe"><ellipse cx="${cx}" cy="${bcy}" rx="${bx}" ry="${by}" fill="${C.fur}" ${o}/>`;
  s += `<ellipse cx="${cx}" cy="${bcy + by * .16}" rx="${bx * .55}" ry="${by * .66}" fill="${C.cream}"/>`;
  const sp = `stroke="${C.furD}" stroke-width="4" stroke-linecap="round" fill="none"`;
  [-1, 1].forEach(g => {
    s += `<path d="M${cx + g * bx * .97} ${bcy - by * .12} q${-g * bx * .2} ${by * .02} ${-g * bx * .26} ${by * .14}" ${sp}/><path d="M${cx + g * bx * .99} ${bcy + by * .14} q${-g * bx * .2} ${by * .02} ${-g * bx * .26} ${by * .14}" ${sp}/>`;
  });
  s += '</g>';
  [-1, 1].forEach(g => {
    const px = cx + g * bx * .36;
    s += `<ellipse cx="${px}" cy="${G - 7}" rx="${bx * .26}" ry="8.5" fill="${C.fur}" ${o}/><path d="M${px - 3} ${G - 4} L${px - 3} ${G - 8} M${px + 3} ${G - 4} L${px + 3} ${G - 8}" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>`;
  });
  if (p.yarn) {
    const yx = cx - bx - 30, yy = G - 15;
    s += `<path d="M${yx + 12} ${yy + 9} Q${yx + 26} ${yy + 20} ${cx - bx * .4} ${G - 3}" fill="none" stroke="#B9A8F7" stroke-width="2.5" stroke-linecap="round"/>`;
    s += `<g class="yarn"><circle cx="${yx}" cy="${yy}" r="15" fill="#C9BCFA" ${o}/><path d="M${yx - 10} ${yy - 6} Q${yx} ${yy - 14} ${yx + 10} ${yy - 6} M${yx - 13} ${yy + 2} Q${yx} ${yy - 6} ${yx + 13} ${yy + 2} M${yx - 9} ${yy + 9} Q${yx} ${yy + 2} ${yx + 9} ${yy + 9}" fill="none" stroke="#8F7BE3" stroke-width="2" stroke-linecap="round"/></g>`;
  }
  if (p.collar) {
    const y = hcy + r * .92;
    s += `<path d="M${cx - r * .55} ${y - 4} Q${cx} ${y + 10} ${cx + r * .55} ${y - 4}" stroke="#FF8FAB" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="${cx}" cy="${y + 8}" r="6.5" fill="#FFD66B" stroke="${C.ink}" stroke-width="2"/><path d="M${cx - 3} ${y + 9.5} L${cx + 3} ${y + 9.5}" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  if (p.fluff) {
    for (let i = -3; i <= 3; i++) s += `<circle cx="${cx + i * r * .24}" cy="${hcy + r * .86 + Math.abs(i) * -r * .05}" r="${r * .21}" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.4"/>`;
  }
  s += `<g class="headbob">${face(cx, hcy, r, mood, { fluff: p.fluff })}`;
  if (p.crown) s += crown(cx + r * .05, hcy - r * .82, r, p.crown);
  s += '</g></g>';
  if (p.sparkles) {
    s += star(26, 56, 9, 'sparkle', 0) + star(176, 48, 11, 'sparkle', .5) + star(170, 128, 7, 'sparkle', 1.1) + star(32, 132, 7, 'sparkle', .8) + star(100, 12, 6, 'sparkle', 1.4, '#FFB3C6') + star(150, 18, 5, 'sparkle', .3, '#B6A6F6');
  } else if (mood === 'happy') {
    s += star(40, 70, 7, 'sparkle', 0) + star(165, 66, 8, 'sparkle', .6) + star(150, 120, 5, 'sparkle', 1.2, '#FFB3C6');
  }
  return s;
}
export function basketCat(mood) {
  const o = `stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"`;
  let s = `<ellipse cx="100" cy="189" rx="70" ry="6" fill="#000" opacity=".07"/>`;
  s += `<ellipse cx="100" cy="138" rx="64" ry="15" fill="#D6955F" ${o}/><ellipse cx="100" cy="139" rx="56" ry="10" fill="#A8704A"/>`;
  s += `<ellipse cx="100" cy="138" rx="50" ry="7" fill="#B9A8F7" opacity=".8"/>`;
  s += `<g class="breathe"><ellipse cx="112" cy="129" rx="40" ry="21" fill="${C.fur}" ${o}/>`;
  s += `<path d="M110 112 q4 6 2 14 M124 112 q4 6 2 14" stroke="${C.furD}" stroke-width="4" stroke-linecap="round" fill="none"/></g>`;
  s += `<g class="headbob">${face(76, 121, 24, mood === 'sad' ? 'sad' : 'sleep')}</g>`;
  s += `<path d="M36 138 Q38 186 72 186 L128 186 Q162 186 164 138 Q100 158 36 138Z" fill="#E7AD76" ${o}/>`;
  const wv = `fill="none" stroke="#C98B57" stroke-width="2.5" stroke-linecap="round"`;
  s += `<path d="M44 158 Q100 174 156 158" ${wv}/><path d="M54 174 Q100 186 146 174" ${wv}/>`;
  for (let x = 58; x <= 142; x += 14) s += `<path d="M${x} ${150 + Math.abs(100 - x) * -.05} L${x + (x - 100) * .08} ${182}" ${wv} opacity=".7"/>`;
  const td = 'M146 132 Q172 140 160 166';
  s += `<g class="tail slow"><path d="${td}" fill="none" stroke="${C.ink}" stroke-width="15" stroke-linecap="round"/><path d="${td}" fill="none" stroke="${C.fur}" stroke-width="9" stroke-linecap="round"/></g>`;
  if (mood === 'sad') {
    s += `<g opacity=".9"><circle cx="128" cy="58" r="12" fill="#CFC8DD"/><circle cx="146" cy="52" r="15" fill="#CFC8DD"/><circle cx="162" cy="60" r="11" fill="#CFC8DD"/><rect x="118" y="58" width="54" height="12" rx="6" fill="#CFC8DD"/></g>`;
    s += `<path class="drop" d="M132 76 l0 6" stroke="#8FD3FF" stroke-width="3" stroke-linecap="round"/><path class="drop b" d="M146 76 l0 6" stroke="#8FD3FF" stroke-width="3" stroke-linecap="round"/><path class="drop c" d="M160 76 l0 6" stroke="#8FD3FF" stroke-width="3" stroke-linecap="round"/>`;
  } else {
    const z = `fill="${C.ink}" font-family="Fredoka, sans-serif" font-weight="600" opacity=".75"`;
    s += `<text class="zz" x="104" y="96" font-size="15" ${z}>z</text><text class="zz b" x="116" y="82" font-size="19" ${z}>z</text><text class="zz c" x="130" y="66" font-size="23" ${z}>Z</text>`;
  }
  return s;
}
export function catSVG(stage, mood) {
  const inner = stage === 0 ? basketCat(mood) : standingCat(STAGES[stage], mood);
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(state.catName)} the cat, ${STAGES[stage].name}">${inner}</svg>`;
}

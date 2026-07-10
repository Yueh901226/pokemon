import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('pikachu_html.html', 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

const h3s = Array.from(doc.querySelectorAll('h3'));
const obtainH3 = h3s.find(h => h.textContent.includes('获得方式') || h.textContent.includes('獲得方式'));

if (obtainH3) {
  let node = obtainH3.nextElementSibling;
  while(node && node.tagName !== 'TABLE' && node.tagName !== 'H3' && node.tagName !== 'H2') {
    node = node.nextElementSibling;
  }
  if(node && node.tagName === 'TABLE') {
    // Attempt to extract generation tabs or rows
    const rows = node.querySelectorAll('tr');
    rows.forEach((tr, i) => {
      const ths = Array.from(tr.querySelectorAll('th')).map(th => th.textContent.trim()).filter(Boolean);
      const tds = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()).filter(Boolean);
      console.log(`Row ${i}: TH=[${ths.join(' | ')}] TD=[${tds.join(' | ')}]`);
    });
  } else {
    console.log('Table not found');
  }
} else {
  console.log('H3 not found');
}

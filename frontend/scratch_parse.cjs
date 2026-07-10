const fs = require('fs');
const html = fs.readFileSync('pikachu_html.html', 'utf8');
const match = html.match(/id="[^"]*(?:获得方式|獲得方式)[^"]*"[^>]*>.*?<\/h[23]>(.*?)<\/table>/s);
if (match) {
  console.log(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 500));
} else {
  console.log('not found');
}

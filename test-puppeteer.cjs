const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('.m3u8') || request.method() === 'POST' || url.includes('enc-dec.app')) {
        console.log('Request:', request.method(), url);
    }
  });

  await page.goto('https://vidcore.io/movie/550', { waitUntil: 'networkidle2' });
  await browser.close();
})();

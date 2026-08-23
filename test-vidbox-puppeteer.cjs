const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://vidbox.cx/film/maxb4j-the-shawshank-redemption-1994', { waitUntil: 'networkidle2' });
  
  const buttons = await page.$$('.vb-srv');
  console.log(`Found ${buttons.length} server buttons.`);
  
  for (let i = 0; i < buttons.length; i++) {
      const text = await page.evaluate(el => el.textContent, buttons[i]);
      const dataUrl = await page.evaluate(el => el.getAttribute('data-url'), buttons[i]);
      console.log(`Button: ${text.trim()}, data-url: ${dataUrl}`);
  }

  await browser.close();
})();

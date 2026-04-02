import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Render HTML to a PDF buffer using headless Chromium.
 *
 * Uses @sparticuz/chromium on Vercel (serverless) and falls back to
 * a local Chrome/Chromium install for development.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const isVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  let executablePath: string;

  if (isVercel) {
    // Serverless: use the bundled Chromium binary from @sparticuz/chromium
    executablePath = await chromium.executablePath();
  } else {
    // Local dev: find Chrome on the system
    executablePath = getLocalChromePath();
  }

  const browser = await puppeteer.launch({
    args: isVercel ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1200, height: 800 },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      displayHeaderFooter: false,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function getLocalChromePath(): string {
  const platform = process.platform;
  if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  // Linux
  return '/usr/bin/google-chrome';
}

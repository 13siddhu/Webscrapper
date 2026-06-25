import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export interface CrawlResult {
  url: string;
  html: string;
  text: string;
}

export interface CrawlerSummary {
  homepageUrl: string;
  pageTitles: string[];
  aboutContent: string;
  contactInfo: string[];
  socialLinks: string[];
}

const PAGE_KEYWORDS = ['about', 'team', 'contact', 'career', 'leadership'];

export const crawlCompany = async (homepageUrl: string): Promise<string> => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  });
  
  const summary: CrawlerSummary = {
    homepageUrl,
    pageTitles: [],
    aboutContent: '',
    contactInfo: [],
    socialLinks: []
  };

  const visitedUrls = new Set<string>();
  const urlsToVisit = new Set<string>();
  urlsToVisit.add(homepageUrl);

  const extractData = ($: cheerio.CheerioAPI) => {
    // Title & Meta
    const title = $('title').text().trim();
    if (title && !summary.pageTitles.includes(title)) {
      summary.pageTitles.push(title);
    }
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc) summary.aboutContent += metaDesc + ' ';

    // Look for emails and phone numbers in text/hrefs BEFORE deleting tags
    $('a[href^="mailto:"]').each((_, el) => {
      const email = $(el).attr('href')?.replace('mailto:', '').trim();
      if (email && !summary.contactInfo.includes(email)) summary.contactInfo.push(email);
    });
    $('a[href^="tel:"]').each((_, el) => {
      const phone = $(el).attr('href')?.replace('tel:', '').trim();
      if (phone && !summary.contactInfo.includes(phone)) summary.contactInfo.push(phone);
    });

    // Aggressively scan all text for unlinked phone numbers (e.g. +91 9876543210, 1-800-123-4567)
    const rawText = $('body').text();
    const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;
    const foundPhones = rawText.match(phoneRegex);
    if (foundPhones) {
      foundPhones.forEach(phone => {
        if (!summary.contactInfo.includes(phone)) summary.contactInfo.push(phone);
      });
    }

    // Social Links
    $('a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="instagram.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !summary.socialLinks.includes(href)) summary.socialLinks.push(href);
    });

    // NOW clean up useless tags before large text extraction
    $('script, style, noscript, iframe, img, svg, nav, footer').remove();

    // Extract text (prioritize main content areas if possible, or fallback to body)
    const bodyText = $('main, article, #content, .content, body').text().replace(/\s+/g, ' ').trim();
    if (bodyText) {
      // Limit text per page to save tokens
      summary.aboutContent += bodyText.slice(0, 3000) + '\n'; 
    }
  };

  try {
    const page = await context.newPage();
    await page.goto(homepageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    const homepageHtml = await page.content();
    const $ = cheerio.load(homepageHtml);
    
    extractData($);
    visitedUrls.add(homepageUrl);

    // Find internal links for About, Contact, Team, Careers
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      
      let fullUrl = href;
      if (href.startsWith('/')) {
        try {
          const baseUrl = new URL(homepageUrl);
          fullUrl = `${baseUrl.origin}${href}`;
        } catch { return; }
      }

      if (fullUrl.startsWith('http') && fullUrl.includes(new URL(homepageUrl).hostname)) {
        const lowerHref = href.toLowerCase();
        if (PAGE_KEYWORDS.some(kw => lowerHref.includes(kw))) {
          urlsToVisit.add(fullUrl);
        }
      }
    });

    // Visit discovered pages (limit to 4 extra pages)
    const extraUrls = Array.from(urlsToVisit).filter(u => u !== homepageUrl).slice(0, 4);
    
    for (const url of extraUrls) {
      if (visitedUrls.has(url)) continue;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const html = await page.content();
        const $page = cheerio.load(html);
        extractData($page);
        visitedUrls.add(url);
      } catch (err) {
        console.error(`Failed to crawl ${url}`);
      }
    }
  } catch (error) {
    console.error(`Failed to crawl homepage ${homepageUrl}`, error);
  } finally {
    await browser.close();
  }

  // Return a compact stringified JSON
  return JSON.stringify(summary, null, 2).slice(0, 15000); // Failsafe limit
};

# 🚀 AI Lead Discovery & Enrichment Platform

Welcome to the **Lead Discovery MVP**! 

This is a proprietary, autonomous AI pipeline designed to act like a Senior Sales Development Representative (SDR). You give it a niche and a country, and it will hunt down real companies, crawl their websites in real-time, extract the contact details of the decision-makers, and export a perfectly formatted CSV—all for a fraction of a cent per lead.

Say goodbye to outdated databases like Apollo or expensive credit-burning tools like Clay. This is day-zero, live web intelligence.

---

## 🧠 How It Works (The Pipeline)

When you hit "Generate", the pipeline runs autonomously through these phases:

1. **Precision Targeting (Gemini 2.5):** We use Google's Gemini AI to instantly generate a list of exact, highly relevant brand names matching your niche.
2. **Domain Resolution (SerpApi):** The pipeline runs a targeted Google Search (`"[Brand Name] official website"`) to bypass aggregator listicles and land strictly on the official company domain.
3. **Headless Web Crawling (Playwright & Cheerio):** The system spins up a headless browser, visits the target website, and rapidly extracts the core text, "About Us" data, and contact information.
4. **Tech Stack Detection:** It analyzes the website's HTML source code to discover exactly what software the company is running (e.g., Shopify, WordPress, Klaviyo).
5. **Cognitive Scoring (Gemini 2.5):** The scraped website data is fed back into Gemini. The AI acts as an SDR, scoring the company's "Strategic Fit," estimating revenue, and extracting the Founder & CEO's names.
6. **Deep Enrichment (LinkedIn Dorking):** If we can't find an email on the public website, the pipeline dynamically generates the most probable B2B email format (e.g., `founder@brand.com`). It then silently scrapes Google's index of LinkedIn to find additional employees working there.

---

## 💻 Tech Stack

- **Frontend & Backend:** [Next.js 14+](https://nextjs.org/) (React, TypeScript, TailwindCSS)
- **AI Engine:** Google Gemini 2.5 Flash & Pro (`@google/generative-ai`)
- **Web Crawling:** Playwright + Cheerio
- **Search & Dorking:** SerpApi
- **Data Enforcement:** Zod (Strict JSON Schema Validation)

---

## 🛠 Getting Started

### 1. Prerequisites
You will need API keys for the following services (both have very generous free tiers):
- **[Google AI Studio](https://aistudio.google.com/):** For the Gemini API.
- **[SerpApi](https://serpapi.com/):** For Google Search and LinkedIn scraping.

### 2. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root of the project and add your API keys:

```env
GEMINI_API_KEY="your_google_gemini_api_key_here"
SERP_API_KEY="your_serp_api_key_here"
```

### 4. Run the Local Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. Type in a niche (e.g., "Skincare") and a location (e.g., "India"), and watch the AI go to work!

---

## 📈 Production Roadmap

*This app is currently an MVP designed to run locally.* To scale this to production for 10,000+ leads, the following architectural upgrades are recommended:
1. **Cloud Scraping:** Replace local Playwright with a cloud scraping API (like Browserless.io) so it runs smoothly on Vercel Serverless.
2. **Background Queues:** Implement a queue worker (like Upstash Redis) to bypass Vercel's 60-second API timeout limits for massive batches.
3. **Database Integration:** Connect a PostgreSQL database (like Supabase) to build a "Campaign History" dashboard.

---

*Built for absolute precision, zero dummy data, and maximum cost-efficiency.*

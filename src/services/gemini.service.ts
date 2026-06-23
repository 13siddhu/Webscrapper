import { GoogleGenerativeAI } from '@google/generative-ai';
import { CompanyIntelligenceSchema, CompanyIntelligence } from '../lib/schema';

export const analyzeCompany = async (
  companyName: string,
  website: string,
  summaryJson: string,
  techStack: string[]
): Promise<CompanyIntelligence> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `
You are an expert Lead Intelligence Analyst for an AI SDR platform.
Analyze the structured summary and tech stack for the company "${companyName}" (${website}).

Extract and infer all required data to match this EXACT JSON structure:
{
  "industry": "string",
  "country": "string or null",
  "state": "string or null",
  "headquartersLocation": "string or null",
  "revenueEstimate": "Under $100K" | "$100K - $1M" | "$1M - $10M" | "$10M+",
  "employeeCount": "1-10" | "11-50" | "51-200" | "201-500" | "500+",
  "companySize": "Startup" | "Small Business" | "Mid-Market" | "Enterprise",
  "techStack": ["string"],
  "marketingChannels": ["string"],
  "currentCRM": "string or null",
  "currentAgency": "string or null",
  "leadSource": "Google Search",
  "status": "Enriched",
  "companyDescription": "string (max 1000 words)",
  "contactEmail": "string (valid email) or null",
  "contactPhone": "string or null",
  "contacts": [
    {
      "contactName": "string",
      "designation": "string",
      "contactType": "Founder" | "Co-Founder" | "CEO" | "Head of Growth" | "Marketing Lead" | "Growth Manager" | "Marketing Manager" | "Employee",
      "linkedInUrl": "string (valid URL) or null",
      "publicEmail": "string (valid email) or null",
      "publicPhoneNumber": "string or null",
      "sourceUrl": "string (valid URL) or null",
      "confidenceScore": number (0-100)
    }
  ],
  "revenuePotential": number (0-25),
  "marketingMaturity": number (0-25),
  "aiOpportunity": number (0-25),
  "strategicFit": number (0-25),
  "totalScore": number (0-100),
  "triggers": ["string"]
}

RULES:
- Return ONLY valid JSON matching the exact keys and types above.
- Tech Stack detected separately: ${techStack.join(', ') || 'None detected'}. Combine this with your analysis.
- Discover all key decision makers from the text (Founder, CEO, Marketing Lead). Do NOT fabricate contacts.
- EXTRACT CONTACT INFO: Look deeply for any publicEmail, publicPhoneNumber, or linkedInUrl for each decision maker and the general company.
- Do NOT fabricate Revenue or Employee counts. Estimate based on context.
- Output MUST be valid JSON without any markdown code blocks (e.g. no \`\`\`json).

Scraped Structured Summary:
${summaryJson}
`;

  const runWithModel = async (modelName: string) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse the raw JSON (defensively strip markdown if present)
    const cleanText = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const parsedJson = JSON.parse(cleanText);

    // Validate using Zod to ensure schema match
    return CompanyIntelligenceSchema.parse(parsedJson);
  };

  try {
    // Attempt with primary model first
    return await runWithModel('gemini-2.5-flash');
  } catch (primaryError: any) {
    console.warn(`[gemini-2.5-flash failed] Retrying with gemini-2.5-pro...`, primaryError.message || primaryError);
    
    try {
      // Fallback to Pro model
      return await runWithModel('gemini-2.5-pro');
    } catch (fallbackError: any) {
      console.error("Gemini Parse/Validation Error on both models:", fallbackError);
      throw new Error(`Gemini Analysis Failed: ${fallbackError.message || 'Validation or Quota error'}`);
    }
  }
};

import { z } from 'zod';

export const ContactSchema = z.object({
  contactName: z.string().describe("The name of the contact. Example: John Doe"),
  designation: z.string().describe("The job title or designation of the contact."),
  contactType: z.enum([
    "Founder", "Co-Founder", "CEO", "Head of Growth", "Marketing Lead", 
    "Growth Manager", "Marketing Manager", "Employee"
  ]).describe("The type of contact based on the allowed values."),
  linkedInUrl: z.string().url().nullable().describe("Verified LinkedIn URL of the person. null if not found."),
  publicEmail: z.string().email().nullable().describe("Public email address of the person. null if not found."),
  publicPhoneNumber: z.string().nullable().describe("Public phone number of the person. null if not found."),
  sourceUrl: z.string().url().nullable().describe("URL where this information was found."),
  confidenceScore: z.number().min(0).max(100).describe("Confidence score of this contact data from 0 to 100.")
});

export const CompanyIntelligenceSchema = z.object({
  industry: z.string().describe("The industry the company operates in."),
  country: z.string().nullable(),
  state: z.string().nullable(),
  headquartersLocation: z.string().nullable(),
  revenueEstimate: z.enum([
    "Under $100K", "$100K - $1M", "$1M - $10M", "$10M+"
  ]).describe("Estimated revenue range. Never generate exact revenue numbers."),
  employeeCount: z.enum([
    "1-10", "11-50", "51-200", "201-500", "500+"
  ]),
  companySize: z.enum([
    "Startup", "Small Business", "Mid-Market", "Enterprise"
  ]),
  techStack: z.array(z.string()).describe("Array of detected technologies, e.g., Shopify, Google Analytics."),
  marketingChannels: z.array(z.string()).describe("Detected marketing channels, e.g., SEO, Google Ads, Instagram Marketing."),
  currentCRM: z.string().nullable().describe("Detected CRM like HubSpot, Salesforce. Null if none."),
  currentAgency: z.string().nullable().describe("Name of the agency that built the site or runs marketing. Null if none."),
  leadSource: z.string().describe("Source of the lead, e.g., 'Google Search Expansion'"),
  status: z.string().describe("Status of the lead, e.g., 'Enriched'"),
  companyDescription: z.string().max(1000).describe("Brief description of what the company does, product category, target audience, and business model. Max 100 words."),
  contactEmail: z.string().nullable().describe("General company contact email."),
  contactPhone: z.string().nullable().describe("General company contact phone."),
  contacts: z.array(ContactSchema).describe("List of identified key contacts/decision makers."),
  revenuePotential: z.number().min(0).max(25).describe("Score from 0-25 based on product portfolio, brand maturity, growth signals."),
  marketingMaturity: z.number().min(0).max(25).describe("Score from 0-25 based on SEO, Ads, Email, Tracking stack."),
  aiOpportunity: z.number().min(0).max(25).describe("Score from 0-25 based on automation and AI adoption potential."),
  strategicFit: z.number().min(0).max(25).describe("Score from 0-25 based on alignment and growth stage."),
  totalScore: z.number().min(0).max(100).describe("Sum of the 4 scores."),
  triggers: z.array(z.string()).describe("Identified sales signals like 'Hiring marketing roles', 'New products'.")
});

export type ContactIntelligence = z.infer<typeof ContactSchema>;
export type CompanyIntelligence = z.infer<typeof CompanyIntelligenceSchema>;

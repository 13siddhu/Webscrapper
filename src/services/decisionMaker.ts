import axios from 'axios';
import { ContactIntelligence } from '../lib/schema';

// Helper to guess corporate email
const guessEmail = (name: string, domain: string): string => {
  const cleanName = name.trim().toLowerCase().replace(/[^a-z\s]/g, '');
  const parts = cleanName.split(/\s+/);
  if (parts.length === 1) return `${parts[0]}@${domain} (Probable)`;
  return `${parts[0]}@${domain} (Probable)`; // The most common for small startups
};

export const enrichDecisionMakers = async (
  companyName: string, 
  website: string,
  contacts: ContactIntelligence[]
): Promise<ContactIntelligence[]> => {
  const serpApiKey = process.env.SERP_API_KEY;
  if (!serpApiKey) {
    console.warn("SERP_API_KEY not found. Skipping LinkedIn enrichment.");
    return contacts;
  }

  const enrichedContacts = [...contacts];
  let domain = '';
  try {
    domain = new URL(website).hostname.replace('www.', '');
  } catch {
    domain = website.replace('https://', '').replace('http://', '').split('/')[0].replace('www.', '');
  }

  for (const contact of enrichedContacts) {
    // 1. Guess Email if missing
    if (!contact.publicEmail && contact.contactName && !contact.contactName.toLowerCase().includes('mock')) {
      contact.publicEmail = guessEmail(contact.contactName, domain);
    }

    // 2. Find LinkedIn if missing
    if (!contact.linkedInUrl && contact.contactName) {
      try {
        const query = `${companyName} ${contact.contactName} ${contact.designation} site:linkedin.com/in/`;
        const response = await axios.get('https://serpapi.com/search.json', {
          params: { q: query, api_key: serpApiKey, num: 3 }
        });

        const organicResults = response.data.organic_results;
        if (organicResults && organicResults.length > 0) {
          const firstHit = organicResults[0];
          if (firstHit.link && firstHit.link.includes('linkedin.com/in/')) {
            contact.linkedInUrl = firstHit.link;
            contact.sourceUrl = contact.sourceUrl || firstHit.link;
            contact.confidenceScore = Math.min(100, contact.confidenceScore + 20);
          }
        }
      } catch (err) {
        console.error(`Failed to enrich contact ${contact.contactName}`, err);
      }
    }
  }

  // 3. Scrape additional employees via LinkedIn Dorking
  try {
    const employeeQuery = `site:linkedin.com/in/ "${companyName}"`;
    const response = await axios.get('https://serpapi.com/search.json', {
      params: { q: employeeQuery, api_key: serpApiKey, num: 5 }
    });

    const organicResults = response.data.organic_results;
    if (organicResults) {
      for (const hit of organicResults) {
        // Simple heuristic: title usually looks like "John Doe - Marketing Manager - Brand"
        if (hit.title && hit.link && hit.link.includes('linkedin.com/in/')) {
          const titleParts = hit.title.split(' - ');
          if (titleParts.length >= 2) {
            const name = titleParts[0].trim();
            const role = titleParts[1].trim();
            
            // Check if we already have this person
            const exists = enrichedContacts.some(c => c.contactName && c.contactName.includes(name));
            if (!exists && !name.toLowerCase().includes('linkedin')) {
              enrichedContacts.push({
                contactName: name,
                designation: role,
                contactType: "Employee",
                linkedInUrl: hit.link,
                publicEmail: guessEmail(name, domain),
                publicPhoneNumber: null,
                sourceUrl: hit.link,
                confidenceScore: 70
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`Failed to scrape additional employees for ${companyName}`, err);
  }

  return enrichedContacts;
};

import axios from 'axios';

export interface CompanyDomain {
  companyName: string;
  url: string;
}

export const searchCompanyDomains = async (companyNames: string[]): Promise<CompanyDomain[]> => {
  const serpApiKey = process.env.SERP_API_KEY;
  if (!serpApiKey) {
    throw new Error("No SERP_API_KEY found.");
  }

  const results: CompanyDomain[] = [];

  for (const companyName of companyNames) {
    try {
      const query = `${companyName} official website`;
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          q: query,
          api_key: serpApiKey,
          num: 3,
        }
      });

      const organicResults = response.data.organic_results;
      if (organicResults && Array.isArray(organicResults) && organicResults.length > 0) {
        // Take the very first organic result as the official domain
        const firstHit = organicResults[0];
        if (firstHit.link) {
          results.push({
            companyName: companyName,
            url: firstHit.link
          });
        }
      }
    } catch (error: any) {
      console.error(`Error fetching domain for company: ${companyName}`, error.message);
    }
  }

  return results;
};

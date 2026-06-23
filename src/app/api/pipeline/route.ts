import { NextRequest } from 'next/server';
import { generateCompanyNames } from '@/services/queryGenerator';
import { searchCompanyDomains } from '@/services/serpApiService';
import { crawlCompany } from '@/services/crawler';
import { detectTechStack } from '@/services/techDetector';
import { analyzeCompany } from '@/services/gemini.service';
import { enrichDecisionMakers } from '@/services/decisionMaker';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { niche, country } = await req.json();

    if (!niche || !country) {
      return new Response("Invalid request, expected niche and country", { status: 400 });
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // PHASE 1: Discovery (Precision Mode)
          sendEvent('log', { message: `Generating exact company names for ${niche} in ${country}...` });
          sendEvent('progress', { percent: 5, message: 'Generating Target List...' });
          const companyNames = await generateCompanyNames(niche, country);
          
          sendEvent('log', { message: `Resolving official domains for ${companyNames.length} companies...` });
          sendEvent('progress', { percent: 15, message: 'Finding Official Websites...' });
          
          // Limit to 5 for testing
          const companiesToProcess = companyNames.slice(0, 5);
          const rawLeads = await searchCompanyDomains(companiesToProcess);
          
          sendEvent('log', { message: `Resolved ${rawLeads.length} official domains!` });
          sendEvent('progress', { percent: 25, message: 'Websites Found...' });
          
          sendEvent('raw_leads_found', { count: rawLeads.length });

          // PHASE 2: Enrichment
          const totalLeads = rawLeads.length;
          
          for (let i = 0; i < totalLeads; i++) {
            const { companyName, url: website } = rawLeads[i];
            const baseProgress = 25 + ((i / totalLeads) * 75);
            
            try {
              sendEvent('log', { message: `Crawling ${companyName} (${website})...` });
              sendEvent('progress', { percent: baseProgress, message: `Crawling ${companyName}...` });
              const text = await crawlCompany(website);
              
              sendEvent('log', { message: `Detecting Tech Stack for ${companyName}...` });
              sendEvent('progress', { percent: baseProgress + 1, message: `Detecting Tech Stack...` });
              const techStack = await detectTechStack(website);
              
              sendEvent('log', { message: `AI analyzing ${companyName}...` });
              sendEvent('progress', { percent: baseProgress + 2, message: `AI Analysis running...` });
              const aiData = await analyzeCompany(companyName, website, text, techStack);
              
              sendEvent('log', { message: `Finding Decision Makers for ${companyName}...` });
              sendEvent('progress', { percent: baseProgress + 3, message: `Enriching Contacts...` });
              const finalContacts = await enrichDecisionMakers(companyName, website, aiData.contacts);
              
              const finalLead = {
                companyName,
                website,
                ...aiData,
                contacts: finalContacts
              };

              sendEvent('log', { message: `Successfully enriched ${companyName}! Total Score: ${finalLead.totalScore}/100` });
              sendEvent('lead_complete', { lead: finalLead, index: i });
            } catch (leadError: any) {
              console.error(`Error enriching ${companyName}:`, leadError);
              sendEvent('log', { message: `Failed to process ${companyName}. Skipping... (${leadError.message})` });
              // Continue to the next lead instead of crashing the pipeline
              continue;
            }
          }

          sendEvent('progress', { percent: 100, message: 'Complete!' });
          sendEvent('log', { message: 'Pipeline finished successfully.' });
          sendEvent('done', { message: 'All leads processed' });
        } catch (error: any) {
          console.error("Pipeline error:", error);
          sendEvent('error', { message: error.message || 'Internal server error' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response("Internal error", { status: 500 });
  }
}

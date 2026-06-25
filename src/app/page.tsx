'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2, Sparkles, Building2, Users, Flame, Terminal } from 'lucide-react';

export default function UnifiedLeadPlatform() {
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [enrichedLeads, setEnrichedLeads] = useState<any[]>([]);
  const [contactsFound, setContactsFound] = useState(0);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleGenerate = async () => {
    if (!niche || !country) return;
    
    try {
      setIsProcessing(true);
      setLogs(['Initializing autonomous pipeline...']);
      setProgressMsg('Starting pipeline...');
      setProgressPercent(0);
      setEnrichedLeads([]);
      setContactsFound(0);

      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, country }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errorText}`);
      }

      if (!res.body) throw new Error('No body returned from API');
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setIsProcessing(false);
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;
          
          const eventLine = event.split('\n').find(line => line.startsWith('event:'));
          const dataLine = event.split('\n').find(line => line.startsWith('data:'));
          
          if (!eventLine || !dataLine) continue;
          
          const eventName = eventLine.replace('event: ', '').trim();
          const eventData = JSON.parse(dataLine.replace('data: ', '').trim());

          if (eventName === 'log') {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${eventData.message}`]);
          } else if (eventName === 'progress') {
            setProgressMsg(eventData.message);
            setProgressPercent(eventData.percent);
          } else if (eventName === 'lead_complete') {
            const lead = eventData.lead;
            setEnrichedLeads(prev => [...prev, lead]);
            setContactsFound(prev => prev + (lead.contacts ? lead.contacts.length : 0));
          } else if (eventName === 'done') {
            setProgressMsg('Complete!');
            setProgressPercent(100);
            setIsProcessing(false);
          } else if (eventName === 'error') {
            console.error('SSE Error:', eventData.message);
            setProgressMsg(`Error: ${eventData.message}`);
            setLogs(prev => [...prev, `[ERROR] ${eventData.message}`]);
            setIsProcessing(false);
          }
        }
      }
    } catch (err: any) {
      alert(`Pipeline Error: ${err.message}`);
      setIsProcessing(false);
      setProgressMsg('Error occurred');
    }
  };

  const handleExport = async (type: 'company' | 'contacts') => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: enrichedLeads }),
      });
      const data = await res.json();
      if (data.companyCsvUrl && data.contactsCsvUrl) {
        const downloadFile = (url: string) => {
          const a = document.createElement('a');
          a.href = url;
          a.setAttribute('download', '');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
        
        if (type === 'company') {
          downloadFile(data.companyCsvUrl);
        } else {
          downloadFile(data.contactsCsvUrl);
        }
      }
    } catch (err) {
      alert('Failed to generate export');
    }
  };

  const highPriorityCount = enrichedLeads.filter(l => l.totalScore >= 75).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="text-blue-500" />
              Lead Intelligence Engine
            </h1>
            <p className="text-neutral-400 mt-2 text-lg">Autonomous Single-Step Pipeline</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => handleExport('company')} disabled={enrichedLeads.length === 0} variant="secondary">
              <Download className="mr-2 h-4 w-4" /> Company Data CSV
            </Button>
            <Button onClick={() => handleExport('contacts')} disabled={enrichedLeads.length === 0} variant="secondary" className="bg-purple-600 hover:bg-purple-700 text-white border-none">
              <Download className="mr-2 h-4 w-4" /> Contacts Data CSV
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-400">Companies Processed</CardTitle>
              <Building2 className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{enrichedLeads.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-400">Contacts Found</CardTitle>
              <Users className="h-4 w-4 text-neutral-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{contactsFound}</div>
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-400">High Priority Leads</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-400">{highPriorityCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Controls & Terminal */}
          <div className="col-span-1 space-y-6">
            <Card className="bg-neutral-900 border-neutral-800 text-white">
              <CardHeader>
                <CardTitle>Autonomous Pipeline</CardTitle>
                <CardDescription className="text-neutral-400">Generate fully qualified leads in one click.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block text-neutral-300">Niche / Industry</label>
                  <Input 
                    placeholder="e.g. Skincare, Fashion" 
                    value={niche} 
                    onChange={(e) => setNiche(e.target.value)} 
                    className="bg-neutral-950 border-neutral-800"
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-neutral-300">Country</label>
                  <Input 
                    placeholder="e.g. India, US" 
                    value={country} 
                    onChange={(e) => setCountry(e.target.value)} 
                    className="bg-neutral-950 border-neutral-800"
                    disabled={isProcessing}
                  />
                </div>
                <Button onClick={handleGenerate} disabled={isProcessing || !niche || !country} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {isProcessing ? 'Pipeline Running...' : 'Generate Qualified Leads'}
                </Button>
                
                {isProcessing && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-neutral-800">
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>{progressMsg}</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2 bg-neutral-800" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Terminal */}
            <Card className="bg-black border-neutral-800 text-white font-mono text-xs shadow-inner">
              <CardHeader className="py-3 px-4 border-b border-neutral-800 bg-neutral-900">
                <CardTitle className="flex items-center text-sm font-medium text-neutral-400">
                  <Terminal className="mr-2 h-4 w-4" /> Pipeline Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[280px] w-full p-4">
                  {logs.length === 0 ? (
                    <div className="text-neutral-600 italic">Waiting to start...</div>
                  ) : (
                    <div className="space-y-1">
                      {logs.map((log, i) => (
                        <div key={i} className="text-green-400">{log}</div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Table */}
          <Card className="col-span-2 bg-neutral-900 border-neutral-800 text-white h-[740px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Enriched Intelligence</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <div className="rounded-md border border-neutral-800 h-full overflow-y-auto">
                <Table>
                  <TableHeader className="bg-neutral-950 sticky top-0 z-10">
                    <TableRow className="border-neutral-800 hover:bg-neutral-950">
                      <TableHead>Company</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Total Score</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedLeads.length === 0 ? (
                      <TableRow className="border-neutral-800">
                        <TableCell colSpan={5} className="text-center py-20 text-neutral-500">
                          <Building2 className="mx-auto h-12 w-12 mb-3 opacity-20" />
                          No leads generated yet. Run the pipeline to see results.
                        </TableCell>
                      </TableRow>
                    ) : (
                      enrichedLeads.map((lead, idx) => (
                        <TableRow key={idx} className="border-neutral-800">
                          <TableCell className="font-medium">{lead.companyName}</TableCell>
                          <TableCell>{lead.industry}</TableCell>
                          <TableCell>{lead.revenueEstimate}</TableCell>
                          <TableCell>
                            <Badge className={lead.totalScore >= 75 ? 'bg-orange-500 text-white border-none' : 'bg-blue-600 text-white border-none'}>
                              {lead.totalScore}/100
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Sheet>
                              <SheetTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-neutral-700 bg-neutral-950 text-white hover:bg-neutral-800 h-9 px-3">
                                View Deep Data
                              </SheetTrigger>
                              <SheetContent className="bg-neutral-950 border-neutral-800 text-white w-[600px] sm:max-w-xl">
                                <ScrollArea className="h-full pr-4">
                                  <SheetHeader className="mb-6">
                                    <SheetTitle className="text-2xl text-white flex items-center gap-2">
                                      {lead.companyName}
                                      {lead.totalScore >= 75 && <Flame className="h-5 w-5 text-orange-500" />}
                                    </SheetTitle>
                                    <SheetDescription>
                                      <a href={lead.website} target="_blank" className="text-blue-400 hover:underline">{lead.website}</a>
                                    </SheetDescription>
                                  </SheetHeader>
                                  
                                  <div className="space-y-6 pb-12">
                                    <div>
                                      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">AI Summary</h3>
                                      <p className="text-sm">{lead.companyDescription}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                                        <div className="text-xs text-neutral-400 mb-1">Company Size</div>
                                        <div className="font-medium">{lead.companySize} ({lead.employeeCount})</div>
                                      </div>
                                      <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                                        <div className="text-xs text-neutral-400 mb-1">Revenue Estimate</div>
                                        <div className="font-medium">{lead.revenueEstimate}</div>
                                      </div>
                                    </div>

                                    <div>
                                      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">Qualification Scores</h3>
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-sm"><span>Revenue Potential</span> <span>{lead.revenuePotential}/25</span></div>
                                        <div className="flex justify-between text-sm"><span>Marketing Maturity</span> <span>{lead.marketingMaturity}/25</span></div>
                                        <div className="flex justify-between text-sm"><span>AI Opportunity</span> <span>{lead.aiOpportunity}/25</span></div>
                                        <div className="flex justify-between text-sm"><span>Strategic Fit</span> <span>{lead.strategicFit}/25</span></div>
                                        <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral-800"><span>Total Score</span> <span className={lead.totalScore >= 75 ? 'text-orange-400' : 'text-blue-400'}>{lead.totalScore}/100</span></div>
                                      </div>
                                    </div>

                                    <div>
                                      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Detected Tech Stack</h3>
                                      <div className="flex flex-wrap gap-2">
                                        {lead.techStack.map((tech: string, i: number) => (
                                          <Badge key={i} variant="secondary" className="bg-neutral-800">{tech}</Badge>
                                        ))}
                                      </div>
                                    </div>

                                    <div>
                                      <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Decision Makers</h3>
                                      {lead.contacts.length > 0 ? (
                                        <div className="space-y-3">
                                          {lead.contacts.map((contact: any, i: number) => (
                                            <div key={i} className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                                              <div className="font-medium flex items-center justify-between">
                                                {contact.contactName}
                                                <Badge className="bg-blue-900 text-blue-100 border-none">{contact.confidenceScore}% Valid</Badge>
                                              </div>
                                              <div className="text-sm text-neutral-400">{contact.designation} ({contact.contactType})</div>
                                              {contact.linkedInUrl && (
                                                <a href={contact.linkedInUrl} target="_blank" className="text-xs text-blue-400 hover:underline block mt-1">LinkedIn Profile</a>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-neutral-500">No decision makers identified.</div>
                                      )}
                                    </div>

                                  </div>
                                </ScrollArea>
                              </SheetContent>
                            </Sheet>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

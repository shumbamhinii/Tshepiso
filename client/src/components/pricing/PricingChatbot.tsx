import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, User, Send, TrendingUp, DollarSign, BarChart3, Clock, MessageSquare } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';

interface Message {
  id: string;
  content: string | JSX.Element; // Allow JSX.Element for charts
  isBot: boolean;
  timestamp: Date;
  suggestions?: string[];
}

interface ProjectData {
  name: string;
  type: string;
  value: number;
  client: string;
  date: string; // YYYY-MM-DD
  margin: number; // Percentage
}

const PricingChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your virtual pricing expert for Thsepiso Branding. I can help you with pricing insights based on historical project data. What would you like to know?",
      isBot: true,
      timestamp: new Date(),
      suggestions: [
        "What's the average price for branding projects?",
        "Show me high-value projects over R50,000",
        "What are the most profitable project types?",
        "Seasonal pricing trends for last year",
        "Show project values by type",
        "Analyze client performance",
        "Projects with margin above 50%",
        "Projects from January 2024 to March 2024",
        "Give me an overall summary"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hardcoded and expanded project database for demonstration
  const projectDatabase: ProjectData[] = [
    { name: "Corporate Identity Package V1", type: "Branding", value: 35000, client: "TechCorp", date: "2024-01-15", margin: 45 },
    { name: "Logo Design & Guidelines Basic", type: "Logo Design", value: 15000, client: "StartupX", date: "2024-02-10", margin: 60 },
    { name: "Complete Brand Overhaul Phase 1", type: "Rebranding", value: 75000, client: "RetailGiant", date: "2024-03-05", margin: 40 },
    { name: "Marketing Collateral Set Q1", type: "Design", value: 22000, client: "LocalBiz", date: "2024-01-28", margin: 50 },
    { name: "Website Brand Integration V2", type: "Digital Branding", value: 45000, client: "OnlineStore", date: "2024-02-20", margin: 35 },
    { name: "Social Media Branding Kit", type: "Digital Branding", value: 18000, client: "FashionBoutique", date: "2024-04-01", margin: 55 },
    { name: "Annual Report Design", type: "Design", value: 28000, client: "FinCorp", date: "2024-04-15", margin: 48 },
    { name: "New Product Launch Branding", type: "Branding", value: 60000, client: "InnovateCo", date: "2024-05-01", margin: 42 },
    { name: "E-commerce Website Redesign", type: "Digital Branding", value: 85000, client: "GlobalMart", date: "2024-05-20", margin: 30 },
    { name: "Brand Strategy Workshop", type: "Consulting", value: 12000, client: "SmallBusiness", date: "2024-06-01", margin: 70 },
    { name: "Logo Refresh & Style Guide", type: "Logo Design", value: 20000, client: "CafeDelight", date: "2024-06-10", margin: 62 },
    { name: "Packaging Design Series", type: "Design", value: 30000, client: "FoodCo", date: "2024-07-01", margin: 50 },
    { name: "Brand Guidelines Expansion", type: "Branding", value: 40000, client: "TechCorp", date: "2024-07-15", margin: 47 },
    { name: "Campaign Visuals Development", type: "Design", value: 25000, client: "LocalBiz", date: "2024-08-01", margin: 52 },
    { name: "Mobile App UI/UX Branding", type: "Digital Branding", value: 55000, client: "AppInnovators", date: "2024-08-20", margin: 38 },
    { name: "Corporate Identity Package V2", type: "Branding", value: 38000, client: "NewClientA", date: "2024-09-01", margin: 46 },
    { name: "Logo Design Premium", type: "Logo Design", value: 18000, client: "NewClientB", date: "2024-09-10", margin: 65 },
    { name: "Rebranding Strategy", type: "Rebranding", value: 65000, client: "NewClientC", date: "2024-10-01", margin: 43 },
    { name: "Digital Ad Campaign Design", type: "Design", value: 28000, client: "NewClientD", date: "2024-10-15", margin: 51 },
    { name: "SEO & Content Strategy Branding", type: "Digital Branding", value: 48000, client: "NewClientE", date: "2024-11-01", margin: 37 },
    { name: "Brand Audit & Report", type: "Consulting", value: 15000, client: "OldClientF", date: "2024-11-15", margin: 68 },
    { name: "Holiday Campaign Graphics", type: "Design", value: 20000, client: "RetailGiant", date: "2024-12-01", margin: 58 },
  ];


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeQuery = (query: string): string | JSX.Element => {
    const lowerQuery = query.toLowerCase();

    // Helper to format currency
    const formatCurrency = (amount: number): string => `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

    // --- General Information Queries ---
    if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
      return "Hello there! How can I assist you with pricing insights today?";
    }
    if (lowerQuery.includes('help')) {
      return "I can help you analyze pricing data, trends, and profitability. Just ask me a question like: 'What's the average project value?' or 'Show me the most profitable project types.'";
    }

    // --- Average Pricing Queries ---
    if (lowerQuery.includes('average price') || lowerQuery.includes('average value') || lowerQuery.includes('typical price')) {
      const totalValue = projectDatabase.reduce((sum, project) => sum + project.value, 0);
      const avgValue = totalValue / projectDatabase.length;

      const typeAverages: { [key: string]: { total: number, count: number } } = {};
      projectDatabase.forEach(p => {
        if (!typeAverages[p.type]) {
          typeAverages[p.type] = { total: 0, count: 0 };
        }
        typeAverages[p.type].total += p.value;
        typeAverages[p.type].count++;
      });

      let typeAvgString = Object.keys(typeAverages).map(type =>
        `• ${type}: ${formatCurrency(typeAverages[type].total / typeAverages[type].count)}`
      ).join('\n');

      return `The overall average project value is **${formatCurrency(avgValue)}**.
Here's a breakdown by project type:
${typeAvgString}

Branding projects typically range from R15,000 to R75,000 depending on scope and complexity.`;
    }

    // --- High-Value Project Queries ---
    if (lowerQuery.includes('high-value') || lowerQuery.includes('over') || lowerQuery.includes('50000')) {
      const threshold = lowerQuery.includes('over') ? parseFloat(lowerQuery.split('over')[1].replace(/[^0-9.]/g, '')) || 50000 : 50000;
      const highValueProjects = projectDatabase.filter(p => p.value > threshold).sort((a, b) => b.value - a.value);

      if (highValueProjects.length === 0) {
        return `No projects found with a value over ${formatCurrency(threshold)}.`;
      }

      return (
        <div>
          <p className="mb-2">I found **{highValueProjects.length} projects** with a value over **{formatCurrency(threshold)}**:</p>
          <ul className="list-disc list-inside">
            {highValueProjects.map((p, index) => (
              <li key={index}>
                **{p.name}** for {p.client}: {formatCurrency(p.value)} ({p.margin}% margin) - {p.date}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted-foreground">These projects often involve comprehensive solutions or larger clients.</p>
        </div>
      );
    }

    // --- Profitability Queries (Text and Chart) ---
    if (lowerQuery.includes('profit') || lowerQuery.includes('margin') || lowerQuery.includes('most profitable')) {
      const typeMargins: { [key: string]: { totalMargin: number, count: number } } = {};
      projectDatabase.forEach(p => {
        if (!typeMargins[p.type]) {
          typeMargins[p.type] = { totalMargin: 0, count: 0 };
        }
        typeMargins[p.type].totalMargin += p.margin;
        typeMargins[p.type].count++;
      });

      const chartData = Object.keys(typeMargins).map(type => ({
        type: type,
        averageMargin: parseFloat((typeMargins[type].totalMargin / typeMargins[type].count).toFixed(1))
      })).sort((a, b) => b.averageMargin - a.averageMargin);

      const avgOverallMargin = projectDatabase.reduce((sum, p) => sum + p.margin, 0) / projectDatabase.length;

      return (
        <div>
          <p className="mb-2">Here's an analysis of project profitability by type. The overall average margin is **{avgOverallMargin.toFixed(1)}%**.</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" angle={-15} textAnchor="end" height={50} interval={0} />
                <YAxis label={{ value: 'Average Margin (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
                <Bar dataKey="averageMargin" fill="#8884d8" name="Avg. Margin" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            **Consulting** projects generally yield the highest margins due to lower direct costs.
            Consider focusing on these for increased profitability.
          </p>
        </div>
      );
    }

    // --- Seasonal/Trend Queries (Text and Chart) ---
    if (lowerQuery.includes('trend') || lowerQuery.includes('season') || lowerQuery.includes('monthly performance')) {
      const monthlyData: { [key: string]: { totalValue: number, count: number, totalMargin: number } } = {};

      projectDatabase.forEach(p => {
        const month = p.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { totalValue: 0, count: 0, totalMargin: 0 };
        }
        monthlyData[month].totalValue += p.value;
        monthlyData[month].totalMargin += p.margin;
        monthlyData[month].count++;
      });

      const chartData = Object.keys(monthlyData).sort().map(month => ({
        month: month,
        averageValue: parseFloat((monthlyData[month].totalValue / monthlyData[month].count).toFixed(2)),
        averageMargin: parseFloat((monthlyData[month].totalMargin / monthlyData[month].count).toFixed(1))
      }));

      return (
        <div>
          <p className="mb-2">Here's a look at our project performance trends by month in 2024:</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" label={{ value: 'Avg. Value (R)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg. Margin (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip formatter={(value: number, name: string) => {
                  if (name === 'Avg. Value') return formatCurrency(value);
                  if (name === 'Avg. Margin') return `${value}%`;
                  return value;
                }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="averageValue" stroke="#8884d8" name="Avg. Value" activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="averageMargin" stroke="#82ca9d" name="Avg. Margin" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            We see consistent project values throughout the year, with a slight dip in margins mid-year.
            **Q1** showed strong corporate demand, and **Rebranding** projects peaked in March-April.
            **Digital branding integration** is growing 25% year-over-year.
          </p>
        </div>
      );
    }

    // --- Projects by Type (Chart) ---
    if (lowerQuery.includes('projects by type') || lowerQuery.includes('breakdown by type')) {
      const typeCounts: { [key: string]: number } = {};
      projectDatabase.forEach(p => {
        typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
      });

      const chartData = Object.keys(typeCounts).map(type => ({
        type: type,
        count: typeCounts[type]
      })).sort((a, b) => b.count - a.count);

      return (
        <div>
          <p className="mb-2">Here's a breakdown of projects by type:</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" angle={-15} textAnchor="end" height={50} interval={0} />
                <YAxis allowDecimals={false} label={{ value: 'Number of Projects', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#ffc658" name="Projects Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            **Design** and **Branding** are our most frequent project types.
          </p>
        </div>
      );
    }

    // --- Client Performance Analysis ---
    if (lowerQuery.includes('client performance') || lowerQuery.includes('top clients')) {
      const clientStats: { [key: string]: { totalValue: number, projectCount: number } } = {};
      projectDatabase.forEach(p => {
        if (!clientStats[p.client]) {
          clientStats[p.client] = { totalValue: 0, projectCount: 0 };
        }
        clientStats[p.client].totalValue += p.value;
        clientStats[p.client].projectCount++;
      });

      const sortedClients = Object.keys(clientStats)
        .map(client => ({
          client: client,
          totalValue: clientStats[client].totalValue,
          projectCount: clientStats[client].projectCount
        }))
        .sort((a, b) => b.totalValue - a.totalValue);

      if (sortedClients.length === 0) {
        return "No client data available for analysis.";
      }

      return (
        <div>
          <p className="mb-2">Here's an analysis of our client performance (top 5 by value):</p>
          <ul className="list-disc list-inside">
            {sortedClients.slice(0, 5).map((c, index) => (
              <li key={index}>
                **{c.client}**: {formatCurrency(c.totalValue)} across {c.projectCount} projects
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted-foreground">
            **RetailGiant** and **TechCorp** are consistently high-value clients.
            Consider strategies to deepen engagement with top performers.
          </p>
        </div>
      );
    }

    // --- Specific Project Type Analysis (Text and potentially a mini-chart if enough data) ---
    const projectTypes = [...new Set(projectDatabase.map(p => p.type.toLowerCase()))];
    for (const type of projectTypes) {
      if (lowerQuery.includes(`average value for ${type}`) || lowerQuery.includes(`margin for ${type}`) || lowerQuery.includes(`${type} projects`)) {
        const filteredProjects = projectDatabase.filter(p => p.type.toLowerCase() === type.toLowerCase());
        if (filteredProjects.length === 0) {
          return `No projects found for type: **${type}**.`;
        }

        const totalValue = filteredProjects.reduce((sum, p) => sum + p.value, 0);
        const avgValue = totalValue / filteredProjects.length;
        const totalMargin = filteredProjects.reduce((sum, p) => sum + p.margin, 0);
        const avgMargin = totalMargin / filteredProjects.length;

        // Prepare data for a mini-chart if there are enough projects for this type
        const typeChartData = filteredProjects.map(p => ({
          name: p.name,
          value: p.value,
          margin: p.margin
        }));

        return (
          <div>
            <p className="mb-2">Insights for **{type}** projects:</p>
            <ul className="list-disc list-inside mb-2">
              <li>**Total Projects:** {filteredProjects.length}</li>
              <li>**Average Value:** {formatCurrency(avgValue)}</li>
              <li>**Average Margin:** {avgMargin.toFixed(1)}%</li>
            </ul>
            {filteredProjects.length > 1 && ( // Only show chart if more than one project of this type
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide /> {/* Hide XAxis labels for cleaner mini-chart */}
                    <YAxis label={{ value: 'Value (R)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: number, name: string) => {
                      if (name === 'value') return formatCurrency(value);
                      if (name === 'margin') return `${value}%`;
                      return value;
                    }} />
                    <Legend />
                    <Bar dataKey="value" fill="#a0d911" name="Project Value" />
                    <Bar dataKey="margin" fill="#faad14" name="Margin (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {type === 'branding' && "These are core to our business. Focus on comprehensive packages for better value."}
              {type === 'logo design' && "Quick turnaround and high margin, great for new clients."}
              {type === 'digital branding' && "Growing segment, often involves larger project values."}
              {type === 'consulting' && "Highest margins, leverage expertise here."}
              {type === 'design' && "Diverse category, look for opportunities to upsell."}
              {type === 'rebranding' && "Significant projects, often with long-term client relationships."}
            </p>
          </div>
        );
      }
    }

    // --- Projects by Margin Threshold ---
    const marginMatch = lowerQuery.match(/(margin|profit) (above|over|greater than|below|under|less than) (\d+(\.\d+)?)(%)?/);
    if (marginMatch) {
        const operator = marginMatch[2];
        const threshold = parseFloat(marginMatch[3]);
        let filteredProjects: ProjectData[] = [];
        let description = '';

        if (['above', 'over', 'greater than'].includes(operator)) {
            filteredProjects = projectDatabase.filter(p => p.margin > threshold);
            description = `projects with a margin above ${threshold}%`;
        } else if (['below', 'under', 'less than'].includes(operator)) {
            filteredProjects = projectDatabase.filter(p => p.margin < threshold);
            description = `projects with a margin below ${threshold}%`;
        }

        if (filteredProjects.length === 0) {
            return `No ${description} found.`;
        }

        const chartData = filteredProjects.map(p => ({
            name: p.name,
            margin: p.margin,
            value: p.value
        })).sort((a, b) => b.margin - a.margin);

        return (
            <div>
                <p className="mb-2">Here are **{filteredProjects.length} {description}**:</p>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} interval={0} />
                            <YAxis label={{ value: 'Margin (%)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip formatter={(value: number, name: string) => {
                                if (name === 'margin') return `${value}%`;
                                if (name === 'value') return formatCurrency(value);
                                return value;
                            }} />
                            <Legend />
                            <Bar dataKey="margin" fill="#ff7300" name="Margin" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                    These projects highlight specific profitability levels.
                </p>
            </div>
        );
    }

    // --- Projects by Date Range ---
    const dateRangeMatch = lowerQuery.match(/(projects|performance) (from|between) (\w+ \d{4}) (to|and) (\w+ \d{4})/);
    if (dateRangeMatch) {
        const startDateStr = dateRangeMatch[3];
        const endDateStr = dateRangeMatch[5];

        // Simple month parsing (e.g., "January 2024" to "2024-01")
        const parseMonthYear = (str: string) => {
            const [monthName, year] = str.split(' ');
            const monthMap: { [key: string]: string } = {
                'january': '01', 'february': '02', 'march': '03', 'april': '04', 'may': '05', 'june': '06',
                'july': '07', 'august': '08', 'september': '09', 'october': '10', 'november': '11', 'december': '12'
            };
            const monthNum = monthMap[monthName.toLowerCase()];
            return monthNum ? `${year}-${monthNum}` : null;
        };

        const startMonthYear = parseMonthYear(startDateStr);
        const endMonthYear = parseMonthYear(endDateStr);

        if (startMonthYear && endMonthYear) {
            const filteredProjects = projectDatabase.filter(p => {
                const projectMonthYear = p.date.substring(0, 7);
                return projectMonthYear >= startMonthYear && projectMonthYear <= endMonthYear;
            }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (filteredProjects.length === 0) {
                return `No projects found between ${startDateStr} and ${endDateStr}.`;
            }

            const totalValue = filteredProjects.reduce((sum, p) => sum + p.value, 0);
            const avgMargin = filteredProjects.reduce((sum, p) => sum + p.margin, 0) / filteredProjects.length;

            return (
                <div>
                    <p className="mb-2">Projects and performance from **{startDateStr} to {endDateStr}**:</p>
                    <ul className="list-disc list-inside mb-2">
                        <li>**Total Projects:** {filteredProjects.length}</li>
                        <li>**Total Value:** {formatCurrency(totalValue)}</li>
                        <li>**Average Margin:** {avgMargin.toFixed(1)}%</li>
                    </ul>
                    <p className="font-semibold mt-2">Projects in this period:</p>
                    <ul className="list-disc list-inside">
                        {filteredProjects.map((p, index) => (
                            <li key={index}>
                                {p.name} ({p.type}): {formatCurrency(p.value)} ({p.margin}%) on {p.date}
                            </li>
                        ))}
                    </ul>
                </div>
            );
        }
    }

    // --- Projects by Client (specific client name) ---
    for (const clientName of [...new Set(projectDatabase.map(p => p.client.toLowerCase()))]) {
      if (lowerQuery.includes(`projects for ${clientName}`) || lowerQuery.includes(`${clientName} projects`)) {
        const clientProjects = projectDatabase.filter(p => p.client.toLowerCase() === clientName);
        if (clientProjects.length === 0) {
          return `No projects found for client: **${clientName}**.`;
        }
        const totalValue = clientProjects.reduce((sum, p) => sum + p.value, 0);
        const avgMargin = clientProjects.reduce((sum, p) => sum + p.margin, 0) / clientProjects.length;

        return (
          <div>
            <p className="mb-2">Details for client: **{clientName}**</p>
            <ul className="list-disc list-inside mb-2">
              <li>**Total Projects:** {clientProjects.length}</li>
              <li>**Total Value:** {formatCurrency(totalValue)}</li>
              <li>**Average Margin:** {avgMargin.toFixed(1)}%</li>
            </ul>
            <p className="font-semibold mt-2">Projects:</p>
            <ul className="list-disc list-inside">
              {clientProjects.map((p, index) => (
                <li key={index}>
                  {p.name} ({p.type}): {formatCurrency(p.value)} on {p.date}
                </li>
              ))}
            </ul>
          </div>
        );
      }
    }


    // --- Overall Summary/Dashboard ---
    if (lowerQuery.includes('summary') || lowerQuery.includes('dashboard') || lowerQuery.includes('overview')) {
        const totalValue = projectDatabase.reduce((sum, project) => sum + project.value, 0);
        const avgValue = totalValue / projectDatabase.length;
        const avgMargin = projectDatabase.reduce((sum, p) => sum + p.margin, 0) / projectDatabase.length;

        const typeCounts: { [key: string]: number } = {};
        projectDatabase.forEach(p => { typeCounts[p.type] = (typeCounts[p.type] || 0) + 1; });
        const topTypes = Object.entries(typeCounts).sort(([,a],[,b]) => b-a).slice(0,3).map(([type]) => type).join(', ');

        const clientValues: { [key: string]: number } = {};
        projectDatabase.forEach(p => { clientValues[p.client] = (clientValues[p.client] || 0) + p.value; });
        const topClients = Object.entries(clientValues).sort(([,a],[,b]) => b-a).slice(0,3).map(([client]) => client).join(', ');

        return (
            <div>
                <p className="mb-2 text-lg font-semibold text-amber-700">Overall Project Performance Summary:</p>
                <ul className="list-disc list-inside mb-4">
                    <li>**Total Projects:** {projectDatabase.length}</li>
                    <li>**Total Revenue:** {formatCurrency(totalValue)}</li>
                    <li>**Average Project Value:** {formatCurrency(avgValue)}</li>
                    <li>**Average Profit Margin:** {avgMargin.toFixed(1)}%</li>
                    <li>**Most Common Project Types:** {topTypes || 'N/A'}</li>
                    <li>**Top Clients by Value:** {topClients || 'N/A'}</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                    This overview provides a snapshot of our key metrics.
                    You can ask for more specific details on any of these areas.
                </p>
            </div>
        );
    }


    // --- Default response with suggestions ---
    return "I can help you analyze pricing data! Try asking about:\n\n• Average project values\n• High-value opportunities\n• Profit margins by project type\n• Seasonal trends\n• Specific project categories\n• Client performance\n• Projects with specific margin levels (e.g., 'projects with margin above 50%')\n• Projects within a date range (e.g., 'projects from January 2024 to March 2024')\n• Projects for a specific client (e.g., 'projects for TechCorp')";
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI processing time
    setTimeout(() => {
      const botResponseContent = analyzeQuery(userMessage.content as string); // Cast to string for analyzeQuery
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponseContent,
        isBot: true,
        timestamp: new Date(),
        // Only provide suggestions if the response is a string (not a chart)
        suggestions: typeof botResponseContent === 'string' ? (userMessage.content.toLowerCase().includes('trend') ? [
          "Show Q2 projections",
          "Compare with 2023 data",
          "Industry benchmark analysis"
        ] : [
          "What about client retention rates?",
          "Show pricing by project complexity",
          "Competitor pricing analysis",
          "Projects with margin above 50%",
          "Projects from January 2024 to March 2024",
          "Give me an overall summary"
        ]) : []
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="bg-primary text-primary-foreground">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Thsepiso Branding Pricing Expert
        </CardTitle>
        <p className="text-sm opacity-90">AI-powered pricing insights from your project database</p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                {message.isBot && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                <div className={`max-w-[80%] space-y-2 ${message.isBot ? '' : 'order-1'}`}>
                  <div
                    className={`rounded-lg p-3 ${
                      message.isBot
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {/* Render content as JSX or string */}
                    {typeof message.content === 'string' ? (
                      <p className="whitespace-pre-line text-sm">{message.content}</p>
                    ) : (
                      message.content
                    )}
                  </div>

                  {message.suggestions && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {!message.isBot && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <Separator />

        {/* Input Area */}
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about pricing, trends, or specific projects..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingChatbot;

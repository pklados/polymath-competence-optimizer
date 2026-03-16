import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { 
  Terminal, Shield, Zap, Activity, Target, AlertTriangle, ChevronRight, ChevronLeft, 
  BarChart3, RefreshCcw, CheckCircle2, Info
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  parseCompetencyCSV, CompetencyRow, Z_SCORES, calculatePercentile, getDomainName, interpolateMetric
} from './utils/competencyUtils';
import rawCsv from './data/Competency_Index.csv?raw';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, onClick, variant = 'primary', className, disabled 
}: { 
  children: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' | 'outline' | 'ghost', className?: string, disabled?: boolean 
}) => {
  const variants = {
    primary: 'bg-white text-black hover:bg-zinc-200 border-white',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 border-zinc-700',
    outline: 'bg-transparent text-white border-zinc-700 hover:border-white',
    ghost: 'bg-transparent text-zinc-500 hover:text-white border-transparent'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 border transition-all duration-200 font-mono text-xs uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed glitch-hover',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, title }: { children: React.ReactNode, className?: string, title?: string }) => (
  <div className={cn('border border-zinc-800 bg-black/50 p-6 relative overflow-hidden', className)}>
    {title && (
      <div className="absolute top-0 left-0 bg-zinc-800 px-3 py-1 text-[10px] uppercase tracking-tighter text-zinc-400 font-mono">
        {title}
      </div>
    )}
    <div className="mt-2">{children}</div>
  </div>
);

// --- Main App ---

export default function App() {
  const [rows, setRows] = useState<CompetencyRow[]>([]);
  const [currentStep, setCurrentStep] = useState<'intro' | 'audit' | 'results'>('intro');
  const [activeDomainIndex, setActiveDomainIndex] = useState(0);
  const [userInputs, setUserInputs] = useState<Record<string, { level: number, metric: string }>>({});

  useEffect(() => {
    const parsed = parseCompetencyCSV(rawCsv);
    setRows(parsed);
  }, []);

  const domains = useMemo(() => {
    const uniqueDomains = Array.from(new Set(rows.map(r => r.domain)));
    return uniqueDomains.sort((a, b) => parseInt(a) - parseInt(b));
  }, [rows]);

  const handleLevelChange = (activity: string, level: number) => {
    setUserInputs(prev => ({
      ...prev,
      [activity]: { level, metric: '' }
    }));
  };

  const calculateResults = () => {
    let totalZ = 0;
    const domainScores: Record<string, number> = {};
    const domainsWithPositiveScore = new Set<string>();

    const zMap: Record<number, number> = {
      0: Z_SCORES.LEVEL_0,
      1: Z_SCORES.LEVEL_25,
      2: Z_SCORES.LEVEL_20,
      3: Z_SCORES.LEVEL_10,
      4: Z_SCORES.LEVEL_5,
      5: Z_SCORES.LEVEL_01,
    };

    rows.forEach(row => {
      const input = userInputs[row.activity];
      if (input && input.level > 0) {
        const z = zMap[input.level] || 0;
        totalZ += z;
        domainsWithPositiveScore.add(row.domain);
        
        const domainName = getDomainName(row.domain);
        domainScores[domainName] = Math.max(domainScores[domainName] || 0, z);
      }
    });

    // Non-Correlation Multiplier: Weight diversity
    // Final Z-score is adjusted by the ratio of domains covered
    const diversityFactor = domainsWithPositiveScore.size / domains.length;
    const adjustedZ = totalZ * (0.5 + diversityFactor); // Base 0.5 + up to 1.0 bonus for full coverage
    
    // Normalize to a reasonable range for percentile calculation
    // This is a heuristic mapping for the "Polymath Index"
    const normalizedZ = adjustedZ / 5; 
    const percentile = calculatePercentile(normalizedZ);

    return {
      percentile,
      domainScores,
      vulnerabilities: domains.filter(d => !domainsWithPositiveScore.has(d)).map(getDomainName),
      totalZ: adjustedZ
    };
  };

  const results = useMemo(() => calculateResults(), [userInputs, domains, rows]);

  const radarData = domains.map(d => ({
    subject: getDomainName(d),
    A: results.domainScores[getDomainName(d)] || 0,
    fullMark: 3.09,
  }));

  const getDirective = () => {
    if (results.vulnerabilities.length === 0) return "All domains active. Optimize for Level 3 peak in your primary domain.";
    const lowest = results.vulnerabilities[0];
    return `CRITICAL BOTTLENECK: ${lowest}. Target: Achieve Level 1 in any sub-skill within 90 days to remove anchor weight.`;
  };

  if (currentStep === 'intro') {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
        <div className="scanline" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full space-y-8 border border-zinc-800 p-12 bg-zinc-950/50"
        >
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter uppercase flex items-center gap-4">
              <Terminal className="w-10 h-10" />
              Polymath Optimizer
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              [SYSTEM INITIALIZED] <br />
              HIGH-RESOLUTION COMPETENCY MATRIX V1.0 <br />
              OBJECTIVE: STRIP SELF-REPORTING BIAS. IDENTIFY ANCHOR WEIGHTS.
            </p>
          </div>

          <div className="space-y-4 border-l-2 border-zinc-800 pl-6">
            <p className="text-zinc-400 text-sm">
              The Polymath Competence Optimizer evaluates your structural advantage across 12 domains. 
              Data-driven gates prevent inflation.
            </p>
            <div className="bg-zinc-900/50 p-4 border border-zinc-800 rounded-sm">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                <Info className="w-3 h-3" /> Calibration Warning
              </p>
              <p className="text-xs text-zinc-400 leading-tight">
                Statistical reality: Most individuals reside in the <span className="text-white font-bold">Bottom 50%</span> for the majority of domains. 
                Honest calibration is required for an accurate structural report.
              </p>
            </div>
            <ul className="text-xs text-zinc-500 space-y-1">
              <li>• 12-Domain High-Resolution Matrix</li>
              <li>• Z-Score Mathematical Engine</li>
              <li>• Non-Correlation Diversity Multiplier</li>
              <li>• Vulnerability Bottleneck Detection</li>
            </ul>
          </div>

          <Button onClick={() => setCurrentStep('audit')} className="w-full py-4 text-lg">
            Begin Audit
          </Button>
        </motion.div>
      </div>
    );
  }

  if (currentStep === 'audit') {
    const activeDomain = domains[activeDomainIndex];
    const domainRows = rows.filter(r => r.domain === activeDomain);

    return (
      <div className="min-h-screen bg-black text-white font-mono p-6 lg:p-12 selection:bg-white selection:text-black">
        <div className="scanline" />
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-2">
            <div className="mb-6">
              <h2 className="text-xs uppercase text-zinc-500 tracking-widest mb-2">Domains</h2>
              <div className="h-1 w-full bg-zinc-900 overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-500" 
                  style={{ width: `${((activeDomainIndex + 1) / domains.length) * 100}%` }}
                />
              </div>
            </div>
            {domains.map((d, idx) => (
              <button
                key={d}
                onClick={() => setActiveDomainIndex(idx)}
                className={cn(
                  'w-full text-left px-4 py-2 text-[10px] uppercase tracking-wider transition-all border-l-2',
                  activeDomainIndex === idx 
                    ? 'border-white bg-zinc-900 text-white' 
                    : 'border-transparent text-zinc-600 hover:text-zinc-400'
                )}
              >
                {idx + 1}. {getDomainName(d)}
              </button>
            ))}
          </div>

          {/* Main Audit Area */}
          <div className="lg:col-span-9 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter">
                  {getDomainName(activeDomain)}
                </h3>
                <p className="text-xs text-zinc-500 uppercase">Domain {activeDomainIndex + 1} of 12</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveDomainIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeDomainIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {activeDomainIndex === domains.length - 1 ? (
                  <Button onClick={() => setCurrentStep('results')} className="bg-emerald-600 border-emerald-600 hover:bg-emerald-500">
                    Finalize <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setActiveDomainIndex(prev => Math.min(domains.length - 1, prev + 1))}>
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {domainRows.map((row) => (
                <Card key={row.activity} title={row.activity} className="group">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase text-zinc-500 tracking-widest">Select Your Verified Performance Level</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        {[0, 1, 2, 3, 4, 5].map((lvl) => {
                          const levelConfig = [
                            { label: 'Level 0', sub: 'BOTTOM 50%', metric: row.level0 },
                            { label: 'Level 1', sub: 'TOP 25%', metric: row.level1 },
                            { label: 'Level 2', sub: 'TOP 20%', metric: interpolateMetric(row, 2) },
                            { label: 'Level 3', sub: 'TOP 10%', metric: interpolateMetric(row, 3) },
                            { label: 'Level 4', sub: 'TOP 5%', metric: row.level2 },
                            { label: 'Level 5', sub: 'TOP 0.1%', metric: row.level3 },
                          ][lvl];

                          return (
                            <button
                              key={lvl}
                              onClick={() => handleLevelChange(row.activity, lvl)}
                              className={cn(
                                'p-4 border text-[10px] transition-all flex flex-col items-start gap-2 text-left h-full glitch-hover',
                                userInputs[row.activity]?.level === lvl
                                  ? 'bg-white text-black border-white'
                                  : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600'
                              )}
                            >
                              <div className="flex justify-between w-full items-center">
                                <span className="font-bold uppercase tracking-tighter">{levelConfig.label}</span>
                                <span className="text-[8px] opacity-60 font-mono">
                                  {levelConfig.sub}
                                </span>
                              </div>
                              <div className={cn(
                                "text-[11px] font-medium leading-tight",
                                userInputs[row.activity]?.level === lvl ? "text-black" : "text-zinc-300"
                              )}>
                                {levelConfig.metric}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'results') {
    return (
      <div className="min-h-screen bg-black text-white font-mono p-6 lg:p-12 selection:bg-white selection:text-black">
        <div className="scanline" />
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-800 pb-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold tracking-tighter uppercase">Audit Complete</h2>
              <p className="text-zinc-500 text-sm">[CALCULATING STRUCTURAL ADVANTAGE...]</p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setCurrentStep('audit')}>
                <RefreshCcw className="w-4 h-4" /> Recalibrate
              </Button>
              <Button onClick={() => window.print()} variant="secondary">
                Export PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Main Stats */}
            <div className="lg:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="General Competence Percentile" className="border-white/20 bg-zinc-950">
                  <div className="flex flex-col items-center justify-center py-8 space-y-2">
                    <span className="text-6xl font-black tracking-tighter">
                      TOP {(results.percentile * 100).toFixed(1)}%
                    </span>
                    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(1 - results.percentile) * 100}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-4">
                      Z-Score: {results.totalZ.toFixed(2)} σ
                    </p>
                  </div>
                </Card>

                <Card title="Polymath Radar" className="bg-zinc-950">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#27272a" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: '#71717a', fontSize: 8, fontWeight: 'bold' }} 
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 3.09]} tick={false} axisLine={false} />
                        <Radar
                          name="Competence"
                          dataKey="A"
                          stroke="#ffffff"
                          fill="#ffffff"
                          fillOpacity={0.2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <Card title="Vulnerability Report: Anchor Weights" className="border-red-900/50 bg-red-950/10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Critical Bottlenecks Detected</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {results.vulnerabilities.length > 0 ? (
                      results.vulnerabilities.map(v => (
                        <div key={v} className="p-3 border border-red-900/30 bg-red-950/20 text-[10px] uppercase text-red-400">
                          {v}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-zinc-500 text-xs italic">No Level 0 domains detected. Structural integrity optimal.</div>
                    )}
                  </div>
                </div>
              </Card>

              <Card title="The Directive: 90-Day Milestone" className="border-emerald-900/50 bg-emerald-950/10">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500 text-black">
                    <Target className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold uppercase tracking-tighter text-emerald-400">Actionable Next Step</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {getDirective()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs uppercase text-zinc-500 tracking-widest px-2">Domain Integrity</h3>
              <div className="space-y-2">
                {radarData.sort((a, b) => b.A - a.A).map((d) => (
                  <div key={d.subject} className="flex items-center justify-between p-3 border border-zinc-900 bg-zinc-950/50">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold">{d.subject}</span>
                      <div className="h-1 w-24 bg-zinc-900 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            d.A > 2 ? 'bg-emerald-500' : d.A > 1 ? 'bg-white' : d.A > 0 ? 'bg-zinc-500' : 'bg-red-900'
                          )}
                          style={{ width: `${(d.A / 3.09) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className={cn(
                      "text-xs font-mono",
                      d.A === 0 ? 'text-red-500' : 'text-white'
                    )}>
                      {d.A === 0 ? 'NULL' : `σ+${d.A.toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>

              <Card title="Glossary" className="mt-8 bg-zinc-950/30 border-zinc-900">
                <div className="space-y-4 text-[10px] text-zinc-500">
                  <div>
                    <span className="text-zinc-300 font-bold block uppercase mb-1">Z-Score (σ)</span>
                    A statistical measurement describing a value's relationship to the mean. σ+3.09 represents the top 0.1%.
                  </div>
                  <div>
                    <span className="text-zinc-300 font-bold block uppercase mb-1">Non-Correlation Multiplier</span>
                    Weights skills spread across different domains higher than clustered skills. Rewards diversity.
                  </div>
                  <div>
                    <span className="text-zinc-300 font-bold block uppercase mb-1">Anchor Weights</span>
                    Domains where you register Level 0. These are the bottlenecks dragging down your structural advantage.
                  </div>
                  <div>
                    <span className="text-zinc-300 font-bold block uppercase mb-1">Polymath Radar</span>
                    A 12-axis visualization of your competency footprint. Empty axes indicate critical vulnerabilities.
                  </div>
                </div>
              </Card>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return null;
}

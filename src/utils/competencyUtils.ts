import Papa from 'papaparse';

export interface CompetencyRow {
  domain: string;
  activity: string;
  level0: string;
  level1: string;
  level2: string;
  level3: string;
  yourLevel: number;
  yourMetric: string;
}

export const parseCompetencyCSV = (csvString: string): CompetencyRow[] => {
  const { data } = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  return data.map((row: any) => ({
    domain: row['Domain'],
    activity: row['Activity / Skill'],
    level0: row['Level 0 (Bottom 50%)'],
    level1: row['Level 1 (Top 25%)'],
    level2: row['Level 2 (Top 5%)'],
    level3: row['Level 3 (Top 0.1%)'],
    yourLevel: 0,
    yourMetric: '',
  }));
};

export const Z_SCORES = {
  LEVEL_0: 0,      // Bottom 50%
  LEVEL_25: 0.67,  // Top 25%
  LEVEL_20: 0.84,  // Top 20%
  LEVEL_10: 1.28,  // Top 10%
  LEVEL_5: 1.65,   // Top 5%
  LEVEL_01: 3.09,  // Top 0.1%
};

export const calculatePercentile = (z: number): number => {
  // Simple approximation of the normal CDF
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
};

export const getDomainName = (domainStr: string) => {
  return domainStr.split('. ')[1] || domainStr;
};

export const getDomainIndex = (domainStr: string) => {
  return parseInt(domainStr.split('. ')[0]) || 0;
};

export const interpolateMetric = (row: CompetencyRow, level: number): string => {
  // Level 1 = Top 25%
  // Level 4 = Top 5%
  // Level 2 = Top 20%
  // Level 3 = Top 10%
  
  const parseVal = (s: string) => {
    const timeMatch = s.match(/(\d+):(\d+)/);
    if (timeMatch) return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    const numMatch = s.match(/(\d+\.?\d*)/);
    return numMatch ? parseFloat(numMatch[1]) : null;
  };

  const formatVal = (val: number, original: string) => {
    if (original.includes(':')) {
      const mins = Math.floor(val / 60);
      const secs = Math.round(val % 60);
      return `${mins}:${secs.toString().padStart(2, '0')} min`;
    }
    if (original.includes('x')) return `${val.toFixed(2)}x`;
    if (original.includes('$')) return `$${(val / 1000000).toFixed(1)}M`;
    return val.toFixed(1);
  };

  const v1 = parseVal(row.level1);
  const v4 = parseVal(row.level2); // This is Level 4 in our new 0-5 scale (Top 5%)

  if (v1 === null || v4 === null) return "Intermediate (Est.)";

  // Linear interpolation between Top 25% and Top 5%
  // Top 25% -> Top 5% is a 20 percentage point gap
  // Level 1 (25%)
  // Level 2 (20%) -> 1/4 of the way to 5%
  // Level 3 (10%) -> 3/4 of the way to 5%
  // Level 4 (5%)
  
  let result: number;
  if (level === 2) {
    result = v1 + (v4 - v1) * 0.25;
  } else if (level === 3) {
    result = v1 + (v4 - v1) * 0.75;
  } else {
    return "N/A";
  }

  // Add prefix/suffix logic
  const prefix = row.level1.startsWith('<') ? '< ' : row.level1.startsWith('>') ? '> ' : '';
  return `${prefix}${formatVal(result, row.level1)}`;
};

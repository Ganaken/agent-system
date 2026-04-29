const RERA_CALCULATOR_URL = 'https://www.rera.gov.ae/en/rent-calculator';
const DLD_RENTAL_URL = 'https://dubailand.gov.ae/en/eservices/rental-index/#/';

export interface RERAResult {
  currentRent: number;
  maxIncreasePercent: number;
  maxIncrease: number;
  maxNewRent: number;
  rule: string;
  calculatorUrl: string;
}

// Dubai Decree 43 of 2013 — RERA rent increase rules
export function calculateRentIncrease(currentRent: number, marketRent: number): RERAResult {
  const pctBelow = ((marketRent - currentRent) / marketRent) * 100;

  let maxIncreasePercent: number;
  let rule: string;

  if (pctBelow <= 10) {
    maxIncreasePercent = 0;
    rule = 'Current rent is within 10% of market rate. No increase is allowed under RERA Decree 43/2013.';
  } else if (pctBelow <= 20) {
    maxIncreasePercent = 5;
    rule = `Current rent is ${pctBelow.toFixed(1)}% below market rate (11–20% range). Maximum 5% increase allowed.`;
  } else if (pctBelow <= 30) {
    maxIncreasePercent = 10;
    rule = `Current rent is ${pctBelow.toFixed(1)}% below market rate (21–30% range). Maximum 10% increase allowed.`;
  } else if (pctBelow <= 40) {
    maxIncreasePercent = 15;
    rule = `Current rent is ${pctBelow.toFixed(1)}% below market rate (31–40% range). Maximum 15% increase allowed.`;
  } else {
    maxIncreasePercent = 20;
    rule = `Current rent is ${pctBelow.toFixed(1)}% below market rate (>40% range). Maximum 20% increase allowed.`;
  }

  const maxIncrease = Math.round((currentRent * maxIncreasePercent) / 100);
  return {
    currentRent,
    maxIncreasePercent,
    maxIncrease,
    maxNewRent: currentRent + maxIncrease,
    rule,
    calculatorUrl: RERA_CALCULATOR_URL,
  };
}

export async function getRERAInfo(area: string, currentRent: number): Promise<string> {
  // Try to fetch live rental index data from Dubai Pulse / DLD API
  try {
    const url = `https://www.dubaipulse.gov.ae/api/v1/datasets/dld_rental_transactions?area=${encodeURIComponent(area)}&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const json = await res.json() as Record<string, unknown>;
      if (json && typeof json === 'object') {
        return buildRERANote(area, currentRent, null);
      }
    }
  } catch {
    // API unavailable — fall through to rules-based response
  }

  return buildRERANote(area, currentRent, null);
}

function buildRERANote(area: string, currentRent: number, marketRent: number | null): string {
  const lines: string[] = [
    `RERA Rent Increase Rules (Dubai Decree 43/2013):`,
    `  • 0–10% below market rate   → No increase allowed`,
    `  • 11–20% below market rate  → Max 5% increase`,
    `  • 21–30% below market rate  → Max 10% increase`,
    `  • 31–40% below market rate  → Max 15% increase`,
    `  • >40% below market rate    → Max 20% increase`,
    ``,
    `Current rent: AED ${currentRent.toLocaleString()}/year`,
    `Property area: ${area}`,
  ];

  if (marketRent) {
    const result = calculateRentIncrease(currentRent, marketRent);
    lines.push(`Market rent (index): AED ${marketRent.toLocaleString()}/year`);
    lines.push(`Result: ${result.rule}`);
    lines.push(`Max new rent: AED ${result.maxNewRent.toLocaleString()}/year`);
  } else {
    lines.push(`Action: Check the RERA Rental Index to get the market rate for ${area}.`);
    lines.push(`→ ${DLD_RENTAL_URL}`);
    lines.push(`→ ${RERA_CALCULATOR_URL}`);
  }

  return lines.join('\n');
}

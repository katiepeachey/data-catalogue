import { Submission } from './types';

export const submissions: Submission[] = [
  {
    id: 'sub_001',
    name: 'Company Social Proof',
    category: 'Firmographics',
    description:
      'Identifies and aggregates publicly available social proof signals for a company, including awards, certifications, press mentions, customer testimonials, and analyst recognition. Returns a structured summary of credibility indicators.',
    outputFields: [
      'Social Proof Score',
      'Awards & Recognition',
      'Press Mentions Count',
      'Key Testimonials',
      'Social Proof Reasoning',
    ],
    exampleValue: 'High · G2 Leader Badge, TechCrunch feature, 200+ reviews',
    exampleEvidence:
      "Company website displays a G2 'Leader' badge for Spring 2024, a TechCrunch article from March 2024 titled 'The startup changing enterprise procurement', and a testimonials page with 12 named customer quotes from Fortune 500 companies.",
    exampleUrl: 'https://www.acmecorp.com/customers',
    source: 'kernel',
    labels: ['sales-marketing', 'company-identity', 'industry-market'],
    updatedDate: '01 Mar 2025',
    status: 'pending',
    submittedAt: '2025-03-01T09:14:00Z',
  },
  {
    id: 'sub_002',
    name: 'B2B vs B2C Classification',
    category: 'Firmographics',
    description:
      'Classifies a company as primarily B2B (business-to-business), B2C (business-to-consumer), or mixed-model by analysing website copy, pricing pages, customer references, and product positioning language.',
    outputFields: [
      'Business Model',
      'Classification Confidence',
      'Classification Reasoning',
      'Target Customer Description',
    ],
    exampleValue: 'B2B · High Confidence',
    exampleEvidence:
      "Homepage headline reads 'The platform built for enterprise procurement teams'. Pricing page requires 'company size' and 'number of seats'. All case studies reference Fortune 500 clients. No consumer-facing pricing or individual sign-up flow detected.",
    exampleUrl: 'https://www.acmecorp.com/pricing',
    source: 'kernel',
    labels: ['sales-marketing', 'industry-market', 'financial-profile'],
    updatedDate: '05 Mar 2025',
    status: 'pending',
    submittedAt: '2025-03-05T14:32:00Z',
  },
  {
    id: 'sub_003',
    name: 'Website Language',
    category: 'Entity Data',
    description:
      "Detects the primary language(s) of a company's public-facing website and identifies any multilingual or localisation capabilities. Returns ISO 639-1 language codes alongside a list of detected languages and a confidence score.",
    outputFields: [
      'Primary Language',
      'All Languages Detected',
      'Language Count',
      'Localisation Detected',
      'Language Reasoning',
    ],
    exampleValue: 'English (en) · 3 languages detected',
    exampleEvidence:
      "Main site is in English. Language switcher in the footer offers French ('FR') and German ('DE') variants. /fr and /de subpaths confirmed as fully translated, not machine-translated stubs.",
    exampleUrl: 'https://www.acmecorp.com',
    source: 'kernel',
    labels: ['company-identity', 'location-geography', 'sales-marketing'],
    updatedDate: '08 Mar 2025',
    status: 'pending',
    submittedAt: '2025-03-08T11:05:00Z',
  },
];

export function getSubmission(id: string): Submission | undefined {
  return submissions.find((s) => s.id === id);
}

export function updateSubmission(
  id: string,
  updates: Partial<Submission>
): Submission | undefined {
  const index = submissions.findIndex((s) => s.id === id);
  if (index === -1) return undefined;
  submissions[index] = { ...submissions[index], ...updates };
  return submissions[index];
}

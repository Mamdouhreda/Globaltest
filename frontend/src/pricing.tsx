import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BR, DE, IN, US } from 'country-flag-icons/react/3x2';
import './guide';
import { Logo } from './logo';
import './styles.css';

// Paying for a year takes 20% off the monthly price
const ANNUAL_DISCOUNT = 0.2;

type Billing = 'monthly' | 'annual';

type Plan = {
  name: string;
  tagline: string;
  // Dollars per month when paid monthly; null for the free plan
  monthly: number | null;
  cta: string;
  popular?: boolean;
  features: string[];
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    tagline: 'For a quick look. No card needed.',
    monthly: null,
    cta: 'Start testing',
    features: [
      '4 countries: US, UK, Germany and India',
      '5 tests a day',
      'Screenshot and load time',
      'Sign in with Google',
      'Results kept for 1 day',
    ],
  },
  {
    name: 'Pro',
    tagline: 'For one person checking sites every week.',
    monthly: 15,
    cta: 'Get Pro',
    popular: true,
    features: [
      'All 27 in-country locations',
      '300 tests a month',
      '30 proxy tests in 190+ more countries',
      'Scrolling video of the whole page',
      '3 tests at the same time',
      'Results kept for 30 days',
    ],
  },
  {
    name: 'Team',
    tagline: 'For agencies and teams launching in many markets.',
    monthly: 45,
    cta: 'Get Team',
    features: [
      'Everything in Pro',
      '1,500 tests a month',
      '100 proxy tests a month',
      '5 team members',
      '10 tests at the same time',
      'API access',
      'Results kept for 90 days',
    ],
  },
];

function price(plan: Plan, billing: Billing): number {
  if (plan.monthly === null) {
    return 0;
  }
  return billing === 'annual' ? Math.round(plan.monthly * (1 - ANNUAL_DISCOUNT)) : plan.monthly;
}

function BillingToggle({ billing, onChange }: { billing: Billing; onChange: (billing: Billing) => void }) {
  return (
    <div role="radiogroup" aria-label="Billing period" className="billing-toggle">
      {(['monthly', 'annual'] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={billing === value}
          onClick={() => onChange(value)}
          className={billing === value ? 'is-checked' : ''}
        >
          {value === 'monthly' ? 'Monthly' : 'Annual'}
          {value === 'annual' && <span className="save-badge">−20%</span>}
        </button>
      ))}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-[#d03011]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function PlanCard({ plan, billing }: { plan: Plan; billing: Billing }) {
  const amount = price(plan, billing);
  return (
    <article className={`plan-card ${plan.popular ? 'is-popular' : ''}`}>
      {plan.popular && <p className="popular-badge">Most popular</p>}
      <h2 className="text-xl font-bold text-[#3a1408]">{plan.name}</h2>
      <p className="mt-1 min-h-12 text-sm text-slate-600">{plan.tagline}</p>

      <p className="mt-5 flex items-baseline gap-1">
        <span className="text-5xl font-bold tracking-tight text-[#3a1408]">${amount}</span>
        <span className="text-sm font-medium text-slate-600">{plan.monthly === null ? 'forever' : '/ month'}</span>
      </p>
      <p className="mt-1 h-5 text-sm text-slate-500">
        {plan.monthly !== null && (billing === 'annual' ? `$${amount * 12} billed once a year` : 'Billed monthly')}
      </p>

      <a href="/" className={`plan-cta ${plan.popular ? 'is-primary' : ''}`}>
        {plan.cta}
      </a>

      <ul className="mt-6 space-y-3 text-sm text-slate-700">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <CheckIcon />
            {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}

function Pricing() {
  const [billing, setBilling] = useState<Billing>('monthly');
  return (
    <main className="relative px-4 pb-16 pt-4 text-slate-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="glow glow-red" />
        <div className="glow glow-rose" />
        <div className="glow glow-peach" />
      </div>

      <div className="relative mx-auto flex max-w-6xl items-center gap-2.5">
        <a href="/" className="flex items-center gap-2.5">
          <Logo flags={[<US />, <DE />, <IN />, <BR />]} />
          <span className="text-lg font-bold tracking-tight text-[#3a1408]">GlobalTest</span>
        </a>
        <a href="/" className="text-button ml-auto rounded-full px-3 py-1.5 text-sm font-semibold">
          Run a test
        </a>
      </div>

      <div className="relative mx-auto mt-10 flex max-w-3xl flex-col items-center text-center sm:mt-14">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-[#3a1408] sm:text-[40px]">
          Real browsers in real countries, for less than a lunch
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-700 sm:text-lg">
          Start free with 4 countries. Upgrade when you need every location, videos and more tests.
        </p>
        <div className="mt-8">
          <BillingToggle billing={billing} onChange={setBilling} />
        </div>
      </div>

      <div className="relative mx-auto mt-10 grid max-w-6xl items-start gap-5 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} billing={billing} />
        ))}
      </div>

      <div className="addon relative mx-auto mt-6 max-w-6xl">
        <div>
          <p className="font-semibold text-[#3a1408]">Need more proxy tests?</p>
          <p className="text-sm text-slate-600">
            Add 25 proxy tests for $10 on any paid plan. They don't expire while you're subscribed.
          </p>
        </div>
        <a href="/" className="plan-cta mt-0 shrink-0">
          Add tests
        </a>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Pricing />
  </React.StrictMode>,
);

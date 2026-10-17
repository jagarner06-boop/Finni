// apps/mobile/src/features/onboarding/content.ts — all onboarding copy and option data.
// Strings are final. Use them verbatim (curly apostrophes included).

export type LifeStage = 'student' | 'start' | 'career' | 'family' | 'self' | 'retired';
export type PaySchedule = 'weekly' | 'biweekly' | 'semi' | 'monthly' | 'irregular';
export type HabitAnswer = 'a' | 'b';
export type HandsOn = 'watch' | 'suggest' | 'prep';
export type NotifKey = 'bills' | 'unusual' | 'goals' | 'recap';

export interface OnboardingProfile {
  firstName: string;                       // trimmed; may be '' if skipped (display "friend")
  lifeStage: LifeStage | null;
  monthlyIncome: number;                   // whole dollars, 500–12000, step 50. Default 4200
  paySchedule: PaySchedule;                // default 'biweekly'
  paydayReferenceDate?: string;           // local day when payday choices were calculated
  nextPayday: 0 | 1 | 2;                   // index into PAYDAYS. Default 0
  bills: string[];                         // labels from BILLS. Default ['Rent','Phone','Subscriptions']
  monthlyBills: number;                    // whole dollars, step 25, max = round(income*0.9/25)*25 (min 500). Default 1850
  habits: [HabitAnswer | null, HabitAnswer | null, HabitAnswer | null];
  handsOn: HandsOn;                        // default 'suggest'
  bank: { institution: string; linked: boolean } | null;
  notifications: Record<NotifKey, boolean>; // default bills, unusual, goals = true; recap = false
  quietHours: 0 | 1 | 2;                   // index into QUIET_HOURS. Default 0
}

// Icon paths are 24×24 viewBox, stroke 2.2, round caps/joins, no fill.
export const LIFE_STAGES = [
  { id: 'student', label: 'Student', sub: 'In school or just out', icon: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11' },
  { id: 'start', label: 'Starting out', sub: 'First real paychecks', icon: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6' },
  { id: 'career', label: 'Building a career', sub: 'Steady job, growing', icon: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16' },
  { id: 'family', label: 'Family', sub: 'Partner or kids', icon: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5' },
  { id: 'self', label: 'Self-employed', sub: 'Income varies', icon: 'M5 6h14v9H5zM3 18h18' },
  { id: 'retired', label: 'Winding down', sub: 'Retired or close', icon: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5' },
] as const;

export const PAY_SCHEDULES = [
  { id: 'weekly', label: 'Weekly', sub: '52 a year', short: 'weekly' },
  { id: 'biweekly', label: 'Every 2 weeks', sub: '26 a year', short: 'every 2 weeks' },
  { id: 'semi', label: 'Twice a month', sub: '1st and 15th', short: 'twice a month' },
  { id: 'monthly', label: 'Monthly', sub: '12 a year', short: 'monthly' },
  { id: 'irregular', label: 'It varies', sub: 'Gig or freelance', short: 'irregularly' },
] as const;

// Compute real dates from paySchedule at runtime; these labels are the reference for Oct 17, 2026.
export const PAYDAYS = ['Fri, Oct 23', 'Fri, Oct 30', 'Not sure'] as const;
export const INCOME_PRESETS = [2500, 4200, 6000, 9000] as const;
export const BILLS = ['Rent', 'Utilities', 'Phone', 'Car', 'Insurance', 'Subscriptions', 'Student loan', 'Childcare'] as const;

export const HABITS = [
  { q: 'When money is left at month end…', a: 'It goes to savings', b: 'It gets spent' },
  { q: 'I check my balance…', a: 'Most days', b: 'When I have to' },
  { q: 'A surprise $400 bill shows up.', a: 'I have a cushion', b: 'I would need a plan' },
] as const;

// Index = number of 'a' answers (0–3).
export const PERSONALITIES = [
  { name: 'The Fresh Start', desc: 'You want money to feel less stressful. We will build a small cushion first.', finn: 'Great place to start. I will keep things simple and flag anything urgent.', traits: ['Early heads-up before bills hit', 'A starter cushion goal', 'Plain weekly recaps'] },
  { name: 'The Free Spirit', desc: 'You enjoy your money and check in when you need to. I will do the watching.', finn: 'Love it. I will keep an eye out so you do not have to.', traits: ['Alerts only when something is off', 'Spending check-ins, not lectures', 'Round-up savings on autopilot'] },
  { name: 'The Steady One', desc: 'You have good habits and a little room. I will help it go further.', finn: 'Nice. I will look for small wins you might be missing.', traits: ['Smarter bill timing', 'Goal nudges when you are ahead', 'Subscription cleanup'] },
  { name: 'The Planner', desc: 'You save first and watch closely. I will bring the detail you like.', finn: 'A fellow planner. I will show my math every time.', traits: ['Detailed weekly breakdowns', 'Utilization and interest tips', 'Goal forecasts with dates'] },
] as const;

export const HANDS_ON = [
  { id: 'watch', label: 'Just keep watch', sub: 'I flag things. You decide what to do.', icon: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z' },
  { id: 'suggest', label: 'Suggest and ask', sub: 'I draft fixes and ask before anything moves.', icon: 'M4 5h16v11H9l-5 4zM9 10h6', recommended: true },
  { id: 'prep', label: 'Have it ready', sub: 'I line up bills and transfers so each is one tap to approve.', icon: 'M13 3L5 14h6l-1 7 8-11h-6z' },
] as const;
export const HANDS_ON_NOTE = 'Moving money always needs your OK. Moves over $100 also need Face ID.';

export const TRUST_ROWS = [
  { title: 'Read-only', sub: 'I can see balances and transactions. I cannot move money on my own.', icon: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z' },
  { title: 'Encrypted', sub: 'Your login goes straight to your bank through Plaid.', icon: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3' },
  { title: 'Disconnect anytime', sub: 'One tap in Settings removes access and data.', icon: 'M9 15l-2 2a3 3 0 0 1-4-4l2-2M15 9l2-2a3 3 0 0 1 4 4l-2 2M8 8L4 4M20 20l-4-4' },
] as const;
export const PLAID_FOOTNOTE = 'Bank connections are handled by Plaid. Finni never sees your bank password.';

// Monogram tiles: 38pt, radius 12, bg warmTrack #F1EEE7, text ink 700 15.
export const BANKS = [
  { name: 'Capital One', mono: 'C1' }, { name: 'Chase', mono: 'Ch' }, { name: 'Bank of America', mono: 'BA' },
  { name: 'Wells Fargo', mono: 'WF' }, { name: 'A credit union', mono: 'CU' },
] as const;

export const NOTIFICATIONS = [
  { id: 'bills', title: 'Bills due', sub: '3 days before, with the amount', icon: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4' },
  { id: 'unusual', title: 'Unusual spending', sub: 'Duplicate charges, price jumps', icon: 'M13 3L5 14h6l-1 7 8-11h-6z' },
  { id: 'goals', title: 'Goal milestones', sub: '25%, 50%, 75% and done', icon: 'M5 21V4h11l-2 4 2 4H5' },
  { id: 'recap', title: 'Weekly recap', sub: 'Sunday evening, one message', icon: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4' },
] as const;
export const QUIET_HOURS = ['10pm–7am', '11pm–8am', 'None'] as const;

export const COPY = {
  basics: {
    introTitle: 'Hi, I’m Finn.',
    introBody: 'Four quick decks so my advice fits your life. About three minutes, and you can skip anything.',
    askName: 'What should I call you?',
    nameLabel: 'First name',
    namePlaceholder: 'Your name',
    nameReply: (n: string) => `Nice to meet you, ${n}.`, // name in 700
    askStage: 'Which sounds most like you right now?',
    doneTitle: 'Basics done.',
    doneNext: 'Up next in deck 2: income and spending.',
  },
  income: {
    askIncome: (n: string) => `${n ? `Okay, ${n}.` : 'Okay.'} Roughly how much lands in your account each month?`,
    incomeLabel: 'Take-home per month',
    incomeRange: ['$500', '$12,000+'],
    incomeNote: 'After taxes. A rough number is fine. I’ll refine it once your bank is connected.',
    askPay: 'How often do you get paid?',
    paydayLabel: 'Next payday',
    askBills: 'Which bills come out every month?',
    billsLabel: 'About how much, together?',
    legend: ['Bills', 'Everything else'],
    leftover: (amt: string) => `That leaves about ${amt} a month for everything else.`, // amt in 700 accentPressed
    doneTitle: 'Income and bills, got it.',
    doneNext: 'Up next in deck 3: how you like to handle money.',
  },
  personality: {
    askHabits: 'This or that? No wrong answers.',
    resultEyebrow: 'Your money style',
    askHands: 'How hands-on should I be?',
    recommendedTag: 'Suggested',
    doneTitle: 'I know how you like it.',
    doneNext: 'Up next in deck 4: connect your bank and pick alerts.',
  },
  connect: {
    askBank: 'Last part. Connect your bank so I can work with real numbers.',
    pickTitle: 'Pick your bank',
    searchPlaceholder: 'Search 12,000+ banks',
    linking: (bank: string) => `Connecting to ${bank}…`,
    linkedTitle: (bank: string) => `${bank} connected`,
    linkedSub: 'I found 2 accounts. Read-only for now.',
    askNotifs: 'When should I tap you on the shoulder?',
    quietLabel: 'Quiet hours',
    finishTitle: (n: string) => `You’re all set, ${n}.`,
    finishSub: 'Here’s what I learned. Change any of it later in Settings.',
    replay: 'Replay confetti',
  },
  cta: {
    start: 'Let’s go', continue: 'Continue', seeStyle: 'See my style', connect: 'Connect with Plaid',
    chooseBank: 'Choose your bank', connecting: 'Connecting…', finishSetup: 'Finish setup', goHome: 'Go to Home',
  },
} as const;

// All money crosses our API as integer cents. Nessie speaks dollars (floats),
// so convert at the Nessie boundary only.

export type Cents = number;

export const toCents = (dollars: number): Cents => Math.round(dollars * 100);

export const toDollars = (cents: Cents): number => cents / 100;

/** 123456 → "$1,234.56", −500 → "−$5.00". */
export const formatCents = (cents: Cents): string =>
  (cents < 0 ? '−' : '') +
  '$' +
  (Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// All money crosses our API as integer cents. Nessie speaks dollars (floats),
// so convert at the Nessie boundary only.

export type Cents = number;

export const toCents = (dollars: number): Cents => Math.round(dollars * 100);

export const toDollars = (cents: Cents): number => cents / 100;

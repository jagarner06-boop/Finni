// Raw Nessie API shapes (dollars as floats, snake_case). Convert to @finni/shared types at the boundary.

export interface NessieAddress {
  street_number: string;
  street_name: string;
  city: string;
  state: string;
  zip: string;
}

export interface NessieCustomer {
  _id: string;
  first_name: string;
  last_name: string;
  address: NessieAddress;
}

export type NessieAccountType = "Checking" | "Savings" | "Credit Card";

export interface NessieAccount {
  _id: string;
  type: NessieAccountType;
  nickname: string;
  rewards: number;
  balance: number;
  customer_id: string;
}

export type NessieTxStatus = "pending" | "cancelled" | "completed" | "executed";

export interface NessiePurchase {
  _id: string;
  type: string;
  merchant_id: string;
  payer_id: string;
  purchase_date: string;
  amount: number;
  status: NessieTxStatus;
  medium: "balance" | "rewards";
  description?: string;
}

export interface NessieTransfer {
  _id: string;
  type: string;
  transaction_date: string;
  status: NessieTxStatus;
  medium: "balance" | "rewards";
  payer_id: string;
  payee_id: string;
  amount: number;
  description?: string;
}

export interface NessieDeposit {
  _id: string;
  type: string;
  transaction_date: string;
  status: NessieTxStatus;
  payee_id: string;
  medium: "balance" | "rewards";
  amount: number;
  description?: string;
}

export type NessieWithdrawal = Omit<NessieDeposit, "payee_id"> & { payer_id: string };

export interface NessieMerchant {
  _id: string;
  name: string;
  category: string;
  address?: NessieAddress;
  geocode?: { lat: number; lng: number };
}

export interface NessieBill {
  _id: string;
  status: "pending" | "cancelled" | "completed" | "recurring";
  payee: string;
  nickname?: string;
  creation_date?: string;
  payment_date?: string;
  recurring_date?: number;
  upcoming_payment_date?: string;
  payment_amount: number;
  account_id: string;
}

export interface NessieAtm {
  _id: string;
  name: string;
  language_list: string[];
  geocode: { lat: number; lng: number };
  hours: string[];
  accessibility: boolean;
  amount_left: number;
  address?: NessieAddress;
}

export interface NessieCreateResponse<T> {
  code: number;
  message: string;
  objectCreated: T;
}

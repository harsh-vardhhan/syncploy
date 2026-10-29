import type { Topic } from "./topic";

export interface BudgetOptions {
  amount: number;
  unit?: string;
  topic?: Topic | string;
  threshold?: number;
  logicalId?: string;
  budgetName?: string;
  filterByStack?: boolean;
}

export class Budget {
  readonly id: string;
  readonly options: BudgetOptions;

  constructor(id: string, options: BudgetOptions) {
    this.id = id;
    this.options = options;
  }
}

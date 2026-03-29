import type { ImportedTxnKind, StatementSource } from "@prisma/client";

export type ParsedStatementRow = {
  txnDate: Date;
  description: string;
  externalRef?: string | null;
  expenseAmount: number;
  kind: ImportedTxnKind;
};

export type { ImportedTxnKind, StatementSource };

export const STATEMENT_MAX_BYTES = 2_000_000;
export const STATEMENT_MAX_ROWS = 3000;

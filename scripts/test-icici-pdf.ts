import fs from "fs";
import pdfParse from "pdf-parse";
import { parseIciciBankPdfText } from "../lib/statement-parsers/icici-pdf";

void (async () => {
  const buf = fs.readFileSync(process.argv[2]!);
  const d = await pdfParse(buf);
  const rows = parseIciciBankPdfText(d.text);
  console.log("rows", rows.length);
  const exp = rows.filter((r) => r.kind === "EXPENSE");
  console.log("expense sum", Math.round(exp.reduce((s, r) => s + r.expenseAmount, 0)));
  const big = rows.filter((r) => r.expenseAmount > 100000);
  console.log("big", big.length);
})();

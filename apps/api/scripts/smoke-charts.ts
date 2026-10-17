// Chart builders check without Gemini: fresh seeded user → build each chart → compare with the source data.
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db/client.js";
import { listAccounts } from "../src/services/accounts.js";
import { approveAction, createAction } from "../src/services/actions.js";
import { balanceHistoryChart, incomeVsSpendingChart, spendingBreakdownChart, spendingOverTimeChart, type ChartCard } from "../src/services/charts.js";
import { spendingSummary } from "../src/services/spending.js";
import { bootstrapUser } from "../src/services/users.js";

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
};
const show = (c: ChartCard) =>
  console.log(`  [${c.kind}] ${c.title} · ${c.subtitle ?? ""}\n` + c.labels.map((l, i) => `    ${l.padEnd(14)} ${c.series.map((s) => `${s.name}=$${s.valuesCents[i] / 100}`).join("  ")}`).join("\n"));
const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);

const { user } = await bootstrapUser(`smoke|charts-${Date.now()}`, { firstName: "Alex" });
for (let i = 0; i < 60 && !(await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))?.seededAt; i++) await new Promise((r) => setTimeout(r, 1000));

const breakdown = await spendingBreakdownChart(user, 30, "category");
show(breakdown);
const summary = await spendingSummary(user, 30, "category");
check("donut slices add up to the spending total", sum(breakdown.series[0].valuesCents) === summary.totalCents && breakdown.totalCents === summary.totalCents, summary.totalCents / 100);
check("donut has at most 6 slices", breakdown.labels.length <= 6);

const week = await spendingOverTimeChart(user, 7);
show(week);
check("7-day chart has 7 daily bars", week.labels.length === 7);
check("7-day bars add up to the 7-day total", sum(week.series[0].valuesCents) === week.totalCents, week.totalCents! / 100);
const month = await spendingOverTimeChart(user, 30);
check("30-day chart is weekly", month.subtitle!.startsWith("Per week"), month.labels.length);

const checking = (await listAccounts(user)).find((a) => a.type === "Checking")!;
const balance = await balanceHistoryChart(user, 60);
show({ ...balance, labels: balance.labels.filter((_, i) => i % 10 === 9), series: [{ ...balance.series[0], valuesCents: balance.series[0].valuesCents.filter((_, i) => i % 10 === 9) }] });
check("balance line ends at the live balance", balance.series[0].valuesCents.at(-1) === checking.balanceCents, checking.balanceCents / 100);
check("balance line never goes negative", balance.series[0].valuesCents.every((v) => v >= 0), Math.min(...balance.series[0].valuesCents) / 100);

// Own transfers must not count as spending.
const savings = (await listAccounts(user)).find((a) => a.nickname === "Rainy Day")!;
const before = await incomeVsSpendingChart(user, 2);
await approveAction(user, (await createAction(user, { type: "transfer", fromAccountId: checking.id, toAccountId: savings.id, amountCents: 5000 }, "ui")).id);
const after = await incomeVsSpendingChart(user, 2);
show(after);
check("income vs spending has In and Out", after.series.map((s) => s.name).join() === "In,Out");
check("paychecks show up as In", after.series[0].valuesCents.some((v) => v >= 62000), after.series[0].valuesCents.map((v) => v / 100));
check("a $50 transfer to savings is not spending", sum(after.series[1].valuesCents) === sum(before.series[1].valuesCents));
const balanceAfter = await balanceHistoryChart(user, 7);
check("balance line still ends at live balance after a transfer", balanceAfter.series[0].valuesCents.at(-1) === checking.balanceCents - 5000);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);

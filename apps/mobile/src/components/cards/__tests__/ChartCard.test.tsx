import type { Card } from '@finni/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { CardRenderer } from '@/components/cards/CardRenderer';

type Chart = Extract<Card, { type: 'chart' }>;

const donut: Chart = {
  type: 'chart',
  kind: 'donut',
  title: 'Spending by category',
  subtitle: 'Last 30 days',
  labels: ['Groceries', 'Food delivery', 'Coffee'],
  series: [{ name: 'Spent', valuesCents: [25000, 17000, 7600] }],
  totalCents: 49600,
};

const bars: Chart = {
  type: 'chart',
  kind: 'bar',
  title: 'Money in vs out',
  labels: ['Wk Sep 28', 'Wk Oct 5'],
  series: [
    { name: 'In', valuesCents: [62000, 0] },
    { name: 'Out', valuesCents: [88500, 17900] },
  ],
};

const line: Chart = {
  type: 'chart',
  kind: 'line',
  title: 'Everyday balance',
  labels: ['Oct 1', 'Oct 2', 'Oct 3'],
  series: [{ name: 'Balance', valuesCents: [75700, 75100, 124000] }],
};

/** The plot only draws once it knows its width. */
async function renderChart(card: Chart) {
  await render(<CardRenderer card={card} />);
  await fireEvent(screen.getByLabelText(new RegExp(`^${card.title}\\.`)), 'layout', { nativeEvent: { layout: { width: 300, height: 200, x: 0, y: 0 } } });
}

describe('ChartCard', () => {
  it('draws a donut with its total and a legend with percentages', async () => {
    await renderChart(donut);
    expect(screen.getByText('Spending by category')).toBeTruthy();
    expect(screen.getByText('$496.00')).toBeTruthy();
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('draws grouped bars with a series legend', async () => {
    await renderChart(bars);
    expect(screen.getByText('In')).toBeTruthy();
    expect(screen.getByText('Out')).toBeTruthy();
    expect(screen.getByText('$885')).toBeTruthy(); // axis max
  });

  it('draws a line with start, end and range', async () => {
    await renderChart(line);
    expect(screen.getByText('$1,240.00')).toBeTruthy(); // current value, full amount
    expect(screen.getByText('low $751 · high $1,240')).toBeTruthy();
  });

  it('describes the chart for screen readers', async () => {
    await render(<CardRenderer card={line} />);
    expect(screen.getByLabelText('Everyday balance. Oct 1 $757.00, Oct 2 $751.00, Oct 3 $1,240.00')).toBeTruthy();
  });

  it('says so when there is nothing to chart', async () => {
    await render(<CardRenderer card={{ ...bars, series: [{ name: 'Out', valuesCents: [0, 0] }] }} />);
    expect(screen.getByText('Nothing to chart yet.')).toBeTruthy();
  });
});

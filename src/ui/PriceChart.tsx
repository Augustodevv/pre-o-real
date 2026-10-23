import {
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useEffect, useRef } from 'react';
import { formatDay } from '../core/dates';
import { formatBRL } from '../core/price';
import type { PriceRecord } from '../core/types';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler, Legend);

const DAY_MS = 86_400_000;

function dayToTime(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function timeToDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

interface Props {
  history: PriceRecord[];
  average: number | null;
  height?: number;
}

/** Gráfico do histórico de preços. */
export function PriceChart({ history, average, height = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return;
    const points = history.map((r) => ({ x: dayToTime(r.day), y: r.price }));
    const pixPoints = history.filter((r) => r.pixPrice !== null).map((r) => ({ x: dayToTime(r.day), y: r.pixPrice! }));
    const first = points[0]!.x;
    const last = points[points.length - 1]!.x;
    // Com um único dia, abre uma janela para o ponto não ficar colado na borda.
    const min = first === last ? first - 3 * DAY_MS : first;
    const max = first === last ? last + 3 * DAY_MS : last;

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Preço',
            data: points,
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            fill: true,
            tension: 0.25,
            pointRadius: points.length > 40 ? 0 : 3,
            // Pontos vazados: dias que vieram do histórico compartilhado.
            pointBackgroundColor: history.map((r) => (r.community ? '#ffffff' : '#059669')),
            pointHoverRadius: 5,
          },
          ...(pixPoints.length
            ? [
                {
                  label: 'No Pix',
                  data: pixPoints,
                  borderColor: '#0ea5e9',
                  borderDash: [4, 3],
                  pointRadius: 0,
                  fill: false,
                  tension: 0.25,
                },
              ]
            : []),
          ...(average !== null
            ? [
                {
                  label: 'Média 30 dias',
                  data: [
                    { x: min, y: average },
                    { x: max, y: average },
                  ],
                  borderColor: '#94a3b8',
                  borderDash: [6, 4],
                  borderWidth: 1,
                  pointRadius: 0,
                  pointHoverRadius: 0,
                  fill: false,
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'nearest', intersect: false },
        scales: {
          x: {
            type: 'linear',
            min,
            max,
            ticks: {
              maxTicksLimit: 5,
              callback: (value) => formatDay(timeToDay(Number(value))).slice(0, 5),
              font: { size: 10 },
            },
            grid: { display: false },
          },
          y: {
            ticks: {
              maxTicksLimit: 5,
              callback: (value) => formatBRL(Number(value)).replace(/,00$/, ''),
              font: { size: 10 },
            },
            grace: '10%',
          },
        },
        plugins: {
          legend: {
            display: pixPoints.length > 0 || average !== null,
            position: 'bottom',
            labels: { boxWidth: 12, boxHeight: 2, font: { size: 10 } },
          },
          tooltip: {
            callbacks: {
              title: (items) => formatDay(timeToDay(items[0]!.parsed.x ?? 0)),
              label: (item) => `${item.dataset.label}: ${formatBRL(item.parsed.y ?? 0)}`,
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [history, average]);

  return (
    <div style={{ position: 'relative', height }}>
      <canvas ref={canvasRef} role="img" aria-label="Gráfico do histórico de preços" />
    </div>
  );
}

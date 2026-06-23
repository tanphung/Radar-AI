"use client";

import {
  AreaSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarketChart, type ChartRange } from "@/lib/data/coinDetail";

interface Props {
  id: string;
  positive: boolean;
}

const RANGES: ChartRange[] = ["1D", "1W", "1M", "1Y", "ALL"];

export function ChartBlock({ id, positive }: Props) {
  const [range, setRange] = useState<ChartRange>("1W");
  const { data, isLoading, error } = useMarketChart(id, range);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        textColor: "#9ca3af",
        background: { type: ColorType.Solid, color: "transparent" },
      },
      grid: {
        vertLines: { color: "rgba(42,47,62,0.6)" },
        horzLines: { color: "rgba(42,47,62,0.6)" },
      },
      timeScale: { timeVisible: true, borderColor: "#2a2f3e" },
      rightPriceScale: { borderColor: "#2a2f3e" },
      crosshair: { horzLine: { color: "#3b82f6" }, vertLine: { color: "#3b82f6" } },
      autoSize: true,
    });
    const series = chart.addSeries(AreaSeries, {
      topColor: "rgba(59,130,246,0.35)",
      bottomColor: "rgba(59,130,246,0)",
      lineColor: "#3b82f6",
      lineWidth: 2,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    seriesRef.current?.applyOptions({
      topColor: positive
        ? "rgba(34,197,94,0.35)"
        : "rgba(239,68,68,0.35)",
      bottomColor: positive ? "rgba(34,197,94,0)" : "rgba(239,68,68,0)",
      lineColor: positive ? "#22c55e" : "#ef4444",
    });
  }, [positive]);

  useEffect(() => {
    if (!data || !seriesRef.current) return;
    const points = data.map((p) => ({
      time: p.time as UTCTimestamp,
      value: p.value,
    }));
    seriesRef.current.setData(points);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="px-4 py-4 md:px-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Price chart</h2>
        <Tabs value={range} onValueChange={(v) => setRange(v as ChartRange)}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r} value={r}>
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="relative h-80 w-full overflow-hidden rounded-md border border-border bg-card">
        <div ref={containerRef} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Chart data unavailable right now.
          </div>
        )}
        {isLoading && !data && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading chart…
          </div>
        )}
      </div>
    </div>
  );
}

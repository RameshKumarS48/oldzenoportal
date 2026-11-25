"use client";

/** A card's result drawn in its view, or the state it is in when there is nothing to draw. */
import dynamic from "next/dynamic";
import type { Result } from "@/lib/dashboards/query";
import { isEmpty } from "@/lib/dashboards/query";
import type { Card, ViewId } from "@/lib/dashboards/types";
import { CategoryBars, Donut, FlowView, Histogram, IndexedLines, MatrixBars, PairBars, ScatterView, TimeChart, TreemapView, TwoCharts, Waterfall } from "./views/ChartViews";
import { BoxPlot, CalendarHeat, DataTable, FunnelView, GaugeView, HeatGrid, NumberView, PairView, PivotTable, RecordsTable, RetentionGrid, TargetView, Tiles, TopList } from "./views/GridViews";

const MapView = dynamic(() => import("./views/MapView"), { ssr: false, loading: () => <div className="h-full animate-pulse rounded-lg bg-slate-100" /> });

export function Message({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="grid h-full place-items-center px-4 text-center text-xs text-slate-500"><div>{children}{action && <div className="mt-2">{action}</div>}</div></div>;
}

const LINK = "font-medium text-zeno-teal underline-offset-2 hover:underline";

export function CardBody({ card, view, result, compareLabel, onRetry, onRemove }: {
  card: Card;
  view: ViewId | null;
  result: Result;
  compareLabel: string;
  onRetry: () => void;
  /** Offered when the card's data is gone. */
  onRemove?: () => void;
}) {
  if (result.type === "note") return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{card.text}</p>;
  if (result.type === "error") {
    if (result.code === "missing") return <Message action={onRemove && <button type="button" onClick={onRemove} className={LINK}>Remove this card</button>}>The data this card used is no longer available.</Message>;
    if (result.code === "too_large") return <Message>This is too much to draw. Choose a shorter time range or a larger time step.</Message>;
    return <Message action={<button type="button" onClick={onRetry} className={LINK}>Try again</button>}>This card couldn’t load.</Message>;
  }
  if (isEmpty(result)) return <Message>No data in this period.</Message>;

  switch (result.type) {
    case "value":
      if (view === "target") return <TargetView result={result} target={card.target ?? 0} />;
      if (view === "gauge") return <GaugeView result={result} target={card.target ?? 0} />;
      if (view === "pair") return <PairView result={result} />;
      return <NumberView result={result} compareLabel={compareLabel} />;
    case "series":
      if (view === "calendar") return <CalendarHeat result={result} />;
      if (view === "waterfall") return <Waterfall result={result} />;
      if (view === "combo") return <TwoCharts result={result} />;
      if (view === "lines2") return <IndexedLines result={result} />;
      if (view === "area" || view === "columns" || view === "stacked_area" || view === "stacked_columns" || view === "stacked_100") return <TimeChart result={result} mode={view} />;
      return <TimeChart result={result} mode={result.series.length > 1 ? "lines" : "line"} />;
    case "groups":
      if (view === "map") return <MapView result={result} />;
      if (view === "columns_cat") return <CategoryBars result={result} mode="columns_cat" />;
      if (view === "donut") return <Donut result={result} />;
      if (view === "treemap") return <TreemapView result={result} />;
      if (view === "table") return <DataTable result={result} />;
      if (view === "toplist") return <TopList result={result} />;
      if (view === "tiles") return <Tiles result={result} />;
      if (view === "waterfall") return <Waterfall result={result} />;
      if (view === "scatter") return <ScatterView result={result} />;
      if (view === "pair_bars") return <PairBars result={result} />;
      return <CategoryBars result={result} mode="bars" />;
    case "matrix":
      if (view === "hourweek") return <HeatGrid result={result} showValues={false} />;
      if (view === "heatgrid") return <HeatGrid result={result} showValues />;
      if (view === "pivot") return <PivotTable result={result} />;
      return <MatrixBars result={result} mode={view === "grouped_bars" ? "grouped_bars" : "stacked_bars"} />;
    case "hist": return <Histogram result={result} />;
    case "box": return <BoxPlot result={result} />;
    case "funnel": return <FunnelView result={result} />;
    case "flow": return <FlowView result={result} />;
    case "retention": return <RetentionGrid result={result} />;
    case "records": return <RecordsTable result={result} />;
  }
}

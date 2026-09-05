'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Calendar, 
  FileText, 
  Info, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { LabResultRecord } from '@/types/clinical';
import { formatDate, getInterpretationBadgeProps } from '@/lib/utils/formatters';

interface LabTrendsChartProps {
  labResults: LabResultRecord[];
}

export default function LabTrendsChart({ labResults }: LabTrendsChartProps) {
  // 1. Group tests by name
  const testsByName = useMemo(() => {
    const map = new Map<string, LabResultRecord[]>();
    for (const lab of labResults) {
      const name = lab.testName.trim();
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(lab);
    }

    // Sort each test history chronologically (oldest to newest)
    for (const [name, list] of map.entries()) {
      list.sort((a, b) => new Date(a.testDate || a.createdAt).getTime() - new Date(b.testDate || b.createdAt).getTime());
    }

    return map;
  }, [labResults]);

  const testNames = Array.from(testsByName.keys());
  const [selectedTestName, setSelectedTestName] = useState<string>(testNames[0] || '');
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    lab: LabResultRecord;
    x: number;
    y: number;
  } | null>(null);

  const currentHistory = testsByName.get(selectedTestName) || [];
  const latestResult = currentHistory[currentHistory.length - 1];

  // If selected test is not in list, fallback
  const activeTest = selectedTestName && testsByName.has(selectedTestName) ? selectedTestName : testNames[0] || '';
  const activeHistory = testsByName.get(activeTest) || [];

  // 2. Compute chart coordinates
  const chartData = useMemo(() => {
    if (activeHistory.length === 0) return null;

    const values = activeHistory.map(h => h.numericValue !== null && h.numericValue !== undefined ? h.numericValue : parseFloat(h.measuredValue) || 0);
    const refLows = activeHistory.map(h => h.refRangeLow).filter((v): v is number => v !== null && v !== undefined);
    const refHighs = activeHistory.map(h => h.refRangeHigh).filter((v): v is number => v !== null && v !== undefined);

    const allNumbers = [...values, ...refLows, ...refHighs];
    const minVal = Math.min(...allNumbers);
    const maxVal = Math.max(...allNumbers);
    const padding = (maxVal - minVal) * 0.25 || 2;
    const yMin = Math.max(0, minVal - padding);
    const yMax = maxVal + padding;

    const width = 600;
    const height = 220;
    const paddingX = 50;
    const paddingY = 30;

    const getX = (index: number) => {
      if (activeHistory.length === 1) return width / 2;
      return paddingX + (index / (activeHistory.length - 1)) * (width - paddingX * 2);
    };

    const getY = (val: number) => {
      if (yMax === yMin) return height / 2;
      return height - paddingY - ((val - yMin) / (yMax - yMin)) * (height - paddingY * 2);
    };

    const points = activeHistory.map((lab, index) => {
      const val = lab.numericValue !== null && lab.numericValue !== undefined ? lab.numericValue : parseFloat(lab.measuredValue) || 0;
      return {
        x: getX(index),
        y: getY(val),
        val,
        lab,
        date: formatDate(lab.testDate || lab.createdAt),
      };
    });

    const refLow = refLows[0] !== undefined ? refLows[0] : null;
    const refHigh = refHighs[0] !== undefined ? refHighs[0] : null;

    const refLowY = refLow !== null ? getY(refLow) : null;
    const refHighY = refHigh !== null ? getY(refHigh) : null;

    return {
      points,
      refLow,
      refHigh,
      refLowY,
      refHighY,
      width,
      height,
      yMin,
      yMax,
    };
  }, [activeHistory]);

  if (testNames.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
        No numeric laboratory test results available for longitudinal trend visualization.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-5">
      {/* Header & Test Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Longitudinal Lab Trajectory & Range Visualizer
            </h3>
            <p className="text-xs text-slate-500">
              Historical progression plotted strictly against source-report reference boundaries.
            </p>
          </div>
        </div>

        {/* Dropdown test selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium">Select Test:</label>
          <select
            value={activeTest}
            onChange={(e) => setSelectedTestName(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {testNames.map((name) => (
              <option key={name} value={name}>
                {name} ({testsByName.get(name)?.length} record{(testsByName.get(name)?.length || 0) > 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Trajectory Metrics Card */}
      {latestResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Latest Measured</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm font-mono">
              {latestResult.measuredValue} {latestResult.unit || ''}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Source Reference Range</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
              {latestResult.referenceRangeText || 'Unavailable in Report'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Current Status</span>
            <span className={`inline-flex items-center gap-1 font-semibold text-xs mt-0.5 ${
              latestResult.interpretation === 'NORMAL'
                ? 'text-emerald-600 dark:text-emerald-400'
                : latestResult.interpretation === 'LOW' || latestResult.interpretation === 'HIGH'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-500'
            }`}>
              {latestResult.interpretation}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Observations Tracked</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
              {activeHistory.length} point{activeHistory.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Interactive SVG Chart */}
      {chartData && (
        <div className="relative p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="w-full h-56 overflow-visible"
          >
            {/* Shaded Reference Range Band if High & Low are known */}
            {chartData.refLowY !== null && chartData.refHighY !== null && (
              <rect
                x="40"
                y={chartData.refHighY}
                width={chartData.width - 80}
                height={Math.max(2, chartData.refLowY - chartData.refHighY)}
                fill="rgba(16, 185, 129, 0.08)"
                stroke="rgba(16, 185, 129, 0.3)"
                strokeDasharray="4 4"
              />
            )}

            {/* Upper Reference Line */}
            {chartData.refHighY !== null && (
              <g>
                <line
                  x1="40"
                  y1={chartData.refHighY}
                  x2={chartData.width - 40}
                  y2={chartData.refHighY}
                  stroke="rgba(249, 115, 22, 0.5)"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />
                <text
                  x={chartData.width - 35}
                  y={chartData.refHighY + 3}
                  fill="#fb923c"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  High: {chartData.refHigh}
                </text>
              </g>
            )}

            {/* Lower Reference Line */}
            {chartData.refLowY !== null && (
              <g>
                <line
                  x1="40"
                  y1={chartData.refLowY}
                  x2={chartData.width - 40}
                  y2={chartData.refLowY}
                  stroke="rgba(245, 158, 11, 0.5)"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                />
                <text
                  x={chartData.width - 35}
                  y={chartData.refLowY + 3}
                  fill="#fbbf24"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  Low: {chartData.refLow}
                </text>
              </g>
            )}

            {/* Historical Connecting Line */}
            {chartData.points.length > 1 && (
              <polyline
                fill="none"
                stroke="#14b8a6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={chartData.points.map(p => `${p.x},${p.y}`).join(' ')}
              />
            )}

            {/* Data Points */}
            {chartData.points.map((pt, idx) => {
              const isLow = pt.lab.interpretation === 'LOW';
              const isHigh = pt.lab.interpretation === 'HIGH';
              const isNormal = pt.lab.interpretation === 'NORMAL';
              const fillColor = isNormal ? '#10b981' : isLow ? '#f59e0b' : isHigh ? '#f97316' : '#94a3b8';

              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint({ index: idx, lab: pt.lab, x: pt.x, y: pt.y })}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill={fillColor}
                    stroke="#0f172a"
                    strokeWidth="2"
                    className="hover:r-7 transition-all"
                  />
                  {/* Date label at bottom */}
                  <text
                    x={pt.x}
                    y={chartData.height - 8}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {pt.date}
                  </text>
                  {/* Numeric value floating above point */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    fill="#f1f5f9"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {pt.val}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip Card */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none p-2.5 rounded-lg bg-slate-900 border border-teal-500/40 text-slate-200 text-[11px] shadow-xl z-20"
              style={{
                left: Math.min(chartData.width - 150, Math.max(10, hoveredPoint.x - 60)),
                top: Math.max(10, hoveredPoint.y - 65),
              }}
            >
              <div className="font-bold text-teal-300">
                {hoveredPoint.lab.testName}: {hoveredPoint.lab.measuredValue} {hoveredPoint.lab.unit || ''}
              </div>
              <div className="text-[10px] text-slate-400">
                Date: {formatDate(hoveredPoint.lab.testDate)} • Status: [{hoveredPoint.lab.interpretation}]
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Ref: {hoveredPoint.lab.referenceRangeText || 'Unavailable'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

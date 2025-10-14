"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip, LabelList } from 'recharts';

interface DailyStats {
  date: string;
  totalFeedings: number;
  totalAmount?: number;
  totalFeedingDuration?: number;
  totalDiapers: number;
  wetDiapers: number;
  dirtyDiapers: number;
  totalSleep?: number;
}

interface StatsChartsProps {
  className?: string;
}

export function StatsCharts({ className = "" }: StatsChartsProps) {
  const [data, setData] = useState<DailyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats?days=7');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setData(result.data.dailyStats);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getChartData = () => {
    return data.map(item => ({
      ...item,
      date: formatDate(item.date),
      sleepHours: item.totalSleep ? Math.round(item.totalSleep / 60 * 10) / 10 : 0,
      amountMl: item.totalAmount || 0,
      durationMin: item.totalFeedingDuration || 0,
    }));
  };



  if (isLoading) {
    return (
      <div className={`bg-white p-4 lg:p-6 rounded-lg shadow-sm border ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white p-4 lg:p-6 rounded-lg shadow-sm border ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Overview</h3>
        <div className="text-center py-12">
          <p className="text-gray-500">📊 Your beautiful patterns will appear here as you track more moments! ✨</p>
          <p className="text-sm text-gray-400 mt-1">
            Add some events to see your weekly patterns
          </p>
        </div>
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className={`bg-white p-4 lg:p-6 rounded-lg shadow-sm border ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Overview</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Feeding Chart */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-600 text-center">🍼 Feeding</h4>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.map(d => ({
                ...d,
                // Normalize to show on same scale - convert ml to "units" and minutes to "units"
                amountUnits: Math.round(d.amountMl / 10), // 1 unit = 10ml
                durationUnits: d.durationMin, // 1 unit = 1 minute
              }))}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'amountUnits') return [`${props.payload.amountMl}ml`, 'Total Amount'];
                    if (name === 'durationUnits') return [`${value}min`, 'Total Duration'];
                    return [value, name];
                  }}
                />
                <Bar 
                  dataKey="amountUnits" 
                  stackId="feeding"
                  fill="#3b82f6" 
                  name="amountUnits"
                />
                <Bar 
                  dataKey="durationUnits" 
                  stackId="feeding"
                  fill="#60a5fa" 
                  name="durationUnits"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-center text-gray-500">
            <span className="inline-flex items-center mr-3">
              <div className="w-3 h-3 bg-blue-600 rounded mr-1"></div>
              Amount (10ml units)
            </span>
            <span className="inline-flex items-center">
              <div className="w-3 h-3 bg-blue-400 rounded mr-1"></div>
              Duration (min)
            </span>
          </div>
        </div>

        {/* Diaper Chart */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-600 text-center">👶 Diapers</h4>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'wetDiapers') return [`${value}`, 'Wet'];
                    if (name === 'dirtyDiapers') return [`${value}`, 'Dirty'];
                    return [value, name];
                  }}
                />
                <Bar 
                  dataKey="wetDiapers" 
                  stackId="a"
                  fill="#10b981" 
                  name="wetDiapers"
                >
                  <LabelList 
                    dataKey="wetDiapers" 
                    position="center" 
                    style={{ fontSize: '10px', fill: 'white', fontWeight: 'bold' }}
                    formatter={(value: any) => (typeof value === 'number' && value > 0) ? `${value}W` : ''}
                  />
                </Bar>
                <Bar 
                  dataKey="dirtyDiapers" 
                  stackId="a"
                  fill="#059669" 
                  name="dirtyDiapers"
                >
                  <LabelList 
                    dataKey="dirtyDiapers" 
                    position="center" 
                    style={{ fontSize: '10px', fill: 'white', fontWeight: 'bold' }}
                    formatter={(value: any) => (typeof value === 'number' && value > 0) ? `${value}D` : ''}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-center text-gray-500">
            <span className="inline-flex items-center mr-3">
              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
              Wet
            </span>
            <span className="inline-flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded mr-1"></div>
              Dirty
            </span>
          </div>
        </div>

        {/* Sleep Chart */}
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <h4 className="text-sm font-medium text-purple-600 text-center">😴 Sleep</h4>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value: number) => [`${value}h`, 'Sleep Hours']}
                />
                <Line 
                  type="monotone" 
                  dataKey="sleepHours" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-center text-gray-500">
            Total sleep hours per day
          </div>
        </div>
      </div>
    </div>
  );
}
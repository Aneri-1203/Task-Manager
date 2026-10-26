import React from 'react';
import { PieChart, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';

/**
 * Heavy Chart & Analytics Visualizer component.
 * Loaded dynamically via React.lazy() to reduce initial bundle overhead.
 */
export const LazyChart = ({ stats }) => {
  const { total = 0, pending = 0, inProgress = 0, completed = 0, completionRate = 0 } = stats || {};

  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Progress Breakdown Bar */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#4f46e5" /> Status Distribution Analysis
          </h3>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#6366f1', background: '#eef2ff', padding: '4px 12px', borderRadius: '20px' }}>
            {completionRate}% Overall Efficiency
          </span>
        </div>

        {/* Multi-segment distribution visualizer */}
        <div style={{ height: '24px', width: '100%', borderRadius: '12px', background: '#f1f5f9', display: 'flex', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ width: `${completedPct}%`, background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.8s ease' }} title={`Completed: ${completedPct}%`} />
          <div style={{ width: `${inProgressPct}%`, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', transition: 'width 0.8s ease' }} title={`In Progress: ${inProgressPct}%`} />
          <div style={{ width: `${pendingPct}%`, background: 'linear-gradient(90deg, #f59e0b, #d97706)', transition: 'width 0.8s ease' }} title={`Pending: ${pendingPct}%`} />
        </div>

        {/* Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#065f46', fontWeight: '600' }}>
              <CheckCircle size={14} color="#10b981" /> Completed
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#047857', marginTop: '4px' }}>
              {completed} <span style={{ fontSize: '12px', fontWeight: '500' }}>({completedPct}%)</span>
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>
              <Clock size={14} color="#3b82f6" /> In Progress
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1d4ed8', marginTop: '4px' }}>
              {inProgress} <span style={{ fontSize: '12px', fontWeight: '500' }}>({inProgressPct}%)</span>
            </div>
          </div>

          <div style={{ padding: '12px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
              <AlertCircle size={14} color="#f59e0b" /> Pending
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#b45309', marginTop: '4px' }}>
              {pending} <span style={{ fontSize: '12px', fontWeight: '500' }}>({pendingPct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LazyChart;

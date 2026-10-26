import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  BarChart3,
  Calendar,
  FileDown,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';
import LoadingFallback from '../components/LoadingFallback';

// ==================================================
// Heavy Component Lazy Loading
// (Demonstrating Supplementary Problem 1: Lazy load heavy component only when needed)
// ==================================================
const LazyChart = lazy(() => import('../components/LazyChart'));

export const Analytics = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, completionRate: 0 });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getStats({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const handleDownloadPdf = (status = '') => {
    const url = api.downloadPdfUrl(status, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      allUsers: isAdmin ? 'true' : undefined,
    });
    window.open(url, '_blank');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={26} color="var(--primary)" /> Performance Analytics & Reports
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            Comprehensive workflow tracking and real-time report generation.
          </p>
        </div>

        {/* PDF Download Button */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleDownloadPdf()}
            className="btn btn-primary"
            style={{ background: '#4f46e5' }}
          >
            <FileDown size={16} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Lazy Loading Information Notice Banner */}
      <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#4f46e5', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Cpu size={20} />
        </div>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#312e81', marginBottom: '2px' }}>
            Code-Split Heavy Analytics Module (Practical 8 Optimization)
          </h4>
          <p style={{ fontSize: '13px', color: '#4338ca' }}>
            The chart visualizer below is loaded on-demand using <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>React.lazy(() =&gt; import('../components/LazyChart'))</code> and wrapped inside a <code style={{ background: '#ffffff', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>&lt;Suspense&gt;</code> boundary to save initial bundle bandwidth.
          </p>
        </div>
      </div>

      {/* Date Filter Card */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
            <Calendar size={15} color="#4f46e5" /> Filter Date Range:
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#64748b' }}>From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#334155' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#64748b' }}>To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', color: '#334155' }}
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="btn btn-secondary btn-sm"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
          Total In Scope: <strong>{stats.total}</strong> Tasks
        </div>
      </div>

      {/* Suspense Boundary for Heavy LazyChart Component */}
      <Suspense fallback={<LoadingFallback message="Loading heavy chart analytics module dynamically..." minDelay={150} />}>
        <LazyChart stats={stats} />
      </Suspense>
    </div>
  );
};

export default Analytics;

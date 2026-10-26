import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
  FileDown,
  Users,
  ShieldCheck
} from 'lucide-react';
import TaskModal from '../components/TaskModal';

export const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, completionRate: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Default to showing tasks of that individual user (with toggle to all team for admin/manager)
  const [viewMode, setViewMode] = useState('self');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = (isAdmin || isManager) && viewMode === 'all' ? {} : { self: 'true' };
      const [statsRes, tasksRes] = await Promise.all([
        api.getStats(params),
        api.getTasks(params),
      ]);
      if (statsRes.success) setStats(statsRes.stats);
      if (tasksRes.success) setRecentTasks(tasksRes.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode]);

  const handleCreateTask = async (taskData) => {
    await api.createTask(taskData);
    fetchData();
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)', borderRadius: '18px', padding: '32px', color: '#ffffff', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 10px 25px rgba(49, 46, 129, 0.2)' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>
            <ShieldCheck size={15} /> Logged in as {user?.role?.toUpperCase()}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px' }}>
            Welcome back, {user?.username}! 👋
          </h1>
          <p style={{ opacity: 0.9, fontSize: '14px', maxWidth: '560px' }}>
            {isAdmin
              ? 'You have Full Administrator access. You can assign tasks to any employee, manage team roles, and download enterprise reports.'
              : isManager
              ? 'You are managing your team. You can assign tasks to your employees, monitor progress, and add your own tasks.'
              : 'Here is your personalized task overview. Track your assigned tasks and update completion status.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary" style={{ background: '#ffffff', color: '#4338ca', fontWeight: '700' }}>
            <Plus size={16} /> New Task
          </button>
          <Link to="/projects" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
            View All Tasks <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-cols-3" style={{ marginBottom: '28px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListTodo size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Total Tasks</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{stats.total}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>In Progress</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{stats.inProgress}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Completed</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{stats.completed} ({stats.completionRate}%)</div>
          </div>
        </div>
      </div>

      {/* Recent Tasks Preview */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
              {viewMode === 'self' ? `My Tasks & Recent Activity (${user?.username})` : 'All Team Tasks & Activity'}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              {viewMode === 'self' ? 'Showing tasks of this individual (assigned to or created by you)' : 'Showing all organization / team tasks'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {(isAdmin || isManager) && (
              <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('self')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'self' ? '#ffffff' : 'transparent',
                    color: viewMode === 'self' ? '#4f46e5' : '#64748b',
                    boxShadow: viewMode === 'self' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'all' ? '#ffffff' : 'transparent',
                    color: viewMode === 'all' ? '#4f46e5' : '#64748b',
                    boxShadow: viewMode === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  All Team
                </button>
              </div>
            )}
            <Link to={viewMode === 'self' ? '/projects?self=true' : '/projects'} style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View Project Board <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading tasks...</div>
        ) : recentTasks.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            No tasks found. Click "New Task" above to get started!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTasks.map((t) => (
              <div
                key={t._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {t.title}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>
                    Assigned to: <strong>{t.assignedTo?.username || t.user?.username || 'Self'}</strong> &bull; Priority: {t.priority?.toUpperCase()}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    background: t.status === 'completed' ? '#ecfdf5' : t.status === 'in-progress' ? '#eff6ff' : '#fffbeb',
                    color: t.status === 'completed' ? '#047857' : t.status === 'in-progress' ? '#1d4ed8' : '#b45309',
                  }}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateTask}
      />
    </div>
  );
};

export default Dashboard;

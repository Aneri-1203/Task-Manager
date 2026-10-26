import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  ArrowRightCircle,
  User,
  ShieldCheck,
  UserCheck,
  LayoutGrid,
  Columns,
  X
} from 'lucide-react';
import TaskModal from '../components/TaskModal';

export const Projects = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlUserId = searchParams.get('userId') || '';
  const urlUserName = searchParams.get('userName') || '';
  const urlSelf = searchParams.get('self') === 'true';

  const [tasks, setTasks] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Individual task filter states:
  // - selectedUserId: if filtering by a specific individual
  // - viewScope: 'self' (show tasks of this logged-in individual) or 'all' (show all team tasks)
  const [selectedUserId, setSelectedUserId] = useState(urlUserId);
  const [selectedUserName, setSelectedUserName] = useState(urlUserName);
  const [viewScope, setViewScope] = useState(
    urlUserId ? 'individual' : (urlSelf ? 'self' : 'self')
  );
  // View mode: 'board' (Kanban columns) or 'grid' (standard cards)
  const [viewMode, setViewMode] = useState('board');

  // Load team members list for Admin and Manager individual dropdown filter
  useEffect(() => {
    if (isAdmin || isManager) {
      api.getUsers()
        .then((res) => {
          if (res.success && res.users) {
            setUsersList(res.users);
          }
        })
        .catch((err) => console.error('Failed to load users for filter:', err));
    }
  }, [isAdmin, isManager]);

  // Synchronize when URL search parameters change
  useEffect(() => {
    if (urlUserId) {
      setSelectedUserId(urlUserId);
      setSelectedUserName(urlUserName);
      setViewScope('individual');
    } else if (urlSelf) {
      setSelectedUserId('');
      setSelectedUserName('');
      setViewScope('self');
    }
  }, [urlUserId, urlUserName, urlSelf]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {
        status: statusFilter,
        priority: priorityFilter,
      };

      if (selectedUserId) {
        params.userId = selectedUserId;
      } else if (viewScope === 'self') {
        params.self = 'true';
      }

      const res = await api.getTasks(params);
      if (res.success) {
        setTasks(res.data);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter, selectedUserId, viewScope]);

  const handleSaveTask = async (taskData, id) => {
    if (id) {
      await api.updateTask(id, taskData);
      setFeedbackMsg('Task updated successfully!');
    } else {
      await api.createTask(taskData);
      setFeedbackMsg('Task created and assigned successfully!');
    }
    loadTasks();
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(id);
      setFeedbackMsg('Task deleted successfully!');
      loadTasks();
      setTimeout(() => setFeedbackMsg(''), 3500);
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  // Quick forward workflow transition: Pending -> In Progress -> Completed
  const handleQuickAdvance = async (task) => {
    let nextStatus = '';
    if (task.status === 'pending') nextStatus = 'in-progress';
    else if (task.status === 'in-progress') nextStatus = 'completed';
    else return;

    try {
      await api.updateTask(task._id, { status: nextStatus });
      setFeedbackMsg(`Task moved to ${nextStatus.toUpperCase()}!`);
      loadTasks();
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err) {
      alert(err.message || 'Could not update status');
    }
  };

  const handleSelectIndividual = (userId, userName = '') => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    if (userId) {
      setViewScope('individual');
      setSearchParams({ userId, ...(userName ? { userName } : {}) });
    } else {
      setViewScope('all');
      setSearchParams({});
    }
  };

  const handleSwitchToMyTasks = () => {
    setSelectedUserId('');
    setSelectedUserName('');
    setViewScope('self');
    setSearchParams({ self: 'true' });
  };

  const handleSwitchToAllTeam = () => {
    setSelectedUserId('');
    setSelectedUserName('');
    setViewScope('all');
    setSearchParams({});
  };

  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      (t.assignedTo?.username && t.assignedTo.username.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  const pendingTasks = filteredTasks.filter((t) => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in-progress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  // Helper to render an individual task card
  const renderTaskCard = (task) => {
    const isCompleted = task.status === 'completed';
    const isInProgress = task.status === 'in-progress';
    const isPending = task.status === 'pending';

    const assignedToUser = task.assignedTo?.username || task.user?.username || 'Self';
    const assignedByUser = task.assignedBy?.username || 'Self';

    let priorityBadgeColor = { bg: '#e2e8f0', text: '#475569' };
    if (task.priority === 'high') priorityBadgeColor = { bg: '#fee2e2', text: '#b91c1c' };
    if (task.priority === 'medium') priorityBadgeColor = { bg: '#fef3c7', text: '#b45309' };
    if (task.priority === 'low') priorityBadgeColor = { bg: '#dcfce7', text: '#15803d' };

    return (
      <div
        key={task._id}
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderTop: `4px solid ${task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981'}`,
          background: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          position: 'relative',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                background: priorityBadgeColor.bg,
                color: priorityBadgeColor.text,
              }}
            >
              {task.priority} Priority
            </span>

            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '20px',
                background: isCompleted ? '#ecfdf5' : isInProgress ? '#eff6ff' : '#fffbeb',
                color: isCompleted ? '#047857' : isInProgress ? '#1d4ed8' : '#b45309',
              }}
            >
              {task.status.toUpperCase()}
            </span>
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            {task.title}
          </h3>

          {task.description && (
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', lineHeight: '1.5' }}>
              {task.description}
            </p>
          )}

          {/* Assignee / Assigner Info */}
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '14px' }}>
            <div style={{ color: '#334155', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} color="#4f46e5" /> Assigned To: <span style={{ color: '#0f172a' }}>{assignedToUser}</span>
            </div>
            {task.assignedBy && task.assignedBy._id !== task.user?._id && (
              <div style={{ color: '#64748b', marginTop: '2px', fontSize: '11px' }}>
                Assigned By: {assignedByUser} ({task.assignedBy?.role || 'Staff'})
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {!isCompleted ? (
              <button
                onClick={() => handleQuickAdvance(task)}
                className="btn btn-sm"
                style={{
                  background: isPending ? '#eff6ff' : '#ecfdf5',
                  color: isPending ? '#2563eb' : '#059669',
                  fontWeight: '600',
                }}
                title={isPending ? 'Start working on this task' : 'Mark task completed'}
              >
                <ArrowRightCircle size={14} /> {isPending ? 'Start Task' : 'Mark Complete'}
              </button>
            ) : (
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Completed
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => {
                setEditingTask(task);
                setIsModalOpen(true);
              }}
              className="btn btn-secondary btn-sm"
              title="Edit Task"
            >
              <Edit size={13} />
            </button>
            <button
              onClick={() => handleDelete(task._id)}
              className="btn btn-danger btn-sm"
              title="Delete Task"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderKanban size={26} color="var(--primary)" /> Tasks & Project Board
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {selectedUserId
              ? `Showing tasks of individual: ${selectedUserName || 'Selected Member'}`
              : viewScope === 'self'
              ? `Showing tasks of individual: You (${user?.username})`
              : isAdmin
              ? 'Admin Mode: Viewing tasks across the whole organization'
              : 'Manager Mode: Viewing tasks across team members'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Mode Toggle: Board vs Grid */}
          <div style={{ display: 'inline-flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('board')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'board' ? '#ffffff' : 'transparent',
                color: viewMode === 'board' ? '#4338ca' : '#64748b',
                boxShadow: viewMode === 'board' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Columns size={14} /> Board View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#4338ca' : '#64748b',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid size={14} /> Grid View
            </button>
          </div>

          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div style={{ padding: '12px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
          ✓ {feedbackMsg}
        </div>
      )}

      {/* Individual Filter Active Banner */}
      {(selectedUserId || viewScope === 'individual') && (
        <div style={{ marginBottom: '16px', padding: '10px 16px', background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3730a3', fontSize: '13px', fontWeight: '600' }}>
            <User size={16} />
            <span>Viewing tasks for individual: <strong>{selectedUserName || 'Selected Member'}</strong> ({filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'})</span>
          </div>
          <button
            type="button"
            onClick={handleSwitchToMyTasks}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #c7d2fe',
              color: '#4338ca',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <X size={13} /> Reset to My Tasks
          </button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        {/* Quick Scope Switcher: My Tasks vs All Team */}
        {(isAdmin || isManager) && (
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={handleSwitchToMyTasks}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: viewScope === 'self' && !selectedUserId ? '#ffffff' : 'transparent',
                color: viewScope === 'self' && !selectedUserId ? '#4f46e5' : '#64748b',
                boxShadow: viewScope === 'self' && !selectedUserId ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <User size={13} /> My Tasks
            </button>
            <button
              type="button"
              onClick={handleSwitchToAllTeam}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                background: viewScope === 'all' && !selectedUserId ? '#ffffff' : 'transparent',
                color: viewScope === 'all' && !selectedUserId ? '#4f46e5' : '#64748b',
                boxShadow: viewScope === 'all' && !selectedUserId ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <ShieldCheck size={13} /> All Team
            </button>
          </div>
        )}

        {/* Filter by Specific Individual (Dropdown) */}
        {(isAdmin || isManager) && (
          <div style={{ flex: '1 1 200px' }}>
            <select
              value={selectedUserId}
              onChange={(e) => {
                const id = e.target.value;
                const foundUser = usersList.find((u) => u._id === id);
                handleSelectIndividual(id, foundUser?.username || '');
              }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#334155' }}
            >
              <option value="">Filter by Individual Member...</option>
              <option value={user?.id}>👤 Myself ({user?.username} - {user?.role})</option>
              {usersList
                .filter((u) => u._id !== user?.id)
                .map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.username} ({member.role})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div style={{ flex: '1 1 220px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or assignee..."
            style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
        </div>

        {/* Status Filter (especially useful in Grid view) */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#334155' }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#334155' }}
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Main Board / Grid Content */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <div className="loading-spinner-ring" style={{ margin: '0 auto 12px' }}></div>
          Loading tasks for this individual...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
          <FolderKanban size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>No tasks found for this individual</h3>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>
            {selectedUserId || viewScope === 'self'
              ? 'No tasks are currently assigned to or created by this individual. Click "New Task" to create one!'
              : 'Try adjusting your filters or click "New Task" to create one.'}
          </p>
        </div>
      ) : viewMode === 'board' ? (
        /* KANBAN PROJECT BOARD VIEW (Pending, In Progress, Completed Columns) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* Column 1: Pending */}
          <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></span>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Pending
                </h3>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309' }}>
                {pendingTasks.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '120px' }}>
              {pendingTasks.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  No pending tasks
                </div>
              ) : (
                pendingTasks.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></span>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  In Progress
                </h3>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8' }}>
                {inProgressTasks.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '120px' }}>
              {inProgressTasks.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  No in-progress tasks
                </div>
              ) : (
                inProgressTasks.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div style={{ background: '#f8fafc', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Completed
                </h3>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#ecfdf5', color: '#047857' }}>
                {completedTasks.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '120px' }}>
              {completedTasks.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', background: '#ffffff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  No completed tasks yet
                </div>
              ) : (
                completedTasks.map(renderTaskCard)
              )}
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredTasks.map(renderTaskCard)}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        task={editingTask}
      />
    </div>
  );
};

export default Projects;

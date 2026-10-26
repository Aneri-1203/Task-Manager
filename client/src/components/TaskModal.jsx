import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, Plus, Edit2, AlertCircle, Sparkles, Loader2, CheckCircle2, Clock } from 'lucide-react';

export const TaskModal = ({ isOpen, onClose, onSave, task = null }) => {
  const { user, isAdmin, isManager } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [assignedTo, setAssignedTo] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Practical 13: AI Task Description Generator states
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState('');
  const [isDemoResult, setIsDemoResult] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [cooldownTitle, setCooldownTitle] = useState('');

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'pending');
      setAssignedTo(task.assignedTo?._id || task.user?._id || user?.id || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('pending');
      setAssignedTo(user?.id || '');
    }
    setError('');
    setAiSuccessMessage('');
    setAiErrorMessage('');
    setIsDemoResult(false);
    setCooldownSeconds(0);
    setCooldownTitle('');
  }, [task, isOpen, user]);

  useEffect(() => {
    if ((isAdmin || isManager) && isOpen) {
      setLoadingUsers(true);
      api.getUsers()
        .then((res) => {
          if (res.success && res.users) {
            setUsersList(res.users);
          }
        })
        .catch((err) => console.error('Failed to load user list:', err))
        .finally(() => setLoadingUsers(false));
    }
  }, [isAdmin, isManager, isOpen]);

  // Real-time frontend rate-limit cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAiErrorMessage('');
          return 0;
        }
        const remaining = prev - 1;
        setAiErrorMessage(`Rate limit reached. Please wait ${remaining}s before requesting another suggestion for this task title.`);
        return remaining;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  // Handle title change - if user switches to a different title, reset the title-specific cooldown UI
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (cooldownTitle && newTitle.trim().toLowerCase() !== cooldownTitle) {
      setCooldownSeconds(0);
      setCooldownTitle('');
      if (aiErrorMessage.includes('Rate limit reached')) {
        setAiErrorMessage('');
      }
    }
  };

  // Practical 13: Handle AI Task Description Generation
  const handleGenerateAIDescription = async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setAiErrorMessage('Please enter a task title first before generating a description.');
      return;
    }

    if (cooldownSeconds > 0) {
      return;
    }

    setIsGeneratingAI(true);
    setAiErrorMessage('');
    setAiSuccessMessage('');
    setIsDemoResult(false);

    try {
      const res = await api.generateAIDescription(trimmedTitle);

      if (res && res.description) {
        setDescription(res.description);
        setIsDemoResult(Boolean(res.demo));
        if (res.demo) {
          setAiSuccessMessage(res.message || 'Demo mode: Locally generated task description (Offline Demonstration). Review and edit below.');
        } else {
          setAiSuccessMessage('AI description suggestion generated! You can review and edit it below.');
        }
        setCooldownSeconds(0);
        setCooldownTitle('');
      } else if (res && res.fallback) {
        if (res.remainingSeconds) {
          setCooldownSeconds(res.remainingSeconds);
          setCooldownTitle(trimmedTitle.toLowerCase());
        }
        setAiErrorMessage(res.message || 'AI suggestions are temporarily unavailable. Please enter the description manually.');
      }
    } catch (err) {
      console.warn('AI generation error:', err);
      const data = err.data || {};
      const remaining = err.remainingSeconds || data.remainingSeconds || data.retryAfter;

      if (data.errorCategory === 'TEMPORARY_RATE_LIMIT' && remaining) {
        setCooldownSeconds(remaining);
        setCooldownTitle(trimmedTitle.toLowerCase());
        setAiErrorMessage(err.message || `OpenAI rate limit reached. Please wait ${remaining}s before retrying.`);
      } else if (remaining && !data.errorCategory) {
        setCooldownSeconds(remaining);
        setCooldownTitle(trimmedTitle.toLowerCase());
        setAiErrorMessage(`Rate limit reached. Please wait ${remaining}s before requesting another suggestion for this task title.`);
      } else {
        setAiErrorMessage(err.message || 'AI service is temporarily unavailable. Please enter the description manually.');
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
      };

      if (isAdmin || isManager) {
        payload.assignedTo = assignedTo || user?.id;
      }

      await onSave(payload, task?._id);
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Status options with forward only indicator
  const statusRanks = { pending: 1, 'in-progress': 2, completed: 3 };
  const currentRank = task ? statusRanks[task.status] || 1 : 1;

  const isButtonDisabled = isGeneratingAI || !title.trim() || cooldownSeconds > 0;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? <Edit2 size={18} color="var(--primary)" /> : <Plus size={18} color="var(--primary)" />}
            {isEditing ? 'Update Task' : 'Create New Task'}
          </h2>
          <button onClick={onClose} style={{ color: '#64748b', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '16px 24px 0', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. Prepare DBMS practical file"
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
            />
          </div>

          {/* Description Header with AI Button */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                Description
              </label>

              {/* Practical 13: Generate Description AI Button */}
              <button
                type="button"
                onClick={handleGenerateAIDescription}
                disabled={isButtonDisabled}
                title={
                  !title.trim()
                    ? 'Enter a task title first to generate AI description'
                    : cooldownSeconds > 0
                    ? `Rate limit active. Please wait ${cooldownSeconds}s`
                    : 'Generate task description using AI'
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isButtonDisabled ? '#94a3b8' : '#4338ca',
                  background: isButtonDisabled ? '#f8fafc' : '#eef2ff',
                  border: '1px solid',
                  borderColor: isButtonDisabled ? '#e2e8f0' : '#c7d2fe',
                  borderRadius: '6px',
                  padding: '5px 11px',
                  cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    Generating...
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>
                    <Clock size={13} color="#94a3b8" />
                    Wait {cooldownSeconds}s
                  </>
                ) : (
                  <>
                    <Sparkles size={13} color={!title.trim() ? '#94a3b8' : '#6366f1'} />
                    Generate Description
                  </>
                )}
              </button>
            </div>

            {/* AI Success Feedback */}
            {aiSuccessMessage && (
              <div
                style={{
                  marginBottom: '8px',
                  padding: '8px 12px',
                  background: isDemoResult ? '#f0fdfa' : '#f0fdf4',
                  border: '1px solid',
                  borderColor: isDemoResult ? '#99f6e4' : '#bbf7d0',
                  borderRadius: '6px',
                  color: isDemoResult ? '#0f766e' : '#15803d',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={14} />
                <span>
                  {isDemoResult && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginRight: '6px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: '#0d9488',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Demo Mode
                    </span>
                  )}
                  {aiSuccessMessage}
                </span>
              </div>
            )}

            {/* AI Error / Fallback Feedback */}
            {aiErrorMessage && (
              <div style={{ marginBottom: '8px', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', color: '#b45309', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} />
                <span>{aiErrorMessage}</span>
              </div>
            )}

            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key deliverables, acceptance criteria, or notes (or click 'Generate Description')..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
            />

            {/* Practical 13: Responsible AI Disclaimer */}
            <p style={{ marginTop: '5px', fontSize: '11px', color: '#64748b', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>ℹ️</span>
              <span>
                {isDemoResult
                  ? 'Demo suggestion (offline demonstration): Generated locally without external API calls. Please review and edit before saving.'
                  : 'AI-generated suggestion: Please review and edit the description before saving. AI-generated content may be inaccurate.'}
              </span>
            </p>
          </div>

          {/* RBAC: Assignee Selector for Admin / Manager */}
          {(isAdmin || isManager) && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                {isAdmin ? 'Assign To (Any User / Employee)' : 'Assign To (My Team / Employee)'}
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
              >
                <option value={user?.id}>Assign to Myself ({user?.username} - {user?.role})</option>
                {usersList
                  .filter((u) => u._id !== user?.id)
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.username} ({u.email}) — [{u.role.toUpperCase()}]
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Priority & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
              >
                <option value="pending" disabled={isEditing && currentRank > 1}>
                  Pending {isEditing && currentRank > 1 ? '(Locked)' : ''}
                </option>
                <option value="in-progress" disabled={isEditing && currentRank > 2}>
                  In Progress {isEditing && currentRank > 2 ? '(Locked)' : ''}
                </option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;

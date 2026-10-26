import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  ShieldCheck,
  UserCheck,
  User,
  Plus,
  Edit2,
  Mail,
  Calendar,
  CheckCircle,
  AlertCircle,
  FolderKanban
} from 'lucide-react';
import TaskModal from '../components/TaskModal';

export const TeamManagement = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [editingRoleUserId, setEditingRoleUserId] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newManagerId, setNewManagerId] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      if (res.success) {
        setUsersList(res.users);
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAssignTaskToUser = (targetUser) => {
    setSelectedUser(targetUser);
    setIsTaskModalOpen(true);
  };

  const handleUpdateRole = async (targetUserId) => {
    try {
      await api.updateUserRole(targetUserId, {
        role: newRole,
        managerId: newManagerId || null,
      });
      setFeedbackMsg('User role & hierarchy updated successfully!');
      setEditingRoleUserId(null);
      loadUsers();
      setTimeout(() => setFeedbackMsg(''), 3500);
    } catch (err) {
      alert(err.message || 'Failed to update user');
    }
  };

  const managersList = usersList.filter((u) => u.role === 'manager' || u.role === 'admin');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} color="var(--primary)" /> {isAdmin ? 'Team & Role Management (RBAC)' : 'My Assigned Employees'}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {isAdmin
              ? 'Administrators can assign tasks to any employee, change user roles, and configure manager-employee hierarchies.'
              : 'Managers can assign tasks to employees under their supervision and track team work.'}
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div style={{ padding: '12px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
          ✓ {feedbackMsg}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <div className="loading-spinner-ring" style={{ margin: '0 auto 12px' }}></div>
          Loading team roster...
        </div>
      ) : usersList.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <Users size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
          <h3>No team members found</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {usersList.map((member) => {
            const isSelf = member._id === user?.id;
            const isEditingThisUser = editingRoleUserId === member._id;

            let badgeClass = 'employee';
            if (member.role === 'admin') badgeClass = 'admin';
            if (member.role === 'manager') badgeClass = 'manager';

            return (
              <div key={member._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className={`badge-role ${badgeClass}`}>
                      {member.role === 'admin' && <ShieldCheck size={13} />}
                      {member.role === 'manager' && <UserCheck size={13} />}
                      {(member.role === 'employee' || member.role === 'user') && <User size={13} />}
                      {member.role?.toUpperCase()}
                    </span>
                    {isSelf && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: '12px' }}>
                        You
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {member.username}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Mail size={13} /> {member.email}
                  </div>

                  {member.manager && (
                    <div style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                      Reporting Manager: <strong>{member.manager.username}</strong>
                    </div>
                  )}

                  {/* Admin role modification inline panel */}
                  {isAdmin && isEditingThisUser ? (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '10px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Role:</label>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginTop: '4px' }}
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Assign Manager:</label>
                        <select
                          value={newManagerId}
                          onChange={(e) => setNewManagerId(e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginTop: '4px' }}
                        >
                          <option value="">None / Independent</option>
                          {managersList
                            .filter((m) => m._id !== member._id)
                            .map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.username} ({m.role})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingRoleUserId(null)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateRole(member._id)}
                          className="btn btn-primary btn-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      to={`/projects?userId=${member._id}&userName=${encodeURIComponent(member.username)}`}
                      className="btn btn-secondary btn-sm"
                      title={`View tasks of ${member.username}`}
                    >
                      <FolderKanban size={13} /> View Tasks
                    </Link>
                    <button
                      onClick={() => handleAssignTaskToUser(member)}
                      className="btn btn-primary btn-sm"
                    >
                      <Plus size={13} /> Assign Task
                    </button>
                  </div>

                  {isAdmin && !isEditingThisUser && (
                    <button
                      onClick={() => {
                        setEditingRoleUserId(member._id);
                        setNewRole(member.role || 'employee');
                        setNewManagerId(member.manager?._id || '');
                      }}
                      className="btn btn-secondary btn-sm"
                      title="Edit User Role"
                    >
                      <Edit2 size={13} /> Edit Role
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal with target user preselected */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={async (taskData) => {
          await api.createTask({
            ...taskData,
            assignedTo: selectedUser?._id || user?.id,
          });
          setFeedbackMsg(`Task assigned to ${selectedUser?.username || 'user'} successfully!`);
          setTimeout(() => setFeedbackMsg(''), 3500);
        }}
      />
    </div>
  );
};

export default TeamManagement;

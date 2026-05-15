import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const statuses = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DONE', label: 'Done' }
];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function formatDate(date) {
  if (!date) return 'No date';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(date));
}

function isOverdue(task) {
  return task.status !== 'DONE' && new Date(task.dueDate) < new Date();
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

async function api(path, options = {}) {
  const token = localStorage.getItem('ttm_token');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.');
  }
  return data;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const isLogin = mode === 'login';
  const isForgot = mode === 'forgot';

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setResetUrl('');
    setLoading(true);

    try {
      if (isForgot) {
        const data = await api('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email: form.email })
        });
        setMessage(data.message || 'Reset link prepared.');
        if (data.resetUrl) setResetUrl(data.resetUrl);
        return;
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      localStorage.setItem('ttm_token', data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="logo-badge">TT</div>
        <p className="eyebrow">Full-Stack Assignment Ready</p>
        <h1>Plan projects, assign tasks, and track team progress beautifully.</h1>
        <p className="hero-copy">
          A production-style task manager with secure authentication, project teams, role-based access,
          dashboard metrics, overdue tracking, and a working password reset flow.
        </p>
        <div className="feature-grid">
          <span>JWT Auth</span>
          <span>Admin / Member</span>
          <span>REST APIs</span>
          <span>PostgreSQL</span>
        </div>
      </section>

      <section className="auth-card card">
        <div className="auth-tabs">
          <button className={cx(mode === 'login' && 'active')} onClick={() => setMode('login')}>Login</button>
          <button className={cx(mode === 'signup' && 'active')} onClick={() => setMode('signup')}>Signup</button>
        </div>

        <h2>{isForgot ? 'Reset your password' : isLogin ? 'Welcome back' : 'Create your account'}</h2>
        <p className="muted">
          {isForgot
            ? 'Enter your registered email. A reset link will be generated for demo/testing.'
            : isLogin
              ? 'Use your email and password to continue.'
              : 'Start by creating a secure profile.'}
        </p>

        <form onSubmit={submit} className="stack">
          {!isLogin && !isForgot && (
            <label>
              Name
              <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" required />
          </label>
          {!isForgot && (
            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Minimum 6 characters" required />
            </label>
          )}

          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}
          {resetUrl && (
            <a className="reset-link" href={resetUrl}>
              Open reset link
            </a>
          )}

          <button className="primary-btn" disabled={loading}>
            {loading ? 'Please wait...' : isForgot ? 'Send reset link' : isLogin ? 'Login' : 'Create account'}
          </button>
        </form>

        <button className="link-btn" onClick={() => setMode(isForgot ? 'login' : 'forgot')}>
          {isForgot ? 'Back to login' : 'Forgot password? Reset it'}
        </button>
      </section>
    </main>
  );
}

function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password })
      });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page single">
      <section className="auth-card card reset-card">
        <div className="logo-badge">TT</div>
        <h2>Create new password</h2>
        <p className="muted">Choose a new password for your Team Task Manager account.</p>
        <form onSubmit={submit} className="stack">
          <label>
            New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          <label>
            Confirm password
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
          </label>
          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}
          <button className="primary-btn" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</button>
        </form>
        <a className="link-btn center" href="/">Go to login</a>
      </section>
    </main>
  );
}

function Sidebar({ projects, activeProjectId, setActiveProjectId, onCreateProject, user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  async function createProject(event) {
    event.preventDefault();
    setError('');
    try {
      await onCreateProject(form);
      setForm({ name: '', description: '' });
      setOpen(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo-badge small">TT</div>
        <div>
          <strong>TaskFlow Pro</strong>
          <span>Team workspace</span>
        </div>
      </div>

      <button className="primary-btn full" onClick={() => setOpen(!open)}>{open ? 'Close form' : '+ New Project'}</button>

      {open && (
        <form className="mini-form" onSubmit={createProject}>
          <input placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <textarea placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {error && <div className="alert error">{error}</div>}
          <button>Create</button>
        </form>
      )}

      <div className="project-list">
        {projects.map((project) => (
          <button
            key={project.id}
            className={cx('project-item', activeProjectId === project.id && 'active')}
            onClick={() => setActiveProjectId(project.id)}
          >
            <span>{project.name}</span>
            <small>{project.role} • {project.progress}% done</small>
          </button>
        ))}
      </div>

      <div className="user-box">
        <div className="avatar">{user?.name?.slice(0, 1)?.toUpperCase()}</div>
        <div>
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
        </div>
        <button className="logout" onClick={onLogout}>Logout</button>
      </div>
    </aside>
  );
}

function StatCards({ dashboard }) {
  const summary = dashboard?.summary || {};
  const status = dashboard?.statusCounts || { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  return (
    <div className="stats-grid">
      <div className="stat-card card">
        <span>Total Tasks</span>
        <strong>{summary.totalTasks || 0}</strong>
      </div>
      <div className="stat-card card">
        <span>Completion</span>
        <strong>{summary.completionRate || 0}%</strong>
      </div>
      <div className="stat-card card warning">
        <span>Overdue</span>
        <strong>{summary.overdueTasks || 0}</strong>
      </div>
      <div className="stat-card card">
        <span>In Progress</span>
        <strong>{status.IN_PROGRESS || 0}</strong>
      </div>
    </div>
  );
}

function DashboardPanel({ dashboard }) {
  const status = dashboard?.statusCounts || { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  const total = Math.max(1, Object.values(status).reduce((sum, value) => sum + value, 0));

  return (
    <div className="dashboard-grid">
      <section className="card panel">
        <div className="panel-header">
          <h3>Status breakdown</h3>
          <span>{dashboard?.role || 'MEMBER'} view</span>
        </div>
        {statuses.map((item) => (
          <div className="bar-row" key={item.key}>
            <div className="bar-label"><span>{item.label}</span><strong>{status[item.key] || 0}</strong></div>
            <div className="bar-track"><div className={`bar-fill ${item.key.toLowerCase()}`} style={{ width: `${((status[item.key] || 0) / total) * 100}%` }} /></div>
          </div>
        ))}
      </section>

      <section className="card panel">
        <div className="panel-header">
          <h3>Tasks per user</h3>
          <span>Workload</span>
        </div>
        {(dashboard?.tasksPerUser || []).length === 0 && <p className="muted">No tasks yet.</p>}
        {(dashboard?.tasksPerUser || []).map((user) => (
          <div className="person-row" key={user.userId}>
            <span>{user.name}</span>
            <strong>{user.count}</strong>
          </div>
        ))}
      </section>

      <section className="card panel">
        <div className="panel-header">
          <h3>Overdue tasks</h3>
          <span>Needs attention</span>
        </div>
        {(dashboard?.overdueTasks || []).length === 0 && <p className="muted">No overdue tasks. Great work!</p>}
        {(dashboard?.overdueTasks || []).map((task) => (
          <div className="overdue-row" key={task.id}>
            <strong>{task.title}</strong>
            <span>{formatDate(task.dueDate)} • {task.assignee?.name || 'Unassigned'}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function MembersPanel({ project, onRefresh }) {
  const [form, setForm] = useState({ email: '', role: 'MEMBER' });
  const [error, setError] = useState('');
  const isAdmin = project?.currentUserRole === 'ADMIN';

  async function addMember(event) {
    event.preventDefault();
    setError('');
    try {
      await api(`/api/projects/${project.id}/members`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm({ email: '', role: 'MEMBER' });
      onRefresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMember(userId) {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await api(`/api/projects/${project.id}/members/${userId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function changeRole(userId, role) {
    try {
      await api(`/api/projects/${project.id}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <section className="card panel members-panel">
      <div className="panel-header">
        <h3>Team Members</h3>
        <span>{project?.members?.length || 0} people</span>
      </div>
      <div className="members-list">
        {project?.members?.map((member) => (
          <div className="member-row" key={member.id}>
            <div className="avatar mini">{member.user.name.slice(0, 1).toUpperCase()}</div>
            <div className="member-info">
              <strong>{member.user.name}</strong>
              <span>{member.user.email}</span>
            </div>
            {isAdmin ? (
              <select value={member.role} onChange={(e) => changeRole(member.userId, e.target.value)}>
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            ) : (
              <span className="pill">{member.role}</span>
            )}
            {isAdmin && project.ownerId !== member.userId && (
              <button className="ghost danger" onClick={() => removeMember(member.userId)}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <form className="add-member" onSubmit={addMember}>
          <input type="email" placeholder="Registered user email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button>Add</button>
          {error && <div className="alert error">{error}</div>}
        </form>
      )}
    </section>
  );
}

function TaskCard({ task, canEditAll, canUpdateOwn, members, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    dueDate: task.dueDate?.slice(0, 10),
    priority: task.priority,
    status: task.status,
    assigneeId: task.assignee?.id || ''
  });

  async function submit(event) {
    event.preventDefault();
    await onUpdate(task.id, {
      ...form,
      dueDate: new Date(form.dueDate).toISOString(),
      assigneeId: form.assigneeId || null
    });
    setEditing(false);
  }

  if (editing && canEditAll) {
    return (
      <form className="task-card editing" onSubmit={submit}>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="two-col">
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((p) => <option key={p}>{p}</option>)}</select>
        </div>
        <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
          <option value="">Unassigned</option>
          {members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}
        </select>
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        <div className="task-actions"><button>Save</button><button type="button" className="ghost" onClick={() => setEditing(false)}>Cancel</button></div>
      </form>
    );
  }

  return (
    <article className={cx('task-card', isOverdue(task) && 'overdue')}>
      <div className="task-topline">
        <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
        {isOverdue(task) && <span className="overdue-pill">Overdue</span>}
      </div>
      <h4>{task.title}</h4>
      {task.description && <p>{task.description}</p>}
      <div className="task-meta">
        <span>Due {formatDate(task.dueDate)}</span>
        <span>{task.assignee?.name || 'Unassigned'}</span>
      </div>
      {(canEditAll || canUpdateOwn) && (
        <div className="task-actions">
          <select value={task.status} onChange={(e) => onUpdate(task.id, { status: e.target.value })}>
            {statuses.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
          </select>
          {canEditAll && <button className="ghost" onClick={() => setEditing(true)}>Edit</button>}
          {canEditAll && <button className="ghost danger" onClick={() => onDelete(task.id)}>Delete</button>}
        </div>
      )}
    </article>
  );
}

function CreateTaskModal({ project, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM', assigneeId: '' });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await api(`/api/projects/${project.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          dueDate: new Date(form.dueDate).toISOString(),
          assigneeId: form.assigneeId || null
        })
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal card">
        <div className="panel-header">
          <h3>Create task</h3>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
        <form className="stack" onSubmit={submit}>
          <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
          <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="two-col">
            <label>Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required /></label>
            <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{priorities.map((p) => <option key={p}>{p}</option>)}</select></label>
          </div>
          <label>Assign to
            <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              <option value="">Unassigned</option>
              {project.members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}
            </select>
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="primary-btn">Create task</button>
        </form>
      </section>
    </div>
  );
}

function TaskBoard({ tasks, project, user, onRefresh }) {
  const isAdmin = project?.currentUserRole === 'ADMIN';

  async function updateTask(taskId, patch) {
    try {
      await api(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(patch) });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    try {
      await api(`/api/tasks/${taskId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="board">
      {statuses.map((status) => (
        <section className="board-column" key={status.key}>
          <div className="column-title">
            <h3>{status.label}</h3>
            <span>{tasks.filter((task) => task.status === status.key).length}</span>
          </div>
          {tasks.filter((task) => task.status === status.key).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={project.members || []}
              canEditAll={isAdmin}
              canUpdateOwn={task.assignee?.id === user.id}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
          {tasks.filter((task) => task.status === status.key).length === 0 && <p className="empty-col">No tasks here.</p>}
        </section>
      ))}
    </div>
  );
}

function Workspace({ user, setUser }) {
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [error, setError] = useState('');

  async function loadProjects(selectFirst = false) {
    const data = await api('/api/projects');
    setProjects(data.projects);
    if ((selectFirst || !activeProjectId) && data.projects.length > 0) {
      setActiveProjectId(data.projects[0].id);
    }
    if (data.projects.length === 0) setActiveProjectId('');
    return data.projects;
  }

  async function loadProjectData(projectId = activeProjectId) {
    if (!projectId) {
      setProject(null);
      setTasks([]);
      setDashboard(null);
      return;
    }
    const [projectData, tasksData, dashboardData] = await Promise.all([
      api(`/api/projects/${projectId}`),
      api(`/api/projects/${projectId}/tasks`),
      api(`/api/dashboard/project/${projectId}`)
    ]);
    setProject(projectData.project);
    setTasks(tasksData.tasks);
    setDashboard(dashboardData);
    await loadProjects(false);
  }

  useEffect(() => {
    loadProjects(true)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadProjectData(activeProjectId).catch((err) => setError(err.message));
    }
  }, [activeProjectId]);

  async function createProject(form) {
    const data = await api('/api/projects', { method: 'POST', body: JSON.stringify(form) });
    await loadProjects(false);
    setActiveProjectId(data.project.id);
  }

  function logout() {
    localStorage.removeItem('ttm_token');
    setUser(null);
  }

  if (loading) return <div className="loading-screen">Loading workspace...</div>;

  return (
    <main className="app-shell">
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        setActiveProjectId={setActiveProjectId}
        onCreateProject={createProject}
        user={user}
        onLogout={logout}
      />

      <section className="content">
        {error && <div className="alert error">{error}</div>}
        {!project ? (
          <div className="empty-state card">
            <h2>Create your first project</h2>
            <p className="muted">Use the New Project button to create a workspace. The creator automatically becomes Admin.</p>
          </div>
        ) : (
          <>
            <header className="topbar card">
              <div>
                <p className="eyebrow">{project.currentUserRole} workspace</p>
                <h1>{project.name}</h1>
                <p>{project.description || 'No description added yet.'}</p>
              </div>
              <div className="top-actions">
                {project.currentUserRole === 'ADMIN' && <button className="primary-btn" onClick={() => setShowTaskModal(true)}>+ Create Task</button>}
              </div>
            </header>

            <StatCards dashboard={dashboard} />
            <DashboardPanel dashboard={dashboard} />
            <MembersPanel project={project} onRefresh={() => loadProjectData(activeProjectId)} />
            <TaskBoard tasks={tasks} project={project} user={user} onRefresh={() => loadProjectData(activeProjectId)} />
          </>
        )}
      </section>

      {showTaskModal && <CreateTaskModal project={project} onClose={() => setShowTaskModal(false)} onCreated={() => loadProjectData(activeProjectId)} />}
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const isResetPage = window.location.pathname === '/reset-password';

  useEffect(() => {
    if (isResetPage) {
      setChecking(false);
      return;
    }

    const token = localStorage.getItem('ttm_token');
    if (!token) {
      setChecking(false);
      return;
    }

    api('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem('ttm_token'))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="loading-screen">Checking session...</div>;
  if (isResetPage) return <ResetPasswordPage />;
  if (!user) return <AuthScreen onAuth={setUser} />;
  return <Workspace user={user} setUser={setUser} />;
}

createRoot(document.getElementById('root')).render(<App />);

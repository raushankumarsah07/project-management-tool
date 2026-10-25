import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useSocket } from '../context/SocketContext.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/Avatar.jsx';

const accents = ['coral', 'violet', 'blue', 'yellow'];

export default function Projects() {
  const nav = useNavigate();
  const socket = useSocket();
  const [projects, setProjects] = useState(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const searchRef = useRef(null);
  const load = () => api.get('/projects').then((res) => setProjects(res.data)).catch((err) => setError(errorMessage(err)));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => load();
    socket.on('notification', refresh);
    socket.on('project:removed', refresh);
    return () => { socket.off('notification', refresh); socket.off('project:removed', refresh); };
  }, [socket]);

  const create = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.post('/projects', form);
      nav(`/projects/${data._id}`);
    } catch (err) { setError(errorMessage(err)); }
  };
  const totals = useMemo(() => ({
    tasks: projects?.reduce((sum, project) => sum + project.total, 0) || 0,
    done: projects?.reduce((sum, project) => sum + project.done, 0) || 0,
  }), [projects]);
  const visible = projects?.filter((project) => {
    const matches = `${project.name} ${project.description || ''}`.toLowerCase().includes(query.toLowerCase());
    const state = filter === 'all' || (filter === 'active' ? project.done < project.total : project.done === project.total);
    return matches && state;
  });

  return (
    <main className="studio-page">
      <aside className="studio-sidebar">
        <nav className="studio-nav">
          <a className="active" href="#top"><span>◒</span> Overview</a>
          <a href="#projects"><span>▦</span> Projects <b>{projects?.length || 0}</b></a>
          <a href="#focus"><span>✧</span> Focus today <b className="alert-count">4</b></a>
          <a href="#insights"><span>⌁</span> Insights</a>
        </nav>
        <p className="studio-label">Your space</p>
        <nav className="studio-nav studio-small-nav">
          <a href="#projects"><span className="nav-orb coral-orb" />Creative lab</a>
          <a href="#projects"><span className="nav-orb violet-orb" />Launch room</a>
          <a href="#projects"><span className="nav-orb blue-orb" />Shared with me</a>
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-spark">✦</div><b>Small steps.<br />Big momentum.</b><small>Keep your team moving.</small></div>
      </aside>

      <section className="studio-main" id="top">
        <header className="studio-topbar"><div className="studio-breadcrumb"><span>Workspace</span><b>/</b> Overview</div><form className="studio-search" onSubmit={(event) => { event.preventDefault(); searchRef.current?.focus(); }}><span>⌕</span><input ref={searchRef} aria-label="Search projects" placeholder="Search projects" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd><button type="submit" aria-label="Search projects">Search</button></form></header>
        <div className="studio-content">
          <section className="studio-hero">
            <div className="hero-copy"><span className="hero-kicker">SATURDAY / OCTOBER 25, 2026</span><h1>Make room for<br /><em>what matters.</em></h1><p>A clearer view of the work your team is moving forward.</p><div className="hero-actions"><button className="studio-primary" onClick={() => setCreating(true)}>＋ Start a project</button><a href="#projects" className="studio-text-link">Explore workspace ↗</a></div></div>
            <div className="orbit-stage" aria-hidden="true"><div className="orbit-shadow" /><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-ring ring-three" /><div className="orbit-core"><span>✦</span></div><div className="orbit-card orbit-card-one"><small>FOCUS</small><b>{Math.max(totals.tasks - totals.done, 0)}</b><span>tasks next</span></div><div className="orbit-card orbit-card-two"><small>FLOW</small><b>{totals.tasks ? Math.round((totals.done / totals.tasks) * 100) : 0}%</b><span>complete</span></div></div>
          </section>

          <section className="signal-row" id="insights"><div className="signal-card"><span className="signal-icon coral-bg">◈</span><div><small>Active spaces</small><strong>{projects?.length || 0}</strong></div><i>↑ 12%</i></div><div className="signal-card"><span className="signal-icon violet-bg">↗</span><div><small>Tasks shipped</small><strong>{totals.done}<em>/{totals.tasks}</em></strong></div><i>↑ 18%</i></div><div className="signal-card signal-highlight"><span className="signal-icon yellow-bg">✳</span><div><small>Team energy</small><strong>{totals.tasks ? Math.round((totals.done / totals.tasks) * 100) : 0}%</strong></div><div className="mini-bars">{[25, 48, 35, 72, 56, 86, 66].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div></section>

          <div className="studio-section-head" id="projects"><div><span className="section-number">01</span><div><h2>Projects in motion</h2><p>Everything your team is building, in one view.</p></div></div><div className="view-controls"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All</button><button className={filter === 'active' ? 'selected' : ''} onClick={() => setFilter('active')}>In progress</button><button className={filter === 'done' ? 'selected' : ''} onClick={() => setFilter('done')}>Complete</button></div></div>
          {error && <p className="error">{error}</p>}{projects === null && <p className="muted">Loading workspace…</p>}
          <div className="studio-project-grid">{visible?.map((project, index) => { const pct = project.total ? Math.round((project.done / project.total) * 100) : 0; return <article className={`studio-project-card ${accents[index % accents.length]}`} key={project._id}><div className="card-topline"><span>0{index + 1} / PROJECT</span><button onClick={() => setPreview(project)} aria-label={`Preview ${project.name}`}>↗</button></div><Link to={`/projects/${project._id}`}><h3>{project.name}</h3><p>{project.description || 'A shared space for focused work.'}</p><div className="card-progress"><span style={{ width: `${pct}%` }} /></div><div className="card-foot"><b>{pct}% <small>complete</small></b><span className="avatars">{project.members.slice(0, 3).map((member) => <Avatar key={member._id} name={member.name} size={24} />)}</span></div></Link></article>; })}</div>
          {projects?.length > 0 && visible?.length === 0 && <div className="empty-studio"><h3>Nothing here yet</h3><p>Try another filter or search phrase.</p></div>}

          <section className="focus-strip" id="focus"><div><span className="section-number">02</span><div><h2>Today’s focus</h2><p>A short list to keep momentum intentional.</p></div></div><div className="focus-items"><span><b>01</b> Review project direction</span><span><b>02</b> Share the weekly update</span><span><b>03</b> Celebrate a small win</span></div></section>
        </div>
      </section>
      {creating && <Modal title="Start a new project" onClose={() => setCreating(false)}><form onSubmit={create}><label>Project name<input value={form.name} maxLength={80} autoFocus required onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Description (optional)<textarea rows={3} maxLength={300} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>{error && <p className="error">{error}</p>}<button className="btn wide">Create project</button></form></Modal>}
      {preview && <Modal title="Project preview" onClose={() => setPreview(null)}><div className="studio-preview"><span>LIVE SNAPSHOT / {preview.name}</span><h2>{preview.name}</h2><p className="muted">{preview.description || 'A shared space for focused work.'}</p><div><b>{preview.done}<small> shipped</small></b><b>{preview.total - preview.done}<small> remaining</small></b><b>{preview.members.length}<small> collaborators</small></b></div><Link className="btn wide" to={`/projects/${preview._id}`}>Open project board →</Link></div></Modal>}
    </main>
  );
}

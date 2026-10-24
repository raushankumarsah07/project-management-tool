import { useState } from 'react';
import api, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';

export default function MembersModal({ project, online, setProject, onClose, onLeft }) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const owner = project.owner === user._id;

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post(`/projects/${project._id}/members`, { email });
      setProject(data);
      setEmail('');
    } catch (err) { setError(errorMessage(err)); }
  };

  const remove = async (m) => {
    const self = m._id === user._id;
    if (!window.confirm(self ? 'Leave this project?' : `Remove ${m.name} from this project?`)) return;
    try {
      const { data } = await api.delete(`/projects/${project._id}/members/${m._id}`);
      if (self) return onLeft();
      setProject(data);
    } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <Modal title="Project members" onClose={onClose}>
      <ul className="members">
        {project.members.map((m) => (
          <li key={m._id}>
            <Avatar name={m.name} size={34} online={online.includes(m._id)} />
            <div className="grow">
              <div className="strong">{m.name}{m._id === user._id && ' (you)'}</div>
              <div className="muted small">{m.email}{m._id === project.owner && ' · Owner'}</div>
            </div>
            {m._id !== project.owner && (owner || m._id === user._id) && (
              <button className="link-btn" onClick={() => remove(m)}>{m._id === user._id ? 'Leave' : 'Remove'}</button>
            )}
          </li>
        ))}
      </ul>

      {owner && (
        <form onSubmit={add} className="invite">
          <label>Add a member by email
            <div className="row">
              <input type="email" value={email} placeholder="teammate@example.com" onChange={(e) => setEmail(e.target.value)} required />
              <button className="btn">Add</button>
            </div>
          </label>
          <p className="muted small">They need to have a Flowboard account first.</p>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </Modal>
  );
}

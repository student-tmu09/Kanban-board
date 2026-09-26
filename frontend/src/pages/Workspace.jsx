import React from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { socket } from "../Api/socket";
import { getWorkspaceById, getDashboard } from "../Api/workspaceApi";
import { createBoard, getWorkspaceBoards } from "../Api/boardApi";
import { addMember, getMembers, updateMemberRole, removeMember } from "../Api/memberApi";
import { unwrap, getId, getName } from "../utils/response";

export default function Workspace() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({});
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [boardForm, setBoardForm] = useState({ name: "", slug: "" });
  const [memberForm, setMemberForm] = useState({ email: "", role: "VIEWER" });
  const [error, setError] = useState("");

  const loadAll = async () => {
  try {
    const [w, b, m, d] = await Promise.all([
      getWorkspaceById(workspaceId),
      getWorkspaceBoards(workspaceId),
      getMembers(workspaceId),
      getDashboard(workspaceId)
    ]);

    const workspaceData = unwrap(w, null);
    const boardsData = unwrap(b, []);
    const membersData = unwrap(m, []);
    const dashboardData = unwrap(d, {});

    setWorkspace(workspaceData);
    setBoards(boardsData);
    setMembers(membersData);
    setStats(dashboardData.stats || {});
  } catch (e) {
    setError(e.response?.data?.message || "Could not load workspace");
  }
};

  useEffect(() => {
    loadAll();
    socket.emit("join-workspace", workspaceId);
    const refresh = () => loadAll();
    ["workspace_created","add_member","member_role_updated","member_removed","board_created","task_created"].forEach(ev => socket.on(ev, refresh));
    return () => {
      socket.emit("leave-workspace", workspaceId);
      ["workspace_created","add_member","member_role_updated","member_removed","board_created","task_created"].forEach(ev => socket.off(ev, refresh));
    };
  }, [workspaceId]);

  const createNewBoard = async (e) => {
    e.preventDefault();
    try {
      await createBoard(workspaceId, boardForm);
      setBoardForm({name:"",slug:""});
      setModal(null);
      loadAll();
    } catch (e) { setError(e.response?.data?.message || "Board creation failed"); }
  };

  const addNewMember = async (e) => {
    e.preventDefault();
    try {
      await addMember(workspaceId, memberForm);
      setMemberForm({email:"",role:"VIEWER"});
      setModal(null);
      loadAll();
    } catch (e) { setError(e.response?.data?.message || "Member add failed"); }
  };

  const changeRole = async (member) => {
    const id = getId(member.userId || member.user || member);
    const role = window.prompt("Enter role: EDITOR or VIEWER", member.role || "VIEWER");
    if (!role || !["EDITOR","VIEWER"].includes(role.toUpperCase())) return;
    try { await updateMemberRole(workspaceId, id, { role: role.toUpperCase() }); loadAll(); }
    catch(e) { setError(e.response?.data?.message || "Role update failed"); }
  };

  const remove = async (member) => {
    const id = getId(member.userId || member.user || member);
    if (!window.confirm("Remove this member?")) return;
    try { await removeMember(workspaceId, id); loadAll(); }
    catch(e) { setError(e.response?.data?.message || "Remove failed"); }
  };

  if (!workspace) return <Layout title="Workspace"><div className="loading">Loading...</div></Layout>;

  return (
    <Layout title={workspace.name} right={<Link className="primary small" to="/notifications">🔔 Notifications</Link>}>
      {error && <div className="error">{error}</div>}

      <div className="tabs">
        {["overview","boards","members"].map(t => (
          <button key={t} className={tab===t ? "tab active" : "tab"} onClick={() => setTab(t)}>
            {t[0].toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
        <div className="stats-grid">
  {[
    ["Boards", stats.totalBoards],
    ["Members", stats.totalMembers],
    ["Tasks", stats.totalTasks],
    ["TODO", stats.todoTasks],
    ["In Progress", stats.inProgressTasks],
    ["Completed", stats.completedTasks]
  ].map(([label, value]) => (
    <div className="stat" key={label}>
      <b>{value ?? 0}</b>
      <span>{label}</span>
    </div>
  ))}
</div>
        </>
      )}

      {tab === "boards" && (
        <>
          <div className="section-title"><h2>Boards</h2><button className="primary small" onClick={()=>setModal("board")}>+ Create Board</button></div>
          <div className="card-grid">
            {boards.map(b => <Link className="board-card" to={`/board/${b._id}`} key={b._id}><h3>{b.name}</h3><p>{b.slug}</p><span>Open →</span></Link>)}
          </div>
        </>
      )}

      {tab === "members" && (
        <>
          <div className="section-title"><h2>Workspace Members</h2><button className="primary small" onClick={()=>setModal("member")}>+ Add Member</button></div>
          <div className="table-card">
            <table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              {members.map((m,i) => {
                const u = m.userId || m.user || m;
                return <tr key={m._id || i}><td>{getName(u)}</td><td>{u?.email || "-"}</td><td><span className="badge">{m.role}</span></td>
                  <td><button className="ghost" onClick={()=>changeRole(m)}>Role</button><button className="danger-link" onClick={()=>remove(m)}>Remove</button></td></tr>
              })}
            </tbody></table>
            {!members.length && <div className="empty">No members found.</div>}
          </div>
        </>
      )}

      {modal === "board" && <Modal title="Create Board" onClose={()=>setModal(null)}>
        <form className="form" onSubmit={createNewBoard}>
          <label>Name<input value={boardForm.name} onChange={e=>setBoardForm({...boardForm,name:e.target.value})} required /></label>
          <label>Slug<input value={boardForm.slug} onChange={e=>setBoardForm({...boardForm,slug:e.target.value})} required /></label>
          <button className="primary">Create Board</button>
        </form>
      </Modal>}

      {modal === "member" && <Modal title="Add Member" onClose={()=>setModal(null)}>
        <form className="form" onSubmit={addNewMember}>
          <label>Email<input type="email" value={memberForm.email} onChange={e=>setMemberForm({...memberForm,email:e.target.value})} required /></label>
          <label>Role<select value={memberForm.role} onChange={e=>setMemberForm({...memberForm,role:e.target.value})}><option>VIEWER</option><option>EDITOR</option></select></label>
          <button className="primary">Add Member</button>
        </form>
      </Modal>}
    </Layout>
  );
}
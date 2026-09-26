import React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext } from "@hello-pangea/dnd";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import TaskColumn from "../components/TaskColumn";
import { socket } from "../Api/socket";
import { getBoardById } from "../Api/boardApi";
import { getBoardTasks, createTask, moveTask, updateTask, deleteTask } from "../Api/taskApi";
import { getMembers } from "../Api/memberApi";
import { createComment, getTaskComments } from "../Api/commentApi";
import { unwrap, getName, getId } from "../utils/response";

const columns = [
  {id:"TODO", title:"TODO"},
  {id:"IN_PROGRESS", title:"IN PROGRESS"},
  {id:"IN_REVIEW", title:"IN REVIEW"},
  {id:"DONE", title:"DONE"}
];

export default function Board() {
  const { boardId } = useParams();
  const [board,setBoard]=useState(null);
  const [tasks,setTasks]=useState([]);
  const [members,setMembers]=useState([]);
  const [selected,setSelected]=useState(null);
  const [comments,setComments]=useState([]);
  const [comment,setComment]=useState("");
  const [taskModal,setTaskModal]=useState(false);
  const [form,setForm]=useState({title:"",description:"",assigneeId:"",dueDate:""});
  const [error,setError]=useState("");

  const load = async () => {
    try {
      const b = await getBoardById(boardId);
      setBoard(unwrap(b,null));
      const t = await getBoardTasks(boardId);
      setTasks(unwrap(t,[]));
      const workspaceId = getId(unwrap(b,null)?.workspace || unwrap(b,null)?.workspaceId);
      if (workspaceId) {
        const m = await getMembers(workspaceId);
        setMembers(unwrap(m,[]));
      }
    } catch(e) { setError(e.response?.data?.message || "Board load failed"); }
  };

  useEffect(() => {
    load();
    socket.emit("join_board",{boardId});
    const refresh=()=>load();
    ["task_created","task_moved","task_updated","task_deleted","add_member","member_role_updated"].forEach(ev=>socket.on(ev,refresh));
    return ()=> {
      socket.off("task_created",refresh); socket.off("task_moved",refresh);
      socket.off("task_updated",refresh); socket.off("task_deleted",refresh);
      socket.off("add_member",refresh); socket.off("member_role_updated",refresh);
    };
  },[boardId]);

  const openTask = async (task) => {
    setSelected(task);
    try {
      const res = await getTaskComments(task._id);
      setComments(unwrap(res,[]));
    } catch(e) { setComments([]); }
  };

  const submitTask = async (e) => {
    e.preventDefault();
    try {
      const data = {...form};
      if (!data.assigneeId) delete data.assigneeId;
      if (!data.dueDate) delete data.dueDate;
      await createTask(boardId,data);
      setTaskModal(false);
      setForm({title:"",description:"",assigneeId:"",dueDate:""});
      load();
    } catch(e) { setError(e.response?.data?.message || "Task creation failed"); }
  };

  const dragEnd = async (result) => {
    if(!result.destination) return;
    const taskId=result.draggableId;
    const status=result.destination.droppableId;
    const order=result.destination.index+1;
    try { await moveTask(taskId,{status,order}); load(); }
    catch(e) { setError(e.response?.data?.message || "Move failed"); }
  };

  const saveTask = async () => {
    if(!selected) return;
    try {
      await updateTask(selected._id,{
        title:selected.title,
        description:selected.description,
        assigneeId:getId(selected.assigneeId) || null,
        dueDate:selected.dueDate || null
      });
      setSelected(null); load();
    } catch(e) { setError(e.response?.data?.message || "Update failed"); }
  };

  const removeTask = async () => {
    if(!selected || !window.confirm("Delete this task?")) return;
    try { await deleteTask(selected._id); setSelected(null); load(); }
    catch(e) { setError(e.response?.data?.message || "Delete failed"); }
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if(!comment.trim() || !selected) return;
    try {
      await createComment(selected._id,{content:comment});
      setComment("");
      const res=await getTaskComments(selected._id);
      setComments(unwrap(res,[]));
    } catch(e) { setError(e.response?.data?.message || "Comment failed"); }
  };

  return (
    <Layout title={board?.name || "Board"} right={<button className="primary small" onClick={()=>setTaskModal(true)}>+ Create Task</button>}>
      {error && <div className="error">{error}</div>}
      <DragDropContext onDragEnd={dragEnd}>
        <div className="kanban">
          {columns.map(c=><TaskColumn key={c.id} column={c} tasks={tasks.filter(t=>t.status===c.id).sort((a,b)=>(a.order||0)-(b.order||0))} onOpen={openTask}/>)}
        </div>
      </DragDropContext>

      {taskModal && <Modal title="Create Task" onClose={()=>setTaskModal(false)}>
        <form className="form" onSubmit={submitTask}>
          <label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required /></label>
          <label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></label>
          <label>Assignee<select value={form.assigneeId} onChange={e=>setForm({...form,assigneeId:e.target.value})}>
            <option value="">Unassigned</option>
            {members.map(m=>{const u=m.userId||m.user||m; const id=getId(u); return <option key={id} value={id}>{getName(u)}</option>})}
          </select></label>
          <label>Due date<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} /></label>
          <button className="primary">Create Task</button>
        </form>
      </Modal>}

      {selected && <Modal title="Task Details" onClose={()=>setSelected(null)}>
        <div className="form">
          <label>Title<input value={selected.title||""} onChange={e=>setSelected({...selected,title:e.target.value})}/></label>
          <label>Description<textarea value={selected.description||""} onChange={e=>setSelected({...selected,description:e.target.value})}/></label>
          <label>Status<select value={selected.status} onChange={e=>setSelected({...selected,status:e.target.value})}>
            {columns.map(c=><option key={c.id}>{c.id}</option>)}
          </select></label>
          <label>Assignee<select value={getId(selected.assigneeId)} onChange={e=>setSelected({...selected,assigneeId:e.target.value})}>
            <option value="">Unassigned</option>
            {members.map(m=>{const u=m.userId||m.user||m; const id=getId(u); return <option key={id} value={id}>{getName(u)}</option>})}
          </select></label>
          <label>Due date<input type="date" value={selected.dueDate ? new Date(selected.dueDate).toISOString().slice(0,10) : ""} onChange={e=>setSelected({...selected,dueDate:e.target.value})}/></label>
          <div className="modal-actions"><button className="primary" onClick={saveTask}>Save</button><button className="danger" onClick={removeTask}>Delete</button></div>
        </div>
        <div className="comments">
          <h3>Comments</h3>
          {comments.map(c=><div className="comment" key={c._id}><b>{getName(c.userId)}</b><span>{c.content}</span></div>)}
          {!comments.length && <p className="muted">No comments yet.</p>}
          <form className="comment-form" onSubmit={sendComment}><input placeholder="Write a comment..." value={comment} onChange={e=>setComment(e.target.value)}/><button className="primary">Send</button></form>
        </div>
      </Modal>}
    </Layout>
  );
}
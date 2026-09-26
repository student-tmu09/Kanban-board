import React from "react";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { socket } from "../Api/socket";
import { getNotifications, markNotificationAsRead } from "../Api/notificationApi";
import { unwrap } from "../utils/response";

export default function Notifications() {
  const [items,setItems]=useState([]);
  const load=async()=>{try{const r=await getNotifications();setItems(unwrap(r,[]));}catch(e){console.error(e)}};
  useEffect(()=>{
    load();
    const add=()=>load();
    socket.on("notification",add);
    return()=>socket.off("notification",add);
  },[]);
  const read=async(id)=>{await markNotificationAsRead(id);load();};
  return <Layout title="Notifications"><div className="notification-list">
    {!items.length && <div className="empty">No notifications.</div>}
    {items.map(n=><div className={`notification ${n.isRead?"read":""}`} key={n._id}>
      <div><b>{n.type || "Notification"}</b><p>{n.message}</p></div>
      {!n.isRead && <button className="ghost" onClick={()=>read(n._id)}>Mark read</button>}
    </div>)}
  </div></Layout>;
}
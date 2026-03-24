import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const BRAND = {
  primary:   "#6240CC",
  dark:      "#3D1F99",
  darker:    "#2B1575",
  light:     "#8A6EDB",
  pale:      "#EDE8FA",
  gradient:  "linear-gradient(135deg,#2B1575,#3D1F99,#6240CC)",
  gradLight: "linear-gradient(135deg,#6240CC,#8A6EDB)",
};

// ── Email helpers ──
const sendNotificationEmail = async (to, subject, html) => {
  try {
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
  } catch (e) { console.warn("Email notification failed:", e); }
};

const emailWrap = (body) => `
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#2B1575,#6240CC);padding:20px 24px;border-radius:12px 12px 0 0">
    <div style="color:white;font-size:18px;font-weight:800">Office Inventory</div>
  </div>
  <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    ${body}
  </div>
  <div style="text-align:center;padding:12px;font-size:11px;color:#9ca3af">Sent by Office Inventory System</div>
</div>`;

const buildNewRequestEmail = (requesterName, items, note) => emailWrap(`
  <div style="font-size:15px;font-weight:700;color:#1e1b4b;margin-bottom:12px">New Request from ${requesterName}</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
    <tr style="background:#f3f4f6"><th style="text-align:left;padding:8px;font-size:13px;color:#374151">Item</th><th style="text-align:center;padding:8px;font-size:13px;color:#374151">Qty</th></tr>
    ${items.map(i => `<tr><td style="padding:8px;font-size:14px;border-bottom:1px solid #e5e7eb">${i.name}</td><td style="text-align:center;padding:8px;font-size:14px;border-bottom:1px solid #e5e7eb">${i.qty}</td></tr>`).join("")}
  </table>
  ${note ? `<div style="font-size:13px;color:#6b7280;font-style:italic;margin-bottom:8px">"${note}"</div>` : ""}
  <div style="font-size:13px;color:#6b7280">Please review and approve in the Office Inventory system.</div>
`);

const buildApprovalEmail = (userName, itemName, qty, unitCodes) => emailWrap(`
  <div style="font-size:15px;font-weight:700;color:#10b981;margin-bottom:12px">Request Approved</div>
  <div style="font-size:14px;color:#374151;margin-bottom:8px">Hi ${userName}, your request has been approved:</div>
  <div style="background:#f0fdf4;padding:12px;border-radius:8px;margin-bottom:8px">
    <strong>${qty}x ${itemName}</strong>
    ${unitCodes ? `<div style="margin-top:6px;font-size:13px;color:#6240CC;font-family:monospace">Units: ${unitCodes}</div>` : ""}
  </div>
`);

const buildRejectionEmail = (userName, itemName, qty) => emailWrap(`
  <div style="font-size:15px;font-weight:700;color:#ef4444;margin-bottom:12px">Request Rejected</div>
  <div style="font-size:14px;color:#374151;margin-bottom:8px">Hi ${userName}, your request has been rejected:</div>
  <div style="background:#fef2f2;padding:12px;border-radius:8px">
    <strong>${qty}x ${itemName}</strong>
  </div>
  <div style="font-size:13px;color:#6b7280;margin-top:8px">Please contact your inventory assistant for more details.</div>
`);

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("darkMode", dark);
  }, [dark]);
  return [dark, setDark];
}

const DarkModeStyles = () => (
  <style>{`
    :root {
      --bg:#f3f4f6; --surface:#ffffff; --surface2:#f9fafb; --border:#e5e7eb;
      --text:#111827; --text2:#374151; --text3:#6b7280; --text4:#9ca3af;
      --inp-bg:#ffffff; --nav-bg:#ffffff; --nav-border:#e5e7eb;
      --card-shadow:0 1px 6px rgba(0,0,0,0.08); --modal-bg:#ffffff;
    }
    html.dark {
      --bg:#0f0f14; --surface:#1a1a2e; --surface2:#16213e; --border:#2a2a45;
      --text:#f0f0f8; --text2:#d1d5db; --text3:#9ca3af; --text4:#6b7280;
      --inp-bg:#1e1e35; --nav-bg:#1a1a2e; --nav-border:#2a2a45;
      --card-shadow:0 1px 8px rgba(0,0,0,0.4); --modal-bg:#1a1a2e;
    }
    body { background:var(--bg); color:var(--text); transition:background .25s,color .25s; margin:0; }
    *{ transition:background-color .25s,border-color .25s,color .15s; }
    @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  `}</style>
);

const Logo = ({ size=64 }) => (
  <img src="/logo.svg" alt="Logo" style={{ width:size,height:size,objectFit:"contain",display:"block" }} />
);

export default function App() {
  const [dark, setDark] = useDarkMode();

  const lbl = { display:"block",fontSize:12,fontWeight:600,color:"var(--text2)",marginBottom:4,marginTop:14 };
  const inp = { width:"100%",padding:"10px 12px",border:"1.5px solid var(--border)",borderRadius:10,fontSize:14,boxSizing:"border-box",outline:"none",background:"var(--inp-bg)",color:"var(--text)" };
  const btn = { width:"100%",background:BRAND.gradLight,color:"white",border:"none",borderRadius:12,padding:"14px",fontSize:15,cursor:"pointer",fontWeight:700,marginTop:20 };

  const [loaded, setLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLocked, setLoginLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitAssignments, setUnitAssignments] = useState([]);
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [incidentFilter, setIncidentFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState({});
  const [cart, setCart] = useState([]);

  const today = new Date().toISOString().slice(0, 10);
  const currentUser = users.find(u => u.id === currentUserId);
  const isAdmin = currentUser?.role === "admin";
  const isAssistant = currentUser?.role === "inventory_assistant";
  const isAdminOrAssistant = isAdmin || isAssistant;
  const isStaff = !isAdmin && !isAssistant;

  const myUnitAssignments = currentUser ? unitAssignments.filter(a => a.user_id === currentUser.id && a.status === "active") : [];
  const myAssignments = currentUser ? assignments.filter(a => a.user_id === currentUser.id) : [];
  const pendingRequests = requests.filter(r => r.status === "pending");
  const pendingTransfersForMe = transfers.filter(t => t.status === "pending" && t.to_user_id === currentUser?.id);
  const openIncidents = incidents.filter(i => i.status === "open");
  const pendingExtensions = extensionRequests.filter(e => e.status === "pending");

  // Overdue check
  const isOverdue = (ua) => {
    if (!ua.return_due_date || ua.status !== "active") return false;
    return ua.return_due_date < today;
  };
  const isDueSoon = (ua) => {
    if (!ua.return_due_date || ua.status !== "active") return false;
    const diff = (new Date(ua.return_due_date) - new Date(today)) / (1000*60*60*24);
    return diff >= 0 && diff <= 3;
  };

  const loadAll = async () => {
    setSyncing(true);
    const [u,inv,asgn,req,trf,inc,lg,un,ua,ext] = await Promise.all([
      supabase.from("users").select("*").order("id"),
      supabase.from("inventory").select("*").order("id"),
      supabase.from("assignments").select("*"),
      supabase.from("requests").select("*").order("id",{ascending:false}),
      supabase.from("transfers").select("*").order("id",{ascending:false}),
      supabase.from("incidents").select("*").order("id",{ascending:false}),
      supabase.from("logs").select("*").order("created_at",{ascending:false}).limit(200),
      supabase.from("units").select("*").order("unit_code"),
      supabase.from("unit_assignments").select("*").order("id",{ascending:false}),
      supabase.from("extension_requests").select("*").order("id",{ascending:false}),
    ]);
    if (u.data) setUsers(u.data);
    if (inv.data) setInventory(inv.data);
    if (asgn.data) setAssignments(asgn.data);
    if (req.data) setRequests(req.data);
    if (trf.data) setTransfers(trf.data);
    if (inc.data) setIncidents(inc.data);
    if (lg.data) setLogs(lg.data);
    if (un.data) setUnits(un.data);
    if (ua.data) setUnitAssignments(ua.data);
    if (ext.data) setExtensionRequests(ext.data);
    setSyncing(false);
    setLoaded(true);
  };

  useEffect(() => {
    loadAll();
    const tables = ["users","inventory","assignments","requests","transfers","incidents","logs","units","unit_assignments","extension_requests"];
    const channels = tables.map(t =>
      supabase.channel(`${t}-ch`).on("postgres_changes",{event:"*",schema:"public",table:t},loadAll)
    );
    channels.forEach(c => c.subscribe());
    return () => channels.forEach(c => supabase.removeChannel(c));
  }, []);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };
  const addLog = async (action, actor, detail) => { await supabase.from("logs").insert({action,actor,detail,date:today}); };
  const getUser = id => users.find(u => u.id === id);
  const getItem = id => inventory.find(i => i.id === id);
  const getUnit = id => units.find(u => u.id === id);

  // ── HELPERS ──────────────────────────────────────────────────────────────
  const initials = name => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const validEmail = e => e && e.includes("@") && e.includes(".");
  const emailTaken = (email, excludeId) => users.some(u => u.email === email && u.id !== excludeId);
  const closeModal = (msg, type="success") => { setModal(null); setForm({}); if (msg) showToast(msg, type); };
  const [saving, setSaving] = useState(false);

  // ── EMAIL/PASSWORD LOGIN ───────────────────────────────────────────────────
  useEffect(() => {
    if (loginLocked && lockTimer > 0) {
      const t = setTimeout(() => setLockTimer(l => l - 1), 1000);
      return () => clearTimeout(t);
    }
    if (loginLocked && lockTimer === 0) setLoginLocked(false);
  }, [loginLocked, lockTimer]);

  const handleLogin = () => {
    if (loginLocked) return;
    const u = users.find(u => u.email === loginEmail && u.password === loginPass);
    if (u) {
      setLoginErr(""); setLoginAttempts(0);
      setCurrentUserId(u.id); setTab("dashboard");
      setLoginEmail(""); setLoginPass("");
    } else {
      const a = loginAttempts + 1;
      setLoginAttempts(a);
      if (a >= 3) {
        setLoginLocked(true); setLockTimer(30);
        setLoginErr("Too many attempts. Locked for 30s.");
      } else {
        setLoginErr(`Invalid credentials. ${3 - a} attempt(s) left.`);
      }
    }
  };
  const handleLogout = () => { setCurrentUserId(null); setLoginEmail(""); setLoginPass(""); setLoginErr(""); setLoginAttempts(0); setLoginLocked(false); };

  // ── UNIT ACTIONS ───────────────────────────────────────────────────────────
  const generateUnits = async () => {
    const { itemId, prefix, count, startFrom } = form;
    if (!itemId || !prefix || !count || count < 1) return showToast("Fill in all fields","error");
    if (Number(count) > 500) return showToast("Max 500 units at a time","error");
    const start = Number(startFrom) || 1;
    const newUnits = [];
    for (let i = start; i < start + Number(count); i++) {
      newUnits.push({ item_id:Number(itemId), unit_code:`${prefix}-${String(i).padStart(3,"0")}`, status:"available", condition:"good" });
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("units").insert(newUnits);
      if (error) { setSaving(false); return showToast("Some unit codes already exist!","error"); }
      await addLog("Units Generated", currentUser.name, `Generated ${count} units for ${getItem(Number(itemId))?.name}`);
      closeModal(`${count} units created!`);
    } catch { showToast("Failed to generate units","error"); }
    setSaving(false);
  };

  const assignUnits = async (req) => {
    const chosen = selectedUnits[req.id] || [];
    if (chosen.length !== req.qty) return showToast(`Please select exactly ${req.qty} unit${req.qty>1?"s":""}`, "error");
    for (const unitId of chosen) {
      const unit = getUnit(Number(unitId));
      if (!unit || unit.status !== "available") return showToast(`Unit ${unit?.unit_code} is not available`, "error");
    }
    const returnDue = form[`returnDate_${req.id}`] || req.return_due_date || null;
    for (const unitId of chosen) {
      await supabase.from("units").update({ status:"assigned" }).eq("id", Number(unitId));
      await supabase.from("unit_assignments").insert({ unit_id:Number(unitId), user_id:req.from_user_id, assigned_at:today, status:"active", return_due_date:returnDue });
    }
    const unitCodes = chosen.map(uid => getUnit(Number(uid))?.unit_code).join(", ");
    await supabase.from("requests").update({ status:"approved" }).eq("id", req.id);
    await addLog("Units Assigned", currentUser.name, `Assigned ${unitCodes} to ${getUser(req.from_user_id)?.name}${returnDue?` (due ${returnDue})`:""}`);
    setSelectedUnits(s => { const n={...s}; delete n[req.id]; return n; });
    const requester = getUser(req.from_user_id);
    const item = getItem(req.item_id);
    if (requester?.email) {
      sendNotificationEmail([requester.email], `Request Approved: ${item?.name}`, buildApprovalEmail(requester.name, item?.name, req.qty, unitCodes));
    }
    showToast(`${chosen.length} unit${chosen.length>1?"s":""} assigned!`);
  };

  const toggleUnitSelection = (reqId, unitId, max) => {
    setSelectedUnits(s => {
      const cur = s[reqId] || [];
      if (cur.includes(unitId)) return { ...s, [reqId]: cur.filter(u => u !== unitId) };
      if (cur.length >= max) { showToast(`Max ${max} units for this request`, "error"); return s; }
      return { ...s, [reqId]: [...cur, unitId] };
    });
  };

  const returnUnit = async (ua) => {
    const unit = getUnit(ua.unit_id);
    await supabase.from("unit_assignments").update({ status:"returned", returned_at:today }).eq("id", ua.id);
    await supabase.from("units").update({ status:"available" }).eq("id", ua.unit_id);
    await addLog("Unit Returned", currentUser.name, `${unit?.unit_code} returned by ${getUser(ua.user_id)?.name}`);
    showToast(`${unit?.unit_code} returned!`);
  };

  const returnAllForUser = async (userId) => {
    const userUAs = unitAssignments.filter(ua => ua.user_id === userId && ua.status === "active");
    const userAssigns = assignments.filter(a => a.user_id === userId);
    for (const ua of userUAs) {
      await supabase.from("unit_assignments").update({ status:"returned", returned_at:today }).eq("id", ua.id);
      await supabase.from("units").update({ status:"available" }).eq("id", ua.unit_id);
    }
    for (const a of userAssigns) {
      const item = getItem(a.item_id);
      await supabase.from("inventory").update({ available: item.available + a.qty }).eq("id", a.item_id);
      await supabase.from("assignments").delete().eq("id", a.id);
    }
    const u = getUser(userId);
    await addLog("Return All", currentUser.name, `All items returned by ${u?.name}`);
    showToast(`All items returned for ${u?.name}!`);
  };

  const returnQtyItem = async (assignmentId, userId, itemId, qtyToReturn) => {
    const item = getItem(itemId);
    const assign = assignments.find(a => a.id === assignmentId);
    if (!assign) return;
    const newQty = assign.qty - qtyToReturn;
    if (newQty <= 0) {
      await supabase.from("assignments").delete().eq("id", assignmentId);
    } else {
      await supabase.from("assignments").update({ qty: newQty }).eq("id", assignmentId);
    }
    await supabase.from("inventory").update({ available: item.available + qtyToReturn }).eq("id", itemId);
    await addLog("Item Returned", currentUser.name, `${qtyToReturn}× ${item?.name} returned by ${getUser(userId)?.name}`);
    showToast(`${qtyToReturn}× ${item?.name} returned!`);
  };

  const reportUnitIncident = async () => {
    const { unitId, type, note, reportedBy } = form;
    if (!unitId || !type) return showToast("Fill in all fields","error");
    const unit = getUnit(Number(unitId));
    if (!unit) return showToast("Unit not found","error");
    const activeUA = unitAssignments.find(ua => ua.unit_id === unit.id && ua.status === "active");
    setSaving(true);
    try {
      await supabase.from("units").update({ status:type, condition:type }).eq("id", unit.id);
      if (activeUA) await supabase.from("unit_assignments").update({ status:"returned", returned_at:today }).eq("id", activeUA.id);
      await supabase.from("incidents").insert({ item_id:unit.item_id, qty:1, type, reported_by:reportedBy||currentUser.name, held_by_user_id:activeUA?.user_id||null, note:note||"", date:today, status:"open", unit_id:unit.id });
      await addLog(type==="damaged"?"Unit Damaged":"Unit Lost", currentUser.name, `${unit.unit_code} marked as ${type}`);
      closeModal(`${unit.unit_code} reported as ${type}!`);
    } catch { showToast("Failed to report incident","error"); }
    setSaving(false);
  };

  // ── TRANSFERS (Staff peer-to-peer) ─────────────────────────────────────────
  const submitTransfer = async () => {
    const { selectedUnitIds, toUserId, note } = form;
    if (!selectedUnitIds || selectedUnitIds.length === 0 || !toUserId) return showToast("Fill in all fields","error");
    setSaving(true);
    try {
      for (const uid of selectedUnitIds) {
        const unit = getUnit(Number(uid));
        if (!unit) continue;
        await supabase.from("transfers").insert({
          from_user_id: currentUser.id,
          to_user_id: Number(toUserId),
          item_id: unit.item_id,
          qty: 1,
          status: "pending",
          note: note||"",
          date: today,
          unit_id: unit.id,
        });
      }
      const codes = selectedUnitIds.map(uid => getUnit(Number(uid))?.unit_code).join(", ");
      await addLog("Transfer Sent", currentUser.name, `Sent ${codes} → ${getUser(Number(toUserId))?.name}`);
      closeModal(`${selectedUnitIds.length} device${selectedUnitIds.length>1?"s":""} transfer request sent!`);
    } catch { showToast("Failed to submit transfer","error"); }
    setSaving(false);
  };

  const acceptTransfer = async (t) => {
    const activeUA = unitAssignments.find(ua => ua.unit_id === t.unit_id && ua.status === "active");
    await supabase.from("transfers").update({ status:"accepted" }).eq("id", t.id);
    if (activeUA) {
      await supabase.from("unit_assignments").update({ status:"returned", returned_at:today }).eq("id", activeUA.id);
    }
    await supabase.from("unit_assignments").insert({
      unit_id: t.unit_id,
      user_id: t.to_user_id,
      assigned_at: today,
      status: "active",
      return_due_date: activeUA?.return_due_date || null,
    });
    await addLog("Transfer Accepted", currentUser.name, `${getUnit(t.unit_id)?.unit_code} transferred to ${getUser(t.to_user_id)?.name}`);
    showToast("Transfer accepted!");
  };

  const declineTransfer = async (t) => {
    await supabase.from("transfers").update({ status:"declined" }).eq("id", t.id);
    showToast("Transfer declined.");
  };

  // ── EXTENSION REQUESTS ─────────────────────────────────────────────────────
  const submitExtension = async () => {
    const { uaId, newDate, reason } = form;
    if (!uaId || !newDate || !reason) return showToast("Fill in all fields","error");
    const ua = unitAssignments.find(u => u.id === Number(uaId));
    if (!ua) return showToast("Assignment not found","error");
    const unit = getUnit(ua.unit_id);
    setSaving(true);
    try {
      await supabase.from("extension_requests").insert({
        unit_assignment_id: Number(uaId),
        unit_id: ua.unit_id,
        user_id: currentUser.id,
        requested_date: newDate,
        reason,
        status: "pending",
        created_at: today,
      });
      await addLog("Extension Requested", currentUser.name, `${unit?.unit_code} — new return date: ${newDate}`);
      closeModal("Extension request submitted!");
    } catch { showToast("Failed to submit extension","error"); }
    setSaving(false);
  };

  const approveExtension = async (ext) => {
    await supabase.from("unit_assignments").update({ return_due_date: ext.requested_date }).eq("id", ext.unit_assignment_id);
    await supabase.from("extension_requests").update({ status:"approved" }).eq("id", ext.id);
    await addLog("Extension Approved", currentUser.name, `${getUnit(ext.unit_id)?.unit_code} extended to ${ext.requested_date}`);
    showToast("Extension approved!");
  };

  const denyExtension = async (ext) => {
    await supabase.from("extension_requests").update({ status:"denied" }).eq("id", ext.id);
    showToast("Extension denied.");
  };

  // ── STANDARD ACTIONS ───────────────────────────────────────────────────────
  const submitRequest = async () => {
    if (cart.length === 0) return showToast("Add at least one item to your request","error");
    for (const c of cart) {
      const item = getItem(Number(c.itemId));
      if (!item) return showToast("Invalid item in cart","error");
      const isTracked = units.some(u => u.item_id === Number(c.itemId));
      if (isTracked) {
        const available = units.filter(u => u.item_id === Number(c.itemId) && u.status === "available").length;
        if (Number(c.qty) > available) return showToast(`Only ${available} ${item.name} available!`, "error");
      }
    }
    setSaving(true);
    const groupId = crypto.randomUUID();
    const note = form.note || "";
    const rows = cart.map(c => ({
      from_user_id: currentUser.id, item_id: Number(c.itemId), qty: Number(c.qty),
      status: "pending", note, date: today, return_due_date: c.returnDate || null, group_id: groupId,
    }));
    const { error } = await supabase.from("requests").insert(rows);
    if (error) { showToast("Failed to submit: " + error.message, "error"); setSaving(false); return; }
    const summary = cart.map(c => `${c.qty}× ${getItem(Number(c.itemId))?.name}`).join(", ");
    await addLog("Request", currentUser.name, `Requested ${summary}`);
    // Email admins & assistants
    const admins = users.filter(u => (u.role === "admin" || u.role === "inventory_assistant") && u.email);
    if (admins.length) {
      const items = cart.map(c => ({ name: getItem(Number(c.itemId))?.name, qty: c.qty }));
      sendNotificationEmail(admins.map(u => u.email), `New Request from ${currentUser.name}`, buildNewRequestEmail(currentUser.name, items, note));
    }
    setCart([]);
    closeModal("Request submitted!");
    setSaving(false);
  };

  const rejectRequest = async req => {
    await supabase.from("requests").update({ status:"rejected" }).eq("id", req.id);
    const item = getItem(req.item_id);
    const requester = getUser(req.from_user_id);
    await addLog("Rejected", currentUser.name, `Rejected ${item?.name} from ${requester?.name}`);
    if (requester?.email) {
      sendNotificationEmail([requester.email], `Request Rejected: ${item?.name}`, buildRejectionEmail(requester.name, item?.name, req.qty));
    }
    showToast("Request rejected.");
  };

  const submitAddItem = async () => {
    const { name, category, total, unit, tracked } = form;
    if (!name || !tracked) return showToast("Fill in all fields","error");
    setSaving(true);
    try {
      await supabase.from("inventory").insert({ name, category:category||"General", total:Number(total)||0, available:Number(total)||0, unit:unit||"pcs", tracked:tracked==="yes" });
      await addLog("Added Item", currentUser.name, `Added ${name}`);
      closeModal("Item added!");
    } catch { showToast("Failed to add item","error"); }
    setSaving(false);
  };

  const submitEditItem = async () => {
    const { id, name, category, total, unit } = form;
    if (!name) return showToast("Fill in all fields","error");
    const item = getItem(id);
    const co = item.total - item.available;
    setSaving(true);
    try {
      await supabase.from("inventory").update({ name, category:category||"General", total:Number(total), available:Math.max(0,Number(total)-co), unit:unit||"pcs" }).eq("id", id);
      await addLog("Edited Item", currentUser.name, `Updated "${name}"`);
      closeModal("Item updated!");
    } catch { showToast("Failed to update item","error"); }
    setSaving(false);
  };

  const deleteItem = async itemId => {
    const item = getItem(itemId);
    await supabase.from("inventory").delete().eq("id", itemId);
    await addLog("Deleted Item", currentUser.name, `Removed "${item?.name}"`);
    setConfirmAction(null); showToast(`"${item?.name}" deleted`);
  };

  const submitAddUser = async () => {
    const { name, role, email, password } = form;
    if (!name) return showToast("Name is required","error");
    if (!validEmail(email)) return showToast("Valid email is required","error");
    if (!password || password.length < 4) return showToast("Password must be at least 4 characters","error");
    if (emailTaken(email, -1)) return showToast("Email already in use","error");
    const colors = [BRAND.primary,"#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4"];
    setSaving(true);
    const { error } = await supabase.from("users").insert({ name, role:role||"staff", avatar:initials(name), color:colors[users.length%colors.length], email, password, pin:"0000" });
    if (error) { showToast("Failed to add user: " + error.message, "error"); setSaving(false); return; }
    await addLog("User Added", currentUser.name, `Added ${name} as ${role||"staff"}`);
    closeModal("User added!");
    setSaving(false);
  };

  const submitChangePassword = async () => {
    const { targetUserId, newEmail, newPassword } = form;
    if (newEmail && !validEmail(newEmail)) return showToast("Valid email is required","error");
    if (newEmail && emailTaken(newEmail, Number(targetUserId))) return showToast("Email already in use","error");
    if (!newPassword || newPassword.length < 4) return showToast("Password must be at least 4 characters","error");
    const updates = { password: newPassword };
    if (newEmail) updates.email = newEmail;
    setSaving(true);
    try {
      await supabase.from("users").update(updates).eq("id", Number(targetUserId));
      closeModal("Credentials updated!");
    } catch { showToast("Failed to update credentials","error"); }
    setSaving(false);
  };

  const submitEditUserName = async () => {
    const { targetUserId, targetName } = form;
    if (!targetName?.trim()) return showToast("Name is required","error");
    setSaving(true);
    try {
      await supabase.from("users").update({ name:targetName.trim(), avatar:initials(targetName.trim()) }).eq("id", Number(targetUserId));
      await addLog("User Updated", currentUser.name, `Renamed user to ${targetName.trim()}`);
      closeModal("Name updated!");
    } catch { showToast("Failed to update name","error"); }
    setSaving(false);
  };

  const submitMyAccount = async () => {
    const { myNewName, myNewEmail, myCurrentPassword, myNewPassword } = form;
    if (myCurrentPassword !== currentUser.password) return showToast("Current password is incorrect","error");
    if (myNewEmail && !validEmail(myNewEmail)) return showToast("Valid email is required","error");
    if (myNewEmail && emailTaken(myNewEmail, currentUser.id)) return showToast("Email already in use","error");
    if (myNewPassword && myNewPassword.length < 4) return showToast("New password must be at least 4 characters","error");
    const updates = {};
    if (myNewName && myNewName !== currentUser.name) {
      updates.name = myNewName;
      updates.avatar = initials(myNewName);
    }
    if (myNewEmail) updates.email = myNewEmail;
    if (myNewPassword) updates.password = myNewPassword;
    if (Object.keys(updates).length === 0) return showToast("No changes to save","error");
    setSaving(true);
    try {
      await supabase.from("users").update(updates).eq("id", currentUser.id);
      closeModal("Account updated!");
    } catch { showToast("Failed to update account","error"); }
    setSaving(false);
  };

  const submitChangeRole = async () => {
    const { targetUserId, newRole } = form;
    if (!newRole) return showToast("Select a role","error");
    const u = getUser(Number(targetUserId));
    setSaving(true);
    try {
      await supabase.from("users").update({ role:newRole }).eq("id", Number(targetUserId));
      await addLog("Role Changed", currentUser.name, `Changed ${u?.name}'s role to ${newRole}`);
      closeModal("Role updated!");
    } catch { showToast("Failed to update role","error"); }
    setSaving(false);
  };

  const removeUser = async uid => {
    const u = getUser(uid);
    await supabase.from("users").delete().eq("id", uid);
    await addLog("User Removed", currentUser.name, `Removed ${u?.name}`);
    setConfirmAction(null); showToast(`${u?.name} removed`);
  };

  const resolveIncident = async (id, resolution) => {
    const inc = incidents.find(i => i.id === id);
    await supabase.from("incidents").update({ status:"resolved", resolution, resolved_date:today }).eq("id", id);
    if (inc.unit_id && (resolution==="repaired"||resolution==="replaced")) {
      await supabase.from("units").update({ status:"available", condition:"good" }).eq("id", inc.unit_id);
    }
    await addLog("Incident Resolved", currentUser.name, `${getUnit(inc.unit_id)?.unit_code||getItem(inc.item_id)?.name} — ${resolution}`);
    showToast("Incident resolved!");
  };

  // ── HELPERS ────────────────────────────────────────────────────────────────
  const Avatar = ({ user, size=36 }) => (
    <div style={{ width:size,height:size,borderRadius:"50%",background:user?.color||BRAND.primary,color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:size*0.35,flexShrink:0 }}>{user?.avatar||"?"}</div>
  );
  const StatusBadge = ({ s }) => {
    const map = { pending:"#fef9c3|#a16207",approved:"#dcfce7|#15803d",rejected:"#fee2e2|#b91c1c",accepted:"#dcfce7|#15803d",declined:"#fee2e2|#b91c1c",open:"#fee2e2|#b91c1c",resolved:"#dcfce7|#15803d",available:"#dcfce7|#15803d",assigned:"#dbeafe|#1d4ed8",damaged:"#fff7ed|#c2410c",lost:"#fee2e2|#b91c1c",overdue:"#fee2e2|#b91c1c",denied:"#fee2e2|#b91c1c" };
    const [bg,color] = (map[s]||"#f3f4f6|#374151").split("|");
    return <span style={{ background:bg,color,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>{s}</span>;
  };
  const Card = ({ children, style }) => <div style={{ background:"var(--surface)",borderRadius:14,padding:16,marginBottom:12,boxShadow:"var(--card-shadow)",...style }}>{children}</div>;
  const SectionLabel = ({ label }) => <div style={{ fontSize:12,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,marginTop:4 }}>{label}</div>;
  const RoleBadge = ({ role }) => {
    const map = { admin:[BRAND.pale,BRAND.primary,"Admin"],inventory_assistant:["#fef3c7","#92400e","Inv. Assistant"],staff:["#f3f4f6","#6b7280","Staff"] };
    const [bg,color,label] = map[role]||map.staff;
    return <span style={{ background:bg,color,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>{label}</span>;
  };

  const DueBadge = ({ ua }) => {
    if (!ua.return_due_date) return null;
    if (isOverdue(ua)) return <span style={{ background:"#fee2e2",color:"#b91c1c",borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700,animation:"pulse 1.5s infinite" }}>⚠️ OVERDUE</span>;
    if (isDueSoon(ua)) return <span style={{ background:"#fff7ed",color:"#c2410c",borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>⏰ Due soon</span>;
    return <span style={{ background:"#f0fdf4",color:"#15803d",borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>📅 {ua.return_due_date}</span>;
  };

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (!loaded) return (
    <><DarkModeStyles />
      <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:BRAND.gradient }}>
        <Logo size={72} />
        <div style={{ color:"white",fontSize:16,fontWeight:700,marginTop:20 }}>Loading inventory...</div>
        <div style={{ color:"rgba(255,255,255,0.5)",fontSize:13,marginTop:6 }}>Connecting to Supabase</div>
      </div>
    </>
  );

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (!currentUserId) return (
    <><DarkModeStyles />
      <div style={{ minHeight:"100vh",background:BRAND.gradient,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
        <div style={{ background:"var(--surface)",borderRadius:20,padding:40,width:"100%",maxWidth:400,boxShadow:"0 24px 64px rgba(0,0,0,0.4)" }}>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:4 }}>
            <button onClick={() => setDark(d=>!d)} title="Toggle dark mode" style={{ background:"rgba(98,64,204,0.12)",border:"none",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:16,color:BRAND.primary,fontWeight:700 }}>{dark?"☀️":"🌙"}</button>
          </div>
          <div style={{ textAlign:"center",marginBottom:28 }}>
            <div style={{ display:"flex",justifyContent:"center",marginBottom:12 }}><Logo size={160} /></div>
            <h1 style={{ fontSize:22,fontWeight:800,color:"var(--text)",margin:0 }}>Office Inventory</h1>
            <p style={{ color:"var(--text3)",fontSize:12,marginTop:4 }}>Asset & Equipment Management</p>
          </div>
          <label style={lbl}>Work Email</label>
          <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
            onKeyDown={e => e.key==="Enter" && handleLogin()}
            placeholder="you@company.com"
            style={inp} />
          <label style={lbl}>Password</label>
          <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
            onKeyDown={e => e.key==="Enter" && handleLogin()}
            placeholder="••••••••"
            style={{ ...inp, marginBottom:6 }} />
          {loginLocked && (
            <div style={{ background:"#fee2e2",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#991b1b",marginBottom:10,marginTop:8 }}>
              🔒 Too many attempts. Wait {lockTimer}s to try again.
            </div>
          )}
          {loginErr && !loginLocked && (
            <div style={{ color:"#ef4444",fontSize:13,marginBottom:8,marginTop:6 }}>{loginErr}</div>
          )}
          <button onClick={handleLogin} disabled={loginLocked}
            style={{ ...btn, background:loginLocked?"#94a3b8":BRAND.gradLight, cursor:loginLocked?"not-allowed":"pointer", opacity:loginLocked?0.7:1 }}>
            Sign In
          </button>
        </div>
      </div>
    </>
  );

  // ── TABS ───────────────────────────────────────────────────────────────────
  const overdueCount = unitAssignments.filter(ua => ua.status==="active" && isOverdue(ua)).length;
  const adminTabs = [
    { id:"dashboard",label:"Dashboard",icon:"📊" },
    { id:"inventory",label:"Inventory",icon:"🗄️" },
    { id:"requests",label:"Requests",icon:"📋",badge:pendingRequests.length },
    { id:"devices",label:"Devices",icon:"📱",badge:overdueCount },
    { id:"incidents",label:"Incidents",icon:"⚠️",badge:openIncidents.length },
    { id:"team",label:"Team",icon:"👥" },
    { id:"log",label:"Log",icon:"📜" },
  ];
  const assistantTabs = [
    { id:"dashboard",label:"Dashboard",icon:"📊" },
    { id:"inventory",label:"Inventory",icon:"🗄️" },
    { id:"requests",label:"Requests",icon:"📋",badge:pendingRequests.length+pendingExtensions.length },
    { id:"devices",label:"Devices",icon:"📱",badge:overdueCount },
    { id:"incidents",label:"Incidents",icon:"⚠️",badge:openIncidents.length },
  ];
  const myOverdue = myUnitAssignments.filter(ua => isOverdue(ua)).length;
  const myPendingTransfers = pendingTransfersForMe.length;
  const staffTabs = [
    { id:"dashboard",label:"My Items",icon:"🎒",badge:myOverdue },
    { id:"request",label:"Request",icon:"📋" },
    { id:"transfers",label:"Transfer",icon:"🔄",badge:myPendingTransfers },
    { id:"report",label:"Report",icon:"⚠️" },
  ];
  const tabs = isAdmin ? adminTabs : isAssistant ? assistantTabs : staffTabs;

  return (
    <><DarkModeStyles />
    <div style={{ minHeight:"100vh",background:"var(--bg)",fontFamily:"system-ui,-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ background:BRAND.gradLight,padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 2px 12px rgba(98,64,204,0.4)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",background:"white",borderRadius:10,padding:4 }}>
            <img src="/icon_purple.svg" alt="Icon" style={{ width:28,height:28,objectFit:"contain" }} />
          </div>
          <div>
            <div style={{ color:"white",fontWeight:800,fontSize:15 }}>Office Inventory</div>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:syncing?"#fbbf24":"#34d399" }} />
              <div style={{ color:"rgba(255,255,255,0.7)",fontSize:10 }}>{syncing?"Syncing...":"Live"}</div>
            </div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <button onClick={() => setDark(d=>!d)} title="Toggle dark mode" style={{ background:"rgba(255,255,255,0.18)",border:"none",color:"white",padding:"6px 10px",borderRadius:8,cursor:"pointer",fontSize:15,lineHeight:1 }}>{dark?"☀️":"🌙"}</button>
          <button onClick={() => { setModal("myAccount"); setForm({ myNewName:currentUser?.name, myNewEmail:currentUser?.email }); }} style={{ background:"rgba(255,255,255,0.18)",border:"none",color:"white",padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6 }}>
            <Avatar user={currentUser} size={22} />
            {currentUser?.name}
          </button>
          <button onClick={handleLogout} style={{ background:"rgba(255,255,255,0.18)",border:"none",color:"white",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600 }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth:680,margin:"0 auto",padding:"16px 12px 90px" }}>

        {/* ── ADMIN DASHBOARD ── */}
        {tab==="dashboard" && isAdmin && (() => {
          const totalDamaged = incidents.filter(i=>i.type==="damaged").reduce((s,i)=>s+i.qty,0);
          const totalLost = incidents.filter(i=>i.type==="lost").reduce((s,i)=>s+i.qty,0);
          return (
            <div>
              <h2 style={{ fontWeight:800,color:"var(--text)",marginBottom:16,fontSize:20 }}>Overview</h2>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20 }}>
                {[
                  { label:"Total Items",val:inventory.length,icon:"🗄️",color:BRAND.primary,sub:`${inventory.reduce((s,i)=>s+i.total,0)} units` },
                  { label:"Tracked Units",val:units.length,icon:"📱",color:"#3b82f6",sub:`${units.filter(u=>u.status==="available").length} available` },
                  { label:"Overdue",val:overdueCount,icon:"⚠️",color:"#ef4444",sub:"devices not returned" },
                  { label:"Open Incidents",val:openIncidents.length,icon:"🔧",color:"#f59e0b",sub:"unresolved" },
                ].map(c => (
                  <div key={c.label} style={{ background:"var(--surface)",borderRadius:14,padding:16,boxShadow:"var(--card-shadow)" }}>
                    <div style={{ fontSize:26,marginBottom:6 }}>{c.icon}</div>
                    <div style={{ fontSize:26,fontWeight:800,color:c.color }}>{c.val}</div>
                    <div style={{ fontSize:12,fontWeight:700,color:"var(--text2)" }}>{c.label}</div>
                    <div style={{ fontSize:11,color:"var(--text4)" }}>{c.sub}</div>
                  </div>
                ))}
              </div>
              {overdueCount > 0 && (
                <div style={{ background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:14,padding:14,marginBottom:16 }}>
                  <div style={{ fontWeight:700,color:"#b91c1c",fontSize:14,marginBottom:8 }}>⚠️ {overdueCount} Overdue Device{overdueCount>1?"s":""}</div>
                  {unitAssignments.filter(ua=>ua.status==="active"&&isOverdue(ua)).slice(0,4).map(ua => (
                    <div key={ua.id} style={{ fontSize:13,color:"#991b1b",marginBottom:4 }}>• {getUnit(ua.unit_id)?.unit_code} — {getUser(ua.user_id)?.name} (due {ua.return_due_date})</div>
                  ))}
                </div>
              )}
              <h3 style={{ fontWeight:700,color:"var(--text2)",marginBottom:10,fontSize:15 }}>Stock Levels</h3>
              {inventory.map(item => {
                const itemUnits = units.filter(u=>u.item_id===item.id);
                const isTracked = itemUnits.length > 0;
                const availableUnits = itemUnits.filter(u=>u.status==="available").length;
                const pct = isTracked ? Math.round((availableUnits/itemUnits.length)*100) : item.total>0?Math.round((item.available/item.total)*100):0;
                const color = pct>50?"#10b981":pct>20?"#f59e0b":"#ef4444";
                return (
                  <Card key={item.id}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                      <div>
                        <div style={{ fontWeight:700,fontSize:14,color:"var(--text)" }}>{item.name}</div>
                        <div style={{ fontSize:11,color:"var(--text4)" }}>{item.category} {isTracked&&<span style={{ background:BRAND.pale,color:BRAND.primary,borderRadius:99,padding:"1px 7px",fontSize:10,fontWeight:700,marginLeft:4 }}>Unit Tracked</span>}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:800,fontSize:18,color }}>{isTracked?availableUnits:item.available}</div>
                        <div style={{ fontSize:11,color:"var(--text4)" }}>of {isTracked?itemUnits.length:item.total} {isTracked?"units":item.unit}</div>
                      </div>
                    </div>
                    <div style={{ background:"var(--bg)",borderRadius:99,height:7 }}><div style={{ width:`${pct}%`,background:color,borderRadius:99,height:7,transition:"width 0.5s" }} /></div>
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* ── ASSISTANT DASHBOARD ── */}
        {tab==="dashboard" && isAssistant && (
          <div>
            <h2 style={{ fontWeight:800,color:"var(--text)",marginBottom:16,fontSize:20 }}>Assistant Dashboard</h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20 }}>
              {[
                { label:"Pending Requests",val:pendingRequests.length,icon:"📋",color:BRAND.primary },
                { label:"Available Units",val:units.filter(u=>u.status==="available").length,icon:"✅",color:"#10b981" },
                { label:"Overdue",val:overdueCount,icon:"⚠️",color:"#ef4444" },
                { label:"Ext. Requests",val:pendingExtensions.length,icon:"📅",color:"#f59e0b" },
              ].map(c => (
                <div key={c.label} style={{ background:"var(--surface)",borderRadius:14,padding:16,boxShadow:"var(--card-shadow)" }}>
                  <div style={{ fontSize:26,marginBottom:6 }}>{c.icon}</div>
                  <div style={{ fontSize:26,fontWeight:800,color:c.color }}>{c.val}</div>
                  <div style={{ fontSize:12,fontWeight:700,color:"var(--text2)" }}>{c.label}</div>
                </div>
              ))}
            </div>
            {pendingExtensions.length > 0 && (
              <div style={{ background:"#fffbeb",border:"1.5px solid #fcd34d",borderRadius:14,padding:14,marginBottom:12 }}>
                <div style={{ fontWeight:700,color:"#92400e",fontSize:14,marginBottom:8 }}>📅 {pendingExtensions.length} Extension Request{pendingExtensions.length>1?"s":""} pending</div>
                {pendingExtensions.slice(0,3).map(ext => (
                  <div key={ext.id} style={{ fontSize:13,color:"#78350f",marginBottom:4 }}>• {getUnit(ext.unit_id)?.unit_code} — {getUser(ext.user_id)?.name} wants until {ext.requested_date}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INVENTORY ── */}
        {tab==="inventory" && isAdminOrAssistant && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <h2 style={{ fontWeight:800,color:"var(--text)",margin:0,fontSize:20 }}>Inventory</h2>
              <button onClick={() => { setModal("addItem"); setForm({}); }} style={{ background:BRAND.primary,color:"white",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:700 }}>+ Add Item</button>
            </div>
            <input style={{ ...inp,marginBottom:14 }} placeholder="🔍 Search items..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            {inventory.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase())||i.category?.toLowerCase().includes(searchQ.toLowerCase())).map(item => {
              const itemUnits = units.filter(u=>u.item_id===item.id);
              const isTracked = itemUnits.length > 0;
              const availableUnits = itemUnits.filter(u=>u.status==="available").length;
              return (
                <Card key={item.id}>
                  <div style={{ display:"flex",justifyContent:"space-between" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700,fontSize:15,color:"var(--text)" }}>{item.name}</div>
                      <div style={{ fontSize:12,color:"var(--text3)" }}>{item.category} {isTracked&&<span style={{ background:BRAND.pale,color:BRAND.primary,borderRadius:99,padding:"1px 7px",fontSize:10,fontWeight:700 }}>Unit Tracked</span>}</div>
                    </div>
                    <div style={{ display:"flex",alignItems:"flex-start",gap:8 }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:20,fontWeight:800,color:availableUnits>0||item.available>0?"#10b981":"#ef4444" }}>{isTracked?availableUnits:item.available}</div>
                        <div style={{ fontSize:11,color:"var(--text4)" }}>{isTracked?`of ${itemUnits.length} units`:`of ${item.total} ${item.unit}`}</div>
                      </div>
                      <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                        <button onClick={() => { setModal("generateUnits"); setForm({ itemId:String(item.id) }); }} style={{ background:"#dbeafe",color:"#1d4ed8",border:"none",borderRadius:7,padding:"5px 9px",fontSize:11,cursor:"pointer",fontWeight:700 }}>+ Units</button>
                        {isAdmin && <button onClick={() => { setModal("editItem"); setForm({ id:item.id,name:item.name,category:item.category,total:item.total,unit:item.unit }); }} style={{ background:BRAND.pale,color:BRAND.dark,border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontWeight:700 }}>✏️</button>}
                        {isAdmin && <button onClick={() => setConfirmAction({ type:"deleteItem",itemId:item.id,name:item.name })} style={{ background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:7,padding:"5px 9px",fontSize:12,cursor:"pointer",fontWeight:700 }}>🗑️</button>}
                      </div>
                    </div>
                  </div>
                  {isTracked && (
                    <div style={{ marginTop:10,borderTop:"1px solid var(--border)",paddingTop:10 }}>
                      <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                        {[{s:"available",c:"#dcfce7",t:"#15803d"},{s:"assigned",c:"#dbeafe",t:"#1d4ed8"},{s:"damaged",c:"#fff7ed",t:"#c2410c"},{s:"lost",c:"#fee2e2",t:"#b91c1c"}].map(({s,c,t}) => {
                          const count = itemUnits.filter(u=>u.status===s).length;
                          if (!count) return null;
                          return <span key={s} style={{ background:c,color:t,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:700 }}>{count} {s}</span>;
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── DEVICES TAB ── */}
        {tab==="devices" && isAdminOrAssistant && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <h2 style={{ fontWeight:800,color:"var(--text)",margin:0,fontSize:20 }}>Device Tracker</h2>
              <button onClick={() => { setModal("generateUnits"); setForm({}); }} style={{ background:BRAND.primary,color:"white",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:700 }}>+ Add Units</button>
            </div>
            <input style={{ ...inp,marginBottom:14 }} placeholder="🔍 Filter by unit code or person name..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />

            {/* Return All button — shown when filtering by a person */}
            {(() => {
              if (!searchQ) return null;
              const matchedUser = users.find(u => u.name.toLowerCase().includes(searchQ.toLowerCase()));
              if (!matchedUser) return null;
              const theirUAs = unitAssignments.filter(ua => ua.user_id === matchedUser.id && ua.status === "active");
              const theirAssigns = assignments.filter(a => a.user_id === matchedUser.id);
              if (theirUAs.length === 0 && theirAssigns.length === 0) return null;
              return (
                <div style={{ background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:12,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color:"#b91c1c" }}>Showing items for <strong>{matchedUser.name}</strong></div>
                    <div style={{ fontSize:12,color:"#991b1b" }}>{theirUAs.length} device{theirUAs.length!==1?"s":""} + {theirAssigns.length} item type{theirAssigns.length!==1?"s":""} assigned</div>
                  </div>
                  <button onClick={() => setConfirmAction({ type:"returnAll", userId:matchedUser.id, name:matchedUser.name })}
                    style={{ background:"#ef4444",color:"white",border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap" }}>
                    ↩ Return All
                  </button>
                </div>
              );
            })()}

            {/* Quantity-only item assignments */}
            {assignments.filter(a => {
              const u = getUser(a.user_id);
              return searchQ===""||u?.name.toLowerCase().includes(searchQ.toLowerCase());
            }).length > 0 && (
              <div>
                <SectionLabel label="Quantity Items" />
                {assignments.filter(a => {
                  const u = getUser(a.user_id);
                  return searchQ===""||u?.name.toLowerCase().includes(searchQ.toLowerCase());
                }).map(a => {
                  const item = getItem(a.item_id);
                  const assignedUser = getUser(a.user_id);
                  return (
                    <Card key={a.id} style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <div style={{ background:"#f3f4f6",borderRadius:10,padding:"8px 12px",fontWeight:800,fontSize:14,color:"var(--text2)" }}>📦</div>
                          <div>
                            <div style={{ fontWeight:700,fontSize:14,color:"var(--text)" }}>{item?.name}</div>
                            <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:4 }}>
                              <Avatar user={assignedUser} size={22} />
                              <div style={{ fontSize:12,color:"var(--text3)" }}>{assignedUser?.name} · <strong>×{a.qty} {item?.unit}</strong></div>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => { setModal("returnQty"); setForm({ assignmentId:String(a.id), userId:String(a.user_id), itemId:String(a.item_id), maxQty:a.qty, returnQty:String(a.qty) }); }}
                          style={{ background:"#fef3c7",color:"#92400e",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:700 }}>↩ Return</button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Tracked units */}
            {inventory.filter(item => units.some(u=>u.item_id===item.id)).map(item => {
              const itemUnits = units.filter(u => u.item_id===item.id && (
                searchQ===""||u.unit_code.toLowerCase().includes(searchQ.toLowerCase())||
                (()=>{ const ua=unitAssignments.find(a=>a.unit_id===u.id&&a.status==="active"); return ua?getUser(ua.user_id)?.name.toLowerCase().includes(searchQ.toLowerCase()):false; })()
              ));
              if (!itemUnits.length) return null;
              return (
                <div key={item.id}>
                  <SectionLabel label={`${item.name} — ${itemUnits.length} units shown`} />
                  {itemUnits.map(unit => {
                    const activeUA = unitAssignments.find(ua=>ua.unit_id===unit.id&&ua.status==="active");
                    const assignedUser = activeUA ? getUser(activeUA.user_id) : null;
                    const overdue = activeUA && isOverdue(activeUA);
                    return (
                      <Card key={unit.id} style={{ padding:"12px 14px",borderLeft:overdue?"4px solid #ef4444":"4px solid transparent" }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                            <div style={{ background:BRAND.pale,borderRadius:10,padding:"8px 12px",fontWeight:800,fontSize:14,color:BRAND.dark,fontFamily:"monospace" }}>{unit.unit_code}</div>
                            <div>
                              {assignedUser ? (
                                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                                  <Avatar user={assignedUser} size={28} />
                                  <div>
                                    <div style={{ fontWeight:700,fontSize:13,color:"var(--text)" }}>{assignedUser.name}</div>
                                    <div style={{ fontSize:11,color:"var(--text4)" }}>Since {activeUA.assigned_at}</div>
                                    {activeUA.return_due_date && <div style={{ fontSize:11,color:overdue?"#ef4444":"var(--text4)",fontWeight:overdue?700:400 }}>Due: {activeUA.return_due_date}{overdue?" ⚠️":""}</div>}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize:13,color:"var(--text4)" }}>{unit.status==="available"?"In storage":unit.status}</div>
                              )}
                            </div>
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end" }}>
                            <StatusBadge s={unit.status} />
                            {unit.status==="assigned" && activeUA && (
                              <button onClick={() => returnUnit(activeUA)} style={{ background:"#fef3c7",color:"#92400e",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>↩ Return</button>
                            )}
                            {(unit.status==="available"||unit.status==="assigned") && (
                              <button onClick={() => { setModal("reportUnitIncident"); setForm({ unitId:String(unit.id),reportedBy:currentUser.name }); }} style={{ background:"#fff7ed",color:"#c2410c",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>⚠️</button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })}
            {units.length===0 && assignments.length===0 && <div style={{ color:"var(--text4)",textAlign:"center",marginTop:60 }}>No tracked units yet.</div>}
          </div>
        )}

        {/* ── REQUESTS (Admin & Assistant) — includes extensions ── */}
        {tab==="requests" && isAdminOrAssistant && (
          <div>
            <h2 style={{ fontWeight:800,color:"var(--text)",marginBottom:16,fontSize:20 }}>Requests</h2>

            {/* Extension requests section */}
            {pendingExtensions.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <SectionLabel label={`📅 Extension Requests (${pendingExtensions.length})`} />
                {pendingExtensions.map(ext => {
                  const ua = unitAssignments.find(u => u.id === ext.unit_assignment_id);
                  return (
                    <Card key={ext.id} style={{ borderLeft:"4px solid #f59e0b" }}>
                      <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                        <Avatar user={getUser(ext.user_id)} size={38} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700,fontSize:14,color:"var(--text)" }}>{getUser(ext.user_id)?.name}</div>
                          <div style={{ fontSize:13,color:"var(--text2)",marginTop:2 }}>
                            Wants to keep <strong style={{ fontFamily:"monospace" }}>{getUnit(ext.unit_id)?.unit_code}</strong> until <strong>{ext.requested_date}</strong>
                          </div>
                          {ua?.return_due_date && <div style={{ fontSize:12,color:"var(--text4)" }}>Current due: {ua.return_due_date}</div>}
                          <div style={{ fontSize:12,color:"var(--text3)",fontStyle:"italic",marginTop:4 }}>Reason: "{ext.reason}"</div>
                          <div style={{ fontSize:11,color:"var(--text4)",marginTop:2 }}>{ext.created_at}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:8,marginTop:12 }}>
                        <button onClick={() => approveExtension(ext)} style={{ flex:1,background:"#10b981",color:"white",border:"none",borderRadius:8,padding:"9px",cursor:"pointer",fontWeight:700,fontSize:13 }}>✓ Approve</button>
                        <button onClick={() => denyExtension(ext)} style={{ flex:1,background:"#ef4444",color:"white",border:"none",borderRadius:8,padding:"9px",cursor:"pointer",fontWeight:700,fontSize:13 }}>✗ Deny</button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {requests.length===0 && pendingExtensions.length===0 && <div style={{ color:"var(--text4)",textAlign:"center",marginTop:60 }}>No requests yet.</div>}
            {(() => {
              // Group requests by group_id
              const grouped = {};
              requests.forEach(r => {
                const key = r.group_id || `legacy_${r.id}`;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(r);
              });
              const groupEntries = Object.entries(grouped);
              // Sort: pending groups first, then by date desc
              const statusOrder = { pending: 0, approved: 1, rejected: 2 };
              groupEntries.sort((a, b) => {
                const aStatus = a[1].some(r=>r.status==="pending") ? "pending" : a[1][0].status;
                const bStatus = b[1].some(r=>r.status==="pending") ? "pending" : b[1][0].status;
                if (statusOrder[aStatus] !== statusOrder[bStatus]) return statusOrder[aStatus] - statusOrder[bStatus];
                return b[1][0].id - a[1][0].id;
              });
              // Render by status sections
              return ["pending","approved","rejected"].map(status => {
                const sectionGroups = groupEntries.filter(([,reqs]) => {
                  if (status === "pending") return reqs.some(r=>r.status==="pending");
                  if (status === "approved") return reqs.every(r=>r.status==="approved");
                  return reqs.every(r=>r.status==="rejected");
                });
                if (!sectionGroups.length) return null;
                return (
                  <div key={status}>
                    <SectionLabel label={status} />
                    {sectionGroups.map(([gid, reqs]) => {
                      const requester = getUser(reqs[0].from_user_id);
                      return (
                        <Card key={gid}>
                          <div style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:8 }}>
                            <Avatar user={requester} size={38} />
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700,fontSize:14,color:"var(--text)" }}>{requester?.name}</div>
                              <div style={{ fontSize:13,color:"var(--text2)",marginTop:2 }}>{reqs.length} item{reqs.length>1?"s":""} requested</div>
                              {reqs[0].note && <div style={{ fontSize:12,color:"var(--text3)",fontStyle:"italic",marginTop:2 }}>"{reqs[0].note}"</div>}
                              <div style={{ fontSize:11,color:"var(--text4)",marginTop:2 }}>{reqs[0].date}</div>
                            </div>
                          </div>
                          {/* Per-item rows with individual approval */}
                          {reqs.map(req => {
                            const item = getItem(req.item_id);
                            const isTracked = units.some(u=>u.item_id===req.item_id);
                            const availableUnits = units.filter(u=>u.item_id===req.item_id&&u.status==="available");
                            const chosen = selectedUnits[req.id] || [];
                            return (
                              <div key={req.id} style={{ padding:"10px 0",borderTop:"1px solid var(--border)" }}>
                                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                                  <div style={{ fontWeight:700,fontSize:14,color:"var(--text)",flex:1 }}>{req.qty}x {item?.name}</div>
                                  <StatusBadge s={req.status} />
                                </div>
                                {req.return_due_date && <div style={{ fontSize:12,color:BRAND.primary,marginBottom:4 }}>📅 Return by: <strong>{req.return_due_date}</strong></div>}
                                {/* Tracked item approval */}
                                {req.status==="pending" && isTracked && (
                                  <div style={{ marginTop:8 }}>
                                    <div style={{ fontSize:12,fontWeight:600,color:"var(--text3)",marginBottom:6 }}>Select {req.qty} unit{req.qty>1?"s":""} ({chosen.length}/{req.qty}):</div>
                                    <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:8 }}>
                                      {availableUnits.map(u => {
                                        const isChosen = chosen.includes(String(u.id));
                                        return (
                                          <button key={u.id} onClick={() => toggleUnitSelection(req.id,String(u.id),req.qty)}
                                            style={{ padding:"5px 10px",borderRadius:8,border:`2px solid ${isChosen?BRAND.primary:"var(--border)"}`,background:isChosen?BRAND.pale:"var(--surface2)",color:isChosen?BRAND.primary:"var(--text2)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"monospace" }}>
                                            {u.unit_code}
                                          </button>
                                        );
                                      })}
                                      {availableUnits.length===0 && <div style={{ fontSize:13,color:"#ef4444",fontWeight:600 }}>No units available!</div>}
                                    </div>
                                    <label style={{ ...lbl,marginTop:4 }}>Return date</label>
                                    <input style={{ ...inp,marginBottom:8 }} type="date" min={today} value={form[`returnDate_${req.id}`]??req.return_due_date??""} onChange={e => setForm(f=>({...f,[`returnDate_${req.id}`]:e.target.value}))} />
                                    <div style={{ display:"flex",gap:8 }}>
                                      <button onClick={() => assignUnits(req)} disabled={chosen.length!==req.qty}
                                        style={{ flex:1,background:chosen.length===req.qty?BRAND.primary:"var(--border)",color:chosen.length===req.qty?"white":"var(--text4)",border:"none",borderRadius:8,padding:"8px",cursor:chosen.length===req.qty?"pointer":"not-allowed",fontWeight:700,fontSize:12 }}>
                                        ✓ Assign
                                      </button>
                                      <button onClick={() => rejectRequest(req)} style={{ flex:1,background:"#ef4444",color:"white",border:"none",borderRadius:8,padding:"8px",cursor:"pointer",fontWeight:700,fontSize:12 }}>✗ Reject</button>
                                    </div>
                                  </div>
                                )}
                                {/* Untracked item approval */}
                                {req.status==="pending" && !isTracked && (
                                  <div style={{ display:"flex",gap:8,marginTop:8 }}>
                                    <button onClick={async () => {
                                      const item = getItem(req.item_id);
                                      if (!item||item.available<req.qty) return showToast(`Only ${item?.available||0} available!`,"error");
                                      await supabase.from("requests").update({ status:"approved" }).eq("id",req.id);
                                      await supabase.from("inventory").update({ available:item.available-req.qty }).eq("id",req.item_id);
                                      const ex = assignments.find(x=>x.user_id===req.from_user_id&&x.item_id===req.item_id);
                                      if (ex) await supabase.from("assignments").update({ qty:ex.qty+req.qty }).eq("id",ex.id);
                                      else await supabase.from("assignments").insert({ item_id:req.item_id,user_id:req.from_user_id,qty:req.qty,assigned_at:today });
                                      await addLog("Approved",currentUser.name,`Approved ${req.qty}× ${item.name} for ${getUser(req.from_user_id)?.name}`);
                                      const requester = getUser(req.from_user_id);
                                      if (requester?.email) {
                                        sendNotificationEmail([requester.email], `Request Approved: ${item?.name}`, buildApprovalEmail(requester.name, item?.name, req.qty, null));
                                      }
                                      showToast("Request approved!");
                                    }} style={{ flex:1,background:"#10b981",color:"white",border:"none",borderRadius:8,padding:"8px",cursor:"pointer",fontWeight:700,fontSize:12 }}>✓ Approve</button>
                                    <button onClick={() => rejectRequest(req)} style={{ flex:1,background:"#ef4444",color:"white",border:"none",borderRadius:8,padding:"8px",cursor:"pointer",fontWeight:700,fontSize:12 }}>✗ Reject</button>
                                  </div>
                                )}
                                {/* Approved: show assigned units */}
                                {req.status==="approved" && (() => {
                                  const assignedUAs = unitAssignments.filter(ua=>ua.user_id===req.from_user_id&&ua.status==="active");
                                  const reqUnits = assignedUAs.map(ua=>getUnit(ua.unit_id)).filter(u=>u?.item_id===req.item_id);
                                  if (!reqUnits.length) return null;
                                  return <div style={{ marginTop:6,display:"flex",flexWrap:"wrap",gap:4 }}>{reqUnits.map(u=><span key={u.id} style={{ background:BRAND.pale,color:BRAND.primary,borderRadius:99,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace" }}>📱 {u.unit_code}</span>)}</div>;
                                })()}
                              </div>
                            );
                          })}
                        </Card>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* ── INCIDENTS ── */}
        {tab==="incidents" && isAdminOrAssistant && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <h2 style={{ fontWeight:800,color:"var(--text)",margin:0,fontSize:20 }}>Incidents</h2>
              <button onClick={() => { setModal("reportUnitIncident"); setForm({ reportedBy:currentUser.name }); }} style={{ background:"#f97316",color:"white",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:700 }}>+ Report</button>
            </div>
            <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" }}>
              {["all","open","resolved","damaged","lost"].map(f => (
                <button key={f} onClick={() => setIncidentFilter(f)} style={{ background:incidentFilter===f?BRAND.primary:"var(--surface)",color:incidentFilter===f?"white":"var(--text3)",border:"1.5px solid",borderColor:incidentFilter===f?BRAND.primary:"var(--border)",borderRadius:99,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:600,textTransform:"capitalize" }}>{f}</button>
              ))}
            </div>
            {incidents.length===0 && <div style={{ color:"var(--text4)",textAlign:"center",marginTop:60 }}>No incidents reported. 🎉</div>}
            {incidents.filter(i=>incidentFilter==="all"?true:incidentFilter==="open"||incidentFilter==="resolved"?i.status===incidentFilter:i.type===incidentFilter).map(inc => (
              <Card key={inc.id} style={{ borderLeft:`4px solid ${inc.type==="damaged"?"#f59e0b":"#ef4444"}` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                      <span style={{ fontSize:20 }}>{inc.type==="damaged"?"🔧":"❓"}</span>
                      <div>
                        <div style={{ fontWeight:700,fontSize:15,color:"var(--text)" }}>{getUnit(inc.unit_id)?.unit_code||`${inc.qty}× ${getItem(inc.item_id)?.name}`}</div>
                        <div style={{ fontSize:12,color:"var(--text3)",textTransform:"capitalize" }}>Marked as <strong>{inc.type}</strong></div>
                      </div>
                    </div>
                    <div style={{ fontSize:12,color:"var(--text3)" }}>Reported by <strong>{inc.reported_by}</strong> · {inc.date}</div>
                    {inc.held_by_user_id && <div style={{ fontSize:12,color:"var(--text3)" }}>Last held by <strong>{getUser(inc.held_by_user_id)?.name}</strong></div>}
                    {inc.note && <div style={{ fontSize:12,color:"var(--text2)",marginTop:4,fontStyle:"italic",background:"var(--surface2)",borderRadius:8,padding:"6px 10px" }}>"{inc.note}"</div>}
                    {inc.status==="resolved" && <div style={{ fontSize:12,color:"#15803d",marginTop:4 }}>✅ Resolved: <strong>{inc.resolution}</strong> · {inc.resolved_date}</div>}
                  </div>
                  <StatusBadge s={inc.status} />
                </div>
                {inc.status==="open" && (
                  <div>
                    <div style={{ fontSize:12,fontWeight:600,color:"var(--text3)",marginTop:12,marginBottom:6 }}>Resolve as:</div>
                    <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                      {[{key:"repaired",label:"🔧 Repaired",color:"#10b981"},{key:"replaced",label:"🔄 Replaced",color:BRAND.primary},{key:"written off",label:"📝 Written Off",color:"#6b7280"}].map(r => (
                        <button key={r.key} onClick={() => resolveIncident(inc.id,r.key)} style={{ background:r.color,color:"white",border:"none",borderRadius:8,padding:"7px 12px",fontSize:12,cursor:"pointer",fontWeight:700 }}>{r.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── TEAM ── */}
        {tab==="team" && isAdmin && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <h2 style={{ fontWeight:800,color:"var(--text)",margin:0,fontSize:20 }}>Team</h2>
              <button onClick={() => { setModal("addUser"); setForm({ role:"staff" }); }} style={{ background:BRAND.primary,color:"white",border:"none",borderRadius:10,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:700 }}>+ Add User</button>
            </div>
            {users.map(u => {
              const theirUnitAs = unitAssignments.filter(a=>a.user_id===u.id&&a.status==="active");
              const theirItems = assignments.filter(a=>a.user_id===u.id);
              const hasItems = theirUnitAs.length > 0 || theirItems.length > 0;
              return (
                <Card key={u.id}>
                  <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
                    <Avatar user={u} size={44} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap" }}>
                        <div style={{ fontWeight:700,fontSize:15,color:"var(--text)" }}>{u.name}</div>
                        <RoleBadge role={u.role} />
                      </div>
                      {u.email && <div style={{ fontSize:12,color:"var(--text3)",marginBottom:4 }}>✉️ {u.email}</div>}
                      {theirUnitAs.length > 0 && (
                        <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:6 }}>
                          {theirUnitAs.map(ua => {
                            const od = isOverdue(ua);
                            return <span key={ua.id} style={{ background:od?"#fee2e2":BRAND.pale,color:od?"#b91c1c":BRAND.dark,borderRadius:99,padding:"2px 8px",fontSize:11,fontWeight:700 }}>📱 {getUnit(ua.unit_id)?.unit_code}{od?" ⚠️":""}</span>;
                          })}
                        </div>
                      )}
                      {theirItems.length > 0 && (
                        <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:4 }}>
                          {theirItems.map(a=><span key={a.id} style={{ background:"var(--surface2)",color:"var(--text2)",borderRadius:99,padding:"2px 8px",fontSize:11 }}>📦 {getItem(a.item_id)?.name} ×{a.qty}</span>)}
                        </div>
                      )}
                      {!hasItems && <div style={{ fontSize:12,color:"var(--text4)",marginTop:4 }}>No items assigned</div>}
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                      {hasItems && (
                        <button onClick={() => setConfirmAction({ type:"returnAll", userId:u.id, name:u.name })}
                          style={{ background:"#fef3c7",color:"#92400e",border:"none",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>↩ Return All</button>
                      )}
                      <button onClick={() => { setModal("editUserName"); setForm({ targetUserId:String(u.id),targetName:u.name }); }} style={{ background:"#e0f2fe",color:"#0369a1",border:"none",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>✏️ Name</button>
                      <button onClick={() => { setModal("changeRole"); setForm({ targetUserId:String(u.id),targetName:u.name,newRole:u.role }); }} style={{ background:BRAND.pale,color:BRAND.dark,border:"none",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>✏️ Role</button>
                      <button onClick={() => { setModal("changePassword"); setForm({ targetUserId:String(u.id),targetName:u.name,newEmail:u.email||"" }); }} style={{ background:"#fef3c7",color:"#92400e",border:"none",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>🔑 Password</button>
                      {u.role!=="admin"&&<button onClick={() => setConfirmAction({ type:"removeUser",uid:u.id,name:u.name })} style={{ background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:8,padding:"6px 10px",fontSize:11,cursor:"pointer",fontWeight:700 }}>Remove</button>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── LOG ── */}
        {tab==="log" && isAdmin && (
          <div>
            <h2 style={{ fontWeight:800,color:"var(--text)",marginBottom:16,fontSize:20 }}>Audit Log</h2>
            {logs.length===0&&<div style={{ color:"var(--text4)",textAlign:"center",marginTop:60 }}>No activity yet.</div>}
            {logs.map(l => {
              const iconMap = { "Approved":"✅","Rejected":"❌","Transfer Sent":"📤","Transfer Accepted":"✅","Transfer Declined":"❌","Return":"↩️","Added Item":"➕","Edited Item":"✏️","Deleted Item":"🗑️","User Added":"👤","User Removed":"🗑️","Request":"📋","Damaged":"🔧","Lost":"❓","Incident Resolved":"✅","User Updated":"✏️","Units Assigned":"📱","Unit Returned":"↩️","Unit Damaged":"🔧","Unit Lost":"❓","Units Generated":"📦","Role Changed":"🔄","Extension Requested":"📅","Extension Approved":"✅","Extension Denied":"❌" };
              return (
                <Card key={l.id} style={{ padding:"12px 14px" }}>
                  <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                    <div style={{ width:34,height:34,borderRadius:10,background:BRAND.pale,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{iconMap[l.action]||"📋"}</div>
                    <div>
                      <div style={{ fontWeight:700,fontSize:13,color:"var(--text)" }}>{l.action} <span style={{ fontWeight:400,color:"var(--text3)" }}>by {l.actor}</span></div>
                      <div style={{ fontSize:13,color:"var(--text2)" }}>{l.detail}</div>
                      <div style={{ fontSize:11,color:"var(--text4)",marginTop:2 }}>{l.date}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── STAFF: MY ITEMS ── */}
        {tab==="dashboard" && isStaff && (
          <div>
            <h2 style={{ fontWeight:800,color:"var(--text)",marginBottom:16,fontSize:20 }}>My Items</h2>
            {myUnitAssignments.length===0&&myAssignments.length===0&&(
              <div style={{ textAlign:"center",padding:"50px 20px",color:"var(--text4)" }}>
                <div style={{ fontSize:48,marginBottom:10 }}>📭</div>
                <div style={{ fontWeight:600 }}>No items assigned yet</div>
                <div style={{ fontSize:13,marginTop:4 }}>Request items from the Request tab</div>
              </div>
            )}
            {myUnitAssignments.map(ua => {
              const unit = getUnit(ua.unit_id);
              const item = unit ? getItem(unit.item_id) : null;
              const overdue = isOverdue(ua);
              const dueSoon = isDueSoon(ua);
              const myPendingExt = extensionRequests.find(e => e.unit_assignment_id === ua.id && e.status === "pending");
              return (
                <Card key={ua.id} style={{ borderLeft:`4px solid ${overdue?"#ef4444":dueSoon?"#f59e0b":BRAND.primary}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800,fontSize:16,color:BRAND.primary,fontFamily:"monospace" }}>📱 {unit?.unit_code}</div>
                      <div style={{ fontWeight:600,fontSize:14,marginTop:2,color:"var(--text)" }}>{item?.name}</div>
                      <div style={{ fontSize:11,color:"var(--text4)",marginTop:2 }}>Assigned {ua.assigned_at}</div>
                      {ua.return_due_date && (
                        <div style={{ marginTop:6 }}><DueBadge ua={ua} /></div>
                      )}
                    </div>
                    <StatusBadge s={overdue?"overdue":unit?.status||"assigned"} />
                  </div>
                  {overdue && (
                    <div style={{ marginTop:10,background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#b91c1c",fontWeight:600 }}>
                      ⚠️ This device was due back on {ua.return_due_date}. Please return it or request an extension.
                    </div>
                  )}
                  <div style={{ marginTop:10,background:"var(--surface2)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"var(--text3)" }}>
                    To return this device, please hand it back to your Inventory Assistant.
                  </div>
                  {/* Transfer button */}
                  <div style={{ display:"flex",gap:8,marginTop:10 }}>
                    <button onClick={() => { setModal("transfer"); setForm({ unitId:String(unit.id) }); }}
                      style={{ flex:1,background:BRAND.pale,color:BRAND.primary,border:`1.5px solid ${BRAND.light}`,borderRadius:8,padding:"8px",cursor:"pointer",fontWeight:700,fontSize:12 }}>
                      🔄 Transfer
                    </button>
                    {!myPendingExt && (
                      <button onClick={() => { setModal("extension"); setForm({ uaId:String(ua.id) }); }}
                        style={{ flex:1,background:"#fffbeb",color:"#92400e",border:"1.5px solid #fcd34d",borderRadius:8,padding:"8px",cursor:"pointer",fontWeight:700,fontSize:12 }}>
                        📅 Request Extension
                      </button>
                    )}
                    {myPendingExt && (
                      <div style={{ flex:1,background:"#f3f4f6",color:"#6b7280",borderRadius:8,padding:"8px",fontSize:12,fontWeight:600,textAlign:"center" }}>
                        ⏳ Extension pending...
                      </div>
                    )}
                  </div>
                  {/* Show past extension results */}
                  {extensionRequests.filter(e=>e.unit_assignment_id===ua.id&&e.status!=="pending").slice(0,1).map(ext => (
                    <div key={ext.id} style={{ marginTop:6,fontSize:11,color:ext.status==="approved"?"#15803d":"#b91c1c",fontWeight:600 }}>
                      {ext.status==="approved"?`✅ Extension approved — new due date: ${ext.requested_date}`:`❌ Extension denied for ${ext.requested_date}`}
                    </div>
                  ))}
                </Card>
              );
            })}
            {myAssignments.map(a => {
              const item = getItem(a.item_id);
              return (
                <Card key={a.id}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:15,color:"var(--text)" }}>{item?.name}</div>
                      <div style={{ fontSize:12,color:"var(--text3)" }}>{item?.category}</div>
                      <div style={{ fontSize:11,color:"var(--text4)",marginTop:2 }}>Since {a.assigned_at}</div>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:28,fontWeight:800,color:BRAND.primary }}>×{a.qty}</div>
                      <div style={{ fontSize:11,color:"var(--text4)" }}>{item?.unit}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── STAFF: REQUEST ── */}
        {tab==="request" && isStaff && (
          <div>
            <h2 style={{ fontWeight:800,color:"var(--text)",marginBottom:8,fontSize:20 }}>Request Items</h2>
            <p style={{ color:"var(--text3)",fontSize:13,marginBottom:16 }}>Submit a request and your inventory assistant will assign items to you.</p>
            <button onClick={() => { setModal("request"); setForm({}); setCart([]); }} style={{ ...btn,marginTop:0,marginBottom:20 }}>+ New Request</button>
            {(() => {
              const myReqs = requests.filter(r=>r.from_user_id===currentUser.id);
              if (!myReqs.length) return null;
              // Group by group_id (null = legacy single requests)
              const groups = {};
              myReqs.forEach(r => {
                const key = r.group_id || `legacy_${r.id}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(r);
              });
              return <>
                <h3 style={{ fontWeight:700,fontSize:15,color:"var(--text2)",marginBottom:10 }}>My Requests</h3>
                {Object.entries(groups).map(([gid, reqs]) => {
                  const groupStatus = reqs.some(r=>r.status==="pending") ? "pending" : reqs.every(r=>r.status==="approved") ? "approved" : reqs.every(r=>r.status==="rejected") ? "rejected" : "partial";
                  return (
                    <Card key={gid}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                        <div style={{ fontSize:11,color:"var(--text4)" }}>{reqs[0].date}</div>
                        <StatusBadge s={groupStatus} />
                      </div>
                      {reqs.map(req => {
                        const assignedUAs = unitAssignments.filter(ua=>ua.user_id===req.from_user_id&&ua.status==="active");
                        const reqUnits = assignedUAs.map(ua=>getUnit(ua.unit_id)).filter(u=>u?.item_id===req.item_id);
                        return (
                          <div key={req.id} style={{ padding:"6px 0",borderBottom:"1px solid var(--border)" }}>
                            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                              <div style={{ fontWeight:700,fontSize:14,color:"var(--text)",flex:1 }}>{req.qty}x {getItem(req.item_id)?.name}</div>
                              {reqs.length > 1 && <StatusBadge s={req.status} />}
                            </div>
                            {req.return_due_date && <div style={{ fontSize:12,color:BRAND.primary,marginTop:2 }}>📅 Return by: {req.return_due_date}</div>}
                            {reqUnits.length > 0 && (
                              <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:4 }}>
                                {reqUnits.map(u=><span key={u.id} style={{ background:BRAND.pale,color:BRAND.primary,borderRadius:99,padding:"2px 8px",fontSize:12,fontWeight:800,fontFamily:"monospace" }}>📱 {u.unit_code}</span>)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {reqs[0].note && <div style={{ fontSize:12,color:"var(--text3)",fontStyle:"italic",marginTop:8 }}>"{reqs[0].note}"</div>}
                    </Card>
                  );
                })}
              </>;
            })()}
          </div>
        )}

        {/* ── STAFF: TRANSFERS ── */}
        {tab==="transfers" && isStaff && (
          <div>
            <h2 style={{ fontWeight:800,color:"var(--text)",marginBottom:16,fontSize:20 }}>Transfers</h2>
            {transfers.filter(t=>t.from_user_id===currentUser.id||t.to_user_id===currentUser.id).length===0&&<div style={{ color:"var(--text4)",textAlign:"center",marginTop:60 }}>No transfers yet.</div>}
            {["pending","accepted","declined"].map(status => {
              const group = transfers.filter(t=>t.status===status&&(t.from_user_id===currentUser.id||t.to_user_id===currentUser.id));
              if (!group.length) return null;
              return (
                <div key={status}>
                  <SectionLabel label={status} />
                  {group.map(t => {
                    const canAct = t.status==="pending" && t.to_user_id===currentUser.id;
                    const unit = t.unit_id ? getUnit(t.unit_id) : null;
                    return (
                      <Card key={t.id}>
                        <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:4 }}>
                            <Avatar user={getUser(t.from_user_id)} size={32} />
                            <span style={{ fontSize:14,color:"var(--text4)" }}>→</span>
                            <Avatar user={getUser(t.to_user_id)} size={32} />
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13,color:"var(--text2)" }}><strong>{getUser(t.from_user_id)?.name}</strong> → <strong>{getUser(t.to_user_id)?.name}</strong></div>
                            <div style={{ fontSize:14,fontWeight:700,marginTop:2,color:"var(--text)",fontFamily:"monospace" }}>📱 {unit?.unit_code}</div>
                            <div style={{ fontSize:12,color:"var(--text3)" }}>{getItem(unit?.item_id)?.name}</div>
                            {t.note&&<div style={{ fontSize:12,color:"var(--text3)",fontStyle:"italic" }}>"{t.note}"</div>}
                            <div style={{ fontSize:11,color:"var(--text4)",marginTop:2 }}>{t.date}</div>
                          </div>
                          <StatusBadge s={t.status} />
                        </div>
                        {canAct&&<div style={{ display:"flex",gap:8,marginTop:12 }}>
                          <button onClick={() => acceptTransfer(t)} style={{ flex:1,background:"#10b981",color:"white",border:"none",borderRadius:8,padding:"9px",cursor:"pointer",fontWeight:700,fontSize:13 }}>✓ Accept</button>
                          <button onClick={() => declineTransfer(t)} style={{ flex:1,background:"#ef4444",color:"white",border:"none",borderRadius:8,padding:"9px",cursor:"pointer",fontWeight:700,fontSize:13 }}>✗ Decline</button>
                        </div>}
                      </Card>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── STAFF: REPORT ── */}
        {tab==="report" && isStaff && (
          <div>
            <h2 style={{ fontWeight:800,color:"var(--text)",marginBottom:8,fontSize:20 }}>Report Incident</h2>
            <p style={{ color:"var(--text3)",fontSize:13,marginBottom:16 }}>Report a damaged or lost device.</p>
            <button onClick={() => { setModal("reportUnitIncident"); setForm({ reportedBy:currentUser.name }); }} style={{ ...btn,background:"linear-gradient(135deg,#c2410c,#f97316)",marginTop:0,marginBottom:20 }}>+ Report Damaged / Lost Device</button>
            {incidents.filter(i=>i.reported_by===currentUser.name).length > 0 && <>
              <h3 style={{ fontWeight:700,fontSize:15,color:"var(--text2)",marginBottom:10 }}>My Reports</h3>
              {incidents.filter(i=>i.reported_by===currentUser.name).map(inc => (
                <Card key={inc.id} style={{ borderLeft:`4px solid ${inc.type==="damaged"?"#f59e0b":"#ef4444"}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontWeight:700,color:"var(--text)" }}>{getUnit(inc.unit_id)?.unit_code||`${inc.qty}× ${getItem(inc.item_id)?.name}`}</div>
                      <div style={{ fontSize:12,color:"var(--text3)",textTransform:"capitalize" }}>{inc.type} · {inc.date}</div>
                      {inc.note&&<div style={{ fontSize:12,fontStyle:"italic",marginTop:4,color:"var(--text2)" }}>"{inc.note}"</div>}
                      {inc.status==="resolved"&&<div style={{ fontSize:12,color:"#15803d",marginTop:4 }}>✅ {inc.resolution} · {inc.resolved_date}</div>}
                    </div>
                    <StatusBadge s={inc.status} />
                  </div>
                </Card>
              ))}
            </>}
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,background:"var(--nav-bg)",borderTop:"1px solid var(--nav-border)",display:"flex",zIndex:50 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearchQ(""); }} style={{ flex:1,padding:"8px 2px 10px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,position:"relative" }}>
            {t.badge > 0 && <div style={{ position:"absolute",top:6,right:"calc(50% - 14px)",background:"#ef4444",color:"white",borderRadius:99,fontSize:9,fontWeight:700,padding:"1px 4px",minWidth:14,textAlign:"center" }}>{t.badge}</div>}
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontSize:9,color:tab===t.id?BRAND.primary:"var(--text4)",fontWeight:tab===t.id?800:500 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast&&<div style={{ position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#ef4444":"#10b981",color:"white",padding:"10px 20px",borderRadius:12,fontSize:13,fontWeight:700,zIndex:200,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",whiteSpace:"nowrap" }}>{toast.msg}</div>}

      {/* Confirm */}
      {confirmAction&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:16 }} onClick={() => setConfirmAction(null)}>
          <div style={{ background:"var(--modal-bg)",borderRadius:18,padding:24,width:"100%",maxWidth:360 }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:36,textAlign:"center",marginBottom:12 }}>{confirmAction.type==="returnAll"?"↩️":"⚠️"}</div>
            <div style={{ fontWeight:800,fontSize:17,textAlign:"center",marginBottom:8,color:"var(--text)" }}>
              {confirmAction.type==="returnAll" ? `Return all items from ${confirmAction.name}?` :
               confirmAction.type==="deleteItem" ? `Delete "${confirmAction.name}"?` :
               `Remove ${confirmAction.name}?`}
            </div>
            <div style={{ fontSize:13,color:"var(--text3)",textAlign:"center",marginBottom:20 }}>
              {confirmAction.type==="returnAll" ? "This will mark all their devices and items as returned and add them back to stock." : "This cannot be undone."}
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={() => setConfirmAction(null)} style={{ flex:1,background:"var(--surface2)",color:"var(--text2)",border:"none",borderRadius:10,padding:"11px",fontWeight:700,cursor:"pointer" }}>Cancel</button>
              <button onClick={() => {
                if (confirmAction.type==="returnAll") returnAllForUser(confirmAction.userId);
                else if (confirmAction.type==="deleteItem") deleteItem(confirmAction.itemId);
                else removeUser(confirmAction.uid);
                setConfirmAction(null);
              }} style={{ flex:1,background:confirmAction.type==="returnAll"?"#f59e0b":"#ef4444",color:"white",border:"none",borderRadius:10,padding:"11px",fontWeight:700,cursor:"pointer" }}>
                {confirmAction.type==="returnAll"?"↩ Return All":"Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200 }} onClick={() => setModal(null)}>
          <div style={{ background:"var(--modal-bg)",borderRadius:"20px 20px 0 0",padding:"24px 24px 32px",width:"100%",maxWidth:500,maxHeight:"85vh",overflowY:"auto" }} onClick={e=>e.stopPropagation()}>

            {/* TRANSFER — staff picks multiple devices and a workmate */}
            {modal==="transfer"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Transfer Devices to Workmate</h3>
              <p style={{ color:"var(--text3)",fontSize:13,margin:"0 0 12px" }}>Select one or more devices and choose who to send them to.</p>
              <label style={lbl}>Select devices to transfer</label>
              <div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:6 }}>
                {myUnitAssignments.length===0&&<div style={{ color:"var(--text4)",fontSize:13 }}>You have no devices to transfer.</div>}
                {myUnitAssignments.map(ua => {
                  const unit = getUnit(ua.unit_id);
                  const item = unit ? getItem(unit.item_id) : null;
                  const selected = (form.selectedUnitIds||[]).includes(String(unit?.id));
                  return (
                    <button key={ua.id} onClick={() => {
                      const cur = form.selectedUnitIds||[];
                      const id = String(unit.id);
                      setForm(f=>({...f, selectedUnitIds: selected ? cur.filter(x=>x!==id) : [...cur, id]}));
                    }}
                      style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:`2px solid ${selected?BRAND.primary:"var(--border)"}`,borderRadius:12,background:selected?BRAND.pale:"var(--surface2)",cursor:"pointer",textAlign:"left" }}>
                      <div style={{ width:22,height:22,borderRadius:6,border:`2px solid ${selected?BRAND.primary:"var(--border)"}`,background:selected?BRAND.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        {selected&&<span style={{ color:"white",fontSize:14,fontWeight:800 }}>✓</span>}
                      </div>
                      <div style={{ fontWeight:800,fontSize:15,color:BRAND.primary,fontFamily:"monospace" }}>📱 {unit?.unit_code}</div>
                      <div style={{ fontSize:13,color:"var(--text2)" }}>{item?.name}</div>
                    </button>
                  );
                })}
              </div>
              {(form.selectedUnitIds||[]).length > 0 && (
                <div style={{ marginTop:8,fontSize:12,color:BRAND.primary,fontWeight:600 }}>
                  {(form.selectedUnitIds||[]).length} device{(form.selectedUnitIds||[]).length>1?"s":""} selected
                </div>
              )}
              <label style={lbl}>Transfer to</label>
              <select style={inp} value={form.toUserId||""} onChange={e => setForm(f=>({...f,toUserId:e.target.value}))}>
                <option value="">Choose a workmate...</option>
                {users.filter(u=>u.id!==currentUser.id&&u.role==="staff").map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <label style={lbl}>Note (optional)</label>
              <input style={inp} value={form.note||""} onChange={e => setForm(f=>({...f,note:e.target.value}))} placeholder="e.g. Temporary loan while mine is being fixed" />
              <button onClick={submitTransfer} disabled={saving||!(form.selectedUnitIds||[]).length||!form.toUserId} style={{ ...btn,opacity:(saving||!(form.selectedUnitIds||[]).length||!form.toUserId)?0.5:1 }}>{saving?"Sending...":"Send Transfer Request"}</button>
            </>}

            {/* EXTENSION REQUEST */}
            {modal==="extension"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Request Return Date Extension</h3>
              <p style={{ color:"var(--text3)",fontSize:13,margin:"0 0 12px" }}>Your inventory assistant will review and approve or deny this.</p>
              {form.uaId&&(()=>{
                const ua = unitAssignments.find(u=>u.id===Number(form.uaId));
                const unit = getUnit(ua?.unit_id);
                return ua ? (
                  <div style={{ background:BRAND.pale,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13 }}>
                    <strong style={{ color:BRAND.primary,fontFamily:"monospace" }}>📱 {unit?.unit_code}</strong>
                    {ua.return_due_date&&<span style={{ color:"var(--text3)",marginLeft:8 }}>Current due: {ua.return_due_date}</span>}
                  </div>
                ) : null;
              })()}
              <label style={lbl}>New return date you are requesting</label>
              <input style={inp} type="date" min={today} value={form.newDate||""} onChange={e => setForm(f=>({...f,newDate:e.target.value}))} />
              <label style={lbl}>Reason *</label>
              <textarea style={{ ...inp,height:90,resize:"none" }} value={form.reason||""} onChange={e => setForm(f=>({...f,reason:e.target.value}))} placeholder="e.g. Still completing the project, will return by end of month" />
              <button onClick={submitExtension} disabled={saving||!form.newDate||!form.reason} style={{ ...btn,opacity:(saving||!form.newDate||!form.reason)?0.5:1 }}>{saving?"Submitting...":"Submit Extension Request"}</button>
            </>}

            {/* RETURN QTY ITEM */}
            {modal==="returnQty"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Return Item</h3>
              {form.itemId&&(()=>{
                const item = getItem(Number(form.itemId));
                const u = getUser(Number(form.userId));
                return (
                  <div style={{ background:BRAND.pale,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:13 }}>
                    <strong style={{ color:BRAND.primary }}>📦 {item?.name}</strong>
                    <span style={{ color:"var(--text3)",marginLeft:8 }}>assigned to {u?.name} · ×{form.maxQty} {item?.unit}</span>
                  </div>
                );
              })()}
              <label style={lbl}>How many are being returned?</label>
              <input style={inp} type="number" min={1} max={form.maxQty} value={form.returnQty||""} onChange={e => setForm(f=>({...f,returnQty:e.target.value}))} />
              <div style={{ fontSize:11,color:"var(--text4)",marginTop:4 }}>Max: {form.maxQty}</div>
              <button onClick={() => {
                const qty = Number(form.returnQty);
                if (!qty || qty < 1 || qty > Number(form.maxQty)) return showToast("Invalid quantity","error");
                returnQtyItem(Number(form.assignmentId), Number(form.userId), Number(form.itemId), qty);
                setModal(null); setForm({});
              }} style={btn}>Confirm Return</button>
            </>}

            {/* REQUEST ITEMS (CART) */}
            {modal==="request"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Request Items</h3>
              <p style={{ color:"var(--text3)",fontSize:13,margin:"0 0 12px" }}>Add items to your request. Your inventory assistant will review and assign them.</p>

              {/* Cart items list */}
              {cart.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  {cart.map((c, idx) => {
                    const item = getItem(Number(c.itemId));
                    return (
                      <div key={idx} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"var(--surface2)",borderRadius:8,marginBottom:6 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700,fontSize:13,color:"var(--text)" }}>{c.qty}x {item?.name}</div>
                          {c.returnDate && <div style={{ fontSize:11,color:BRAND.primary }}>Return by: {c.returnDate}</div>}
                        </div>
                        <button onClick={() => setCart(cart.filter((_,i)=>i!==idx))} style={{ background:"#fee2e2",color:"#ef4444",border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",fontWeight:700 }}>Remove</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add item form */}
              <div style={{ background:"var(--surface2)",borderRadius:10,padding:12,marginBottom:12 }}>
                <label style={{ ...lbl,marginTop:0 }}>Item</label>
                <select style={inp} value={form.cartItemId||""} onChange={e => setForm(f=>({...f,cartItemId:e.target.value}))}>
                  <option value="">Choose an item...</option>
                  {inventory.map(i => {
                    const available = units.some(u=>u.item_id===i.id) ? units.filter(u=>u.item_id===i.id&&u.status==="available").length : i.available;
                    return <option key={i.id} value={i.id}>{i.name} — {available} available</option>;
                  })}
                </select>
                <label style={lbl}>Quantity</label>
                <input style={inp} type="number" min={1} value={form.cartQty||""} onChange={e => setForm(f=>({...f,cartQty:e.target.value}))} placeholder="e.g. 1" />
                <label style={lbl}>Return date (optional)</label>
                <input style={inp} type="date" min={today} value={form.cartReturnDate||""} onChange={e => setForm(f=>({...f,cartReturnDate:e.target.value}))} />
                <button onClick={() => {
                  if (!form.cartItemId || !form.cartQty || Number(form.cartQty) < 1) return showToast("Select item and quantity","error");
                  setCart([...cart, { itemId: form.cartItemId, qty: form.cartQty, returnDate: form.cartReturnDate || "" }]);
                  setForm(f => ({ ...f, cartItemId: "", cartQty: "", cartReturnDate: "" }));
                }} style={{ background:BRAND.pale,color:BRAND.dark,border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontWeight:700,marginTop:10,width:"100%" }}>+ Add to Request</button>
              </div>

              <label style={lbl}>Reason / Note (optional)</label>
              <input style={inp} value={form.note||""} onChange={e => setForm(f=>({...f,note:e.target.value}))} placeholder="e.g. For warehouse team" />
              <button onClick={submitRequest} disabled={saving||cart.length===0} style={{ ...btn,opacity:(saving||cart.length===0)?0.5:1 }}>{saving?"Submitting...":`Submit Request (${cart.length} item${cart.length!==1?"s":""})`}</button>
            </>}

            {/* GENERATE UNITS */}
            {modal==="generateUnits"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Generate Unit IDs</h3>
              <label style={lbl}>Item</label>
              <select style={inp} value={form.itemId||""} onChange={e => setForm(f=>({...f,itemId:e.target.value}))}>
                <option value="">Choose item...</option>
                {inventory.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <label style={lbl}>Unit Prefix</label>
              <select style={inp} value={form.prefix||""} onChange={e => setForm(f=>({...f,prefix:e.target.value}))}>
                <option value="">Choose prefix...</option>
                <option value="PHN">PHN — Phones</option>
                <option value="LAP">LAP — Laptops</option>
                <option value="PRN">PRN — Printers</option>
              </select>
              <label style={lbl}>How many units to generate?</label>
              <input style={inp} type="number" min={1} value={form.count||""} onChange={e => setForm(f=>({...f,count:e.target.value}))} placeholder="e.g. 100" />
              <label style={lbl}>Start numbering from</label>
              <input style={inp} type="number" min={1} value={form.startFrom||""} onChange={e => setForm(f=>({...f,startFrom:e.target.value}))} placeholder="1" />
              {form.prefix&&form.count&&(
                <div style={{ background:BRAND.pale,borderRadius:10,padding:"10px 14px",marginTop:14,fontSize:13,color:BRAND.dark }}>
                  Preview: <strong>{form.prefix}-{String(Number(form.startFrom)||1).padStart(3,"0")}</strong> to <strong>{form.prefix}-{String((Number(form.startFrom)||1)+(Number(form.count)||1)-1).padStart(3,"0")}</strong>
                </div>
              )}
              <button onClick={generateUnits} disabled={saving} style={{ ...btn,opacity:saving?0.5:1 }}>{saving?"Generating...":"Generate Units"}</button>
            </>}

            {/* REPORT INCIDENT */}
            {modal==="reportUnitIncident"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Report Damaged / Lost</h3>
              <label style={lbl}>Device Unit</label>
              <select style={inp} value={form.unitId||""} onChange={e => setForm(f=>({...f,unitId:e.target.value}))}>
                <option value="">Choose unit...</option>
                {(isStaff ? myUnitAssignments.map(ua=>getUnit(ua.unit_id)).filter(Boolean) : units.filter(u=>u.status!=="lost")).map(u=><option key={u.id} value={u.id}>{u.unit_code} — {getItem(u.item_id)?.name} ({u.status})</option>)}
              </select>
              <label style={lbl}>Type *</label>
              <div style={{ display:"flex",gap:10,marginTop:4 }}>
                {["damaged","lost"].map(t => (
                  <button key={t} onClick={() => setForm(f=>({...f,type:t}))} style={{ flex:1,padding:"10px",border:`2px solid ${form.type===t?(t==="damaged"?"#f97316":"#ef4444"):"var(--border)"}`,borderRadius:10,background:form.type===t?(t==="damaged"?"#fff7ed":"#fef2f2"):"var(--surface2)",cursor:"pointer",fontWeight:700,fontSize:14,color:form.type===t?(t==="damaged"?"#c2410c":"#b91c1c"):"var(--text3)" }}>
                    {t==="damaged"?"🔧 Damaged":"❓ Lost"}
                  </button>
                ))}
              </div>
              <label style={lbl}>Reported By</label>
              <input style={inp} value={form.reportedBy||currentUser?.name||""} onChange={e => setForm(f=>({...f,reportedBy:e.target.value}))} />
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp,height:80,resize:"none" }} value={form.note||""} onChange={e => setForm(f=>({...f,note:e.target.value}))} placeholder="Describe what happened..." />
              <button onClick={reportUnitIncident} disabled={saving} style={{ ...btn,background:"linear-gradient(135deg,#c2410c,#f97316)",opacity:saving?0.5:1 }}>{saving?"Submitting...":"Submit Report"}</button>
            </>}

            {/* ADD ITEM */}
            {modal==="addItem"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Add Inventory Item</h3>
              <label style={lbl}>Item Name *</label>
              <input style={inp} value={form.name||""} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Scanning Phone" />
              <label style={lbl}>Category</label>
              <input style={inp} value={form.category||""} onChange={e => setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. Electronics, PPE" />
              <label style={lbl}>Tracking Type</label>
              <div style={{ display:"flex",gap:10,marginTop:4 }}>
                {[{v:"yes",label:"📱 Unit Tracked",sub:"Phones, Laptops, Printers"},{v:"no",label:"📦 Quantity Only",sub:"Cables, Chargers, etc."}].map(opt => (
                  <button key={opt.v} onClick={() => setForm(f=>({...f,tracked:opt.v}))} style={{ flex:1,padding:"10px",border:`2px solid ${form.tracked===opt.v?BRAND.primary:"var(--border)"}`,borderRadius:10,background:form.tracked===opt.v?BRAND.pale:"var(--surface2)",cursor:"pointer",textAlign:"left" }}>
                    <div style={{ fontWeight:700,fontSize:13,color:form.tracked===opt.v?BRAND.primary:"var(--text2)" }}>{opt.label}</div>
                    <div style={{ fontSize:11,color:"var(--text4)",marginTop:2 }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
              {form.tracked==="no"&&<>
                <label style={lbl}>Total Quantity</label>
                <input style={inp} type="number" min={1} value={form.total||""} onChange={e => setForm(f=>({...f,total:e.target.value}))} placeholder="10" />
                <label style={lbl}>Unit</label>
                <input style={inp} value={form.unit||""} onChange={e => setForm(f=>({...f,unit:e.target.value}))} placeholder="pcs / sets / rolls" />
              </>}
              <button onClick={submitAddItem} disabled={saving||!form.tracked} style={{ ...btn,opacity:(saving||!form.tracked)?0.5:1 }}>{saving?"Adding...":"Add to Inventory"}</button>
            </>}

            {/* EDIT ITEM */}
            {modal==="editItem"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Edit Item</h3>
              <label style={lbl}>Item Name *</label>
              <input style={inp} value={form.name||""} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
              <label style={lbl}>Category</label>
              <input style={inp} value={form.category||""} onChange={e => setForm(f=>({...f,category:e.target.value}))} />
              <label style={lbl}>Total Quantity</label>
              <input style={inp} type="number" min={1} value={form.total||""} onChange={e => setForm(f=>({...f,total:e.target.value}))} />
              <label style={lbl}>Unit</label>
              <input style={inp} value={form.unit||""} onChange={e => setForm(f=>({...f,unit:e.target.value}))} />
              <button onClick={submitEditItem} disabled={saving} style={{ ...btn,opacity:saving?0.5:1 }}>{saving?"Saving...":"Save Changes"}</button>
            </>}

            {/* ADD USER */}
            {modal==="addUser"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Add Team Member</h3>
              <label style={lbl}>Full Name *</label>
              <input style={inp} value={form.name||""} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Jose Rizal" />
              <label style={lbl}>Work Email *</label>
              <input style={inp} type="email" value={form.email||""} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="name@company.com" />
              <label style={lbl}>Password *</label>
              <input style={inp} type="password" value={form.password||""} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" />
              <label style={lbl}>Role</label>
              <select style={inp} value={form.role||"staff"} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                <option value="staff">Staff</option>
                <option value="inventory_assistant">Inventory Assistant</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={submitAddUser} disabled={saving} style={{ ...btn,opacity:saving?0.5:1 }}>{saving?"Saving...":"Add Member"}</button>
            </>}

            {/* CHANGE ROLE */}
            {modal==="changeRole"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Change Role</h3>
              <p style={{ color:"var(--text4)",fontSize:13,margin:"0 0 12px" }}>Update role for <strong>{form.targetName}</strong>.</p>
              <label style={lbl}>Role</label>
              <select style={inp} value={form.newRole||"staff"} onChange={e => setForm(f=>({...f,newRole:e.target.value}))}>
                <option value="staff">Staff</option>
                <option value="inventory_assistant">Inventory Assistant</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={submitChangeRole} disabled={saving} style={{ ...btn,opacity:saving?0.5:1 }}>{saving?"Saving...":"Save Role"}</button>
            </>}

            {/* EDIT USER NAME */}
            {modal==="editUserName"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Edit Name</h3>
              <p style={{ color:"var(--text4)",fontSize:13,margin:"0 0 12px" }}>Update display name for this user.</p>
              <label style={lbl}>Full Name *</label>
              <input style={inp} value={form.targetName||""} onChange={e => setForm(f=>({...f,targetName:e.target.value}))} placeholder="e.g. Jose Rizal" />
              <button onClick={submitEditUserName} disabled={saving} style={{ ...btn,opacity:saving?0.5:1 }}>{saving?"Saving...":"Save Name"}</button>
            </>}

            {/* CHANGE PASSWORD */}
            {modal==="changePassword"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>Update Credentials</h3>
              <p style={{ color:"var(--text4)",fontSize:13,margin:"0 0 8px" }}>Update login details for <strong>{form.targetName}</strong>.</p>
              <label style={lbl}>Email</label>
              <input style={inp} type="email" value={form.newEmail||""} onChange={e => setForm(f=>({...f,newEmail:e.target.value}))} placeholder="name@company.com" />
              <label style={lbl}>New Password *</label>
              <input style={inp} type="password" value={form.newPassword||""} onChange={e => setForm(f=>({...f,newPassword:e.target.value}))} placeholder="••••••••" />
              <button onClick={submitChangePassword} disabled={saving} style={{ ...btn,opacity:saving?0.5:1 }}>{saving?"Saving...":"Save Credentials"}</button>
            </>}

            {/* MY ACCOUNT */}
            {modal==="myAccount"&&<>
              <h3 style={{ margin:"0 0 4px",fontWeight:800,fontSize:18,color:"var(--text)" }}>My Account</h3>
              <p style={{ color:"var(--text4)",fontSize:13,margin:"0 0 12px" }}>✉️ {currentUser?.email}</p>
              <label style={lbl}>Display Name</label>
              <input style={inp} value={form.myNewName||""} onChange={e => setForm(f=>({...f,myNewName:e.target.value}))} placeholder={currentUser?.name} />
              <label style={lbl}>New Email (optional)</label>
              <input style={inp} type="email" value={form.myNewEmail||""} onChange={e => setForm(f=>({...f,myNewEmail:e.target.value}))} placeholder={currentUser?.email} />
              <label style={lbl}>Current Password *</label>
              <input style={inp} type="password" value={form.myCurrentPassword||""} onChange={e => setForm(f=>({...f,myCurrentPassword:e.target.value}))} placeholder="Required to save changes" />
              <label style={lbl}>New Password (optional)</label>
              <input style={inp} type="password" value={form.myNewPassword||""} onChange={e => setForm(f=>({...f,myNewPassword:e.target.value}))} placeholder="Leave blank to keep current" />
              <button onClick={submitMyAccount} disabled={saving} style={{ ...btn,opacity:saving?0.5:1 }}>{saving?"Saving...":"Save Changes"}</button>
            </>}

          </div>
        </div>
      )}
    </div>
    </>
  );
}
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

// ── BRAND COLORS (Pantone 266 C) ──────────────────────────────────────────────
const BRAND = {
  primary:   "#6240CC",   // Pantone 266 C
  dark:      "#3D1F99",   // deep shade for gradients
  darker:    "#2B1575",   // darkest shade
  light:     "#8A6EDB",   // lighter tint
  pale:      "#EDE8FA",   // very light tint for backgrounds
  gradient:  "linear-gradient(135deg,#2B1575,#3D1F99,#6240CC)",
  gradLight: "linear-gradient(135deg,#6240CC,#8A6EDB)",
};

const lbl = { display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:4, marginTop:14 };
const inp = { width:"100%", padding:"10px 12px", border:"1.5px solid #e5e7eb", borderRadius:10, fontSize:14, boxSizing:"border-box", outline:"none", background:"white" };
const btn = { width:"100%", background:BRAND.gradLight, color:"white", border:"none", borderRadius:12, padding:"14px", fontSize:15, cursor:"pointer", fontWeight:700, marginTop:20 };
const dangerBtn = { ...btn, background:"linear-gradient(135deg,#dc2626,#ef4444)" };

// ── LOGO COMPONENT ────────────────────────────────────────────────────────────
const Logo = ({ size = 64 }) => (
  <img src="/logo.svg" alt="Logo" style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
);

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loginStep, setLoginStep] = useState("select");
  const [selectedUser, setSelectedUser] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinShake, setPinShake] = useState(false);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [incidentFilter, setIncidentFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const currentUser = users.find(u => u.id === currentUserId);
  const isAdmin = currentUser?.role === "admin";
  const myAssignments = currentUser ? assignments.filter(a => a.user_id === currentUser.id) : [];
  const pendingRequests = requests.filter(r => r.status === "pending");
  const pendingTransfersForMe = transfers.filter(t => t.status === "pending" && (t.to_user_id === currentUser?.id || isAdmin));
  const openIncidents = incidents.filter(i => i.status === "open");

  // ── LOAD ALL DATA ─────────────────────────────────────────────────────────
  const loadAll = async () => {
    setSyncing(true);
    const [u, inv, asgn, req, trf, inc, lg] = await Promise.all([
      supabase.from("users").select("*").order("id"),
      supabase.from("inventory").select("*").order("id"),
      supabase.from("assignments").select("*"),
      supabase.from("requests").select("*").order("id", { ascending: false }),
      supabase.from("transfers").select("*").order("id", { ascending: false }),
      supabase.from("incidents").select("*").order("id", { ascending: false }),
      supabase.from("logs").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (u.data) setUsers(u.data);
    if (inv.data) setInventory(inv.data);
    if (asgn.data) setAssignments(asgn.data);
    if (req.data) setRequests(req.data);
    if (trf.data) setTransfers(trf.data);
    if (inc.data) setIncidents(inc.data);
    if (lg.data) setLogs(lg.data);
    setSyncing(false);
    setLoaded(true);
  };

  useEffect(() => {
    loadAll();
    const channels = [
      supabase.channel("users-changes").on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => loadAll()),
      supabase.channel("inventory-changes").on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => loadAll()),
      supabase.channel("assignments-changes").on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => loadAll()),
      supabase.channel("requests-changes").on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => loadAll()),
      supabase.channel("transfers-changes").on("postgres_changes", { event: "*", schema: "public", table: "transfers" }, () => loadAll()),
      supabase.channel("incidents-changes").on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => loadAll()),
      supabase.channel("logs-changes").on("postgres_changes", { event: "*", schema: "public", table: "logs" }, () => loadAll()),
    ];
    channels.forEach(c => c.subscribe());
    return () => channels.forEach(c => supabase.removeChannel(c));
  }, []);

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };
  const addLog = async (action, actor, detail) => { await supabase.from("logs").insert({ action, actor, detail, date: today }); };
  const getUser = id => users.find(u => u.id === id);
  const getItem = id => inventory.find(i => i.id === id);

  // ── PIN LOGIN ─────────────────────────────────────────────────────────────
  const handleSelectUser = u => { setSelectedUser(u); setPinInput(""); setPinError(false); setLoginStep("pin"); };

  const handlePinDigit = d => {
    if (pinInput.length >= 4) return;
    const next = pinInput + d;
    setPinInput(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === selectedUser.pin) {
          setCurrentUserId(selectedUser.id); setTab("dashboard");
          setLoginStep("select"); setPinInput("");
        } else {
          setPinError(true); setPinShake(true);
          setTimeout(() => { setPinInput(""); setPinError(false); setPinShake(false); }, 800);
        }
      }, 120);
    }
  };

  const handlePinDelete = () => { if (pinInput.length > 0) setPinInput(p => p.slice(0, -1)); };
  const handleLogout = () => { setCurrentUserId(null); setLoginStep("select"); setSelectedUser(null); setPinInput(""); };

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  const submitRequest = async () => {
    const { itemId, qty, note } = form;
    if (!itemId || !qty || qty < 1) return showToast("Fill in all fields", "error");
    const item = getItem(Number(itemId));
    const q = Number(qty);
    if (!item) return;
    if (q > item.available) return showToast(`Only ${item.available} ${item.unit} available!`, "error");
    await supabase.from("requests").insert({ from_user_id: currentUser.id, item_id: Number(itemId), qty: q, status: "pending", note: note || "", date: today });
    await addLog("Request", currentUser.name, `Requested ${q}× ${item.name}`);
    setModal(null); setForm({}); showToast("Request submitted!");
  };

  const approveRequest = async req => {
    const item = getItem(req.item_id);
    if (!item || item.available < req.qty) return showToast(`Only ${item?.available || 0} available!`, "error");
    await supabase.from("requests").update({ status: "approved" }).eq("id", req.id);
    await supabase.from("inventory").update({ available: item.available - req.qty }).eq("id", req.item_id);
    const ex = assignments.find(x => x.user_id === req.from_user_id && x.item_id === req.item_id);
    if (ex) await supabase.from("assignments").update({ qty: ex.qty + req.qty }).eq("id", ex.id);
    else await supabase.from("assignments").insert({ item_id: req.item_id, user_id: req.from_user_id, qty: req.qty, assigned_at: today });
    await addLog("Approved", currentUser.name, `Approved ${req.qty}× ${item.name} for ${getUser(req.from_user_id)?.name}`);
    showToast("Request approved!");
  };

  const rejectRequest = async req => {
    await supabase.from("requests").update({ status: "rejected" }).eq("id", req.id);
    await addLog("Rejected", currentUser.name, `Rejected ${getItem(req.item_id)?.name} request from ${getUser(req.from_user_id)?.name}`);
    showToast("Request rejected.");
  };

  const submitTransfer = async () => {
    const { itemId, toUserId, qty, note } = form;
    if (!itemId || !toUserId || !qty || qty < 1) return showToast("Fill in all fields", "error");
    const myItem = myAssignments.find(a => a.item_id === Number(itemId));
    if (!myItem || myItem.qty < qty) return showToast("You don't have enough of this item", "error");
    const item = getItem(Number(itemId));
    await supabase.from("transfers").insert({ from_user_id: currentUser.id, to_user_id: Number(toUserId), item_id: Number(itemId), qty: Number(qty), status: "pending", note: note || "", date: today });
    await addLog("Transfer Sent", currentUser.name, `Sent ${qty}× ${item?.name} to ${getUser(Number(toUserId))?.name}`);
    setModal(null); setForm({}); showToast("Transfer sent!");
  };

  const acceptTransfer = async t => {
    await supabase.from("transfers").update({ status: "accepted" }).eq("id", t.id);
    const fromA = assignments.find(x => x.user_id === t.from_user_id && x.item_id === t.item_id);
    if (fromA) {
      if (fromA.qty - t.qty <= 0) await supabase.from("assignments").delete().eq("id", fromA.id);
      else await supabase.from("assignments").update({ qty: fromA.qty - t.qty }).eq("id", fromA.id);
    }
    const toA = assignments.find(x => x.user_id === t.to_user_id && x.item_id === t.item_id);
    if (toA) await supabase.from("assignments").update({ qty: toA.qty + t.qty }).eq("id", toA.id);
    else await supabase.from("assignments").insert({ item_id: t.item_id, user_id: t.to_user_id, qty: t.qty, assigned_at: today });
    await addLog("Transfer Accepted", currentUser.name, `Accepted ${t.qty}× ${getItem(t.item_id)?.name} from ${getUser(t.from_user_id)?.name}`);
    showToast("Transfer accepted!");
  };

  const declineTransfer = async t => {
    await supabase.from("transfers").update({ status: "declined" }).eq("id", t.id);
    await addLog("Transfer Declined", currentUser.name, `Declined transfer from ${getUser(t.from_user_id)?.name}`);
    showToast("Transfer declined.");
  };

  const returnItem = async (assignment, qty = 1) => {
    const q = Math.min(qty, assignment.qty);
    const item = getItem(assignment.item_id);
    if (assignment.qty - q <= 0) await supabase.from("assignments").delete().eq("id", assignment.id);
    else await supabase.from("assignments").update({ qty: assignment.qty - q }).eq("id", assignment.id);
    await supabase.from("inventory").update({ available: item.available + q }).eq("id", assignment.item_id);
    await addLog("Return", currentUser.name, `Returned ${q}× ${item?.name}`);
    showToast(`Returned ${q}× ${item?.name}`);
  };

  const submitIncident = async () => {
    const { itemId, qty, type, reportedBy, note, heldByUserId } = form;
    if (!itemId || !qty || qty < 1 || !type) return showToast("Fill in all required fields", "error");
    const q = Number(qty); const item = getItem(Number(itemId));
    const heldUid = heldByUserId && Number(heldByUserId) !== 0 ? Number(heldByUserId) : null;
    if (heldUid) {
      const a = assignments.find(x => x.user_id === heldUid && x.item_id === Number(itemId));
      if (a) {
        if (a.qty - q <= 0) await supabase.from("assignments").delete().eq("id", a.id);
        else await supabase.from("assignments").update({ qty: a.qty - q }).eq("id", a.id);
      }
    } else {
      await supabase.from("inventory").update({ available: Math.max(0, item.available - q) }).eq("id", Number(itemId));
    }
    await supabase.from("inventory").update({ total: Math.max(0, item.total - q) }).eq("id", Number(itemId));
    await supabase.from("incidents").insert({ item_id: Number(itemId), qty: q, type, reported_by: reportedBy || currentUser.name, held_by_user_id: heldUid, note: note || "", date: today, status: "open" });
    await addLog(type === "damaged" ? "Damaged" : "Lost", currentUser.name, `Reported ${q}× ${item?.name} as ${type}`);
    setModal(null); setForm({}); showToast(`Marked as ${type}!`);
  };

  const resolveIncident = async (id, resolution) => {
    const inc = incidents.find(i => i.id === id);
    const item = getItem(inc?.item_id);
    await supabase.from("incidents").update({ status: "resolved", resolution, resolved_date: today }).eq("id", id);
    if (resolution === "repaired" || resolution === "replaced") {
      await supabase.from("inventory").update({ total: item.total + inc.qty, available: item.available + inc.qty }).eq("id", inc.item_id);
    }
    await addLog("Incident Resolved", currentUser.name, `${inc.qty}× ${item?.name} — ${resolution}`);
    showToast("Incident resolved!");
  };

  const submitEditItem = async () => {
    const { id, name, category, total, unit } = form;
    if (!name || !total || total < 1) return showToast("Fill in all fields", "error");
    const item = getItem(id);
    const co = item.total - item.available;
    await supabase.from("inventory").update({ name, category: category || "General", total: Number(total), available: Math.max(0, Number(total) - co), unit: unit || "pcs" }).eq("id", id);
    await addLog("Edited Item", currentUser.name, `Updated "${name}"`);
    setModal(null); setForm({}); showToast("Item updated!");
  };

  const deleteItem = async itemId => {
    const item = getItem(itemId);
    await supabase.from("inventory").delete().eq("id", itemId);
    await addLog("Deleted Item", currentUser.name, `Removed "${item?.name}"`);
    setConfirmAction(null); showToast(`"${item?.name}" deleted`);
  };

  const submitAddItem = async () => {
    const { name, category, total, unit } = form;
    if (!name || !total || total < 1) return showToast("Fill in all fields", "error");
    await supabase.from("inventory").insert({ name, category: category || "General", total: Number(total), available: Number(total), unit: unit || "pcs" });
    await addLog("Added Item", currentUser.name, `Added ${total}× ${name}`);
    setModal(null); setForm({}); showToast("Item added!");
  };

  const submitAddUser = async () => {
    const { name, role, pin } = form;
    if (!name) return showToast("Name is required", "error");
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) return showToast("PIN must be exactly 4 digits", "error");
    const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = [BRAND.primary,"#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#14b8a6","#f97316","#06b6d4"];
    await supabase.from("users").insert({ name, role: role || "staff", avatar: initials, color: colors[users.length % colors.length], pin });
    await addLog("User Added", currentUser.name, `Added ${name} as ${role || "staff"}`);
    setModal(null); setForm({}); showToast("User added!");
  };

  const submitChangePin = async () => {
    const { targetUserId, newPin } = form;
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) return showToast("PIN must be exactly 4 digits", "error");
    await supabase.from("users").update({ pin: newPin }).eq("id", Number(targetUserId));
    await addLog("PIN Changed", currentUser.name, `Changed PIN for ${getUser(Number(targetUserId))?.name}`);
    setModal(null); setForm({}); showToast("PIN updated!");
  };

  const removeUser = async uid => {
    const u = getUser(uid);
    const theirA = assignments.filter(a => a.user_id === uid);
    for (const a of theirA) {
      const item = getItem(a.item_id);
      if (item) await supabase.from("inventory").update({ available: item.available + a.qty }).eq("id", a.item_id);
    }
    await supabase.from("users").delete().eq("id", uid);
    await addLog("User Removed", currentUser.name, `Removed ${u?.name}`);
    setConfirmAction(null); showToast(`${u?.name} removed`);
  };

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const Avatar = ({ user, size = 36 }) => (
    <div style={{ width: size, height: size, borderRadius: "50%", background: user?.color || BRAND.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>{user?.avatar || "?"}</div>
  );
  const StatusBadge = ({ s }) => {
    const map = { pending:"#fef9c3|#a16207", approved:"#dcfce7|#15803d", rejected:"#fee2e2|#b91c1c", accepted:"#dcfce7|#15803d", declined:"#fee2e2|#b91c1c", open:"#fee2e2|#b91c1c", resolved:"#dcfce7|#15803d" };
    const [bg, color] = (map[s] || "#f3f4f6|#374151").split("|");
    return <span style={{ background: bg, color, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{s}</span>;
  };
  const Card = ({ children, style }) => <div style={{ background: "white", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", ...style }}>{children}</div>;
  const SectionLabel = ({ label }) => <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 4 }}>{label}</div>;

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (!loaded) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: BRAND.gradient }}>
      <Logo size={72} />
      <div style={{ color: "white", fontSize: 16, fontWeight: 700, marginTop: 20 }}>Loading inventory...</div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 6 }}>Connecting to Supabase</div>
    </div>
  );

  // ── LOGIN: SELECT ─────────────────────────────────────────────────────────
  if (!currentUserId && loginStep === "select") return (
    <div style={{ minHeight: "100vh", background: BRAND.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 25px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Logo size={96} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: BRAND.darker, margin: 0 }}>Office Inventory</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>Select your account</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map(u => (
            <button key={u.id} onClick={() => handleSelectUser(u)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", border: "2px solid #e5e7eb", borderRadius: 12, background: "white", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = BRAND.primary}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}>
              <Avatar user={u} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: u.role === "admin" ? BRAND.primary : "#9ca3af", textTransform: "capitalize", fontWeight: 500 }}>{u.role}</div>
              </div>
              <span style={{ color: "#d1d5db", fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── LOGIN: PIN ────────────────────────────────────────────────────────────
  if (!currentUserId && loginStep === "pin") {
    const dialKeys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
    return (
      <div style={{ minHeight: "100vh", background: BRAND.gradient, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "white", borderRadius: 24, padding: "32px 28px", width: "100%", maxWidth: 340, boxShadow: "0 25px 60px rgba(0,0,0,0.35)", textAlign: "center", position: "relative" }}>
          <button onClick={() => { setLoginStep("select"); setPinInput(""); setPinError(false); }} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: "#6b7280", fontSize: 22, cursor: "pointer" }}>‹</button>
          <Avatar user={selectedUser} size={64} />
          <div style={{ fontWeight: 800, fontSize: 18, color: BRAND.darker, marginTop: 12 }}>{selectedUser?.name}</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24, textTransform: "capitalize" }}>{selectedUser?.role} · Enter your PIN</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: pinError ? 12 : 32, animation: pinShake ? "shake 0.4s" : "none" }}>
            <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", border: `2.5px solid ${pinError ? "#ef4444" : BRAND.primary}`, background: pinInput.length > i ? (pinError ? "#ef4444" : BRAND.primary) : "transparent", transition: "background 0.15s" }} />
            ))}
          </div>
          {pinError && <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Wrong PIN. Try again.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {dialKeys.map((k, i) => (
              <button key={i} onClick={() => k === "⌫" ? handlePinDelete() : k !== "" ? handlePinDigit(k) : null} disabled={k === ""}
                style={{ height: 60, borderRadius: 16, border: "none", background: k === "" ? "transparent" : k === "⌫" ? "#fee2e2" : BRAND.pale, color: k === "⌫" ? "#ef4444" : BRAND.darker, fontSize: k === "⌫" ? 20 : 22, fontWeight: 700, cursor: k === "" ? "default" : "pointer" }}>
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── TABS ──────────────────────────────────────────────────────────────────
  const adminTabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "inventory", label: "Inventory", icon: "🗄️" },
    { id: "requests", label: "Requests", icon: "📋", badge: pendingRequests.length },
    { id: "transfers", label: "Transfers", icon: "🔄", badge: pendingTransfersForMe.length },
    { id: "incidents", label: "Incidents", icon: "⚠️", badge: openIncidents.length },
    { id: "team", label: "Team", icon: "👥" },
    { id: "log", label: "Log", icon: "📜" },
  ];
  const staffTabs = [
    { id: "dashboard", label: "My Items", icon: "🎒" },
    { id: "request", label: "Request", icon: "📋" },
    { id: "transfers", label: "Transfers", icon: "🔄", badge: pendingTransfersForMe.length },
    { id: "report", label: "Report", icon: "⚠️" },
  ];
  const tabs = isAdmin ? adminTabs : staffTabs;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Header with Logo */}
      <div style={{ background: BRAND.gradLight, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, boxShadow: `0 2px 12px rgba(98,64,204,0.4)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 4 }}>
            <Logo size={28} />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>Office Inventory</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncing ? "#fbbf24" : "#34d399" }} />
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>{syncing ? "Syncing..." : "Live"} · {currentUser?.name}</div>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Logout</button>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 12px 90px" }}>

        {/* ADMIN DASHBOARD */}
        {tab === "dashboard" && isAdmin && (() => {
          const totalDamaged = incidents.filter(i => i.type === "damaged").reduce((s, i) => s + i.qty, 0);
          const totalLost = incidents.filter(i => i.type === "lost").reduce((s, i) => s + i.qty, 0);
          return (
            <div>
              <h2 style={{ fontWeight: 800, color: BRAND.darker, marginBottom: 16, fontSize: 20 }}>Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 20 }}>
                {[
                  { label: "Total Items", val: inventory.length, icon: "🗄️", color: BRAND.primary, sub: `${inventory.reduce((s,i)=>s+i.total,0)} units` },
                  { label: "Available", val: inventory.reduce((s,i)=>s+i.available,0), icon: "✅", color: "#10b981", sub: "in stock" },
                  { label: "Damaged", val: totalDamaged, icon: "🔧", color: "#f59e0b", sub: "units" },
                  { label: "Lost", val: totalLost, icon: "❓", color: "#ef4444", sub: "units" },
                ].map(c => (
                  <div key={c.label} style={{ background: "white", borderRadius: 14, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 26, marginBottom: 6 }}>{c.icon}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.val}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{c.sub}</div>
                  </div>
                ))}
              </div>
              {openIncidents.length > 0 && (
                <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 14, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: "#c2410c", fontSize: 14, marginBottom: 8 }}>⚠️ {openIncidents.length} Open Incident{openIncidents.length > 1 ? "s" : ""}</div>
                  {openIncidents.slice(0, 3).map(inc => <div key={inc.id} style={{ fontSize: 13, color: "#9a3412", marginBottom: 4 }}>• {inc.qty}× {getItem(inc.item_id)?.name} — <strong>{inc.type}</strong> ({inc.date})</div>)}
                </div>
              )}
              <h3 style={{ fontWeight: 700, color: "#374151", marginBottom: 10, fontSize: 15 }}>Stock Levels</h3>
              {inventory.map(item => {
                const pct = item.total > 0 ? Math.round((item.available / item.total) * 100) : 0;
                const color = pct > 50 ? "#10b981" : pct > 20 ? "#f59e0b" : "#ef4444";
                const itemInc = incidents.filter(i => i.item_id === item.id && i.status === "open");
                return (
                  <Card key={item.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div><div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{item.category}</div></div>
                      <div style={{ textAlign: "right" }}><div style={{ fontWeight: 800, fontSize: 18, color }}>{item.available}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>of {item.total} {item.unit}</div></div>
                    </div>
                    <div style={{ background: "#f3f4f6", borderRadius: 99, height: 7 }}><div style={{ width: `${pct}%`, background: color, borderRadius: 99, height: 7, transition: "width 0.5s" }} /></div>
                    {itemInc.length > 0 && <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{itemInc.map(inc => <span key={inc.id} style={{ background: inc.type === "damaged" ? "#fff7ed" : "#fef2f2", color: inc.type === "damaged" ? "#c2410c" : "#b91c1c", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{inc.type === "damaged" ? "🔧" : "❓"} {inc.qty} {inc.type}</span>)}</div>}
                  </Card>
                );
              })}
            </div>
          );
        })()}

        {/* ADMIN INVENTORY */}
        {tab === "inventory" && isAdmin && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontWeight: 800, color: BRAND.darker, margin: 0, fontSize: 20 }}>Inventory</h2>
              <button onClick={() => { setModal("addItem"); setForm({}); }} style={{ background: BRAND.primary, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>+ Add Item</button>
            </div>
            <input style={{ ...inp, marginBottom: 14 }} placeholder="🔍 Search items..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            {inventory.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase()) || i.category.toLowerCase().includes(searchQ.toLowerCase())).map(item => {
              const holders = assignments.filter(a => a.item_id === item.id);
              const itemInc = incidents.filter(i => i.item_id === item.id && i.status === "open");
              return (
                <Card key={item.id}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{item.category} · {item.total} {item.unit} total</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ textAlign: "right" }}><div style={{ fontSize: 20, fontWeight: 800, color: item.available > 0 ? "#10b981" : "#ef4444" }}>{item.available}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>available</div></div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button onClick={() => { setModal("editItem"); setForm({ id: item.id, name: item.name, category: item.category, total: item.total, unit: item.unit }); }} style={{ background: BRAND.pale, color: BRAND.dark, border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✏️</button>
                        <button onClick={() => { setModal("reportIncident"); setForm({ itemId: String(item.id) }); }} style={{ background: "#fff7ed", color: "#c2410c", border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>⚠️</button>
                        <button onClick={() => setConfirmAction({ type: "deleteItem", itemId: item.id, name: item.name, checkedOut: item.total - item.available })} style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 7, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                  {itemInc.length > 0 && <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{itemInc.map(inc => <span key={inc.id} style={{ background: inc.type === "damaged" ? "#fff7ed" : "#fef2f2", color: inc.type === "damaged" ? "#c2410c" : "#b91c1c", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{inc.type === "damaged" ? "🔧" : "❓"} {inc.qty} {inc.type}</span>)}</div>}
                  {holders.length > 0 && <div style={{ marginTop: 10, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}><div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Held by</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{holders.map(h => <span key={h.id} style={{ background: BRAND.pale, color: BRAND.dark, borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{getUser(h.user_id)?.name} ×{h.qty}</span>)}</div></div>}
                </Card>
              );
            })}
          </div>
        )}

        {/* ADMIN REQUESTS */}
        {tab === "requests" && isAdmin && (
          <div>
            <h2 style={{ fontWeight: 800, color: BRAND.darker, marginBottom: 16, fontSize: 20 }}>Inventory Requests</h2>
            {requests.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", marginTop: 60 }}>No requests yet.</div>}
            {["pending","approved","rejected"].map(status => {
              const group = requests.filter(r => r.status === status);
              if (!group.length) return null;
              return (<div key={status}><SectionLabel label={status} />
                {group.map(req => (
                  <Card key={req.id}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Avatar user={getUser(req.from_user_id)} size={38} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{getUser(req.from_user_id)?.name}</div>
                        <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>Requesting <strong>{req.qty}× {getItem(req.item_id)?.name}</strong></div>
                        {req.note && <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>"{req.note}"</div>}
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{req.date}</div>
                      </div>
                      <StatusBadge s={req.status} />
                    </div>
                    {req.status === "pending" && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={() => approveRequest(req)} style={{ flex: 1, background: "#10b981", color: "white", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✓ Approve</button>
                        <button onClick={() => rejectRequest(req)} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✗ Reject</button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>);
            })}
          </div>
        )}

        {/* TRANSFERS */}
        {tab === "transfers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 800, color: BRAND.darker, margin: 0, fontSize: 20 }}>Transfers</h2>
              {!isAdmin && <button onClick={() => { setModal("transfer"); setForm({}); }} style={{ background: BRAND.primary, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>+ Transfer</button>}
            </div>
            {transfers.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", marginTop: 60 }}>No transfers yet.</div>}
            {["pending","accepted","declined"].map(status => {
              const group = transfers.filter(t => t.status === status);
              if (!group.length) return null;
              return (<div key={status}><SectionLabel label={status} />
                {group.map(t => {
                  const canAct = t.status === "pending" && (t.to_user_id === currentUser.id || isAdmin);
                  return (
                    <Card key={t.id}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Avatar user={getUser(t.from_user_id)} size={32} /><span style={{ fontSize: 14, color: "#9ca3af" }}>→</span><Avatar user={getUser(t.to_user_id)} size={32} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "#374151" }}><strong>{getUser(t.from_user_id)?.name}</strong> → <strong>{getUser(t.to_user_id)?.name}</strong></div>
                          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{t.qty}× {getItem(t.item_id)?.name}</div>
                          {t.note && <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>"{t.note}"</div>}
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{t.date}</div>
                        </div>
                        <StatusBadge s={t.status} />
                      </div>
                      {canAct && <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={() => acceptTransfer(t)} style={{ flex: 1, background: "#10b981", color: "white", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✓ Accept</button>
                        <button onClick={() => declineTransfer(t)} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✗ Decline</button>
                      </div>}
                    </Card>
                  );
                })}
              </div>);
            })}
          </div>
        )}

        {/* INCIDENTS */}
        {tab === "incidents" && isAdmin && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontWeight: 800, color: BRAND.darker, margin: 0, fontSize: 20 }}>Incidents</h2>
              <button onClick={() => { setModal("reportIncident"); setForm({}); }} style={{ background: "#f97316", color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>+ Report</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Open", val: incidents.filter(i=>i.status==="open").length, color: "#ef4444", bg: "#fee2e2" },
                { label: "Damaged", val: incidents.filter(i=>i.type==="damaged").reduce((s,i)=>s+i.qty,0), color: "#f59e0b", bg: "#fef3c7" },
                { label: "Lost", val: incidents.filter(i=>i.type==="lost").reduce((s,i)=>s+i.qty,0), color: BRAND.primary, bg: BRAND.pale },
              ].map(c => <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: 12, textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.val}</div><div style={{ fontSize: 12, color: c.color, fontWeight: 600 }}>{c.label}</div></div>)}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["all","open","resolved","damaged","lost"].map(f => (
                <button key={f} onClick={() => setIncidentFilter(f)} style={{ background: incidentFilter === f ? BRAND.primary : "white", color: incidentFilter === f ? "white" : "#6b7280", border: "1.5px solid", borderColor: incidentFilter === f ? BRAND.primary : "#e5e7eb", borderRadius: 99, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, textTransform: "capitalize" }}>{f}</button>
              ))}
            </div>
            {incidents.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", marginTop: 60 }}>No incidents reported. 🎉</div>}
            {incidents.filter(i => incidentFilter === "all" ? true : incidentFilter === "open" || incidentFilter === "resolved" ? i.status === incidentFilter : i.type === incidentFilter).map(inc => (
              <Card key={inc.id} style={{ borderLeft: `4px solid ${inc.type === "damaged" ? "#f59e0b" : "#ef4444"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>{inc.type === "damaged" ? "🔧" : "❓"}</span>
                      <div><div style={{ fontWeight: 700, fontSize: 15 }}>{inc.qty}× {getItem(inc.item_id)?.name}</div><div style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>Marked as <strong>{inc.type}</strong></div></div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Reported by <strong>{inc.reported_by}</strong> · {inc.date}</div>
                    {inc.held_by_user_id && <div style={{ fontSize: 12, color: "#6b7280" }}>Last held by <strong>{getUser(inc.held_by_user_id)?.name}</strong></div>}
                    {inc.note && <div style={{ fontSize: 12, color: "#374151", marginTop: 4, fontStyle: "italic", background: "#f9fafb", borderRadius: 8, padding: "6px 10px" }}>"{inc.note}"</div>}
                    {inc.status === "resolved" && <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>✅ Resolved: <strong>{inc.resolution}</strong> · {inc.resolved_date}</div>}
                  </div>
                  <StatusBadge s={inc.status} />
                </div>
                {inc.status === "open" && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 12, marginBottom: 6 }}>Resolve as:</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[{ key: "repaired", label: "🔧 Repaired", color: "#10b981" }, { key: "replaced", label: "🔄 Replaced", color: BRAND.primary }, { key: "written off", label: "📝 Written Off", color: "#6b7280" }].map(r => (
                        <button key={r.key} onClick={() => resolveIncident(inc.id, r.key)} style={{ background: r.color, color: "white", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>{r.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* TEAM */}
        {tab === "team" && isAdmin && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontWeight: 800, color: BRAND.darker, margin: 0, fontSize: 20 }}>Team</h2>
              <button onClick={() => { setModal("addUser"); setForm({ role: "staff" }); }} style={{ background: BRAND.primary, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>+ Add User</button>
            </div>
            {users.map(u => {
              const theirItems = assignments.filter(a => a.user_id === u.id);
              return (
                <Card key={u.id}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <Avatar user={u} size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: u.role === "admin" ? BRAND.primary : "#9ca3af", fontWeight: 600, textTransform: "capitalize" }}>{u.role}</div>
                      {theirItems.length > 0
                        ? <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>{theirItems.map(a => <span key={a.id} style={{ background: "#f3f4f6", color: "#374151", borderRadius: 99, padding: "2px 8px", fontSize: 11 }}>{getItem(a.item_id)?.name} ×{a.qty}</span>)}</div>
                        : <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>No items assigned</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button onClick={() => { setModal("changePin"); setForm({ targetUserId: String(u.id), targetName: u.name }); }} style={{ background: "#fef3c7", color: "#92400e", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>🔑 PIN</button>
                      {u.role !== "admin" && <button onClick={() => setConfirmAction({ type: "removeUser", uid: u.id, name: u.name })} style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>Remove</button>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* LOG */}
        {tab === "log" && isAdmin && (
          <div>
            <h2 style={{ fontWeight: 800, color: BRAND.darker, marginBottom: 16, fontSize: 20 }}>Audit Log</h2>
            {logs.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", marginTop: 60 }}>No activity yet.</div>}
            {logs.map(l => {
              const iconMap = { "Approved":"✅","Rejected":"❌","Transfer Sent":"📤","Transfer Accepted":"✅","Transfer Declined":"❌","Return":"↩️","Added Item":"➕","Edited Item":"✏️","Deleted Item":"🗑️","User Added":"👤","User Removed":"🗑️","Request":"📋","Damaged":"🔧","Lost":"❓","Incident Resolved":"✅","PIN Changed":"🔑" };
              return (
                <Card key={l.id} style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: BRAND.pale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{iconMap[l.action] || "📋"}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{l.action} <span style={{ fontWeight: 400, color: "#6b7280" }}>by {l.actor}</span></div>
                      <div style={{ fontSize: 13, color: "#374151" }}>{l.detail}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{l.date}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* STAFF: MY ITEMS */}
        {tab === "dashboard" && !isAdmin && (
          <div>
            <h2 style={{ fontWeight: 800, color: BRAND.darker, marginBottom: 16, fontSize: 20 }}>My Items</h2>
            {myAssignments.length === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#9ca3af" }}><div style={{ fontSize: 48, marginBottom: 10 }}>📭</div><div style={{ fontWeight: 600 }}>No items assigned yet</div><div style={{ fontSize: 13, marginTop: 4 }}>Request items from the Request tab</div></div>}
            {myAssignments.map(a => {
              const item = getItem(a.item_id);
              return (
                <Card key={a.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontWeight: 700, fontSize: 15 }}>{item?.name}</div><div style={{ fontSize: 12, color: "#6b7280" }}>{item?.category}</div><div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Since {a.assigned_at}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 28, fontWeight: 800, color: BRAND.primary }}>×{a.qty}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{item?.unit}</div></div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    <button onClick={() => returnItem(a, 1)} style={{ flex: 1, minWidth: 80, background: "#fef3c7", color: "#92400e", border: "none", borderRadius: 9, padding: "8px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>↩ Return 1</button>
                    {a.qty > 1 && <button onClick={() => returnItem(a, a.qty)} style={{ flex: 1, minWidth: 80, background: "#fee2e2", color: "#b91c1c", border: "none", borderRadius: 9, padding: "8px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>↩ Return All</button>}
                    <button onClick={() => { setModal("transfer"); setForm({ itemId: String(a.item_id) }); }} style={{ flex: 1, minWidth: 80, background: BRAND.pale, color: BRAND.dark, border: "none", borderRadius: 9, padding: "8px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>🔄 Transfer</button>
                    <button onClick={() => { setModal("reportIncident"); setForm({ itemId: String(a.item_id), heldByUserId: String(currentUser.id), reportedBy: currentUser.name }); }} style={{ flex: 1, minWidth: 80, background: "#fff7ed", color: "#c2410c", border: "none", borderRadius: 9, padding: "8px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>⚠️ Report</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* STAFF: REQUEST */}
        {tab === "request" && !isAdmin && (
          <div>
            <h2 style={{ fontWeight: 800, color: BRAND.darker, marginBottom: 8, fontSize: 20 }}>Request Items</h2>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>Live stock — updated in real time.</p>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>📦 Current Stock</div>
              {inventory.map(item => {
                const pct = item.total > 0 ? Math.round((item.available / item.total) * 100) : 0;
                const color = item.available === 0 ? "#ef4444" : pct <= 20 ? "#f59e0b" : "#10b981";
                return (
                  <div key={item.id} style={{ background: "white", borderRadius: 10, padding: "10px 14px", marginBottom: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                      <div style={{ background: "#f3f4f6", borderRadius: 99, height: 5, marginTop: 4 }}><div style={{ width: `${pct}%`, background: color, borderRadius: 99, height: 5 }} /></div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 60 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color }}>{item.available}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>/ {item.total} {item.unit}</div>
                    </div>
                    {item.available === 0 && <span style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>OUT</span>}
                  </div>
                );
              })}
            </div>
            <button onClick={() => { setModal("request"); setForm({}); }} style={{ ...btn, marginTop: 0, marginBottom: 20 }}>+ New Request</button>
            {requests.filter(r => r.from_user_id === currentUser.id).length > 0 && <>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: "#374151", marginBottom: 10 }}>My Requests</h3>
              {requests.filter(r => r.from_user_id === currentUser.id).map(req => (
                <Card key={req.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div><div style={{ fontWeight: 700, fontSize: 14 }}>{req.qty}× {getItem(req.item_id)?.name}</div>{req.note && <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>"{req.note}"</div>}<div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{req.date}</div></div>
                    <StatusBadge s={req.status} />
                  </div>
                </Card>
              ))}
            </>}
          </div>
        )}

        {/* STAFF: REPORT */}
        {tab === "report" && !isAdmin && (
          <div>
            <h2 style={{ fontWeight: 800, color: BRAND.darker, marginBottom: 8, fontSize: 20 }}>Report Incident</h2>
            <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>Report a damaged or lost item.</p>
            <button onClick={() => { setModal("reportIncident"); setForm({ reportedBy: currentUser.name }); }} style={{ ...btn, background: "linear-gradient(135deg,#c2410c,#f97316)", marginTop: 0, marginBottom: 20 }}>+ Report Damaged / Lost Item</button>
            {incidents.filter(i => i.reported_by === currentUser.name).length > 0 && <>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: "#374151", marginBottom: 10 }}>My Reports</h3>
              {incidents.filter(i => i.reported_by === currentUser.name).map(inc => (
                <Card key={inc.id} style={{ borderLeft: `4px solid ${inc.type === "damaged" ? "#f59e0b" : "#ef4444"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div><div style={{ fontWeight: 700 }}>{inc.qty}× {getItem(inc.item_id)?.name}</div><div style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{inc.type} · {inc.date}</div>{inc.note && <div style={{ fontSize: 12, fontStyle: "italic", marginTop: 4 }}>"{inc.note}"</div>}{inc.status === "resolved" && <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>✅ {inc.resolution} · {inc.resolved_date}</div>}</div>
                    <StatusBadge s={inc.status} />
                  </div>
                </Card>
              ))}
            </>}
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: "1px solid #e5e7eb", display: "flex", zIndex: 50 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 2px 10px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
            {t.badge > 0 && <div style={{ position: "absolute", top: 6, right: "calc(50% - 14px)", background: "#ef4444", color: "white", borderRadius: 99, fontSize: 9, fontWeight: 700, padding: "1px 4px", minWidth: 14, textAlign: "center" }}>{t.badge}</div>}
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 9, color: tab === t.id ? BRAND.primary : "#9ca3af", fontWeight: tab === t.id ? 800 : 500 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && <div style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#ef4444" : "#10b981", color: "white", padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", whiteSpace: "nowrap" }}>{toast.msg}</div>}

      {/* Confirm */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }} onClick={() => setConfirmAction(null)}>
          <div style={{ background: "white", borderRadius: 18, padding: 24, width: "100%", maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 17, textAlign: "center", marginBottom: 8 }}>
              {confirmAction.type === "deleteItem" ? `Delete "${confirmAction.name}"?` : `Remove ${confirmAction.name}?`}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 20 }}>This cannot be undone.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmAction(null)} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, padding: "11px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => confirmAction.type === "deleteItem" ? deleteItem(confirmAction.itemId) : removeUser(confirmAction.uid)} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: 10, padding: "11px", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }} onClick={() => setModal(null)}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "24px 24px 32px", width: "100%", maxWidth: 500, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

            {modal === "request" && (() => {
              const selItem = form.itemId ? getItem(Number(form.itemId)) : null;
              const overLimit = selItem && form.qty > selItem.available;
              return (<>
                <h3 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 18 }}>Request Item</h3>
                <label style={lbl}>Item</label>
                <select style={inp} value={form.itemId || ""} onChange={e => setForm(f => ({ ...f, itemId: e.target.value, qty: "" }))}>
                  <option value="">Choose an item...</option>
                  {inventory.map(i => <option key={i.id} value={i.id} disabled={i.available === 0}>{i.name} — {i.available}/{i.total} {i.unit}{i.available === 0 ? " (OUT)" : ""}</option>)}
                </select>
                {selItem && (
                  <div style={{ marginTop: 10, background: selItem.available === 0 ? "#fee2e2" : "#f0fdf4", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, color: selItem.available === 0 ? "#b91c1c" : "#15803d", fontWeight: 600 }}>{selItem.available === 0 ? "❌ Out of stock" : `✅ ${selItem.available} ${selItem.unit} available`}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: selItem.available === 0 ? "#ef4444" : "#10b981" }}>{selItem.available}</div>
                  </div>
                )}
                <label style={lbl}>Quantity</label>
                <input style={{ ...inp, borderColor: overLimit ? "#ef4444" : "#e5e7eb" }} type="number" min={1} max={selItem?.available || 999} value={form.qty || ""} onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) }))} placeholder="1" />
                {overLimit && <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginTop: 6 }}>⚠️ Only {selItem.available} {selItem.unit} available! You can't request {form.qty}.</div>}
                <label style={lbl}>Reason (optional)</label>
                <input style={inp} value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Needed for warehouse scan" />
                <button onClick={submitRequest} disabled={overLimit || !form.itemId || !form.qty} style={{ ...btn, opacity: overLimit || !form.itemId || !form.qty ? 0.5 : 1, cursor: overLimit ? "not-allowed" : "pointer" }}>Submit Request</button>
              </>);
            })()}

            {modal === "transfer" && <>
              <h3 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 18 }}>Transfer Item</h3>
              <label style={lbl}>Item to Transfer</label>
              <select style={inp} value={form.itemId || ""} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))}>
                <option value="">Choose item...</option>
                {myAssignments.map(a => { const it = getItem(a.item_id); return <option key={a.id} value={a.item_id}>{it?.name} (you have {a.qty})</option>; })}
              </select>
              <label style={lbl}>Transfer To</label>
              <select style={inp} value={form.toUserId || ""} onChange={e => setForm(f => ({ ...f, toUserId: e.target.value }))}>
                <option value="">Choose person...</option>
                {users.filter(u => u.id !== currentUser.id && u.role !== "admin").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <label style={lbl}>Quantity</label>
              <input style={inp} type="number" min={1} value={form.qty || ""} onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) }))} placeholder="1" />
              <label style={lbl}>Note (optional)</label>
              <input style={inp} value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Temporary loan" />
              <button onClick={submitTransfer} style={btn}>Send Transfer</button>
            </>}

            {modal === "reportIncident" && <>
              <h3 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 18 }}>Report Damaged / Lost</h3>
              <label style={lbl}>Item *</label>
              <select style={inp} value={form.itemId || ""} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))}>
                <option value="">Choose item...</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <label style={lbl}>Type *</label>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                {["damaged","lost"].map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ flex: 1, padding: "10px", border: `2px solid ${form.type === t ? (t === "damaged" ? "#f97316" : "#ef4444") : "#e5e7eb"}`, borderRadius: 10, background: form.type === t ? (t === "damaged" ? "#fff7ed" : "#fef2f2") : "white", cursor: "pointer", fontWeight: 700, fontSize: 14, color: form.type === t ? (t === "damaged" ? "#c2410c" : "#b91c1c") : "#6b7280" }}>
                    {t === "damaged" ? "🔧 Damaged" : "❓ Lost"}
                  </button>
                ))}
              </div>
              <label style={lbl}>Quantity *</label>
              <input style={inp} type="number" min={1} value={form.qty || ""} onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) }))} placeholder="1" />
              <label style={lbl}>Last held by (if known)</label>
              <select style={inp} value={form.heldByUserId || "0"} onChange={e => setForm(f => ({ ...f, heldByUserId: e.target.value }))}>
                <option value="0">Unknown / In storage</option>
                {users.filter(u => u.role !== "admin").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <label style={lbl}>Reported By</label>
              <input style={inp} value={form.reportedBy || currentUser?.name || ""} onChange={e => setForm(f => ({ ...f, reportedBy: e.target.value }))} />
              <label style={lbl}>Notes</label>
              <textarea style={{ ...inp, height: 80, resize: "none" }} value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Describe what happened..." />
              <button onClick={submitIncident} style={{ ...btn, background: "linear-gradient(135deg,#c2410c,#f97316)" }}>Submit Report</button>
            </>}

            {modal === "editItem" && <>
              <h3 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 18 }}>Edit Item</h3>
              <label style={lbl}>Item Name *</label>
              <input style={inp} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <label style={lbl}>Category</label>
              <input style={inp} value={form.category || ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              <label style={lbl}>Total Quantity *</label>
              <input style={inp} type="number" min={1} value={form.total || ""} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
              <label style={lbl}>Unit</label>
              <input style={inp} value={form.unit || ""} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
              <button onClick={submitEditItem} style={btn}>Save Changes</button>
            </>}

            {modal === "addItem" && <>
              <h3 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 18 }}>Add Inventory Item</h3>
              <label style={lbl}>Item Name *</label>
              <input style={inp} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Barcode Scanner" />
              <label style={lbl}>Category</label>
              <input style={inp} value={form.category || ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Electronics, PPE" />
              <label style={lbl}>Total Quantity *</label>
              <input style={inp} type="number" min={1} value={form.total || ""} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} placeholder="10" />
              <label style={lbl}>Unit</label>
              <input style={inp} value={form.unit || ""} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="pcs / units / sets" />
              <button onClick={submitAddItem} style={btn}>Add to Inventory</button>
            </>}

            {modal === "addUser" && <>
              <h3 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 18 }}>Add Team Member</h3>
              <label style={lbl}>Full Name *</label>
              <input style={inp} value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jose Rizal" />
              <label style={lbl}>Role</label>
              <select style={inp} value={form.role || "staff"} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
              <label style={lbl}>PIN (4 digits) *</label>
              <input style={inp} type="password" inputMode="numeric" maxLength={4} value={form.pin || ""} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="••••" />
              <button onClick={submitAddUser} style={btn}>Add Member</button>
            </>}

            {modal === "changePin" && <>
              <h3 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 18 }}>Change PIN</h3>
              <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 8px" }}>Set a new 4-digit PIN for <strong>{form.targetName}</strong>.</p>
              <label style={lbl}>New PIN (4 digits)</label>
              <input style={inp} type="password" inputMode="numeric" maxLength={4} value={form.newPin || ""} onChange={e => setForm(f => ({ ...f, newPin: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="••••" />
              <button onClick={submitChangePin} style={btn}>Save New PIN</button>
            </>}

          </div>
        </div>
      )}
    </div>
  );
}
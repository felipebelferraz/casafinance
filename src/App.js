import { useState, useMemo, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, getDoc
} from "firebase/firestore";

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const icons = {
  plus: "M12 5v14M5 12h14",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  car: "M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h14l4 4v4a2 2 0 01-2 2h-2M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z",
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  piggy: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7 7-7z",
  chart: "M18 20V10M12 20V4M6 20v-6",
  arrow_up: "M12 19V5M5 12l7-7 7 7",
  warning: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  x: "M18 6L6 18M6 6l12 12",
  chevron_right: "M9 18l6-6-6-6",
  chevron_down: "M6 9l6 6 6-6",
  repeat: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  target: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  wallet: "M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M3 5a2 2 0 000 4M21 16a1 1 0 110 2 1 1 0 010-2z",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  coin: "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 8v8M8 12h8",
  save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
};

const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmt = (v) => (v||0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (part, total) => total === 0 ? 0 : Math.round((part / total) * 100);
const TODAY = new Date();
const CURRENT_MONTH = TODAY.getMonth();
const CURRENT_YEAR = TODAY.getFullYear();

const DEFAULT_GROUPS = [
  { id: "g1", name: "Moradia", icon: "home", color: "#6366f1" },
  { id: "g2", name: "Transporte", icon: "car", color: "#f59e0b" },
  { id: "g3", name: "Saúde", icon: "heart", color: "#ec4899" },
  { id: "g4", name: "Energia & Utilities", icon: "bolt", color: "#10b981" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selMonth, setSelMonth] = useState(CURRENT_MONTH);
  const [selYear, setSelYear] = useState(CURRENT_YEAR);
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [revenues, setRevenues] = useState([]);
  const [piggy, setPiggy] = useState({ balance: 0, goal: 10000, deposits: [] });
  const [savingGoal, setSavingGoal] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [showPiggyForm, setShowPiggyForm] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Firebase listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [];

    unsubs.push(onSnapshot(collection(db, "expenses"), snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }));

    unsubs.push(onSnapshot(collection(db, "revenues"), snap => {
      setRevenues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    unsubs.push(onSnapshot(collection(db, "groups"), snap => {
      const g = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (g.length > 0) setGroups(g);
    }));

    unsubs.push(onSnapshot(doc(db, "settings", "piggy"), snap => {
      if (snap.exists()) setPiggy(snap.data());
    }));

    unsubs.push(onSnapshot(doc(db, "settings", "prefs"), snap => {
      if (snap.exists() && snap.data().savingGoal) setSavingGoal(snap.data().savingGoal);
    }));

    return () => unsubs.forEach(u => u());
  }, []);

  // ─── Computed ────────────────────────────────────────────────────────────
  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.month === selMonth && e.year === selYear),
    [expenses, selMonth, selYear]
  );
  const monthRevenue = useMemo(() =>
    revenues.filter(r => r.month === selMonth && r.year === selYear).reduce((s, r) => s + r.value, 0),
    [revenues, selMonth, selYear]
  );
  const totalExpenses = useMemo(() => monthExpenses.reduce((s, e) => s + e.value, 0), [monthExpenses]);
  const paidExpenses = useMemo(() => monthExpenses.filter(e => e.paid).reduce((s, e) => s + e.value, 0), [monthExpenses]);
  const openExpenses = totalExpenses - paidExpenses;
  const balance = monthRevenue - totalExpenses;
  const savingTarget = monthRevenue * (savingGoal / 100);

  const history = useMemo(() => {
    const arr = [];
    for (let i = 11; i >= 0; i--) {
      let m = CURRENT_MONTH - i; let y = CURRENT_YEAR;
      if (m < 0) { m += 12; y -= 1; }
      const total = expenses.filter(e => e.month === m && e.year === y).reduce((s, e) => s + e.value, 0);
      const rev = revenues.filter(r => r.month === m && r.year === y).reduce((s, r) => s + r.value, 0);
      arr.push({ month: m, year: y, total, rev, label: MONTHS[m] });
    }
    return arr;
  }, [expenses, revenues]);

  const alerts = useMemo(() => {
    const warns = [];
    const prevMonth = selMonth === 0 ? 11 : selMonth - 1;
    const prevYear = selMonth === 0 ? selYear - 1 : selYear;
    monthExpenses.forEach(curr => {
      const prev = expenses.find(e => e.description === curr.description && e.groupId === curr.groupId && e.month === prevMonth && e.year === prevYear);
      if (prev && curr.value > prev.value * 1.15) {
        warns.push({ desc: curr.description, curr: curr.value, prev: prev.value, pct: Math.round(((curr.value - prev.value) / prev.value) * 100) });
      }
    });
    return warns;
  }, [monthExpenses, expenses, selMonth, selYear]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const togglePaid = async (id) => {
    const item = expenses.find(e => e.id === id);
    await setDoc(doc(db, "expenses", id), { ...item, paid: !item.paid });
  };

  const deleteExpense = async (id) => {
    await deleteDoc(doc(db, "expenses", id));
    notify("Despesa removida");
  };

  const saveExpense = async (data) => {
    if (data.id) {
      await setDoc(doc(db, "expenses", data.id), data);
      notify("Despesa atualizada");
    } else {
      const newItems = [];
      const base = { ...data, id: `exp_${Date.now()}` };
      newItems.push(base);
      if (data.recurring) {
        for (let i = 1; i <= 11; i++) {
          let m = data.month + i; let y = data.year;
          if (m > 11) { m -= 12; y += 1; }
          newItems.push({ ...data, id: `exp_${Date.now()}_${i}`, month: m, year: y });
        }
      }
      for (const item of newItems) {
        await setDoc(doc(db, "expenses", item.id), item);
      }
      notify(data.recurring ? "Despesa recorrente adicionada para 12 meses!" : "Despesa adicionada!");
    }
    setShowForm(false);
    setEditItem(null);
  };

  const addGroup = async (name, icon, color) => {
    const id = `g_${Date.now()}`;
    await setDoc(doc(db, "groups", id), { id, name, icon, color });
    setShowGroupForm(false);
    notify("Grupo criado!");
  };

  const saveRevenue = async (desc, value) => {
    const id = `rev_${selMonth}_${selYear}_${desc.replace(/\s/g,"_")}`;
    await setDoc(doc(db, "revenues", id), { id, description: desc, value, month: selMonth, year: selYear });
    setShowRevenueForm(false);
    notify("Receita salva!");
  };

  const addPiggyDeposit = async (value, note) => {
    const updated = { ...piggy, balance: (piggy.balance || 0) + value, deposits: [...(piggy.deposits || []), { date: new Date().toISOString().slice(0,10), value, note }] };
    await setDoc(doc(db, "settings", "piggy"), updated);
    setShowPiggyForm(false);
    notify("Depósito no cofrinho realizado 🐷");
  };

  const saveSavingGoal = async (val) => {
    setSavingGoal(val);
    await setDoc(doc(db, "settings", "prefs"), { savingGoal: val });
  };

  const byGroup = useMemo(() =>
    groups.map(g => ({ ...g, items: monthExpenses.filter(e => e.groupId === g.id), total: monthExpenses.filter(e => e.groupId === g.id).reduce((s, e) => s + e.value, 0) })).filter(g => g.items.length > 0),
    [groups, monthExpenses]
  );

  const maxHistory = Math.max(...history.map(h => Math.max(h.total, h.rev)), 1);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16, fontFamily:"DM Sans, sans-serif" }}>
      <div style={{ fontSize:48 }}>🏠</div>
      <div style={{ fontWeight:700, fontSize:20, color:"#1e293b" }}>CasaFinance</div>
      <div style={{ color:"#94a3b8", fontSize:14 }}>Carregando seus dados...</div>
    </div>
  );

  return (
    <div style={S.app}>
      {toast && <div style={{ ...S.toast, background: toast.type === "success" ? "#10b981" : "#ef4444" }}>{toast.msg}</div>}

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <span style={S.logoIcon}>₿</span>
            <div>
              <div style={S.logoTitle}>CasaFinance</div>
              <div style={S.logoSub}>Gestão Doméstica Inteligente</div>
            </div>
          </div>
          <div style={S.monthNav}>
            <button style={S.navBtn} onClick={() => { if (selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}else setSelMonth(m=>m-1); }}>‹</button>
            <span style={S.monthLabel}>{MONTHS_FULL[selMonth]} {selYear}</span>
            <button style={S.navBtn} onClick={() => { if (selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}else setSelMonth(m=>m+1); }}>›</button>
          </div>
        </div>
      </header>

      <nav style={S.nav}>
        {[{id:"dashboard",label:"Painel",icon:"grid"},{id:"expenses",label:"Despesas",icon:"tag"},{id:"piggy",label:"Cofrinho",icon:"piggy"},{id:"history",label:"Evolução",icon:"chart"}].map(t => (
          <button key={t.id} style={{...S.tab,...(activeTab===t.id?S.tabActive:{})}} onClick={()=>setActiveTab(t.id)}>
            <Icon d={icons[t.icon]} size={14}/>{t.label}
          </button>
        ))}
      </nav>

      <main style={S.main}>
        {/* DASHBOARD */}
        {activeTab==="dashboard" && (
          <div style={S.section}>
            <div style={S.kpiGrid}>
              <KpiCard label="Receita do Mês" value={fmt(monthRevenue)} icon="wallet" color="#10b981"
                sub={<button style={S.linkBtn} onClick={()=>setShowRevenueForm(true)}>+ Lançar receita</button>} />
              <KpiCard label="Total Despesas" value={fmt(totalExpenses)} icon="tag" color="#f59e0b" sub={`${pct(totalExpenses,monthRevenue)}% da receita`} />
              <KpiCard label="Saldo" value={fmt(balance)} icon="chart" color={balance>=0?"#6366f1":"#ef4444"} sub={balance>=0?"✓ Dentro do orçamento":"⚠ Acima da receita"} />
              <KpiCard label="Meta de Economia" value={fmt(savingTarget)} icon="target" color="#ec4899" sub={`${savingGoal}% da receita`} />
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Resumo do Mês</div>
              <ProgressRow label="Pago" value={paidExpenses} total={monthRevenue} color="#10b981"/>
              <ProgressRow label="Em Aberto" value={openExpenses} total={monthRevenue} color="#f59e0b"/>
              <ProgressRow label="Meta Economia" value={savingTarget} total={monthRevenue} color="#ec4899"/>
              <div style={S.divider}/>
              <div style={S.progressSummary}><span>Receita total</span><strong>{fmt(monthRevenue)}</strong></div>
            </div>

            {alerts.length>0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>⚠ Variações de Gasto</div>
                {alerts.map((a,i)=>(
                  <div key={i} style={S.alertRow}>
                    <Icon d={icons.warning} size={16} stroke="#f59e0b"/>
                    <div style={S.alertContent}>
                      <div style={S.alertDesc}>{a.desc}</div>
                      <div style={S.alertValues}>{fmt(a.prev)} → {fmt(a.curr)}</div>
                    </div>
                    <div style={S.alertBadge}>+{a.pct}%</div>
                  </div>
                ))}
              </div>
            )}

            <div style={S.card}>
              <div style={S.cardTitle}>Despesas por Grupo</div>
              {byGroup.map(g=>(
                <div key={g.id} style={S.groupSummaryRow}>
                  <div style={{...S.dot,background:g.color}}/>
                  <span style={S.groupSummaryName}>{g.name}</span>
                  <div style={S.groupBarWrap}><div style={{...S.groupBar,width:`${pct(g.total,totalExpenses)}%`,background:g.color}}/></div>
                  <span style={S.groupSummaryValue}>{fmt(g.total)}</span>
                </div>
              ))}
              {byGroup.length===0 && <div style={S.empty}>Nenhuma despesa lançada</div>}
            </div>

            {showRevenueForm && <Modal onClose={()=>setShowRevenueForm(false)} title="Lançar Receita">
              <RevenueForm revenues={revenues.filter(r=>r.month===selMonth&&r.year===selYear)} onSave={saveRevenue} onClose={()=>setShowRevenueForm(false)}/>
            </Modal>}
          </div>
        )}

        {/* EXPENSES */}
        {activeTab==="expenses" && (
          <div style={S.section}>
            <div style={S.rowBetween}>
              <button style={S.btnPrimary} onClick={()=>{setEditItem(null);setShowForm(true);}}>
                <Icon d={icons.plus} size={14}/> Nova Despesa
              </button>
              <button style={S.btnSecondary} onClick={()=>setShowGroupForm(true)}>
                <Icon d={icons.plus} size={14}/> Novo Grupo
              </button>
            </div>

            {groups.map(g=>{
              const items=monthExpenses.filter(e=>e.groupId===g.id);
              if(items.length===0) return null;
              return <GroupSection key={g.id} group={g} items={items} total={items.reduce((s,e)=>s+e.value,0)}
                onToggle={togglePaid} onEdit={item=>{setEditItem(item);setShowForm(true);}} onDelete={deleteExpense}/>;
            })}

            {monthExpenses.length===0 && (
              <div style={S.emptyState}>
                <div style={{fontSize:48}}>📂</div>
                <div style={{color:"#64748b",fontSize:14}}>Nenhuma despesa para {MONTHS_FULL[selMonth]}</div>
                <button style={S.btnPrimary} onClick={()=>setShowForm(true)}>Adicionar primeira despesa</button>
              </div>
            )}

            {showForm && <Modal onClose={()=>{setShowForm(false);setEditItem(null);}} title={editItem?"Editar Despesa":"Nova Despesa"}>
              <ExpenseForm groups={groups} item={editItem} selMonth={selMonth} selYear={selYear} onSave={saveExpense} onClose={()=>{setShowForm(false);setEditItem(null);}}/>
            </Modal>}

            {showGroupForm && <Modal onClose={()=>setShowGroupForm(false)} title="Novo Grupo">
              <GroupForm onSave={addGroup} onClose={()=>setShowGroupForm(false)}/>
            </Modal>}
          </div>
        )}

        {/* COFRINHO */}
        {activeTab==="piggy" && (
          <div style={S.section}>
            <div style={S.piggyHero}>
              <div style={{fontSize:56}}>🐷</div>
              <div style={S.piggyBalance}>{fmt(piggy.balance||0)}</div>
              <div style={S.piggyLabel}>Reserva de Emergência</div>
              <div style={{color:"#64748b",fontSize:12}}>Meta: {fmt(piggy.goal||10000)}</div>
              <div style={S.piggyProgressWrap}>
                <div style={{...S.piggyProgress,width:`${Math.min(100,pct(piggy.balance||0,piggy.goal||10000))}%`}}/>
              </div>
              <div style={{fontSize:12,color:"#94a3b8"}}>{pct(piggy.balance||0,piggy.goal||10000)}% da meta atingida</div>
            </div>

            <button style={{...S.btnPrimary,justifyContent:"center"}} onClick={()=>setShowPiggyForm(true)}>
              <Icon d={icons.coin} size={16}/> Depositar no Cofrinho
            </button>

            <div style={S.card}>
              <div style={S.cardTitle}>🎯 Meta de Economia Mensal</div>
              <div style={S.savingBlock}>
                <div style={S.savingPercent}>{savingGoal}%</div>
                <div style={{fontSize:13,color:"#475569",lineHeight:1.8}}>
                  <div>Meta: <strong>{fmt(savingTarget)}</strong>/mês</div>
                  <div>Saldo: <strong style={{color:balance>=savingTarget?"#10b981":"#ef4444"}}>{fmt(balance)}</strong></div>
                  <div style={{color:balance>=savingTarget?"#10b981":"#ef4444",fontWeight:600,marginTop:6}}>
                    {balance>=savingTarget?"✓ Meta atingida!":`⚠ Faltam ${fmt(savingTarget-balance)}`}
                  </div>
                </div>
              </div>
              <input type="range" min={5} max={50} value={savingGoal} onChange={e=>saveSavingGoal(+e.target.value)} style={S.range}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8"}}><span>5%</span><span>50%</span></div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Histórico de Depósitos</div>
              {(piggy.deposits||[]).length===0 && <div style={S.empty}>Nenhum depósito ainda</div>}
              {(piggy.deposits||[]).map((d,i)=>(
                <div key={i} style={S.depositRow}>
                  <div><div style={S.depositNote}>{d.note}</div><div style={S.depositDate}>{d.date}</div></div>
                  <div style={S.depositValue}>+{fmt(d.value)}</div>
                </div>
              ))}
            </div>

            {showPiggyForm && <Modal onClose={()=>setShowPiggyForm(false)} title="Depositar no Cofrinho 🐷">
              <PiggyForm onSave={addPiggyDeposit} onClose={()=>setShowPiggyForm(false)}/>
            </Modal>}
          </div>
        )}

        {/* HISTORY */}
        {activeTab==="history" && (
          <div style={S.section}>
            <div style={S.card}>
              <div style={S.cardTitle}>Evolução de Gastos — 12 Meses</div>
              <div style={{display:"flex",gap:16,fontSize:12,color:"#64748b",marginBottom:16,alignItems:"center"}}>
                <span style={{display:"inline-block",width:10,height:10,borderRadius:3,background:"#f59e0b",marginRight:4}}/> Despesas
                <span style={{display:"inline-block",width:10,height:10,borderRadius:3,background:"#10b981",marginRight:4}}/> Receita
              </div>
              <div style={{display:"flex",gap:6,alignItems:"flex-end",height:160,borderBottom:"1px solid #f1f5f9"}}>
                {history.map((h,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                    <div style={{flex:1,width:"100%",display:"flex",gap:2,alignItems:"flex-end"}}>
                      <div style={{flex:1,minHeight:2,borderRadius:"3px 3px 0 0",height:`${pct(h.rev,maxHistory)}%`,background:"#10b981",opacity:0.7}}/>
                      <div style={{flex:1,minHeight:2,borderRadius:"3px 3px 0 0",height:`${pct(h.total,maxHistory)}%`,background:"#f59e0b"}}/>
                    </div>
                    <div style={{fontSize:10,fontWeight:h.month===selMonth&&h.year===selYear?700:400,color:h.month===selMonth&&h.year===selYear?"#6366f1":"#94a3b8"}}>{h.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Detalhe por Mês</div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>{["Mês","Receita","Despesas","Saldo","Var.%"].map(h=><th key={h} style={{fontSize:11,color:"#94a3b8",fontWeight:600,textAlign:"left",padding:"6px 8px",borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {history.map((h,i)=>{
                    const prev=history[i-1];
                    const varPct=prev&&prev.total>0?Math.round(((h.total-prev.total)/prev.total)*100):null;
                    const bal=h.rev-h.total;
                    return (
                      <tr key={i} style={{background:h.month===selMonth&&h.year===selYear?"rgba(99,102,241,0.08)":"transparent"}}>
                        <td style={{fontSize:12,padding:"8px 8px",borderBottom:"1px solid #f8fafc",color:"#475569"}}>{h.label}/{h.year}</td>
                        <td style={{fontSize:12,padding:"8px 8px",color:"#10b981"}}>{fmt(h.rev)}</td>
                        <td style={{fontSize:12,padding:"8px 8px",color:"#f59e0b"}}>{fmt(h.total)}</td>
                        <td style={{fontSize:12,padding:"8px 8px",color:bal>=0?"#10b981":"#ef4444"}}>{fmt(bal)}</td>
                        <td style={{fontSize:12,padding:"8px 8px"}}>{varPct!==null?<span style={{color:varPct>15?"#ef4444":varPct>0?"#f59e0b":"#10b981",fontWeight:600}}>{varPct>0?"+":""}{varPct}%</span>:"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────
function KpiCard({label,value,icon,color,sub}) {
  return (
    <div style={{...S.kpiCard,borderTop:`3px solid ${color}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon d={icons[icon]} size={18} stroke={color}/>
        </div>
        <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
      </div>
      <div style={{fontSize:20,fontWeight:800,letterSpacing:-0.5,color,marginBottom:4}}>{value}</div>
      {sub && <div style={{fontSize:11,color:"#94a3b8"}}>{sub}</div>}
    </div>
  );
}

function ProgressRow({label,value,total,color}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,width:140,flexShrink:0,color:"#64748b"}}>
        <span>{label}</span><span style={{color}}>{fmt(value)}</span>
      </div>
      <div style={{flex:1,height:6,background:"#f1f5f9",borderRadius:99}}>
        <div style={{width:`${Math.min(100,pct(value,total))}%`,height:"100%",borderRadius:99,background:color,transition:"width .5s ease"}}/>
      </div>
      <span style={{fontSize:11,color:"#94a3b8",width:32,textAlign:"right"}}>{pct(value,total)}%</span>
    </div>
  );
}

function GroupSection({group,items,total,onToggle,onEdit,onDelete}) {
  const [open,setOpen]=useState(true);
  return (
    <div style={S.groupCard}>
      <div style={S.groupHeader} onClick={()=>setOpen(o=>!o)}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:group.color}}/>
          <span style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{group.name}</span>
          <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,background:group.color+"22",color:group.color}}>{items.length}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{fmt(total)}</span>
          <Icon d={open?icons.chevron_down:icons.chevron_right} size={14} stroke="#94a3b8"/>
        </div>
      </div>
      {open && <div>{items.map(item=><ExpenseRow key={item.id} item={item} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}/>)}</div>}
    </div>
  );
}

function ExpenseRow({item,onToggle,onEdit,onDelete}) {
  const isOverdue=!item.paid&&item.dueDay<TODAY.getDate()&&item.month===CURRENT_MONTH&&item.year===CURRENT_YEAR;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #f8fafc",opacity:item.paid?0.65:1}}>
      <button style={{width:22,height:22,borderRadius:6,border:`2px solid ${item.paid?"#10b981":"#cbd5e1"}`,background:item.paid?"#10b981":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
        onClick={()=>onToggle(item.id)}>
        {item.paid&&<Icon d={icons.check} size={11} stroke="#fff" strokeWidth={2.5}/>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:13,fontWeight:600,color:"#1e293b",textDecoration:item.paid?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.description}</span>
          {item.recurring&&<span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,color:"#6366f1",background:"#ede9fe",padding:"2px 6px",borderRadius:99}}><Icon d={icons.repeat} size={10}/>recorrente</span>}
          {isOverdue&&<span style={{fontSize:10,color:"#ef4444",background:"#fef2f2",padding:"2px 6px",borderRadius:99,fontWeight:700}}>vencido</span>}
        </div>
        <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{item.creditor} · Vence dia {item.dueDay}</div>
      </div>
      <div style={{fontWeight:700,fontSize:14,flexShrink:0,color:item.paid?"#10b981":isOverdue?"#ef4444":"#1e293b"}}>{fmt(item.value)}</div>
      <div style={{display:"flex",gap:4,flexShrink:0}}>
        <button style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:6}} onClick={()=>onEdit(item)}><Icon d={icons.edit} size={13} stroke="#6366f1"/></button>
        <button style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:6}} onClick={()=>onDelete(item.id)}><Icon d={icons.trash} size={13} stroke="#ef4444"/></button>
      </div>
    </div>
  );
}

function Modal({onClose,title,children}) {
  return (
    <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={S.modal}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>{title}</span>
          <button style={{background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",padding:6,display:"flex",alignItems:"center"}} onClick={onClose}><Icon d={icons.x} size={16}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ExpenseForm({groups,item,selMonth,selYear,onSave,onClose}) {
  const [desc,setDesc]=useState(item?.description||"");
  const [creditor,setCreditor]=useState(item?.creditor||"");
  const [value,setValue]=useState(item?.value||"");
  const [dueDay,setDueDay]=useState(item?.dueDay||TODAY.getDate());
  const [groupId,setGroupId]=useState(item?.groupId||groups[0]?.id||"");
  const [recurring,setRecurring]=useState(item?.recurring||false);
  const [paid,setPaid]=useState(item?.paid||false);

  return (
    <div style={S.form}>
      <label style={S.label}>Grupo</label>
      <select style={S.input} value={groupId} onChange={e=>setGroupId(e.target.value)}>
        {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <label style={S.label}>Descrição *</label>
      <input style={S.input} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="ex: Conta de energia"/>
      <label style={S.label}>Credor</label>
      <input style={S.input} value={creditor} onChange={e=>setCreditor(e.target.value)} placeholder="ex: CEMIG"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <label style={S.label}>Valor (R$) *</label>
          <input style={S.input} type="number" value={value} onChange={e=>setValue(e.target.value)} placeholder="0,00"/>
        </div>
        <div>
          <label style={S.label}>Dia Vencimento</label>
          <input style={S.input} type="number" min={1} max={31} value={dueDay} onChange={e=>setDueDay(e.target.value)}/>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#475569",cursor:"pointer"}}>
          <input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}/>
          <Icon d={icons.repeat} size={14} stroke="#6366f1"/> Lançar como recorrente (12 meses)
        </label>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#475569",cursor:"pointer"}}>
          <input type="checkbox" checked={paid} onChange={e=>setPaid(e.target.checked)}/>
          <Icon d={icons.check} size={14} stroke="#10b981"/> Já está pago
        </label>
      </div>
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>desc&&value&&onSave({...(item||{}),description:desc,creditor,value:parseFloat(value),dueDay:parseInt(dueDay),groupId,recurring,paid,month:item?.month??selMonth,year:item?.year??selYear})}>Salvar</button>
      </div>
    </div>
  );
}

function GroupForm({onSave,onClose}) {
  const [name,setName]=useState("");
  const [color,setColor]=useState("#6366f1");
  const [icon,setIcon]=useState("tag");
  const ICONS=["home","car","heart","bolt","wallet","tag","piggy","chart"];
  return (
    <div style={S.form}>
      <label style={S.label}>Nome *</label>
      <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Alimentação"/>
      <label style={S.label}>Cor</label>
      <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{...S.input,padding:4,height:44,cursor:"pointer"}}/>
      <label style={S.label}>Ícone</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {ICONS.map(ic=>(
          <button key={ic} onClick={()=>setIcon(ic)} style={{width:44,height:44,borderRadius:10,border:`2px solid ${icon===ic?color:"transparent"}`,background:icon===ic?color+"33":"#f1f5f9",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon d={icons[ic]} size={18} stroke={icon===ic?color:"#64748b"}/>
          </button>
        ))}
      </div>
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>name&&onSave(name,icon,color)}>Criar Grupo</button>
      </div>
    </div>
  );
}

function RevenueForm({revenues,onSave,onClose}) {
  const [desc,setDesc]=useState(revenues[0]?.description||"Salário");
  const [value,setValue]=useState(revenues[0]?.value||"");
  return (
    <div style={S.form}>
      <label style={S.label}>Descrição</label>
      <input style={S.input} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="ex: Salário"/>
      <label style={S.label}>Valor (R$)</label>
      <input style={S.input} type="number" value={value} onChange={e=>setValue(e.target.value)} placeholder="0,00"/>
      {revenues.map((r,i)=><div key={i} style={{fontSize:12,color:"#64748b"}}>Lançado: {r.description} — {fmt(r.value)}</div>)}
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>value&&onSave(desc,parseFloat(value))}>Salvar</button>
      </div>
    </div>
  );
}

function PiggyForm({onSave,onClose}) {
  const [value,setValue]=useState("");
  const [note,setNote]=useState("Reserva mensal");
  return (
    <div style={S.form}>
      <label style={S.label}>Valor (R$)</label>
      <input style={S.input} type="number" value={value} onChange={e=>setValue(e.target.value)} placeholder="0,00"/>
      <label style={S.label}>Observação</label>
      <input style={S.input} value={note} onChange={e=>setNote(e.target.value)}/>
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>value&&onSave(parseFloat(value),note)}>Depositar 🐷</button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app:{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#f8fafc",minHeight:"100vh",color:"#1e293b"},
  header:{background:"linear-gradient(135deg,#1e293b 0%,#0f172a 100%)",padding:"0 16px"},
  headerInner:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0"},
  logo:{display:"flex",alignItems:"center",gap:12},
  logoIcon:{fontSize:28,background:"linear-gradient(135deg,#6366f1,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},
  logoTitle:{color:"#fff",fontWeight:700,fontSize:18,letterSpacing:-0.5},
  logoSub:{color:"#64748b",fontSize:11},
  monthNav:{display:"flex",alignItems:"center",gap:12},
  navBtn:{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"},
  monthLabel:{color:"#fff",fontWeight:600,fontSize:14,minWidth:140,textAlign:"center"},
  nav:{background:"#fff",borderBottom:"1px solid #e2e8f0",display:"flex",padding:"0 16px",gap:4},
  tab:{display:"flex",alignItems:"center",gap:6,padding:"12px 16px",border:"none",background:"transparent",cursor:"pointer",color:"#64748b",fontSize:13,fontWeight:500,borderBottom:"2px solid transparent"},
  tabActive:{color:"#6366f1",borderBottomColor:"#6366f1",fontWeight:700},
  main:{padding:16,maxWidth:900,margin:"0 auto"},
  section:{display:"flex",flexDirection:"column",gap:16},
  kpiGrid:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12},
  kpiCard:{background:"#fff",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.06)"},
  card:{background:"#fff",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.06)"},
  cardTitle:{fontWeight:700,fontSize:14,marginBottom:14,color:"#1e293b"},
  divider:{height:1,background:"#f1f5f9",margin:"10px 0"},
  progressSummary:{display:"flex",justifyContent:"space-between",fontSize:13,color:"#64748b"},
  alertRow:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f1f5f9"},
  alertContent:{flex:1},
  alertDesc:{fontSize:13,fontWeight:600,color:"#1e293b"},
  alertValues:{fontSize:12,color:"#64748b"},
  alertBadge:{background:"#fef9c3",color:"#b45309",fontWeight:700,fontSize:11,padding:"3px 8px",borderRadius:99},
  groupSummaryRow:{display:"flex",alignItems:"center",gap:8,marginBottom:8},
  dot:{width:8,height:8,borderRadius:"50%",flexShrink:0},
  groupSummaryName:{fontSize:13,color:"#475569",width:120,flexShrink:0},
  groupBarWrap:{flex:1,height:6,background:"#f1f5f9",borderRadius:99},
  groupBar:{height:"100%",borderRadius:99,minWidth:2,transition:"width .5s ease"},
  groupSummaryValue:{fontSize:13,fontWeight:600,color:"#1e293b",width:90,textAlign:"right"},
  empty:{fontSize:13,color:"#94a3b8",textAlign:"center",padding:"16px 0"},
  rowBetween:{display:"flex",gap:10},
  btnPrimary:{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,flex:1},
  btnSecondary:{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,flex:1},
  linkBtn:{background:"none",border:"none",color:"#6366f1",cursor:"pointer",fontSize:11,padding:0},
  groupCard:{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.06)"},
  groupHeader:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",cursor:"pointer",background:"#fafafa",borderBottom:"1px solid #f1f5f9"},
  emptyState:{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"48px 16px",background:"#fff",borderRadius:14},
  overlay:{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,backdropFilter:"blur(2px)"},
  modal:{background:"#fff",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"},
  form:{display:"flex",flexDirection:"column",gap:10},
  label:{fontSize:12,fontWeight:600,color:"#475569",marginBottom:2},
  input:{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,color:"#1e293b",background:"#f8fafc",boxSizing:"border-box",outline:"none"},
  formActions:{display:"flex",gap:10,marginTop:10},
  piggyHero:{background:"linear-gradient(135deg,#1e293b,#0f172a)",borderRadius:20,padding:28,display:"flex",flexDirection:"column",alignItems:"center",gap:6,color:"#fff"},
  piggyBalance:{fontSize:36,fontWeight:800,letterSpacing:-1},
  piggyLabel:{color:"#94a3b8",fontSize:13},
  piggyProgressWrap:{width:"100%",height:8,background:"rgba(255,255,255,.1)",borderRadius:99,overflow:"hidden",marginTop:8},
  piggyProgress:{height:"100%",background:"linear-gradient(90deg,#6366f1,#ec4899)",borderRadius:99,transition:"width .8s ease"},
  savingBlock:{display:"flex",gap:16,alignItems:"center",marginBottom:14},
  savingPercent:{fontSize:48,fontWeight:900,color:"#6366f1",letterSpacing:-2,lineHeight:1},
  range:{width:"100%",accentColor:"#6366f1"},
  depositRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f1f5f9"},
  depositNote:{fontSize:13,fontWeight:600,color:"#1e293b"},
  depositDate:{fontSize:11,color:"#94a3b8"},
  depositValue:{fontWeight:700,color:"#10b981",fontSize:14},
  toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:600,fontSize:13,zIndex:200,boxShadow:"0 4px 20px rgba(0,0,0,.2)"},
};

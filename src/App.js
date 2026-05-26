import { useState, useMemo, useEffect } from "react";
import { db } from "./firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth();
const provider = new GoogleAuthProvider();

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const ic = {
  plus: "M12 5v14M5 12h14", check: "M20 6L9 17l-5-5", trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  car: "M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h14l4 4v4a2 2 0 01-2 2h-2M5 17a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0z",
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  chart: "M18 20V10M12 20V4M6 20v-6", warning: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  x: "M18 6L6 18M6 6l12 12", chevron_right: "M9 18l6-6-6-6", chevron_down: "M6 9l6 6 6-6",
  repeat: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  target: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  wallet: "M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M3 5a2 2 0 000 4M21 16a1 1 0 110 2 1 1 0 010-2z",
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  coin: "M12 2a10 10 0 100 20A10 10 0 0012 2zM12 8v8M8 12h8",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  piggy: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7 7-7z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  credit: "M1 4h22v4H1zM1 10h22v10a2 2 0 01-2 2H3a2 2 0 01-2-2V10zM6 16h4",
  plane: "M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z",
  info: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 8h.01M12 12v4",
};

const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const fmt = (v) => (v||0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const pct = (part, total) => total===0 ? 0 : Math.min(100, Math.round((part/total)*100));
const TODAY = new Date();
const CURRENT_MONTH = TODAY.getMonth();
const CURRENT_YEAR = TODAY.getFullYear();

const DEFAULT_GROUPS = [
  { id:"g1", name:"Moradia", icon:"home", color:"#6366f1" },
  { id:"g2", name:"Transporte", icon:"car", color:"#f59e0b" },
  { id:"g3", name:"Saúde", icon:"heart", color:"#ec4899" },
  { id:"g4", name:"Energia & Utilities", icon:"bolt", color:"#10b981" },
];
const DEFAULT_REV_GROUPS = [
  { id:"rg1", name:"Salário", icon:"wallet", color:"#10b981" },
  { id:"rg2", name:"Freelance", icon:"star", color:"#6366f1" },
  { id:"rg3", name:"Outros", icon:"coin", color:"#f59e0b" },
];

// ─── SPLASH ───────────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={sp.wrap}>
      <div style={sp.content}>
        <div style={sp.logoWrap}>
          <div style={sp.logoCircle}><span style={{fontSize:42}}>🏠</span></div>
          <div style={sp.rings}>
            {[0,0.4,0.8].map((d,i)=><div key={i} style={{...sp.ring,animationDelay:`${d}s`}}/>)}
          </div>
        </div>
        <div style={sp.title}>CasaFinance</div>
        <div style={sp.subtitle}>Gestão Doméstica Inteligente</div>
        <div style={sp.dots}>{[0,0.2,0.4].map((d,i)=><div key={i} style={{...sp.dot,animationDelay:`${d}s`}}/>)}</div>
      </div>
      <style>{`
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.5);opacity:0}}
        @keyframes dot-bounce{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}
        @keyframes fade-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes logo-pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  );
}
const sp = {
  wrap:{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)"},
  content:{display:"flex",flexDirection:"column",alignItems:"center",gap:16,position:"relative",zIndex:1},
  logoWrap:{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:120,height:120},
  logoCircle:{width:90,height:90,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",animation:"logo-pop 0.6s ease forwards",boxShadow:"0 0 40px rgba(99,102,241,0.5)"},
  rings:{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"},
  ring:{position:"absolute",width:90,height:90,borderRadius:"50%",border:"2px solid rgba(99,102,241,0.6)",animation:"pulse-ring 2s ease-out infinite"},
  title:{fontSize:32,fontWeight:800,color:"#fff",letterSpacing:-1,animation:"fade-up 0.6s ease 0.4s both"},
  subtitle:{fontSize:14,color:"#94a3b8",animation:"fade-up 0.6s ease 0.6s both"},
  dots:{display:"flex",gap:8,marginTop:24,animation:"fade-up 0.6s ease 0.8s both"},
  dot:{width:8,height:8,borderRadius:"50%",background:"#6366f1",animation:"dot-bounce 1.2s ease infinite"},
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [loading,setLoading]=useState(false);
  const handleLogin=async()=>{setLoading(true);try{await signInWithPopup(auth,provider);}catch(e){setLoading(false);}};
  return (
    <div style={ls.wrap}>
      <div style={ls.card}>
        <div style={ls.logoCircle}><span style={{fontSize:36}}>🏠</span></div>
        <div style={ls.title}>CasaFinance</div>
        <div style={ls.sub}>Gestão Doméstica Inteligente</div>
        <div style={ls.divider}/>
        <div style={ls.welcome}>Bem-vindo de volta!</div>
        <div style={ls.desc}>Faça login para acessar suas finanças com segurança.</div>
        <button style={{...ls.btn,opacity:loading?0.7:1}} onClick={handleLogin} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {loading?"Entrando...":"Entrar com Google"}
        </button>
        <div style={ls.footer}>🔒 Seus dados são privados e protegidos</div>
      </div>
      <style>{`@keyframes fade-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
const ls={
  wrap:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#0f172a,#1e293b)",fontFamily:"'DM Sans',sans-serif",padding:16},
  card:{background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:24,padding:40,maxWidth:380,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:12,position:"relative",zIndex:1,animation:"fade-up 0.6s ease"},
  logoCircle:{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px rgba(99,102,241,0.4)",marginBottom:8},
  title:{fontSize:28,fontWeight:800,color:"#fff",letterSpacing:-0.5},
  sub:{fontSize:13,color:"#64748b"},
  divider:{width:"100%",height:1,background:"rgba(255,255,255,0.08)",margin:"8px 0"},
  welcome:{fontSize:18,fontWeight:700,color:"#fff",marginTop:4},
  desc:{fontSize:13,color:"#94a3b8",textAlign:"center"},
  btn:{display:"flex",alignItems:"center",gap:12,background:"#fff",color:"#1e293b",border:"none",borderRadius:12,padding:"14px 24px",fontSize:15,fontWeight:600,cursor:"pointer",width:"100%",justifyContent:"center",marginTop:8,boxShadow:"0 4px 20px rgba(0,0,0,0.3)"},
  footer:{fontSize:11,color:"#475569",marginTop:8},
};

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function App() {
  const [splash,setSplash]=useState(true);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  useEffect(()=>{const u=onAuthStateChanged(auth,u=>{setUser(u);setAuthLoading(false)});return u;},[]);
  if(splash) return <SplashScreen onDone={()=>setSplash(false)}/>;
  if(authLoading) return <Loading/>;
  if(!user) return <LoginScreen/>;
  return <Dashboard user={user}/>;
}

function Loading(){return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:16,fontFamily:"DM Sans,sans-serif",background:"#f8fafc"}}><div style={{fontSize:48}}>🏠</div><div style={{fontWeight:700,fontSize:20,color:"#1e293b"}}>CasaFinance</div><div style={{color:"#94a3b8",fontSize:14}}>Carregando...</div></div>);}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({user}){
  const uid=user.uid;
  const base=`users/${uid}`;
  const [activeTab,setActiveTab]=useState("dashboard");
  const [selMonth,setSelMonth]=useState(CURRENT_MONTH);
  const [selYear,setSelYear]=useState(CURRENT_YEAR);
  const [expenses,setExpenses]=useState([]);
  const [groups,setGroups]=useState(DEFAULT_GROUPS);
  const [revenues,setRevenues]=useState([]);
  const [revGroups,setRevGroups]=useState(DEFAULT_REV_GROUPS);
  const [goals,setGoals]=useState([]);
  const [cards,setCards]=useState([]);
  const [miles,setMiles]=useState([]);
  const [savingGoal,setSavingGoal]=useState(20);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [showGroupForm,setShowGroupForm]=useState(false);
  const [showRevForm,setShowRevForm]=useState(false);
  const [showRevGroupForm,setShowRevGroupForm]=useState(false);
  const [showGoalForm,setShowGoalForm]=useState(false);
  const [editGoal,setEditGoal]=useState(null);
  const [showCardForm,setShowCardForm]=useState(false);
  const [editCard,setEditCard]=useState(null);
  const [showMilesForm,setShowMilesForm]=useState(false);
  const [editMiles,setEditMiles]=useState(null);
  const [histFilter,setHistFilter]=useState("all");
  const [toast,setToast]=useState(null);
  const [lightboxGroup,setLightboxGroup]=useState(null);
  const [editGroupItem,setEditGroupItem]=useState(null);

  const notify=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  useEffect(()=>{
    const unsubs=[
      onSnapshot(collection(db,`${base}/expenses`),snap=>{setExpenses(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false);}),
      onSnapshot(collection(db,`${base}/revenues`),snap=>setRevenues(snap.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,`${base}/groups`),snap=>{const g=snap.docs.map(d=>({id:d.id,...d.data()}));if(g.length>0)setGroups(g);}),
      onSnapshot(collection(db,`${base}/revGroups`),snap=>{const g=snap.docs.map(d=>({id:d.id,...d.data()}));if(g.length>0)setRevGroups(g);}),
      onSnapshot(collection(db,`${base}/goals`),snap=>setGoals(snap.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,`${base}/cards`),snap=>setCards(snap.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(collection(db,`${base}/miles`),snap=>setMiles(snap.docs.map(d=>({id:d.id,...d.data()})))),
      onSnapshot(doc(db,`${base}/settings/prefs`),snap=>{if(snap.exists()&&snap.data().savingGoal)setSavingGoal(snap.data().savingGoal);}),
    ];
    return()=>unsubs.forEach(u=>u());
  },[uid]);

  // ── Computed ──
  const monthExpenses=useMemo(()=>expenses.filter(e=>e.month===selMonth&&e.year===selYear),[expenses,selMonth,selYear]);
  const monthRevenues=useMemo(()=>revenues.filter(r=>r.month===selMonth&&r.year===selYear),[revenues,selMonth,selYear]);
  const totalExpenses=useMemo(()=>monthExpenses.reduce((s,e)=>s+(e.value||0),0),[monthExpenses]);
  const totalRevenue=useMemo(()=>monthRevenues.reduce((s,r)=>s+(r.value||0),0),[monthRevenues]);
  const paidExpenses=useMemo(()=>monthExpenses.filter(e=>e.paid).reduce((s,e)=>s+(e.value||0),0),[monthExpenses]);
  const balance=totalRevenue-totalExpenses;
  const savingTarget=totalRevenue*(savingGoal/100);

  const history=useMemo(()=>{
    const arr=[];
    for(let i=11;i>=0;i--){
      let m=CURRENT_MONTH-i;let y=CURRENT_YEAR;
      if(m<0){m+=12;y-=1;}
      const total=expenses.filter(e=>e.month===m&&e.year===y).reduce((s,e)=>s+(e.value||0),0);
      const rev=revenues.filter(r=>r.month===m&&r.year===y).reduce((s,r)=>s+(r.value||0),0);
      arr.push({month:m,year:y,total,rev,label:MONTHS[m]});
    }
    return arr;
  },[expenses,revenues]);

  const alerts=useMemo(()=>{
    const warns=[];
    const prevMonth=selMonth===0?11:selMonth-1;
    const prevYear=selMonth===0?selYear-1:selYear;
    monthExpenses.forEach(curr=>{
      const prev=expenses.find(e=>e.description===curr.description&&e.groupId===curr.groupId&&e.month===prevMonth&&e.year===prevYear);
      if(prev&&curr.value>prev.value*1.15)warns.push({desc:curr.description,curr:curr.value,prev:prev.value,pct:Math.round(((curr.value-prev.value)/prev.value)*100)});
    });
    return warns;
  },[monthExpenses,expenses,selMonth,selYear]);

  const byGroup=useMemo(()=>
    groups.map(g=>({...g,items:monthExpenses.filter(e=>e.groupId===g.id),total:monthExpenses.filter(e=>e.groupId===g.id).reduce((s,e)=>s+(e.value||0),0)})).filter(g=>g.items.length>0),
    [groups,monthExpenses]
  );

  const pieData=useMemo(()=>{
    const total=byGroup.reduce((s,g)=>s+g.total,0);
    let cum=0;
    return byGroup.map(g=>{
      const slice=total>0?(g.total/total)*360:0;
      const start=cum;cum+=slice;
      return{...g,slice,start,pct:pct(g.total,total)};
    });
  },[byGroup]);

  const filteredHistory=useMemo(()=>{
    if(histFilter==="all"||histFilter==="revenue") return history;
    const gId=histFilter;
    return history.map(h=>({...h,total:expenses.filter(e=>e.month===h.month&&e.year===h.year&&e.groupId===gId).reduce((s,e)=>s+(e.value||0),0)}));
  },[history,histFilter,expenses]);

  // ── Actions ──
  const togglePaid=async(id)=>{const item=expenses.find(e=>e.id===id);await setDoc(doc(db,`${base}/expenses`,id),{...item,paid:!item.paid});};
  const deleteExpense=async(id)=>{await deleteDoc(doc(db,`${base}/expenses`,id));notify("Despesa removida");};
  const saveExpense=async(data)=>{
    const months=data.recurring?parseInt(data.recurMonths||12):1;
    if(data.id){await setDoc(doc(db,`${base}/expenses`,data.id),data);notify("Despesa atualizada!");}
    else{
      for(let i=0;i<months;i++){
        let m=data.month+i;let y=data.year;
        if(m>11){m-=12;y+=1;}
        const id=`exp_${Date.now()}_${i}`;
        await setDoc(doc(db,`${base}/expenses`,id),{...data,id,month:m,year:y});
      }
      notify(months>1?`Lançado para ${months} meses!`:"Despesa adicionada!");
    }
    setShowForm(false);setEditItem(null);setEditGroupItem(null);
  };
  const addGroup=async(name,icon,color)=>{
    // Save all current groups + new one to avoid losing defaults
    const existingIds=groups.map(g=>g.id);
    for(const g of groups){
      if(!existingIds.includes(g.id)||true){
        await setDoc(doc(db,`${base}/groups`,g.id),g);
      }
    }
    const id=`g_${Date.now()}`;
    await setDoc(doc(db,`${base}/groups`,id),{id,name,icon,color});
    setShowGroupForm(false);notify("Grupo criado!");
  };
  const deleteGroup=async(id)=>{await deleteDoc(doc(db,`${base}/groups`,id));notify("Grupo removido");};
  const saveRevenue=async(data)=>{
    const months=data.recurring?parseInt(data.recurMonths||12):1;
    if(data.id){await setDoc(doc(db,`${base}/revenues`,data.id),data);notify("Receita atualizada!");}
    else{
      for(let i=0;i<months;i++){
        let m=data.month+i;let y=data.year;
        if(m>11){m-=12;y+=1;}
        const id=`rev_${Date.now()}_${i}`;
        await setDoc(doc(db,`${base}/revenues`,id),{...data,id,month:m,year:y});
      }
      notify(months>1?`Receita lançada para ${months} meses!`:"Receita adicionada!");
    }
    setShowRevForm(false);setEditItem(null);
  };
  const deleteRevenue=async(id)=>{await deleteDoc(doc(db,`${base}/revenues`,id));notify("Receita removida");};
  const addRevGroup=async(name,icon,color)=>{
    for(const g of revGroups){await setDoc(doc(db,`${base}/revGroups`,g.id),g);}
    const id=`rg_${Date.now()}`;
    await setDoc(doc(db,`${base}/revGroups`,id),{id,name,icon,color});
    setShowRevGroupForm(false);notify("Categoria criada!");
  };
  const saveGoal=async(data)=>{const id=data.id||`goal_${Date.now()}`;await setDoc(doc(db,`${base}/goals`,id),{...data,id});setShowGoalForm(false);setEditGoal(null);notify(data.id?"Meta atualizada!":"Meta criada! 🎯");};
  const depositGoal=async(goal,value,note)=>{const updated={...goal,saved:(goal.saved||0)+value,deposits:[...(goal.deposits||[]),{date:new Date().toISOString().slice(0,10),value,note}]};await setDoc(doc(db,`${base}/goals`,goal.id),updated);notify("Depósito realizado! 💰");};
  const deleteGoal=async(id)=>{await deleteDoc(doc(db,`${base}/goals`,id));notify("Meta removida");};
  const saveCard=async(data)=>{const id=data.id||`card_${Date.now()}`;await setDoc(doc(db,`${base}/cards`,id),{...data,id});setShowCardForm(false);setEditCard(null);notify(data.id?"Cartão atualizado!":"Cartão adicionado!");};
  const deleteCard=async(id)=>{await deleteDoc(doc(db,`${base}/cards`,id));notify("Cartão removido");};
  const saveMiles=async(data)=>{const id=data.id||`miles_${Date.now()}`;await setDoc(doc(db,`${base}/miles`,id),{...data,id});setShowMilesForm(false);setEditMiles(null);notify(data.id?"Milhas atualizadas!":"Programa adicionado!");};
  const deleteMiles=async(id)=>{await deleteDoc(doc(db,`${base}/miles`,id));notify("Programa removido");};
  const saveSavingGoal=async(val)=>{setSavingGoal(val);await setDoc(doc(db,`${base}/settings/prefs`),{savingGoal:val});};

  const maxHistory=Math.max(...filteredHistory.map(h=>Math.max(h.total,h.rev)),1);
  const greet=()=>{const h=TODAY.getHours();return h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";};

  // Lightbox group items
  const lightboxItems=lightboxGroup?monthExpenses.filter(e=>e.groupId===lightboxGroup.id):[];

  if(loading) return <Loading/>;

  return(
    <div style={S.app}>
      <style>{`
        *{box-sizing:border-box;}
        @keyframes slide-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toast-in{from{opacity:0;transform:translate(-50%,-20px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes fade-in{from{opacity:0}to{opacity:1}}
        input[type=range]{-webkit-appearance:none;height:6px;border-radius:99px;background:#e2e8f0;outline:none;width:100%}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#6366f1;cursor:pointer;box-shadow:0 2px 6px rgba(99,102,241,0.4)}
        select{appearance:none;}
      `}</style>

      {toast&&<div style={{...S.toast,background:toast.type==="success"?"#10b981":"#ef4444"}}>{toast.msg}</div>}

      {/* Lightbox */}
      {lightboxGroup&&(
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setLightboxGroup(null)}>
          <div style={{...S.modal,maxHeight:"85vh"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:12,height:12,borderRadius:"50%",background:lightboxGroup.color}}/>
                <span style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>{lightboxGroup.name}</span>
                <span style={{fontSize:13,color:"#94a3b8"}}>· {fmt(lightboxGroup.total)}</span>
              </div>
              <button style={{background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",padding:6,display:"flex"}} onClick={()=>setLightboxGroup(null)}><Icon d={ic.x} size={16}/></button>
            </div>
            <div style={{overflowY:"auto",maxHeight:"60vh"}}>
              {lightboxItems.map(item=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid #f1f5f9"}}>
                  <button style={{width:24,height:24,borderRadius:6,border:`2px solid ${item.paid?"#10b981":"#cbd5e1"}`,background:item.paid?"#10b981":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={()=>togglePaid(item.id)}>
                    {item.paid&&<Icon d={ic.check} size={12} stroke="#fff" strokeWidth={2.5}/>}
                  </button>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#1e293b",textDecoration:item.paid?"line-through":"none"}}>{item.description}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{item.creditor}{item.dueDate?` · Vence ${item.dueDate}`:item.dueDay?` · Vence dia ${item.dueDay}`:""}</div>
                    {item.refMonth!==undefined&&<div style={{fontSize:10,color:"#6366f1"}}>Ref: {MONTHS_FULL[item.refMonth]}/{item.refYear||selYear}</div>}
                  </div>
                  <div style={{fontWeight:700,fontSize:14,color:item.paid?"#10b981":"#1e293b"}}>{fmt(item.value)}</div>
                  <div style={{display:"flex",gap:4}}>
                    <button style={S.iconBtn} onClick={()=>{setEditGroupItem(item);setEditItem(item);setShowForm(true);}}><Icon d={ic.edit} size={13} stroke="#6366f1"/></button>
                    <button style={S.iconBtn} onClick={()=>deleteExpense(item.id)}><Icon d={ic.trash} size={13} stroke="#ef4444"/></button>
                  </div>
                </div>
              ))}
              {lightboxItems.length===0&&<div style={S.empty}>Nenhuma despesa neste grupo</div>}
            </div>
            <button style={{...S.btnPrimary,justifyContent:"center",marginTop:16}} onClick={()=>{setEditGroupItem(null);setEditItem(null);setShowForm(true);}}>
              <Icon d={ic.plus} size={14}/> Nova Despesa em {lightboxGroup.name}
            </button>
          </div>
        </div>
      )}

      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <div style={S.logoCircle}><span style={{fontSize:18}}>🏠</span></div>
            <div>
              <div style={S.logoTitle}>CasaFinance</div>
              <div style={S.logoSub}>{greet()}, {user.displayName?.split(" ")[0]}!</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={S.monthNav}>
              <button style={S.navBtn} onClick={()=>{if(selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}else setSelMonth(m=>m-1);}}>‹</button>
              <span style={S.monthLabel}>{MONTHS[selMonth]}/{selYear}</span>
              <button style={S.navBtn} onClick={()=>{if(selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}else setSelMonth(m=>m+1);}}>›</button>
            </div>
            <button style={S.logoutBtn} onClick={()=>signOut(auth)} title="Sair"><Icon d={ic.logout} size={16} stroke="#94a3b8"/></button>
          </div>
        </div>
      </header>

      <nav style={S.nav}>
        {[{id:"dashboard",label:"Painel",icon:"grid"},{id:"expenses",label:"Despesas",icon:"tag"},{id:"revenues",label:"Receitas",icon:"wallet"},{id:"goals",label:"Metas",icon:"target"},{id:"cards",label:"Cartões",icon:"credit"},{id:"history",label:"Histórico",icon:"chart"}].map(t=>(
          <button key={t.id} style={{...S.tab,...(activeTab===t.id?S.tabActive:{})}} onClick={()=>setActiveTab(t.id)}>
            <Icon d={ic[t.icon]} size={13}/>{t.label}
          </button>
        ))}
      </nav>

      <main style={S.main}>

        {/* ── DASHBOARD ── */}
        {activeTab==="dashboard"&&(
          <div style={S.section}>
            <div style={S.kpiGrid}>
              <KpiCard label="Receita" value={fmt(totalRevenue)} icon="wallet" color="#10b981" sub={`${monthRevenues.length} lançamento(s)`}/>
              <KpiCard label="Despesas" value={fmt(totalExpenses)} icon="tag" color="#f59e0b" sub={`${pct(totalExpenses,totalRevenue)}% da receita`}/>
              <KpiCard label="Saldo" value={fmt(balance)} icon="chart" color={balance>=0?"#6366f1":"#ef4444"} sub={balance>=0?"✓ No azul":"⚠ No vermelho"}/>
              <KpiCard label="Meta Economia" value={fmt(savingTarget)} icon="target" color="#ec4899" sub={`${savingGoal}% · ${balance>=savingTarget?"✓ Atingida!":"Faltam "+fmt(savingTarget-balance)}`}/>
            </div>

            {/* Cards summary no dashboard */}
            {cards.length>0&&(
              <div style={S.card}>
                <div style={S.cardTitle}><Icon d={ic.credit} size={14} stroke="#6366f1"/> Limites Disponíveis</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {cards.map(c=>{
                    const used=c.used||0;const avail=(c.limit||0)-used;
                    return(
                      <div key={c.id} style={{flex:1,minWidth:130,background:"linear-gradient(135deg,"+c.color+","+c.color+"aa)",borderRadius:12,padding:12,color:"#fff"}}>
                        <div style={{fontSize:11,opacity:.8,marginBottom:4}}>{c.name}</div>
                        <div style={{fontSize:18,fontWeight:800}}>{fmt(avail)}</div>
                        <div style={{fontSize:10,opacity:.7}}>disponível de {fmt(c.limit)}</div>
                        <div style={{height:4,background:"rgba(255,255,255,.2)",borderRadius:99,marginTop:8}}>
                          <div style={{width:`${pct(used,c.limit)}%`,height:"100%",background:"rgba(255,255,255,.8)",borderRadius:99}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={S.card}>
              <div style={S.cardTitle}>Resumo Financeiro — {MONTHS_FULL[selMonth]}/{selYear}</div>
              <ProgressRow label="Pago" value={paidExpenses} total={totalRevenue} color="#10b981"/>
              <ProgressRow label="Em Aberto" value={totalExpenses-paidExpenses} total={totalRevenue} color="#f59e0b"/>
              <ProgressRow label="Meta Economia" value={savingTarget} total={totalRevenue} color="#ec4899"/>
              <div style={S.divider}/>
              <div style={S.progressSummary}><span>Receita total</span><strong>{fmt(totalRevenue)}</strong></div>
            </div>

            {alerts.length>0&&(
              <div style={S.card}>
                <div style={S.cardTitle}>⚠ Variações de Gasto</div>
                {alerts.map((a,i)=>(
                  <div key={i} style={S.alertRow}>
                    <Icon d={ic.warning} size={16} stroke="#f59e0b"/>
                    <div style={{flex:1}}><div style={S.alertDesc}>{a.desc}</div><div style={S.alertValues}>{fmt(a.prev)} → {fmt(a.curr)}</div></div>
                    <div style={S.alertBadge}>+{a.pct}%</div>
                  </div>
                ))}
              </div>
            )}

            {/* Pie Chart clicável */}
            {byGroup.length>0&&(
              <div style={S.card}>
                <div style={S.cardTitle}>Distribuição por Grupo <span style={{fontSize:11,color:"#94a3b8",fontWeight:400}}>· clique para detalhar</span></div>
                <div style={{display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
                  <PieChart data={pieData} onSliceClick={g=>{const full=byGroup.find(x=>x.id===g.id);setLightboxGroup(full);}}/>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minWidth:160}}>
                    {pieData.map(g=>(
                      <div key={g.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"4px 8px",borderRadius:8,transition:"background .15s"}}
                        onClick={()=>{const full=byGroup.find(x=>x.id===g.id);setLightboxGroup(full);}}>
                        <div style={{width:10,height:10,borderRadius:3,background:g.color,flexShrink:0}}/>
                        <span style={{fontSize:12,color:"#475569",flex:1}}>{g.name}</span>
                        <span style={{fontSize:12,fontWeight:700,color:g.color}}>{g.pct}%</span>
                        <span style={{fontSize:11,color:"#94a3b8"}}>{fmt(g.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={S.cardTitle}>🎯 Meta de Economia — {MONTHS_FULL[selMonth]}</div>
              </div>
              <div style={{background:"#f8fafc",borderRadius:12,padding:16,marginBottom:12}}>
                <div style={{display:"flex",gap:4,alignItems:"baseline",marginBottom:4}}>
                  <span style={{fontSize:11,color:"#64748b"}}>Se sua receita é</span>
                  <strong style={{color:"#10b981"}}>{fmt(totalRevenue)}</strong>
                  <span style={{fontSize:11,color:"#64748b"}}>e você quer guardar</span>
                  <strong style={{color:"#6366f1"}}>{savingGoal}%</strong>
                </div>
                <div style={{fontSize:13,color:"#64748b"}}>→ Deve sobrar pelo menos <strong style={{color:"#6366f1"}}>{fmt(savingTarget)}</strong> após pagar todas as despesas.</div>
                <div style={{marginTop:8,fontSize:13,fontWeight:700,color:balance>=savingTarget?"#10b981":"#ef4444"}}>
                  {balance>=savingTarget?`✓ Você tem ${fmt(balance)} de saldo — meta atingida!`:`⚠ Seu saldo atual é ${fmt(balance)} — faltam ${fmt(savingTarget-balance)} para atingir a meta.`}
                </div>
              </div>
              <input type="range" min={5} max={50} value={savingGoal} onChange={e=>saveSavingGoal(+e.target.value)}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",marginTop:4}}><span>5%</span><span style={{fontWeight:700,color:"#6366f1"}}>{savingGoal}% selecionado</span><span>50%</span></div>
            </div>
          </div>
        )}

        {/* ── DESPESAS ── */}
        {activeTab==="expenses"&&(
          <div style={S.section}>
            <div style={S.rowBetween}>
              <button style={S.btnPrimary} onClick={()=>{setEditItem(null);setShowForm(true);}}><Icon d={ic.plus} size={14}/> Nova Despesa</button>
              <button style={S.btnSecondary} onClick={()=>setShowGroupForm(true)}><Icon d={ic.plus} size={14}/> Grupo</button>
            </div>
            {groups.map(g=>{
              const items=monthExpenses.filter(e=>e.groupId===g.id);
              if(items.length===0)return null;
              return <GroupSection key={g.id} group={g} items={items} total={items.reduce((s,e)=>s+(e.value||0),0)}
                onToggle={togglePaid} onEdit={item=>{setEditItem(item);setShowForm(true);}} onDelete={deleteExpense} onDeleteGroup={deleteGroup}/>;
            })}
            {monthExpenses.length===0&&(
              <div style={S.emptyState}>
                <div style={{fontSize:48}}>📂</div>
                <div style={{color:"#64748b",fontSize:14}}>Nenhuma despesa em {MONTHS_FULL[selMonth]}</div>
                <button style={S.btnPrimary} onClick={()=>setShowForm(true)}>Adicionar primeira despesa</button>
              </div>
            )}
            {showForm&&<Modal onClose={()=>{setShowForm(false);setEditItem(null);setEditGroupItem(null);}} title={editItem?"Editar Despesa":"Nova Despesa"}>
              <ExpenseForm groups={groups} item={editItem} selMonth={selMonth} selYear={selYear} onSave={saveExpense} onClose={()=>{setShowForm(false);setEditItem(null);setEditGroupItem(null);}}/>
            </Modal>}
            {showGroupForm&&<Modal onClose={()=>setShowGroupForm(false)} title="Novo Grupo de Despesa">
              <GroupForm onSave={addGroup} onClose={()=>setShowGroupForm(false)}/>
            </Modal>}
          </div>
        )}

        {/* ── RECEITAS ── */}
        {activeTab==="revenues"&&(
          <div style={S.section}>
            <div style={S.rowBetween}>
              <button style={S.btnPrimary} onClick={()=>{setEditItem(null);setShowRevForm(true);}}><Icon d={ic.plus} size={14}/> Nova Receita</button>
              <button style={S.btnSecondary} onClick={()=>setShowRevGroupForm(true)}><Icon d={ic.plus} size={14}/> Categoria</button>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Total — {MONTHS_FULL[selMonth]}</div>
              <div style={{fontSize:32,fontWeight:800,color:"#10b981",letterSpacing:-1}}>{fmt(totalRevenue)}</div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>{monthRevenues.length} lançamento(s)</div>
            </div>
            {revGroups.map(rg=>{
              const items=monthRevenues.filter(r=>r.groupId===rg.id);
              if(items.length===0)return null;
              return(
                <div key={rg.id} style={S.groupCard}>
                  <div style={S.groupHeader}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:rg.color}}/>
                      <span style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{rg.name}</span>
                    </div>
                    <span style={{fontWeight:700,fontSize:14,color:"#10b981"}}>{fmt(items.reduce((s,r)=>s+(r.value||0),0))}</span>
                  </div>
                  {items.map(r=>(
                    <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #f8fafc"}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{r.description}</div>
                        <div style={{fontSize:11,color:"#94a3b8"}}>{r.source||""}{r.recurring?" · recorrente":""}</div>
                      </div>
                      <div style={{fontWeight:700,fontSize:14,color:"#10b981"}}>{fmt(r.value)}</div>
                      <button style={S.iconBtn} onClick={()=>{setEditItem(r);setShowRevForm(true);}}><Icon d={ic.edit} size={13} stroke="#6366f1"/></button>
                      <button style={S.iconBtn} onClick={()=>deleteRevenue(r.id)}><Icon d={ic.trash} size={13} stroke="#ef4444"/></button>
                    </div>
                  ))}
                </div>
              );
            })}
            {monthRevenues.length===0&&(
              <div style={S.emptyState}>
                <div style={{fontSize:48}}>💰</div>
                <div style={{color:"#64748b",fontSize:14}}>Nenhuma receita em {MONTHS_FULL[selMonth]}</div>
                <button style={S.btnPrimary} onClick={()=>setShowRevForm(true)}>Lançar primeira receita</button>
              </div>
            )}
            {showRevForm&&<Modal onClose={()=>{setShowRevForm(false);setEditItem(null);}} title={editItem?"Editar Receita":"Nova Receita"}>
              <RevenueForm revGroups={revGroups} item={editItem} selMonth={selMonth} selYear={selYear} onSave={saveRevenue} onClose={()=>{setShowRevForm(false);setEditItem(null);}}/>
            </Modal>}
            {showRevGroupForm&&<Modal onClose={()=>setShowRevGroupForm(false)} title="Nova Categoria de Receita">
              <GroupForm onSave={addRevGroup} onClose={()=>setShowRevGroupForm(false)}/>
            </Modal>}
          </div>
        )}

        {/* ── METAS ── */}
        {activeTab==="goals"&&(
          <div style={S.section}>
            <button style={{...S.btnPrimary,justifyContent:"center"}} onClick={()=>{setEditGoal(null);setShowGoalForm(true);}}><Icon d={ic.plus} size={14}/> Nova Meta 🎯</button>
            {goals.length===0&&(
              <div style={S.emptyState}>
                <div style={{fontSize:48}}>🐷</div>
                <div style={{color:"#64748b",fontSize:14}}>Crie sua primeira meta de economia!</div>
                <div style={{fontSize:12,color:"#94a3b8",textAlign:"center"}}>Ex: Geladeira nova, viagem de férias, fundo de emergência...</div>
              </div>
            )}
            {goals.map(goal=><GoalCard key={goal.id} goal={goal} onDeposit={depositGoal} onEdit={g=>{setEditGoal(g);setShowGoalForm(true);}} onDelete={deleteGoal}/>)}
            {showGoalForm&&<Modal onClose={()=>{setShowGoalForm(false);setEditGoal(null);}} title={editGoal?"Editar Meta":"Nova Meta 🎯"}>
              <GoalForm item={editGoal} onSave={saveGoal} onClose={()=>{setShowGoalForm(false);setEditGoal(null);}}/>
            </Modal>}
          </div>
        )}

        {/* ── CARTÕES & MILHAS ── */}
        {activeTab==="cards"&&(
          <div style={S.section}>
            <div style={S.rowBetween}>
              <button style={S.btnPrimary} onClick={()=>{setEditCard(null);setShowCardForm(true);}}><Icon d={ic.plus} size={14}/> Novo Cartão</button>
              <button style={S.btnSecondary} onClick={()=>{setEditMiles(null);setShowMilesForm(true);}}><Icon d={ic.plus} size={14}/> Programa de Milhas</button>
            </div>

            {/* Cartões */}
            {cards.length>0&&(
              <div style={S.card}>
                <div style={S.cardTitle}><Icon d={ic.credit} size={14} stroke="#6366f1"/> Meus Cartões</div>
                {cards.map(c=>{
                  const used=c.used||0;const avail=(c.limit||0)-used;
                  return(
                    <div key={c.id} style={{marginBottom:12,background:"linear-gradient(135deg,"+c.color+"22,"+c.color+"11)",border:`1px solid ${c.color}33`,borderRadius:14,padding:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>{c.name}</div>
                          <div style={{fontSize:11,color:"#94a3b8"}}>{c.bank||""}</div>
                        </div>
                        <div style={{display:"flex",gap:4}}>
                          <button style={S.iconBtn} onClick={()=>{setEditCard(c);setShowCardForm(true);}}><Icon d={ic.edit} size={13} stroke="#6366f1"/></button>
                          <button style={S.iconBtn} onClick={()=>deleteCard(c.id)}><Icon d={ic.trash} size={13} stroke="#ef4444"/></button>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#94a3b8"}}>Limite Total</div>
                          <div style={{fontWeight:700,fontSize:13,color:"#1e293b"}}>{fmt(c.limit)}</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#94a3b8"}}>Utilizado</div>
                          <div style={{fontWeight:700,fontSize:13,color:"#f59e0b"}}>{fmt(used)}</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#94a3b8"}}>Disponível</div>
                          <div style={{fontWeight:700,fontSize:13,color:"#10b981"}}>{fmt(avail)}</div>
                        </div>
                      </div>
                      <div style={{height:6,background:"#e2e8f0",borderRadius:99,overflow:"hidden"}}>
                        <div style={{width:`${pct(used,c.limit)}%`,height:"100%",background:c.color,borderRadius:99,transition:"width .5s"}}/>
                      </div>
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>{pct(used,c.limit)}% utilizado</div>
                    </div>
                  );
                })}
              </div>
            )}
            {cards.length===0&&(
              <div style={S.emptyState}>
                <div style={{fontSize:48}}>💳</div>
                <div style={{color:"#64748b",fontSize:14}}>Nenhum cartão cadastrado</div>
                <button style={S.btnPrimary} onClick={()=>setShowCardForm(true)}>Adicionar cartão</button>
              </div>
            )}

            {/* Milhas */}
            <div style={S.card}>
              <div style={S.cardTitle}><Icon d={ic.plane} size={14} stroke="#6366f1"/> Milhas — {MONTHS_FULL[selMonth]}/{selYear}</div>
              {miles.filter(m=>m.month===selMonth&&m.year===selYear).length===0?(
                <div style={S.empty}>Nenhum saldo de milhas lançado para este mês</div>
              ):(
                miles.filter(m=>m.month===selMonth&&m.year===selYear).map(m=>(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{m.emoji||"✈️"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13,color:"#1e293b"}}>{m.program}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>{m.card||""}</div>
                    </div>
                    <div style={{fontWeight:800,fontSize:16,color:"#6366f1"}}>{(m.points||0).toLocaleString("pt-BR")}<span style={{fontSize:10,color:"#94a3b8",marginLeft:2}}>pts</span></div>
                    <button style={S.iconBtn} onClick={()=>{setEditMiles(m);setShowMilesForm(true);}}><Icon d={ic.edit} size={13} stroke="#6366f1"/></button>
                    <button style={S.iconBtn} onClick={()=>deleteMiles(m.id)}><Icon d={ic.trash} size={13} stroke="#ef4444"/></button>
                  </div>
                ))
              )}
              <button style={{...S.btnSecondary,marginTop:12,justifyContent:"center"}} onClick={()=>{setEditMiles(null);setShowMilesForm(true);}}><Icon d={ic.plus} size={13}/> Atualizar Milhas</button>
            </div>

            {showCardForm&&<Modal onClose={()=>{setShowCardForm(false);setEditCard(null);}} title={editCard?"Editar Cartão":"Novo Cartão 💳"}>
              <CardForm item={editCard} onSave={saveCard} onClose={()=>{setShowCardForm(false);setEditCard(null);}}/>
            </Modal>}
            {showMilesForm&&<Modal onClose={()=>{setShowMilesForm(false);setEditMiles(null);}} title={editMiles?"Editar Milhas":"Lançar Milhas ✈️"}>
              <MilesForm item={editMiles} selMonth={selMonth} selYear={selYear} onSave={saveMiles} onClose={()=>{setShowMilesForm(false);setEditMiles(null);}}/>
            </Modal>}
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {activeTab==="history"&&(
          <div style={S.section}>
            <div style={S.card}>
              <div style={S.cardTitle}><Icon d={ic.filter} size={14}/> Filtrar</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button style={{...S.filterBtn,...(histFilter==="all"?S.filterBtnActive:{})}} onClick={()=>setHistFilter("all")}>Geral</button>
                <button style={{...S.filterBtn,...(histFilter==="revenue"?{background:"#10b981",color:"#fff",borderColor:"#10b981"}:{})}} onClick={()=>setHistFilter("revenue")}>Receitas</button>
                {groups.map(g=>(
                  <button key={g.id} style={{...S.filterBtn,...(histFilter===g.id?{background:g.color,color:"#fff",borderColor:g.color}:{})}} onClick={()=>setHistFilter(g.id)}>{g.name}</button>
                ))}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>
                Evolução 12 Meses
                {histFilter==="revenue"?" · Receitas":histFilter!=="all"?` · ${groups.find(g=>g.id===histFilter)?.name}`:""}
              </div>
              <div style={{display:"flex",gap:16,fontSize:12,color:"#64748b",marginBottom:16,alignItems:"center"}}>
                {histFilter!=="revenue"&&<span><span style={{display:"inline-block",width:10,height:10,borderRadius:3,background:"#f59e0b",marginRight:4}}/>Despesas</span>}
                {(histFilter==="all"||histFilter==="revenue")&&<span><span style={{display:"inline-block",width:10,height:10,borderRadius:3,background:"#10b981",marginRight:4}}/>Receita</span>}
              </div>
              <div style={{display:"flex",gap:4,alignItems:"flex-end",height:160,borderBottom:"1px solid #f1f5f9"}}>
                {filteredHistory.map((h,i)=>{
                  const maxH=Math.max(...filteredHistory.map(x=>Math.max(x.total,x.rev)),1);
                  return(
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{flex:1,width:"100%",display:"flex",gap:2,alignItems:"flex-end"}}>
                        {(histFilter==="all"||histFilter==="revenue")&&<div style={{flex:1,minHeight:2,borderRadius:"3px 3px 0 0",height:`${pct(h.rev,maxH)}%`,background:"#10b981",opacity:0.8}}/>}
                        {histFilter!=="revenue"&&<div style={{flex:1,minHeight:2,borderRadius:"3px 3px 0 0",height:`${pct(h.total,maxH)}%`,background:histFilter!=="all"?(groups.find(g=>g.id===histFilter)?.color||"#f59e0b"):"#f59e0b"}}/>}
                      </div>
                      <div style={{fontSize:9,fontWeight:h.month===selMonth&&h.year===selYear?700:400,color:h.month===selMonth&&h.year===selYear?"#6366f1":"#94a3b8"}}>{h.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Detalhe por Mês</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:380}}>
                  <thead><tr>{["Mês","Receita","Despesas","Saldo","Var.%"].map(h=><th key={h} style={{fontSize:11,color:"#94a3b8",fontWeight:600,textAlign:"left",padding:"6px 8px",borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredHistory.map((h,i)=>{
                      const prev=filteredHistory[i-1];
                      const varPct=prev&&prev.total>0?Math.round(((h.total-prev.total)/prev.total)*100):null;
                      const bal=h.rev-h.total;
                      return(
                        <tr key={i} style={{background:h.month===selMonth&&h.year===selYear?"rgba(99,102,241,0.08)":"transparent"}}>
                          <td style={{fontSize:12,padding:"8px",color:"#475569"}}>{h.label}/{h.year}</td>
                          <td style={{fontSize:12,padding:"8px",color:"#10b981",fontWeight:600}}>{fmt(h.rev)}</td>
                          <td style={{fontSize:12,padding:"8px",color:"#f59e0b",fontWeight:600}}>{fmt(h.total)}</td>
                          <td style={{fontSize:12,padding:"8px",color:bal>=0?"#10b981":"#ef4444",fontWeight:600}}>{fmt(bal)}</td>
                          <td style={{fontSize:12,padding:"8px"}}>{varPct!==null?<span style={{color:varPct>15?"#ef4444":varPct>0?"#f59e0b":"#10b981",fontWeight:700}}>{varPct>0?"+":""}{varPct}%</span>:"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── PIE CHART ────────────────────────────────────────────────────────────────
function PieChart({data,onSliceClick}){
  const size=140;const r=54;const cx=70;const cy=70;
  const toRad=deg=>(deg-90)*Math.PI/180;
  const arc=(start,slice)=>{
    if(slice>=360)return `M ${cx} ${cy-r} A ${r} ${r} 0 1 1 ${cx-0.01} ${cy-r} Z`;
    const s=toRad(start);const e=toRad(start+slice);
    const x1=cx+r*Math.cos(s);const y1=cy+r*Math.sin(s);
    const x2=cx+r*Math.cos(e);const y2=cy+r*Math.sin(e);
    const large=slice>180?1:0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };
  return(
    <svg width={size} height={size} style={{flexShrink:0,cursor:"pointer"}}>
      {data.map((d,i)=><path key={i} d={arc(d.start,d.slice)} fill={d.color} stroke="#fff" strokeWidth={2} onClick={()=>onSliceClick&&onSliceClick(d)} style={{transition:"opacity .2s"}} onMouseEnter={e=>e.target.style.opacity=".8"} onMouseLeave={e=>e.target.style.opacity="1"}/>)}
      <circle cx={cx} cy={cy} r={34} fill="#fff"/>
      <text x={cx} y={cy-5} textAnchor="middle" fontSize={10} fill="#64748b">Total</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#1e293b">{data.reduce((s,d)=>s+d.total,0).toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0})}</text>
    </svg>
  );
}

// ─── GOAL CARD ────────────────────────────────────────────────────────────────
function GoalCard({goal,onDeposit,onEdit,onDelete}){
  const [showDep,setShowDep]=useState(false);
  const [depVal,setDepVal]=useState("");
  const [depNote,setDepNote]=useState("Depósito");
  const saved=goal.saved||0;const progress=pct(saved,goal.target);
  const EMOJIS={emergencia:"🛡️",viagem:"✈️",eletrodomestico:"🏠",carro:"🚗",educacao:"📚",outro:"🎯"};
  return(
    <div style={S.goalCard}>
      <div style={S.goalHeader}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:32}}>{EMOJIS[goal.type]||"🎯"}</div>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>{goal.name}</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>{goal.description||""}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          <button style={S.iconBtn} onClick={()=>onEdit(goal)}><Icon d={ic.edit} size={13} stroke="#6366f1"/></button>
          <button style={S.iconBtn} onClick={()=>onDelete(goal.id)}><Icon d={ic.trash} size={13} stroke="#ef4444"/></button>
        </div>
      </div>
      <div style={{background:"#f8fafc",borderRadius:10,padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,color:"#64748b"}}>Economizado</span>
          <span style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>{fmt(saved)} / {fmt(goal.target)}</span>
        </div>
        <div style={{height:10,background:"#f1f5f9",borderRadius:99,overflow:"hidden"}}>
          <div style={{width:`${progress}%`,height:"100%",background:progress>=100?"#10b981":"linear-gradient(90deg,#6366f1,#ec4899)",borderRadius:99,transition:"width .6s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
          <span style={{fontSize:11,color:progress>=100?"#10b981":"#6366f1",fontWeight:700}}>{progress}% {progress>=100?"✓ Concluída!":""}</span>
          {goal.deadline&&<span style={{fontSize:11,color:"#94a3b8"}}>Prazo: {goal.deadline}</span>}
        </div>
      </div>
      {!showDep?(
        <button style={{...S.btnPrimary,justifyContent:"center",marginTop:8}} onClick={()=>setShowDep(true)}><Icon d={ic.coin} size={14}/> Depositar</button>
      ):(
        <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
          <input style={S.input} type="number" value={depVal} onChange={e=>setDepVal(e.target.value)} placeholder="Valor (R$)"/>
          <input style={S.input} value={depNote} onChange={e=>setDepNote(e.target.value)} placeholder="Observação"/>
          <div style={{display:"flex",gap:8}}>
            <button style={S.btnSecondary} onClick={()=>setShowDep(false)}>Cancelar</button>
            <button style={S.btnPrimary} onClick={()=>{if(depVal){onDeposit(goal,parseFloat(depVal),depNote);setShowDep(false);setDepVal("");}}}>Confirmar</button>
          </div>
        </div>
      )}
      {(goal.deposits||[]).length>0&&(
        <div style={{marginTop:12,borderTop:"1px solid #f1f5f9",paddingTop:10}}>
          <div style={{fontSize:11,color:"#94a3b8",marginBottom:6,fontWeight:600}}>ÚLTIMOS DEPÓSITOS</div>
          {[...(goal.deposits||[])].reverse().slice(0,3).map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0"}}>
              <span style={{color:"#475569"}}>{d.note} · {d.date}</span>
              <span style={{fontWeight:600,color:"#10b981"}}>+{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function KpiCard({label,value,icon,color,sub}){
  return(
    <div style={{...S.kpiCard,borderTop:`3px solid ${color}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:34,height:34,borderRadius:10,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon d={ic[icon]} size={16} stroke={color}/></div>
        <div style={{fontSize:10,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>
      </div>
      <div style={{fontSize:18,fontWeight:800,letterSpacing:-0.5,color,marginBottom:4}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#94a3b8"}}>{sub}</div>}
    </div>
  );
}

function ProgressRow({label,value,total,color}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,width:130,flexShrink:0,color:"#64748b"}}>
        <span>{label}</span><span style={{color}}>{fmt(value)}</span>
      </div>
      <div style={{flex:1,height:6,background:"#f1f5f9",borderRadius:99}}>
        <div style={{width:`${pct(value,total)}%`,height:"100%",borderRadius:99,background:color,transition:"width .5s ease"}}/>
      </div>
      <span style={{fontSize:11,color:"#94a3b8",width:32,textAlign:"right"}}>{pct(value,total)}%</span>
    </div>
  );
}

function GroupSection({group,items,total,onToggle,onEdit,onDelete,onDeleteGroup}){
  const [open,setOpen]=useState(true);
  return(
    <div style={S.groupCard}>
      <div style={S.groupHeader} onClick={()=>setOpen(o=>!o)}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:10,height:10,borderRadius:"50%",background:group.color}}/>
          <span style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{group.name}</span>
          <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99,background:group.color+"22",color:group.color}}>{items.length}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{fmt(total)}</span>
          <button style={{...S.iconBtn,padding:2}} onClick={e=>{e.stopPropagation();if(window.confirm("Remover grupo?"))onDeleteGroup(group.id);}}><Icon d={ic.trash} size={12} stroke="#ef4444"/></button>
          <Icon d={open?ic.chevron_down:ic.chevron_right} size={14} stroke="#94a3b8"/>
        </div>
      </div>
      {open&&items.map(item=><ExpenseRow key={item.id} item={item} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}/>)}
    </div>
  );
}

function ExpenseRow({item,onToggle,onEdit,onDelete}){
  const isOverdue=!item.paid&&item.dueDay<TODAY.getDate()&&item.month===CURRENT_MONTH&&item.year===CURRENT_YEAR;
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #f8fafc",opacity:item.paid?0.65:1}}>
      <button style={{width:22,height:22,borderRadius:6,border:`2px solid ${item.paid?"#10b981":"#cbd5e1"}`,background:item.paid?"#10b981":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={()=>onToggle(item.id)}>
        {item.paid&&<Icon d={ic.check} size={11} stroke="#fff" strokeWidth={2.5}/>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:13,fontWeight:600,color:"#1e293b",textDecoration:item.paid?"line-through":"none"}}>{item.description}</span>
          {item.recurring&&<span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,color:"#6366f1",background:"#ede9fe",padding:"2px 6px",borderRadius:99}}><Icon d={ic.repeat} size={10}/>recorrente</span>}
          {isOverdue&&<span style={{fontSize:10,color:"#ef4444",background:"#fef2f2",padding:"2px 6px",borderRadius:99,fontWeight:700}}>vencido</span>}
        </div>
        <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>
          {item.creditor}
          {item.dueDate?` · Vence ${item.dueDate}`:item.dueDay?` · Vence dia ${item.dueDay}`:""}
          {item.refMonth!==undefined?` · Ref: ${MONTHS[item.refMonth]}/${item.refYear||CURRENT_YEAR}`:""}
        </div>
      </div>
      <div style={{fontWeight:700,fontSize:14,flexShrink:0,color:item.paid?"#10b981":isOverdue?"#ef4444":"#1e293b"}}>{fmt(item.value)}</div>
      <div style={{display:"flex",gap:4,flexShrink:0}}>
        <button style={S.iconBtn} onClick={()=>onEdit(item)}><Icon d={ic.edit} size={13} stroke="#6366f1"/></button>
        <button style={S.iconBtn} onClick={()=>onDelete(item.id)}><Icon d={ic.trash} size={13} stroke="#ef4444"/></button>
      </div>
    </div>
  );
}

function Modal({onClose,title,children}){
  return(
    <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={S.modal}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>{title}</span>
          <button style={{background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",padding:6,display:"flex",alignItems:"center"}} onClick={onClose}><Icon d={ic.x} size={16}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ExpenseForm({groups,item,selMonth,selYear,onSave,onClose}){
  const [desc,setDesc]=useState(item?.description||"");
  const [creditor,setCreditor]=useState(item?.creditor||"");
  const [value,setValue]=useState(item?.value||"");
  const [dueDate,setDueDate]=useState(item?.dueDate||"");
  const [refMonth,setRefMonth]=useState(item?.refMonth??selMonth);
  const [refYear,setRefYear]=useState(item?.refYear||selYear);
  const [groupId,setGroupId]=useState(item?.groupId||groups[0]?.id||"");
  const [recurring,setRecurring]=useState(item?.recurring||false);
  const [recurMonths,setRecurMonths]=useState(item?.recurMonths||12);
  const [paid,setPaid]=useState(item?.paid||false);
  return(
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
        <div><label style={S.label}>Valor (R$) *</label><input style={S.input} type="number" value={value} onChange={e=>setValue(e.target.value)} placeholder="0,00"/></div>
        <div><label style={S.label}>Data de Vencimento</label><input style={S.input} type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <label style={S.label}>Mês de Referência</label>
          <select style={S.input} value={refMonth} onChange={e=>setRefMonth(+e.target.value)}>
            {MONTHS_FULL.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Ano de Referência</label>
          <input style={S.input} type="number" value={refYear} onChange={e=>setRefYear(+e.target.value)} min={2020} max={2099}/>
        </div>
      </div>
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#475569",cursor:"pointer"}}>
        <input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}/>
        <Icon d={ic.repeat} size={14} stroke="#6366f1"/> Lançar como recorrente
      </label>
      {recurring&&(
        <div>
          <label style={S.label}>Repetir por quantos meses?</label>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <input type="range" min={1} max={24} value={recurMonths} onChange={e=>setRecurMonths(+e.target.value)}/>
            <span style={{fontWeight:700,color:"#6366f1",minWidth:60}}>{recurMonths} {recurMonths===1?"mês":"meses"}</span>
          </div>
        </div>
      )}
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#475569",cursor:"pointer"}}>
        <input type="checkbox" checked={paid} onChange={e=>setPaid(e.target.checked)}/>
        <Icon d={ic.check} size={14} stroke="#10b981"/> Já está pago
      </label>
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>desc&&value&&onSave({...(item||{}),description:desc,creditor,value:parseFloat(value),dueDate,refMonth,refYear,groupId,recurring,recurMonths,paid,month:item?.month??selMonth,year:item?.year??selYear})}>Salvar</button>
      </div>
    </div>
  );
}

function RevenueForm({revGroups,item,selMonth,selYear,onSave,onClose}){
  const [desc,setDesc]=useState(item?.description||"");
  const [source,setSource]=useState(item?.source||"");
  const [value,setValue]=useState(item?.value||"");
  const [groupId,setGroupId]=useState(item?.groupId||revGroups[0]?.id||"");
  const [recurring,setRecurring]=useState(item?.recurring||false);
  const [recurMonths,setRecurMonths]=useState(item?.recurMonths||12);
  return(
    <div style={S.form}>
      <label style={S.label}>Categoria</label>
      <select style={S.input} value={groupId} onChange={e=>setGroupId(e.target.value)}>
        {revGroups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <label style={S.label}>Descrição *</label>
      <input style={S.input} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="ex: Salário Maio"/>
      <label style={S.label}>Fonte</label>
      <input style={S.input} value={source} onChange={e=>setSource(e.target.value)} placeholder="ex: Empresa XYZ"/>
      <label style={S.label}>Valor (R$) *</label>
      <input style={S.input} type="number" value={value} onChange={e=>setValue(e.target.value)} placeholder="0,00"/>
      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#475569",cursor:"pointer"}}>
        <input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)}/>
        <Icon d={ic.repeat} size={14} stroke="#10b981"/> Lançar como recorrente
      </label>
      {recurring&&(
        <div>
          <label style={S.label}>Repetir por quantos meses?</label>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <input type="range" min={1} max={24} value={recurMonths} onChange={e=>setRecurMonths(+e.target.value)}/>
            <span style={{fontWeight:700,color:"#10b981",minWidth:60}}>{recurMonths} {recurMonths===1?"mês":"meses"}</span>
          </div>
        </div>
      )}
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>desc&&value&&onSave({...(item||{}),description:desc,source,value:parseFloat(value),groupId,recurring,recurMonths,month:item?.month??selMonth,year:item?.year??selYear})}>Salvar</button>
      </div>
    </div>
  );
}

function GroupForm({onSave,onClose}){
  const [name,setName]=useState("");const [color,setColor]=useState("#6366f1");const [icon,setIcon]=useState("tag");
  const ICONS=["home","car","heart","bolt","wallet","tag","star","chart","coin","piggy"];
  return(
    <div style={S.form}>
      <label style={S.label}>Nome *</label>
      <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Alimentação"/>
      <label style={S.label}>Cor</label>
      <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{...S.input,padding:4,height:44,cursor:"pointer"}}/>
      <label style={S.label}>Ícone</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {ICONS.map(ico=>(
          <button key={ico} onClick={()=>setIcon(ico)} style={{width:44,height:44,borderRadius:10,border:`2px solid ${icon===ico?color:"transparent"}`,background:icon===ico?color+"33":"#f1f5f9",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon d={ic[ico]} size={18} stroke={icon===ico?color:"#64748b"}/>
          </button>
        ))}
      </div>
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>name&&onSave(name,icon,color)}>Criar</button>
      </div>
    </div>
  );
}

function GoalForm({item,onSave,onClose}){
  const [name,setName]=useState(item?.name||"");
  const [description,setDescription]=useState(item?.description||"");
  const [target,setTarget]=useState(item?.target||"");
  const [deadline,setDeadline]=useState(item?.deadline||"");
  const [type,setType]=useState(item?.type||"outro");
  const TYPES=[{v:"emergencia",l:"🛡️ Emergência"},{v:"viagem",l:"✈️ Viagem"},{v:"eletrodomestico",l:"🏠 Eletrodoméstico"},{v:"carro",l:"🚗 Carro"},{v:"educacao",l:"📚 Educação"},{v:"outro",l:"🎯 Outro"}];
  return(
    <div style={S.form}>
      <label style={S.label}>Tipo de Meta</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {TYPES.map(t=><button key={t.v} onClick={()=>setType(t.v)} style={{padding:"6px 12px",borderRadius:20,border:`2px solid ${type===t.v?"#6366f1":"#e2e8f0"}`,background:type===t.v?"#ede9fe":"#f8fafc",cursor:"pointer",fontSize:12,fontWeight:type===t.v?700:400,color:type===t.v?"#6366f1":"#475569"}}>{t.l}</button>)}
      </div>
      <label style={S.label}>Nome da Meta *</label>
      <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Geladeira nova"/>
      <label style={S.label}>Descrição</label>
      <input style={S.input} value={description} onChange={e=>setDescription(e.target.value)} placeholder="ex: Samsung frost free 400L"/>
      <label style={S.label}>Valor Alvo (R$) *</label>
      <input style={S.input} type="number" value={target} onChange={e=>setTarget(e.target.value)} placeholder="0,00"/>
      <label style={S.label}>Prazo (opcional)</label>
      <input style={S.input} type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/>
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>name&&target&&onSave({...(item||{}),name,description,target:parseFloat(target),deadline,type,saved:item?.saved||0,deposits:item?.deposits||[]})}>Salvar Meta</button>
      </div>
    </div>
  );
}

function CardForm({item,onSave,onClose}){
  const [name,setName]=useState(item?.name||"");
  const [bank,setBank]=useState(item?.bank||"");
  const [limit,setLimit]=useState(item?.limit||"");
  const [used,setUsed]=useState(item?.used||"");
  const [color,setColor]=useState(item?.color||"#6366f1");
  return(
    <div style={S.form}>
      <label style={S.label}>Nome do Cartão *</label>
      <input style={S.input} value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Nubank Roxinho"/>
      <label style={S.label}>Banco / Emissor</label>
      <input style={S.input} value={bank} onChange={e=>setBank(e.target.value)} placeholder="ex: Nubank"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div><label style={S.label}>Limite Total (R$) *</label><input style={S.input} type="number" value={limit} onChange={e=>setLimit(e.target.value)} placeholder="0,00"/></div>
        <div><label style={S.label}>Valor Utilizado (R$)</label><input style={S.input} type="number" value={used} onChange={e=>setUsed(e.target.value)} placeholder="0,00"/></div>
      </div>
      <label style={S.label}>Cor do Cartão</label>
      <input type="color" value={color} onChange={e=>setColor(e.target.value)} style={{...S.input,padding:4,height:44,cursor:"pointer"}}/>
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>name&&limit&&onSave({...(item||{}),name,bank,limit:parseFloat(limit),used:parseFloat(used||0),color})}>Salvar</button>
      </div>
    </div>
  );
}

function MilesForm({item,selMonth,selYear,onSave,onClose}){
  const [program,setProgram]=useState(item?.program||"");
  const [card,setCard]=useState(item?.card||"");
  const [points,setPoints]=useState(item?.points||"");
  const [emoji,setEmoji]=useState(item?.emoji||"✈️");
  const EMOJIS=["✈️","🌟","💎","🏆","🎯","🚀"];
  return(
    <div style={S.form}>
      <label style={S.label}>Programa de Milhas *</label>
      <input style={S.input} value={program} onChange={e=>setProgram(e.target.value)} placeholder="ex: Smiles, TudoAzul, Livelo"/>
      <label style={S.label}>Cartão Vinculado</label>
      <input style={S.input} value={card} onChange={e=>setCard(e.target.value)} placeholder="ex: Nubank Ultravioleta"/>
      <label style={S.label}>Saldo de Pontos *</label>
      <input style={S.input} type="number" value={points} onChange={e=>setPoints(e.target.value)} placeholder="ex: 50000"/>
      <label style={S.label}>Ícone</label>
      <div style={{display:"flex",gap:8}}>
        {EMOJIS.map(e=><button key={e} onClick={()=>setEmoji(e)} style={{width:44,height:44,borderRadius:10,border:`2px solid ${emoji===e?"#6366f1":"#e2e8f0"}`,background:emoji===e?"#ede9fe":"#f8fafc",cursor:"pointer",fontSize:20}}>{e}</button>)}
      </div>
      <div style={S.formActions}>
        <button style={S.btnSecondary} onClick={onClose}>Cancelar</button>
        <button style={S.btnPrimary} onClick={()=>program&&points&&onSave({...(item||{}),program,card,points:parseInt(points),emoji,month:item?.month??selMonth,year:item?.year??selYear})}>Salvar</button>
      </div>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S={
  app:{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#f8fafc",minHeight:"100vh",color:"#1e293b"},
  header:{background:"linear-gradient(135deg,#1e293b 0%,#0f172a 100%)",padding:"0 16px"},
  headerInner:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0"},
  logo:{display:"flex",alignItems:"center",gap:10},
  logoCircle:{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#ec4899)",display:"flex",alignItems:"center",justifyContent:"center"},
  logoTitle:{color:"#fff",fontWeight:700,fontSize:16,letterSpacing:-0.5},
  logoSub:{color:"#64748b",fontSize:11},
  monthNav:{display:"flex",alignItems:"center",gap:8},
  navBtn:{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:28,height:28,borderRadius:8,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"},
  monthLabel:{color:"#fff",fontWeight:600,fontSize:13,minWidth:70,textAlign:"center"},
  logoutBtn:{background:"rgba(255,255,255,0.05)",border:"none",cursor:"pointer",padding:8,borderRadius:8,display:"flex",alignItems:"center"},
  nav:{background:"#fff",borderBottom:"1px solid #e2e8f0",display:"flex",padding:"0 8px",overflowX:"auto"},
  tab:{display:"flex",alignItems:"center",gap:5,padding:"11px 10px",border:"none",background:"transparent",cursor:"pointer",color:"#64748b",fontSize:12,fontWeight:500,borderBottom:"2px solid transparent",whiteSpace:"nowrap",flexShrink:0},
  tabActive:{color:"#6366f1",borderBottomColor:"#6366f1",fontWeight:700},
  main:{padding:16,maxWidth:900,margin:"0 auto",paddingBottom:40},
  section:{display:"flex",flexDirection:"column",gap:14},
  kpiGrid:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10},
  kpiCard:{background:"#fff",borderRadius:14,padding:14,boxShadow:"0 1px 3px rgba(0,0,0,.06)"},
  card:{background:"#fff",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.06)"},
  cardTitle:{fontWeight:700,fontSize:14,marginBottom:14,color:"#1e293b",display:"flex",alignItems:"center",gap:6},
  divider:{height:1,background:"#f1f5f9",margin:"10px 0"},
  progressSummary:{display:"flex",justifyContent:"space-between",fontSize:13,color:"#64748b"},
  alertRow:{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f1f5f9"},
  alertDesc:{fontSize:13,fontWeight:600,color:"#1e293b"},
  alertValues:{fontSize:12,color:"#64748b"},
  alertBadge:{background:"#fef9c3",color:"#b45309",fontWeight:700,fontSize:11,padding:"3px 8px",borderRadius:99},
  empty:{fontSize:13,color:"#94a3b8",textAlign:"center",padding:"16px 0"},
  rowBetween:{display:"flex",gap:10},
  btnPrimary:{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",background:"linear-gradient(135deg,#6366f1,#818cf8)",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,flex:1},
  btnSecondary:{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",background:"#f1f5f9",color:"#475569",border:"none",borderRadius:10,cursor:"pointer",fontWeight:600,fontSize:13,flex:1},
  groupCard:{background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.06)"},
  groupHeader:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",cursor:"pointer",background:"#fafafa",borderBottom:"1px solid #f1f5f9"},
  emptyState:{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"48px 16px",background:"#fff",borderRadius:14},
  overlay:{position:"fixed",inset:0,background:"rgba(15,23,42,.6)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100,backdropFilter:"blur(4px)"},
  modal:{background:"#fff",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"},
  form:{display:"flex",flexDirection:"column",gap:10},
  label:{fontSize:12,fontWeight:600,color:"#475569",marginBottom:2},
  input:{width:"100%",padding:"10px 12px",border:"1.5px solid #e2e8f0",borderRadius:10,fontSize:14,color:"#1e293b",background:"#f8fafc",boxSizing:"border-box",outline:"none",fontFamily:"inherit"},
  formActions:{display:"flex",gap:10,marginTop:8},
  iconBtn:{background:"none",border:"none",cursor:"pointer",padding:6,borderRadius:6,display:"flex",alignItems:"center"},
  goalCard:{background:"#fff",borderRadius:14,padding:16,boxShadow:"0 1px 3px rgba(0,0,0,.06)"},
  goalHeader:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12},
  filterBtn:{padding:"6px 14px",borderRadius:20,border:"1.5px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontSize:12,fontWeight:500,color:"#475569"},
  filterBtnActive:{background:"#6366f1",color:"#fff",borderColor:"#6366f1",fontWeight:700},
  toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",color:"#fff",padding:"10px 20px",borderRadius:10,fontWeight:600,fontSize:13,zIndex:200,boxShadow:"0 4px 20px rgba(0,0,0,.2)",animation:"toast-in .3s ease",whiteSpace:"nowrap"},
};

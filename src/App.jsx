import { useState, useEffect, useRef, useCallback, useMemo, memo, useDeferredValue } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

/* ─────────────────────────────────────────────
   THEME ENGINE  (5 glassmorphism themes)
───────────────────────────────────────────── */
const THEMES = {
  rust:     { name:"Rust Dark",  bg:"#0B0B0F", bg2:"#180900", p:"#C45508", lit:"#E06020", acc:"#FADADD", t1:"#FADADD", t2:"#F0B8BE", t3:"#C48888", ok:"#00D2A0", err:"#FF4D6D", info:"#60A5FA", warn:"#FCD34D", g:"196,85,8",   g2:"224,96,32" },
  midnight: { name:"Midnight",   bg:"#060912", bg2:"#0C1830", p:"#3B82F6", lit:"#60A5FA", acc:"#DBEAFE", t1:"#DBEAFE", t2:"#BFDBFE", t3:"#93C5FD", ok:"#34D399", err:"#F87171", info:"#A5B4FC", warn:"#FCD34D", g:"59,130,246",  g2:"96,165,250" },
  emerald:  { name:"Emerald",    bg:"#030D08", bg2:"#061A0C", p:"#059669", lit:"#10B981", acc:"#D1FAE5", t1:"#D1FAE5", t2:"#A7F3D0", t3:"#6EE7B7", ok:"#34D399", err:"#F87171", info:"#60A5FA", warn:"#FCD34D", g:"5,150,105",   g2:"16,185,129" },
  violet:   { name:"Violet",     bg:"#09060F", bg2:"#150938", p:"#7C3AED", lit:"#8B5CF6", acc:"#EDE9FE", t1:"#EDE9FE", t2:"#DDD6FE", t3:"#C4B5FD", ok:"#34D399", err:"#F87171", info:"#60A5FA", warn:"#FCD34D", g:"124,58,237",  g2:"139,92,246" },
  rose:     { name:"Rose Gold",  bg:"#0F080A", bg2:"#28090F", p:"#E11D48", lit:"#FB7185", acc:"#FFE4E6", t1:"#FFE4E6", t2:"#FECDD3", t3:"#FDA4AF", ok:"#34D399", err:"#FF4D6D", info:"#60A5FA", warn:"#FCD34D", g:"225,29,72",   g2:"251,113,133" },
};

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const STATUSES = ["Submitted","Interview Scheduled","Waiting for Feedback","Rejected","Offer Extended","Placed"];
const S_CLS = { "Submitted":"s-sub","Interview Scheduled":"s-int","Waiting for Feedback":"s-wait","Rejected":"s-rej","Offer Extended":"s-off","Placed":"s-ok" };
const IV_CLS = { "Scheduled":"iv-s","Completed":"iv-d","Pending":"iv-p","Rejected":"iv-r" };
const AV_G = ["linear-gradient(135deg,#C45508,#E06020)","linear-gradient(135deg,#7C3AED,#8B5CF6)","linear-gradient(135deg,#0EA5E9,#38BDF8)","linear-gradient(135deg,#059669,#10B981)","linear-gradient(135deg,#DC2626,#F87171)","linear-gradient(135deg,#D97706,#FBBF24)","linear-gradient(135deg,#DB2777,#F9A8D4)","linear-gradient(135deg,#0891B2,#67E8F9)"];
const PIE_C = ["#C45508","#818CF8","#FCD34D","#FCA5A5","#D8B4FE","#00D2A0","#60A5FA","#FB923C"];
const US_TZ = [
  { id:"America/New_York",    ab:"EST/EDT", nm:"Eastern",  c:"#E8A4B9" },
  { id:"America/Chicago",     ab:"CST/CDT", nm:"Central",  c:"#E8702A" },
  { id:"America/Denver",      ab:"MST/MDT", nm:"Mountain", c:"#90CAF9" },
  { id:"America/Los_Angeles", ab:"PST/PDT", nm:"Pacific",  c:"#81C784" },
  { id:"America/Anchorage",   ab:"AKST",    nm:"Alaska",   c:"#CE93D8" },
  { id:"Pacific/Honolulu",    ab:"HST",     nm:"Hawaii",   c:"#FFCC80" },
];

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
const tod = () => new Date().toISOString().split("T")[0];
const ini = n => (n||"?").split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
const avG = n => { let h=0; for(let i=0;i<(n||"").length;i++) h=(h<<5)-h+n.charCodeAt(i); return AV_G[Math.abs(h)%AV_G.length]; };
const fmt12 = tz => { try { return new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}).format(new Date()); } catch { return "—"; }};

const SUPABASE_URL = localStorage.getItem('ats_supabase_url') || 'https://wthsdvlvipqwmxeuctgh.supabase.co';
const SUPABASE_ANON_KEY = localStorage.getItem('ats_supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aHNkdmx2aXBxd214ZXVjdGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTU2ODgsImV4cCI6MjA5NTAzMTY4OH0.TRiaU5R50wEl09VyAJHmU4jLKO637QNa5VzuiSbWBtI';

async function sg(k) {
  let supData = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_data?key=eq.${encodeURIComponent(k)}&select=data`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) { const rows = await res.json(); if (rows.length && rows[0].data !== null) supData = rows[0].data; }
  } catch {}
  const localData = (() => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } })();
  if (localData && (!supData || (Array.isArray(supData) && !supData.length))) return localData;
  return supData || localData;
}
async function ss(k,d) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/app_data`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ key: k, data: d, updated_at: new Date().toISOString() })
    });
  } catch {}
  try { localStorage.setItem(k,JSON.stringify(d)); } catch{}
}
/* API base — uses Vite proxy in dev to avoid CORS */
const API_BASE = "/api/openai";

window.__ATS_API_KEY__ = window.__ATS_API_KEY__ || "sk-VWkUeP4TLTUn4M55CBXjz8zcvaEkcz7YL9i75TvrABOPimrBtAn0kPlFK7BDGnC2";

async function callAI(prompt, sys="") {
  const msgs = [];
  if (sys) msgs.push({role:"system",content:sys});
  msgs.push({role:"user",content:prompt});
  const headers = { "Content-Type":"application/json" };
  if (window.__ATS_API_KEY__) headers["Authorization"] = "Bearer "+window.__ATS_API_KEY__;
  const r = await fetch(API_BASE+"/v1/chat/completions",{method:"POST",headers,body:JSON.stringify({model:"big-pickle",max_tokens:1000,messages:msgs})});
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || "API error");
  return d.choices?.[0]?.message?.content || "";
}

/* ─────────────────────────────────────────────
   CSS — Glassmorphism Design System
───────────────────────────────────────────── */
function injectCSS(T) {
  let el = document.getElementById("ats-css");
  if (!el) { el=document.createElement("style"); el.id="ats-css"; document.head.appendChild(el); }
  el.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:rgba(0,0,0,.15)}
::-webkit-scrollbar-thumb{background:rgba(${T.g},.5);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:rgba(${T.g},.8)}
body{font-family:'Rajdhani',sans-serif;color:${T.t1};overflow-x:hidden;background:${T.bg}}

/* ── ANIMATED BACKGROUND ── */
.bg-canvas{
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(ellipse 80% 70% at 8% 5%, rgba(${T.g},.16) 0%,transparent 55%),
    radial-gradient(ellipse 65% 75% at 92% 95%, rgba(${T.g2},.12) 0%,transparent 55%),
    radial-gradient(ellipse 50% 55% at 50% 50%, rgba(${T.g},.04) 0%,transparent 65%),
    linear-gradient(180deg, ${T.bg} 0%, ${T.bg2} 50%, ${T.bg} 100%);
  animation: bgPulse 12s ease-in-out infinite alternate;
}
@keyframes bgPulse{0%{opacity:.8}100%{opacity:1}}

/* ── GRID OVERLAY ── */
.grid-canvas{
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(${T.g},.03) 1px,transparent 1px),
    linear-gradient(90deg,rgba(${T.g},.03) 1px,transparent 1px),
    linear-gradient(rgba(${T.g},.015) 1px,transparent 1px),
    linear-gradient(90deg,rgba(${T.g},.015) 1px,transparent 1px);
  background-size:80px 80px,80px 80px,20px 20px,20px 20px;
  animation:gridDrift 25s linear infinite;
}
@keyframes gridDrift{to{background-position:80px 80px,80px 80px,20px 20px,20px 20px}}

/* ── ANIMATIONS ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes popIn{from{opacity:0;transform:scale(.82)}to{opacity:1;transform:scale(1)}}
@keyframes slideL{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
@keyframes gradPan{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes scanLine{0%{top:-3px;opacity:0}8%{opacity:1}92%{opacity:.8}100%{top:calc(100% + 3px);opacity:0}}
@keyframes glowBeat{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes orbit{to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes dotBounce{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-5px);opacity:1}}
.page-in{animation:fadeUp .42s cubic-bezier(.22,1,.36,1) both}

/* ── GLASS PANEL ── */
.glass{
  background:linear-gradient(135deg,rgba(${T.g},.07) 0%,rgba(255,255,255,.02) 100%);
  backdrop-filter:saturate(200%) blur(22px);
  -webkit-backdrop-filter:saturate(200%) blur(22px);
  border:1px solid rgba(${T.g},.2);
  border-top:1px solid rgba(255,255,255,.1);
  border-left:1px solid rgba(255,255,255,.06);
  box-shadow:0 8px 32px rgba(0,0,0,.35),0 1px 0 rgba(255,255,255,.07) inset;
  border-radius:16px;padding:1.4rem;margin-bottom:1.4rem;
  position:relative;overflow:hidden;
  transition:border-color .3s,box-shadow .3s,transform .25s;
}
.glass::before{content:'';position:absolute;top:0;left:0;right:0;height:1.5px;
  background:linear-gradient(90deg,transparent,rgba(${T.g},.8),rgba(${T.g2},.9),rgba(${T.g},.8),transparent);
  background-size:200% 100%;animation:gradPan 3.5s linear infinite}
.glass:hover{border-color:rgba(${T.g},.38);box-shadow:0 16px 48px rgba(0,0,0,.45);transform:translateY(-1px)}

/* ── GLASS SIDEBAR ── */
.glass-sb{
  background:rgba(0,0,0,.3);
  backdrop-filter:saturate(220%) blur(28px);
  -webkit-backdrop-filter:saturate(220%) blur(28px);
  border-right:1px solid rgba(${T.g},.18);
  box-shadow:4px 0 40px rgba(0,0,0,.4),1px 0 0 rgba(255,255,255,.04) inset;
}

/* ── GLASS TOPBAR ── */
.glass-top{
  background:rgba(0,0,0,.22);
  backdrop-filter:saturate(200%) blur(28px);
  -webkit-backdrop-filter:saturate(200%) blur(28px);
  border-bottom:1px solid rgba(${T.g},.15);
  box-shadow:0 4px 24px rgba(0,0,0,.28);
}

/* ── GLASS STAT ── */
.glass-stat{
  background:linear-gradient(135deg,rgba(${T.g},.09) 0%,rgba(255,255,255,.02) 100%);
  backdrop-filter:saturate(200%) blur(18px);
  -webkit-backdrop-filter:saturate(200%) blur(18px);
  border:1px solid rgba(${T.g},.18);
  border-top:1px solid rgba(255,255,255,.1);
  box-shadow:0 4px 20px rgba(0,0,0,.3);
  border-radius:14px;padding:1.25rem 1.1rem;text-align:center;
  transition:all .35s cubic-bezier(.22,1,.36,1);position:relative;overflow:hidden;
}
.glass-stat::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,rgba(${T.g},.6),rgba(${T.g2},.8));
  transform:scaleX(0);transition:transform .35s;transform-origin:left}
.glass-stat:hover{transform:translateY(-6px);border-color:rgba(${T.g},.42);box-shadow:0 18px 48px rgba(0,0,0,.45)}
.glass-stat:hover::after{transform:scaleX(1)}

/* ── GLASS MINI ── */
.glass-mini{
  background:rgba(0,0,0,.18);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(${T.g},.14);border-top:1px solid rgba(255,255,255,.07);
  box-shadow:0 2px 12px rgba(0,0,0,.25);border-radius:12px;
  padding:.9rem 1rem;display:flex;align-items:center;gap:.85rem;
  transition:all .28s cubic-bezier(.22,1,.36,1);
}
.glass-mini:hover{border-color:rgba(${T.g},.36);transform:translateX(4px);box-shadow:0 6px 24px rgba(0,0,0,.35),3px 0 0 rgba(${T.g},.5) inset}

/* ── INPUTS ── */
.inp{
  background:rgba(0,0,0,.28);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border:1px solid rgba(${T.g},.24);border-top:1px solid rgba(255,255,255,.06);
  border-radius:10px;color:${T.t1};
  padding:.72rem 1rem;font-family:'Rajdhani',sans-serif;
  font-size:.94rem;font-weight:500;
  transition:border-color .25s,box-shadow .25s;width:100%;
}
.inp:focus{outline:none;background:rgba(0,0,0,.38);border-color:rgba(${T.g},.65);box-shadow:0 0 0 3px rgba(${T.g},.14),0 0 18px rgba(${T.g},.1)}
.inp::placeholder{color:rgba(${T.g},.45)}
.inp option{background:${T.bg2};color:${T.t1}}
.lbl{font-size:.73rem;font-weight:700;color:rgba(${T.g2},.85);margin-bottom:.4rem;display:block;letter-spacing:.4px;text-transform:uppercase}

/* ── BUTTONS ── */
.btn{
  font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.9rem;
  padding:.62rem 1.45rem;
  background:linear-gradient(135deg,rgba(${T.g},.9),rgba(${T.g2},.85));
  backdrop-filter:blur(10px);
  border:1px solid rgba(${T.g},.5);border-top:1px solid rgba(255,255,255,.15);
  border-radius:10px;color:#fff;cursor:pointer;
  transition:all .28s cubic-bezier(.22,1,.36,1);
  position:relative;overflow:hidden;white-space:nowrap;
  display:inline-flex;align-items:center;gap:.45rem;
  box-shadow:0 4px 14px rgba(${T.g},.28),0 1px 0 rgba(255,255,255,.1) inset;
}
.btn::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transition:left .55s}
.btn:hover::before{left:100%}
.btn:hover{transform:translateY(-2.5px);box-shadow:0 8px 28px rgba(${T.g},.48)}
.btn:active{transform:scale(.97)}
.btn:disabled{opacity:.4;pointer-events:none}
.ghost{background:rgba(${T.g},.07);border:1px solid rgba(${T.g},.26);color:${T.t2};backdrop-filter:blur(10px);box-shadow:none}
.ghost:hover{background:rgba(${T.g},.14);border-color:rgba(${T.g},.48);color:${T.t1};transform:translateY(-1.5px)}
.sm{padding:.36rem .9rem;font-size:.8rem}
.btn-d{background:linear-gradient(135deg,rgba(153,27,27,.85),rgba(220,38,38,.8))!important;border-color:rgba(239,68,68,.45)!important}
.btn-p{background:linear-gradient(135deg,rgba(76,29,149,.85),rgba(124,58,237,.8))!important;border-color:rgba(124,58,237,.45)!important}

/* ── STATUS CHIPS ── */
.s-sub{background:rgba(99,102,241,.12);color:#818CF8;border:1px solid rgba(99,102,241,.28)}
.s-int{background:rgba(245,158,11,.12);color:#FCD34D;border:1px solid rgba(245,158,11,.28)}
.s-wait{background:rgba(107,114,128,.12);color:#9CA3AF;border:1px solid rgba(107,114,128,.28)}
.s-rej{background:rgba(239,68,68,.12);color:#FCA5A5;border:1px solid rgba(239,68,68,.28)}
.s-off{background:rgba(168,85,247,.12);color:#D8B4FE;border:1px solid rgba(168,85,247,.28)}
.s-ok{background:rgba(0,210,160,.12);color:#00D2A0;border:1px solid rgba(0,210,160,.28)}
.iv-s{background:rgba(249,115,22,.12);color:#FB923C;border:1px solid rgba(249,115,22,.28)}
.iv-d{background:rgba(0,210,160,.12);color:#00D2A0;border:1px solid rgba(0,210,160,.28)}
.iv-p{background:rgba(245,158,11,.12);color:#FCD34D;border:1px solid rgba(245,158,11,.28)}
.iv-r{background:rgba(239,68,68,.12);color:#FCA5A5;border:1px solid rgba(239,68,68,.28)}
.chip{display:inline-flex;align-items:center;gap:.28rem;padding:.18rem .65rem;border-radius:20px;font-size:.7rem;font-weight:700;letter-spacing:.3px;white-space:nowrap;backdrop-filter:blur(8px)}

/* ── KW CHIPS ── */
.kw-m{background:rgba(0,210,160,.1);color:#00D2A0;border:1px solid rgba(0,210,160,.3)}
.kw-x{background:rgba(255,77,109,.1);color:#FF4D6D;border:1px solid rgba(255,77,109,.3)}
.kw-e{background:rgba(96,165,250,.1);color:#60A5FA;border:1px solid rgba(96,165,250,.3)}
.kw{display:inline-flex;align-items:center;padding:.28rem .8rem;border-radius:20px;font-size:.76rem;font-weight:600;margin:.2rem;cursor:default;backdrop-filter:blur(8px);transition:transform .2s,filter .2s;animation:popIn .35s cubic-bezier(.22,1,.36,1) both}
.kw:hover{transform:scale(1.07) translateY(-2px);filter:brightness(1.2)}

/* ── TABLE ── */
.tbl{width:100%;border-collapse:collapse;font-size:.84rem}
.tbl th{font-family:'Orbitron',sans-serif;font-size:.62rem;font-weight:700;color:rgba(${T.g2},.8);letter-spacing:.9px;text-transform:uppercase;padding:.75rem 1rem;text-align:left;border-bottom:1px solid rgba(${T.g},.18);background:rgba(0,0,0,.2);backdrop-filter:blur(12px);white-space:nowrap}
.tbl td{padding:.72rem 1rem;border-bottom:1px solid rgba(${T.g},.06);color:${T.t2};vertical-align:middle}
.tbl tbody tr{transition:background .18s,transform .18s}
.tbl tbody tr:hover{background:rgba(${T.g},.07);transform:translateX(3px)}

/* ── ACTION BUTTONS ── */
.ab{width:32px;height:32px;border-radius:8px;border:1.5px solid;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .22s cubic-bezier(.22,1,.36,1);backdrop-filter:blur(8px)}
.av{background:rgba(79,70,229,.14);border-color:rgba(99,102,241,.38);color:#A5B4FC}
.av:hover{background:rgba(79,70,229,.38);border-color:#818CF8;transform:translateY(-3px) scale(1.12);box-shadow:0 6px 18px rgba(79,70,229,.38)}
.ae{background:rgba(180,100,0,.14);border-color:rgba(245,158,11,.38);color:#FCD34D}
.ae:hover{background:rgba(180,100,0,.38);border-color:#FBBF24;transform:translateY(-3px) scale(1.12)}
.ad{background:rgba(185,28,28,.14);border-color:rgba(239,68,68,.38);color:#FCA5A5}
.ad:hover{background:rgba(185,28,28,.38);border-color:#F87171;transform:translateY(-3px) scale(1.12)}

/* ── MISC COMPONENTS ── */
.avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:.64rem;font-weight:700;color:#fff;text-transform:uppercase;transition:transform .22s;box-shadow:0 2px 8px rgba(0,0,0,.3)}
tr:hover .avatar{transform:scale(1.12)}
.rn{width:22px;height:22px;border-radius:6px;background:rgba(${T.g},.12);border:1px solid rgba(${T.g},.22);display:inline-flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:.58rem;font-weight:700;color:rgba(${T.g},.9)}
.pg{padding:.28rem .75rem;border-radius:7px;border:1px solid rgba(${T.g},.2);background:rgba(0,0,0,.2);backdrop-filter:blur(10px);color:${T.t3};font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.75rem;cursor:pointer;transition:all .18s;white-space:nowrap}
.pg:hover{background:rgba(${T.g},.14);color:${T.lit};border-color:rgba(${T.g},.42)}
.pg.on{background:rgba(${T.g},.7);color:#fff;border-color:transparent;box-shadow:0 2px 10px rgba(${T.g},.35)}
.pg:disabled{opacity:.3;pointer-events:none}

/* ── MODAL ── */
.mov{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9000;display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(10px)}
.mbox{background:linear-gradient(145deg,rgba(${T.g},.1),rgba(0,0,0,.6));backdrop-filter:saturate(200%) blur(30px);border:1px solid rgba(${T.g},.28);border-top:1px solid rgba(255,255,255,.12);box-shadow:0 24px 64px rgba(0,0,0,.75);border-radius:18px;width:100%;max-width:720px;max-height:92vh;overflow-y:auto;animation:popIn .32s cubic-bezier(.22,1,.36,1) both}

/* ── TOAST ── */
.toast{padding:.75rem 1.4rem;border-radius:14px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.9rem;backdrop-filter:blur(20px);max-width:340px;display:flex;align-items:center;gap:.6rem;animation:slideL .32s cubic-bezier(.22,1,.36,1) both;border-top:1px solid rgba(255,255,255,.09);box-shadow:0 8px 24px rgba(0,0,0,.5)}

/* ── SIDEBAR LINKS ── */
.sb{display:flex;align-items:center;gap:.7rem;padding:.68rem 1rem;margin:.08rem .45rem;color:${T.t2};border-radius:10px;border-left:3px solid transparent;font-weight:600;font-size:.84rem;cursor:pointer;transition:all .24s cubic-bezier(.22,1,.36,1);position:relative;overflow:hidden;background:transparent;border-top:none;border-right:none;border-bottom:none;width:calc(100% - .9rem);text-align:left}
.sb::before{content:'';position:absolute;inset:0;border-radius:10px;background:linear-gradient(90deg,rgba(${T.g},.13),transparent);opacity:0;transition:opacity .24s}
.sb:hover{color:${T.t1};border-left-color:rgba(${T.g},.7);transform:translateX(4px)}
.sb:hover::before{opacity:1}
.sb.on{background:rgba(${T.g},.13);border-left-color:${T.lit};color:${T.acc}}
.sb.on::before{opacity:1}

/* ── MATCH BAR ── */
.bt{height:10px;border-radius:10px;background:rgba(255,255,255,.06);overflow:hidden}
.bf{height:100%;border-radius:10px;position:relative;overflow:hidden;transition:width 1.2s cubic-bezier(.4,0,.2,1)}
.bf::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);animation:shimmer 2s infinite}

/* ── CLOCK / TZ ── */
.clk{display:flex;flex-direction:column;align-items:center;gap:.2rem;padding:.55rem .85rem;border-radius:12px;background:rgba(0,0,0,.18);backdrop-filter:blur(12px);border:1px solid rgba(${T.g},.14);transition:all .3s cubic-bezier(.22,1,.36,1)}
.clk:hover{background:rgba(${T.g},.14);border-color:rgba(${T.g},.42);transform:translateY(-4px) scale(1.06);box-shadow:0 10px 28px rgba(0,0,0,.35)}
.tzc{background:rgba(0,0,0,.2);backdrop-filter:blur(16px);border:1px solid rgba(${T.g},.14);border-top:1px solid rgba(255,255,255,.06);border-radius:14px;padding:1.1rem 1.3rem;transition:all .3s cubic-bezier(.22,1,.36,1)}
.tzc:hover{border-color:rgba(${T.g},.4);transform:translateY(-5px) scale(1.02);box-shadow:0 16px 40px rgba(0,0,0,.45)}
.tzc.src{border-color:rgba(74,222,128,.35);background:rgba(74,222,128,.05)}

/* ── KANBAN ── */
.kb-col{background:rgba(0,0,0,.18);backdrop-filter:blur(18px);border:1px solid rgba(${T.g},.12);border-top:1px solid rgba(255,255,255,.05);border-radius:14px;padding:.75rem;min-height:200px;flex:1;min-width:165px;transition:border-color .2s}
.kb-card{background:rgba(0,0,0,.22);backdrop-filter:blur(14px);border:1px solid rgba(${T.g},.13);border-top:1px solid rgba(255,255,255,.05);border-radius:11px;padding:.9rem 1rem;margin-bottom:.6rem;cursor:grab;transition:all .24s cubic-bezier(.22,1,.36,1);animation:popIn .3s both;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.kb-card:hover{border-color:rgba(${T.g},.38);transform:translateY(-2px) scale(1.01);box-shadow:0 8px 24px rgba(0,0,0,.4)}

/* ── EMAIL ITEM ── */
.ei{display:flex;justify-content:space-between;align-items:center;padding:.7rem 1rem;border-radius:10px;margin-bottom:.4rem;border-left:3px solid rgba(${T.g},.6);background:rgba(0,0,0,.18);backdrop-filter:blur(12px);transition:all .22s;animation:popIn .3s both}
.ei:hover{border-left-color:rgba(${T.g2},1);background:rgba(${T.g},.08);transform:translateX(4px)}

/* ── CHAT ── */
.cu{background:linear-gradient(135deg,rgba(${T.g},.18),rgba(${T.g2},.1));border:1px solid rgba(${T.g},.26);border-top:1px solid rgba(255,255,255,.09);color:${T.t1};margin-left:auto;max-width:82%;backdrop-filter:blur(14px)}
.cb{background:rgba(0,0,0,.25);backdrop-filter:blur(14px);border:1px solid rgba(${T.g},.14);border-top:1px solid rgba(255,255,255,.05);color:${T.t2};align-self:flex-start;max-width:84%}
.cm{border-radius:14px;padding:.88rem 1.1rem;animation:slideL .3s both;line-height:1.68;font-size:.88rem;white-space:pre-wrap}

/* ── UPLOAD ── */
.upz{border:2px dashed rgba(${T.g},.3);border-radius:14px;padding:2rem;text-align:center;cursor:pointer;transition:all .3s;background:rgba(0,0,0,.12);backdrop-filter:blur(10px)}
.upz:hover,.upz.drag{border-color:rgba(${T.g},.68);background:rgba(${T.g},.06);transform:scale(1.01)}
.upz.ok{border-color:rgba(0,210,160,.48);background:rgba(0,210,160,.05)}

/* ── NOTIF ── */
.ni{display:flex;align-items:flex-start;gap:.85rem;padding:.88rem 1rem;border-radius:12px;margin-bottom:.55rem;border-left:3px solid;background:rgba(0,0,0,.18);backdrop-filter:blur(12px);transition:all .22s;animation:slideL .3s both}
.ni:hover{transform:translateX(4px);background:rgba(0,0,0,.28)}

/* ── ACTIVITY ── */
.ai-item{display:flex;align-items:flex-start;gap:.75rem;padding:.65rem .88rem;border-radius:10px;margin-bottom:.4rem;background:rgba(0,0,0,.18);backdrop-filter:blur(10px);border-left:2px solid;transition:all .2s;animation:slideL .3s both}
.ai-item:hover{background:rgba(0,0,0,.32);transform:translateX(3px)}

/* ── TOUR ── */
.tour-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9990;backdrop-filter:blur(6px);pointer-events:none}
.tour-box{position:fixed;background:linear-gradient(145deg,rgba(${T.g},.12),rgba(0,0,0,.65));backdrop-filter:saturate(200%) blur(30px);border:1px solid rgba(${T.g},.38);border-top:1px solid rgba(255,255,255,.12);border-radius:18px;padding:1.4rem 1.6rem;max-width:340px;z-index:9992;box-shadow:0 12px 48px rgba(0,0,0,.75);animation:popIn .3s cubic-bezier(.22,1,.36,1) both}

/* ── SEARCH OVERLAY ── */
.so{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9998;display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;backdrop-filter:blur(12px);animation:fadeUp .22s both}
.sr-item{display:flex;align-items:center;gap:.85rem;padding:.88rem 1rem;border-radius:12px;cursor:pointer;transition:all .18s;margin-bottom:.4rem;animation:slideL .3s both}
.sr-item:hover{background:rgba(${T.g},.12)}

/* ── SCORE RING ── */
.ring-c{transition:stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)}

/* ── PREP QUESTION ── */
.pq{padding:.85rem 1rem;border-radius:12px;margin-bottom:.55rem;background:rgba(0,0,0,.18);backdrop-filter:blur(10px);border-left:3px solid;transition:all .22s;animation:slideL .3s both}
.pq:hover{transform:translateX(4px);background:rgba(0,0,0,.28)}

/* ── HEATMAP ── */
.hmc{width:26px;height:26px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:700;cursor:pointer;transition:transform .18s,filter .18s;border:1px solid rgba(255,255,255,.05)}
.hmc:hover{transform:scale(1.3);filter:brightness(1.5);z-index:1}

/* ── WELCOME ── */
.wl{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;overflow:hidden;transition:opacity .9s,transform .9s;background:radial-gradient(ellipse at 50% 45%,${T.bg2} 0%,${T.bg} 100%)}
.wl.gone{opacity:0;transform:scale(1.06) translateY(-20px);pointer-events:none}
.scan-line::after{content:'';position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(${T.g},.7),rgba(${T.g2},.9),rgba(${T.g},.7),transparent);box-shadow:0 0 20px rgba(${T.g},.5);animation:scanLine 4s ease-in-out infinite;pointer-events:none;z-index:1}

/* ── RESPONSIVE ── */
@media(max-width:767px){.mob-hide{display:none!important}.grid2{grid-template-columns:1fr!important}}
@media print{.no-print{display:none!important}}
`;
}

/* ─────────────────────────────────────────────
   SHARED UI
───────────────────────────────────────────── */
function Toasts({ list }) {
  return (
    <div style={{position:"fixed",bottom:"1.5rem",right:"1.5rem",zIndex:99999,display:"flex",flexDirection:"column",gap:".5rem",pointerEvents:"none"}}>
      {list.map(t=>(
        <div key={t.id} className="toast" style={{
          background:t.t==="ok"?"rgba(0,210,160,.12)":t.t==="err"?"rgba(255,77,109,.12)":t.t==="warn"?"rgba(252,211,77,.1)":"rgba(96,165,250,.12)",
          border:`1px solid ${t.t==="ok"?"rgba(0,210,160,.38)":t.t==="err"?"rgba(255,77,109,.38)":t.t==="warn"?"rgba(252,211,77,.28)":"rgba(96,165,250,.38)"}`,
          color:t.t==="ok"?"#00D2A0":t.t==="err"?"#FF4D6D":t.t==="warn"?"#FCD34D":"#60A5FA"
        }}>{t.t==="ok"?"✓":t.t==="err"?"✗":t.t==="warn"?"⚠":"ℹ"} {t.m}</div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="mov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="mbox">
        <div style={{padding:"1.1rem 1.4rem",borderBottom:"1px solid rgba(255,255,255,.07)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,.2)",position:"sticky",top:0,zIndex:10,borderRadius:"18px 18px 0 0"}}>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:".9rem",fontWeight:700,color:"#FADADD",display:"flex",alignItems:"center",gap:".5rem"}}>{title}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:"#C48888",cursor:"pointer",fontSize:"1.1rem",transition:"background .2s"}} onMouseOver={e=>e.currentTarget.style.background="rgba(255,77,109,.2)"} onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>×</button>
        </div>
        <div style={{padding:"1.5rem"}}>{children}</div>
        {footer&&<div style={{padding:".9rem 1.4rem",borderTop:"1px solid rgba(255,255,255,.06)",background:"rgba(0,0,0,.2)",display:"flex",gap:".75rem",justifyContent:"flex-end",position:"sticky",bottom:0,borderRadius:"0 0 18px 18px"}}>{footer}</div>}
      </div>
    </div>
  );
}

function ScoreRing({ score, size=128 }) {
  const r=size/2-9, c=2*Math.PI*r;
  const col=score>=70?"#00D2A0":score>=40?"#E06020":"#FF4D6D";
  return (
    <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,.06)" strokeWidth={9} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={col} strokeWidth={9} fill="none" strokeDasharray={c} strokeDashoffset={c-c*(score/100)} strokeLinecap="round" className="ring-c"/>
      </svg>
      <div style={{position:"absolute",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.45rem",fontWeight:900,color:col,lineHeight:1,textShadow:`0 0 16px ${col}`}}>{score}%</span>
        <span style={{fontSize:".58rem",color:"#C48888",letterSpacing:".5px",fontWeight:700}}>MATCH</span>
      </div>
    </div>
  );
}

function Paginator({ total, page, ps, setPage }) {
  const pages=Math.max(1,Math.ceil(total/ps));
  if(pages<=1) return null;
  const s=(page-1)*ps+1, e=Math.min(page*ps,total);
  const gs=Math.max(1,Math.min(page-3,pages-6)), ge=Math.min(pages,gs+6);
  return (
    <div style={{display:"flex",gap:".3rem",flexWrap:"wrap",alignItems:"center",marginTop:".85rem",paddingTop:".75rem",borderTop:"1px solid rgba(255,255,255,.06)"}}>
      <button className="pg" onClick={()=>setPage(1)} disabled={page<=1}>«</button>
      <button className="pg" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>‹</button>
      {gs>1&&<><button className="pg" onClick={()=>setPage(1)}>1</button><span style={{color:"#C48888"}}>…</span></>}
      {Array.from({length:ge-gs+1},(_,j)=>{const p=gs+j;return <button key={p} className={`pg${p===page?" on":""}`} onClick={()=>setPage(p)}>{p}</button>;})}
      {ge<pages&&<><span style={{color:"#C48888"}}>…</span><button className="pg" onClick={()=>setPage(pages)}>{pages}</button></>}
      <button className="pg" onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page>=pages}>›</button>
      <button className="pg" onClick={()=>setPage(pages)} disabled={page>=pages}>»</button>
      <span style={{fontSize:".74rem",color:"#C48888",marginLeft:".3rem"}}>{s}–{e} of {total}</span>
    </div>
  );
}

function TTbar({ total, page, ps, onSize }) {
  const s=(page-1)*ps+1, e=Math.min(page*ps,total);
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:".6rem",padding:".6rem .9rem",background:"rgba(0,0,0,.18)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,.05)",borderRadius:10,marginBottom:".85rem"}}>
      <div style={{display:"flex",gap:".25rem",background:"rgba(0,0,0,.2)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:".15rem"}}>
        {[10,25,50,"All"].map(n=>{const v=n==="All"?9999:n;return <button key={n} className="pg" onClick={()=>onSize(v)} style={ps===v?{background:"rgba(255,255,255,.14)",color:"#fff",borderColor:"transparent"}:{}}>{n}</button>;})}
      </div>
      <span style={{fontSize:".74rem",color:"#C48888"}}>{total>0?s:0}–{e} of <strong style={{color:"#F0B8BE"}}>{total}</strong></span>
    </div>
  );
}

function CandForm({ data, onChange }) {
  const set=k=>e=>onChange({...data,[k]:e.target.value});
  const fi=(l,k,tp="text",ph="")=><div key={k}><label className="lbl">{l}</label><input className="inp" type={tp} value={data[k]||""} onChange={set(k)} placeholder={ph}/></div>;
  const fs=(l,k,opts)=><div key={k}><label className="lbl">{l}</label><select className="inp" value={data[k]||""} onChange={set(k)}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>;
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".85rem"}}>
      {fs("Category","category",["IT","Non-IT","Support","Management"])}
      {fi("Date","date","date")}
      {fi("Candidate Name *","candidateName","text","Full name")}
      {fi("Vendor Name","vendorName","text","Vendor")}
      {fi("Phone","phoneNumber","tel","+1 555 000")}
      {fi("Email","email","email","email@domain.com")}
      {fi("Client *","client","text","Company")}
      {fi("Role *","role","text","Job title")}
      {fi("Location","location","text","City, State")}
      {fi("Rate ($/hr)","rate","number","0")}
      {fs("Status","status",STATUSES)}
      <div><label className="lbl">Notes</label><textarea className="inp" rows={2} value={data.notes||""} onChange={set("notes")} style={{resize:"vertical"}}/></div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WELCOME SCREEN
───────────────────────────────────────────── */
function Welcome({ T, onEnter }) {
  const [msg,setMsg]=useState(""), [gone,setGone]=useState(false);
  const sc=["BOOT SEQUENCE...","SYSTEM ONLINE ✓","HI HEMANTH! 👋","ATS v3.0 READY","LET'S CRUSH IT! 🚀"];
  const idx=useRef(0), ch=useRef(0), dl=useRef(false), tm=useRef();
  useEffect(()=>{
    const tick=()=>{
      const cur=sc[idx.current];
      if(!dl.current){ch.current++;setMsg(cur.slice(0,ch.current));
        if(ch.current>=cur.length){tm.current=setTimeout(()=>{dl.current=true;tick();},1100);return;}
        tm.current=setTimeout(tick,68+Math.random()*22);
      }else{
        setMsg(p=>{if(p.length<=0){dl.current=false;ch.current=0;idx.current=(idx.current+1)%sc.length;tm.current=setTimeout(tick,300);return p;}ch.current--;return p.slice(0,-1);});
        tm.current=setTimeout(tick,36);
      }
    };
    tm.current=setTimeout(tick,500);
    return()=>clearTimeout(tm.current);
  },[]);
  const go=()=>{setGone(true);setTimeout(onEnter,900);};
  return (
    <div className={`wl scan-line${gone?" gone":""}`}>
      <div className="bg-canvas"/><div className="grid-canvas"/>
      <div style={{position:"relative",zIndex:2,textAlign:"center",padding:"2rem 1.5rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.4rem",maxWidth:680}}>
        {/* Robot + orbit rings */}
        <div style={{position:"relative",width:200,height:200}}>
          {[{w:155,d:"7s",rev:false},{w:200,d:"13s",rev:true}].map(({w,d,rev},ri)=>(
            <div key={ri} style={{position:"absolute",top:"50%",left:"50%",width:w,height:w,borderRadius:"50%",border:`1px solid rgba(${T.g},${ri===0?".22":".1"})`,transform:"translate(-50%,-50%)",animation:`orbit ${d} linear infinite ${rev?"reverse":""}`}}>
              <div style={{position:"absolute",top:-4,left:"50%",marginLeft:-4,width:8,height:8,borderRadius:"50%",background:ri===0?T.lit:T.acc,boxShadow:`0 0 ${ri===0?"14px":"9px"} ${ri===0?T.lit:T.acc}`}}/>
            </div>
          ))}
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-60%)",animation:"floatY 3s ease-in-out infinite"}}>
            <div style={{fontSize:"5.5rem",lineHeight:1,filter:`drop-shadow(0 0 22px rgba(${T.g},.55))`}}>🤖</div>
            {/* Glassmorphism speech bubble */}
            <div style={{position:"absolute",top:8,right:-112,background:"rgba(0,0,0,.45)",backdropFilter:"blur(22px)",border:`1px solid rgba(${T.g},.4)`,borderTop:"1px solid rgba(255,255,255,.11)",borderRadius:"14px 14px 14px 0",padding:".6rem 1rem",minWidth:175,boxShadow:`0 8px 24px rgba(0,0,0,.5),0 0 20px rgba(${T.g},.12)`,animation:"popIn .4s both"}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".7rem",fontWeight:700,color:T.lit,minHeight:"1.1rem"}}>{msg}<span style={{display:"inline-block",width:2,height:".85em",background:T.lit,marginLeft:1,verticalAlign:"middle",animation:"glowBeat .7s step-end infinite"}}/></div>
              <div style={{display:"flex",alignItems:"center",gap:".3rem",marginTop:".3rem",fontSize:".6rem",color:T.t3}}><span style={{width:5,height:5,borderRadius:"50%",background:"#4ade80",animation:"pulse .8s ease-in-out infinite",display:"inline-block"}}/>ONLINE · NO API KEY NEEDED</div>
            </div>
          </div>
        </div>
        <div style={{animation:"fadeUp .7s .3s both"}}>
          <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(1.8rem,5vw,3rem)",fontWeight:900,background:`linear-gradient(135deg,rgba(${T.g},1),rgba(${T.g2},1),${T.acc})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-1px",marginBottom:".3rem"}}>Hi Hemanth 👋</h1>
          <p style={{fontSize:".76rem",color:T.t3,letterSpacing:"3px",textTransform:"uppercase",fontFamily:"'Orbitron',sans-serif"}}>ATS Intelligence System v3.0 — Full Stack Edition</p>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:".4rem",justifyContent:"center",maxWidth:640,animation:"fadeUp .6s .7s both"}}>
          {["📊 Dashboard","🤖 AI Matcher","👥 Candidates","🗓 Interviews","📈 Analytics","📧 Email","🕐 Timezone","💬 AI Chat","🎯 Prep Gen","🔍 Search","🎨 5 Themes","🔑 API Keys"].map(t=>(
            <span key={t} style={{padding:".22rem .7rem",borderRadius:20,fontSize:".72rem",fontWeight:600,background:`rgba(${T.g},.08)`,backdropFilter:"blur(10px)",border:`1px solid rgba(${T.g},.2)`,borderTop:"1px solid rgba(255,255,255,.07)",color:T.acc}}>{t}</span>
          ))}
        </div>
        <div style={{animation:"fadeUp .6s 1s both",display:"flex",flexDirection:"column",alignItems:"center",gap:".75rem"}}>
          <button className="btn" onClick={go} style={{fontSize:"1.05rem",padding:".92rem 2.8rem",borderRadius:50,boxShadow:`0 0 35px rgba(${T.g},.48),0 8px 20px rgba(0,0,0,.4)`}}>🚀 Let's Start</button>
          <div style={{padding:".5rem 1rem",borderRadius:12,background:"rgba(0,210,160,.08)",backdropFilter:"blur(12px)",border:"1px solid rgba(0,210,160,.2)",fontSize:".78rem",color:"#00D2A0"}}>✨ AI Chat works out-of-the-box — no API key needed!</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ONBOARDING TOUR
───────────────────────────────────────────── */
function Tour({ T, onDone }) {
  const [step,setStep]=useState(0);
  const steps=[
    {e:"🚀",t:"Welcome to ATS v3.0!",d:"A full-stack AI recruitment platform with glassmorphism UI, 5 themes, and OpenCode Zen AI — add your own API key in Settings for unlimited use!"},

    {e:"🤖",t:"AI ATS Matcher",d:"Paste a JD + resume. AI scores the match 0–100, identifies missing skills, and gives specific improvement tips."},

    {e:"💬",t:"AI Chat — Ready to Use!",d:"Chat with the built-in AI. Ask anything about recruiting, JD writing, candidate tips. Works right here!"},

    {e:"🔑",t:"API Key Manager",d:"Go to Settings → API Keys, paste your sk-... key from OpenCode Zen. It is saved and injected into all AI features automatically."},
    {e:"🎨",t:"5 Glassmorphism Themes",d:"Switch between Rust Dark, Midnight, Emerald, Violet, and Rose Gold using the theme selector in the topbar."},
  ];
  const cur=steps[step], last=step===steps.length-1;
  return (
    <>
      <div className="tour-bg"/>
      <div className="tour-box" style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}>
        <button onClick={onDone} style={{position:"absolute",top:".5rem",right:".75rem",background:"none",border:"none",color:"#C48888",cursor:"pointer",fontSize:".75rem",fontFamily:"'Rajdhani',sans-serif",fontWeight:700}}>Skip</button>
        <div style={{fontSize:"2.8rem",textAlign:"center",marginBottom:".6rem"}}>{cur.e}</div>
        <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,color:"#FADADD",fontSize:".88rem",marginBottom:".6rem",textAlign:"center"}}>{cur.t}</div>
        <p style={{color:"#F0B8BE",fontSize:".85rem",lineHeight:1.68,textAlign:"center",marginBottom:"1.2rem"}}>{cur.d}</p>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:".3rem"}}>{steps.map((_,i)=><div key={i} style={{width:i===step?20:7,height:7,borderRadius:4,background:i===step?`rgba(${T.g},1)`:i<step?`rgba(${T.g},.4)`:"rgba(255,255,255,.1)",transition:"all .3s"}}/>)}</div>
          <div style={{display:"flex",gap:".5rem"}}>
            {step>0&&<button className="btn ghost sm" onClick={()=>setStep(s=>s-1)}>‹ Back</button>}
            <button className="btn sm" onClick={()=>last?onDone():setStep(s=>s+1)}>{last?"Let's Go 🚀":"Next ›"}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   GLOBAL SEARCH
───────────────────────────────────────────── */
function GlobalSearch({ cands, ivs, T, onNav, onClose }) {
  const [q,setQ]=useState("");
  const ref=useRef();
  useEffect(()=>{setTimeout(()=>ref.current?.focus(),60);},[]);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  const hi=text=>{if(!q.trim()||!text.toLowerCase().includes(q.toLowerCase()))return text;const i=text.toLowerCase().indexOf(q.toLowerCase());return <>{text.slice(0,i)}<mark style={{background:`rgba(${T.g},.35)`,color:T.t1,borderRadius:3,padding:"0 2px"}}>{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length)}</>;};
  const results=useMemo(()=>{
    if(q.trim().length<2)return[];
    const lq=q.toLowerCase(), out=[];
    cands.forEach(c=>{if([c.candidateName,c.client,c.role,c.email,c.vendorName,c.location,c.phoneNumber,c.category,c.notes,c.status,c.source,c.rate].some(v=>(v||"").toLowerCase().includes(lq)))out.push({type:"candidate",e:"👤",color:"#818CF8",id:c.id,title:c.candidateName||"—",sub:`${c.client||""} · ${c.role||""} · ${c.status||""}`,page:"candidates"});});
    ivs.forEach(iv=>{if([iv.candidateName,iv.client,iv.round,iv.status,iv.mode,iv.timezone].some(v=>(v||"").toLowerCase().includes(lq)))out.push({type:"interview",e:"🗓",color:"#90CAF9",id:iv.id,title:iv.candidateName||"—",sub:`${iv.client||""} · ${iv.date||""} · ${iv.status||""}`,page:"interviews"});});
    out.sort((a,b)=>{
      const aTitle=(a.title||"").toLowerCase().includes(lq)?1:0;
      const bTitle=(b.title||"").toLowerCase().includes(lq)?1:0;
      if(aTitle!==bTitle)return bTitle-aTitle;
      const aSub=(a.sub||"").toLowerCase().includes(lq)?1:0;
      const bSub=(b.sub||"").toLowerCase().includes(lq)?1:0;
      return bSub-aSub;
    });
    return out.slice(0,12);
  },[q,cands,ivs]);
  return (
    <div className="so" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",maxWidth:660}}>
        <div style={{position:"relative",marginBottom:"1rem"}}>
          <span style={{position:"absolute",left:"1rem",top:"50%",transform:"translateY(-50%)",fontSize:"1.1rem"}}>🔍</span>
          <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search candidates, interviews… (Esc to close)"
            style={{background:"rgba(0,0,0,.55)",backdropFilter:"blur(24px)",border:`1px solid rgba(${T.g},.45)`,borderTop:"1px solid rgba(255,255,255,.1)",borderRadius:16,color:T.t1,padding:"1rem 1rem 1rem 3rem",width:"100%",fontSize:"1.05rem",fontFamily:"'Rajdhani',sans-serif",fontWeight:600,boxShadow:`0 0 40px rgba(${T.g},.18)`,outline:"none"}}/>
          <button onClick={onClose} style={{position:"absolute",right:".75rem",top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:"#C48888",cursor:"pointer",fontSize:"1.1rem"}}>×</button>
        </div>
        {q.length<2&&<div style={{textAlign:"center",padding:"2rem",color:"#C48888",fontSize:".88rem"}}>Type at least 2 characters to search all records…</div>}
        {q.length>=2&&results.length===0&&<div style={{textAlign:"center",padding:"2rem",color:"#C48888",fontSize:".88rem"}}>No results for "<strong style={{color:T.lit}}>{q}</strong>"</div>}
        {results.map((r,i)=>(
          <div key={r.id+r.type} className="sr-item" style={{animationDelay:i*.03+"s",background:"rgba(0,0,0,.32)",backdropFilter:"blur(16px)",border:`1px solid rgba(${T.g},.12)`,borderRadius:12}} onClick={()=>{onNav(r.page);onClose();}}>
            <div style={{width:40,height:40,borderRadius:10,background:r.color+"22",border:`1px solid ${r.color}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"1.1rem"}}>{r.e}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,color:T.t1,fontSize:".9rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hi(r.title)}</div>
              <div style={{fontSize:".74rem",color:T.t3,marginTop:".1rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.sub}</div>
            </div>
            <span style={{padding:".15rem .5rem",borderRadius:6,background:r.color+"22",fontSize:".65rem",fontWeight:700,color:r.color,flexShrink:0}}>{r.type}</span>
          </div>
        ))}
        {results.length>0&&<div style={{textAlign:"center",marginTop:".75rem",fontSize:".74rem",color:"#C48888"}}>{results.length} result{results.length!==1?"s":""} · Esc to close</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────── */
const NAV=[
  {id:"dashboard",l:"Dashboard",e:"📊"},{id:"ats",l:"AI Matcher",e:"🤖"},
  {id:"candidates",l:"Candidates",e:"👥"},{id:"interviews",l:"Interviews",e:"🗓"},
  {id:"analytics",l:"Analytics",e:"📈"},
  {id:"email",l:"Email Extractor",e:"📧"},
  {id:"timezone",l:"Timezone",e:"🕐"},{id:"prep",l:"Interview Prep",e:"🎯"},
  {id:"aichat",l:"AI Assistant",e:"💬"},{id:"settings",l:"Settings",e:"⚙️"},
];
function Sidebar({ page, setPage, cands, ivs, mob, setMob, T }) {
  const isMob=window.innerWidth<=767;
  return (
    <>
      {mob&&<div onClick={()=>setMob(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:999,backdropFilter:"blur(4px)"}}/>}
      <nav className="glass-sb" style={{position:"fixed",left:0,top:0,width:255,height:"100vh",zIndex:1000,display:"flex",flexDirection:"column",transform:isMob&&!mob?"translateX(-100%)":"none",transition:"transform .35s cubic-bezier(.22,1,.36,1)"}}>
        <div style={{padding:"1rem 1rem .85rem",borderBottom:`1px solid rgba(${T.g},.16)`,display:"flex",alignItems:"center",gap:".75rem",background:"rgba(0,0,0,.1)"}}>
          <div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,rgba(${T.g},.28),rgba(${T.g2},.18))`,backdropFilter:"blur(10px)",border:`1px solid rgba(${T.g},.38)`,borderTop:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"1.3rem",boxShadow:`0 4px 14px rgba(${T.g},.22)`}}>🤖</div>
          <div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".85rem",fontWeight:700,color:T.t1}}>Hemanth Kumar</div>
            <div style={{display:"flex",alignItems:"center",gap:".3rem",marginTop:".2rem"}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:"#4ade80",animation:"pulse .8s ease-in-out infinite"}}/>
              <span style={{fontSize:".62rem",color:"#4ade80",fontWeight:700,letterSpacing:".5px"}}>CLOUD SYNC</span>
            </div>
          </div>
        </div>
        <div style={{padding:".6rem 1rem",borderBottom:`1px solid rgba(${T.g},.09)`,display:"flex",gap:".5rem"}}>
          {[["👥",cands.length,T.lit],["🗓",ivs.length,"#90CAF9"],["✅",cands.filter(c=>/placed/i.test(c.status||"")).length,"#00D2A0"]].map(([e,v,c])=>(
            <div key={e} style={{flex:1,textAlign:"center",padding:".38rem .2rem",background:"rgba(0,0,0,.2)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.06)",borderRadius:9}}>
              <div style={{fontSize:".9rem"}}>{e}</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".9rem",fontWeight:700,color:c,lineHeight:1}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:".4rem 0"}}>
          {NAV.map(({id,l,e})=>(
            <button key={id} className={`sb${page===id?" on":""}`} onClick={()=>{setPage(id);setMob(false);}}>
              <span style={{fontSize:"1rem",flexShrink:0}}>{e}</span>
              <span style={{flex:1}}>{l}</span>
              {id==="aichat"&&<span style={{width:7,height:7,borderRadius:"50%",background:"#818CF8",boxShadow:"0 0 8px #818CF8",animation:"pulse 1.2s ease-in-out infinite",flexShrink:0}}/>}
              {page===id&&<span style={{width:6,height:6,borderRadius:"50%",background:T.acc,boxShadow:`0 0 8px ${T.acc}`,flexShrink:0}}/>}
            </button>
          ))}
        </div>
        <div style={{padding:".75rem 1rem",borderTop:`1px solid rgba(${T.g},.09)`,background:"rgba(0,0,0,.08)"}}>
          <div style={{fontSize:".64rem",color:T.t3,textAlign:"center",fontFamily:"'Orbitron',sans-serif",lineHeight:1.7}}>ATS Intelligence v3.0<br/><span style={{color:`rgba(${T.g},1)`}}>React · OpenCode Zen · Glassmorphism</span></div>
        </div>
      </nav>
    </>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────── */
const Dashboard=memo(function Dashboard({ cands, ivs, T }) {
  const t=tod(), mon=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().split("T")[0];
  const S=useMemo(()=>({tot:cands.length,cli:new Set(cands.map(c=>c.client).filter(Boolean)).size,iv:ivs.length,placed:cands.filter(c=>/placed/i.test(c.status||"")).length,today:cands.filter(c=>c.date===t).length,month:cands.filter(c=>c.date>=mon).length,rej:cands.filter(c=>/rejected/i.test(c.status||"")).length,offer:cands.filter(c=>/offer/i.test(c.status||"")).length,conv:cands.length?Math.round(cands.filter(c=>/placed|offer/i.test(c.status||"")).length/cands.length*100):0}),[cands,ivs,t,mon]);
  const monthly=useMemo(()=>{const m={};cands.forEach(c=>{if(!c.date)return;const k=c.date.slice(0,7);m[k]=(m[k]||0)+1;});return Object.entries(m).sort().slice(-8).map(([k,v])=>({m:k.slice(5)+"/"+k.slice(2,4),s:v,i:ivs.filter(x=>x.date?.startsWith(k)).length}));},[cands,ivs]);
  const pie=useMemo(()=>{const m={};cands.forEach(c=>{const s=c.status||"Submitted";m[s]=(m[s]||0)+1;});return Object.entries(m).map(([name,value])=>({name,value}));},[cands]);
  const TT={contentStyle:{background:"rgba(0,0,0,.75)",backdropFilter:"blur(16px)",border:`1px solid rgba(${T.g},.28)`,borderRadius:10,fontFamily:"'Rajdhani',sans-serif",color:T.t1}};
  return (
    <div className="page-in">
      <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,display:"flex",alignItems:"center",gap:".6rem",marginBottom:"1.5rem"}}>📊 Dashboard</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:"1rem",marginBottom:"1.4rem"}}>
        {[{l:"Total Candidates",v:S.tot,c:T.lit,e:"👥"},{l:"Unique Clients",v:S.cli,c:"#818CF8",e:"🏢"},{l:"Total Interviews",v:S.iv,c:"#90CAF9",e:"🗓"},{l:"Placed / Offers",v:S.placed,c:T.ok,e:"✅"}].map(({l,v,c,e})=>(
          <div key={l} className="glass-stat">
            <div style={{position:"absolute",top:".9rem",right:".9rem",fontSize:"1.8rem",opacity:.12}}>{e}</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"2.2rem",fontWeight:700,color:c,lineHeight:1,textShadow:`0 0 18px ${c}`}}>{v}</div>
            <div style={{fontSize:".72rem",color:T.t3,marginTop:".4rem",fontWeight:600,letterSpacing:".5px",textTransform:"uppercase"}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.4rem"}} className="grid2">
        <div className="glass">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".78rem",fontWeight:700,color:T.t1,marginBottom:"1rem"}}>📈 Monthly Activity</div>
          {monthly.length>0?<ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly} margin={{top:5,right:10,bottom:5,left:-15}}>
              <defs>
                <linearGradient id="dg1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={`rgba(${T.g},1)`} stopOpacity={.4}/><stop offset="95%" stopColor={`rgba(${T.g},1)`} stopOpacity={0}/></linearGradient>
                <linearGradient id="dg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818CF8" stopOpacity={.35}/><stop offset="95%" stopColor="#818CF8" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
              <XAxis dataKey="m" tick={{fill:T.t3,fontSize:10}}/><YAxis tick={{fill:T.t3,fontSize:10}}/>
              <Tooltip {...TT}/>
              <Area type="monotone" dataKey="s" name="Submissions" stroke={`rgba(${T.g},1)`} fill="url(#dg1)" strokeWidth={2}/>
              <Area type="monotone" dataKey="i" name="Interviews" stroke="#818CF8" fill="url(#dg2)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>:<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:T.t3,fontSize:".84rem"}}>Add candidates to see chart</div>}
        </div>
        <div className="glass">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".78rem",fontWeight:700,color:T.t1,marginBottom:"1rem"}}>🎯 Status Distribution</div>
          {pie.length>0?<div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <ResponsiveContainer width="55%" height={200}><PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={52} outerRadius={84} paddingAngle={3} dataKey="value">{pie.map((_,i)=><Cell key={i} fill={PIE_C[i%PIE_C.length]}/>)}</Pie><Tooltip {...TT}/></PieChart></ResponsiveContainer>
            <div style={{flex:1}}>{pie.map(({name,value},i)=><div key={name} style={{display:"flex",alignItems:"center",gap:".45rem",marginBottom:".4rem",fontSize:".75rem"}}><span style={{width:10,height:10,borderRadius:2,background:PIE_C[i%PIE_C.length],flexShrink:0}}/><span style={{color:T.t2,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span><span style={{color:T.t1,fontWeight:700}}>{value}</span></div>)}</div>
          </div>:<div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:T.t3,fontSize:".84rem"}}>No data yet</div>}
        </div>
      </div>
      <div className="glass">
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".78rem",fontWeight:700,color:T.t1,marginBottom:"1rem"}}>⚡ Activity Metrics</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:".75rem"}}>
          {[{l:"Today",v:S.today,c:"#818CF8",e:"📅"},{l:"This Month",v:S.month,c:T.lit,e:"📆"},{l:"Conversion",v:S.conv+"%",c:T.ok,e:"📊"},{l:"Rejected",v:S.rej,c:"#FCA5A5",e:"❌"},{l:"Offers",v:S.offer,c:"#D8B4FE",e:"🏆"}].map(({l,v,c,e})=>(
            <div key={l} className="glass-mini"><div style={{fontSize:"1.4rem",flexShrink:0}}>{e}</div><div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.4rem",fontWeight:700,color:c,lineHeight:1,textShadow:`0 0 14px ${c}`}}>{v}</div><div style={{fontSize:".63rem",color:T.t3,marginTop:2,fontWeight:700,letterSpacing:".5px",textTransform:"uppercase"}}>{l}</div></div></div>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────
   AI ATS MATCHER
───────────────────────────────────────────── */
function ATSMatcher({ toast, T }) {
  const [jd,setJd]=useState(""), [res,setRes]=useState(""), [fn,setFn]=useState(""), [drag,setDrag]=useState(false);
  const [loading,setLoading]=useState(false), [result,setResult]=useState(null);
  const fRef=useRef();

  const LOCAL_SKILLS = [
    // ── ROLES / POSITIONS ──
    "Software Engineer","Senior Software Engineer","Staff Software Engineer","Principal Engineer","Lead Engineer","Full Stack Developer","Full Stack Engineer",
    "Frontend Developer","Frontend Engineer","Senior Frontend","React Developer","Angular Developer","Vue Developer","UI Developer","UI Engineer",
    "Backend Developer","Backend Engineer","Senior Backend","Node.js Developer","Python Developer","Java Developer","Go Developer","Rust Developer",
    "DevOps Engineer","Site Reliability Engineer","SRE","Cloud Engineer","Platform Engineer","Infrastructure Engineer","DevSecOps Engineer",
    "Data Scientist","Data Engineer","Machine Learning Engineer","AI Engineer","MLOps Engineer","Research Scientist","NLP Engineer","Computer Vision Engineer",
    "Data Analyst","Business Analyst","Data Architect","Database Administrator","DBA",
    "Solutions Architect","Enterprise Architect","Cloud Architect","AWS Architect","Azure Architect","Technical Architect","System Architect",
    "Product Manager","Product Owner","Technical Product Manager","Project Manager","Technical Project Manager","Program Manager","Scrum Master","Agile Coach",
    "Engineering Manager","Tech Lead","Team Lead","Delivery Lead","Development Manager",
    "QA Engineer","Test Engineer","SDET","Automation Engineer","Manual Tester","Quality Assurance",
    "Security Engineer","Cybersecurity Analyst","Penetration Tester","Security Architect","SOC Analyst","Information Security",
    "Mobile Developer","iOS Developer","Android Developer","React Native Developer","Flutter Developer",
    "Systems Administrator","Network Engineer","IT Support","IT Administrator","System Admin",
    "Consultant","Technical Consultant","IT Consultant","Management Consultant",
    "Intern","Junior Developer","Associate","Trainee","Graduate","Fresher",
    "CTO","Chief Technology Officer","VP of Engineering","Director of Engineering","Tech Lead Manager",
    "Blockchain Developer","Web3 Developer","Smart Contract Developer",
    "Game Developer","Unity Developer","Unreal Engine Developer",
    "UI/UX Designer","UX Designer","UI Designer","Product Designer","Visual Designer","Interaction Designer","User Researcher",
    "Technical Writer","DevRel","Developer Relations","Developer Advocate",
    "Data Warehouse Engineer","Big Data Engineer","BI Developer","Analytics Engineer",
    "ERP Consultant","SAP Consultant","Salesforce Developer","Salesforce Admin","CRM Developer",
    "Mainframe Developer","Cobol Developer","Legacy System Analyst",
    // ── FRONTEND ──
    "React","React 19","React 18","Next.js","Next.js 15","Next.js 14","Vue","Vue 4","Vue 3","Nuxt","Nuxt 3",
    "Svelte","Svelte 5","SvelteKit","Angular","Angular 19","Angular 18","SolidJS","Qwik","Astro","Remix",
    "Tailwind CSS","Tailwind","Shadcn/ui","Radix UI","Framer Motion","Three.js","WebGL","WebGPU",
    "WASM","WebAssembly","PWA","Micro Frontends","MFE","Module Federation",
    "TypeScript","TypeScript 5","Bun","Vite","Turbopack","tRPC","Zod","TanStack Query","React Query",
    "Zustand","Jotai","Redux","Redux Toolkit","MobX","Recoil","Valtio","Pinia","NgRx",
    "HTML5","CSS3","SCSS","SASS","Less","PostCSS","Styled Components","Emotion","CSS Modules",
    "Bootstrap","Material UI","MUI","Chakra UI","Ant Design","AntD","PrimeReact","PrimeNG","Semantic UI",
    "jQuery","D3.js","Chart.js","GSAP","RxJS","Axios","SWR","React Hook Form","Formik","React Router",
    "Alpine.js","HTMX","Stimulus","Turbo","Hotwire",
    "Storybook","Ladle","Styleguidist","Bit","Nx","Turborepo",
    // ── BACKEND ──
    "Node.js","Node.js 23","Node.js 22","Node.js 21","Node.js 20","Deno","Bun",
    "Python","Python 3.13","Python 3.12","Python 3.11","Python 3.10",
    "Go","Go 1.24","Go 1.23","Go 1.22","Golang",
    "Rust","Java","Java 23","Java 21","Java 17","Java 11","Java 8",
    "Spring Boot","Spring Boot 4","Spring Boot 3","Spring Framework","Spring MVC","Spring Cloud",
    "Kotlin","C#",".NET",".NET 9",".NET 8",".NET 7",".NET 6","ASP.NET","ASP.NET Core","Blazor",
    "PHP","PHP 8.4","PHP 8.3","PHP 8.2","Laravel","Laravel 12","Laravel 11","Symfony","CakePHP","CodeIgniter","Yii","Zend","Laminas",
    "Express","Express.js","Fastify","Hono","Elysia","FastAPI","Django","Django 5","Django 4","Flask",
    "Gin","Echo","Fiber","Actix","Axum","Rocket","Warp","Tide",
    "GraphQL","Apollo","Relay","REST","REST API","RESTful","RESTful API","gRPC","Protocol Buffers","Protobuf",
    "WebSocket","WebSockets","Socket.io","SocketIO","MQTT","AMQP","STOMP",
    "NestJS","Nest","AdonisJS","Phoenix","Elixir","Ruby","Rails","Ruby on Rails","ROR","Sinatra","Rack",
    "Scala","Play Framework","Akka","Haskell","Clojure","Erlang","Elixir",
    "Swagger","OpenAPI","Postman","Insomnia","Bruno","Hoppscotch",
    "Celery","Sidekiq","Bull","BullMQ","RabbitMQ","Kafka","Redis Pub/Sub",
    "CORS","Rate Limiting","Middleware","Authentication","Authorization","JWT","OAuth","OAuth2","SAML","SSO",
    // ── AI / ML ──
    "OpenAI","GPT","GPT-5","GPT-5.4","GPT-5.5","GPT-4o","GPT-4","GPT-4 Turbo","ChatGPT","ChatGPT-4o",
    "Claude","Claude 4","Claude 4.5","Claude 4.6","Claude Opus","Claude Sonnet","Claude Haiku","Anthropic",
    "Gemini","Gemini 3","Gemini 3.5","Gemini 2","Gemini 2.5","Google AI","Bard",
    "Llama","Llama 4","Llama 3","Llama 2","Meta AI","DeepSeek","DeepSeek V4","DeepSeek V3","Mistral","Mistral AI","Grok","xAI",
    "LangChain","LangGraph","LangSmith","CrewAI","AutoGPT","BabyAGI",
    "RAG","Retrieval Augmented Generation","Vector DB","Vector Database","Pinecone","Weaviate","Qdrant","Chroma","Milvus",
    "Embeddings","Fine-tuning","LoRA","QLoRA","RLHF","DPO","PPO",
    "Agentic AI","AI Agent","AI Agents","Multi-Agent","Agent Framework","MCP","Model Context Protocol","A2A","Agent-to-Agent",
    "Copilot SDK","Vercel AI SDK","OpenAI Agents SDK","AI SDK",
    "TensorFlow","PyTorch","JAX","ONNX","CUDA","MLX","Keras","Scikit-learn","sklearn",
    "XGBoost","LightGBM","CatBoost","Random Forest","Decision Tree","SVM","KNN","Naive Bayes",
    "NLP","Natural Language Processing","Computer Vision","CV","LLM","Large Language Model","SLM","Small Language Model",
    "Stable Diffusion","Diffusion Models","GAN","Generative Adversarial Network","VAE","Transformer","Attention",
    "Reinforcement Learning","RL","Supervised Learning","Unsupervised Learning","Semi-Supervised Learning","Self-Supervised Learning",
    "Hugging Face","Transformers","Sentence Transformers","Whisper","TTS","Text-to-Speech","STT","Speech-to-Text","Speech Recognition",
    "Rasa","Dialogflow","Lex","Bedrock","SageMaker","AI Agents","Prompt Engineering","RAG Pipeline",
    "Data Science","Data Mining","Predictive Modeling","Statistical Modeling","Regression","Classification","Clustering",
    "Pandas","NumPy","Matplotlib","Seaborn","Plotly","Dash","SciPy","Jupyter","Jupyter Notebook","JupyterLab",
    "R","RStudio","Tidyverse","dplyr","ggplot2","Statistical Analysis","A/B Testing","Hypothesis Testing",
    "MLOps","Model Deployment","Model Monitoring","Feature Store","DVC","MLflow","Kubeflow","Weights & Biases","wandb",
    // ── DEVOPS / CLOUD ──
    "AWS","Amazon Web Services","Amazon AWS",
    "Lambda","AWS Lambda","ECS","Amazon ECS","EKS","Amazon EKS","EKS","S3","Amazon S3","DynamoDB","Amazon DynamoDB",
    "Aurora","Amazon Aurora","RDS","Amazon RDS","Bedrock","Amazon Bedrock","SageMaker","Amazon SageMaker",
    "EC2","Amazon EC2","CloudFront","CloudFront","Route53","Route 53","API Gateway","Amazon API Gateway",
    "SQS","Amazon SQS","SNS","Amazon SNS","CloudWatch","Amazon CloudWatch","IAM","AWS IAM",
    "Step Functions","AWS Step Functions","Cognito","AWS Cognito","ElastiCache","Kinesis","AWS Kinesis",
    "Azure","Microsoft Azure","Azure DevOps","Azure Functions","Azure Kubernetes Service","AKS",
    "Azure App Service","Azure Blob","Azure SQL","Azure AD","Azure Active Directory","Azure Pipelines",
    "GCP","Google Cloud Platform","Google Cloud","Cloud Run","GKE","Google Kubernetes Engine",
    "BigQuery","Cloud Functions","Google Cloud Functions","Cloud Storage","Firebase","Firestore",
    "Docker","Container","Containerization","Kubernetes","K8s","k8s","Helm","Helm Charts",
    "Terraform","OpenTofu","Pulumi","Ansible","Ansible Playbook","Chef","Puppet","Vagrant","Packer",
    "CI/CD","Continuous Integration","Continuous Delivery","Continuous Deployment",
    "GitHub Actions","GitLab CI","GitLab CI/CD","CircleCI","Jenkins","Jenkins Pipeline","Travis CI","Bamboo","TeamCity",
    "ArgoCD","Argo","GitOps","Flux","Flagger",
    "Istio","Linkerd","Consul","Envoy","Service Mesh",
    "Prometheus","Grafana","Datadog","New Relic","Dynatrace","AppDynamics","Splunk",
    "OpenTelemetry","OTel","ELK Stack","Elasticsearch","Logstash","Kibana","Elastic Stack",
    "Serverless","Serverless Architecture","Edge Computing","Edge",
    "Cloudflare Workers","Vercel Edge","Vercel","Netlify","Render","Railway","Fly.io",
    "AWS CDK","CDK","CDKTF","CDK for Terraform","CloudFormation","AWS CloudFormation",
    "Linux","Unix","Ubuntu","Debian","CentOS","RHEL","Red Hat","Alpine",
    "Bash","Shell Scripting","Zsh","PowerShell","Batch Scripting",
    "Nginx","NGINX","Apache","Apache HTTP","HAProxy","Traefik","Caddy",
    "Virtualization","VMware","VirtualBox","Hyper-V","Proxmox","KVM",
    "Monitoring","Observability","APM","Distributed Tracing","Metrics","Logging","Alerting",
    "Incident Management","On-Call","Postmortem","Runbook","SLO","SLI","SLA",
    // ── DATABASE ──
    "PostgreSQL","Postgres","PostgreSQL 17","PostgreSQL 16","PostgreSQL 15","PostgreSQL 14",
    "MySQL","MySQL 9","MySQL 8","MySQL 5.7","MariaDB","Percona",
    "MongoDB","MongoDB 8","MongoDB 7","MongoDB 6","Mongoose",
    "Redis","Redis 8","Redis 7","Redis Stack","Valkey",
    "Elasticsearch","Elastic Search","OpenSearch","MeiliSearch","Typesense","Algolia",
    "Cassandra","Apache Cassandra","DataStax","ScyllaDB","Scylla",
    "CockroachDB","Cockroach","Snowflake","SnowflakeDB","BigQuery","Google BigQuery",
    "Redshift","Amazon Redshift","ClickHouse","TimescaleDB","Neo4j","Dgraph","ArangoDB",
    "Supabase","PlanetScale","Neon","Turso","Xata","Convex",
    "Drizzle ORM","Drizzle","Prisma","TypeORM","Kysely","Sequelize","Mongoose",
    "SQLAlchemy","SQLAlchemy","Hibernate","JPA","Entity Framework","EF Core","Dapper","ADO.NET",
    "SQL","NoSQL","NewSQL","InfluxDB","Firebase","Firestore","Realm","SQLite",
    "Memcached","RabbitMQ","Kafka","Apache Kafka","Redpanda","NATS","Pulsar",
    "Oracle","Oracle DB","Oracle SQL","SQL Server","Microsoft SQL Server","MSSQL","Azure SQL",
    "Indexing","Query Optimization","Sharding","Replication","Partitioning","CAP Theorem","ACID","BASE",
    // ── MOBILE / DESKTOP ──
    "React Native","Expo","Expo SDK",
    "Flutter","Flutter 3","Dart",
    "Kotlin Multiplatform","KMP","Compose Multiplatform",
    "SwiftUI","Swift","UIKit","iOS Development","iPadOS",
    "Jetpack Compose","Android Development","Android SDK","Android Studio","Material Design",
    "Electron","Electron.js","Tauri","Wails",
    "Ionic","Ionic Framework","Capacitor","Cordova","PhoneGap",
    "Xamarin","Xamarin.Forms","MAUI",".NET MAUI",
    "Unity","Unity 3D","Unreal Engine","Unreal","Unreal Engine 5","Godot","Game Development",
    "Progressive Web App","PWA","Hybrid App","Cross-Platform",
    // ── TESTING ──
    "Playwright","Cypress","Vitest","Jest","Jasmine","Karma","Mocha","Chai","Sinon",
    "Testing Library","React Testing Library","MSW","Mock Service Worker",
    "Storybook","Cucumber","Gherkin","Selenium","WebDriver","K6","Grafana K6",
    "Pytest","UnitTest","JUnit","NUnit","xUnit","TestNG","Mockito","PowerMock",
    "TDD","Test-Driven Development","BDD","Behavior-Driven Development",
    "E2E","End-to-End Testing","E2E Testing","Integration Testing","Unit Testing","Smoke Testing","Regression Testing","Performance Testing","Load Testing","Stress Testing",
    "API Testing","Contract Testing","Pact","Snapshot Testing","Visual Regression Testing","Accessibility Testing","a11y Testing",
    "SonarQube","Sonar","Code Quality","Code Coverage","Istanbul","C8","nyc",
    // ── ARCHITECTURE ──
    "Microservices","Microservices Architecture","Service-Oriented Architecture","SOA",
    "Event-Driven","Event Driven","Event-Driven Architecture","EDA",
    "CQRS","Event Sourcing","Domain-Driven Design","DDD","Strategic Design","Tactical Design","Ubiquitous Language",
    "Clean Architecture","Hexagonal Architecture","Ports and Adapters","Onion Architecture",
    "SOLID","SOLID Principles","DRY","KISS","YAGNI","Separation of Concerns","SoC","Inversion of Control","IoC","Dependency Injection","DI",
    "12-Factor App","Twelve-Factor App","12 Factor",
    "DevSecOps","Zero Trust","Zero Trust Architecture","SASE","Network Security",
    "API Gateway","Kong","Apigee","Traefik","AWS API Gateway","Azure API Management",
    "Service Mesh","Sidecar","Ambassador","Envoy Proxy",
    "Circuit Breaker","Resilience4j","Hystrix","Bulkhead","Retry","Timeout","Rate Limiter",
    "Message Broker","Event Bus","Event Streaming","Stream Processing",
    "Saga Pattern","Transactional Outbox","Change Data Capture","CDC","Debezium",
    "Blue-Green Deployment","Canary Deployment","Rolling Update","A/B Testing Infrastructure","Feature Flag","Feature Toggle","LaunchDarkly","Flagsmith",
    "Chaos Engineering","Chaos Monkey","Litmus","Gremlin",
    "Conway's Law","Team Topologies","Cognitive Load",
    // ── DOMAINS / INDUSTRIES ──
    "Fintech","Finance","Banking","Investment Banking","Digital Banking","Payments","PayTech","InsurTech","Wealth Management","Trading",
    "Healthcare","HealthTech","MedTech","Digital Health","Electronic Health Records","EHR","HIPAA","FHIR","Telemedicine","Bioinformatics",
    "E-commerce","Ecommerce","Retail","Retail Tech","D2C","Direct-to-Consumer","Omnichannel","Marketplace","Supply Chain","Logistics",
    "SaaS","Software as a Service","B2B SaaS","B2B","B2C","Enterprise Software","CRM","ERP","HCM",
    "EdTech","Education","E-learning","Learning Management System","LMS","Online Learning",
    "Social Media","Social Network","Messaging","Communication","Collaboration Tools","Video Conferencing",
    "Gaming","GameTech","Esports","AR/VR","Augmented Reality","Virtual Reality","Mixed Reality","Spatial Computing","Metaverse",
    "AdTech","Advertising Technology","Digital Advertising","Programmatic Advertising","RTB","DMP","SSP","DSP",
    "LegalTech","Legal","Compliance","RegTech","GRC","KYC","AML",
    "Real Estate","PropTech","Real Estate Technology","Property Management",
    "TravelTech","Travel","Hospitality","Hotel","Booking","Transportation","Ride Sharing","Mobility",
    "IoT","Internet of Things","Industrial IoT","IIoT","Smart Home","Smart City","Connected Devices","Embedded Systems",
    "Automotive","AutoTech","Electric Vehicles","EV","Autonomous Driving","ADAS","Connected Car",
    "Telecommunications","Telecom","5G","Network Infrastructure","Broadband","Wireless",
    "Energy","CleanTech","Renewable Energy","Solar","Wind","Smart Grid","Oil & Gas",
    "Aerospace","Aviation","Defense","SpaceTech","Satellite",
    "Government","Public Sector","GovTech","Civic Tech","Smart Government","E-Governance",
    "Media","Entertainment","Streaming","OTT","Digital Media","Content Management","Publishing",
    "AgriTech","Agriculture","Farming","FoodTech","Food Technology",
    "HRTech","Human Resources","Talent Management","Recruitment","ATS","Payroll","Benefits",
    "Cybersecurity","Information Security","Data Privacy","GDPR","CCPA","Security Operations","SOC","Threat Intelligence",
    "Data & Analytics","Business Intelligence","BI","Data Warehousing","Data Lake","Data Mesh","Data Fabric",
    "Cloud Computing","Cloud Infrastructure","Multi-Cloud","Hybrid Cloud","FinOps",
    // ── TOOLS / VERSION CONTROL ──
    "Git","GitHub","GitLab","Bitbucket","Gitea","Gogs","Azure Repos","AWS CodeCommit",
    "GitFlow","Git Flow","Trunk-Based Development","Trunk Based","Semantic Versioning","SemVer","Monorepo",
    "SVN","Subversion","Mercurial","CVS","Perforce",
    "Webpack","Vite","Rollup","Parcel","esbuild","Bun","Turbopack","Snowpack",
    "Babel","SWC","ESLint","Prettier","Husky","lint-staged","commitlint","CSpell",
    "Yarn","npm","pnpm","npx",
    "Nx","Turborepo","Lerna","Rush","Bit","pnpm workspace","Yarn Workspaces",
    "Jenkins","Bamboo","TeamCity","GoCD","Buildkite",
    "Jira","Confluence","Notion","Linear","Asana","Trello","Monday.com","ClickUp","Basecamp",
    "Slack","Teams","Discord","Zoom","Google Meet","Webex",
    "Figma","Sketch","Adobe XD","InVision","Zeplin","Abstract","Framer",
    "Tableau","Power BI","Looker","LookML","Metabase","Redash","Grafana","Kibana",
    "Sentry","Datadog","New Relic","Splunk","LogRocket","FullStory","Hotjar","Amplitude","Mixpanel",
    "VS Code","Visual Studio Code","WebStorm","IntelliJ","PyCharm","GoLand","Eclipse","NetBeans","Sublime Text","Vim","Neovim","Emacs","Nano",
    // ── SOFT SKILLS ──
    "Leadership","Strategic Leadership","Thought Leadership",
    "Team Management","Team Building","People Management","Performance Management","Conflict Resolution",
    "Mentoring","Coaching","Training","Knowledge Transfer","Onboarding",
    "Communication","Verbal Communication","Written Communication","Technical Communication","Presentation","Public Speaking","Storytelling",
    "Problem Solving","Analytical Problem Solving","Creative Problem Solving","Root Cause Analysis","Troubleshooting",
    "Critical Thinking","Strategic Thinking","Systems Thinking","Design Thinking","Lateral Thinking","Analytical Thinking",
    "Collaboration","Teamwork","Cross-Functional Collaboration","Stakeholder Management",
    "Project Management","Agile Project Management","SDLC","Software Development Life Cycle","Release Management","Risk Management",
    "Time Management","Prioritization","Multitasking","Deadline Management",
    "Adaptability","Flexibility","Change Management","Agility","Resilience","Growth Mindset",
    "Decision Making","Data-Driven Decision Making","Strategic Decision Making",
    "Negotiation","Vendor Management","Client Management","Customer Management","Customer Success",
    "Emotional Intelligence","EQ","Empathy","Self-Awareness",
    "Innovation","Creativity","Continuous Improvement","Kaizen",
    "Attention to Detail","Accuracy","Thoroughness","Quality Focus",
    "Ownership","Accountability","Responsibility","Dependability","Reliability",
    "Conflict Management","Difficult Conversations","Mediation",
    "Cross-Cultural Communication","Global Collaboration","Remote Collaboration","Distributed Teams","Async Communication",
    "Technical Writing","Documentation","API Documentation","Knowledge Base","Wiki Management",
    "Code Review","Peer Review","Pair Programming","Mob Programming",
    "Estimation","Agile Estimation","Story Points","T-Shirt Sizing","Planning Poker",
    "Requirement Gathering","Requirement Analysis","Business Analysis","Gap Analysis","Feasibility Study",
    "Interviewing","Technical Interviewing","Hiring","Recruitment","Talent Acquisition",
    "Budgeting","Cost Management","Resource Planning","Capacity Planning",
    "Vendor Evaluation","Technology Evaluation","Proof of Concept","POC","MVP","Minimum Viable Product",
    // ── CERTIFICATIONS ──
    "AWS Certified Solutions Architect","AWS Certified Developer","AWS Certified SysOps Administrator","AWS Certified DevOps Engineer",
    "AWS Certified Data Analytics","AWS Certified Machine Learning","AWS Certified Security",
    "Azure Certified","Azure Solutions Architect","Azure Developer","Azure Administrator",
    "GCP Certified","Google Cloud Architect","Google Cloud Engineer","Google Cloud Developer",
    "Kubernetes Certified","CKA","Certified Kubernetes Administrator","CKAD","Certified Kubernetes Application Developer","CKS","Certified Kubernetes Security Specialist",
    "Terraform Certified","HashiCorp Certified",
    "PMP","Project Management Professional","PMI","PMI-ACP","PRINCE2","CSM","Certified Scrum Master","PSM","Professional Scrum Master",
    "ISTQB","Certified Tester","SAFe","SAFe Agilist","TOGAF","ITIL","COBIT",
    "CISSP","Certified Information Systems Security Professional","CISM","CEH","Certified Ethical Hacker","CompTIA Security+",
    "OCJP","Oracle Certified","Java Certified","Spring Certified",
    "Google Data Analytics","Google Data Engineer","Tableau Certified","Power BI Certified",
    "ISTQB","CSM","SAFe Agilist","TOGAF","ITIL",
    "OpenAI Developer","OpenAI Certified","Anthropic Certified",
    // ── CLIENTS / COMPANIES ──
    "FAANG","FAANG+","MAANG",
    "Google","Alphabet","Meta","Facebook","Apple","Amazon","Netflix","Microsoft",
    "Uber","Lyft","Airbnb","Booking.com","Expedia","TripAdvisor",
    "Spotify","Twitter","X","LinkedIn","Pinterest","Snapchat","Snap","TikTok","ByteDance",
    "Salesforce","Oracle","IBM","SAP","Adobe","Cisco","Dell","HP","HPE","Intel","AMD","NVIDIA",
    "JP Morgan","JPMorgan Chase","Goldman Sachs","Morgan Stanley","Citigroup","Bank of America","Wells Fargo","Capital One","American Express",
    "McKinsey","Boston Consulting Group","BCG","Bain","Deloitte","PwC","EY","Ernst & Young","KPMG","Accenture",
    "Walmart","Target","Home Depot","Costco","Albertsons","Kroger","CVS","Walgreens",
    "Tesla","SpaceX","Rivian","Ford","GM","General Motors","Toyota","Honda","BMW","Mercedes","Volkswagen",
    "Stripe","Square","Block","PayPal","Venmo","Plaid","Robinhood","Coinbase","Revolut","TransferWise","Wise",
    "Atlassian","Jira","Confluence","Slack","Salesforce","Workday","ServiceNow","Snowflake","Databricks",
    "Palantir","Twilio","Shopify","Square","WeWork","DoorDash","Instacart","Postmates",
    "Zoom","DocuSign","Okta","Cloudflare","Fastly","MongoDB","Elastic","Datadog","New Relic","Splunk",
    "Vercel","Netlify","Railway","Fly.io","Render","PlanetScale","Neon","Supabase",
    "OpenAI","Anthropic","Hugging Face","Cohere","AI21","Stability AI","Midjourney",
    "Startup","Start-up","Early Stage","Seed Stage","Series A","Series B","Series C","Growth Stage",
    "Enterprise","Fortune 500","Fortune 100","SMB","Small Business","Mid-Market","Non-Profit","NGO",
    // ── EMERGING TECH ──
    "Web3","Blockchain","Distributed Ledger","DLT",
    "Solidity","Rust Solana","Anchor","Hardhat","Foundry","Truffle","Ganache",
    "Smart Contract","Ethereum","EVM","Polygon","Solana","Avalanche","Chainlink","Uniswap",
    "Zero-Knowledge Proofs","ZKP","zk-SNARKs","zk-STARKs","Zero Knowledge",
    "Edge AI","TinyML","IoT","Internet of Things","Embedded AI",
    "Digital Twins","Quantum Computing","Qiskit","IBM Quantum","Azure Quantum",
    "eBPF","WebTransport","HTTP/3","QUIC","IPv6",
    "6G","Wi-Fi 7","NFC","BLE","Bluetooth Low Energy","Zigbee",
    "Carbon Accounting","Sustainability","GreenTech","ESG","Climate Tech",
    "Low Code","Low-Code","No Code","No-Code","Power Apps","Power Automate","OutSystems","Mendix","Bubble","Retool",
    "Generative AI","Gen AI","GenAI","Multi-Modal","Multimodal","Text-to-Image","Text-to-Video","Text-to-Speech","Image Generation","Video Generation",
    "RPA","Robotic Process Automation","UiPath","Automation Anywhere","Blue Prism",
    "CRDT","Conflict-Free Replicated Data Type","Local-First","Offline-First",
    "WebRTC","Real-Time Communication","Live Streaming","Video Streaming",
    "Voice Technology","Voice Assistant","Alexa","Google Assistant","Siri","Chatbot","Conversational AI",
    // ── CONCEPTS / GENERAL ──
    "OOP","Object-Oriented Programming","Functional Programming","FP","Reactive Programming","Declarative Programming","Imperative Programming",
    "Concurrency","Parallelism","Multithreading","Asynchronous Programming","Async/Await","Promises","Callbacks","Event Loop",
    "Design Patterns","Creational Patterns","Structural Patterns","Behavioral Patterns",
    "MVC","Model-View-Controller","MVVM","Model-View-ViewModel","MVP","Model-View-Presenter","VIPER","Clean Swift",
    "Repository Pattern","Singleton","Factory","Observer","Strategy","Decorator","Adapter","Facade","Command",
    "API Design","API Development","RESTful Design","GraphQL Design","API Versioning","API Security","API Documentation",
    "System Design","High-Level Design","HLD","Low-Level Design","LLD","Capacity Planning","Load Balancing","Caching","CDN","Database Indexing",
    "Scalability","Horizontal Scaling","Vertical Scaling","Performance Optimization","Performance Tuning",
    "Security","Cybersecurity","Application Security","AppSec","Cloud Security","Network Security","Endpoint Security",
    "OWASP","OWASP Top 10","Penetration Testing","Pen Test","Vulnerability Assessment","SAST","DAST","SCA",
    "Encryption","Symmetric Encryption","Asymmetric Encryption","Hashing","Salting","PKI","TLS","SSL","HTTPS",
    "GDPR","CCPA","Data Privacy","Data Protection","Compliance","SOC 2","ISO 27001","PCI DSS","FedRAMP","HIPAA",
    "Agile","Scrum","Kanban","SAFe","Less","LeSS","Nexus","XP","Extreme Programming","Lean Software Development","Waterfall",
    "SDLC","Software Development Life Cycle","Software Engineering","Computer Science",
    "Research","Development","R&D","Innovation","Prototyping","MVP","PoC","Proof of Concept",
    "Open Source","Open-Source","OSS","FOSS","Open Source Contribution","Open Source Development",
    "Maintenance","Support","Production Support","L3 Support","L2 Support","L1 Support","Customer Support","Technical Support",
    "Migration","Upgrade","Cloud Migration","Lift and Shift","Re-architecting","Refactoring","Modernization","Digital Transformation",
  ];

  const localMatch = (jdText, resumeText) => {
    const jdLower = jdText.toLowerCase();
    const resumeLower = resumeText.toLowerCase();
    const jdSkills = [];
    const resumeSkills = [];

    LOCAL_SKILLS.forEach(skill => {
      const skillLower = skill.toLowerCase();
      if (jdLower.includes(skillLower) && !jdSkills.includes(skill)) {
        jdSkills.push(skill);
      }
      if (resumeLower.includes(skillLower) && !resumeSkills.includes(skill)) {
        resumeSkills.push(skill);
      }
    });

    const matched = jdSkills.filter(s => resumeSkills.includes(s));
    const missing = jdSkills.filter(s => !resumeSkills.includes(s));
    const extra = resumeSkills.filter(s => !jdSkills.includes(s));

    const score = jdSkills.length > 0 ? Math.round((matched.length / jdSkills.length) * 100) : 0;

    const fitLevel = score >= 80 ? "Strong Fit" : score >= 60 ? "Good Fit" : score >= 40 ? "Partial Fit" : "Weak Fit";

    const strengths = matched.slice(0, 5);
    const gaps = missing.slice(0, 5);
    const summary = `Found ${matched.length} of ${jdSkills.length} required skills (${score}% match). ${missing.length} skills missing. ${extra.length} additional skills not required in the JD.`;
    const recommendation = missing.length > 0 ? `Focus on learning: ${missing.slice(0, 3).join(", ")}` : "Great match! Keep building on your strengths.";

    return { score, matched, missing, extra, summary, recommendation, fitLevel, strengths, gaps };
  };

  const analyze=async()=>{
    if(!jd.trim()){toast("Enter a Job Description","err");return;}
    if(!res.trim()){toast("Upload or paste resume text","err");return;}
    setLoading(true);
    try{
      const raw=await callAI(`You are an expert ATS resume analyzer with deep knowledge of ALL modern tech stacks, frameworks, tools, and methodologies. Return ONLY valid JSON (no markdown):
{"score":<0-100>,"matched":["kw"],"missing":["kw"],"extra":["kw"],"summary":"2-3 sentences","recommendation":"top tip","fitLevel":"Strong Fit|Good Fit|Partial Fit|Weak Fit","strengths":["s1","s2"],"gaps":["g1","g2"]}

Evaluate against these latest technologies & concepts:
Frontend: React 19, Next.js 15, Vue 4, Nuxt, Svelte 5, SvelteKit, Angular 19, SolidJS, Qwik, Astro, Remix, Tailwind CSS v4, Shadcn/ui, Radix UI, Framer Motion, Three.js, WebGL, WebGPU, WASM, PWA, MFEs (Module Federation), Micro Frontends, TypeScript 5.x, Bun, Vite, Turbopack, tRPC, Zod, TanStack Query, Zustand, Jotai, Signals
Backend: Node.js 23, Deno, Bun, Python 3.13, Go 1.24, Rust, Java 23, Spring Boot 4, Kotlin, C# .NET 9, PHP 8.4, Laravel 12, Express, Fastify, Hono, Elysia, FastAPI, Django 5, Flask, Gin, Echo, Fiber, Actix, Axum, Rocket
AI/ML: OpenAI GPT-5/4o, Anthropic Claude 4, Google Gemini 3, Meta Llama 4, DeepSeek V4, Mistral, Grok, Hugging Face, LangChain, LangGraph, CrewAI, AutoGPT, RAG, Vector DBs (Pinecone, Weaviate, Qdrant, Chroma), Embeddings, Fine-tuning, LoRA, RLHF, Agentic AI, MCP, A2A, Copilot SDK, Vercel AI SDK, OpenAI Agents SDK, TensorFlow, PyTorch, JAX, ONNX, CUDA, MLX
DevOps/Cloud: AWS (Lambda, ECS, EKS, S3, DynamoDB, Aurora, Bedrock, SageMaker), Azure, GCP, Docker, Kubernetes, Helm, Terraform, Pulumi, Ansible, GitHub Actions, GitLab CI, ArgoCD, Istio, Prometheus, Grafana, Datadog, New Relic, OpenTelemetry, Serverless, Edge Computing, Cloudflare Workers, Vercel Edge, AWS CDK
Database: PostgreSQL 17, MySQL 9, MariaDB, MongoDB 8, Redis 8, ElasticSearch, OpenSearch, Cassandra, ScyllaDB, CockroachDB, Snowflake, BigQuery, Redshift, ClickHouse, TimescaleDB, Neo4j, Dgraph, Supabase, PlanetScale, Neon, Turso, Drizzle ORM, Prisma, TypeORM, Kysely
Mobile/Desktop: React Native, Flutter 3, Kotlin Multiplatform, SwiftUI, Jetpack Compose, Electron, Tauri, Wails, Ionic, Capacitor, Expo
Testing: Playwright, Cypress, Vitest, Jest, Testing Library, MSW, Storybook, Cucumber, Selenium, K6
Architecture: Microservices, Event-Driven, CQRS, Event Sourcing, DDD, Clean Architecture, Hexagonal, SOLID, 12-Factor, GitOps, DevSecOps, Zero Trust, SASE
Emerging: Web3, Blockchain, Solidity, Zero-Knowledge Proofs, Edge AI, TinyML, IoT, Digital Twins, Quantum Computing (Qiskit), 6G, eBPF, WebAssembly (Wasm), WebTransport, HTTP/3, QUIC

JD: ${jd.slice(0,3000)}\nResume: ${res.slice(0,3000)}`);
      setResult(JSON.parse(raw.replace(/```json|```/g,"").trim()));
    }catch(e){
      const fallback = localMatch(jd, res);
      setResult(fallback);
      toast("AI rate limited — used local skill matching ✓","warn");
    }
    setLoading(false);
  };
  const sCol=result?(result.score>=70?T.ok:result.score>=40?T.lit:T.err):T.lit;
  const sBg=result?(result.score>=70?"linear-gradient(90deg,#00B87A,#00D2A0)":result.score>=40?"linear-gradient(90deg,#EA580C,#FBBF24)":"linear-gradient(90deg,#DC2626,#FF4D6D)"):"";
  const fC={"Strong Fit":T.ok,"Good Fit":"#81C784","Partial Fit":T.warn,"Weak Fit":T.err};
  const readFile=async f=>{if(!f)return;setFn(f.name);if(f.name.endsWith(".docx")){try{const m=(await import("mammoth")).default;const{value}=await m.extractRawText({arrayBuffer:await f.arrayBuffer()});setRes(value);}catch{toast("Error reading DOCX","err");}}else setRes(await f.text());};
  return (
    <div className="page-in">
      <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,display:"flex",alignItems:"center",gap:".6rem",marginBottom:"1.5rem"}}>
        🤖 AI Resume Matcher
        <span style={{padding:".18rem .65rem",borderRadius:20,fontSize:".62rem",fontWeight:700,background:"rgba(99,102,241,.12)",backdropFilter:"blur(10px)",border:"1px solid rgba(99,102,241,.28)",color:"#818CF8"}}>AI Powered</span>
      </h1>
      <div className="glass">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.2rem"}} className="grid2">
          <div><label className="lbl">Job Description</label><textarea className="inp" rows={10} value={jd} onChange={e=>setJd(e.target.value)} placeholder="Paste full job description…" style={{resize:"vertical",minHeight:240}}/><div style={{marginTop:".4rem",fontSize:".72rem",color:T.t3}}>{jd.split(/\s+/).filter(Boolean).length} words</div></div>
          <div>
            <label className="lbl">Resume (.docx / .txt)</label>
            <div className={`upz${drag?" drag":""}${res?" ok":""}`} onClick={()=>fRef.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={async e=>{e.preventDefault();setDrag(false);readFile(e.dataTransfer.files[0]);}} style={{height:130,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:".4rem",marginBottom:".75rem"}}>
              <input type="file" accept=".docx,.txt" ref={fRef} style={{display:"none"}} onChange={e=>readFile(e.target.files[0])}/>
              {res?<>✅ <span style={{fontSize:".82rem",color:T.ok,fontWeight:700}}>{fn||"Loaded"}</span><span style={{fontSize:".7rem",color:T.t3}}>{res.length} chars</span></>:<>📁 <span style={{fontSize:".82rem",color:T.t3}}>Drop .docx/.txt or click</span></>}
            </div>
            <label className="lbl">Or paste resume text</label>
            <textarea className="inp" rows={5} value={res} onChange={e=>setRes(e.target.value)} placeholder="Paste resume text…" style={{resize:"vertical"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:".75rem",flexWrap:"wrap",marginTop:"1.2rem"}}>
          <button className="btn" onClick={analyze} disabled={loading}>{loading?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>:"⚡"}{loading?"Analyzing…":"Analyze with AI"}</button>
          <button className="btn ghost" onClick={()=>{setJd("");setRes("");setFn("");setResult(null);}}>🗑 Clear</button>
          <button className="btn ghost" onClick={()=>{setJd("Senior Full-Stack AI Engineer — 5+ yrs React 19, Next.js 15, TypeScript 5, Node.js 23, Python 3.13, AWS Bedrock, LangChain, PostgreSQL 17, Docker, Kubernetes, GraphQL, tRPC, Tailwind CSS, Playwright, CI/CD, Microservices, Clean Architecture. B.S. CS preferred.");setRes("7yrs React 19, Next.js 15, Vue 4, Svelte 5, Node.js, Deno, Python, Go, TypeScript, PostgreSQL, MongoDB, Redis, AWS, GCP, Docker, K8s, Terraform, LangChain, RAG, Vector DBs, GPT-4o, GraphQL, tRPC, REST, CI/CD, Microservices, DDD, TDD. M.S. CS 2020.");setFn("demo.txt");}}>⭐ Demo</button>
        </div>
      </div>
      {result&&(
        <div className="glass page-in">
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"1.5rem",alignItems:"center",marginBottom:"1.2rem"}} className="grid2">
            <ScoreRing score={result.score}/>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:".5rem",flexWrap:"wrap"}}>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.1rem",fontWeight:700,color:T.t1}}>Match Analysis</span>
                {result.fitLevel&&<span style={{padding:".2rem .75rem",borderRadius:20,fontSize:".74rem",fontWeight:700,backdropFilter:"blur(10px)",background:(fC[result.fitLevel]||T.warn)+"22",border:`1px solid ${fC[result.fitLevel]||T.warn}44`,color:fC[result.fitLevel]||T.warn}}>{result.fitLevel}</span>}
              </div>
              <div className="bt" style={{marginBottom:".85rem"}}><div className="bf" style={{width:result.score+"%",background:sBg}}/></div>
              <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
                {[{l:"JD Keywords",v:(result.matched?.length||0)+(result.missing?.length||0),c:"#818CF8"},{l:"Matched",v:result.matched?.length||0,c:T.ok},{l:"Missing",v:result.missing?.length||0,c:T.err},{l:"Bonus",v:result.extra?.length||0,c:T.info}].map(({l,v,c})=>(
                  <div key={l} style={{background:`${c}14`,backdropFilter:"blur(10px)",border:`1px solid ${c}30`,borderTop:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:".55rem .8rem",textAlign:"center",minWidth:75}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.5rem",fontWeight:700,color:c,lineHeight:1,textShadow:`0 0 14px ${c}`}}>{v}</div>
                    <div style={{fontSize:".6rem",color:T.t3,marginTop:".2rem",fontWeight:700,letterSpacing:".5px",textTransform:"uppercase"}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {result.summary&&<div style={{background:"rgba(0,0,0,.22)",backdropFilter:"blur(14px)",border:`1px solid rgba(${T.g},.16)`,borderTop:"1px solid rgba(255,255,255,.05)",borderRadius:12,padding:"1rem 1.1rem",marginBottom:"1.2rem"}}>
            <div style={{fontSize:".68rem",color:`rgba(${T.g},1)`,fontWeight:700,marginBottom:".4rem",fontFamily:"'Orbitron',sans-serif",letterSpacing:".5px"}}>🧠 AI ANALYSIS</div>
            <p style={{color:T.t2,fontSize:".9rem",lineHeight:1.65}}>{result.summary}</p>
            {result.recommendation&&<div style={{marginTop:".75rem",padding:".65rem .9rem",background:"rgba(0,210,160,.06)",backdropFilter:"blur(10px)",border:"1px solid rgba(0,210,160,.18)",borderRadius:8}}>
              <div style={{fontSize:".68rem",color:T.ok,fontWeight:700,marginBottom:".3rem",fontFamily:"'Orbitron',sans-serif",letterSpacing:".5px"}}>🚀 TOP RECOMMENDATION</div>
              <p style={{color:T.t1,fontSize:".88rem",lineHeight:1.6}}>{result.recommendation}</p>
            </div>}
          </div>}
          {(result.strengths?.length>0||result.gaps?.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.2rem"}} className="grid2">
            {result.strengths?.length>0&&<div style={{background:"rgba(0,0,0,.2)",backdropFilter:"blur(12px)",border:"1px solid rgba(0,210,160,.18)",borderRadius:12,padding:".9rem 1rem"}}><div style={{fontSize:".68rem",color:T.ok,fontWeight:700,marginBottom:".65rem",fontFamily:"'Orbitron',sans-serif",letterSpacing:".5px"}}>👍 STRENGTHS</div>{result.strengths.map((s,i)=><div key={i} style={{color:T.t2,fontSize:".82rem",lineHeight:1.55,marginBottom:".35rem",paddingLeft:".8rem",borderLeft:"2px solid "+T.ok}}>{s}</div>)}</div>}
            {result.gaps?.length>0&&<div style={{background:"rgba(0,0,0,.2)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,77,109,.18)",borderRadius:12,padding:".9rem 1rem"}}><div style={{fontSize:".68rem",color:T.err,fontWeight:700,marginBottom:".65rem",fontFamily:"'Orbitron',sans-serif",letterSpacing:".5px"}}>⚠️ CRITICAL GAPS</div>{result.gaps.map((g,i)=><div key={i} style={{color:T.t2,fontSize:".82rem",lineHeight:1.55,marginBottom:".35rem",paddingLeft:".8rem",borderLeft:"2px solid "+T.err}}>{g}</div>)}</div>}
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1rem"}} className="grid2">
            {[{title:"✅ FOUND",chips:result.matched,cls:"kw-m",c:T.ok},{title:"❌ MISSING",chips:result.missing,cls:"kw-x",c:T.err}].map(({title,chips,cls,c})=>(
              <div key={title} style={{background:"rgba(0,0,0,.18)",backdropFilter:"blur(12px)",border:`1px solid ${c}20`,borderRadius:12,padding:"1.1rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".75rem"}}><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:".72rem",fontWeight:700,color:c}}>{title}</span><span style={{padding:".1rem .5rem",borderRadius:10,backdropFilter:"blur(8px)",background:c+"22",border:`1px solid ${c}44`,fontSize:".68rem",fontWeight:700,color:c}}>{chips?.length||0}</span></div>
                <div>{(chips||[]).map((k,i)=><span key={k} className={`kw ${cls}`} style={{animationDelay:i*.02+"s"}}>{k}</span>)}</div>
              </div>
            ))}
          </div>
          {result.extra?.length>0&&<div style={{background:"rgba(0,0,0,.18)",backdropFilter:"blur(12px)",border:`1px solid ${T.info}20`,borderRadius:12,padding:"1.1rem",marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".75rem"}}><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:".72rem",fontWeight:700,color:T.info}}>⭐ BONUS SKILLS</span><span style={{padding:".1rem .5rem",borderRadius:10,backdropFilter:"blur(8px)",background:T.info+"22",border:`1px solid ${T.info}44`,fontSize:".68rem",fontWeight:700,color:T.info}}>{result.extra.length}</span></div>
            <div>{result.extra.map((k,i)=><span key={k} className="kw kw-e" style={{animationDelay:i*.02+"s"}}>{k}</span>)}</div>
          </div>}
          <div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}>
            <button className="btn ghost sm" onClick={()=>navigator.clipboard.writeText(`ATS MATCH: ${result.score}%\nFit: ${result.fitLevel}\nMatched: ${(result.matched||[]).join(", ")}\nMissing: ${(result.missing||[]).join(", ")}\n\n${result.summary}\n\nTip: ${result.recommendation}`).then(()=>toast("Copied ✓","ok"))}>📋 Copy Report</button>
            <button className="btn ghost sm" onClick={()=>{setResult(null);setJd("");setRes("");setFn("");}}>🔄 New Analysis</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CANDIDATES
───────────────────────────────────────────── */
function Candidates({ cands, setCands, toast, T }) {
  const [srch,setSrch]=useState(""), [sf,setSf]=useState("All"), [pg,setPg]=useState(1), [ps,setPs]=useState(10);
  const [showF,setShowF]=useState(false), [form,setForm]=useState({date:tod(),status:"Submitted"});
  const [editM,setEditM]=useState(null), [viewM,setViewM]=useState(null), [delId,setDelId]=useState(null);
  const [sel,setSel]=useState(new Set()), [sk,setSk]=useState("date"), [sd,setSd]=useState("desc");
  const dSrch=useDeferredValue(srch);
  const fil=useMemo(()=>{
    const q=dSrch.toLowerCase();
    let f=cands.filter(c=>[c.candidateName,c.vendorName,c.client,c.role,c.location,c.email,c.phoneNumber,c.category,c.notes,c.status,c.source,c.rate].some(v=>(v||"").toLowerCase().includes(q)));
    if(sf!=="All")f=f.filter(c=>(c.status||"Submitted")===sf);
    return [...f].sort((a,b)=>{let va=a[sk]||"",vb=b[sk]||"";if(sk==="rate"){va=parseFloat(va)||0;vb=parseFloat(vb)||0;}return(va<vb?-1:va>vb?1:0)*(sd==="asc"?1:-1);});
  },[cands,dSrch,sf,sk,sd]);
  const slc=fil.slice((pg-1)*ps,pg*ps);
  const sv=async u=>{setCands(u);await ss("ats_candidates",u);};
  const add=async()=>{if(!form.candidateName?.trim()||!form.client?.trim()||!form.role?.trim()){toast("Name, Client & Role required","err");return;}await sv([...cands,{...form,id:Date.now()}]);setForm({date:tod(),status:"Submitted"});setShowF(false);toast("Candidate added ✓","ok");};
  const svEdit=async()=>{await sv(cands.map(c=>c.id===editM.id?editM:c));setEditM(null);toast("Updated ✓","ok");};
  const del=async id=>{await sv(cands.filter(c=>c.id!==id));toast("Deleted","info");};
  const delB=async()=>{await sv(cands.filter(c=>!sel.has(c.id)));setSel(new Set());toast(`${sel.size} deleted`,"info");};
  const tgl=id=>setSel(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const tglAll=()=>setSel(p=>p.size===slc.length?new Set():new Set(slc.map(c=>c.id)));
  const expCSV=()=>{const h="Date,Name,Vendor,Client,Role,Location,Rate,Status,Email";const rows=fil.map(c=>[c.date,c.candidateName,c.vendorName,c.client,c.role,c.location,c.rate,c.status,c.email].map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([h+"\n"+rows],{type:"text/csv"}));a.download="candidates.csv";a.click();toast("CSV exported ✓","ok");};
  const sc2=k=>{if(sk===k)setSd(d=>d==="asc"?"desc":"asc");else{setSk(k);setSd("asc");}};
  const SI=({k})=>sk===k?(sd==="asc"?"▲":"▼"):null;
  return (
    <div className="page-in">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:".75rem"}}>
        <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,display:"flex",alignItems:"center",gap:".6rem"}}>👥 Candidates <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".85rem",color:T.t3,fontWeight:600}}>({cands.length})</span></h1>
        <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
          {sel.size>0&&<button className="btn btn-d sm" onClick={()=>{if(confirm(`Delete ${sel.size}?`))delB();}}>🗑 {sel.size}</button>}
          <button className="btn ghost sm" onClick={expCSV}>⬇ CSV</button>
          <button className="btn sm" onClick={()=>setShowF(v=>!v)}>➕ {showF?"Cancel":"Add"}</button>
        </div>
      </div>
      {showF&&<div className="glass page-in" style={{marginBottom:"1.2rem"}}><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:T.t1,marginBottom:"1rem"}}>👤 New Candidate</div><CandForm data={form} onChange={setForm}/><div style={{display:"flex",gap:".75rem",marginTop:"1rem"}}><button className="btn" onClick={add}>➕ Add</button><button className="btn ghost" onClick={()=>setShowF(false)}>Cancel</button></div></div>}
      <div className="glass">
        <div style={{display:"flex",gap:".65rem",marginBottom:".85rem",flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,minWidth:200}}><span style={{position:"absolute",left:".75rem",top:"50%",transform:"translateY(-50%)"}}>🔍</span><input className="inp" value={srch} onChange={e=>{setSrch(e.target.value);setPg(1);}} placeholder="Search…" style={{paddingLeft:"2.2rem"}}/></div>
          <select className="inp" value={sf} onChange={e=>{setSf(e.target.value);setPg(1);}} style={{width:185,flex:"none"}}><option value="All">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        </div>
        <TTbar total={fil.length} page={pg} ps={ps} onSize={n=>{setPs(n);setPg(1);}}/>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr>
              <th><input type="checkbox" style={{accentColor:T.p,cursor:"pointer"}} checked={slc.length>0&&sel.size===slc.length} onChange={tglAll}/></th>
              {[["date","Date"],["candidateName","Name"],["vendorName","Vendor"],["client","Client"],["role","Role"],[null,"Rate"],["status","Status"],[null,"Actions"]].map(([k,h])=>(
                <th key={h} style={k?{cursor:"pointer"}:{}} onClick={k?()=>sc2(k):undefined}>{h} {k&&<SI k={k}/>}</th>
              ))}
            </tr></thead>
            <tbody>
              {slc.length===0?<tr><td colSpan={9} style={{textAlign:"center",padding:"2.5rem",color:T.t3}}><div style={{fontSize:"2rem",marginBottom:".5rem"}}>👤</div>No candidates found</td></tr>:
              slc.map(c=>{
                const cls=S_CLS[c.status||"Submitted"]||"s-sub";
                return(
                  <tr key={c.id} style={{background:sel.has(c.id)?`rgba(${T.g},.07)`:""}}>
                    <td><input type="checkbox" style={{accentColor:T.p,cursor:"pointer"}} checked={sel.has(c.id)} onChange={()=>tgl(c.id)}/></td>
                    <td style={{whiteSpace:"nowrap",fontSize:".78rem"}}>{c.date||"—"}</td>
                    <td><div style={{display:"flex",alignItems:"center",gap:".55rem"}}><div className="avatar" style={{background:avG(c.candidateName)}}>{ini(c.candidateName)}</div><div><div style={{fontWeight:700,color:T.t1,fontSize:".84rem",whiteSpace:"nowrap"}}>{c.candidateName||"—"}</div>{c.email&&<div style={{fontSize:".66rem",color:T.t3}}>{c.email}</div>}</div></div></td>
                    <td style={{color:T.t2,fontSize:".8rem",whiteSpace:"nowrap"}}>{c.vendorName||"—"}</td>
                    <td style={{color:T.acc,fontWeight:600,fontSize:".82rem",whiteSpace:"nowrap"}}>{c.client||"—"}</td>
                    <td style={{fontSize:".8rem",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.role||"—"}</td>
                    <td>{c.rate?<span style={{padding:".14rem .5rem",borderRadius:6,backdropFilter:"blur(8px)",background:"rgba(0,210,160,.08)",border:"1px solid rgba(0,210,160,.18)",color:T.ok,fontSize:".72rem",fontWeight:700}}>${c.rate}/hr</span>:"—"}</td>
                    <td><span className={`chip ${cls}`}>{c.status||"Submitted"}</span></td>
                    <td style={{padding:".65rem .8rem"}}><div style={{display:"flex",gap:".3rem"}}><button className="ab av" onClick={()=>setViewM(c)}>👁</button><button className="ab ae" onClick={()=>setEditM({...c})}>✏️</button><button className="ab ad" onClick={()=>setDelId(c.id)}>🗑</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator total={fil.length} page={pg} ps={ps} setPage={setPg}/>
      </div>
      <Modal open={!!editM} onClose={()=>setEditM(null)} title="✏️ Edit Candidate" footer={<><button className="btn ghost sm" onClick={()=>setEditM(null)}>Cancel</button><button className="btn sm" onClick={svEdit}>💾 Save</button></>}>{editM&&<CandForm data={editM} onChange={setEditM}/>}</Modal>
      <Modal open={!!viewM} onClose={()=>setViewM(null)} title="👁 Profile" footer={<><button className="btn ghost sm" onClick={()=>setViewM(null)}>Close</button><button className="btn sm" onClick={()=>{setEditM({...viewM});setViewM(null);}}>✏️ Edit</button></>}>
        {viewM&&<div>
          <div style={{display:"flex",alignItems:"center",gap:"1.1rem",marginBottom:"1.2rem",padding:"1rem 1.1rem",background:"rgba(0,0,0,.25)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12}}>
            <div className="avatar" style={{width:54,height:54,fontSize:"1.2rem",background:avG(viewM.candidateName)}}>{ini(viewM.candidateName)}</div>
            <div style={{flex:1}}><div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,color:T.t1,fontSize:"1rem",marginBottom:".2rem"}}>{viewM.candidateName}</div><div style={{color:T.t3,fontSize:".82rem"}}>{viewM.role||"No role"}</div><span className={`chip ${S_CLS[viewM.status||"Submitted"]||"s-sub"}`} style={{marginTop:".35rem",display:"inline-flex"}}>{viewM.status||"Submitted"}</span></div>
            {viewM.rate&&<div style={{textAlign:"right"}}><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.4rem",fontWeight:700,color:T.ok,textShadow:`0 0 14px ${T.ok}`}}>${viewM.rate}<span style={{fontSize:".7rem",color:T.t3}}>/hr</span></div></div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
            {[["Vendor",viewM.vendorName],["Date",viewM.date],["Client",viewM.client],["Location",viewM.location],["Phone",viewM.phoneNumber],["Email",viewM.email],["Category",viewM.category]].filter(r=>r[1]).map(([l,v])=>(
              <div key={l} style={{background:"rgba(0,0,0,.22)",backdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:".75rem .95rem"}}>
                <div style={{fontSize:".64rem",color:`rgba(${T.g},1)`,fontWeight:700,fontFamily:"'Orbitron',sans-serif",marginBottom:".3rem"}}>{l}</div>
                <div style={{color:T.t1,fontSize:".88rem",fontWeight:600,wordBreak:"break-all"}}>{v}</div>
              </div>
            ))}
            {viewM.notes&&<div style={{gridColumn:"1/-1",background:"rgba(0,0,0,.22)",backdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:".75rem .95rem"}}><div style={{fontSize:".64rem",color:`rgba(${T.g},1)`,fontWeight:700,fontFamily:"'Orbitron',sans-serif",marginBottom:".3rem"}}>Notes</div><div style={{color:T.t2,fontSize:".86rem",lineHeight:1.6}}>{viewM.notes}</div></div>}
          </div>
        </div>}
      </Modal>
      {delId&&<div className="mov" onClick={()=>setDelId(null)}><div style={{background:"rgba(0,0,0,.65)",backdropFilter:"blur(28px)",border:"1px solid rgba(239,68,68,.3)",borderRadius:16,padding:"1.5rem",maxWidth:400,width:"100%",animation:"popIn .3s both"}}><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".88rem",fontWeight:700,color:"#FCA5A5",marginBottom:".75rem"}}>🗑 Delete Candidate?</div><p style={{color:T.t2,lineHeight:1.65,marginBottom:"1.2rem"}}>This will permanently remove this candidate.</p><div style={{display:"flex",gap:".75rem",justifyContent:"flex-end"}}><button className="btn ghost sm" onClick={()=>setDelId(null)}>Cancel</button><button className="btn btn-d sm" onClick={()=>{del(delId);setDelId(null);}}>Delete</button></div></div></div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   INTERVIEWS
───────────────────────────────────────────── */
function Interviews({ cands, ivs, setIvs, toast, T }) {
  const [srch,setSrch]=useState(""), [sf,setSf]=useState("All"), [pg,setPg]=useState(1), [ps,setPs]=useState(10);
  const [showF,setShowF]=useState(false), [form,setForm]=useState({date:tod(),time:"09:00",timezone:"EST",mode:"Virtual",round:"Screening",status:"Scheduled"});
  const [editM,setEditM]=useState(null), [delId,setDelId]=useState(null);
  const [sk,setSk]=useState("date"), [sd,setSd]=useState("desc");
  const dSrch=useDeferredValue(srch);
  const fil=useMemo(()=>{
    const q=dSrch.toLowerCase();
    let f=ivs.filter(iv=>[iv.candidateName,iv.client,iv.round,iv.status,iv.mode,iv.timezone,iv.notes,iv.location].some(v=>(v||"").toLowerCase().includes(q)));
    if(sf!=="All")f=f.filter(iv=>iv.status===sf);
    return [...f].sort((a,b)=>{let va=a[sk]||"",vb=b[sk]||"";if(sk==="date"||sk==="time"){va=va.toString();vb=vb.toString();}return(va<vb?-1:va>vb?1:0)*(sd==="asc"?1:-1);});
  },[ivs,dSrch,sf,sk,sd]);
  const slc=fil.slice((pg-1)*ps,pg*ps);
  const sv=async u=>{setIvs(u);await ss("ats_interviews",u);};
  const add=async()=>{if(!form.candidateId||!form.client?.trim()){toast("Candidate & Client required","err");return;}const c=cands.find(x=>x.id==form.candidateId);await sv([...ivs,{...form,id:Date.now(),candidateName:c?.candidateName||""}]);setForm({date:tod(),time:"09:00",timezone:"EST",mode:"Virtual",round:"Screening",status:"Scheduled"});setShowF(false);toast("Interview scheduled ✓","ok");};
  const svEdit=async()=>{const c=cands.find(x=>x.id==editM.candidateId);await sv(ivs.map(i=>i.id===editM.id?{...editM,candidateName:c?.candidateName||editM.candidateName}:i));setEditM(null);toast("Updated ✓","ok");};
  const del=async id=>{await sv(ivs.filter(i=>i.id!==id));toast("Deleted","info");};
  const upcoming=ivs.filter(iv=>iv.date>=tod()&&iv.status==="Scheduled").length;
  const IvF=({d,ch})=>{const s=k=>e=>ch({...d,[k]:e.target.value});return(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".85rem"}}>
    <div><label className="lbl">Candidate *</label><select className="inp" value={d.candidateId||""} onChange={e=>{const c=cands.find(x=>x.id==e.target.value);ch({...d,candidateId:e.target.value,candidateName:c?.candidateName||"",client:d.client||c?.client||""});}}><option value="">Select…</option>{cands.map(c=><option key={c.id} value={c.id}>{c.candidateName} — {c.client}</option>)}</select></div>
    <div><label className="lbl">Client *</label><input className="inp" value={d.client||""} onChange={s("client")} placeholder="Company"/></div>
    <div><label className="lbl">Date *</label><input type="date" className="inp" value={d.date||""} onChange={s("date")}/></div>
    <div><label className="lbl">Time</label><input type="time" className="inp" value={d.time||""} onChange={s("time")}/></div>
    {[["Timezone","timezone",["EST","CST","MST","PST","AKST","HST","IST","GMT"]],["Mode","mode",["Virtual","Phone","Face to Face"]],["Round","round",["Screening","Technical","Manager","HR Round","Final Round"]],["Status","status",["Scheduled","Completed","Pending","Rejected"]]].map(([l,k,opts])=><div key={k}><label className="lbl">{l}</label><select className="inp" value={d[k]||""} onChange={s(k)}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>)}
    <div><label className="lbl">Interviewer</label><input className="inp" value={d.interviewer||""} onChange={s("interviewer")} placeholder="Name"/></div>
    <div style={{gridColumn:"1/-1"}}><label className="lbl">Notes</label><textarea className="inp" rows={2} value={d.notes||""} onChange={s("notes")} style={{resize:"vertical"}}/></div>
  </div>);};
  const sc2=k=>{if(sk===k)setSd(d=>d==="asc"?"desc":"asc");else{setSk(k);setSd("asc");}};
  const SI=({k})=>sk===k?(sd==="asc"?"▲":"▼"):null;
  return (
    <div className="page-in">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:".75rem"}}>
        <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,display:"flex",alignItems:"center",gap:".6rem"}}>🗓 Interviews <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:".85rem",color:T.t3,fontWeight:600}}>({ivs.length})</span>{upcoming>0&&<span style={{padding:".18rem .65rem",borderRadius:20,fontSize:".68rem",fontWeight:700,backdropFilter:"blur(10px)",background:"rgba(249,115,22,.12)",border:"1px solid rgba(249,115,22,.28)",color:"#FB923C"}}>{upcoming} upcoming</span>}</h1>
        <button className="btn sm" onClick={()=>setShowF(v=>!v)}>➕ {showF?"Cancel":"Schedule"}</button>
      </div>
      {showF&&<div className="glass page-in" style={{marginBottom:"1.2rem"}}><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:T.t1,marginBottom:"1rem"}}>🗓 Schedule Interview</div><IvF d={form} ch={setForm}/><div style={{display:"flex",gap:".75rem",marginTop:"1rem"}}><button className="btn" onClick={add}>📅 Schedule</button><button className="btn ghost" onClick={()=>setShowF(false)}>Cancel</button></div></div>}
      <div className="glass">
        <div style={{display:"flex",gap:".65rem",marginBottom:".85rem",flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,minWidth:200}}><span style={{position:"absolute",left:".75rem",top:"50%",transform:"translateY(-50%)"}}>🔍</span><input className="inp" value={srch} onChange={e=>{setSrch(e.target.value);setPg(1);}} placeholder="Search…" style={{paddingLeft:"2.2rem"}}/></div>
          <select className="inp" value={sf} onChange={e=>{setSf(e.target.value);setPg(1);}} style={{width:150,flex:"none"}}><option value="All">All</option>{["Scheduled","Completed","Pending","Rejected"].map(s=><option key={s}>{s}</option>)}</select>
        </div>
        <TTbar total={fil.length} page={pg} ps={ps} onSize={n=>{setPs(n);setPg(1);}}/>
        <div style={{overflowX:"auto"}}>
          <table className="tbl">
            <thead><tr>{[{k:null,l:"#"},{k:"date",l:"Date"},{k:"candidateName",l:"Candidate"},{k:"client",l:"Client"},{k:"time",l:"Time"},{k:"mode",l:"Mode"},{k:"round",l:"Round"},{k:"status",l:"Status"},{k:null,l:"Actions"}].map(({k,l})=><th key={l} style={k?{cursor:"pointer"}:{}} onClick={k?()=>sc2(k):undefined}>{l} {k&&<SI k={k}/>}</th>)}</tr></thead>
            <tbody>
              {slc.length===0?<tr><td colSpan={9} style={{textAlign:"center",padding:"2.5rem",color:T.t3}}><div style={{fontSize:"2rem",marginBottom:".5rem"}}>🗓</div>No interviews found</td></tr>:
              slc.map((iv,i)=>{
                const cls=IV_CLS[iv.status]||"iv-p";
                const isUp=iv.date>=tod()&&iv.status==="Scheduled";
                return(
                  <tr key={iv.id} style={isUp?{boxShadow:"inset 3px 0 0 #FB923C"}:{}}>
                    <td><span className="rn">{(pg-1)*ps+i+1}</span></td>
                    <td style={{whiteSpace:"nowrap",fontSize:".78rem"}}>{iv.date||"—"}</td>
                    <td><div style={{display:"flex",alignItems:"center",gap:".55rem"}}><div className="avatar" style={{background:avG(iv.candidateName)}}>{ini(iv.candidateName)}</div><span style={{fontWeight:700,color:T.t1,fontSize:".84rem",whiteSpace:"nowrap"}}>{iv.candidateName||"—"}</span></div></td>
                    <td style={{color:T.acc,fontWeight:600,fontSize:".82rem",whiteSpace:"nowrap"}}>{iv.client||"—"}</td>
                    <td><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".78rem",fontWeight:700,color:T.lit}}>{iv.time||"—"}</div><span style={{padding:".1rem .45rem",borderRadius:5,backdropFilter:"blur(8px)",background:`rgba(${T.g},.1)`,border:`1px solid rgba(${T.g},.26)`,fontSize:".64rem",fontWeight:700,color:T.lit}}>{iv.timezone||"EST"}</span></td>
                    <td style={{fontSize:".8rem"}}>{iv.mode||"—"}</td>
                    <td><span style={{padding:".18rem .55rem",borderRadius:6,backdropFilter:"blur(8px)",fontSize:".72rem",fontWeight:700,background:`rgba(${T.g},.1)`,color:T.lit}}>{iv.round||"—"}</span></td>
                    <td><span className={`chip ${cls}`}>{iv.status}</span></td>
                    <td style={{padding:".65rem .8rem"}}><div style={{display:"flex",gap:".3rem"}}><button className="ab ae" onClick={()=>setEditM({...iv})}>✏️</button><button className="ab ad" onClick={()=>setDelId(iv.id)}>🗑</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator total={fil.length} page={pg} ps={ps} setPage={setPg}/>
      </div>
      <Modal open={!!editM} onClose={()=>setEditM(null)} title="✏️ Edit Interview" footer={<><button className="btn ghost sm" onClick={()=>setEditM(null)}>Cancel</button><button className="btn sm" onClick={svEdit}>💾 Save</button></>}>{editM&&<IvF d={editM} ch={setEditM}/>}</Modal>
      {delId&&<div className="mov" onClick={()=>setDelId(null)}><div style={{background:"rgba(0,0,0,.65)",backdropFilter:"blur(28px)",border:"1px solid rgba(239,68,68,.3)",borderRadius:16,padding:"1.5rem",maxWidth:400,width:"100%",animation:"popIn .3s both"}}><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".88rem",fontWeight:700,color:"#FCA5A5",marginBottom:".75rem"}}>🗑 Delete Interview?</div><p style={{color:T.t2,lineHeight:1.65,marginBottom:"1.2rem"}}>This will permanently remove this interview.</p><div style={{display:"flex",gap:".75rem",justifyContent:"flex-end"}}><button className="btn ghost sm" onClick={()=>setDelId(null)}>Cancel</button><button className="btn btn-d sm" onClick={()=>{del(delId);setDelId(null);}}>Delete</button></div></div></div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ANALYTICS (Heatmap + Activity Feed + Radar)
───────────────────────────────────────────── */
function Analytics({ cands, ivs, T }) {
  const [selC,setSelC]=useState(""), [radar,setRadar]=useState(null), [loadR,setLoadR]=useState(false);
  const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], hours=[8,9,10,11,12,13,14,15,16,17,18];
  const hm=useMemo(()=>{const g={};hours.forEach(h=>days.forEach(d=>{g[`${d}-${h}`]=0;}));ivs.forEach(iv=>{if(!iv.date||!iv.time)return;const d=days[new Date(iv.date).getDay()];const hr=parseInt(iv.time?.split(":")?.[0]||"0");const k=`${d}-${hr}`;if(g[k]!==undefined)g[k]++;});return g;},[ivs]);
  const maxHM=Math.max(1,...Object.values(hm));
  const getHC=v=>v===0?"rgba(255,255,255,.04)":`rgba(${T.g},${0.08+v/maxHM*0.88})`;
  const [tip,setTip]=useState(null);
  const events=useMemo(()=>{const list=[];[...cands].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,6).forEach(c=>list.push({t:"c",e:"👤",color:"#818CF8",time:c.date||"",msg:`${c.candidateName||"Someone"} → ${c.client||"client"}`,sub:c.role||"",st:c.status}));[...ivs].sort((a,b)=>new Date(b.date||0)-new Date(a.date||0)).slice(0,6).forEach(iv=>{const co={"Scheduled":"#90CAF9","Completed":"#00D2A0","Pending":"#FCD34D","Rejected":"#FCA5A5"}[iv.status]||"#90CAF9";list.push({t:"i",e:"🗓",color:co,time:iv.date||"",msg:`${iv.candidateName||"Cand"} — ${iv.round||"IV"} @ ${iv.client||""}`,sub:`${iv.time||""} ${iv.timezone||""}`,st:iv.status});});return list.sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,10);},[cands,ivs]);
  const analyzeRadar=async()=>{const c=cands.find(x=>x.id==selC);if(!c)return;setLoadR(true);try{const raw=await callAI(`Estimate skill scores 0-100 for candidate. Return ONLY JSON: {"technical":<n>,"communication":<n>,"experience":<n>,"culture":<n>,"presentation":<n>}\nCandidate: ${c.candidateName}, Role: ${c.role}, Client: ${c.client}, Status: ${c.status}`);const d=JSON.parse(raw.replace(/```json|```/g,"").trim());setRadar([{dim:"Technical",v:d.technical||70},{dim:"Communication",v:d.communication||70},{dim:"Experience",v:d.experience||65},{dim:"Culture Fit",v:d.culture||75},{dim:"Presentation",v:d.presentation||68}]);}catch{setRadar([{dim:"Technical",v:70},{dim:"Communication",v:75},{dim:"Experience",v:65},{dim:"Culture Fit",v:80},{dim:"Presentation",v:72}]);}setLoadR(false);};
  const TT={contentStyle:{background:"rgba(0,0,0,.75)",backdropFilter:"blur(16px)",border:`1px solid rgba(${T.g},.28)`,borderRadius:10,fontFamily:"'Rajdhani',sans-serif",color:T.t1}};
  return (
    <div className="page-in">
      <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,marginBottom:"1.5rem"}}>📈 Analytics Center</h1>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"1.4rem"}} className="grid2">
        <div className="glass">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".78rem",fontWeight:700,color:T.t1,marginBottom:"1rem"}}>🌡️ Interview Density Heatmap</div>
          {ivs.length===0?<div style={{textAlign:"center",padding:"1.5rem",color:T.t3,fontSize:".84rem"}}>Schedule interviews to see patterns</div>:(
            <div style={{overflowX:"auto"}}>
              <div style={{display:"grid",gridTemplateColumns:`44px repeat(${days.length},1fr)`,gap:2,minWidth:350}}>
                <div/>{days.map(d=><div key={d} style={{textAlign:"center",fontFamily:"'Orbitron',sans-serif",fontSize:".56rem",fontWeight:700,color:T.t3,letterSpacing:".8px",padding:".2rem 0"}}>{d}</div>)}
                {hours.map(hr=>[
                  <div key={"h"+hr} style={{display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:6,fontFamily:"'Orbitron',sans-serif",fontSize:".56rem",color:T.t3}}>{hr}</div>,
                  ...days.map(d=>{const k=`${d}-${hr}`,v=hm[k]||0;return <div key={k} className="hmc" style={{background:getHC(v),color:v>0?"#fff":"transparent"}} title={`${d} ${hr}:00 — ${v} interviews`}>{v>0?v:""}</div>;})
                ])}
              </div>
            </div>
          )}
        </div>
        <div className="glass">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".78rem",fontWeight:700,color:T.t1,marginBottom:"1rem",display:"flex",alignItems:"center",gap:".5rem"}}>⚡ Live Activity <span style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",animation:"pulse .8s ease-in-out infinite",display:"inline-block"}}/></div>
          <div style={{maxHeight:340,overflowY:"auto"}}>
            {events.length===0?<div style={{textAlign:"center",padding:"2rem",color:T.t3,fontSize:".84rem"}}>Add data to see activity</div>:events.map((ev,i)=>(
              <div key={i} className="ai-item" style={{borderLeftColor:ev.color,animationDelay:i*.035+"s"}}>
                <div style={{width:34,height:34,borderRadius:9,background:ev.color+"22",border:`1px solid ${ev.color}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"1rem"}}>{ev.e}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:T.t1,fontSize:".84rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.msg}</div>
                  <div style={{display:"flex",alignItems:"center",gap:".5rem",marginTop:".15rem",flexWrap:"wrap"}}>
                    {ev.sub&&<span style={{fontSize:".7rem",color:T.t3}}>{ev.sub}</span>}
                    {ev.time&&<span style={{fontSize:".68rem",color:T.t3}}>📅 {ev.time}</span>}
                    {ev.st&&<span style={{padding:".08rem .4rem",borderRadius:5,backdropFilter:"blur(8px)",background:ev.color+"22",border:`1px solid ${ev.color}33`,fontSize:".62rem",fontWeight:700,color:ev.color}}>{ev.st}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="glass">
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".78rem",fontWeight:700,color:T.t1,marginBottom:"1rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:".5rem"}}>
          <span>🎯 Candidate Skill Radar (AI)</span>
          <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
            <select className="inp" value={selC} onChange={e=>setSelC(e.target.value)} style={{width:220,padding:".42rem .7rem"}}><option value="">Select candidate…</option>{cands.map(c=><option key={c.id} value={c.id}>{c.candidateName} — {c.role}</option>)}</select>
            <button className="btn btn-p sm" onClick={analyzeRadar} disabled={!selC||loadR}>{loadR?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>:"🧠"}{loadR?"Analyzing…":"Analyze"}</button>
          </div>
        </div>
        {!radar&&!loadR&&<div style={{textAlign:"center",padding:"2rem",color:T.t3,fontSize:".84rem"}}>Select a candidate and click Analyze for AI skill assessment</div>}
        {radar&&(
          <div style={{display:"flex",alignItems:"center",gap:"2rem",flexWrap:"wrap"}}>
            <ResponsiveContainer width="55%" height={260}>
              <RadarChart data={radar}><PolarGrid stroke={`rgba(${T.g},.12)`}/><PolarAngleAxis dataKey="dim" tick={{fill:T.t3,fontSize:11,fontFamily:"'Rajdhani',sans-serif"}}/><Radar name="Score" dataKey="v" stroke={`rgba(${T.g},1)`} fill={`rgba(${T.g},1)`} fillOpacity={0.2}/><Tooltip {...TT}/></RadarChart>
            </ResponsiveContainer>
            <div style={{flex:1,minWidth:180}}>
              {radar.map(({dim,v})=>{const col=v>=75?T.ok:v>=55?T.lit:T.err;return(<div key={dim} style={{marginBottom:".65rem"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:".25rem",fontSize:".8rem"}}><span style={{color:T.t2,fontWeight:600}}>{dim}</span><span style={{fontWeight:700,color:col}}>{v}</span></div><div style={{height:6,borderRadius:3,background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",borderRadius:3,background:col,width:v+"%",transition:"width 1s"}}/></div></div>);})}
              <div style={{marginTop:".75rem",padding:".55rem .8rem",background:`rgba(${T.g},.08)`,backdropFilter:"blur(10px)",border:`1px solid rgba(${T.g},.2)`,borderRadius:8,textAlign:"center"}}>
                <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.4rem",fontWeight:700,color:T.lit,textShadow:`0 0 14px ${T.lit}`}}>{Math.round(radar.reduce((s,d)=>s+d.v,0)/radar.length)}<span style={{fontSize:".75rem",color:T.t3,marginLeft:".3rem"}}>/100</span></div>
                <div style={{fontSize:".68rem",color:T.t3,fontWeight:700,letterSpacing:".5px"}}>AVG SCORE</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EMAIL EXTRACTOR
───────────────────────────────────────────── */
function EmailExtractor({ emails, setEmails, toast, T }) {
  const [txt,setTxt]=useState(""), [flt,setFlt]=useState("");
  const extract=()=>{const found=[...new Set(txt.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)||[])];if(!found.length){toast("No emails found","err");return;}const merged=[...emails];let added=0;found.forEach(em=>{if(!merged.find(e=>e.email===em)){merged.push({id:Date.now()+Math.random(),email:em,domain:em.split("@")[1]||"",type:/gmail|yahoo|hotmail|outlook/i.test(em)?"personal":"business"});added++;}});setEmails(merged);setTxt("");toast(`Found ${found.length} · ${added} new ✓`,"ok");};
  const shown=useMemo(()=>{
    if(!flt)return emails;
    const lq=flt.toLowerCase();
    return emails.filter(e=>e.email.toLowerCase().includes(lq)||e.domain.toLowerCase().includes(lq.replace("@",""))||e.type.toLowerCase().includes(lq))
      .sort((a,b)=>{
        const aE=a.email.toLowerCase().includes(lq)?2:0;
        const bE=b.email.toLowerCase().includes(lq)?2:0;
        const aD=a.domain.toLowerCase().includes(lq.replace("@",""))?1:0;
        const bD=b.domain.toLowerCase().includes(lq.replace("@",""))?1:0;
        return (bE+bD)-(aE+aD);
      });
  },[emails,flt]);
  const biz=useMemo(()=>emails.filter(e=>e.type==="business"),[emails]);
  return (
    <div className="page-in">
      <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,marginBottom:"1.5rem"}}>📧 Email Extractor</h1>
      {emails.length>0&&<div style={{display:"flex",gap:".65rem",marginBottom:"1.2rem",flexWrap:"wrap"}}>{[{l:"Total",v:emails.length,c:T.info},{l:"Business",v:biz.length,c:T.ok},{l:"Personal",v:emails.length-biz.length,c:T.warn},{l:"Domains",v:new Set(emails.map(e=>e.domain)).size,c:"#818CF8"}].map(({l,v,c})=><div key={l} style={{padding:".55rem 1rem",borderRadius:10,backdropFilter:"blur(12px)",background:`${c}12`,border:`1px solid ${c}28`,display:"flex",alignItems:"center",gap:".55rem"}}><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.2rem",fontWeight:700,color:c,textShadow:`0 0 12px ${c}`}}>{v}</span><span style={{fontSize:".68rem",color:T.t3,fontWeight:700,letterSpacing:".4px",textTransform:"uppercase"}}>{l}</span></div>)}</div>}
      <div className="glass"><label className="lbl">Paste any text — resumes, emails, threads…</label><textarea className="inp" rows={8} value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Paste text here. All emails will be extracted automatically." style={{resize:"vertical",marginBottom:"1rem"}}/><div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}><button className="btn" onClick={extract}>🔍 Extract Emails</button><button className="btn ghost" onClick={()=>setTxt("")}>🗑 Clear</button></div></div>
      {emails.length>0&&<div className="glass">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:".75rem",marginBottom:"1rem"}}>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:T.t1}}>Extracted Emails <span style={{color:T.t3,fontWeight:400}}>({emails.length})</span></span>
          <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
            <button className="btn ghost sm" onClick={()=>navigator.clipboard.writeText(emails.map(e=>e.email).join("\n")).then(()=>toast("Copied ✓","ok"))}>📋 All</button>
            <button className="btn ghost sm" onClick={()=>navigator.clipboard.writeText(biz.map(e=>e.email).join("\n")).then(()=>toast("Copied ✓","ok"))}>📋 Business</button>
            <button className="btn ghost sm" onClick={()=>navigator.clipboard.writeText(shown.map(e=>e.email).join("\n")).then(()=>toast("Copied ✓","ok"))}>📋 Shown</button>
            <button className="btn ghost sm" style={{borderColor:"rgba(239,68,68,.4)",color:"#FCA5A5"}} onClick={()=>{if(confirm("Clear all?"))setEmails([]);}}>🗑 Clear</button>
          </div>
        </div>
        <div style={{position:"relative",marginBottom:"1rem"}}><span style={{position:"absolute",left:".75rem",top:"50%",transform:"translateY(-50%)"}}>🔍</span><input className="inp" value={flt} onChange={e=>setFlt(e.target.value.toLowerCase())} placeholder="Filter…" style={{paddingLeft:"2.2rem"}}/></div>
        <div style={{maxHeight:420,overflowY:"auto"}}>
          {shown.map((e,i)=>(
            <div key={e.id} className="ei" style={{animationDelay:i*.03+"s"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"monospace",fontWeight:700,color:T.lit,fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.email}</div>
                <div style={{display:"flex",gap:".5rem",marginTop:".15rem",alignItems:"center"}}><span style={{fontSize:".68rem",color:T.t3}}>@{e.domain}</span><span style={{padding:".08rem .4rem",borderRadius:4,backdropFilter:"blur(8px)",fontSize:".6rem",fontWeight:700,background:e.type==="business"?"rgba(0,210,160,.1)":"rgba(252,211,77,.08)",border:`1px solid ${e.type==="business"?"rgba(0,210,160,.22)":"rgba(252,211,77,.2)"}`,color:e.type==="business"?T.ok:T.warn}}>{e.type}</span></div>
              </div>
              <div style={{display:"flex",gap:".35rem",flexShrink:0}}>
                <button className="ab" style={{background:"rgba(0,210,160,.1)",border:"1px solid rgba(0,210,160,.28)",color:T.ok}} onClick={()=>navigator.clipboard.writeText(e.email).then(()=>toast("Copied","info"))}>📋</button>
                <button className="ab ad" onClick={()=>setEmails(emails.filter(x=>x.id!==e.id))}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TIMEZONE
───────────────────────────────────────────── */
function Timezone({ T }) {
  const [clocks,setClocks]=useState({}), [tzDate,setTzDate]=useState(tod()), [tzTime,setTzTime]=useState("09:00"), [tzSrc,setTzSrc]=useState("America/New_York"), [conv,setConv]=useState([]);
  useEffect(()=>{const tick=()=>{const r={};US_TZ.forEach(z=>r[z.id]=fmt12(z.id));setClocks(r);};tick();const i=setInterval(tick,1000);return()=>clearInterval(i);},[]);
  const convert=()=>{try{const inp=new Date(`${tzDate}T${tzTime}:00`);setConv(US_TZ.map(z=>{const pts=new Intl.DateTimeFormat("en-US",{timeZone:z.id,hour:"2-digit",minute:"2-digit",hour12:true,weekday:"short",month:"short",day:"numeric",year:"numeric"}).formatToParts(inp);const g=t=>pts.find(p=>p.type===t)?.value||"";const now=new Date();const loc=new Date(now.toLocaleString("en-US",{timeZone:z.id}));const utc=new Date(now.toLocaleString("en-US",{timeZone:"UTC"}));const diff=(loc-utc)/3600000;const sign=diff>=0?"+":"-";const ah=Math.floor(Math.abs(diff));const am=Math.round((Math.abs(diff)-ah)*60);return{...z,time:`${g("hour")}:${g("minute")} ${g("dayPeriod")}`,date:`${g("weekday")}, ${g("month")} ${g("day")}, ${g("year")}`,offset:`UTC ${sign}${ah}${am>0?":"+String(am).padStart(2,"0"):""}`,isSrc:z.id===tzSrc};}));}catch{}};
  return (
    <div className="page-in">
      <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,marginBottom:"1.5rem"}}>🕐 USA Timezone Converter</h1>
      <div style={{display:"flex",flexWrap:"wrap",gap:".6rem",padding:".75rem 1rem",background:"rgba(0,0,0,.2)",backdropFilter:"blur(22px)",border:`1px solid rgba(${T.g},.18)`,borderTop:"1px solid rgba(255,255,255,.07)",borderRadius:14,marginBottom:"1.4rem"}}>
        {US_TZ.map(z=>(
          <div key={z.id} className="clk" onClick={()=>{setTzSrc(z.id);convert();}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".5rem",fontWeight:700,color:`rgba(${T.g},.85)`,letterSpacing:".8px",textTransform:"uppercase"}}>{z.ab}</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".9rem",fontWeight:700,color:z.c,letterSpacing:".5px",textShadow:`0 0 10px ${z.c}`}}>{clocks[z.id]||"—"}</div>
            <div style={{fontSize:".58rem",color:T.t3,fontWeight:600}}>{z.nm}</div>
          </div>
        ))}
      </div>
      <div className="glass">
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:T.t1,marginBottom:"1.2rem"}}>🔄 Convert Specific Time</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:"1rem",marginBottom:"1.2rem"}}>
          <div><label className="lbl">Date</label><input type="date" className="inp" value={tzDate} onChange={e=>setTzDate(e.target.value)}/></div>
          <div><label className="lbl">Time</label><input type="time" className="inp" value={tzTime} onChange={e=>setTzTime(e.target.value)}/></div>
          <div><label className="lbl">From Timezone</label><select className="inp" value={tzSrc} onChange={e=>setTzSrc(e.target.value)}>{[["America/New_York","Eastern"],["America/Chicago","Central"],["America/Denver","Mountain"],["America/Los_Angeles","Pacific"],["America/Anchorage","Alaska"],["Pacific/Honolulu","Hawaii"],["UTC","UTC / GMT"],["Asia/Kolkata","India (IST)"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}><button className="btn" onClick={convert} style={{width:"100%"}}>🔄 Convert</button></div>
        </div>
        {conv.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:".85rem"}}>
          {conv.map((z,i)=>(
            <div key={z.id} className={`tzc${z.isSrc?" src":""}`} style={{animation:`fadeUp .4s ${i*.06}s both`}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".7rem",fontWeight:700,color:z.c,letterSpacing:"1px",marginBottom:".25rem"}}>{z.ab}</div>
              <div style={{fontSize:".74rem",color:T.t3,marginBottom:".45rem"}}>{z.nm}</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.55rem",fontWeight:700,color:z.c,lineHeight:1,textShadow:`0 0 12px ${z.c}`}}>{z.time}</div>
              <div style={{fontSize:".72rem",color:T.t3,marginTop:".3rem"}}>{z.date}</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:".55rem"}}>
                <span style={{padding:".12rem .5rem",borderRadius:5,backdropFilter:"blur(8px)",background:`rgba(${T.g},.1)`,border:`1px solid rgba(${T.g},.2)`,fontSize:".66rem",fontWeight:700,color:T.lit}}>{z.offset}</span>
                <button onClick={()=>navigator.clipboard.writeText(`${z.time} ${z.ab} — ${z.date}`)} style={{background:`rgba(${T.g},.08)`,backdropFilter:"blur(8px)",border:`1px solid rgba(${T.g},.2)`,borderRadius:5,padding:".2rem .55rem",fontSize:".68rem",fontWeight:700,color:T.lit,cursor:"pointer"}}>📋</button>
              </div>
              {z.isSrc&&<div style={{marginTop:".4rem",padding:".1rem .5rem",borderRadius:5,backdropFilter:"blur(8px)",background:"rgba(74,222,128,.12)",border:"1px solid rgba(74,222,128,.3)",fontSize:".62rem",fontWeight:700,color:"#4ade80",display:"inline-block"}}>SOURCE</div>}
            </div>
          ))}
        </div>}
        <div style={{marginTop:"1.2rem",padding:".75rem 1rem",background:"rgba(0,0,0,.18)",backdropFilter:"blur(12px)",border:`1px solid rgba(${T.g},.14)`,borderRadius:8,fontSize:".8rem",color:T.t3}}>⚠️ <strong style={{color:T.warn}}>DST Note:</strong> Results account for Daylight Saving automatically. Hawaii and most of Arizona do not observe DST.</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INTERVIEW PREP GENERATOR
───────────────────────────────────────────── */
function PrepGen({ cands, toast, T }) {
  const [role,setRole]=useState(""), [level,setLevel]=useState("Mid-level"), [type,setType]=useState("Technical"), [loading,setLoading]=useState(false), [questions,setQuestions]=useState(null), [selC,setSelC]=useState("");
  const generate=async()=>{
    const r=role.trim()||(selC&&cands.find(c=>c.id==selC)?.role)||"Software Engineer";
    setLoading(true);
    try{
      const raw=await callAI(`Generate structured interview questions. Return ONLY valid JSON:
{"categories":[{"name":"Category","color":"#hexcolor","questions":[{"q":"Question?","hint":"Ideal answer hint","difficulty":"Easy|Medium|Hard"}]}],"tips":["tip1","tip2"],"redFlags":["flag1","flag2"]}
Role="${r}", Level="${level}", Type="${type}"`);
      setQuestions(JSON.parse(raw.replace(/```json|```/g,"").trim()));
    }catch(e){toast("Generation failed: "+e.message,"err");}
    setLoading(false);
  };
  const copyAll=()=>{if(!questions)return;const txt=questions.categories.map(cat=>`## ${cat.name}\n${cat.questions.map((q,i)=>`${i+1}. ${q.q}\n   → ${q.hint}`).join("\n")}`).join("\n\n");navigator.clipboard.writeText(txt).then(()=>toast("Copied ✓","ok"));};
  return (
    <div className="page-in">
      <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,display:"flex",alignItems:"center",gap:".6rem",marginBottom:"1.5rem"}}>🎯 Interview Prep Generator <span style={{padding:".18rem .65rem",borderRadius:20,fontSize:".62rem",fontWeight:700,backdropFilter:"blur(10px)",background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.28)",color:"#818CF8"}}>OpenCode Zen</span></h1>
      <div className="glass">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:".85rem",marginBottom:"1rem"}}>
          <div><label className="lbl">Candidate (optional)</label><select className="inp" value={selC} onChange={e=>{setSelC(e.target.value);const c=cands.find(x=>x.id==e.target.value);if(c?.role)setRole(c.role);}}><option value="">Custom Role</option>{cands.map(c=><option key={c.id} value={c.id}>{c.candidateName} — {c.role}</option>)}</select></div>
          <div><label className="lbl">Role</label><input className="inp" value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Senior React Developer"/></div>
          <div><label className="lbl">Level</label><select className="inp" value={level} onChange={e=>setLevel(e.target.value)}>{["Entry","Mid-level","Senior","Lead","Principal","Director"].map(l=><option key={l}>{l}</option>)}</select></div>
          <div><label className="lbl">Type</label><select className="inp" value={type} onChange={e=>setType(e.target.value)}>{["Technical","Behavioral","System Design","Cultural Fit","Case Study","Final Round"].map(t=><option key={t}>{t}</option>)}</select></div>
        </div>
        <div style={{display:"flex",gap:".75rem"}}><button className="btn" onClick={generate} disabled={loading}>{loading?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>:"✨"}{loading?"Generating…":"Generate Question Bank"}</button>{questions&&<button className="btn ghost" onClick={copyAll}>📋 Copy All</button>}</div>
      </div>
      {questions&&(
        <div className="page-in">
          {questions.tips?.length>0&&<div className="glass" style={{background:"rgba(0,210,160,.04)",borderColor:"rgba(0,210,160,.18)",marginBottom:"1rem"}}><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".72rem",fontWeight:700,color:T.ok,marginBottom:".65rem"}}>⚡ INTERVIEWER TIPS</div>{questions.tips.map((t,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",marginBottom:".4rem",color:T.t2,fontSize:".86rem",lineHeight:1.55}}>✓ {t}</div>)}</div>}
          {questions.redFlags?.length>0&&<div className="glass" style={{background:"rgba(255,77,109,.04)",borderColor:"rgba(255,77,109,.18)",marginBottom:"1rem"}}><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".72rem",fontWeight:700,color:T.err,marginBottom:".65rem"}}>⚠️ WATCH OUT FOR</div>{questions.redFlags.map((f,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:".55rem",marginBottom:".4rem",color:T.t2,fontSize:".86rem",lineHeight:1.55}}>✗ {f}</div>)}</div>}
          {questions.categories?.map((cat,ci)=>(
            <div key={ci} className="glass" style={{marginBottom:"1rem",borderLeft:`3px solid ${cat.color||T.p}`}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".78rem",fontWeight:700,color:cat.color||T.p,marginBottom:"1rem",letterSpacing:".5px"}}>{cat.name}</div>
              {cat.questions?.map((q,qi)=>{const dc=q.difficulty==="Hard"?T.err:q.difficulty==="Medium"?T.warn:T.ok;return(
                <div key={qi} className="pq" style={{borderLeftColor:dc,animationDelay:(ci*.1+qi*.04)+"s"}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:".5rem",marginBottom:".4rem"}}>
                    <div style={{fontWeight:700,color:T.t1,fontSize:".88rem",lineHeight:1.5,flex:1}}>{qi+1}. {q.q}</div>
                    <div style={{display:"flex",gap:".3rem",flexShrink:0}}>
                      <span style={{padding:".1rem .45rem",borderRadius:5,backdropFilter:"blur(8px)",background:`${dc}18`,border:`1px solid ${dc}35`,fontSize:".62rem",fontWeight:700,color:dc}}>{q.difficulty}</span>
                      <button onClick={()=>navigator.clipboard.writeText(q.q)} style={{background:`rgba(${T.g},.1)`,backdropFilter:"blur(8px)",border:`1px solid rgba(${T.g},.2)`,borderRadius:5,padding:".15rem .4rem",color:T.lit,cursor:"pointer",fontSize:".68rem"}}>📋</button>
                    </div>
                  </div>
                  {q.hint&&<div style={{fontSize:".78rem",color:T.t3,padding:".4rem .6rem",background:"rgba(0,0,0,.2)",backdropFilter:"blur(8px)",borderRadius:6,marginTop:".3rem"}}><span style={{color:T.lit,fontWeight:700,marginRight:".3rem"}}>→</span>{q.hint}</div>}
                </div>
              );})}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

   /* ─────────────────────────────────────────────
    AI CHAT
   ───────────────────────────────────────────── */
  function AIChat({ cands, ivs, toast, T }) {
   const [msgs,setMsgs]=useState([{r:"bot",c:"Hi! I'm your ATS AI Assistant powered by OpenCode Zen.\n\nAsk me anything about recruiting, interview prep, writing JDs, market trends, or your pipeline.",ts:new Date().toLocaleTimeString()}]);
  const [input,setInput]=useState(""), [loading,setLoading]=useState(false);
  const ref=useRef();
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[msgs]);
  const QUICK=["Write a JD for Senior React Developer","Top recruiting trends 2025","How to reduce time-to-hire?","Best technical screening practices","Tips for offer negotiation"];
  const send=async txt=>{
    const m=txt||input.trim();if(!m||loading)return;setInput("");
    setMsgs(p=>[...p,{r:"user",c:m,ts:new Date().toLocaleTimeString()}]);
    setLoading(true);
    try{
      const sys=`You are an expert ATS recruitment AI assistant. Current pipeline: ${cands.length} candidates, ${ivs.length} interviews. Top clients: ${[...new Set(cands.slice(0,5).map(c=>c.client).filter(Boolean))].join(", ")||"none yet"}. Be concise, practical and helpful. Use emojis sparingly.`;
      const hist=msgs.slice(-8).map(m=>({role:m.r==="user"?"user":"assistant",content:m.c}));
      const headers={"Content-Type":"application/json"};if(window.__ATS_API_KEY__)headers["Authorization"]="Bearer "+window.__ATS_API_KEY__;
      const apiMsgs = [{role:"system",content:sys},...hist,{role:"user",content:m}];
      const resp=await fetch(API_BASE+"/v1/chat/completions",{method:"POST",headers,body:JSON.stringify({model:"big-pickle",max_tokens:1000,messages:apiMsgs})});
      const d=await resp.json();
      if(d.error)throw new Error(d.error.message);
      setMsgs(p=>[...p,{r:"bot",c:d.choices?.[0]?.message?.content||"Sorry, I couldn't respond.",ts:new Date().toLocaleTimeString()}]);
    }catch(e){setMsgs(p=>[...p,{r:"bot",c:"Error: "+(e.message||"Connection failed")+". Check your API key in Settings.",ts:new Date().toLocaleTimeString()}]);}
    setLoading(false);
  };
  return (
    <div className="page-in" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:".5rem"}}>
        <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,display:"flex",alignItems:"center",gap:".6rem"}}>💬 AI Assistant
          <span style={{padding:".18rem .65rem",borderRadius:20,fontSize:".62rem",fontWeight:700,backdropFilter:"blur(10px)",background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.28)",color:"#818CF8"}}>OpenCode Zen</span>
        </h1>
        <div style={{padding:".38rem .85rem",borderRadius:20,backdropFilter:"blur(12px)",background:window.__ATS_API_KEY__?"rgba(99,102,241,.08)":"rgba(0,210,160,.08)",border:`1px solid ${window.__ATS_API_KEY__?"rgba(99,102,241,.22)":"rgba(0,210,160,.22)"}`,fontSize:".74rem",color:window.__ATS_API_KEY__?"#818CF8":"#00D2A0",fontWeight:700,display:"flex",alignItems:"center",gap:".4rem"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:window.__ATS_API_KEY__?"#818CF8":"#00D2A0",animation:"pulse .8s ease-in-out infinite",display:"inline-block"}}/>
          {window.__ATS_API_KEY__?"API Key Connected ✓":"Free to use · No API key required"}
        </div>
      </div>
      <div style={{display:"flex",gap:".45rem",flexWrap:"wrap",marginBottom:".85rem"}}>{QUICK.map(p=><button key={p} className="btn ghost sm" onClick={()=>send(p)} style={{fontSize:".74rem"}}>{p}</button>)}</div>
      <div ref={ref} style={{flex:1,overflowY:"auto",padding:"1rem",background:"rgba(0,0,0,.2)",backdropFilter:"blur(20px)",border:`1px solid rgba(${T.g},.15)`,borderTop:"1px solid rgba(255,255,255,.07)",borderRadius:16,display:"flex",flexDirection:"column",marginBottom:"1rem",minHeight:0}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.r==="user"?"flex-end":"flex-start",marginBottom:".75rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".2rem",flexDirection:m.r==="user"?"row-reverse":"row"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:m.r==="user"?`linear-gradient(135deg,rgba(${T.g},1),rgba(${T.g2},1))`:"linear-gradient(135deg,#4C1D95,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem"}}>{m.r==="user"?"👤":"🤖"}</div>
              <span style={{fontSize:".64rem",color:T.t3}}>{m.ts}</span>
            </div>
            <div className={`cm ${m.r==="user"?"cu":"cb"}`}>{m.c}</div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",alignItems:"flex-start",gap:".5rem",marginBottom:".75rem"}}><div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#4C1D95,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem"}}>🤖</div><div className="cm cb" style={{display:"flex",gap:".4rem",alignItems:"center",padding:".65rem 1rem"}}>{[0,.2,.4].map(d=><span key={d} style={{width:7,height:7,borderRadius:"50%",background:"#818CF8",display:"inline-block",animation:`dotBounce .8s ${d}s ease-in-out infinite`}}/>)}</div></div>}
      </div>
      <div style={{display:"flex",gap:".65rem",alignItems:"flex-end"}}>
        <textarea className="inp" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="Ask anything… (Enter to send, Shift+Enter new line)" rows={2} style={{resize:"none",flex:1}}/>
        <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
          <button className="btn" onClick={()=>send()} disabled={!input.trim()||loading} style={{height:46,flexShrink:0,width:50,padding:0,justifyContent:"center"}}>{loading?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>:"📨"}</button>
          <button className="btn ghost" onClick={()=>setMsgs([{r:"bot",c:"Chat cleared! How can I help you?",ts:new Date().toLocaleTimeString()}])} style={{height:46,flexShrink:0,width:50,padding:0,justifyContent:"center"}}>🔄</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SETTINGS  (API Keys · Theme · Data · Danger)
───────────────────────────────────────────── */
function Settings({ cands, ivs, ems, theme, setTheme, toast, T }) {
  const [apiKey,setApiKey]   = useState(()=>{ try{return localStorage.getItem("ats_api_key")||"sk-VWkUeP4TLTUn4M55CBXjz8zcvaEkcz7YL9i75TvrABOPimrBtAn0kPlFK7BDGnC2";}catch{return "";} });
  const [showKey,setShowKey] = useState(false);
  const [testing,setTesting] = useState(false);
  const [testOk,setTestOk]   = useState(null);
  const [sbUrl,setSbUrl]     = useState(()=>{ try{return localStorage.getItem("ats_supabase_url")||"https://wthsdvlvipqwmxeuctgh.supabase.co";}catch{return "";} });
  const [sbKey,setSbKey]     = useState(()=>{ try{return localStorage.getItem("ats_supabase_key")||"";}catch{return "";} });

  const defaultApiKey = "sk-VWkUeP4TLTUn4M55CBXjz8zcvaEkcz7YL9i75TvrABOPimrBtAn0kPlFK7BDGnC2";
  const saveKey = () => {
    const k = apiKey.trim();
    window.__ATS_API_KEY__ = k || defaultApiKey;
    try { if(k) localStorage.setItem("ats_api_key",k); else localStorage.setItem("ats_api_key", defaultApiKey); } catch {}
    setTestOk(null);
    toast(k ? "API key saved ✓ — all AI features will use your key" : "API key cleared — using built-in sandbox","ok");
  };

  const saveSupabase = () => {
    const url = sbUrl.trim();
    const key = sbKey.trim();
    try {
      if (url) localStorage.setItem("ats_supabase_url", url); else localStorage.removeItem("ats_supabase_url");
      if (key) localStorage.setItem("ats_supabase_key", key); else localStorage.removeItem("ats_supabase_key");
    } catch {}
    toast("Supabase config saved ✓ — reload to apply","ok");
  };

  const testKey = async () => {
    const k = apiKey.trim();
    if (!k) { toast("Enter a key first","warn"); return; }
    setTesting(true); setTestOk(null);
    try {
      const r = await fetch(API_BASE+"/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+k},
        body:JSON.stringify({model:"big-pickle",max_tokens:10,messages:[{role:"user",content:"Say OK"}]})
      });
      const d = await r.json();
      if (d.choices?.[0]?.message?.content) { setTestOk(true); toast("✅ Key works — connected to OpenCode Zen!","ok"); }
      else { setTestOk(false); toast("Key rejected: "+(d.error?.message||"unknown error"),"err"); }
    } catch(e) { setTestOk(false); toast("Connection error: "+e.message,"err"); }
    setTesting(false);
  };

  const expAll=()=>{const d={candidates:cands,interviews:ivs,emails:ems,exportedAt:new Date().toISOString(),version:"3.0"};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));a.download=`ats-backup-${tod()}.json`;a.click();toast("Backup downloaded ✓","ok");};
  const expCSV=()=>{const h="Date,Name,Vendor,Client,Role,Location,Rate,Status,Email";const rows=cands.map(c=>[c.date,c.candidateName,c.vendorName,c.client,c.role,c.location,c.rate,c.status,c.email].map(v=>`"${(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([h+"\n"+rows],{type:"text/csv"}));a.download=`candidates-${tod()}.csv`;a.click();toast("CSV exported ✓","ok");};
  const clrAll=async()=>{if(!confirm("⚠️ Delete ALL data? This cannot be undone!"))return;await ss("ats_candidates",[]);await ss("ats_interviews",[]);await ss("ats_emails",[]);toast("All data cleared. Reload to see changes.","info");};

  return (
    <div className="page-in">
      <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.t1,marginBottom:"1.5rem"}}>⚙️ Settings</h1>

      {/* ── API KEYS PANEL ── */}
      <div className="glass" style={{marginBottom:"1.4rem",borderColor:`rgba(${T.g},.32)`,position:"relative"}}>
        {/* Glowing left accent bar */}
        <div style={{position:"absolute",left:0,top:14,bottom:14,width:3,borderRadius:"0 3px 3px 0",background:`linear-gradient(180deg,rgba(${T.g},1),rgba(${T.g2},1))`,boxShadow:`0 0 14px rgba(${T.g},.7)`}}/>

        <div style={{paddingLeft:".85rem"}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:".6rem",flexWrap:"wrap",marginBottom:".6rem"}}>
            <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:T.t1}}>🔑 API Keys</span>
            <span style={{padding:".12rem .55rem",borderRadius:20,fontSize:".62rem",fontWeight:700,backdropFilter:"blur(8px)",background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.28)",color:"#818CF8"}}>OpenCode Zen</span>
            {window.__ATS_API_KEY__
              ? <span style={{padding:".12rem .55rem",borderRadius:20,fontSize:".62rem",fontWeight:700,backdropFilter:"blur(8px)",background:"rgba(0,210,160,.1)",border:"1px solid rgba(0,210,160,.28)",color:T.ok}}>● Active</span>
              : <span style={{padding:".12rem .55rem",borderRadius:20,fontSize:".62rem",fontWeight:700,backdropFilter:"blur(8px)",background:"rgba(255,200,0,.08)",border:"1px solid rgba(255,200,0,.25)",color:T.warn}}>Sandbox Mode</span>
            }
          </div>

          <p style={{color:T.t3,fontSize:".83rem",lineHeight:1.65,marginBottom:"1.2rem"}}>
            Paste your OpenCode Zen API key to unlock AI features.
            The key is saved to your browser and injected into <strong style={{color:T.t2}}>AI Matcher, Interview Prep, Analytics Radar</strong> and <strong style={{color:T.t2}}>AI Chat</strong>.
            <br/>
            <span style={{color:`rgba(${T.g2},.9)`,fontWeight:600}}>
              Get your key at opencode.ai/auth — the app falls back to local matching when the API is unavailable.
            </span>
          </p>

          {/* Input + buttons */}
          <div style={{display:"flex",gap:".65rem",alignItems:"flex-end",flexWrap:"wrap",marginBottom:"1rem"}}>
            <div style={{flex:1,minWidth:260}}>
              <label className="lbl">OpenCode Zen API Key</label>
              <div style={{position:"relative"}}>
                <input
                  type={showKey ? "text" : "password"}
                  className="inp"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setTestOk(null); }}
                  placeholder="sk-…"
                  spellCheck={false}
                  autoComplete="off"
                  style={{paddingRight:"3.2rem",fontFamily:"monospace",fontSize:".88rem",letterSpacing:showKey?"normal":".08rem"}}
                />
                <button
                  onClick={() => setShowKey(v=>!v)}
                  style={{position:"absolute",right:".65rem",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"1.1rem",lineHeight:1,padding:".15rem"}}
                  title={showKey ? "Hide key" : "Show key"}
                >{showKey ? "🙈" : "👁"}</button>
              </div>
              {/* Live validation hint */}
              {apiKey.length > 0 && (
                <div style={{marginTop:".38rem",fontSize:".72rem",fontFamily:"monospace",display:"flex",gap:".75rem"}}>
                  {apiKey.trim().startsWith("sk-")
                    ? <span style={{color:T.ok}}>✓ Prefix looks correct</span>
                    : <span style={{color:T.warn}}>⚠ Expected: sk-…</span>}
                  <span style={{color:T.t3}}>Length: {apiKey.trim().length}</span>
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:".45rem",flexShrink:0,paddingBottom:apiKey.length>0?".95rem":"1.45rem"}}>
              <button className="btn sm" onClick={saveKey}>💾 Save</button>
              <button className="btn ghost sm" onClick={testKey} disabled={testing || !apiKey.trim()}>
                {testing ? <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> : "⚡"}
                {testing ? " Testing…" : " Test"}
              </button>
              {apiKey && (
                <button className="btn ghost sm" style={{borderColor:"rgba(239,68,68,.38)",color:"#FCA5A5"}} onClick={()=>{
                  setApiKey(""); window.__ATS_API_KEY__="";
                  try{localStorage.removeItem("ats_api_key");}catch{}
                  setTestOk(null); toast("API key cleared","info");
                }}>🗑</button>
              )}
            </div>
          </div>

          {/* Test result banner */}
          {testOk !== null && (
            <div style={{padding:".65rem 1rem",borderRadius:10,backdropFilter:"blur(12px)",marginBottom:"1rem",display:"flex",alignItems:"center",gap:".6rem",fontSize:".84rem",fontWeight:600,
              background:testOk?"rgba(0,210,160,.1)":"rgba(255,77,109,.1)",
              border:`1px solid ${testOk?"rgba(0,210,160,.3)":"rgba(255,77,109,.3)"}`,
              color:testOk?T.ok:T.err}}>
              {testOk ? "✅ Connected successfully — your key works perfectly!" : "❌ Connection failed — please check your key and try again."}
            </div>
          )}

          {/* Step guide */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:".6rem"}}>
            {[
              {n:1,t:"Get your key",d:"opencode.ai/auth → API Keys → Create Key",c:"#818CF8"},
              {n:2,t:"Paste it above",d:"Copy the sk-… string and paste into the input field",c:T.lit},
              {n:3,t:"Save & Test",d:"Click Save, then Test to verify the connection",c:T.warn},
              {n:4,t:"AI unlocked",d:"All AI features now use your key with your rate limits",c:T.ok},
            ].map(({n,t,d,c})=>(
              <div key={n} style={{display:"flex",gap:".6rem",padding:".62rem .85rem",borderRadius:10,backdropFilter:"blur(10px)",background:"rgba(0,0,0,.18)",border:"1px solid rgba(255,255,255,.06)"}}>
                <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,rgba(${T.g},.85),rgba(${T.g2},.7))`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Orbitron',sans-serif",fontSize:".68rem",fontWeight:700,color:"#fff",boxShadow:`0 0 10px rgba(${T.g},.38)`}}>{n}</div>
                <div><div style={{fontWeight:700,color:T.t1,fontSize:".82rem",marginBottom:".18rem"}}>{t}</div><div style={{color:T.t3,fontSize:".75rem",lineHeight:1.5}}>{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SUPABASE CONFIG ── */}
      <div className="glass" style={{marginBottom:"1.4rem",borderColor:`rgba(${T.g},.28)`,position:"relative"}}>
        <div style={{position:"absolute",left:0,top:14,bottom:14,width:3,borderRadius:"0 3px 3px 0",background:`linear-gradient(180deg,#4ade80,#00D2A0)`,boxShadow:"0 0 14px rgba(74,222,128,.5)"}}/>
        <div style={{paddingLeft:".85rem"}}>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:T.t1,marginBottom:".75rem",display:"flex",alignItems:"center",gap:".5rem"}}>☁️ Supabase Cloud</div>
          <p style={{color:T.t3,fontSize:".83rem",lineHeight:1.65,marginBottom:"1rem"}}>
            Your data syncs to Supabase automatically. You can use the built-in project or connect your own.
            To create your own: go to <strong style={{color:T.t2}}>supabase.com</strong> → New Project → create an <strong style={{color:T.t2}}>app_data</strong> table with columns <code style={{color:T.lit}}>key (text, pk)</code>, <code style={{color:T.lit}}>data (jsonb)</code>, <code style={{color:T.lit}}>updated_at (timestamptz)</code> → copy your URL and anon key.
          </p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".85rem",marginBottom:"1rem"}}>
            <div><label className="lbl">Supabase URL</label><input className="inp" value={sbUrl} onChange={e=>setSbUrl(e.target.value)} placeholder="https://xyz.supabase.co" style={{fontFamily:"monospace",fontSize:".82rem"}}/></div>
            <div><label className="lbl">Anon Key</label><input className="inp" value={sbKey} onChange={e=>setSbKey(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIs..." style={{fontFamily:"monospace",fontSize:".82rem"}}/></div>
          </div>
          <div style={{display:"flex",gap:".75rem"}}>
            <button className="btn" onClick={saveSupabase}>💾 Save Config</button>
            <button className="btn ghost" onClick={()=>{setSbUrl("https://wthsdvlvipqwmxeuctgh.supabase.co");setSbKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0aHNkdmx2aXBxd214ZXVjdGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTU2ODgsImV4cCI6MjA5NTAzMTY4OH0.TRiaU5R50wEl09VyAJHmU4jLKO637QNa5VzuiSbWBtI");}}>🔄 Reset Default</button>
          </div>
        </div>
      </div>

      {/* ── THEME SELECTOR ── */}
      <div className="glass" style={{marginBottom:"1.4rem"}}>
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:T.t1,marginBottom:"1rem",display:"flex",alignItems:"center",gap:".5rem"}}>🎨 Color Theme</div>
        <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
          {Object.entries(THEMES).map(([key,th])=>(
            <div key={key} onClick={()=>setTheme(th)} style={{display:"flex",alignItems:"center",gap:".55rem",padding:".5rem .9rem",borderRadius:12,cursor:"pointer",background:theme.name===th.name?"rgba(0,0,0,.3)":"rgba(0,0,0,.18)",backdropFilter:"blur(14px)",border:`1px solid ${theme.name===th.name?`rgba(${th.g},.55)`:"rgba(255,255,255,.07)"}`,borderTop:"1px solid rgba(255,255,255,.07)",transition:"all .24s",boxShadow:theme.name===th.name?`0 0 20px rgba(${th.g},.25)`:""}} onMouseOver={e=>e.currentTarget.style.borderColor=`rgba(${th.g},.42)`} onMouseOut={e=>e.currentTarget.style.borderColor=theme.name===th.name?`rgba(${th.g},.55)`:"rgba(255,255,255,.07)"}>
              <div style={{width:22,height:22,borderRadius:"50%",background:`linear-gradient(135deg,rgba(${th.g},1),rgba(${th.g2},1))`,border:`2px solid ${theme.name===th.name?"rgba(255,255,255,.7)":"transparent"}`,flexShrink:0,boxShadow:theme.name===th.name?`0 0 12px rgba(${th.g},.6)`:""}}/>
              <span style={{fontWeight:700,color:T.t1,fontSize:".84rem"}}>{th.name}</span>
              {theme.name===th.name&&<span style={{color:T.ok,fontSize:".9rem"}}>✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* DATA SUMMARY */}
      <div className="glass" style={{marginBottom:"1.4rem"}}>
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:T.t1,marginBottom:"1rem",display:"flex",alignItems:"center",gap:".5rem"}}>💾 Data Summary</div>
        <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",marginBottom:"1.2rem"}}>
          {[{l:"Candidates",v:cands.length,c:T.lit,e:"👥"},{l:"Interviews",v:ivs.length,c:"#90CAF9",e:"🗓"},{l:"Emails",v:ems.length,c:"#FCD34D",e:"📧"},{l:"Placed",v:cands.filter(c=>/placed/i.test(c.status||"")).length,c:T.ok,e:"✅"},{l:"Storage",v:"SUPABASE",c:"#4ade80",e:"☁️"}].map(({l,v,c,e})=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:".65rem",padding:".65rem 1rem",borderRadius:12,backdropFilter:"blur(12px)",background:`${c}10`,border:`1px solid ${c}22`,borderTop:"1px solid rgba(255,255,255,.06)"}}>
              <span style={{fontSize:"1.2rem"}}>{e}</span>
              <div><div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"1.2rem",fontWeight:700,color:c,lineHeight:1,textShadow:`0 0 12px ${c}`}}>{v}</div><div style={{fontSize:".68rem",color:T.t3,fontWeight:700,letterSpacing:".5px",textTransform:"uppercase"}}>{l}</div></div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}>
          <button className="btn" onClick={expAll}>⬇ Export Full Backup (JSON)</button>
          <button className="btn ghost" onClick={expCSV}>📊 Export Candidates (CSV)</button>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="glass" style={{border:"1px solid rgba(239,68,68,.22)",borderTop:"1px solid rgba(255,100,100,.1)"}}>
        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".82rem",fontWeight:700,color:"#FCA5A5",marginBottom:"1rem",display:"flex",alignItems:"center",gap:".5rem"}}>🚨 Danger Zone</div>
        <p style={{color:T.t3,fontSize:".85rem",marginBottom:"1rem",lineHeight:1.6}}>Export a backup above before clearing. These actions are permanent and cannot be undone.</p>
        <button className="btn btn-d" onClick={clrAll}>🗑 Clear All Data Permanently</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
export default function App() {
  const [theme,setTheme]=useState(THEMES.rust);
  const [page,setPage]=useState("dashboard");
  const [mob,setMob]=useState(false);
  const [showWelcome,setShowWelcome]=useState(true);
  const [showTour,setShowTour]=useState(false);
  const [showSearch,setShowSearch]=useState(false);
  const [cands,setCands]=useState(()=>{try{const v=localStorage.getItem("ats_candidates");return v?JSON.parse(v):[]}catch{return[]}});
  const [ivs,setIvs]=useState(()=>{try{const v=localStorage.getItem("ats_interviews");return v?JSON.parse(v):[]}catch{return[]}});
  const [ems,setEms]=useState(()=>{try{const v=localStorage.getItem("ats_emails");return v?JSON.parse(v):[]}catch{return[]}});
  const [toasts,setToasts]=useState([]);

  // Inject CSS whenever theme changes
  useEffect(()=>injectCSS(theme),[theme]);

  // Sync cloud in background — no loading screen needed
  useEffect(()=>{
    try {
      const k=localStorage.getItem("ats_api_key");
      if(k) {
        window.__ATS_API_KEY__=k;
      } else {
        const defaultKey="sk-VWkUeP4TLTUn4M55CBXjz8zcvaEkcz7YL9i75TvrABOPimrBtAn0kPlFK7BDGnC2";
        localStorage.setItem("ats_api_key", defaultKey);
        window.__ATS_API_KEY__ = defaultKey;
      }
    } catch {}
    (async()=>{
      try {
        const [c,iv,e]=await Promise.all([sg("ats_candidates"),sg("ats_interviews"),sg("ats_emails")]);
        if (c) setCands(c); if (iv) setIvs(iv); if (e) setEms(e);
      } catch {}
      for (const key of ["ats_candidates","ats_interviews","ats_emails"]) {
        try {
          const local = localStorage.getItem(key);
          if (local) {
            const supRes = await fetch(`${SUPABASE_URL}/rest/v1/app_data?key=eq.${encodeURIComponent(key)}&select=data`, {
              headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
            });
            const supRows = supRes.ok ? await supRes.json() : [];
            const supEmpty = supRows.length === 0 || (Array.isArray(supRows[0]?.data) && !supRows[0].data.length);
            if (supEmpty) {
              const data = JSON.parse(local);
              if (data && (!Array.isArray(data) || data.length > 0)) {
                await ss(key, data);
              }
            }
          }
        } catch {}
      }
    })();
  },[]);

function LiveClock({ T }) {
  const [c,setC]=useState("");
  useEffect(()=>{
    const tick=()=>{const d=new Date();let h=d.getHours()%12||12;setC(`${String(h).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")} ${d.getHours()>=12?"PM":"AM"}`);};
    tick(); const i=setInterval(tick,1000); return()=>clearInterval(i);
  },[]);
  return <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:".72rem",fontWeight:700,color:"#fff",letterSpacing:"1.5px",padding:".25rem .75rem",borderRadius:8,backdropFilter:"blur(10px)",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",minWidth:124,textAlign:"center"}} className="mob-hide">{c}</div>;
}

  // Keyboard shortcut ⌘K
  useEffect(()=>{
    const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setShowSearch(v=>!v);}if(e.key==="Escape")setShowSearch(false);};
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[]);

  const toast=useCallback((m,t="ok")=>{const id=Date.now()+Math.random();setToasts(p=>[...p,{id,m,t}]);setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),3500);},[]);
  const saveCands=async u=>{setCands(u);await ss("ats_candidates",u);};
  const saveIvs=async u=>{setIvs(u);await ss("ats_interviews",u);};
  const saveEms=async u=>{setEms(u);await ss("ats_emails",u);};
  const isMob=window.innerWidth<=767;
  const T=theme;

  return (
    <div style={{background:T.bg,minHeight:"100vh",color:T.t1}}>
      <div className="bg-canvas"/><div className="grid-canvas"/>

      {showWelcome&&<Welcome T={T} onEnter={()=>{setShowWelcome(false);setTimeout(()=>setShowTour(true),800);}}/>}
      {showTour&&<Tour T={T} onDone={()=>setShowTour(false)}/>}
      {showSearch&&<GlobalSearch cands={cands} ivs={ivs} T={T} onNav={p=>setPage(p)} onClose={()=>setShowSearch(false)}/>}

      <Sidebar page={page} setPage={setPage} cands={cands} ivs={ivs} mob={mob} setMob={setMob} T={T}/>

      <div style={{marginLeft:isMob?0:255,minHeight:"100vh",position:"relative",zIndex:1}}>
        {/* TOPBAR */}
        <div className="glass-top" style={{position:"sticky",top:0,zIndex:499,display:"flex",alignItems:"center",gap:"1rem",padding:".62rem 1.5rem",flexWrap:"wrap"}}>
          {isMob&&<button onClick={()=>setMob(v=>!v)} style={{background:`rgba(${T.g},.1)`,backdropFilter:"blur(10px)",border:`1px solid rgba(${T.g},.28)`,borderRadius:10,padding:".45rem .65rem",cursor:"pointer",color:T.lit,display:"flex",fontSize:"1.1rem"}}>☰</button>}
          <div style={{display:"flex",alignItems:"center",gap:".55rem",flex:1}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:T.lit,boxShadow:`0 0 10px ${T.lit}`,animation:"pulse 2.5s ease-in-out infinite"}}/>
            <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:".75rem",fontWeight:700,color:T.t2,letterSpacing:".5px",textTransform:"uppercase"}}>{NAV.find(n=>n.id===page)?.l||page}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:".65rem",flexShrink:0,flexWrap:"wrap"}}>
            {/* Search button */}
            <button onClick={()=>setShowSearch(true)} style={{display:"flex",alignItems:"center",gap:".4rem",padding:".28rem .7rem",borderRadius:9,backdropFilter:"blur(10px)",background:`rgba(${T.g},.07)`,border:`1px solid rgba(${T.g},.22)`,color:T.t3,cursor:"pointer",fontSize:".8rem",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,transition:"all .2s"}} onMouseOver={e=>{e.currentTarget.style.background=`rgba(${T.g},.16)`;e.currentTarget.style.color=T.t1;}} onMouseOut={e=>{e.currentTarget.style.background=`rgba(${T.g},.07)`;e.currentTarget.style.color=T.t3;}}>
              🔍 <span className="mob-hide">Search</span>
              <span style={{background:`rgba(${T.g},.14)`,backdropFilter:"blur(8px)",border:`1px solid rgba(${T.g},.28)`,borderRadius:4,padding:".05rem .35rem",fontSize:".65rem",color:T.lit,fontFamily:"monospace"}} className="mob-hide">⌘K</span>
            </button>
            {/* Theme selector */}
            <select value={T.name} onChange={e=>{const t=Object.values(THEMES).find(x=>x.name===e.target.value);if(t){setTheme(t);toast(`Theme: ${t.name} ✓`,"info");}}} style={{background:`rgba(${T.g},.07)`,backdropFilter:"blur(10px)",border:`1px solid rgba(${T.g},.22)`,borderRadius:8,color:T.t2,padding:".28rem .6rem",fontSize:".78rem",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,cursor:"pointer"}}>
              {Object.values(THEMES).map(t=><option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            {/* Cloud indicator */}
            <div style={{display:"flex",alignItems:"center",gap:".35rem",padding:".2rem .65rem",borderRadius:20,backdropFilter:"blur(10px)",background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.18)",fontSize:".66rem",fontWeight:700,color:"#4ade80"}} className="mob-hide">
              <span style={{width:5,height:5,borderRadius:"50%",background:"#4ade80",animation:"pulse .8s ease-in-out infinite"}}/>
              "SUPABASE"
            </div>
            <LiveClock T={T}/>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{padding:"1.75rem 2rem",maxWidth:1400}}>
          {page==="dashboard"     && <Dashboard cands={cands} ivs={ivs} T={T}/>}
          {page==="ats"           && <ATSMatcher toast={toast} T={T}/>}
          {page==="candidates"    && <Candidates cands={cands} setCands={saveCands} toast={toast} T={T}/>}
          {page==="interviews"    && <Interviews cands={cands} ivs={ivs} setIvs={saveIvs} toast={toast} T={T}/>}
          {page==="analytics"     && <Analytics cands={cands} ivs={ivs} T={T}/>}
          {page==="email"         && <EmailExtractor emails={ems} setEmails={saveEms} toast={toast} T={T}/>}
          {page==="timezone"      && <Timezone T={T}/>}
          {page==="prep"          && <PrepGen cands={cands} toast={toast} T={T}/>}
          {page==="aichat"        && <AIChat cands={cands} ivs={ivs} toast={toast} T={T}/>}
          {page==="settings"      && <Settings cands={cands} ivs={ivs} ems={ems} theme={theme} setTheme={setTheme} toast={toast} T={T}/>}
        </div>
      </div>

      <Toasts list={toasts}/>

      {/* Floating Action Button */}
      <button onClick={()=>toast("Use ⌘K to search or navigate via sidebar","info")} style={{position:"fixed",bottom:"2rem",right:"2rem",zIndex:998,width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,rgba(${T.g},.9),rgba(${T.g2},.85))`,backdropFilter:"blur(10px)",border:`1px solid rgba(${T.g},.5)`,borderTop:"1px solid rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:`0 4px 20px rgba(${T.g},.45),0 0 40px rgba(${T.g},.18)`,transition:"all .3s cubic-bezier(.22,1,.36,1)",fontSize:"1.3rem"}} onMouseOver={e=>e.currentTarget.style.transform="scale(1.12) translateY(-3px)"} onMouseOut={e=>e.currentTarget.style.transform="none"}>➕</button>
    </div>
  );
}

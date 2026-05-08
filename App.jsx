import { useState, useEffect, useRef, useCallback } from “react”;

/* ═══════════════════════════════════════════════════════
POLYMARKET EDGE INTELLIGENCE — One-Click Signal Board
═══════════════════════════════════════════════════════ */

const SEED_WALLETS = [
“0x1234abcd5678ef901234abcd5678ef901234abcd”,
“0xdeadbeef1234567890abcdef1234567890abcdef”,
“0xcafe0000aaaa1234bbbb5678cccc9012dddd3456”,
“0xf00db00c1111222233334444555566667777aaaa”,
“0xabc123def456789012345678901234567890cafe”,
];

const MOCK_MARKETS = [
{ id: “m1”, question: “Will the Fed cut rates before September 2026?”, yesPrice: 0.61, noPrice: 0.39, volume: 4200000, category: “Macro” },
{ id: “m2”, question: “Will Bitcoin exceed $120k by end of 2026?”, yesPrice: 0.44, noPrice: 0.56, volume: 8100000, category: “Crypto” },
{ id: “m3”, question: “Will Trump sign a crypto bill by July 2026?”, yesPrice: 0.72, noPrice: 0.28, volume: 3500000, category: “Politics” },
{ id: “m4”, question: “Will Nvidia’s market cap surpass $4T in 2026?”, yesPrice: 0.38, noPrice: 0.62, volume: 2900000, category: “Stocks” },
{ id: “m5”, question: “Will there be a US recession declared in 2026?”, yesPrice: 0.29, noPrice: 0.71, volume: 5600000, category: “Macro” },
{ id: “m6”, question: “Will OpenAI release GPT-5 before August 2026?”, yesPrice: 0.81, noPrice: 0.19, volume: 1800000, category: “AI” },
{ id: “m7”, question: “Will Ethereum ETF staking be approved in 2026?”, yesPrice: 0.55, noPrice: 0.45, volume: 2200000, category: “Crypto” },
{ id: “m8”, question: “Will the S&P 500 hit 6500 by Q3 2026?”, yesPrice: 0.47, noPrice: 0.53, volume: 3800000, category: “Stocks” },
];

function genWalletData(addr) {
const seed = parseInt(addr.slice(2, 8), 16);
const rng = (offset = 0) => ((seed * 1103515245 + offset) & 0x7fffffff) / 0x7fffffff;
const trades = Math.floor(rng(1) * 80) + 8;
const winRate = 0.45 + rng(2) * 0.35;
const pnl = (rng(3) * 2 - 0.3) * 18000;
const avgSize = 100 + rng(4) * 900;
return {
addr,
trades,
winRate,
pnl,
avgSize,
marketsTraded: Math.floor(rng(5) * 12) + 2,
speciality: [“Macro”, “Crypto”, “Politics”, “AI”, “Stocks”][Math.floor(rng(6) * 5)],
lastActive: `${Math.floor(rng(7) * 6) + 1}h ago`,
recentSignal: MOCK_MARKETS[Math.floor(rng(8) * MOCK_MARKETS.length)],
signalSide: rng(9) > 0.5 ? “YES” : “NO”,
signalSize: Math.floor(100 + rng(10) * 900),
confidence: 0.6 + rng(11) * 0.35,
};
}

const ALL_WALLETS = SEED_WALLETS.map(genWalletData).sort((a, b) => b.pnl - a.pnl);

function fmt$(n, sign = true) {
const abs = Math.abs(n);
const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`;
if (!sign) return s;
return n < 0 ? `-${s}` : `+${s}`;
}
function fmtAddr(a) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }
function pct(n) { return `${(n * 100).toFixed(1)}%`; }
function fmtVol(n) { return n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}k`; }

/* ═══════════════════════ STYLES ═══════════════════════ */
const css = `
@import url(‘https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap’);

:root {
–bg: #080a0d;
–panel: #0d1117;
–panel2: #111620;
–border: #1c2333;
–border2: #243044;
–cyan: #00d4ff;
–green: #00ff9d;
–red: #ff4466;
–gold: #ffb800;
–purple: #a855f7;
–text: #e6edf3;
–muted: #6e7681;
–dim: #30363d;
}

- { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(–bg); color: var(–text); font-family: ‘Bricolage Grotesque’, sans-serif; }

.app {
min-height: 100vh;
display: flex;
flex-direction: column;
}

/* ── Top Bar ── */
.topbar {
display: flex;
align-items: center;
justify-content: space-between;
padding: 14px 28px;
border-bottom: 1px solid var(–border);
background: var(–panel);
position: sticky; top: 0; z-index: 100;
}
.topbar-left { display: flex; align-items: center; gap: 16px; }
.logo {
font-size: 16px; font-weight: 800; letter-spacing: -0.3px;
color: var(–cyan); text-shadow: 0 0 20px #00d4ff55;
display: flex; align-items: center; gap: 8px;
}
.logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(–green); box-shadow: 0 0 8px var(–green); animation: blink 2s infinite; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

.mode-toggle {
display: flex; gap: 0;
background: var(–bg); border: 1px solid var(–border); border-radius: 6px; overflow: hidden;
}
.mode-btn {
padding: 6px 14px; font-size: 11px; font-family: ‘IBM Plex Mono’, monospace;
background: none; border: none; color: var(–muted); cursor: pointer; transition: all 0.15s;
letter-spacing: 0.5px;
}
.mode-btn.active { background: var(–cyan)18; color: var(–cyan); }
.mode-btn.paper.active { background: var(–gold)18; color: var(–gold); }

.topbar-right { display: flex; align-items: center; gap: 12px; }
.balance-chip {
background: var(–panel2); border: 1px solid var(–border); border-radius: 6px;
padding: 6px 14px; font-family: ‘IBM Plex Mono’, monospace; font-size: 12px;
display: flex; align-items: center; gap: 8px;
}
.balance-chip .label { color: var(–muted); font-size: 10px; }
.balance-chip .val { color: var(–green); font-weight: 600; }

.connect-btn {
background: var(–cyan)18; border: 1px solid var(–cyan)55;
color: var(–cyan); padding: 7px 16px; border-radius: 6px;
font-family: ‘IBM Plex Mono’, monospace; font-size: 11px; cursor: pointer;
transition: all 0.15s; letter-spacing: 0.5px;
}
.connect-btn:hover { background: var(–cyan)30; }
.connect-btn.connected { background: var(–green)18; border-color: var(–green)55; color: var(–green); }

/* ── Layout ── */
.main { display: flex; flex: 1; gap: 0; }

.sidebar {
width: 280px; flex-shrink: 0;
border-right: 1px solid var(–border);
background: var(–panel);
display: flex; flex-direction: column;
height: calc(100vh - 53px); position: sticky; top: 53px; overflow-y: auto;
}

.content { flex: 1; padding: 24px 28px; overflow-y: auto; }

/* ── Sidebar ── */
.sidebar-section { padding: 16px; border-bottom: 1px solid var(–border); }
.sidebar-label {
font-size: 10px; font-family: ‘IBM Plex Mono’, monospace; color: var(–muted);
text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;
display: flex; justify-content: space-between; align-items: center;
}
.sidebar-label span { color: var(–cyan); }

.wallet-item {
display: flex; align-items: center; gap: 10px;
padding: 10px; border-radius: 8px; cursor: pointer;
transition: background 0.12s; margin-bottom: 4px;
}
.wallet-item:hover { background: var(–panel2); }
.wallet-item.active { background: var(–cyan)0f; border: 1px solid var(–cyan)22; }

.wallet-avatar {
width: 32px; height: 32px; border-radius: 50%;
display: flex; align-items: center; justify-content: center;
font-size: 14px; flex-shrink: 0; background: var(–panel2);
border: 1px solid var(–border);
}

.wallet-info { flex: 1; min-width: 0; }
.wallet-addr-small { font-family: ‘IBM Plex Mono’, monospace; font-size: 11px; color: var(–cyan); }
.wallet-pnl { font-size: 12px; font-weight: 600; }
.wallet-pnl.pos { color: var(–green); }
.wallet-pnl.neg { color: var(–red); }

.wallet-wr {
font-family: ‘IBM Plex Mono’, monospace; font-size: 10px; color: var(–muted);
background: var(–bg); border-radius: 4px; padding: 2px 6px;
}

/* ── Stats Row ── */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }

.stat-card {
background: var(–panel); border: 1px solid var(–border);
border-radius: 10px; padding: 18px;
position: relative; overflow: hidden;
}
.stat-card::after {
content: ‘’; position: absolute; top: 0; left: 0; right: 0; height: 2px;
}
.stat-card.c { color: var(–cyan); }
.stat-card.c::after { background: var(–cyan); }
.stat-card.g::after { background: var(–green); }
.stat-card.y::after { background: var(–gold); }
.stat-card.p::after { background: var(–purple); }

.stat-label { font-size: 10px; font-family: ‘IBM Plex Mono’, monospace; color: var(–muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.stat-val { font-size: 28px; font-weight: 800; line-height: 1; }
.stat-val.c { color: var(–cyan); }
.stat-val.g { color: var(–green); }
.stat-val.y { color: var(–gold); }
.stat-val.p { color: var(–purple); }
.stat-sub { font-size: 11px; color: var(–muted); margin-top: 4px; font-family: ‘IBM Plex Mono’, monospace; }

/* ── Signal Cards ── */
.signals-header {
display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.section-title {
font-size: 13px; font-weight: 700; text-transform: uppercase;
letter-spacing: 2px; color: var(–muted);
display: flex; align-items: center; gap: 8px;
}
.section-title .accent { color: var(–cyan); }
.count-badge {
background: var(–cyan)22; color: var(–cyan);
font-family: ‘IBM Plex Mono’, monospace; font-size: 11px;
padding: 2px 8px; border-radius: 999px; border: 1px solid var(–cyan)33;
}

.signal-grid { display: flex; flex-direction: column; gap: 12px; }

.signal-card {
background: var(–panel); border: 1px solid var(–border);
border-radius: 12px; overflow: hidden;
transition: border-color 0.15s, transform 0.15s;
animation: slideIn 0.3s ease;
}
.signal-card:hover { border-color: var(–border2); transform: translateY(-1px); }
.signal-card.new { border-color: var(–cyan)44; }
@keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.signal-top {
padding: 16px 18px 12px;
display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
}
.signal-meta { flex: 1; min-width: 0; }
.signal-category {
font-size: 10px; font-family: ‘IBM Plex Mono’, monospace;
text-transform: uppercase; letter-spacing: 1px; color: var(–muted); margin-bottom: 4px;
}
.signal-question { font-size: 14px; font-weight: 600; line-height: 1.35; color: var(–text); }

.signal-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }

.side-badge {
padding: 4px 12px; border-radius: 5px;
font-family: ‘IBM Plex Mono’, monospace; font-size: 12px; font-weight: 600;
letter-spacing: 0.5px;
}
.side-badge.yes { background: var(–green)22; color: var(–green); border: 1px solid var(–green)44; }
.side-badge.no { background: var(–red)22; color: var(–red); border: 1px solid var(–red)44; }

.conf-bar-wrap { display: flex; align-items: center; gap: 6px; font-size: 10px; color: var(–muted); font-family: ‘IBM Plex Mono’, monospace; }
.conf-bar { width: 60px; height: 4px; background: var(–dim); border-radius: 2px; overflow: hidden; }
.conf-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(–cyan), var(–green)); }

.signal-mid {
padding: 0 18px 12px;
display: flex; gap: 20px; align-items: center;
}
.signal-stat { display: flex; flex-direction: column; gap: 2px; }
.signal-stat-label { font-size: 9px; font-family: ‘IBM Plex Mono’, monospace; color: var(–muted); text-transform: uppercase; letter-spacing: 1px; }
.signal-stat-val { font-size: 13px; font-weight: 600; font-family: ‘IBM Plex Mono’, monospace; }
.signal-stat-val.c { color: var(–cyan); }
.signal-stat-val.g { color: var(–green); }
.signal-stat-val.y { color: var(–gold); }

.signal-divider { width: 1px; height: 30px; background: var(–border); }

.signal-wallet {
display: flex; align-items: center; gap: 6px; margin-left: auto;
font-size: 11px; font-family: ‘IBM Plex Mono’, monospace; color: var(–muted);
}
.wallet-dot { width: 6px; height: 6px; border-radius: 50%; background: var(–green); }

.signal-actions {
padding: 12px 18px; border-top: 1px solid var(–border);
display: flex; gap: 10px; align-items: center;
background: var(–panel2);
}

.size-input-wrap { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(–muted); font-family: ‘IBM Plex Mono’, monospace; }
.size-input {
width: 80px; background: var(–bg); border: 1px solid var(–border);
color: var(–text); padding: 6px 10px; border-radius: 5px;
font-family: ‘IBM Plex Mono’, monospace; font-size: 12px; outline: none;
transition: border-color 0.15s;
}
.size-input:focus { border-color: var(–cyan); }

.action-btn {
padding: 8px 18px; border-radius: 6px;
font-family: ‘IBM Plex Mono’, monospace; font-size: 12px;
cursor: pointer; transition: all 0.15s; letter-spacing: 0.3px;
border: 1px solid transparent; font-weight: 500;
}
.action-btn.execute {
background: var(–green)22; border-color: var(–green)55; color: var(–green);
}
.action-btn.execute:hover { background: var(–green)33; box-shadow: 0 0 12px var(–green)22; }
.action-btn.execute:disabled { opacity: 0.4; cursor: not-allowed; }
.action-btn.dismiss {
background: none; border-color: var(–border); color: var(–muted);
}
.action-btn.dismiss:hover { border-color: var(–red)44; color: var(–red); }
.action-btn.paper-exec {
background: var(–gold)18; border-color: var(–gold)44; color: var(–gold);
}
.action-btn.paper-exec:hover { background: var(–gold)28; }

.payout-preview {
margin-left: auto; font-size: 11px; font-family: ‘IBM Plex Mono’, monospace;
color: var(–muted);
}
.payout-preview span { color: var(–green); font-weight: 600; }

/* ── Executed Trades ── */
.trades-table-wrap {
background: var(–panel); border: 1px solid var(–border); border-radius: 10px; overflow: hidden;
}
table { width: 100%; border-collapse: collapse; }
thead th {
padding: 11px 16px; text-align: left;
font-size: 10px; font-family: ‘IBM Plex Mono’, monospace;
text-transform: uppercase; letter-spacing: 1.5px; color: var(–muted);
border-bottom: 1px solid var(–border); background: var(–panel2);
}
tbody tr { border-bottom: 1px solid var(–border)88; transition: background 0.1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: var(–cyan)05; }
tbody td { padding: 13px 16px; font-size: 13px; }
.mono-sm { font-family: ‘IBM Plex Mono’, monospace; font-size: 11px; }

.outcome-badge {
padding: 3px 8px; border-radius: 4px; font-size: 10px;
font-family: ‘IBM Plex Mono’, monospace; font-weight: 600;
}
.outcome-badge.open { background: var(–cyan)18; color: var(–cyan); border: 1px solid var(–cyan)33; }
.outcome-badge.won { background: var(–green)18; color: var(–green); border: 1px solid var(–green)33; }
.outcome-badge.lost { background: var(–red)18; color: var(–red); border: 1px solid var(–red)33; }
.outcome-badge.paper { background: var(–gold)18; color: var(–gold); border: 1px solid var(–gold)33; }

/* ── Setup Guide ── */
.setup-step {
display: flex; gap: 16px; align-items: flex-start;
background: var(–panel); border: 1px solid var(–border);
border-radius: 10px; padding: 20px; margin-bottom: 12px;
transition: border-color 0.15s;
}
.setup-step:hover { border-color: var(–border2); }
.setup-step.done { border-color: var(–green)33; }
.step-num {
width: 32px; height: 32px; border-radius: 50%;
background: var(–panel2); border: 1px solid var(–border);
display: flex; align-items: center; justify-content: center;
font-family: ‘IBM Plex Mono’, monospace; font-size: 13px;
color: var(–cyan); flex-shrink: 0;
}
.step-num.done { background: var(–green)18; border-color: var(–green)44; color: var(–green); }
.step-body h3 { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.step-body p { font-size: 13px; color: var(–muted); line-height: 1.5; }
.step-body code {
background: var(–bg); border: 1px solid var(–border);
border-radius: 4px; padding: 2px 6px;
font-family: ‘IBM Plex Mono’, monospace; font-size: 11px; color: var(–cyan);
}
.step-action { margin-top: 10px; }
.step-input {
width: 100%; background: var(–bg); border: 1px solid var(–border);
color: var(–text); padding: 9px 14px; border-radius: 6px;
font-family: ‘IBM Plex Mono’, monospace; font-size: 12px; outline: none;
transition: border-color 0.15s; margin-bottom: 8px;
}
.step-input:focus { border-color: var(–cyan); }
.step-btn {
background: var(–cyan)18; border: 1px solid var(–cyan)44;
color: var(–cyan); padding: 8px 18px; border-radius: 6px;
font-family: ‘IBM Plex Mono’, monospace; font-size: 11px;
cursor: pointer; transition: all 0.15s; letter-spacing: 0.5px;
}
.step-btn:hover { background: var(–cyan)28; }
.step-btn.green-btn { background: var(–green)18; border-color: var(–green)44; color: var(–green); }

.empty-state { text-align: center; padding: 60px 20px; color: var(–muted); }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; color: var(–text); }
.empty-sub { font-size: 13px; font-family: ‘IBM Plex Mono’, monospace; }

.warning-box {
background: var(–gold)0f; border: 1px solid var(–gold)33;
border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;
font-size: 12px; color: var(–gold); line-height: 1.5;
display: flex; gap: 10px; align-items: flex-start;
font-family: ‘IBM Plex Mono’, monospace;
}

.tabs { display: flex; border-bottom: 1px solid var(–border); margin-bottom: 24px; }
.tab-btn {
padding: 10px 20px; background: none; border: none;
font-family: ‘IBM Plex Mono’, monospace; font-size: 12px;
color: var(–muted); cursor: pointer; border-bottom: 2px solid transparent;
transition: all 0.15s; letter-spacing: 0.5px;
}
.tab-btn:hover { color: var(–text); }
.tab-btn.active { color: var(–cyan); border-bottom-color: var(–cyan); }

.pnl-summary {
background: var(–panel); border: 1px solid var(–border);
border-radius: 10px; padding: 20px; margin-bottom: 20px;
display: flex; gap: 32px; align-items: center; flex-wrap: wrap;
}
.pnl-item { display: flex; flex-direction: column; gap: 4px; }
.pnl-item-label { font-size: 10px; font-family: ‘IBM Plex Mono’, monospace; color: var(–muted); text-transform: uppercase; letter-spacing: 1px; }
.pnl-item-val { font-size: 22px; font-weight: 800; }
`;

/* ═══════════════════════ COMPONENT ═══════════════════════ */
export default function App() {
const [tab, setTab] = useState(“signals”);
const [mode, setMode] = useState(“paper”); // paper | live
const [connected, setConnected] = useState(false);
const [apiKey, setApiKey] = useState(””);
const [walletAddr, setWalletAddr] = useState(””);
const [paperBalance, setPaperBalance] = useState(10000);
const [liveBalance, setLiveBalance] = useState(0);
const [selectedWallet, setSelectedWallet] = useState(null);
const [signals, setSignals] = useState([]);
const [trades, setTrades] = useState([]);
const [tradeSizes, setTradeSizes] = useState({});
const [dismissed, setDismissed] = useState(new Set());
const [setupDone, setSetupDone] = useState({ step1: false, step2: false, step3: false });
const intervalRef = useRef(null);

// Generate signals from tracked wallets
const generateSignals = useCallback(() => {
const tracked = selectedWallet ? [ALL_WALLETS.find(w => w.addr === selectedWallet)] : ALL_WALLETS.slice(0, 3);
return tracked
.filter(Boolean)
.map(w => ({
id: `${w.addr}-${w.recentSignal.id}-${Date.now()}`,
wallet: w,
market: w.recentSignal,
side: w.signalSide,
suggestedSize: w.signalSize,
confidence: w.confidence,
walletWinRate: w.winRate,
walletPnl: w.pnl,
timestamp: new Date(),
isNew: true,
}));
}, [selectedWallet]);

useEffect(() => {
setSignals(generateSignals());
}, [generateSignals]);

// Auto-refresh signals every 30s
useEffect(() => {
intervalRef.current = setInterval(() => {
setSignals(prev => {
const fresh = generateSignals().map(s => ({ …s, isNew: true }));
return fresh;
});
}, 30000);
return () => clearInterval(intervalRef.current);
}, [generateSignals]);

const visibleSignals = signals.filter(s => !dismissed.has(s.id));

const handleExecute = (signal) => {
const size = parseFloat(tradeSizes[signal.id] || signal.suggestedSize);
if (isNaN(size) || size <= 0) return;

```
const price = signal.side === "YES" ? signal.market.yesPrice : signal.market.noPrice;
const potentialPayout = size / price;

if (mode === "paper") {
  if (size > paperBalance) { alert("Insufficient paper balance!"); return; }
  setPaperBalance(prev => prev - size);
} else {
  if (!connected) { alert("Connect your wallet first in Setup."); return; }
}

const trade = {
  id: `t${Date.now()}`,
  market: signal.market.question,
  side: signal.side,
  size,
  price,
  potentialPayout: potentialPayout.toFixed(2),
  wallet: signal.wallet.addr,
  outcome: "open",
  mode,
  timestamp: new Date().toLocaleTimeString(),
};
setTrades(prev => [trade, ...prev]);
setDismissed(prev => new Set([...prev, signal.id]));
```

};

const handleDismiss = (id) => {
setDismissed(prev => new Set([…prev, id]));
};

const totalPaperPnl = trades
.filter(t => t.mode === “paper”)
.reduce((s, t) => s + (t.outcome === “won” ? parseFloat(t.potentialPayout) - t.size : t.outcome === “lost” ? -t.size : 0), 0);

const totalLivePnl = trades
.filter(t => t.mode === “live”)
.reduce((s, t) => s + (t.outcome === “won” ? parseFloat(t.potentialPayout) - t.size : t.outcome === “lost” ? -t.size : 0), 0);

return (
<>
<style>{css}</style>
<div className="app">
{/* ── Top Bar ── */}
<div className="topbar">
<div className="topbar-left">
<div className="logo">
<div className="logo-dot" />
POLY EDGE
</div>
<div className="mode-toggle">
<button className={`mode-btn paper ${mode === "paper" ? "active" : ""}`} onClick={() => setMode(“paper”)}>PAPER</button>
<button className={`mode-btn ${mode === "live" ? "active" : ""}`} onClick={() => setMode(“live”)}>LIVE</button>
</div>
</div>
<div className="topbar-right">
{mode === “paper” && (
<div className="balance-chip">
<span className="label">PAPER</span>
<span className="val">${paperBalance.toLocaleString()}</span>
</div>
)}
{mode === “live” && connected && (
<div className="balance-chip">
<span className="label">WALLET</span>
<span className="val">{fmtAddr(walletAddr)}</span>
</div>
)}
<button
className={`connect-btn ${connected ? "connected" : ""}`}
onClick={() => setTab(“setup”)}
>
{connected ? “✓ CONNECTED” : “CONNECT WALLET”}
</button>
</div>
</div>

```
    <div className="main">
      {/* ── Sidebar ── */}
      <div className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Tracked Wallets <span>{ALL_WALLETS.length}</span></div>
          {ALL_WALLETS.map(w => (
            <div
              key={w.addr}
              className={`wallet-item ${selectedWallet === w.addr ? "active" : ""}`}
              onClick={() => setSelectedWallet(selectedWallet === w.addr ? null : w.addr)}
            >
              <div className="wallet-avatar">{w.speciality === "Crypto" ? "₿" : w.speciality === "Macro" ? "📊" : w.speciality === "Politics" ? "🏛" : w.speciality === "AI" ? "🤖" : "📈"}</div>
              <div className="wallet-info">
                <div className="wallet-addr-small">{fmtAddr(w.addr)}</div>
                <div className={`wallet-pnl ${w.pnl >= 0 ? "pos" : "neg"}`}>{fmt$(w.pnl)}</div>
              </div>
              <div className="wallet-wr">{pct(w.winRate)}</div>
            </div>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Add Wallet</div>
          <input className="step-input" placeholder="0x..." style={{ marginBottom: 8 }}
            onKeyDown={e => {
              if (e.key === "Enter" && e.target.value.startsWith("0x")) {
                alert("Wallet added to tracking list! (In production this would fetch on-chain data)");
                e.target.value = "";
              }
            }}
          />
          <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "IBM Plex Mono, monospace" }}>Press Enter to track</div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="content">
        <div className="tabs">
          {["signals", "trades", "setup"].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "signals" ? `SIGNALS (${visibleSignals.length})` : t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ── SIGNALS TAB ── */}
        {tab === "signals" && (
          <>
            {/* Stats */}
            <div className="stats-row">
              <div className="stat-card c">
                <div className="stat-label">Active Signals</div>
                <div className="stat-val c">{visibleSignals.length}</div>
                <div className="stat-sub">from {ALL_WALLETS.length} wallets</div>
              </div>
              <div className="stat-card g">
                <div className="stat-label">Best Win Rate</div>
                <div className="stat-val g">{pct(Math.max(...ALL_WALLETS.map(w => w.winRate)))}</div>
                <div className="stat-sub">top tracked wallet</div>
              </div>
              <div className="stat-card y">
                <div className="stat-label">Paper P&L</div>
                <div className="stat-val y">{fmt$(totalPaperPnl)}</div>
                <div className="stat-sub">{trades.filter(t => t.mode === "paper").length} trades</div>
              </div>
              <div className="stat-card p">
                <div className="stat-label">Mode</div>
                <div className="stat-val p" style={{ fontSize: 18, marginTop: 4 }}>{mode === "paper" ? "📋 PAPER" : "⚡ LIVE"}</div>
                <div className="stat-sub">{mode === "paper" ? "risk-free" : connected ? "wallet connected" : "not connected"}</div>
              </div>
            </div>

            {mode === "live" && !connected && (
              <div className="warning-box">
                ⚠ &nbsp;Live mode requires a connected wallet. Go to Setup tab to connect, or switch to Paper mode to practice risk-free.
              </div>
            )}

            <div className="signals-header">
              <div className="section-title"><span>◈</span> LIVE SIGNALS</div>
              <div className="count-badge">{visibleSignals.length} actionable</div>
            </div>

            {visibleSignals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📡</div>
                <div className="empty-title">No signals right now</div>
                <div className="empty-sub">Monitoring {ALL_WALLETS.length} wallets • refreshes every 30s</div>
              </div>
            ) : (
              <div className="signal-grid">
                {visibleSignals.map(signal => {
                  const price = signal.side === "YES" ? signal.market.yesPrice : signal.market.noPrice;
                  const size = parseFloat(tradeSizes[signal.id] || signal.suggestedSize);
                  const payout = isNaN(size) ? 0 : (size / price).toFixed(2);
                  const profit = isNaN(size) ? 0 : (size / price - size).toFixed(2);
                  return (
                    <div key={signal.id} className={`signal-card ${signal.isNew ? "new" : ""}`}>
                      <div className="signal-top">
                        <div className="signal-meta">
                          <div className="signal-category">{signal.market.category} • {signal.market.volume >= 1e6 ? fmtVol(signal.market.volume) + " vol" : ""}</div>
                          <div className="signal-question">{signal.market.question}</div>
                        </div>
                        <div className="signal-badges">
                          <div className={`side-badge ${signal.side === "YES" ? "yes" : "no"}`}>{signal.side}</div>
                          <div className="conf-bar-wrap">
                            <div className="conf-bar"><div className="conf-bar-fill" style={{ width: pct(signal.confidence) }} /></div>
                            {pct(signal.confidence)}
                          </div>
                        </div>
                      </div>
                      <div className="signal-mid">
                        <div className="signal-stat">
                          <div className="signal-stat-label">Entry Price</div>
                          <div className="signal-stat-val c">{pct(price)}</div>
                        </div>
                        <div className="signal-divider" />
                        <div className="signal-stat">
                          <div className="signal-stat-label">Wallet W/R</div>
                          <div className="signal-stat-val g">{pct(signal.walletWinRate)}</div>
                        </div>
                        <div className="signal-divider" />
                        <div className="signal-stat">
                          <div className="signal-stat-label">Wallet P&L</div>
                          <div className={`signal-stat-val ${signal.walletPnl >= 0 ? "g" : ""}`}>{fmt$(signal.walletPnl)}</div>
                        </div>
                        <div className="signal-wallet">
                          <div className="wallet-dot" />
                          {fmtAddr(signal.wallet.addr)}
                        </div>
                      </div>
                      <div className="signal-actions">
                        <div className="size-input-wrap">
                          $<input
                            className="size-input"
                            type="number"
                            value={tradeSizes[signal.id] ?? signal.suggestedSize}
                            onChange={e => setTradeSizes(prev => ({ ...prev, [signal.id]: e.target.value }))}
                          />
                        </div>
                        <button
                          className={`action-btn ${mode === "paper" ? "paper-exec" : "execute"}`}
                          onClick={() => handleExecute(signal)}
                          disabled={mode === "live" && !connected}
                        >
                          {mode === "paper" ? "📋 PAPER TRADE" : "⚡ EXECUTE"}
                        </button>
                        <button className="action-btn dismiss" onClick={() => handleDismiss(signal.id)}>DISMISS</button>
                        <div className="payout-preview">
                          win → <span>+${profit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TRADES TAB ── */}
        {tab === "trades" && (
          <>
            <div className="pnl-summary">
              <div className="pnl-item">
                <div className="pnl-item-label">Paper P&L</div>
                <div className="pnl-item-val" style={{ color: totalPaperPnl >= 0 ? "var(--green)" : "var(--red)" }}>{fmt$(totalPaperPnl)}</div>
              </div>
              <div className="pnl-item">
                <div className="pnl-item-label">Live P&L</div>
                <div className="pnl-item-val" style={{ color: totalLivePnl >= 0 ? "var(--green)" : "var(--red)" }}>{fmt$(totalLivePnl)}</div>
              </div>
              <div className="pnl-item">
                <div className="pnl-item-label">Total Trades</div>
                <div className="pnl-item-val" style={{ color: "var(--cyan)" }}>{trades.length}</div>
              </div>
              <div className="pnl-item">
                <div className="pnl-item-label">Paper Balance</div>
                <div className="pnl-item-val" style={{ color: "var(--gold)" }}>${paperBalance.toLocaleString()}</div>
              </div>
            </div>

            {trades.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No trades yet</div>
                <div className="empty-sub">Execute signals from the Signals tab to see them here</div>
              </div>
            ) : (
              <div className="trades-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Market</th>
                      <th>Side</th>
                      <th>Size</th>
                      <th>Entry</th>
                      <th>Max Payout</th>
                      <th>Mode</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id}>
                        <td className="mono-sm" style={{ color: "var(--muted)" }}>{t.timestamp}</td>
                        <td style={{ maxWidth: 220, fontSize: 12 }}>{t.market.slice(0, 45)}{t.market.length > 45 ? "…" : ""}</td>
                        <td><span className={`side-badge ${t.side === "YES" ? "yes" : "no"}`}>{t.side}</span></td>
                        <td className="mono-sm">${t.size}</td>
                        <td className="mono-sm" style={{ color: "var(--cyan)" }}>{pct(t.price)}</td>
                        <td className="mono-sm" style={{ color: "var(--green)" }}>${t.potentialPayout}</td>
                        <td><span className={`outcome-badge ${t.mode === "paper" ? "paper" : "open"}`}>{t.mode.toUpperCase()}</span></td>
                        <td><span className={`outcome-badge ${t.outcome}`}>{t.outcome.toUpperCase()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── SETUP TAB ── */}
        {tab === "setup" && (
          <>
            <div className="warning-box">
              ⚠ &nbsp;Live trading uses real funds. Always start in Paper mode to validate signals. Never risk more than you can afford to lose. This tool is for informational purposes — you remain responsible for all trading decisions.
            </div>

            <div className="section-title" style={{ marginBottom: 16 }}><span>◈</span> SETUP GUIDE</div>

            {/* Step 1 */}
            <div className={`setup-step ${setupDone.step1 ? "done" : ""}`}>
              <div className={`step-num ${setupDone.step1 ? "done" : ""}`}>{setupDone.step1 ? "✓" : "1"}</div>
              <div className="step-body" style={{ flex: 1 }}>
                <h3>Create a Polymarket Account</h3>
                <p>Go to <code>polymarket.com</code> and sign up. You'll need a crypto wallet — Polymarket supports MetaMask, Coinbase Wallet, and WalletConnect. Make sure you're on <strong>Polygon network</strong> (not Ethereum mainnet). Fund your wallet with USDC on Polygon.</p>
                <div className="step-action">
                  <button className="step-btn green-btn" onClick={() => { window.open("https://polymarket.com", "_blank"); setSetupDone(p => ({ ...p, step1: true })); }}>
                    Open Polymarket →
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`setup-step ${setupDone.step2 ? "done" : ""}`}>
              <div className={`step-num ${setupDone.step2 ? "done" : ""}`}>{setupDone.step2 ? "✓" : "2"}</div>
              <div className="step-body" style={{ flex: 1 }}>
                <h3>Get Your CLOB API Key</h3>
                <p>To execute trades programmatically, you need a Polymarket CLOB API key. Go to <code>polymarket.com/settings</code> → API Keys → Generate Key. This key signs orders on your behalf. <strong>Never share it.</strong></p>
                <div className="step-action">
                  <input
                    className="step-input"
                    type="password"
                    placeholder="Paste your CLOB API key here…"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                  <button
                    className="step-btn"
                    onClick={() => { if (apiKey.length > 10) setSetupDone(p => ({ ...p, step2: true })); }}
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className={`setup-step ${setupDone.step3 ? "done" : ""}`}>
              <div className={`step-num ${setupDone.step3 ? "done" : ""}`}>{setupDone.step3 ? "✓" : "3"}</div>
              <div className="step-body" style={{ flex: 1 }}>
                <h3>Connect Your Wallet Address</h3>
                <p>Enter your Polygon wallet address (starts with <code>0x</code>). This is used to fetch your balance and confirm trades go to the right account. Double-check it matches your Polymarket account.</p>
                <div className="step-action">
                  <input
                    className="step-input"
                    placeholder="0x…your wallet address"
                    value={walletAddr}
                    onChange={e => setWalletAddr(e.target.value)}
                  />
                  <button
                    className="step-btn green-btn"
                    onClick={() => {
                      if (walletAddr.startsWith("0x") && walletAddr.length >= 40 && apiKey.length > 10) {
                        setConnected(true);
                        setSetupDone(p => ({ ...p, step3: true }));
                        setLiveBalance(2500);
                      } else {
                        alert("Please complete steps 1 and 2 first, and enter a valid wallet address.");
                      }
                    }}
                  >
                    ⚡ Connect & Go Live
                  </button>
                </div>
              </div>
            </div>

            {connected && (
              <div style={{ background: "var(--green)0f", border: "1px solid var(--green)33", borderRadius: 10, padding: 20, marginTop: 8 }}>
                <div style={{ color: "var(--green)", fontWeight: 700, marginBottom: 6 }}>✓ Connected</div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "IBM Plex Mono, monospace" }}>
                  Wallet: {fmtAddr(walletAddr)}<br />
                  Switch to LIVE mode in the top bar to execute real trades. Start with small sizes to verify everything works.
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, padding: 20, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10 }}>
              <div className="section-title" style={{ marginBottom: 12 }}><span>◈</span> HOW SIGNALS WORK</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
                <strong style={{ color: "var(--text)" }}>1. Wallet Tracking</strong> — We monitor the wallets shown in the sidebar. These are ranked by 90-day P&L and win rate.<br /><br />
                <strong style={{ color: "var(--text)" }}>2. Signal Detection</strong> — When a tracked wallet enters a new position, a signal card appears on your dashboard within ~30 seconds.<br /><br />
                <strong style={{ color: "var(--text)" }}>3. One-Click Confirm</strong> — You see the market, direction (YES/NO), entry price, and suggested size. Adjust the size, then click Execute. <em>You always confirm before any money moves.</em><br /><br />
                <strong style={{ color: "var(--text)" }}>4. Paper Mode First</strong> — Run paper mode for at least 2 weeks before going live. If your paper win rate is below 55%, the signal source may not be reliable.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
</>
```

);
}

import { useState, useMemo, useEffect, useRef } from 'react'

/* ============ SHARED DATA MODEL (all figures are simulated demo data) ============ */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const SEASON = [.35,.35,.4,.55,.7,.95,1.2,1.3,.95,.55,.4,.38] // Jun rise, Jul/Aug peak, Sep decline
/* ====== SHARED RESIDENTIAL DATASET (seeded demo data) ====== */
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const ZN = ['Beachfront Suites', 'Lagoon Residences', 'Chalets A', 'Chalets B', 'Villas North', 'Villas South']
const ZS = ['Beach', 'Lagoon', 'Chal A', 'Chal B', 'Vil N', 'Vil S']
const ZT = { 'Beachfront Suites': [['Suite 1BR', 75], ['Suite 2BR', 110]], 'Lagoon Residences': [['Lagoon 2BR', 115], ['Lagoon 3BR', 150]], 'Chalets A': [['Chalet 1BR', 85], ['Chalet 2BR', 120]], 'Chalets B': [['Chalet 1BR', 85], ['Chalet 2BR', 120]], 'Villas North': [['Villa 4BR', 280], ['Twin House', 210]], 'Villas South': [['Villa 4BR', 280], ['Twin House', 210]] }
const ZIMG = { 'Beachfront Suites': 'terrace', 'Lagoon Residences': 'lagoon', 'Chalets A': 'terrace', 'Chalets B': 'terrace', 'Villas North': 'villas', 'Villas South': 'villas', Hotel: 'hotel', Clubhouse: 'club' }
const BLD = []
const addB = (id, zone, name, x, z, w, d, h, units) => BLD.push({ id, zone, name, x, z, w, d, h, units })
;[-27, -9, 9, 27].forEach((x, i) => addB('BS' + (i + 1), 'Beachfront Suites', 'Beachfront Block ' + (i + 1), x, -20, 7, 18, [5, 6.4, 4.6, 5.8][i], 40))
;[-30, -10, 10, 30].forEach((x, i) => addB('LR' + (i + 1), 'Lagoon Residences', 'Lagoon Residence ' + (i + 1), x, 12, 7, 16, [4.5, 5.6, 4, 5][i], 60))
for (let k = 0; k < 8; k++) { addB('CA' + (k + 1), 'Chalets A', 'Chalet Cluster A' + (k + 1), -54 + (k % 2) * 8, -24 + Math.floor(k / 2) * 8, 6, 6, 2.6, 35); addB('CB' + (k + 1), 'Chalets B', 'Chalet Cluster B' + (k + 1), -54 + (k % 2) * 8, 14 + Math.floor(k / 2) * 8, 6, 6, 2.6, k < 4 ? 33 : 32) }
for (let k = 0; k < 7; k++) addB('VN' + (k + 1), 'Villas North', 'Villa Group N' + (k + 1), 44 + (k % 2) * 10, 8 + Math.floor(k / 2) * 8, 6, 5, 3, 20)
for (let k = 0; k < 6; k++) addB('VS' + (k + 1), 'Villas South', 'Villa Group S' + (k + 1), -30 + k * 12, 46, 8, 6, 3, 20)
BLD.push({ id: 'HB1', zone: 'Hotel', name: 'Hotel Block', x: 48, z: -20, w: 10, d: 24, h: 9, units: 0, sp: 1 }, { id: 'CL1', zone: 'Clubhouse', name: 'Clubhouse', x: 0, z: -5, w: 7, d: 7, h: 3, units: 0, sp: 1, round: 1 })
const FN = ['Ahmed', 'Mona', 'Omar', 'Laila', 'Karim', 'Nour', 'Youssef', 'Hana', 'Tarek', 'Salma', 'Mostafa', 'Dina', 'Khaled', 'Rania', 'Hassan', 'Mariam'], LN = ['Hassan', 'Farouk', 'Nasser', 'Saleh', 'Mansour', 'Aziz', 'Fahmy', 'Gamal', 'Habib', 'Ibrahim', 'Kamel', 'Lotfy']
function genUnits() {
  const r = rng(7), out = [], names = [], nm = () => FN[Math.floor(r() * FN.length)] + ' ' + LN[Math.floor(r() * LN.length)]
  BLD.filter(b => !b.sp).forEach(b => { for (let i = 0; i < b.units; i++) {
    const ty = ZT[b.zone][r() < .6 ? 0 : 1], q = r(), handover = q < .2 ? 'Not handed over' : q < .26 ? 'Under handover' : 'Handed over'
    const handDate = handover === 'Handed over' ? `${2024 + Math.floor(r() * 2)}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-15` : handover === 'Under handover' ? '2026-12-01' : `2027-0${1 + Math.floor(r() * 6)}-01`
    let oid; if (names.length && r() < .12) oid = Math.floor(r() * names.length); else { oid = names.length; names.push(nm()) }
    const s = r(), h = handover === 'Handed over', ownership = !h ? '—' : s < .4 ? 'Owner-occupied' : s < .7 ? 'Rented' : 'Vacant', occ = h && ownership !== 'Vacant'
    out.push({ id: b.id + '-' + String(i + 1).padStart(3, '0'), building: b.id, zone: b.zone, type: ty[0], area: ty[1], handover, handDate, ownership, occupancy: occ ? 'Occupied' : h ? 'Vacant' : 'Not occupied', owner: names[oid], ownerId: oid, tenant: ownership === 'Rented' ? nm() : '', residents: occ ? 1 + Math.floor(r() * 4) : 0, vehicles: occ ? Math.floor(r() * 3) : 0, guestQR: occ ? Math.floor(r() * 4) : 0, kwh: Math.round(ty[1] * 1.6 * (.8 + r() * .4)), water: +(ty[1] * .12 * (.8 + r() * .4)).toFixed(1), openReq: r() < .2 ? 1 + Math.floor(r() * 4) : 0, maint: Math.floor(r() * 6), fee: ty[1] * 14 })
  } })
  return out
}
const VIL = ['vil1', 'vil2', 'vil3', 'vil4'], VSTY = ['Garden Villa', 'Sunset Pool Villa', 'Lagoon-Edge Villa', 'Terraced Pool Villa']
const villaIdx = id => /^(VN|VS)\d/.test(id) ? (parseInt(id.slice(2)) + (id[1] === 'S' ? 2 : 0)) % 4 : -1
const villaGal = id => { const i = villaIdx(id); return [VIL[i], VIL[(i + 1) % 4], VIL[(i + 2) % 4], 'vil5'] }
const CHA = ['cha1', 'cha2', 'cha3', 'cha4', 'cha5', 'cha6', 'cha7'], CSTY = ['Courtyard Pool Chalet', 'Poolside Terrace Chalet', 'Cabana Pool Chalet', 'Evening-Glow Chalet', 'Sunny Pool Chalet', 'Garden Cottage Chalet', 'Terrace-Row Chalet']
const chaIdx = id => /^C[AB]\d/.test(id) ? (parseInt(id.slice(2)) - 1 + (id[1] === 'B' ? 3 : 0)) % 7 : -1
const chaGal = id => { const i = chaIdx(id); return [CHA[i], CHA[(i + 1) % 7], CHA[(i + 2) % 7]] }
const galOf = id => villaIdx(id) >= 0 ? villaGal(id) : chaIdx(id) >= 0 ? chaGal(id) : beaIdx(id) >= 0 ? [0, 1, 2].map(k => BEA[(beaIdx(id) + k) % 7]) : lrIdx(id) >= 0 ? [0, 1, 2].map(k => LAGK[(lrIdx(id) + k) % 3]) : null
const styOf = id => villaIdx(id) >= 0 ? VSTY[villaIdx(id)] : chaIdx(id) >= 0 ? CSTY[chaIdx(id)] : beaIdx(id) >= 0 ? BSTY[beaIdx(id)] : lrIdx(id) >= 0 ? LSTY[lrIdx(id)] : ''
const BEA = ['bea1', 'bea2', 'bea3', 'bea4', 'bea5', 'bea6', 'bea7'], BSTY = ['Beach Pavilion Suite', 'Hillside Beachfront Suite', 'Garden Entrance Suite', 'Lagoon Dusk Suite', 'Promenade Suite', 'Timber Beach Suite', 'Sunset Pool Suite']
const beaIdx = id => /^BS\d/.test(id) ? ((parseInt(id.slice(2)) - 1) * 2) % 7 : -1
const LAGK = ['lag1', 'lag2', 'lag3'], LSTY = ['Lagoon Aerial Residence', 'Sandy-Beach Lagoon Residence', 'Lagoon Promenade Residence']
const lrIdx = id => /^LR\d/.test(id) ? [0, 1, 2, 1][parseInt(id.slice(2)) - 1] : -1
const UNITS0 = genUnits(), DELIV0 = UNITS0.filter(u => u.handover === 'Handed over').length
const uStats = a => { const c = f => a.filter(f).length; return { total: a.length, handed: c(u => u.handover === 'Handed over'), under: c(u => u.handover === 'Under handover'), notH: c(u => u.handover === 'Not handed over'), oo: c(u => u.ownership === 'Owner-occupied'), rented: c(u => u.ownership === 'Rented'), vacant: c(u => u.ownership === 'Vacant'), owners: new Set(a.map(u => u.ownerId)).size, tenants: c(u => u.ownership === 'Rented') } }
const useOf = (u, f, k) => u[k] * f * (u.occupancy === 'Occupied' ? 1 : .25)
const normU = u => { const h = u.handover === 'Handed over', own = h ? (u.ownership === '—' ? 'Vacant' : u.ownership) : '—', occ = !h ? 'Not occupied' : own === 'Vacant' ? 'Vacant' : 'Occupied'; return { ...u, ownership: own, occupancy: occ, tenant: own === 'Rented' ? (u.tenant || 'New tenant (demo)') : '', residents: occ === 'Occupied' ? Math.max(1, u.residents) : 0, vehicles: occ === 'Occupied' ? u.vehicles : 0, guestQR: occ === 'Occupied' ? u.guestQR : 0 } }

const BASE = { occ: 70, delivered: DELIV0, newUnits: 0, vis: 1, price: 2.2, hvac: 1, water: 1, opex: 0, rev: 0, temp: 0, solar: 12, wprice: 18, gprice: 6 }
const IMG = {
  aerial:[window.IMGS.aerial,'Silver Sands North Coast – aerial masterplan view (supplied image)'], beach:[window.IMGS.beach,'Representative beach image – not verified as Silver Sands'],
  terrace:[window.IMGS.terrace,'Lagoon-view terrace (supplied reference image)'], club:[window.IMGS.club,'Representative clubhouse/terrace – third-party watermark'],
  villas:[window.IMGS.villas,'Villa – garden elevation & private pool (supplied image)'], hotel:[window.IMGS.hotel,'Hotel suite – sea view (supplied image)'],
  vil1:[window.IMGS.vil1,'Garden villa with lagoon frontage (supplied image)'], vil2:[window.IMGS.vil2,'Sunset villa with infinity pool (supplied image, source watermark)'], vil3:[window.IMGS.vil3,'Lagoon-edge residences with cabanas (supplied image)'], vil4:[window.IMGS.vil4,'Terraced pool-front residences (supplied image)'], cha1:[window.IMGS.cha1,'Courtyard pool chalet (supplied image – representative)'], cha2:[window.IMGS.cha2,'Poolside terrace chalet (supplied image – representative)'], cha3:[window.IMGS.cha3,'Cabana pool chalet (supplied image – representative)'], cha4:[window.IMGS.cha4,'Evening-glow pool chalet (supplied image – representative)'], cha5:[window.IMGS.cha5,'Sunny pool chalet (supplied image – representative)'], cha6:[window.IMGS.cha6,'Garden cottage chalet (supplied image – representative)'], cha7:[window.IMGS.cha7,'Terrace-row chalet (supplied image – representative)'], bea1:[window.IMGS.bea1,'Beach pavilion & jetty (supplied image – representative)'], bea2:[window.IMGS.bea2,'Hillside beach resort frontage (supplied image – representative)'], bea3:[window.IMGS.bea3,'Garden entrance suite (source watermark) (supplied image – representative)'], bea4:[window.IMGS.bea4,'Lagoon-edge suites at dusk (supplied image – representative)'], bea5:[window.IMGS.bea5,'Waterfront promenade (supplied image – representative)'], bea6:[window.IMGS.bea6,'Timber-detail beach suite (supplied image – representative)'], bea7:[window.IMGS.bea7,'Resort pools at sunset (supplied image – representative)'], lag1:[window.IMGS.lag1,'Silver Sands North Coast lagoon aerial (supplied image, agency watermark)'], lag2:[window.IMGS.lag2,'Sandy-beach lagoon residences (supplied image – representative)'], lag3:[window.IMGS.lag3,'Lagoon promenade residences (supplied image – representative, source watermark)'], vil5:[window.IMGS.vil5,'Villa living room & terrace (supplied image)'], lagoon:[window.IMGS.lagoon,'Lagoon & residential blocks (supplied reference image)']
}
const FAC = [
  { id:'lagoon', name:'Central Lagoon', type:'Lagoon', img:'lagoon', x:29, y:58, share:.10, st:'ok', cap:1200 },
  { id:'beach', name:'Main Beach', type:'Beach', img:'beach', x:40, y:19, share:.04, st:'ok', cap:2500 },
  { id:'villas', name:'Villa District', type:'Villas', img:'villas', x:46, y:42, share:.30, st:'w', cap:420 },
  { id:'chalets', name:'Chalet Cluster A', type:'Chalets', img:'terrace', x:14, y:50, share:.22, st:'ok', cap:380 },
  { id:'club', name:'Clubhouse', type:'Clubhouse', img:'club', x:60, y:63, share:.08, st:'ok', cap:600 },
  { id:'hotel', name:'Hotel Block', type:'Hotel', img:'hotel', x:93, y:53, share:.16, st:'c', cap:320 },
  { id:'pool', name:'Pool Complex', type:'Pool', img:'lagoon', x:30, y:74, share:.06, st:'ok', cap:450 },
]
function calc(m, p) {
  const s = SEASON[m], total = p.delivered + p.newUnits
  const effOcc = Math.min(1, p.occ / 100 * (0.3 + 0.7 * s / 1.3)), occU = Math.round(total * effOcc)
  const visitors = Math.round(occU * 3.2 * p.vis * (0.4 + s))
  const baseline = total * 55                       // permanent baseline kWh/month (all delivered units)
  const activation = p.newUnits * 140              // new-unit activation load
  const seasonal = occU * 210 * s * p.hvac * (1 + p.temp * .04) + visitors * 18
  const kwh = Math.round(baseline + activation + seasonal)
  const water = Math.round((occU * 12 + visitors * 0.16 * 30) * p.water)
  const gas = Math.round(occU * 3.2 + visitors * 0.4)
  const hvacK = Math.round(seasonal * 0.55)
  const solarK = Math.round(kwh * p.solar / 100 * (0.7 + 0.3 * s)), elec = (kwh - solarK) * p.price, wC = water * p.wprice, gC = gas * p.gprice
  const staff = 700000 + total * 150, maint = 160000 + occU * 90 + (s > 1 ? 120000 : 0)
  const other = 520000 + total * 120
  const opex = (elec + wC + gC + staff + maint + other) * (1 + p.opex / 100)
  const revenue = (occU * 1800 + visitors * 30 * 120 + total * 300 + 450000) * (1 + p.rev / 100)
  return { m, s, solarK, occU, effOcc, visitors, kwh, water, gas, hvacK, seasonalK: Math.round(seasonal), baseK: Math.round(baseline), actK: Math.round(activation), elec, wC, gC, staff, maint, other, opex, revenue, profit: revenue - opex, margin: (revenue - opex) / revenue * 100 }
}
const PRESETS = [{ n:'Baseline', m:null, p:{} }, { n:'Peak August', m:7, p:{ occ:95, hvac:1.4 } }, { n:'Heatwave', m:7, p:{ temp:8, hvac:1.2, vis:1.2, occ:90 } }, { n:'Full handover', m:null, p:{ newUnits:400, occ:80 } }, { n:'Energy price shock', m:null, p:{ price:4.5 } }, { n:'Green energy', m:null, p:{ solar:35 } }, { n:'Off-season', m:1, p:{ occ:40, vis:.6 } }, { n:'Premium pricing', m:null, p:{ rev:15, vis:1.2 } }]
const withP = x => ({ ...BASE, ...x })
const annual = p => { const r = { kwh:0, water:0, revenue:0, opex:0, profit:0 }; for (let i = 0; i < 12; i++) { const c = calc(i, p); r.kwh += c.kwh; r.water += c.water; r.revenue += c.revenue; r.opex += c.opex; r.profit += c.profit } r.margin = r.profit / r.revenue * 100; return r }
const fmt = n => Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n)
const SEED_ALERTS = [
  { id:1, sev:'Critical', time:'08:12', fac:'Hotel Block', desc:'Chiller #2 abnormal demand (+34%)', status:'Open', act:'Dispatch HVAC technician' },
  { id:2, sev:'Warning', time:'07:40', fac:'Villa District', desc:'Possible water leak – zone V3 night flow', status:'Open', act:'Inspect main V3 valve' },
  { id:3, sev:'Warning', time:'06:55', fac:'Clubhouse', desc:'12 guest QR codes expired', status:'Open', act:'Review & renew invitations' },
  { id:4, sev:'Normal', time:'06:10', fac:'Pool Complex', desc:'Water quality within limits', status:'Resolved', act:'None' },
]

/* ============ SMALL REUSABLE COMPONENTS ============ */
const CMAP = { '#65B6E5': '#5B96B3', '#91C9ED': '#B7D7E5', '#A7E3E2': '#D8C6A5', '#C8A96A': '#A68B61' }
const tc = c => document.documentElement.dataset.theme === 'dark' ? c : (CMAP[c] || c)
const GT = { n: 0, subs: new Set() }
if (!window.__gt) window.__gt = setInterval(() => { GT.n++; GT.subs.forEach(f => f(GT.n)) }, 2000)
function useG() { const [n, setN] = useState(GT.n); useEffect(() => { GT.subs.add(setN); return () => GT.subs.delete(setN) }, []); return n }
const numOf = v => { if (typeof v === 'number') return v; const m = /^\s*(-?[\d,]*\.?\d+)\s*([kM]?)\s*$/.exec(String(v)); if (!m) return NaN; return parseFloat(m[1].replace(/,/g, '')) * (m[2] === 'k' ? 1e3 : m[2] === 'M' ? 1e6 : 1) }
function KpiModal({ l, v, u, d, close }) {
  const x = numOf(v), [pct, setPct] = useState(0), hs = hash(l) % 5, cm = new Date().getMonth(), series = Array.from({ length: 24 }, (_, i) => x * (1 + .06 * Math.sin(i / 2.2 + hs) + .02 * Math.sin(i * 1.7))), sim = x * (1 + pct / 100)
  useEffect(() => { const k = e => e.key === 'Escape' && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  return <div className="modal" onClick={close}><div className="card mbox" onClick={e => e.stopPropagation()}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>{l}</h3><button className="btn sm" onClick={close}>✕ Close</button></div>
    <div className="bigv">{v}{u && <small> {u}</small>}</div>
    {isNaN(x) ? <Table cols={['Detail', 'Value']} rows={[['Current status', String(v) + (u ? ' ' + u : '')], ['Updated', new Date().toLocaleTimeString()], ['Source', 'Simulated demo data (responds to the Simulation panel)'], ['Tip', 'Open the related tab for the full breakdown and controls']]} /> : <>
      <div className="grid g2"><div><h3 style={{ fontSize: 15 }}>Last 24 hours (simulated)</h3><Chart labels={series.map((_, i) => '' + i)} series={[{ n: l, v: series, c: '#65B6E5' }]} /></div><div><h3 style={{ fontSize: 15 }}>12-month outlook (indicative)</h3><Chart bars labels={MONTHS} series={[{ n: l, v: MONTHS.map((_, i) => x * (.6 + .4 * SEASON[i] / SEASON[cm])), c: '#C8A96A' }]} /></div></div>
      <div className="card" style={{ marginTop: 10 }}><h3 style={{ fontSize: 15 }}>What-if simulation</h3><label className="sub">Change this value by <b>{pct > 0 ? '+' : ''}{pct} %</b><input type="range" min="-30" max="50" step="1" value={pct} onChange={e => setPct(+e.target.value)} style={{ width: '100%', padding: 0 }} /></label>
        <div className="dgrid"><div className="dtile"><small>Current</small><b>{fmt(x)}<i>{u}</i></b></div><div className="dtile"><small>Simulated</small><b>{fmt(sim)}<i>{u}</i></b></div><div className="dtile"><small>Difference</small><b>{(sim - x >= 0 ? '+' : '') + fmt(sim - x)}<i>{u}</i></b></div><div className="dtile"><small>24 h range</small><b>{fmt(Math.min(...series))}–{fmt(Math.max(...series))}</b></div></div></div>
      <Table cols={['Detail', 'Value']} rows={[['Current value', v + (u ? ' ' + u : '')], ['Change vs baseline', d === undefined ? '— (no baseline set)' : (d > 0 ? '+' : '') + d.toFixed(1) + ' %'], ['Updated', new Date().toLocaleTimeString()], ['Source', 'Simulated demo data (responds to the Simulation panel)']]} /></>}
  </div></div>
}
const Kpi = ({ l, v, d, u, onClick }) => { const n = useG(), h = hash(l), [open, setOpen] = useState(false), pts = Array.from({ length: 14 }, (_, i) => 10 + 6 * Math.sin(i / 2 + n / 2 + h) + 3 * Math.sin(i * 1.7 + h)).map((y, i) => `${i * 5.4},${20 - y}`).join(' ')
  return <><div className="card kpi" title="Click for details" onClick={() => onClick ? onClick() : setOpen(true)}><small><i className="led" />{l}</small><b>{v}{u && <small> {u}</small>}</b>{d !== undefined && <small className={d > 0 ? 'up' : 'dn'}>{d > 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}% vs baseline</small>}<svg className="spk" viewBox="0 0 70 20" preserveAspectRatio="none"><polyline points={pts} /></svg></div>{open && <KpiModal l={l} v={v} u={u} d={d} close={() => setOpen(false)} />}</> }
function Gauge({ v, min = 0, max = 100, unit, label, warn, dec }) {
  const f = Math.max(0, Math.min(1, (v - min) / (max - min))), a = Math.PI * (1 - f), x = 50 + 36 * Math.cos(a), y = 50 - 36 * Math.sin(a), col = warn && v > warn ? '#e5675f' : tc('#65B6E5')
  return <div className="gauge"><svg viewBox="0 0 100 64"><path d="M14 50A36 36 0 0 1 86 50" fill="none" strokeWidth="8" strokeLinecap="round" style={{ stroke: 'var(--bd)' }} />{f > .01 && <path d={`M14 50A36 36 0 0 1 ${x} ${y}`} fill="none" strokeWidth="8" strokeLinecap="round" stroke={col} />}<text x="50" y="47" textAnchor="middle" fontSize="14" fontWeight="700" style={{ fill: 'var(--tx)' }}>{(+v).toFixed(dec !== undefined ? dec : v < 10 ? 2 : 0)}</text><text x="50" y="60" textAnchor="middle" fontSize="8" style={{ fill: 'var(--tx2)' }}>{unit}</text></svg><small>{label}</small></div>
}
const FEED = ['Gate 1 – QR approved (Resident)', 'Pump PS-007 pressure 4.2 bar', 'HVAC chiller #2 load 78 %', 'Smart lighting zone 4 dimmed to 60 %', 'Beach access QR scanned', 'Water meter WM-310 synced', 'Solar inverter output 412 kW', 'Parking sensor P12 occupied', 'Gateway GW-02 heartbeat OK', 'Irrigation zone 6 started', 'Waste bin B-14 at 82 % – pickup scheduled', 'Generator G1 test OK', 'CCTV 118 motion detected', 'Elevator E-3 inspection passed', 'Occupancy sensor OC-55 updated']
function LiveFeed({ title }) {
  const n = useG(), [ev, setEv] = useState(() => FEED.slice(0, 5).map((m, i) => ({ t: new Date(Date.now() - i * 4000).toLocaleTimeString(), m })))
  useEffect(() => { if (n) setEv(e => [{ t: new Date().toLocaleTimeString(), m: FEED[Math.floor(Math.random() * FEED.length)] }, ...e].slice(0, 9)) }, [n])
  return <div className="card feed"><h3>{title || 'Live event feed'} <b className="Normal" style={{ fontSize: 12 }}>● LIVE</b></h3>{ev.map((x, i) => <div key={i} style={{ opacity: 1 - i * .08 }}><span>{x.t}</span>{x.m}</div>)}</div>
}
function DigitalClock() {
  const [d, setD] = useState(new Date()); useEffect(() => { const i = setInterval(() => setD(new Date()), 1000); return () => clearInterval(i) }, [])
  return <span className="clock">{d.toLocaleTimeString([], { hour12: false })}<small>{d.toDateString()}</small></span>
}
function Mimic({ M }) {
  const n = useG(), lvl = 58 + 18 * Math.sin(n / 3), flow = M.water / 720 * (1 + .06 * Math.sin(n)), pr = 4.2 + .2 * Math.sin(n * 1.2)
  return <div className="card"><h3>Water treatment & pumping – process mimic <b className="Normal" style={{ fontSize: 12 }}>● LIVE</b></h3>
    <svg viewBox="0 0 640 190" style={{ width: '100%' }}>
      <rect x="20" y="40" width="80" height="110" rx="6" fill="none" strokeWidth="2" style={{ stroke: 'var(--a)' }} /><rect x="22" y={150 - lvl} width="76" height={lvl} fill="var(--t)" opacity=".7" /><text x="60" y="30" textAnchor="middle" fontSize="11" style={{ fill: 'var(--tx2)' }}>Intake tank</text><text x="60" y="170" textAnchor="middle" fontSize="11" style={{ fill: 'var(--tx)' }}>{lvl.toFixed(0)} %</text>
      <line className="flow" x1="100" y1="120" x2="190" y2="120" strokeWidth="5" style={{ stroke: 'var(--a)' }} />
      <circle cx="215" cy="120" r="26" fill="none" strokeWidth="3" style={{ stroke: 'var(--a)' }} /><g className="spin" style={{ transformOrigin: '215px 120px' }}><path d="M215 100v40M195 120h40" strokeWidth="4" style={{ stroke: 'var(--gold)' }} /></g><text x="215" y="82" textAnchor="middle" fontSize="11" style={{ fill: 'var(--tx2)' }}>Pump PS-007</text>
      <line className="flow" x1="241" y1="120" x2="330" y2="120" strokeWidth="5" style={{ stroke: 'var(--a)' }} />
      <rect x="330" y="60" width="110" height="90" rx="6" fill="none" strokeWidth="2" style={{ stroke: 'var(--a)' }} /><path d="M340 100q15-10 30 0t30 0t30 0" fill="none" strokeWidth="2" style={{ stroke: 'var(--t)' }} className="flow" /><text x="385" y="50" textAnchor="middle" fontSize="11" style={{ fill: 'var(--tx2)' }}>Treatment (UV + Cl)</text>
      <line className="flow" x1="440" y1="120" x2="520" y2="120" strokeWidth="5" style={{ stroke: 'var(--a)' }} /><rect x="520" y="70" width="90" height="80" rx="6" fill="none" strokeWidth="2" style={{ stroke: 'var(--a)' }} /><text x="565" y="60" textAnchor="middle" fontSize="11" style={{ fill: 'var(--tx2)' }}>Distribution</text>
      <text x="565" y="115" textAnchor="middle" fontSize="12" fontWeight="700" style={{ fill: 'var(--tx)' }}>{flow.toFixed(1)} m³/h</text><text x="565" y="132" textAnchor="middle" fontSize="12" style={{ fill: 'var(--tx)' }}>{pr.toFixed(2)} bar</text></svg></div>
}
const Pic = ({ k, h, style }) => <div><div className="pw"><img className="img mv" style={{ height: h, ...style }} src={IMG[k][0]} alt={IMG[k][1]} onError={e => { e.target.style.opacity = 0.2 }} /></div><div className="sub" style={{ fontSize: 10, marginTop: 3 }}>{IMG[k][1]}</div></div>
const Tabs = ({ items, v, set }) => <div className="tabs">{items.map(i => <button key={i} className={'tab' + (v === i ? ' on' : '')} onClick={() => set(i)}>{i}</button>)}</div>
function Chart({ labels, series: sr, h = 190, bars }) {
  const series = sr.map(s => ({ ...s, c: tc(s.c) }))
  const [hv, setHv] = useState(null), [sd, setSd] = useState(false)
  const W = 560, P = 30, all = series.flatMap(s => s.v), mx = Math.max(...all) * 1.1 || 1, tx = { fill: 'var(--tx2)' }
  const x = i => P + i * (W - P * 2) / (labels.length - 1 || 1), y = v => h - 22 - v / mx * (h - 40), cw = (W - P * 2) / (labels.length - 1 || 1)
  const tipX = hv === null ? 0 : Math.min(Math.max(x(hv) - 60, 4), W - 124)
  return <div><svg viewBox={`0 0 ${W} ${h}`} style={{ width: '100%' }} onMouseLeave={() => setHv(null)}>
    {[0, .5, 1].map(g => <g key={g}><line x1={P} x2={W - P} y1={y(mx * g)} y2={y(mx * g)} style={{ stroke: 'var(--bd)' }} /><text x={2} y={y(mx * g) + 3} fontSize="9" style={tx}>{fmt(mx * g)}</text></g>)}
    {labels.map((l, i) => <text key={l + i} x={x(i)} y={h - 6} fontSize="9" textAnchor="middle" style={tx}>{l}</text>)}
    {hv !== null && <line x1={x(hv)} x2={x(hv)} y1={10} y2={h - 22} style={{ stroke: 'var(--a)', strokeDasharray: '3 3' }} />}
    {series.map((s, k) => bars ? s.v.map((v, i) => <rect key={i} x={x(i) - 9 + k * 9 - (series.length - 1) * 4} y={y(v)} width={8} height={h - 22 - y(v)} rx="2" fill={s.c} />) :
      <g key={s.n}><polyline fill="none" stroke={s.c} strokeWidth="2.5" points={s.v.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />{s.v.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hv === i ? 5 : 2.5} fill={s.c} />)}</g>)}
    {labels.map((l, i) => <rect key={'h' + i} x={x(i) - cw / 2} y={0} width={cw} height={h} fill="transparent" onMouseEnter={() => setHv(i)} />)}
    {hv !== null && <g><rect x={tipX} y={14} width={120} height={16 + series.length * 12} rx="8" style={{ fill: 'var(--solid)', stroke: 'var(--bd)' }} /><text x={tipX + 8} y={27} fontSize="10" fontWeight="700" style={{ fill: 'var(--tx)' }}>{labels[hv]}</text>{series.map((s, k) => <text key={k} x={tipX + 8} y={40 + k * 12} fontSize="9" fill={s.c}>● {s.n}: {fmt(s.v[hv])}</text>)}</g>}
    <g>{series.map((s, k) => <text key={k} x={W - P - 4} y={12 + k * 11} fontSize="9" textAnchor="end" fill={s.c}>● {s.n}</text>)}</g>
  </svg><button className="btn sm" onClick={() => setSd(!sd)}>{sd ? 'Hide data' : 'Show data'}</button>
    {sd && <Table cols={['', ...series.map(s => s.n)]} rows={labels.map((l, i) => [l, ...series.map(s => fmt(s.v[i]))])} />}</div>
}
const Table = ({ cols, rows }) => <div style={{ overflowX: 'auto' }}><table><thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>

/* ============ SECTIONS ============ */
const PM = {
  lagoon: { lamp: 2, ha: 1.7, lot: 5, road: 1, bin: 1, aq: 1, cams: ['CAM-21'], gate: null, sol: 0, hvac: 0 }, beach: { lamp: 1, ha: 1.2, lot: 2, road: 3, bin: 0, aq: 0, cams: ['CAM-15', 'CAM-16'], gate: 'GATE-07', sol: 0, hvac: 0 },
  villas: { lamp: 4, ha: 3.9, lot: 0, road: 1, bin: 3, aq: 2, cams: ['CAM-13', 'CAM-14'], gate: 'GATE-05', sol: .3, hvac: .3 }, chalets: { lamp: 3, ha: 2.9, lot: 1, road: 0, bin: 2, aq: 2, cams: ['CAM-11', 'CAM-12'], gate: 'GATE-04', sol: .25, hvac: .25 },
  club: { lamp: 6, ha: .7, lot: 4, road: 2, bin: 4, aq: 3, cams: ['CAM-17'], gate: null, sol: .1, hvac: .12 }, hotel: { lamp: 6, ha: 1.1, lot: 3, road: 4, bin: 4, aq: 3, cams: ['CAM-18', 'CAM-19'], gate: 'GATE-06', sol: .2, hvac: .3 }, pool: { lamp: 5, ha: .3, lot: 0, road: 5, bin: 5, aq: 4, cams: ['CAM-20'], gate: null, sol: .05, hvac: .08 } }
function placeInfo(layer, f, M, B, sec, tk) {
  const p = PM[f.id], hr = new Date().getHours(), night = hr >= 18 || hr < 6, h = hash(f.id), c01 = (v, a, b) => Math.max(a, Math.min(b, v))
  if (layer === 'HVAC') { const kw = M.hvacK * p.hvac; return p.hvac ? { val: fmt(kw) + ' kWh', tiles: [['HVAC energy', fmt(kw), 'kWh/mo'], ['Cooling load', Math.min(99, 35 + M.s * 45).toFixed(0), '%'], ['Indoor setpoint', '24', '°C'], ['Efficiency (COP)', (4.2 - M.s * .5).toFixed(2), '']], chart: { base: kw / 720, unit: 'kW' } } : { val: 'Outdoor', tiles: [['Type', 'Outdoor area', ''], ['HVAC load', 'None', '']] } }
  if (layer === 'Solar') { const kw = M.solarK * p.sol, dem = M.kwh * f.share; return p.sol ? { val: fmt(kw) + ' kWh', tiles: [['Generation', fmt(kw), 'kWh/mo'], ['Share of demand', (kw / dem * 100).toFixed(0), '%'], ['CO₂ avoided', fmt(kw * .45 / 1000), 't'], ['Installed', Math.round(p.sol * 3200), 'kWp']], chart: { base: kw / 720 * 2.2, unit: 'kW' } } : { val: 'No PV', tiles: [['Solar PV', 'None installed', ''], ['Potential', 'Shade structures', '']] } }
  if (layer === 'Lighting') { const z = LAMPS[p.lamp], dim = night ? c01(42 + 30 * M.s, 30, 85) : 0; return { val: z[1] + ' lamps', tiles: [['Smart lamps', z[1], ''], ['ON now', night ? z[1] : 0, ''], ['Dimming', dim.toFixed(0), '%'], ['Power', (z[1] * z[2] * dim / 100000).toFixed(1), 'kW']] } }
  if (layer === 'Irrigation') { const fl = p.ha * 14 * (.7 + .5 * M.s), run = tk % 3 !== 0; return { val: p.ha + ' ha', tiles: [['Irrigated area', p.ha, 'ha'], ['Soil moisture', (32 + h % 12 + 2 * Math.sin(tk)).toFixed(0), '%'], ['Flow now', (run ? fl : 0).toFixed(1), 'm³/h'], ['Water per day', (fl * 3).toFixed(0), 'm³']], chart: { base: fl, unit: 'm³/h' } } }
  if (layer === 'Parking') { const l = LOTS[p.lot], oc = c01(M.s * 65 + l[2], 4, 100), used = Math.round(l[1] * oc / 100); return { val: (l[1] - used) + ' free', tiles: [['Lot', l[0], ''], ['Capacity', l[1], ''], ['Occupied', used, ''], ['Free spaces', l[1] - used, '']], chart: { base: Math.max(1, used / 40), unit: '/min' } } }
  if (layer === 'Traffic') { const r = ROADS[p.road], vol = Math.round((60 + 280 * M.s) * r[1]), spd = c01(52 - vol / 11, 14, 50); return { val: vol + ' veh/h', tiles: [['Road', r[0], ''], ['Vehicles / hour', vol, ''], ['Speed', spd.toFixed(0), 'km/h'], ['Level of service', vol < 120 ? 'A' : vol < 200 ? 'B' : vol < 280 ? 'C' : 'D', '']], chart: { base: vol / 60, unit: 'veh/min' } } }
  if (layer === 'Waste') { const z = BINZ[p.bin], fill = c01(48 + h % 30 + M.s * 10 + 4 * Math.sin(tk), 5, 100); return { val: fill.toFixed(0) + ' %', tiles: [['Smart bins', z[1], ''], ['Average fill', fill.toFixed(0), '%'], ['Waste per day', Math.round((M.visitors * .02 + M.occU * .9) * f.share), 'kg'], ['Next pickup', fill > 80 ? 'Now' : '18:00', '']] } }
  if (layer === 'Air Quality') { const s = AQS[p.aq], aqi = Math.max(8, 34 + 14 * M.s + s[1] + 3 * Math.sin(tk)); return { val: 'AQI ' + aqi.toFixed(0), tiles: [['Air quality index', aqi.toFixed(0), ''], ['Category', aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : 'Unhealthy', ''], ['PM2.5', (aqi * .38).toFixed(1), 'µg/m³'], ['Noise', (48 + 8 * M.s).toFixed(0), 'dB']], chart: { base: aqi, unit: 'AQI' } } }
  if (layer === 'Security') { const cams = p.cams.map(id => CAMS.find(c => c.id === id)), inf = cams.map(c => camInfo(sec, c)), gs = p.gate ? gateStats(sec, p.gate) : null, c0 = cams[0]
    return { val: cams.length + ' cams', tiles: [['Cameras', cams.length, ''], ['Online', inf.filter(i => i.st === 'Online' || i.st === 'Fault').length, ''], ['Recording errors', inf.filter(i => i.rec === 'Error').length, ''], gs ? ['Gate entries / exits', gs.entries + ' / ' + gs.exits, ''] : ['Gate', 'None here', '']],
      extra: can(sec.role, 'cams') ? <div style={{ marginTop: 6 }}><CamView cam={c0} ci={inf[0]} url={sec.streams[c0.id]} /><div className="sub">{c0.id} · {c0.name} · simulated feed</div></div> : <div className="sub">Camera view is restricted for your role.</div> } }
  if (layer === 'Maintenance') { const open = h % 4 + Math.round(M.s * 3), done = 6 + h % 5; return { val: open + ' WOs', tiles: [['Open work orders', open, ''], ['Completed (month)', done, ''], ['Completion rate', (done / (done + open) * 100).toFixed(0), '%'], ['Next service', 3 + h % 9, 'days']] } }
  return { val: '—', tiles: [] }
}
function Overview({ M, B, mi, alerts, setFac, fac, us, sec }) {
  const [layer, setLayer] = useState('Facilities'), [pt, setPt] = useState('All'), tk = useTick(2000)
  const f = FAC.find(x => x.id === fac) || FAC[0], open = alerts.filter(a => a.status !== 'Resolved')
  const LAY = ['Facilities', 'Energy', 'Occupancy', 'Water', 'HVAC', 'Solar', 'Lighting', 'Irrigation', 'Parking', 'Traffic', 'Waste', 'Air Quality', 'Security', 'Maintenance', 'Alerts', 'Visitors', 'Revenue']
  const val = x => ({ Facilities: x.type, Energy: fmt(M.kwh * x.share) + ' kWh', Occupancy: Math.round(x.cap * M.effOcc) + ' / ' + x.cap, Water: fmt(M.water * x.share) + ' m³', Alerts: (x.st === 'ok' ? 0 : 1) + ' alert', Visitors: fmt(M.visitors * x.share) + ' visits', Revenue: fmt(M.revenue * x.share) + ' EGP' })[layer] ?? placeInfo(layer, x, M, B, sec, tk).val
  const show = k => pt === 'All' || pt === k, st = x => x.st === 'ok' ? 'Normal' : x.st === 'w' ? 'Warning' : 'Critical'
  const mon = k => MONTHS.map((_, i) => calc(i, M.p)[k])
  return <>
    <div className="hero"><div className="kb"><img src={IMG.aerial[0]} alt="Silver Sands masterplan" />
      {FAC.map(x => <div key={x.id} className={'mkw' + (x.id === fac ? ' sel' : '') + (layer === 'Facilities' ? ' lo' : '')} style={{ left: x.x + '%', top: x.y + '%' }} onClick={() => setFac(x.id)}><div className={'mk ' + x.st} /><span className="mkl">{x.name}<b>{val(x)}</b></span></div>)}</div>
      <div className="layers">{LAY.map(l => <button key={l} className={layer === l ? 'on' : ''} onClick={() => setLayer(l)}>{l}</button>)}</div>
      <div className="scan" /><i className="hc tl" /><i className="hc tr" /><i className="hc bl" /><i className="hc br" /><div className="hudtag">OVERVIEW · LIVE · {layer.toUpperCase()}</div>
      <div className="card hcard hud"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>{f.name}</h3><b className={st(f)} style={{ fontSize: 11 }}>● {st(f).toUpperCase()}</b></div><div className="sub">{f.type} · {layer} data</div>
        <img className="img" style={{ height: 70, margin: '6px 0' }} src={IMG[f.img][0]} alt={f.name} />
        {(() => { const sharedOcc = ['lagoon', 'beach', 'pool'].includes(f.id), kwh = M.kwh * f.share, wat = M.water * f.share, rev = M.revenue * f.share, vis = M.visitors * f.share, occ = sharedOcc ? M.s * 70 : M.effOcc * 100, occB = sharedOcc ? B.s * 70 : B.effOcc * 100, al = open.filter(a => a.fac === f.name), D = (l, v, u) => <div className="dtile" key={l}><small>{l}</small><b>{v}<i>{u}</i></b></div>
          if (['HVAC', 'Solar', 'Lighting', 'Irrigation', 'Parking', 'Traffic', 'Waste', 'Air Quality', 'Security', 'Maintenance'].includes(layer)) { const pi = placeInfo(layer, f, M, B, sec, tk); return <><div className="dgrid">{pi.tiles.map(t => D(t[0], t[1], t[2]))}</div>{pi.chart && <LiveChart key={f.id + layer} base={Math.max(.1, pi.chart.base)} unit={pi.chart.unit} label={f.name} />}{pi.extra}</> }
          if (layer === 'Energy') return <><div className="dgrid">{D('Consumption', fmt(kwh), 'kWh/mo')}{D('Energy cost', fmt(M.elec * f.share), 'EGP')}{D('Resort share', (f.share * 100).toFixed(0), '%')}{D('Peak demand', fmt(kwh / 720 * 2.1), 'kW')}</div><LiveChart key={f.id + layer} base={kwh / 720 * 1.4} unit="kW" label={f.name} /></>
          if (layer === 'Occupancy') return <><div className="gauges"><Gauge v={occ} unit="%" label="Occupancy now" dec={0} /><Gauge v={occB} unit="%" label="Baseline" dec={0} /></div><div className="dgrid">{D('Occupied', Math.round(f.cap * occ / 100), '/ ' + f.cap)}{D('Change', (occ - occB).toFixed(1), 'pts')}</div></>
          if (layer === 'Water') return <><div className="dgrid">{D('Consumption', fmt(wat), 'm³/mo')}{D('Per unit', (wat / f.cap).toFixed(1), 'm³')}{D('Water cost', fmt(M.wC * f.share), 'EGP')}{D('Flow', (wat / 720).toFixed(1), 'm³/h')}</div><LiveChart key={f.id + layer} base={wat / 720} unit="m³/h" label={f.name} /></>
          if (layer === 'Alerts') return <><div className="dgrid">{D('Open alerts', al.length, '')}{D('Status', st(f), '')}</div>{al.length ? al.map(a => <div className="sub" key={a.id} style={{ marginBottom: 4 }}><b className={a.sev}>{a.sev}</b> {a.desc}<br />Action: {a.act}</div>) : <div className="sub">No open alerts for this place.</div>}</>
          if (layer === 'Visitors') return <><div className="dgrid">{D('Visits / month', fmt(vis), '')}{D('Per day', fmt(vis / 30), '')}{D('Peak hours', '11–14', 'h')}{D('Parking', Math.min(98, Math.round(M.s * 65)), '%')}</div><LiveChart key={f.id + layer} base={vis / 30 / 12} unit="/min" label="Entries" /></>
          if (layer === 'Revenue') return <><div className="dgrid">{D('Revenue', fmt(rev), 'EGP/mo')}{D('Share', (f.share * 100).toFixed(0), '%')}{D('Per visitor', fmt(rev / Math.max(1, vis)), 'EGP')}{D('Per capacity', fmt(rev / f.cap), 'EGP')}</div></>
          return <div className="dgrid">{D('Units / capacity', f.cap, '')}{D('Occupancy', occ.toFixed(0), '%')}{D('Energy', fmt(kwh), 'kWh')}{D('Water', fmt(wat), 'm³')}{D('Visitors', fmt(vis), '/mo')}{D('Revenue', fmt(rev), 'EGP')}{D('Open alerts', al.length, '')}{D('Status', st(f), '')}</div> })()}
        <div className="sub" style={{ marginTop: 6 }}>Switch the tabs on the photo to see other data for this place.</div></div></div>
    <div className="sub" style={{ marginTop: 4 }}>{IMG.aerial[1]}. Choose a data tab on the photo, then click any marker to see that place's data. All data simulated.</div>
    <div className="grid">
      <Kpi l="Total Units" v={us.total} /> <Kpi l="Delivered Units" v={us.handed + M.newU} />
      <Kpi l="Occupied Units" v={M.occU} d={(M.occU / B.occU - 1) * 100} /> <Kpi l="Occupancy Rate" v={(M.effOcc * 100).toFixed(1)} u="%" />
      <Kpi l="Active Residents" v={fmt(M.occU * 2.6)} /> <Kpi l="Current Visitors" v={fmt(M.visitors / 30 * 4)} /> <Kpi l="Active QR Passes" v={fmt(M.occU * 2.6 + M.visitors / 10)} />
      <Kpi l="Electricity" v={fmt(M.kwh)} u="kWh/mo" d={(M.kwh / B.kwh - 1) * 100} /> <Kpi l="Water" v={fmt(M.water)} u="m³/mo" d={(M.water / B.water - 1) * 100} />
      <Kpi l="Energy Cost" v={fmt(M.elec)} u="EGP" /> <Kpi l="Revenue" v={fmt(M.revenue)} u="EGP" d={(M.revenue / B.revenue - 1) * 100} /> <Kpi l="Operating Expenses" v={fmt(M.opex)} u="EGP" />
      <Kpi l="Operating Profit" v={fmt(M.profit)} u="EGP" d={(M.profit / B.profit - 1) * 100} /> <Kpi l="Active Alerts" v={open.length} /> <Kpi l="Equipment Availability" v={(97.8 - open.filter(a => a.sev === 'Critical').length * 1.2).toFixed(1)} u="%" />
    </div>
    <div className="grid"><Kpi l="● Live demand" v={fmt(M.kwh / 720 * 1.4 * (1 + .05 * Math.sin(tk)))} u="kW" /><Kpi l="● Visitors inside" v={Math.round(M.visitors / 30 * 4 * (1 + .04 * Math.sin(tk * 1.3)))} /><Kpi l="● Active QR passes" v={Math.round(M.occU * 2.6 + M.visitors / 10 + 6 * Math.sin(tk * .7))} /><Kpi l="● Water flow" v={(M.water / 720 * (1 + .06 * Math.sin(tk * 1.1))).toFixed(1)} u="m³/h" /></div>
    <Tabs items={['All', 'Seasonal', 'Financial', 'Energy', 'Facilities', 'Environment', 'Alerts']} v={pt} set={setPt} />
    <div className="grid g2">
      {show('Seasonal') && <div className="card"><h3>Seasonal activity – occupied units & visitors/10</h3><Chart labels={MONTHS} series={[{ n:'Occupied units', v: mon('occU'), c:'#65B6E5' }, { n:'Visitors/10', v: mon('visitors').map(v => v / 10), c:'#A7E3E2' }]} /></div>}
      {show('Financial') && <div className="card"><h3>Financial performance (EGP)</h3><Chart bars labels={MONTHS} series={[{ n:'Revenue', v: mon('revenue'), c:'#91C9ED' }, { n:'Opex', v: mon('opex'), c:'#A7E3E2' }]} /></div>}
      {show('Energy') && <div className="card"><h3>Electricity & solar (kWh)</h3><Chart labels={MONTHS} series={[{ n:'Consumption', v: mon('kwh'), c:'#65B6E5' }, { n:'Solar', v: mon('solarK'), c:'#C8A96A' }]} /></div>}
      {show('Facilities') && <div className="card"><h3>Facility performance</h3><Table cols={['Facility', 'Type', 'kWh/mo', 'Status']} rows={FAC.map(x => [<a style={{ cursor: 'pointer' }} onClick={() => setFac(x.id)}>{x.name}</a>, x.type, fmt(M.kwh * x.share), <b className={st(x)}>{st(x)}</b>])} /></div>}
      {show('Environment') && <div className="card"><h3>Environmental conditions</h3><Table cols={['Metric', 'Value']} rows={[['Air temp', (20 + M.s * 14 + M.p.temp).toFixed(0) + ' °C'], ['Sea temp', (19 + M.s * 8).toFixed(0) + ' °C'], ['Humidity', '64 %'], ['Wind', '14 km/h NW'], ['Lagoon quality', 'Good']]} /></div>}
      {show('Alerts') && <LiveFeed />}
      {show('Energy') && <div className="card"><h3>Live digital meters</h3><div className="gauges"><Gauge v={Math.min(99, M.kwh / B.kwh * 55 + 4 * Math.sin(tk))} unit="%" label="Grid load" warn={85} dec={0} /><Gauge v={M.effOcc * 100} unit="%" label="Occupancy" dec={0} /><Gauge v={M.solarK / M.kwh * 100} unit="%" label="Renewable" dec={1} /><Gauge v={97.8 - 1.2 * open.filter(a => a.sev === 'Critical').length} min={80} unit="%" label="Availability" dec={1} /></div></div>}
      {show('Alerts') && <div className="card"><h3>Critical alerts</h3><Table cols={['Sev', 'Facility', 'Description']} rows={open.slice(0, 6).map(a => [<b className={a.sev}>{a.sev}</b>, a.fac, a.desc])} /></div>}
    </div></>
}
function Energy({ M, B, p, setFac, fac }) {
  const [t, setT] = useState('Electricity'), f = FAC.find(x => x.id === fac) || FAC[0], gn = useG(), jt = k => Math.sin(gn * 1.3 + k)
  const ser = k => [{ n:'Simulated', v: MONTHS.map((_, i) => calc(i, p)[k]), c:'#65B6E5' }, { n:'Baseline', v: MONTHS.map((_, i) => calc(i, BASE)[k]), c:'#A7E3E2' }]
  const solar = M.solarK
  return <>
    <Tabs items={['Electricity','Water','Gas','HVAC & Cooling','Renewable','Intelligence','Seasonal & Handover']} v={t} set={setT} />
    {t === 'Electricity' && <><div className="grid"><Kpi l="Monthly consumption" v={fmt(M.kwh)} u="kWh" d={(M.kwh / B.kwh - 1) * 100} /><Kpi l="Current demand" v={Math.round(M.kwh / 720 * 1.4)} u="kW" /><Kpi l="Peak / max demand" v={Math.round(M.kwh / 720 * 2.1)} u="kW" /><Kpi l="Cost" v={fmt(M.elec)} u="EGP" /><Kpi l="Voltage / Freq" v="400 V / 50 Hz" /><Kpi l="Power factor" v="0.94" /><Kpi l="kWh per occupied unit" v={Math.round(M.kwh / M.occU)} /><Kpi l="kWh per visitor" v={(M.kwh / M.visitors).toFixed(1)} /></div>
      <div className="card"><h3>Digital power meters (live)</h3><div className="gauges"><Gauge v={400 + 3 * jt(1)} min={360} max={440} unit="V" label="Voltage" dec={1} /><Gauge v={M.kwh / 720 * 1.4 * 1000 / (1.732 * 400 * .94) * (1 + .03 * jt(2))} min={0} max={900} unit="A" label="Current" dec={0} /><Gauge v={.94 + .02 * jt(3)} min={.7} max={1} unit="cos φ" label="Power factor" dec={3} /><Gauge v={50 + .05 * jt(4)} min={49} max={51} unit="Hz" label="Frequency" dec={2} /></div></div>
      <div className="grid g2"><div className="card"><h3>Monthly consumption (kWh) – actual vs baseline</h3><Chart labels={MONTHS} series={ser('kwh')} /></div><div className="card"><h3>Live demand (kW) – streaming</h3><LiveChart base={M.kwh / 720 * 1.4} unit="kW" label="Demand" /></div><div className="card"><h3>Typical daily load profile (kW)</h3><Chart labels={['0','4','8','12','16','20','24']} series={[{ n:'Load', v:[.5,.4,.7,1,1.1,1.25,.6].map(x => x * M.kwh / 720 * 1.3), c:'#65B6E5' }]} /></div></div></>}
    {t === 'Water' && <><div className="grid"><Kpi l="Total" v={fmt(M.water)} u="m³" d={(M.water / B.water - 1) * 100} /><Kpi l="Potable" v={fmt(M.water * .55)} /><Kpi l="Irrigation" v={fmt(M.water * .25)} /><Kpi l="Pools" v={fmt(M.water * .15)} /><Kpi l="Lagoon makeup" v={fmt(M.water * .05)} /><Kpi l="Cost" v={fmt(M.wC)} u="EGP" /><Kpi l="Per occupied unit" v={(M.water / M.occU).toFixed(1)} u="m³" /><Kpi l="Tank level / pressure" v="78 % / 4.2 bar" /></div><div className="card"><h3>Live water system</h3><div className="gauges"><Gauge v={4.2 + .2 * jt(1)} min={0} max={8} unit="bar" label="Pressure" warn={6.5} /><Gauge v={78 + 5 * jt(2)} unit="%" label="Tank level" dec={0} /><Gauge v={M.water / 720 * (1 + .06 * jt(3))} min={0} max={Math.max(10, M.water / 400)} unit="m³/h" label="Flow" dec={1} /><Gauge v={Math.max(0, 1.2 + jt(4))} min={0} max={5} unit="idx" label="Leak index" warn={3.5} /></div><LiveChart base={M.water / 720} unit="m³/h" label="Flow" /></div>
      <div className="card" style={{ marginTop: 14 }}><h3>Monthly water (m³)</h3><Chart labels={MONTHS} series={ser('water')} /></div></>}
    {t === 'Gas' && <><div className="grid"><Kpi l="Monthly gas" v={fmt(M.gas)} u="m³" /><Kpi l="Cost" v={fmt(M.gC)} u="EGP" /><Kpi l="Hotel kitchens" v={fmt(M.gas * .5)} /><Kpi l="Pools heating" v={fmt(M.gas * .3)} /></div><div className="card"><h3>Live gas system</h3><div className="gauges"><Gauge v={M.gas / 720 * (1 + .05 * jt(1))} min={0} max={Math.max(5, M.gas / 400)} unit="m³/h" label="Flow" dec={1} /><Gauge v={21 + jt(2)} min={0} max={40} unit="mbar" label="Line pressure" dec={1} /></div><LiveChart base={M.gas / 720} unit="m³/h" label="Gas flow" color="#C8A96A" /></div>
      <div className="card" style={{ marginTop: 14 }}><h3>Gas (m³)</h3><Chart labels={MONTHS} series={ser('gas')} /></div></>}
    {t === 'HVAC & Cooling' && <><div className="grid"><Kpi l="HVAC kWh" v={fmt(M.hvacK)} /><Kpi l="Cooling efficiency (COP)" v={(4.2 - M.s * .5).toFixed(2)} /><Kpi l="Outdoor temp" v={(20 + M.s * 14).toFixed(0)} u="°C" /><Kpi l="Indoor setpoint" v="24 °C" /></div><div className="card"><h3>Live cooling plant</h3><div className="gauges"><Gauge v={24 + .4 * jt(1)} min={16} max={32} unit="°C" label="Indoor" dec={1} /><Gauge v={20 + M.s * 14 + M.p.temp + jt(2)} min={10} max={50} unit="°C" label="Outdoor" dec={1} /><Gauge v={4.2 - M.s * .5 + .05 * jt(3)} min={2} max={6} unit="COP" label="Efficiency" dec={2} /><Gauge v={Math.min(99, 35 + M.s * 45 + 4 * jt(4))} unit="%" label="Cooling load" warn={85} dec={0} /></div><LiveChart base={M.hvacK / 720} unit="kW" label="HVAC" /></div>
      <div className="card" style={{ marginTop: 14 }}><h3>HVAC demand (kWh)</h3><Chart labels={MONTHS} series={ser('hvacK')} /></div></>}
    {t === 'Renewable' && <><div className="grid"><Kpi l="Solar generation" v={fmt(solar)} u="kWh" /><Kpi l="Renewable share" v={(solar / M.kwh * 100).toFixed(1)} u="%" /><Kpi l="Grid dependency" v={(100 - solar / M.kwh * 100).toFixed(1)} u="%" /><Kpi l="CO₂ avoided" v={fmt(solar * .45 / 1000)} u="t" /><Kpi l="Savings" v={fmt(solar * p.price)} u="EGP" /><Kpi l="Battery SoC" v="64 %" /></div><div className="card"><h3>Live solar output (kW)</h3><LiveChart base={solar / 720 * 2.2} unit="kW" label="Solar" color="#C8A96A" /></div></>}
    {t === 'Intelligence' && <><div className="grid"><Kpi l="Energy cost / occupied unit" v={fmt(M.elec / M.occU)} u="EGP" /><Kpi l="Energy cost / guest" v={(M.elec / M.visitors).toFixed(1)} u="EGP" /><Kpi l="Energy % of opex" v={(M.elec / M.opex * 100).toFixed(1)} u="%" /><Kpi l="Efficiency score" v={Math.max(40, 92 - M.s * 15).toFixed(0)} /><Kpi l="Waste detected" v={fmt(M.kwh * .04)} u="kWh" /></div>
      <div className="card" style={{ marginBottom: 14 }}><h3>Live efficiency</h3><div className="gauges"><Gauge v={Math.max(40, 92 - M.s * 15) + jt(1)} unit="score" label="Efficiency score" dec={0} /><Gauge v={M.kwh * .04 / 720 * (1 + .1 * jt(2))} min={0} max={20} unit="kW" label="Waste detected" dec={1} warn={14} /></div></div>
      <div className="card"><h3>Facility energy & financial impact – select a facility</h3><div className="tabs">{FAC.map(x => <button key={x.id} className={'tab' + (x.id === fac ? ' on' : '')} onClick={() => setFac(x.id)}>{x.name}</button>)}</div>
        <div className="grid g2"><Pic k={f.img} h={200} /><Table cols={['Metric','Value']} rows={[['Energy', fmt(M.kwh * f.share) + ' kWh'], ['Cost', fmt(M.elec * f.share) + ' EGP'], ['Share of load', (f.share * 100) + ' %'], ['Impact on profit', (M.elec * f.share / M.revenue * 100).toFixed(2) + ' % of revenue']]} /></div></div></>}
    {t === 'Seasonal & Handover' && <><div className="card" style={{ marginBottom: 14 }}><div className="gauges"><Gauge v={M.effOcc * 100} unit="%" label="Occupancy" dec={0} /><Gauge v={M.s * 100 / 1.3} unit="%" label="Season intensity" dec={0} /><Gauge v={M.baseK / M.kwh * 100} unit="%" label="Permanent baseline" dec={0} /><Gauge v={M.actK / M.kwh * 100} unit="%" label="New-unit activation" dec={1} /></div></div>
      <div className="card"><h3>Electricity decomposition (kWh) – baseline vs seasonal vs new-unit activation</h3><Chart bars labels={MONTHS} series={[{ n:'Permanent baseline', v: MONTHS.map((_, i) => calc(i, p).baseK), c:'#91C9ED' }, { n:'Seasonal', v: MONTHS.map((_, i) => calc(i, p).seasonalK), c:'#A7E3E2' }, { n:'New-unit activation', v: MONTHS.map((_, i) => calc(i, p).actK), c:'#65B6E5' }]} /></div>
      <div className="card" style={{ marginTop: 14 }}><h3>Occupancy vs electricity</h3><Table cols={['Month','Occ %','Units','Visitors','kWh','Water m³','Revenue','Profit']} rows={MONTHS.map((n, i) => { const c = calc(i, p); return [n, (c.effOcc * 100).toFixed(0), c.occU, fmt(c.visitors), fmt(c.kwh), fmt(c.water), fmt(c.revenue), fmt(c.profit)] })} /></div></>}
  </>
}
/* ============ COC – smart city systems ============ */
const cl = (v, a, b) => Math.max(a, Math.min(b, v))
const LAMPS = [['Main roads & roundabout', 1180, 150], ['Beachfront promenade', 640, 80], ['Lagoon residences', 820, 70], ['Chalets A & B', 760, 70], ['Villas North & South', 540, 70], ['Parking areas', 520, 150], ['Hotel & clubhouse', 360, 100]]
function LightingPanel({ M, addAlert }) {
  const n = useG(), [mode, setMode] = useState('Adaptive'), [faults, setFaults] = useState([0, 1, 0, 2, 0, 1, 0]), hr = new Date().getHours(), night = hr >= 18 || hr < 6
  const dimAt = nt => !nt ? 0 : mode === 'Manual 100%' ? 100 : mode === 'Scheduled' ? 80 : cl(42 + 30 * M.s, 30, 85), dim = cl(dimAt(night) + (mode === 'Adaptive' && night ? 4 * Math.sin(n) : 0), 0, 100)
  const total = LAMPS.reduce((s, z) => s + z[1], 0), fullKw = LAMPS.reduce((s, z) => s + z[1] * z[2], 0) / 1000, bad = faults.reduce((a, b) => a + b, 0)
  const kw = LAMPS.reduce((s, z, i) => s + (z[1] - faults[i]) * z[2] * dim / 100, 0) / 1000
  const hourly = Array.from({ length: 24 }, (_, h) => fullKw * dimAt(h >= 18 || h < 6) / 100), monthly = MONTHS.map((_, i) => { const c = calc(i, M.p); return fullKw * (14 - 3.5 * c.s) * 30 * (mode === 'Manual 100%' ? 1 : mode === 'Scheduled' ? .8 : (42 + 30 * c.s) / 100) })
  return <><div className="grid"><Kpi l="Total smart lamps" v={fmt(total)} /><Kpi l="Lamps ON now" v={night ? fmt(total - bad) : 0} /><Kpi l="Dimming level" v={dim.toFixed(0)} u="%" /><Kpi l="Power draw now" v={kw.toFixed(1)} u="kW" /><Kpi l="Saved vs full power" v={(100 - dimAt(true) * (mode === 'Manual 100%' ? 1 : 1)).toFixed(0)} u="%" /><Kpi l="Faulty lamps" v={bad} /><Kpi l="Control mode" v={mode} /><Kpi l="Night hours (Nov)" v={(14 - 3.5 * M.s).toFixed(1)} u="h" /></div>
    <div className="card" style={{ marginBottom: 14 }}><h3>Live lighting control</h3><div className="sub">{night ? 'Lighting ON – ' + mode + ' mode' : 'Daylight – lamps OFF, switch-on at 18:00 (planned dimming tonight ' + dimAt(true).toFixed(0) + ' %)'}</div><label className="sub">Mode <select value={mode} onChange={e => setMode(e.target.value)}>{['Adaptive', 'Scheduled', 'Manual 100%'].map(x => <option key={x}>{x}</option>)}</select></label> <button className="btn sm pri" onClick={() => { const i = Math.floor(Math.random() * 7); setFaults(faults.map((f, k) => k === i ? f + 3 : f)); addAlert({ sev: 'Warning', fac: LAMPS[i][0], desc: '3 street lamps offline – driver fault', act: 'Dispatch lighting crew' }) }}>Simulate lamp faults</button> <button className="btn sm" onClick={() => setFaults(faults.map(() => 0))}>Repair all</button>
      <div className="gauges"><Gauge v={dim} unit="%" label="Dimming" dec={0} /><Gauge v={kw / fullKw * 100} unit="% of max" label="Power" dec={0} /><Gauge v={night ? 3 + Math.sin(n) : 12000 + 800 * Math.sin(n)} min={0} max={20000} unit="lux" label="Ambient light" dec={0} /><Gauge v={faults.reduce((a, b) => a + b, 0)} min={0} max={30} unit="lamps" label="Faults" dec={0} warn={12} /></div></div>
    <div className="grid g2"><div className="card"><h3>Hourly power profile (kW)</h3><Chart bars labels={hourly.map((_, i) => '' + i)} series={[{ n: 'Power', v: hourly, c: '#C8A96A' }]} /></div><div className="card"><h3>Monthly lighting energy (kWh)</h3><Chart bars labels={MONTHS} series={[{ n: 'kWh', v: monthly, c: '#65B6E5' }]} /></div></div>
    <div className="card" style={{ marginTop: 14 }}><h3>Lighting zones</h3><Table cols={['Zone', 'Lamps', 'ON now', 'Rated W', 'Power kW', 'Faults', 'Status']} rows={LAMPS.map((z, i) => [z[0], z[1], night ? z[1] - faults[i] : 0, z[2], ((z[1] - faults[i]) * z[2] * dim / 100000).toFixed(1), faults[i], <b className={faults[i] > 2 ? 'Warning' : 'Normal'}>{faults[i] > 2 ? 'Attention' : 'Healthy'}</b>])} /></div></>
}
const IRZ = [['Beach promenade', 1.2], ['Lagoon edge N', .8], ['Lagoon edge S', .9], ['Chalets A lawns', 1.5], ['Chalets B lawns', 1.4], ['Villas North', 2.1], ['Villas South', 1.8], ['Hotel gardens', 1.1], ['Clubhouse lawn', .7], ['Main avenue palms', 2.4], ['Roundabout', .3], ['Parking verges', .9], ['Service road hedge', .6], ['Central park', 1.6]]
function IrrigationPanel({ M, addAlert }) {
  const n = useG(), [run, setRun] = useState(IRZ.map((_, i) => i % 4 === 0)), flows = IRZ.map((z, i) => run[i] ? z[1] * 14 * (.7 + .5 * M.s) : 0), moist = IRZ.map((z, i) => cl(28 + (i * 7) % 18 + (run[i] ? 12 : -3 * M.s) + 1.5 * Math.sin(n + i), 12, 60)), tot = flows.reduce((a, b) => a + b, 0), avg = moist.reduce((a, b) => a + b, 0) / 14
  return <><div className="grid"><Kpi l="Zones running" v={run.filter(Boolean).length + ' / 14'} /><Kpi l="Total flow" v={tot.toFixed(1)} u="m³/h" /><Kpi l="Avg soil moisture" v={avg.toFixed(0)} u="%" /><Kpi l="Evapotranspiration" v={(2 + 5.5 * M.s).toFixed(1)} u="mm/day" /><Kpi l="Irrigation water (month)" v={fmt(M.water * .25)} u="m³" /><Kpi l="Saved vs fixed timer" v={(24 + 8 * Math.sin(n / 3)).toFixed(0)} u="%" /><Kpi l="Rain delay" v="Off" /><Kpi l="Leak alerts" v={0} /></div>
    <div className="card" style={{ marginBottom: 14 }}><h3>Irrigation system (live)</h3><button className="btn sm pri" onClick={() => setRun(IRZ.map(() => true))}>Start all</button> <button className="btn sm" onClick={() => setRun(IRZ.map(() => false))}>Stop all</button> <button className="btn sm" onClick={() => addAlert({ sev: 'Warning', fac: 'Villas North', desc: 'Irrigation valve Z06 stuck open – abnormal flow', act: 'Close isolation valve and inspect' })}>Simulate valve fault</button>
      <div className="gauges"><Gauge v={avg} unit="%" label="Soil moisture" dec={0} /><Gauge v={tot} min={0} max={160} unit="m³/h" label="Flow" dec={1} /><Gauge v={4.1 + .1 * Math.sin(n)} min={0} max={8} unit="bar" label="Pressure" /><Gauge v={74 + 3 * Math.sin(n / 2)} unit="%" label="Reservoir" dec={0} /></div></div>
    <div className="grid g2"><div className="card"><h3>Irrigation water by month (m³)</h3><Chart bars labels={MONTHS} series={[{ n: 'Water', v: MONTHS.map((_, i) => calc(i, M.p).water * .25), c: '#65B6E5' }]} /></div><div className="card"><h3>Live flow (m³/h)</h3><LiveChart base={Math.max(5, tot)} unit="m³/h" label="Flow" /></div></div>
    <div className="card" style={{ marginTop: 14 }}><h3>Irrigation zones</h3><Table cols={['Zone', 'Name', 'Area ha', 'Soil moisture', 'Status', 'Flow m³/h', 'Next run', '']} rows={IRZ.map((z, i) => ['Z' + String(i + 1).padStart(2, '0'), z[0], z[1], moist[i].toFixed(0) + ' %', <b className={run[i] ? 'Normal' : ''}>{run[i] ? 'Running' : moist[i] < 25 ? 'Due' : 'Idle'}</b>, flows[i].toFixed(1), run[i] ? '—' : ['05:30', '05:45', '06:00', '22:00'][i % 4], <button className="btn sm" onClick={() => setRun(run.map((x, k) => k === i ? !x : x))}>{run[i] ? 'Stop' : 'Start'}</button>])} /></div></>
}
const LOTS = [['Parking A', 420, 10], ['Parking B', 380, 5], ['Beach lot', 260, 20], ['Hotel parking', 200, 15], ['Clubhouse', 120, -5], ['Visitors & EV hub', 260, 8]]
function ParkingPanel({ M, addAlert }) {
  const n = useG(), occ = LOTS.map((l, i) => cl(M.s * 65 + l[2] + 3 * Math.sin(n + i), 4, 100)), used = LOTS.map((l, i) => Math.round(l[1] * occ[i] / 100)), cap = LOTS.reduce((s, l) => s + l[1], 0), u = used.reduce((a, b) => a + b, 0)
  const arr0 = Math.round(60 + 140 * M.s), [arr, setArr] = useState(arr0), [surge, setSurge] = useState(0), [closed, setClosed] = useState([]), [dep, setDep] = useState(Math.round(arr0 * .92))
  const hourly = Array.from({ length: 24 }, (_, h) => cl(M.s * 65 * ([.2, .15, .1, .1, .15, .25, .4, .55, .7, .85, 1, 1.1, 1.05, 1, .95, .95, 1, 1.05, .95, .8, .6, .45, .35, .25][h]), 0, 100))
  const openCap = LOTS.reduce((s, l, i) => closed.includes(i) ? s : s + l[1], 0), usedOpen = u, free0 = Math.max(0, openCap - usedOpen)
  const run = (f0, a, d, capx) => { let f = f0; return Array.from({ length: 13 }, () => { const v = f; f = cl(f - a + d, 0, capx); return Math.round(v) }) }
  const scen = run(free0, arr * (1 + surge / 100), dep, openCap), base = run(cap - u, arr0, Math.round(arr0 * .92), cap), fullAt = scen.findIndex(v => v <= 0)
  const proj = (i, h) => closed.includes(i) ? 0 : Math.round(cl(LOTS[i][1] - used[i] - (LOTS[i][1] / openCap) * (arr * (1 + surge / 100) - dep) * h, 0, LOTS[i][1]))
  return <><div className="grid"><Kpi l="Total capacity" v={fmt(cap)} /><Kpi l="Occupied" v={fmt(u)} /><Kpi l="Free spaces" v={fmt(cap - u)} onClick={() => document.getElementById('park-free').scrollIntoView({ behavior: 'smooth' })} /><Kpi l="Utilisation" v={(u / cap * 100).toFixed(0)} u="%" /><Kpi l="Average dwell" v={Math.round(40 + occ[0] * .9)} u="min" /><Kpi l="EV bays charging" v={Math.round(u * .04)} u="/ 64" /><Kpi l="Violations today" v={3 + Math.round(M.s * 6)} /><Kpi l="Sensor health" v="99.2" u="%" /></div>
    <div className="card" id="park-free" style={{ marginBottom: 14 }}><h3>Free spaces – details & simulation</h3><div className="sub">Adjust arrivals, departures and lot closures to see how free spaces change over the next 12 hours. Demo simulation – does not change the real sensors.</div>
      <div className="grid g2" style={{ marginTop: 8 }}><div><label className="sub">Arrivals: <b>{arr}</b> vehicles/h<input type="range" min="0" max="400" step="5" value={arr} onChange={e => { setArr(+e.target.value) }} style={{ width: '100%', padding: 0 }} /></label><label className="sub">Departures: <b>{dep}</b> vehicles/h<input type="range" min="0" max="400" step="5" value={dep} onChange={e => setDep(+e.target.value)} style={{ width: '100%', padding: 0 }} /></label><label className="sub">Event surge (beach day / check-in rush): <b>+{surge} %</b><input type="range" min="0" max="150" step="5" value={surge} onChange={e => setSurge(+e.target.value)} style={{ width: '100%', padding: 0 }} /></label>
          <div style={{ marginTop: 6 }}><button className="btn sm" onClick={() => { setArr(arr0); setDep(Math.round(arr0 * .92)); setSurge(0); setClosed([]) }}>Reset simulation</button> <button className="btn sm pri" onClick={() => { setSurge(80); setArr(Math.round(arr0 * 1.3)) }}>Beach-day rush</button> {fullAt >= 0 && <button className="btn sm" onClick={() => addAlert({ sev: 'Warning', fac: 'Parking', desc: 'Parking projected FULL in ' + fullAt + ' h (simulation)', act: 'Open overflow lot and activate guidance signs' })}>Raise parking alert</button>}</div></div>
        <div className="grid" style={{ margin: 0 }}><Kpi l="Free now" v={fmt(free0)} /><Kpi l="Free in +3 h" v={fmt(scen[3])} /><Kpi l="Free in +6 h" v={fmt(scen[6])} /><Kpi l="Projected full" v={fullAt >= 0 ? 'in ' + fullAt + ' h' : 'Not within 12 h'} /></div></div>
      <div style={{ maxWidth: 780 }}><Chart labels={scen.map((_, i) => i === 0 ? 'Now' : '+' + i + 'h')} series={[{ n: 'Simulated scenario', v: scen, c: '#65B6E5' }, { n: 'Baseline', v: base, c: '#C8A96A' }]} /></div>
      <div className="sub" style={{ margin: '6px 0' }}>{fullAt >= 0 ? '⚠ Recommendation: open the overflow lot (Visitors & EV hub) and direct arrivals with the guidance signs before hour ' + Math.max(0, fullAt - 1) + '.' : free0 < cap * .1 ? 'Recommendation: free spaces are low – monitor and prepare overflow parking.' : 'Capacity is sufficient for the simulated demand.'}</div>
      <Table cols={['Lot', 'Capacity', 'Occupied', 'Free now', 'Free +3 h', 'Free +6 h', 'Status', 'Action']} rows={LOTS.map((l, i) => [l[0], l[1], used[i], closed.includes(i) ? 0 : l[1] - used[i], proj(i, 3), proj(i, 6), <b className={closed.includes(i) ? 'Critical' : occ[i] > 90 ? 'Critical' : occ[i] > 75 ? 'Warning' : 'Normal'}>{closed.includes(i) ? 'Closed' : occ[i] > 90 ? 'Full' : occ[i] > 75 ? 'Busy' : 'Available'}</b>, <button className="btn sm" onClick={() => setClosed(closed.includes(i) ? closed.filter(x => x !== i) : [...closed, i])}>{closed.includes(i) ? 'Reopen' : 'Close lot'}</button>])} /></div>
    <div className="card" style={{ marginBottom: 14 }}><h3>Lot occupancy (live)</h3><div className="gauges">{LOTS.map((l, i) => <Gauge key={l[0]} v={occ[i]} unit="%" label={l[0]} dec={0} warn={90} />)}</div></div>
    <div className="grid g2"><div className="card"><h3>Hourly occupancy profile (%)</h3><Chart labels={hourly.map((_, i) => '' + i)} series={[{ n: 'Occupancy', v: hourly, c: '#65B6E5' }]} /></div><div className="card"><h3>Live vehicle entries (per minute)</h3><LiveChart base={Math.max(2, M.visitors / 30 / 12)} unit="/min" label="Entries" /></div></div></>
}
const ROADS = [['Main Entrance Road', 1.0], ['Central Road', .85], ['Roundabout', 1.1], ['Beach Road', .6], ['Hotel Drive', .5], ['Service Road', .35]]
function TrafficPanel({ M, sec }) {
  const n = useG(), vol = ROADS.map((r, i) => Math.round((60 + 280 * M.s) * r[1] * (1 + .06 * Math.sin(n + i)))), spd = vol.map(v => cl(52 - v / 11, 14, 50)), los = v => v < 120 ? 'A' : v < 200 ? 'B' : v < 280 ? 'C' : 'D', tot = vol.reduce((a, b) => a + b, 0)
  const hourly = Array.from({ length: 24 }, (_, h) => tot * [.1, .06, .05, .05, .08, .15, .35, .6, .8, .7, .6, .7, .8, .75, .7, .75, .9, 1, .85, .6, .4, .3, .2, .15][h])
  return <><div className="grid"><Kpi l="Vehicles / hour (all roads)" v={fmt(tot)} /><Kpi l="Average speed" v={(spd.reduce((a, b) => a + b, 0) / spd.length).toFixed(0)} u="km/h" /><Kpi l="Congestion index" v={(tot / 18).toFixed(0)} u="/ 100" /><Kpi l="Vehicles inside resort" v={secKpi(sec, M).vehicles} /><Kpi l="Open traffic incidents" v={0} /><Kpi l="Signal status" v="3 / 3 online" /><Kpi l="Average gate queue" v={(M.s * 3.5).toFixed(1)} u="cars" /><Kpi l="Peak hour" v="17:00–18:00" /></div>
    <div className="grid g2"><div className="card"><h3>Hourly traffic flow (vehicles/h)</h3><Chart bars labels={hourly.map((_, i) => '' + i)} series={[{ n: 'Vehicles', v: hourly, c: '#C8A96A' }]} /></div><div className="card"><h3>Live traffic (vehicles / minute)</h3><LiveChart base={tot / 60} unit="veh/min" label="Flow" /></div></div>
    <div className="grid g2" style={{ marginTop: 14 }}><div className="card"><h3>Road segments</h3><Table cols={['Segment', 'Veh/h', 'Speed km/h', 'Level of service', 'Status']} rows={ROADS.map((r, i) => [r[0], vol[i], spd[i].toFixed(0), los(vol[i]), <b className={los(vol[i]) === 'D' ? 'Warning' : 'Normal'}>{los(vol[i]) === 'D' ? 'Heavy' : los(vol[i]) === 'C' ? 'Moderate' : 'Free flow'}</b>])} /></div>
      <div className="card"><h3>Gate throughput (from Security & Gate Control)</h3><Table cols={['Gate', 'Entries', 'Exits', 'Last 10 min']} rows={GATES.map(g => { const s = gateStats(sec, g.id); return [g.name, s.entries, s.exits, s.traffic] })} /></div></div></>
}
const BINZ = [['Beachfront & promenade', 24], ['Lagoon residences', 28], ['Chalets A & B', 30], ['Villas North & South', 22], ['Hotel & clubhouse', 26], ['Parking & roads', 26]]
function WastePanel({ M, addAlert }) {
  const n = useG(), [fill, setFill] = useState([62, 78, 55, 48, 85, 70]), [trips, setTrips] = useState(0)
  useEffect(() => { if (n) setFill(f => f.map(x => Math.min(100, x + .7 + M.s * .9))) }, [n])
  const full = BINZ.map((z, i) => Math.round(z[1] * cl((fill[i] - 55) / 45, 0, 1))), avg = fill.reduce((a, b) => a + b, 0) / 6, kg = Math.round(M.visitors * .02 + M.occU * .9), rec = 34 + M.s * 4
  return <><div className="grid"><Kpi l="Smart bins" v={156} /><Kpi l="Bins above 80 %" v={full.reduce((a, b) => a + b, 0)} /><Kpi l="Average fill level" v={avg.toFixed(0)} u="%" /><Kpi l="Waste today" v={kg} u="kg" /><Kpi l="Recycling rate" v={rec.toFixed(0)} u="%" /><Kpi l="Landfill diversion" v={(rec + 18).toFixed(0)} u="%" /><Kpi l="Collections today" v={9 + trips} /><Kpi l="Trucks active" v={2} /></div>
    <div className="card" style={{ marginBottom: 14 }}><h3>Bin fill levels (live)</h3><div className="gauges">{BINZ.map((z, i) => <Gauge key={z[0]} v={fill[i]} unit="%" label={z[0]} dec={0} warn={80} />)}</div></div>
    <div className="grid g2"><div className="card"><h3>Waste generation by month (kg/day)</h3><Chart bars labels={MONTHS} series={[{ n: 'Waste', v: MONTHS.map((_, i) => { const c = calc(i, M.p); return c.visitors * .02 + c.occU * .9 }), c: '#A7E3E2' }]} /></div><div className="card"><h3>Live average fill (%)</h3><LiveChart base={avg} unit="%" label="Fill" /></div></div>
    <div className="card" style={{ marginTop: 14 }}><h3>Collection zones</h3><Table cols={['Zone', 'Bins', 'Avg fill', 'Bins >80 %', 'Next pickup', 'Truck', '']} rows={BINZ.map((z, i) => [z[0], z[1], fill[i].toFixed(0) + ' %', full[i], fill[i] > 80 ? 'Now' : ['06:30', '08:00', '14:30', '18:00'][i % 4], 'T-0' + (1 + i % 2), <button className="btn sm" onClick={() => { setFill(fill.map((x, k) => k === i ? 8 : x)); setTrips(trips + 1); if (fill[i] > 90) addAlert({ sev: 'Warning', fac: z[0], desc: 'Overflowing bins collected after delay', act: 'Review route schedule' }) }}>Dispatch truck</button>])} /></div></>
}
const AQS = [['Beach promenade', -4], ['Lagoon', -2], ['Chalet area', 0], ['Hotel', 3], ['Parking A', 9], ['Central road', 12]]
function AirPanel({ M, addAlert }) {
  const n = useG(), [dust, setDust] = useState(0)
  useEffect(() => { if (dust > 0) { const i = setTimeout(() => setDust(d => Math.max(0, d - 8)), 2000); return () => clearTimeout(i) } }, [dust, n])
  const aqi = AQS.map((s, i) => Math.max(8, 34 + 14 * M.s + s[1] + dust + 3 * Math.sin(n + i))), cat = a => a <= 50 ? 'Good' : a <= 100 ? 'Moderate' : 'Unhealthy', col = a => a <= 50 ? 'Normal' : a <= 100 ? 'Warning' : 'Critical', mean = aqi.reduce((a, b) => a + b, 0) / 6
  return <><div className="grid"><Kpi l="City AQI" v={mean.toFixed(0)} /><Kpi l="Category" v={cat(mean)} /><Kpi l="PM2.5" v={(mean * .38).toFixed(1)} u="µg/m³" /><Kpi l="PM10" v={(mean * .72).toFixed(1)} u="µg/m³" /><Kpi l="CO₂" v={Math.round(415 + M.visitors / 60)} u="ppm" /><Kpi l="Noise" v={(48 + 8 * M.s).toFixed(0)} u="dB" /><Kpi l="Wind" v={(14 + 3 * Math.sin(n)).toFixed(0)} u="km/h NW" /><Kpi l="Stations online" v="6 / 6" /></div>
    <div className="card" style={{ marginBottom: 14 }}><h3>Air quality (live)</h3><button className="btn sm pri" onClick={() => { setDust(70); addAlert({ sev: 'Warning', fac: 'Central road', desc: 'Dust event – AQI above 100 at 2 stations', act: 'Activate road sprinklers; advise outdoor activity limits' }) }}>Simulate dust event</button><div className="gauges"><Gauge v={mean} min={0} max={200} unit="AQI" label="City AQI" dec={0} warn={100} /><Gauge v={mean * .38} min={0} max={60} unit="µg/m³" label="PM2.5" dec={1} warn={35} /><Gauge v={415 + M.visitors / 60} min={380} max={1000} unit="ppm" label="CO₂" dec={0} warn={800} /><Gauge v={48 + 8 * M.s} min={30} max={90} unit="dB" label="Noise" dec={0} warn={70} /></div></div>
    <div className="grid g2"><div className="card"><h3>PM2.5 by month (µg/m³)</h3><Chart labels={MONTHS} series={[{ n: 'PM2.5', v: MONTHS.map((_, i) => (34 + 14 * calc(i, M.p).s) * .38), c: '#C8A96A' }]} /></div><div className="card"><h3>Live AQI</h3><LiveChart base={mean} unit="AQI" label="AQI" /></div></div>
    <div className="card" style={{ marginTop: 14 }}><h3>Monitoring stations</h3><Table cols={['Station', 'AQI', 'Category', 'PM2.5', 'PM10', 'NO₂ ppb', 'O₃ ppb', 'Temp °C', 'Humidity %']} rows={AQS.map((s, i) => [s[0], aqi[i].toFixed(0), <b className={col(aqi[i])}>{cat(aqi[i])}</b>, (aqi[i] * .38).toFixed(1), (aqi[i] * .72).toFixed(1), (6 + i * 1.5).toFixed(0), (28 + i).toFixed(0), (20 + M.s * 14 + M.p.temp).toFixed(0), (62 + i).toFixed(0)])} /></div></>
}
function KpiPanel({ M, sec }) {
  const n = useG(), dimSave = 100 - cl(42 + 30 * M.s, 30, 85), K = secKpi(sec, M)
  return <><div className="grid"><Kpi l="Lighting energy saved" v={dimSave.toFixed(0)} u="%" /><Kpi l="Irrigation water saved" v="24" u="%" /><Kpi l="Parking utilisation" v={Math.min(98, M.s * 65).toFixed(0)} u="%" /><Kpi l="Avg traffic speed" v={cl(52 - (60 + 280 * M.s) / 11, 14, 50).toFixed(0)} u="km/h" /><Kpi l="Waste diversion" v={(52 + M.s * 4).toFixed(0)} u="%" /><Kpi l="Air quality index" v={(34 + 14 * M.s).toFixed(0)} /><Kpi l="COC availability" v="99.1" u="%" /><Kpi l="Open security incidents" v={K.open} /></div>
    <div className="grid g2"><div className="card"><h3>City performance (live)</h3><div className="gauges"><Gauge v={86 - M.s * 6 + 2 * Math.sin(n)} unit="score" label="COC score" dec={0} /><Gauge v={dimSave} unit="%" label="Lighting saved" dec={0} /><Gauge v={99.1} min={95} unit="%" label="Availability" dec={1} /></div></div><LiveFeed title="COC insight stream" /></div>
    <div className="card" style={{ marginTop: 14 }}><h3>Insights & recommendations</h3><Table cols={['Insight', 'Recommendation']} rows={[['Predictive maintenance', 'Chiller #2 bearing wear – service within 9 days'], ['Abnormal consumption', 'Villa V3 night flow; check leak'], ['Occupancy forecast', 'Peak in Aug: ' + calc(7, { ...BASE }).occU + ' units'], ['Energy optimization', 'Pre-cool 06:00–09:00 saves ~' + fmt(M.kwh * .03) + ' kWh'], ['Street lighting', 'Adaptive dimming saves ' + dimSave.toFixed(0) + ' % lighting energy']]} /></div></>
}
function Summit({ M, addAlert, sec }) {
  const [t, setT] = useState('Street Lighting'), tick = useG()
  return <><div className="sub">COC – city operations center. Summit Technology is shown as a <b>proposed</b> integration layer – not a verified supplier or confirmed deployment.</div>
    <Tabs items={['Street Lighting', 'Smart Irrigation', 'Smart Parking', 'Traffic', 'Waste Collection', 'Air Quality', 'BMS', 'Tech Infrastructure', 'KPI']} v={t} set={setT} />
    {t === 'Street Lighting' && <LightingPanel M={M} addAlert={addAlert} />}
    {t === 'Smart Irrigation' && <IrrigationPanel M={M} addAlert={addAlert} />}
    {t === 'Smart Parking' && <ParkingPanel M={M} addAlert={addAlert} />}
    {t === 'Traffic' && <TrafficPanel M={M} sec={sec} />}
    {t === 'Waste Collection' && <WastePanel M={M} addAlert={addAlert} />}
    {t === 'Air Quality' && <AirPanel M={M} addAlert={addAlert} />}
    {t === 'BMS' && <div className="card"><h3>Building management (BMS)</h3><div className="gauges"><Gauge v={24 + .4 * Math.sin(tick)} min={16} max={32} unit="°C" label="Setpoint" dec={1} /><Gauge v={Math.min(99, 35 + M.s * 45)} unit="%" label="Cooling load" dec={0} /><Gauge v={M.effOcc * 100} unit="%" label="Occupancy" dec={0} /></div><Table cols={['Subsystem', 'Status', 'Value']} rows={[['HVAC automation', 'Auto', fmt(M.hvacK) + ' kWh/mo'], ['Lighting control', 'Scheduled', '82 % dimmed at night'], ['Building occupancy', 'Live', M.occU + ' units'], ['Chillers', '3/4 running', 'Setpoint 24 °C']]} /></div>}
    {t === 'Tech Infrastructure' && <div className="card"><h3>Live infrastructure</h3><div className="gauges"><Gauge v={34 + 8 * Math.sin(tick)} unit="%" label="Server CPU" dec={0} /><Gauge v={52 + 3 * Math.sin(tick * 1.2)} unit="%" label="Memory" dec={0} /><Gauge v={18 + 6 * Math.sin(tick * .8)} unit="%" label="Network util." dec={0} /><Gauge v={99.3} min={95} unit="%" label="IoT uptime" dec={1} /></div><LiveChart base={12} unit="ms" label="Latency" /><Table cols={['Item', 'Status']} rows={[['Core network', 'Healthy – 18 % util'], ['Servers', 'CPU 34 % / Mem 52 %'], ['IoT connectivity', '99.3 % uptime'], ['Cybersecurity', '0 critical threats'], ['Access permissions', '42 roles reviewed']]} /></div>}
    {t === 'KPI' && <KpiPanel M={M} sec={sec} />}
  </>
}

function QRPanel({ M, qrs, setQrs, scanLog }) {
  const TYPES = ['Resident','Guest','Vehicle','Beach Access','Clubhouse','Hotel Guest','Delivery','Maintenance Service','Temporary Staff']
  const [log, setLog] = useState([]), [type, setType] = useState(TYPES[1]), [u, setU] = useState('A-101')
  const [auto, setAuto] = useState(false)
  useEffect(() => { if (!auto) return; const i = setInterval(() => { const q = qrs[Math.floor(Math.random() * qrs.length)]; setLog(l => [{ t: new Date().toLocaleTimeString(), id: q.id, type: q.type, res: q.state === 'Active' ? 'Approved' : 'Rejected – ' + q.state }, ...l].slice(0, 40)); scanLog && scanLog(q) }, 1500); return () => clearInterval(i) }, [auto, qrs])
  const gen = () => setQrs([{ id:'QR-' + (1000 + qrs.length), type, holder:'Demo ' + type, unit:'', from:'2026-11-06', state:'Active', exp:'2026-12-31' }, ...qrs])
  const scan = q => { const ok = q.state === 'Active'; setLog([{ t: new Date().toLocaleTimeString(), id:q.id, type:q.type, res: ok ? 'Approved' : 'Rejected – ' + q.state }, ...log]); scanLog && scanLog(q) }
  const revoke = id => setQrs(qrs.map(q => q.id === id ? { ...q, state:'Revoked' } : q))
  const n = +u.replace(/\D/g, '') || 101
  return <><div className="grid g2">
    <div className="card"><h3>QR management</h3><select value={type} onChange={e => setType(e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select> <button className="btn pri sm" onClick={gen}>Generate QR</button> <button className={'btn sm' + (auto ? ' pri' : '')} onClick={() => setAuto(!auto)}>{auto ? '⏸ Stop auto-scan' : '▶ Auto-scan'}</button>
      <Table cols={['ID','Type','State','Expires','']} rows={qrs.map(q => [q.id, q.type, <b className={q.state === 'Active' ? 'Normal' : 'Critical'}>{q.state}</b>, q.exp, <><button className="btn sm" onClick={() => scan(q)}>Scan</button> <button className="btn sm" onClick={() => revoke(q.id)}>Revoke</button></>])} /></div>
    <div className="card"><h3>Access log (scan simulation)</h3>{log.length ? <Table cols={['Time','QR','Type','Result']} rows={log.map(l => [l.t, l.id, l.type, <b className={l.res === 'Approved' ? 'Normal' : 'Critical'}>{l.res}</b>])} /> : <div className="sub">Press “Scan” on a QR code.</div>}
      <div className="grid"><Kpi l="Current visitors" v={fmt(M.visitors / 30 * 4)} /><Kpi l="Beach occupancy" v={Math.min(99, Math.round(M.s * 70)) + ' %'} /><Kpi l="Parking" v={Math.min(98, Math.round(M.s * 65)) + ' %'} /><Kpi l="Peak hours" v="11:00–14:00" /></div></div></div>
    </>
}
function Inventory({ M, units, setUnits }) {
  const [f, setF] = useState({ zone: 'All', building: 'All', own: 'All', hand: 'All', occ: 'All', q: '' }), [sel, setSel] = useState(null), [draft, setDraft] = useState(null), [pg, setPg] = useState(0)
  const set = (k, v) => { setF({ ...f, [k]: v, ...(k === 'zone' ? { building: 'All' } : {}) }); setPg(0) }
  const st = uStats(units), fac = 0.3 + 0.7 * M.s / 1.3
  const rows = units.filter(u => (f.zone === 'All' || u.zone === f.zone) && (f.building === 'All' || u.building === f.building) && (f.own === 'All' || u.ownership === f.own) && (f.hand === 'All' || u.handover === f.hand) && (f.occ === 'All' || u.occupancy === f.occ) && (!f.q || (u.id + u.owner + u.tenant).toLowerCase().includes(f.q.toLowerCase())))
  const bl = BLD.filter(b => !b.sp && (f.zone === 'All' || b.zone === f.zone))
  const byZone = ZN.map(z => ({ z, ...uStats(units.filter(u => u.zone === z)) }))
  const byBld = bl.map(b => ({ b, ...uStats(units.filter(u => u.building === b.id)) }))
  const types = [...new Set(units.map(u => u.type))].map(t => ({ t, ...uStats(units.filter(u => u.type === t)) }))
  const u = units.find(x => x.id === sel), L = ['All']
  const save = () => { setUnits(units.map(x => x.id === draft.id ? normU(draft) : x)); setDraft(null) }
  const add = () => { const b = bl[0], n = units.filter(x => x.building === b.id).length + 1, ty = ZT[b.zone][0]; const nu = normU({ id: b.id + '-' + String(n).padStart(3, '0'), building: b.id, zone: b.zone, type: ty[0], area: ty[1], handover: 'Not handed over', handDate: '2027-06-01', ownership: '—', owner: 'New owner (demo)', ownerId: 100000 + Date.now() % 100000, tenant: '', residents: 0, vehicles: 0, guestQR: 0, kwh: Math.round(ty[1] * 1.6), water: +(ty[1] * .12).toFixed(1), openReq: 0, maint: 0, fee: ty[1] * 14 }); setUnits([nu, ...units]); setSel(nu.id); setPg(0) }
  const I = (k, type) => <input type={type || 'text'} style={{ width: '100%' }} value={draft[k]} onChange={e => setDraft({ ...draft, [k]: type === 'number' ? +e.target.value : e.target.value })} />
  const Sel = (k, opts) => <select value={draft[k]} onChange={e => setDraft({ ...draft, [k]: e.target.value })}>{opts.map(o => <option key={o}>{o}</option>)}</select>
  const Fs = (l, k, opts) => <label className="sub" style={{ marginRight: 8 }}>{l} <select value={f[k]} onChange={e => set(k, e.target.value)}>{[...L, ...opts].map(o => <option key={o}>{o}</option>)}</select></label>
  return <>
    <div className="grid">
      <Kpi l="Total units (chalets & residences)" v={st.total} /><Kpi l="Owner-occupied" v={st.oo} /><Kpi l="Rented" v={st.rented} /><Kpi l="Vacant" v={st.vacant} />
      <Kpi l="Not yet handed over" v={st.notH} /><Kpi l="Under handover" v={st.under} /><Kpi l="Total owners" v={st.owners} /><Kpi l="Active tenants" v={st.tenants} /></div>
    <div className="grid g2">
      <div className="card"><h3>Ownership distribution by zone</h3><Chart bars labels={ZS} series={[{ n: 'Owner-occupied', v: byZone.map(z => z.oo), c: '#65B6E5' }, { n: 'Rented', v: byZone.map(z => z.rented), c: '#A7E3E2' }, { n: 'Vacant', v: byZone.map(z => z.vacant), c: '#C8A96A' }]} /></div>
      <div className="card"><h3>Handover progress by zone</h3><Chart bars labels={ZS} series={[{ n: 'Handed over', v: byZone.map(z => z.handed), c: '#2aa198' }, { n: 'Under handover', v: byZone.map(z => z.under), c: '#91C9ED' }, { n: 'Not handed over', v: byZone.map(z => z.notH), c: '#C8A96A' }]} /></div>
      <div className="card"><h3>Rental & vacant inventory</h3><Chart labels={ZS} series={[{ n: 'Rented', v: byZone.map(z => z.rented), c: '#65B6E5' }, { n: 'Vacant', v: byZone.map(z => z.vacant), c: '#e5675f' }]} /></div>
      <div className="card"><h3>Breakdown by zone & unit type</h3><Table cols={['Zone', 'Units', 'Handed', 'Owner-occ.', 'Rented', 'Vacant']} rows={byZone.map(z => [z.z, z.total, z.handed, z.oo, z.rented, z.vacant])} /><div style={{ height: 10 }} /><Table cols={['Type', 'Units', 'Owner-occ.', 'Rented', 'Vacant']} rows={types.map(t => [t.t, t.total, t.oo, t.rented, t.vacant])} /></div></div>
    <div className="card" style={{ marginTop: 14 }}><h3>Unit register</h3>
      <div style={{ marginBottom: 10 }}><input placeholder="Search unit, owner, tenant…" value={f.q} onChange={e => set('q', e.target.value)} style={{ marginRight: 8 }} />{Fs('Zone', 'zone', ZN)}
        <label className="sub" style={{ marginRight: 8 }}>Building <select value={f.building} onChange={e => set('building', e.target.value)}>{['All', ...bl.map(b => b.id)].map(o => <option key={o}>{o}</option>)}</select></label>
        {Fs('Ownership', 'own', ['Owner-occupied', 'Rented', 'Vacant', '—'])}{Fs('Handover', 'hand', ['Handed over', 'Under handover', 'Not handed over'])}{Fs('Occupancy', 'occ', ['Occupied', 'Vacant', 'Not occupied'])}
        <button className="btn pri sm" onClick={add}>+ Add unit</button> <button className="btn sm" onClick={() => { setUnits(UNITS0); setSel(null) }}>Reset demo data</button></div>
      <div className="sub">{rows.length} units match · {byBld.length} buildings in view</div>
      <Table cols={['Unit', 'Building', 'Type', 'Ownership', 'Handover', 'Occupancy', 'Owner', 'Open req.']} rows={rows.slice(pg * 12, pg * 12 + 12).map(x => [<a style={{ cursor: 'pointer', color: 'var(--a)', fontWeight: 600 }} onClick={() => { setSel(x.id); setDraft(null) }}>{x.id}</a>, x.building, x.type, x.ownership, x.handover, x.occupancy, x.owner, x.openReq])} />
      <div style={{ marginTop: 8 }}><button className="btn sm" disabled={pg === 0} onClick={() => setPg(pg - 1)}>◀ Prev</button> <span className="sub"> page {pg + 1} / {Math.max(1, Math.ceil(rows.length / 12))} </span><button className="btn sm" disabled={(pg + 1) * 12 >= rows.length} onClick={() => setPg(pg + 1)}>Next ▶</button></div></div>
    {u && <div className="card" style={{ marginTop: 14 }}><h3>Unit profile – {u.id}</h3><div className="grid g2"><Pic k={(galOf(u.building) || [ZIMG[u.zone]])[0]} h={230} />
      <div><Table cols={['Field', 'Value']} rows={[['Location', u.zone + ' · building ' + u.building], ['Type & area', u.type + ' · ' + u.area + ' m²'],
        ['Handover status', draft ? Sel('handover', ['Handed over', 'Under handover', 'Not handed over']) : u.handover], ['Handover date', draft ? I('handDate', 'date') : u.handDate],
        ['Ownership', draft ? Sel('ownership', ['Owner-occupied', 'Rented', 'Vacant']) : u.ownership], ['Owner', draft ? I('owner') : u.owner], ['Tenant', draft ? I('tenant') : (u.tenant || '—')], ['Occupancy', u.occupancy],
        ['Registered residents', draft ? I('residents', 'number') : u.residents], ['Registered vehicles', draft ? I('vehicles', 'number') : u.vehicles], ['Guest permissions / QR', draft ? I('guestQR', 'number') : u.guestQR + ' active QR'],
        ['Electricity (month)', fmt(useOf(u, fac, 'kwh')) + ' kWh'], ['Water (month)', fmt(useOf(u, fac, 'water')) + ' m³'], ['Open requests', draft ? I('openReq', 'number') : u.openReq], ['Maintenance history', u.maint + ' records'], ['Service & maintenance fees', fmt(u.fee) + ' EGP / mo']]} />
        <div style={{ marginTop: 8 }}>{draft ? <><button className="btn pri sm" onClick={save}>Save</button> <button className="btn sm" onClick={() => setDraft(null)}>Cancel</button></> : <button className="btn sm" onClick={() => setDraft({ ...u })}>Edit unit</button>} <button className="btn sm" onClick={() => { setSel(null); setDraft(null) }}>Close</button></div></div></div></div>}
  </>
}
function Resident({ M, units, setUnits, sec, SA }) {
  const [t, setT] = useState('Unit Inventory')
  return <><Tabs items={['Unit Inventory', 'QR Access', 'Guest Access', 'Visitor Analytics']} v={t} set={setT} />{t === 'QR Access' ? <QRPanel M={M} qrs={sec.qrs} setQrs={SA.setQrs} scanLog={q => SA.scan(q.id, GATES[Math.floor(Math.random() * 7)].id, Math.random() < .7 ? 'Entry' : 'Exit', '', true)} /> : t === 'Guest Access' ? <GuestAccess S={sec} A={SA} units={units} asOwner showCam={false} /> : t === 'Visitor Analytics' ? <VisitorPanel M={M} /> : <Inventory M={M} units={units} setUnits={setUnits} />}</>
}
function useTick(ms) { const [t, setT] = useState(0); useEffect(() => { const i = setInterval(() => setT(x => x + 1), ms); return () => clearInterval(i) }, []); return t }
function LiveChart({ base, unit, label, color }) {
  const [pts, setPts] = useState(() => Array.from({ length: 20 }, (_, i) => base * (1 + .08 * Math.sin(i / 2)))), t = useTick(1500)
  useEffect(() => { if (t) setPts(p => [...p.slice(1), base * (1 + .09 * Math.sin(t / 2.2) + (Math.random() - .5) * .06)]) }, [t])
  return <div><Chart labels={pts.map((_, i) => '-' + (19 - i))} series={[{ n: label, v: pts, c: color || '#65B6E5' }]} /><div className="sub"><b className="Normal">● LIVE</b> {fmt(pts[pts.length - 1])} {unit} · new reading every 1.5 s</div></div>
}
function VisitorPanel({ M }) {
  const day = M.visitors / 30, prof = [.2, .1, .1, .3, .9, 1.4, 1.3, 1, 1.5, 1.1, .6, .3]
  return <><div className="grid"><Kpi l="Visitors this month" v={fmt(M.visitors)} /><Kpi l="Inside resort now" v={fmt(day * 4)} /><Kpi l="Daily entries" v={fmt(day)} /><Kpi l="Daily exits" v={fmt(day * .96)} /><Kpi l="Beach occupancy" v={Math.min(99, Math.round(M.s * 70)) + ' %'} /><Kpi l="Clubhouse occupancy" v={Math.min(99, Math.round(M.s * 55)) + ' %'} /><Kpi l="Parking occupancy" v={Math.min(98, Math.round(M.s * 65)) + ' %'} /><Kpi l="Peak access hours" v="11:00–14:00" /></div>
    <div className="grid g2"><div className="card"><h3>Live entries per minute</h3><LiveChart base={day / 12} unit="/min" label="Entries" /><div className="gauges"><Gauge v={Math.min(99, M.s * 70)} unit="%" label="Beach" dec={0} /><Gauge v={Math.min(99, M.s * 55)} unit="%" label="Clubhouse" dec={0} /><Gauge v={Math.min(98, M.s * 65)} unit="%" label="Parking" dec={0} /></div></div><div className="card"><h3>Entries by hour (2-hour blocks)</h3><Chart bars labels={['0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22']} series={[{ n: 'Entries', v: prof.map(x => day * x / 6), c: '#65B6E5' }]} /></div>
      <div className="card"><h3>Guest traffic by zone</h3><Chart bars labels={FAC.map(f => f.type.slice(0, 6))} series={[{ n: 'Visits', v: FAC.map(f => M.visitors * f.share), c: '#A7E3E2' }]} /></div>
      <div className="card"><h3>QR usage statistics</h3><Table cols={['QR type', 'Scans / month', 'Approved %']} rows={[['Resident', M.occU * 38, 99], ['Guest', M.visitors * .55, 96], ['Vehicle', M.visitors * .2, 97], ['Beach access', M.visitors * .35, 98], ['Hotel guest', M.visitors * .15, 99], ['Delivery', 1800 + M.s * 900, 93], ['Maintenance', 620, 95]].map(r => [r[0], fmt(r[1]), r[2] - M.s])} /></div></div></>
}
const RTYPES = ['Daily', 'Weekly', 'Monthly', 'Annual', 'Energy', 'Water', 'Financial', 'Seasonal', 'QR access', 'Maintenance', 'Facility performance', 'Sustainability']
function Reports({ p }) {
  const [type, setType] = useState('Monthly'), [from, setFrom] = useState(0), [to, setTo] = useState(11), [fac, setFacF] = useState('All'), [gen, setGen] = useState(new Date().toLocaleString())
  const sh = fac === 'All' ? 1 : FAC.find(x => x.id === fac).share
  const defs = {
    Energy: [['kWh', c => c.kwh * sh], ['Solar kWh', c => c.solarK * sh], ['HVAC kWh', c => c.hvacK * sh], ['Cost EGP', c => c.elec * sh]],
    Water: [['m³', c => c.water * sh], ['Cost EGP', c => c.wC * sh], ['m³ per unit', c => c.water / c.occU, 1]],
    Financial: [['Revenue', c => c.revenue * sh], ['Opex', c => c.opex * sh], ['Profit', c => c.profit * sh], ['Margin %', c => c.margin, 1]],
    Seasonal: [['Occupied units', c => c.occU], ['Visitors', c => c.visitors], ['Occupancy %', c => c.effOcc * 100, 1], ['Season index', c => c.s, 1]],
    'QR access': [['Visitors', c => c.visitors], ['Active QR', c => c.occU * 2.6 + c.visitors / 10], ['Rejected %', c => 2 + c.s * 1.5, 1]],
    Maintenance: [['Maintenance cost', c => c.maint * sh], ['Work orders', c => Math.round(20 + c.occU / 12)], ['Completion %', c => 94 - c.s * 4, 1]],
    'Facility performance': [['kWh', c => c.kwh * sh], ['Revenue', c => c.revenue * sh], ['Availability %', c => 99 - c.s * 1.2, 1]],
    Sustainability: [['Solar kWh', c => c.solarK * sh], ['Renewable %', c => c.solarK / c.kwh * 100, 1], ['CO₂ avoided t', c => c.solarK * sh * .45 / 1000]]
  }
  const key = defs[type] ? type : ({ Daily: 'Energy', Weekly: 'Financial', Monthly: 'Financial', Annual: 'Financial' })[type], cols = defs[key], dv = type === 'Daily' ? 30 : type === 'Weekly' ? 4.35 : 1
  const ms = []; for (let i = Math.min(from, to); i <= Math.max(from, to); i++) ms.push(type === 'Annual' ? i : i)
  const data = (type === 'Annual' ? MONTHS.map((_, i) => i) : ms).map(i => { const c = calc(i, p); return [MONTHS[i], ...cols.map(([, f, r]) => r ? f(c) : f(c) / dv)] })
  const tot = ['Total / avg', ...cols.map((c, j) => { const v = data.map(r => r[j + 1]); return c[2] ? v.reduce((a, b) => a + b, 0) / v.length : v.reduce((a, b) => a + b, 0) })]
  const fmtR = r => r.map((x, i) => i === 0 ? x : fmt(x))
  const dl = () => { const csv = [['Period', ...cols.map(c => c[0])], ...data, tot].map(r => r.map((x, i) => i === 0 ? x : Math.round(x * 100) / 100).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `silver-sands-${type.toLowerCase().replace(/ /g, '-')}-report.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }
  return <div className="card"><h3>Reports & analytics</h3><div className="sub">Demo data only – generated {gen}</div>
    <div style={{ margin: '10px 0' }}><label className="sub">Report <select value={type} onChange={e => setType(e.target.value)}>{RTYPES.map(r => <option key={r}>{r}</option>)}</select></label>{' '}
      <label className="sub">From <select value={from} onChange={e => setFrom(+e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></label>{' '}
      <label className="sub">To <select value={to} onChange={e => setTo(+e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></label>{' '}
      <label className="sub">Facility <select value={fac} onChange={e => setFacF(e.target.value)}><option value="All">All facilities</option>{FAC.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>{' '}
      <button className="btn sm" onClick={() => setGen(new Date().toLocaleString())}>Regenerate</button> <button className="btn pri sm" onClick={dl}>⬇ Download CSV</button></div>
    <Chart labels={data.map(r => r[0])} bars={data.length < 8} series={cols.filter(c => !c[2]).slice(0, 2).map((c, k) => ({ n: c[0], v: data.map(r => r[cols.indexOf(c) + 1]), c: ['#65B6E5', '#A7E3E2'][k] }))} />
    <Table cols={['Period', ...cols.map(c => c[0])]} rows={[...data.map(fmtR), fmtR(tot).map((x, i) => i ? <b>{x}</b> : <b>{x}</b>)]} /></div>
}
function Ops({ M, setFac, fac, addAlert }) {
  const [t, setT] = useState('Facilities'), tk = useTick(3000)
  const [wo, setWo] = useState([{ id: 'WO-1', t: 'Chiller #2 service', tech: 'Karim', type: 'Predictive', s: 'Open', cost: 14000 }, { id: 'WO-2', t: 'Pool pump seal', tech: 'Sara', type: 'Corrective', s: 'In progress', cost: 6200 }, { id: 'WO-3', t: 'Lift inspection', tech: 'Omar', type: 'Preventive', s: 'Done', cost: 3500 }, { id: 'WO-4', t: 'Generator load test', tech: 'Hana', type: 'Preventive', s: 'Done', cost: 4800 }, { id: 'WO-5', t: 'Irrigation valve V3', tech: 'Omar', type: 'Corrective', s: 'Open', cost: 2100 }])
  const [inc, setInc] = useState([{ id: 'INC-1', t: 'Unauthorized gate attempt', f: 'Gate 2', s: 'Open' }, { id: 'INC-2', t: 'Minor pool incident', f: 'Pool Complex', s: 'Resolved' }])
  const [infra, setInfra] = useState(['Electrical distribution', 'Water pumps', 'Water treatment', 'HVAC chillers', 'Generators', 'Elevators', 'Street & facility lighting', 'Fire detection', 'Security systems', 'Network infrastructure'].map(n => ({ n, ok: true })))
  const f = FAC.find(x => x.id === fac) || FAC[0], next = { Open: 'In progress', 'In progress': 'Done', Done: 'Done' }, stc = x => x.st === 'ok' ? 'Normal' : x.st === 'w' ? 'Warning' : 'Critical'
  const done = wo.filter(w => w.s === 'Done').length
  const DEPTS = [['Maintenance', 24], ['Security', 38], ['Housekeeping', 52], ['Landscaping', 30], ['Pool & lagoon', 16], ['Front office', 14], ['Technology', 10]]
  return <><Tabs items={['Facilities', 'Infrastructure', 'Maintenance', 'Security & Emergency', 'Workforce', 'Environment & Waste']} v={t} set={setT} />
    {t === 'Facilities' && <><div className="grid">{FAC.map(x => <div key={x.id} className="card" style={{ cursor: 'pointer', outline: x.id === fac ? '2px solid var(--a)' : 'none' }} onClick={() => setFac(x.id)}><Pic k={x.img} h={90} /><b>{x.name}</b> <span className={'tag ' + stc(x)}>{stc(x)}</span></div>)}</div>
      <div className="card"><h3>{f.name} – details</h3><div className="grid g2"><Pic k={f.img} h={230} /><Table cols={['Metric', 'Value']} rows={[['Type', f.type], ['Capacity', f.cap], ['Current occupancy', Math.round(f.cap * M.s * .7)], ['Energy', fmt(M.kwh * f.share) + ' kWh/mo'], ['Energy cost', fmt(M.elec * f.share) + ' EGP'], ['Last maintenance', '12 days ago'], ['Alerts', f.st === 'ok' ? 0 : 1], ['Water quality', 'pH 7.4 · Cl 1.2 ppm']]} /></div></div></>}
    {t === 'Infrastructure' && <div className="card"><h3>Infrastructure monitoring (live)</h3><div className="gauges">{infra.slice(0, 4).map((x, i) => <Gauge key={x.n} v={x.ok ? 38 + M.s * 45 + 6 * Math.sin(tk + i) : 0} unit="%" label={x.n} warn={85} dec={0} />)}</div><Table cols={['System', 'Load', 'Status', '']} rows={infra.map((x, i) => [x.n, (x.ok ? Math.round(38 + M.s * 45 + 6 * Math.sin(tk + i)) : 0) + ' %', <b className={x.ok ? 'Normal' : 'Critical'}>{x.ok ? 'Online' : 'FAULT'}</b>, <button className="btn sm" onClick={() => { setInfra(infra.map((y, j) => j === i ? { ...y, ok: !y.ok } : y)); if (x.ok) addAlert({ sev: 'Critical', fac: x.n, desc: x.n + ' fault simulated', act: 'Dispatch technician' }) }}>{x.ok ? 'Simulate fault' : 'Restore'}</button>])} /></div>}
    {t === 'Maintenance' && <><div className="grid"><Kpi l="Work orders" v={wo.length} /><Kpi l="Completion rate" v={(done / wo.length * 100).toFixed(0)} u="%" /><Kpi l="Pending" v={wo.length - done} /><Kpi l="Maintenance cost" v={fmt(M.maint)} u="EGP/mo" /></div>
      <div className="card"><h3>Work orders</h3><button className="btn sm pri" onClick={() => { setWo([{ id: 'WO-' + (wo.length + 1), t: 'Simulated maintenance event', tech: ['Karim', 'Sara', 'Omar', 'Hana'][wo.length % 4], type: 'Corrective', s: 'Open', cost: 2500 }, ...wo]); addAlert({ sev: 'Warning', fac: f.name, desc: 'Maintenance event created', act: 'Assign technician' }) }}>Simulate maintenance event</button>
        <Table cols={['ID', 'Task', 'Technician', 'Type', 'Status', 'Cost', '']} rows={wo.map(w => [w.id, w.t, w.tech, w.type, <b className={w.s === 'Done' ? 'Normal' : w.s === 'Open' ? 'Warning' : ''}>{w.s}</b>, fmt(w.cost), <button className="btn sm" onClick={() => setWo(wo.map(x => x.id === w.id ? { ...x, s: next[x.s] } : x))}>Advance</button>])} /></div>
      <div className="card" style={{ marginTop: 14 }}><h3>Spare parts</h3><Table cols={['Part', 'In stock', 'Reorder level', 'Status']} rows={[['Pump seal kit', 6, 4], ['HVAC filter', 18, 20], ['LED street lamp', 40, 25], ['Contactor 63A', 3, 5]].map(r => [r[0], r[1], r[2], <b className={r[1] > r[2] ? 'Normal' : 'Warning'}>{r[1] > r[2] ? 'OK' : 'Reorder'}</b>])} /></div></>}
    {t === 'Security & Emergency' && <><div className="grid"><Kpi l="CCTV online" v="212 / 214" /><Kpi l="Active patrols" v={Math.round(4 + M.s * 4)} /><Kpi l="Fire alarms" v="All normal" /><Kpi l="Access gates" v="7 / 7 online" /></div>
      <div className="card"><h3>Incident management</h3><button className="btn pri sm" onClick={() => { setInc([{ id: 'INC-' + (inc.length + 1), t: 'Simulated security incident', f: 'Gate 1', s: 'Open' }, ...inc]); addAlert({ sev: 'Critical', fac: 'Gate 1', desc: 'Unauthorized access attempt', act: 'Dispatch security patrol' }) }}>Simulate incident</button> <button className="btn sm" onClick={() => addAlert({ sev: 'Warning', fac: 'Resort-wide', desc: 'Emergency notification sent to all residents', act: 'Monitor response' })}>Send emergency notification</button>
        <Table cols={['ID', 'Incident', 'Location', 'Status', '']} rows={inc.map(x => [x.id, x.t, x.f, <b className={x.s === 'Resolved' ? 'Normal' : 'Critical'}>{x.s}</b>, x.s !== 'Resolved' && <button className="btn sm" onClick={() => setInc(inc.map(y => y.id === x.id ? { ...y, s: 'Resolved' } : y))}>Resolve</button>])} /></div></>}
    {t === 'Security & Emergency' && <LiveFeed title="Security & access event stream" />}
    {t === 'Workforce' && <div className="grid g2"><div className="card"><h3>Staff allocation</h3><Chart bars labels={DEPTS.map(d => d[0].slice(0, 6))} series={[{ n: 'Staff on roster', v: DEPTS.map(d => Math.round(d[1] * (.6 + M.s * .5))), c: '#65B6E5' }]} /></div>
      <div className="card"><h3>Department performance</h3><Table cols={['Department', 'Staff', 'Productivity', 'Tasks done']} rows={DEPTS.map((d, i) => [d[0], Math.round(d[1] * (.6 + M.s * .5)), (88 + (i * 3) % 9 - M.s * 2).toFixed(0) + ' %', Math.round(d[1] * 14 * (.6 + M.s * .5))])} /></div>
      <div className="card"><h3>Shift schedule</h3><Table cols={['Shift', 'Hours', 'Staff']} rows={[['Morning', '06:00–14:00', Math.round(90 * (.6 + M.s * .5))], ['Evening', '14:00–22:00', Math.round(80 * (.6 + M.s * .5))], ['Night', '22:00–06:00', Math.round(40 * (.6 + M.s * .5))]]} /></div></div>}
    {t === 'Environment & Waste' && <><div className="grid"><Kpi l="Waste / day" v={Math.round(M.visitors * .02 + M.occU * .9)} u="kg" /><Kpi l="Recycling" v={(34 + M.s * 4).toFixed(0)} u="%" /><Kpi l="Beach cleanliness" v="Good" /><Kpi l="Water quality pH" v={(7.3 + Math.sin(tk) * .05).toFixed(2)} /><Kpi l="Air temp" v={(20 + M.s * 14 + M.p.temp).toFixed(0)} u="°C" /><Kpi l="Humidity" v={(62 + Math.sin(tk / 2) * 3).toFixed(0)} u="%" /><Kpi l="Wind" v={(14 + Math.sin(tk) * 3).toFixed(0)} u="km/h" /></div>
      <div className="card"><h3>Waste generation by month (kg/day)</h3><Chart bars labels={MONTHS} series={[{ n: 'Waste', v: MONTHS.map((_, i) => { const c = calc(i, M.p); return c.visitors * .02 + c.occU * .9 }), c: '#A7E3E2' }]} /></div></>}
  </>
}
function Business({ M, B, p }) {
  const [t, setT] = useState('KPIs')
  const rows = [['Residential fees', M.occU * 1800, B.occU * 1800], ['Hospitality & retail', M.visitors * 3600, B.visitors * 3600], ['Other services', M.revenue - M.occU * 1800 - M.visitors * 3600, B.revenue - B.occU * 1800 - B.visitors * 3600]]
  const ex = [['Electricity', M.elec, B.elec], ['Water', M.wC, B.wC], ['Gas', M.gC, B.gC], ['Staff', M.staff, B.staff], ['Maintenance', M.maint, B.maint], ['Other', M.other, B.other]]
  return <><div className="sub"><b>All financial figures are configurable DEMO data</b>, not actual ORA information.</div><Tabs items={['KPIs','Revenue & Expenses','Reports & Analytics','Simulation Lab','Baseline vs Simulated']} v={t} set={setT} />
    {t === 'KPIs' && <><div className="grid"><Kpi l="Revenue" v={fmt(M.revenue)} d={(M.revenue / B.revenue - 1) * 100} /><Kpi l="Opex" v={fmt(M.opex)} d={(M.opex / B.opex - 1) * 100} /><Kpi l="Net operating income" v={fmt(M.profit)} d={(M.profit / B.profit - 1) * 100} /><Kpi l="Margin" v={M.margin.toFixed(1)} u="%" /><Kpi l="Energy cost %" v={(M.elec / M.opex * 100).toFixed(1)} u="%" /><Kpi l="Revenue / occupied unit" v={fmt(M.revenue / M.occU)} /><Kpi l="Cost / occupied unit" v={fmt(M.opex / M.occU)} /><Kpi l="Revenue / visitor" v={fmt(M.revenue / M.visitors)} /></div>
      <div className="card" style={{ marginBottom: 14 }}><h3>Live financial run-rate</h3><div className="gauges"><Gauge v={Math.max(0, M.margin)} min={0} max={60} unit="%" label="Profit margin" dec={1} /><Gauge v={M.elec / M.opex * 100} min={0} max={50} unit="%" label="Energy % of opex" dec={1} warn={35} /></div><LiveChart base={M.revenue / 720} unit="EGP/h" label="Revenue run-rate" color="#2aa198" /></div>
      <div className="card"><h3>Seasonal financial performance</h3><Chart labels={MONTHS} series={[{ n:'Revenue', v: MONTHS.map((_, i) => calc(i, p).revenue), c:'#65B6E5' }, { n:'Opex', v: MONTHS.map((_, i) => calc(i, p).opex), c:'#A7E3E2' }, { n:'Profit', v: MONTHS.map((_, i) => Math.max(0, calc(i, p).profit)), c:'#2aa198' }]} /></div></>}
    {t === 'Revenue & Expenses' && <div className="grid g2"><div className="card"><h3>Revenue distribution</h3>{rows.map(r => <div key={r[0]}><small>{r[0]} – {fmt(r[1])}</small><div className="bar"><i style={{ width: r[1] / M.revenue * 100 + '%' }} /></div></div>)}</div><div className="card"><h3>Expense distribution</h3>{ex.map(r => <div key={r[0]}><small>{r[0]} – {fmt(r[1])}</small><div className="bar"><i style={{ width: r[1] / M.opex * 100 + '%' }} /></div></div>)}</div></div>}
    {t === 'Reports & Analytics' && <Reports p={p} />}
    {t === 'Simulation Lab' && (() => {
      const cur = annual(p), sc = [...PRESETS.map(x => [x.n, annual(withP(x.p))]), ['Current simulation', cur]], bs = sc[0][1]
      const dr = [['Occupancy +10%', { occ: Math.min(100, p.occ * 1.1) }], ['Visitors +10%', { vis: p.vis * 1.1 }], ['Electricity price +10%', { price: p.price * 1.1 }], ['HVAC demand +10%', { hvac: p.hvac * 1.1 }], ['Opex +10 pts', { opex: p.opex + 10 }], ['Revenue +10 pts', { rev: p.rev + 10 }], ['Solar +10 pts', { solar: p.solar + 10 }], ['Heat +3 °C', { temp: p.temp + 3 }]].map(([n, d]) => [n, annual({ ...p, ...d }).profit - cur.profit])
      const mx = Math.max(...dr.map(r => Math.abs(r[1]))) || 1
      return <><div className="card"><h3>Scenario comparison – full-year totals (EGP)</h3><Chart bars labels={sc.map(r => r[0].split(' ')[0])} series={[{ n:'Revenue', v: sc.map(r => r[1].revenue), c:'#91C9ED' }, { n:'Profit', v: sc.map(r => Math.max(0, r[1].profit)), c:'#2aa198' }]} />
        <Table cols={['Scenario', 'kWh / yr', 'Water m³', 'Revenue', 'Opex', 'Profit', 'Margin', 'Δ profit vs baseline']} rows={sc.map(([n, r]) => [n, fmt(r.kwh), fmt(r.water), fmt(r.revenue), fmt(r.opex), fmt(r.profit), r.margin.toFixed(1) + ' %', ((r.profit / bs.profit - 1) * 100).toFixed(1) + ' %'])} /></div>
        <div className="card" style={{ marginTop: 14 }}><h3>Sensitivity – annual profit impact of each driver (vs current simulation)</h3>{dr.map(r => <div key={r[0]}><small>{r[0]}: <b className={r[1] < 0 ? 'Critical' : 'Normal'}>{r[1] >= 0 ? '+' : ''}{fmt(r[1])} EGP</b></small><div className="bar"><i style={{ width: Math.abs(r[1]) / mx * 100 + '%', background: r[1] < 0 ? '#e5675f' : undefined }} /></div></div>)}</div></>
    })()}
    {t === 'Baseline vs Simulated' && <div className="card"><h3>Before vs after (selected month)</h3><Table cols={['Metric','Baseline','Simulated','Δ']} rows={[['Occupied units', B.occU, M.occU], ['kWh', B.kwh, M.kwh], ['Revenue', B.revenue, M.revenue], ['Opex', B.opex, M.opex], ['Profit', B.profit, M.profit]].map(r => [r[0], fmt(r[1]), fmt(r[2]), ((r[2] / r[1] - 1) * 100).toFixed(1) + ' %'])} />
      <Chart bars labels={['Revenue','Opex','Profit']} series={[{ n:'Baseline', v:[B.revenue, B.opex, B.profit], c:'#A7E3E2' }, { n:'Simulated', v:[M.revenue, M.opex, M.profit], c:'#65B6E5' }]} /></div>}</>
}
function SimPanel({ p, setP, mi, setMi, close }) {
  const [play, setPlay] = useState(false)
  useEffect(() => { if (!play) return; const i = setInterval(() => setMi(m => (m + 1) % 12), 500); return () => clearInterval(i) }, [play])
  const S = (k, l, min, max, step) => <label>{l}: <b>{(+p[k]).toFixed(step < 1 ? 1 : 0)}</b><input type="range" min={min} max={max} step={step} value={p[k]} onChange={e => setP({ ...p, [k]: +e.target.value })} /></label>
  return <div className="drawer"><h3>Simulation Engine</h3><div className="sub">Every change updates all modules. Baseline stays fixed for comparison.</div>
    <label>Scenario presets</label><div className="tabs">{PRESETS.map(x => <button key={x.n} className="tab" onClick={() => { setP(withP(x.p)); if (x.m !== null) setMi(x.m) }}>{x.n}</button>)}</div>
    <label>Month<select value={mi} onChange={e => setMi(+e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></label>
    <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setPlay(!play)}>{play ? '⏸ Stop playback' : '▶ Play full year'}</button>
    {S('occ', 'Occupancy % (peak ref.)', 20, 100, 1)}{S('newUnits', 'New units activated', 0, 400, 10)}{S('vis', 'Visitor multiplier', .5, 2, .1)}{S('temp', 'Heatwave +°C', 0, 15, 1)}{S('hvac', 'HVAC demand ×', .5, 2, .1)}{S('water', 'Water use ×', .5, 2, .1)}
    {S('price', 'Electricity EGP/kWh', 1, 5, .1)}{S('wprice', 'Water EGP/m³', 10, 40, 1)}{S('gprice', 'Gas EGP/m³', 3, 12, .5)}{S('solar', 'Solar share %', 0, 60, 1)}{S('opex', 'Opex change %', -20, 40, 1)}{S('rev', 'Revenue change %', -30, 40, 1)}
    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}><button className="btn" onClick={() => { setP(BASE); setPlay(false) }}>Reset simulation</button><button className="btn pri" onClick={close}>Close</button></div></div>
}

/* ============ HOLOGRAPHIC RESORT TWIN (Three.js, illustrative model) ============ */
const PAL = {
  light: { line: 0x3F6F8C, fill: 0xB7D7E5, ground: 0xEFE7D8, grid: 0xD8C6A5, sea: 0xB7D7E5, sand: 0xD8C6A5, road: 0xBFB29B, water: 0x8CC9D6, tree: 0x6E9F8C, grass: 0xCFDCC0 },
  dark: { line: 0x7FE3F5, fill: 0x3FA9D8, ground: 0x0C2540, grid: 0x2F6F9A, sea: 0x0E5877, sand: 0x4B5A62, road: 0x28465F, water: 0x2EC4C0, tree: 0x2EC4A0, grass: 0x174E4A }
}
const RAMP = [[0, [167, 227, 226]], [.4, [145, 201, 237]], [.7, [246, 213, 142]], [1, [242, 163, 140]]]
const ramp = t => { t = Math.max(0, Math.min(1, t)); for (let i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) { const a = RAMP[i - 1], b = RAMP[i], k = (t - a[0]) / (b[0] - a[0]); return (Math.round(a[1][0] + (b[1][0] - a[1][0]) * k) << 16) | (Math.round(a[1][1] + (b[1][1] - a[1][1]) * k) << 8) | Math.round(a[1][2] + (b[1][2] - a[1][2]) * k) } return 0 }
const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) }
const eqOf = id => ['Elevators', 'HVAC unit', 'Water pump'].map((n, i) => [n, (id === 'HB1' && i === 1) ? 'Fault' : hash(id + i) % 11 === 0 ? 'Fault' : hash(id + i) % 5 === 0 ? 'Warning' : 'Normal'])
const LK = ['residential', 'villas', 'roads', 'pools', 'beach', 'hotel', 'electric', 'water', 'hvac', 'iot', 'lighting', 'security']
const LAYERS = [['residential', 'Residential units'], ['villas', 'Villas & chalets'], ['roads', 'Roads & pathways'], ['pools', 'Pools & lagoons'], ['beach', 'Beach & waterfront'], ['hotel', 'Hotel & clubhouse'], ['electric', 'Electricity network'], ['water', 'Water distribution'], ['hvac', 'HVAC & mechanical'], ['iot', 'IoT sensors'], ['lighting', 'Smart lighting'], ['security', 'Security & access']]
const MODES = ['Normal', 'Energy', 'Occupancy', 'Maintenance', 'Infrastructure', 'IoT']

function mkTex(draw, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 2; return t }
function mergeGeo(parts) { const pos = []; parts.forEach(([g, m]) => { const ng = g.index ? g.toNonIndexed() : g.clone(); ng.applyMatrix4(m); const a = ng.attributes.position.array; for (let i = 0; i < a.length; i++) pos.push(a[i]) }); const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return o }
const POOLS = [[-18, -20, 6, 15], [0, -20, 8, 15], [18, -20, 6, 15], [-20, 12, 6, 14], [0, 12, 6, 14], [20, 12, 6, 14], [58, -20, 5, 16]]

function buildTwin(el, hooks) {
  const T = THREE, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), R = rng(11)
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(40, 1, .5, 700)
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); el.appendChild(renderer.domElement)
  const dom = renderer.domElement; dom.style.touchAction = 'none'; dom.style.display = 'block'
  const root = new T.Group(); scene.add(root)
  const G = {}; LK.forEach(k => { G[k] = new T.Group(); root.add(G[k]) })
  const P = { cur: PAL.light }, themed = []
  const lm = (key, op) => { const m = new T.LineBasicMaterial({ color: P.cur[key], transparent: true, opacity: op }); themed.push([m, key]); return m }
  const fm = (key, op) => { const m = new T.MeshBasicMaterial({ color: P.cur[key], transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide }); themed.push([m, key]); return m }
  const lc = (c, op) => new T.LineBasicMaterial({ color: c, transparent: true, opacity: op })
  const wm = (c, op) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: op, side: T.DoubleSide })
  const flat = (geo, mat, x, y, z) => { const m = new T.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); return m }
  const seg = pts => new T.BufferGeometry().setFromPoints(pts.map(p => new T.Vector3(p[0], p[1], p[2])))
  const boxEdges = (w, h, d, mat, x, y, z, grp) => { const l = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(w, h, d)), mat); l.position.set(x, y, z); grp.add(l); return l }
  const inside = (x, z, m) => BLD.some(b => Math.abs(x - b.x) < b.w / 2 + m && Math.abs(z - b.z) < b.d / 2 + m) || Math.hypot(x, z + 5) < 9 || (Math.abs(z - 32) < 7 && Math.abs(x) < 16) || POOLS.some(p => Math.abs(x - p[0]) < p[2] / 2 + 1.2 && Math.abs(z - p[1]) < p[3] / 2 + 1)
  const onRoad = (x, z) => Math.abs(z - .5) < 2.6 || Math.abs(z - 24) < 2.6 || Math.abs(Math.abs(x) - 39) < 2.6

  // textures (facade windows, solar roofs)
  const winTex = mkTex((g, w, h) => { g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 0, w, h); [8, 49, 90].forEach((x, i) => { g.fillStyle = i === 1 ? 'rgba(255,228,165,.95)' : 'rgba(255,255,255,.75)'; g.fillRect(x, 14, 30, 30); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x, 14, 30, 30) }); g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(0, h - 5, w, 5) }, 128, 64)
  const solTex = mkTex((g, w, h) => { g.fillStyle = 'rgba(18,66,132,.97)'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(170,212,244,.95)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke() }, 64, 64)
  const texFor = (base, rx, ry) => { const t = base.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t }
  const tmat = tex => new T.MeshBasicMaterial({ map: tex, color: P.cur.fill, transparent: true, opacity: .5, depthWrite: false })

  // ground, glow, grid, beach, sea
  root.add(flat(new T.PlaneGeometry(150, 100), fm('ground', .8), 0, -.05, 19))
  const glow = mkTex((g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(101,182,229,.45)'); r.addColorStop(1, 'rgba(101,182,229,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h) }, 256, 256)
  root.add(flat(new T.PlaneGeometry(190, 190), new T.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false }), 0, -.1, 18))
  const gp = []; for (let x = -75; x <= 75; x += 5) gp.push([x, 0, -31], [x, 0, 69]); for (let z = -30; z <= 69; z += 5) gp.push([-75, 0, z], [75, 0, z])
  root.add(new T.LineSegments(seg(gp), lm('grid', .26)))
  G.beach.add(flat(new T.PlaneGeometry(150, 37), fm('sea', .65), 0, -.04, -56.5), flat(new T.PlaneGeometry(150, 7), fm('sand', .9), 0, -.03, -34.5))
  const waves = []; for (let i = 0; i < 6; i++) { const pts = []; for (let x = -75; x <= 75; x += 2.5) pts.push(new T.Vector3(x, .1 + Math.sin(x * .3 + i) * .25, 0)); const w = new T.Line(new T.BufferGeometry().setFromPoints(pts), lm('line', .45)); w.position.z = -41 - i * 5.5; w.userData.z = w.position.z; G.beach.add(w); waves.push(w) }
  const boats = []; const hullM = wm(0xffffff, .95)
  const boat = (x, z, sp, sc, sail) => { const g = new T.Group(); const h = new T.Mesh(new T.BoxGeometry(3, .5, 1), hullM); h.position.y = .3; g.add(h); if (sail) { const s = new T.Mesh(new T.BufferGeometry().setFromPoints([new T.Vector3(0, .5, 0), new T.Vector3(0, 4, 0), new T.Vector3(1.8, .5, 0)]), hullM); g.add(s) } else { const c = new T.Mesh(new T.BoxGeometry(1.2, .6, .7), hullM); c.position.set(-.3, .85, 0); g.add(c) } g.scale.setScalar(sc); g.position.set(x, 0, z); G.beach.add(g); boats.push({ g, sp }) }
  boat(-30, -48, 1.2, 1.1, true); boat(25, -56, -.9, 1.3, false); boat(50, -45, 1.5, 1, true)
  const um = new T.InstancedMesh(new T.CylinderGeometry(.9, .9, .06, 8), wm(0xffffff, .9), 46), dm = new T.Object3D()
  for (let i = 0; i < 46; i++) { dm.position.set(-67 + i * 2.95, 1.4, -33.5 + (i % 2) * 1.6); dm.updateMatrix(); um.setMatrixAt(i, dm.matrix) } G.beach.add(um)

  // roads, markings, roundabout, cars
  const road = (x, z, w, d) => G.roads.add(flat(new T.PlaneGeometry(w, d), fm('road', .88), x, .02, z))
  road(0, .5, 132, 2.6); road(0, 24, 132, 2.6); road(-39, 9, 2.6, 86); road(39, 9, 2.6, 86)
  G.roads.add(flat(new T.RingGeometry(5.2, 8, 48), fm('road', .88), 0, .025, -5), flat(new T.CircleGeometry(5, 40), fm('grass', .7), 0, .03, -5))
  const dash = (a, b) => { const l = new T.Line(seg([a, b]), new T.LineDashedMaterial({ color: 0xffffff, dashSize: 1.2, gapSize: 1, transparent: true, opacity: .85 })); l.computeLineDistances(); G.roads.add(l) }
  dash([-66, .06, .5], [-8, .06, .5]); dash([8, .06, .5], [66, .06, .5]); dash([-66, .06, 24], [66, .06, 24]); dash([-39, .06, -33], [-39, .06, 51]); dash([39, .06, -33], [39, .06, 51])
  const edg = []; [[.5, 1.25], [24, 1.25]].forEach(([z, o]) => { edg.push([-66, .05, z - o], [66, .05, z - o], [-66, .05, z + o], [66, .05, z + o]) }); [-39, 39].forEach(x => { edg.push([x - 1.25, .05, -33], [x - 1.25, .05, 51], [x + 1.25, .05, -33], [x + 1.25, .05, 51]) }); G.roads.add(new T.LineSegments(seg(edg), lc(0xffffff, .5)))
  const fx = new T.Mesh(new T.CylinderGeometry(.9, 1.2, .5, 12), fm('water', .8)); fx.position.set(0, .3, -5); G.roads.add(fx)
  const cars = [], carM = [0xffffff, 0xcfe8f5, 0x65b6e5, 0xe6e9ec].map(c => new T.MeshBasicMaterial({ color: c }))
  ;[['x', -.2, -50, 6], ['x', 1.2, 30, -5], ['x', -.2, 12, 6.5], ['x', 1.2, -20, -5.5], ['x', 23.2, -40, 6], ['x', 24.8, 20, -6], ['x', 24.8, 55, -5], ['z', -39.6, -20, 5], ['z', -38.4, 20, -5], ['z', 38.4, -10, 5.5], ['z', 39.6, 30, -6], ['z', 38.4, 40, 5]].forEach((c, i) => { const m = new T.Mesh(new T.BoxGeometry(c[0] === 'x' ? 1.7 : .8, .5, c[0] === 'x' ? .8 : 1.7), carM[i % 4]); m.position.y = .3; G.roads.add(m); cars.push({ m, axis: c[0], fixed: c[1], pos: c[2], sp: c[3] }) })

  // palms (merged trunk + fronds, instanced)
  const M4 = T.Matrix4, parts = [[new T.CylinderGeometry(.1, .17, 3.4, 5), new M4().makeTranslation(0, 1.7, 0)]]
  for (let i = 0; i < 7; i++) parts.push([new T.ConeGeometry(.3, 2.5, 3), new M4().makeRotationY(i * 6.283 / 7).multiply(new M4().makeTranslation(0, 3.4, 0)).multiply(new M4().makeRotationZ(-1.25)).multiply(new M4().makeTranslation(0, 1.25, 0))])
  const pp = []; for (let x = -62; x <= 62; x += 5) { pp.push([x, -2.4], [x, 3.4], [x, 21.6], [x, 26.4]) } for (let z = -30; z <= 50; z += 5) pp.push([-42, z], [-36, z], [36, z], [42, z])
  POOLS.forEach(p => { for (let z = p[1] - p[3] / 2 + 1; z <= p[1] + p[3] / 2; z += 4) pp.push([p[0] - p[2] / 2 - 1.6, z], [p[0] + p[2] / 2 + 1.6, z]) })
  for (let x = -68; x <= 68; x += 5.5) pp.push([x + R() * 2, -31.6 + R()])
  for (let i = 0; i < 60; i++) pp.push([-66 + R() * 132, -28 + R() * 78])
  const pf = pp.filter(p => !inside(p[0], p[1], 1) && (p[1] < -30 || !onRoad(p[0], p[1]) || Math.abs(p[1] - .5) > 1.4 && Math.abs(p[1] - 24) > 1.4 && Math.abs(Math.abs(p[0]) - 39) > 1.4) && Math.hypot(p[0], p[1] - 32) > 0 && !(Math.abs(p[1] - 32) < 6 && Math.abs(p[0]) < 15))
  const palms = new T.InstancedMesh(mergeGeo(parts), fm('tree', .85), pf.length)
  pf.forEach((p, i) => { dm.position.set(p[0], 0, p[1]); dm.rotation.y = R() * 6; dm.scale.setScalar(.8 + R() * .5); dm.updateMatrix(); palms.setMatrixAt(i, dm.matrix) }); dm.rotation.y = 0; dm.scale.setScalar(1); G.roads.add(palms)

  // pools with decks & loungers; lagoon
  const pool = (x, z, w, d) => { G.pools.add(flat(new T.PlaneGeometry(w + 3.4, d + 2), fm('sand', .55), x, .04, z), flat(new T.PlaneGeometry(w, d), fm('water', .85), x, .07, z)); const e = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(w, d)), lm('line', .9)); e.rotation.x = -Math.PI / 2; e.position.set(x, .09, z); G.pools.add(e) }
  POOLS.forEach(p => pool(p[0], p[1], p[2], p[3]))
  const lgn = []; POOLS.forEach(p => { for (let z = p[1] - p[3] / 2 + 1.2; z < p[1] + p[3] / 2; z += 1.8) lgn.push([p[0] - p[2] / 2 - .6, z], [p[0] + p[2] / 2 + .6, z]) })
  const lounge = new T.InstancedMesh(new T.BoxGeometry(.6, .14, 1.2), wm(0xffffff, .95), lgn.length); lgn.forEach((p, i) => { dm.position.set(p[0], .2, p[1]); dm.updateMatrix(); lounge.setMatrixAt(i, dm.matrix) }); G.pools.add(lounge)
  const lg = flat(new T.CircleGeometry(1, 40), fm('water', .85), 0, .07, 32); lg.scale.set(14, 5, 1); G.pools.add(lg)
  const lgp = []; for (let i = 0; i <= 48; i++) lgp.push(new T.Vector3(Math.cos(i / 48 * 6.283) * 14, .09, 32 + Math.sin(i / 48 * 6.283) * 5)); G.pools.add(new T.Line(new T.BufferGeometry().setFromPoints(lgp), lm('line', .95)))

  // buildings
  const ents = {}, pick = []
  BLD.forEach(b => {
    const villa = /^(CA|CB|VN|VS)/.test(b.id), grp = b.sp ? G.hotel : villa ? G.villas : G.residential, g = new T.Group(); g.position.set(b.x, 0, b.z)
    const lmat = new T.LineBasicMaterial({ color: P.cur.line, transparent: true, opacity: .9 }), fills = [], plain = new T.MeshBasicMaterial({ color: P.cur.fill, transparent: true, opacity: .2, depthWrite: false })
    let mats = [plain], solar = false
    const addFill = (geo, x, y, z, m) => { const f = new T.Mesh(geo, m); f.position.set(x, y, z); f.userData.id = b.id; g.add(f); pick.push(f); fills.push(f); return f }
    g.add(flat(new T.PlaneGeometry(b.w + (villa ? 1.5 : 5), b.d + (villa ? 1.5 : 5)), fm('grass', .5), 0, .015, 0))
    if (b.round) {
      addFill(new T.CylinderGeometry(b.w / 2, b.w / 2, b.h, 24), 0, b.h / 2, 0, plain); addFill(new T.CylinderGeometry(2.2, 2.2, 1.2, 20), 0, b.h + .6, 0, plain)
      ;[[b.w / 2, b.h, 0], [2.2, 1.2, b.h]].forEach(([r, h, y]) => { const l = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(r, r, h, 24)), lmat); l.position.y = y + h / 2; g.add(l) })
      const col = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; col.push([Math.cos(a) * 4.4, 0, Math.sin(a) * 4.4], [Math.cos(a) * 4.4, b.h, Math.sin(a) * 4.4]) } g.add(new T.LineSegments(seg(col), lmat))
    } else if (villa) {
      const vh = b.h * [1, 1.15, .9, 1.3][villaIdx(b.id) < 0 ? (hash(b.id) % 4) : villaIdx(b.id)]
      const sw = b.w / 2 - .35, sd = b.d / 2 - .35; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const x = sx * b.w / 4, z = sz * b.d / 4
        addFill(new T.BoxGeometry(sw, vh * .7, sd), x, vh * .35, z, plain); boxEdges(sw, vh * .7, sd, lmat, x, vh * .35, z, g)
        addFill(new T.BoxGeometry(sw * .65, vh * .4, sd * .7), x - sx * .15, vh * .7 + vh * .2, z, plain); boxEdges(sw * .65, vh * .4, sd * .7, lmat, x - sx * .15, vh * .7 + vh * .2, z, g); if (chaIdx(b.id) % 2 === 1) { const rf = new T.LineSegments(new T.EdgesGeometry(new T.ConeGeometry(Math.max(sw, sd) * .75, 1.1, 4)), lc(0xd9825b, 1)); rf.rotation.y = Math.PI / 4; rf.position.set(x, vh * .7 + .55, z); g.add(rf) } })
      const px = b.id.startsWith('VS') ? b.x + b.w / 2 + 2 : b.x + (b.x % 16 === 0 || b.id.startsWith('CA') || b.id.startsWith('CB') ? (b.x < -50 ? 4 : b.x > 0 ? 4 : 4.4) : 4); G.pools.add(flat(new T.PlaneGeometry(1.6, 2.6), fm('water', .85), px, .07, b.z))
    } else {
      const fl = Math.max(1, Math.round(b.h / 1.6)), side = len => tmat(texFor(winTex, Math.max(1, Math.round(len / 3.2)), fl)), top = tmat(texFor(solTex, Math.max(1, Math.round(b.w / 1.4)), Math.max(1, Math.round(b.d / 1.4))))
      mats = [side(b.d), side(b.d), top, new T.MeshBasicMaterial({ visible: false }), side(b.w), side(b.w)]; solar = true
      const f = new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), mats); f.position.y = b.h / 2; f.userData.id = b.id; g.add(f); pick.push(f); fills.push(f)
      boxEdges(b.w, b.h, b.d, lmat, 0, b.h / 2, 0, g); boxEdges(b.w * .7, .9, b.d * .55, lmat, 0, b.h + .45, 0, g); if (/^BS/.test(b.id)) { const k = beaIdx(b.id) % 3; boxEdges(b.w * .6, 1.2, b.d * (.3 + k * .1), lmat, 0, b.h + 1.5, k === 1 ? 4 : -4, g) } if (/^LR/.test(b.id)) { const k = lrIdx(b.id); boxEdges(b.w * .55, 1.1, b.d * .35, lmat, k === 1 ? -.8 : .8, b.h + 1.4, k === 2 ? 3 : -3, g) }
      if (b.id === 'HB1') { boxEdges(b.w * .8, 2.4, b.d * .8, lmat, 0, b.h + 1.2, 0, g); boxEdges(b.w * .55, 1.8, b.d * .6, lmat, 0, b.h + 3.3, 0, g) }
    }
    grp.add(g); ents[b.id] = { b, g, fills, mats, lmat, grp, solar }
  })

  // infrastructure layers
  const AMB = 0xf2b04a, BLU = 0x2e9fe0, IOT = 0x14b8c8, COR = 0xf2a38c, RES = BLD.filter(b => !b.sp)
  boxEdges(4, 5, 4, lc(AMB, 1), -63, 2.5, -4, G.electric)
  const ep = [[-63, .3, .5], [63, .3, .5]]; RES.forEach(b => ep.push([b.x, .3, .5], [b.x, .3, b.z])); G.electric.add(new T.LineSegments(seg(ep), lc(AMB, .85)))
  const sub = new T.Mesh(new T.SphereGeometry(.8, 12, 12), new T.MeshBasicMaterial({ color: AMB })); sub.position.set(-63, 5.6, -4); G.electric.add(sub)
  const wp = [[-63, .25, 24], [63, .25, 24], [62, .25, 40], [62, .25, 24]]; RES.forEach(b => wp.push([b.x, .25, 24], [b.x, .25, b.z]))
  G.water.add(new T.LineSegments(seg(wp), lc(BLU, .8))); const tank = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(3, 3, 4, 18)), lc(BLU, 1)); tank.position.set(62, 2, 40); G.water.add(tank)
  boxEdges(6, 4, 8, lc(0x65B6E5, 1), 63, 2, 6, G.hvac); RES.forEach(b => boxEdges(1.4, .8, 1.4, lc(0x65B6E5, 1), b.x, b.h + .4, b.z, G.hvac)); G.hvac.add(new T.LineLoop(seg([[-39, .4, .5], [39, .4, .5], [39, .4, 24], [-39, .4, 24]]), lc(0x65B6E5, .8)))
  const secPick = [], secMk = {}, secHot = new Set()
  GATES.forEach(gt => { boxEdges(3, 3, 1.6, lc(COR, 1), gt.x, 1.5, gt.z, G.security); const s = new T.Mesh(new T.OctahedronGeometry(1), new T.MeshBasicMaterial({ color: 0x2aa198 })); s.position.set(gt.x, 3.8, gt.z); s.userData.sec = gt.id; G.security.add(s); secPick.push(s); secMk[gt.id] = s })
  CAMS.forEach(c => { const m = new T.Mesh(new T.ConeGeometry(.55, 1.4, 8), new T.MeshBasicMaterial({ color: 0x2aa198 })); m.position.set(c.x, 3.2, c.z); m.rotation.x = Math.PI; m.userData.sec = c.id; G.security.add(m); G.security.add(new T.LineSegments(seg([[c.x, 0, c.z], [c.x, 2.5, c.z]]), lc(0x9fb4c4, .6))); secPick.push(m); secMk[c.id] = m })
  const lp = [], lv = []; const pole = (x, z) => { lp.push(x, 2.4, z); lv.push([x, 0, z], [x, 2.4, z]) }
  for (let x = -63; x <= 63; x += 6) { pole(x, -1); pole(x, 2); pole(x, 22.8); pole(x, 25.2) } for (let z = -30; z <= 50; z += 6) { pole(-40.5, z); pole(37.5, z) }
  const lgeo = new T.BufferGeometry(); lgeo.setAttribute('position', new T.Float32BufferAttribute(lp, 3)); G.lighting.add(new T.Points(lgeo, new T.PointsMaterial({ color: 0xffc857, size: 1.6, transparent: true, opacity: .95 })), new T.LineSegments(seg(lv), lc(0xffc857, .35)))
  const gws = [[-39, 6], [39, 6], [0, 24]], sm = new T.MeshBasicMaterial({ color: IOT }), sg = new T.SphereGeometry(.55, 10, 10), sens = [], sn = [], il = []
  gws.forEach(p => { const o = new T.Mesh(new T.OctahedronGeometry(1.1), new T.MeshBasicMaterial({ color: 0x65B6E5 })); o.position.set(p[0], 2, p[1]); G.iot.add(o) })
  RES.forEach(b => sens.push([b.x, b.h + 1.2, b.z])); for (let i = 0; i < 28; i++) sens.push([-60 + (i * 37 % 120), .8, [-3, 1.5, 22.5, 25.5][i % 4]])
  sens.forEach(p => { const s = new T.Mesh(sg, sm); s.position.set(p[0], p[1], p[2]); G.iot.add(s); sn.push(s); let best = gws[0], bd = 1e9; gws.forEach(q => { const d = Math.hypot(q[0] - p[0], q[1] - p[2]); if (d < bd) { bd = d; best = q } }); il.push([p[0], p[1], p[2]], [best[0], 2, best[1]]) })
  G.iot.add(new T.LineSegments(seg(il), lc(IOT, .3)))

  // hologram effects: ring, scan sheet, floating particles
  const ringPts = []; for (let i = 0; i <= 90; i++) ringPts.push(new T.Vector3(Math.cos(i / 90 * 6.283) * 88, 0, Math.sin(i / 90 * 6.283) * 88)); const ring = new T.Line(new T.BufferGeometry().setFromPoints(ringPts), lm('line', .4)); ring.position.set(0, -.2, 18); scene.add(ring)
  const scan = flat(new T.PlaneGeometry(150, 100), fm('line', .08), 0, 0, 19); root.add(scan)
  const NP = 90, pa = new Float32Array(NP * 3); for (let i = 0; i < NP; i++) { pa[i * 3] = -70 + R() * 140; pa[i * 3 + 1] = R() * 26; pa[i * 3 + 2] = -35 + R() * 100 }
  const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pa, 3)); const pm = new T.PointsMaterial({ color: P.cur.line, size: .9, transparent: true, opacity: .55, depthWrite: false }); themed.push([pm, 'line']); root.add(new T.Points(pg, pm))
  const selRing = flat(new T.RingGeometry(1, 1.12, 48), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, side: T.DoubleSide }), 0, .2, 0); selRing.visible = false; root.add(selRing)

  // state & painting
  const st = { mode: 'Normal', heat: {}, hover: null, sel: null, auto: false }, col = new T.Color()
  function paint() {
    Object.values(ents).forEach(e => { const id = e.b.id, hv = st.mode !== 'Normal' && st.mode !== 'IoT' && st.heat[id] !== undefined
      let c = P.cur.fill, lcol = P.cur.line, op = e.solar ? .55 : .22, lop = .9
      if (hv) { c = ramp(st.heat[id]); lcol = col.setHex(c).multiplyScalar(.75).getHex(); op = e.solar ? .8 : .5; lop = 1 }
      if (st.mode === 'IoT') { op = .07; lop = .4 }
      if (id === st.hover) op += .18
      if (id === st.sel) { op += .25; lop = 1 }
      e.mats.forEach((m, i) => { m.color.setHex(c); m.opacity = Math.min(i === 2 && e.solar ? op * 1.5 : op, .95) }); e.lmat.color.setHex(lcol); e.lmat.opacity = lop })
    selRing.material.color.setHex(P.cur.line === PAL.light.line ? PAL.light.line : 0xffffff)
  }

  // camera & interaction
  const cur = { th: .6, ph: .95, r: 125, tx: 0, ty: 0, tz: 6 }, des = { ...cur }, DEF = { ...cur }
  const cam = () => { camera.position.set(cur.tx + cur.r * Math.sin(cur.ph) * Math.sin(cur.th), cur.ty + cur.r * Math.cos(cur.ph), cur.tz + cur.r * Math.sin(cur.ph) * Math.cos(cur.th)); camera.lookAt(cur.tx, cur.ty, cur.tz) }
  const ray = new T.Raycaster(), v2 = new T.Vector2()
  const hit = e => { const r = dom.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera); const list = ray.intersectObjects(pick.filter(m => ents[m.userData.id].grp.visible), false); return list.length ? list[0].object.userData.id : null }
  const pts = new Map(); let moved = 0, btn = 0, pinch = 0, lastHit = 0
  dom.addEventListener('contextmenu', e => e.preventDefault())
  dom.addEventListener('pointerdown', e => { dom.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; btn = e.button; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y) } })
  dom.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId), rc = dom.getBoundingClientRect()
    if (!p) { const nt = performance.now(); if (nt - lastHit < 70) return; lastHit = nt; const id = hit(e); dom.style.cursor = id ? 'pointer' : 'grab'; if (id !== st.hover) { st.hover = id; paint() } hooks.hover(id, e.clientX - rc.left, e.clientY - rc.top); return }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy)
    if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); des.r = clamp(des.r * pinch / d, 25, 230); pinch = d; return }
    if (btn === 2 || btn === 1 || e.shiftKey) { const k = des.r * .0016; des.tx += (-Math.cos(des.th) * dx - Math.sin(des.th) * dy) * k; des.tz += (Math.sin(des.th) * dx - Math.cos(des.th) * dy) * k; des.tx = clamp(des.tx, -80, 80); des.tz = clamp(des.tz, -50, 80) }
    else { des.th -= dx * .006; des.ph = clamp(des.ph - dy * .005, .15, 1.45) }
  })
  const hitSec = e => { if (!G.security.visible) return null; const r = dom.getBoundingClientRect(); v2.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera); const l = ray.intersectObjects(secPick, false); return l.length ? l[0].object.userData.sec : null }
  const up = e => { pts.delete(e.pointerId); if (e.type === 'pointerup' && moved < 5 && e.button === 0 && pts.size === 0) { const sid = hitSec(e); if (sid) hooks.secPick(sid); else hooks.pick(hit(e)) } }
  dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up)
  dom.addEventListener('wheel', e => { e.preventDefault(); des.r = clamp(des.r * (1 + e.deltaY * .0022), 25, 230) }, { passive: false })
  const resize = () => { const w = el.clientWidth || 800, h = el.clientHeight || 500; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix() }
  const ro = new ResizeObserver(resize); ro.observe(el); resize()
  let raf, last = performance.now(); const t0 = last
  const loop = () => { raf = requestAnimationFrame(loop); const now = performance.now(), t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now
    for (const k in cur) cur[k] += (des[k] - cur[k]) * .22
    if (st.auto) des.th += .009
    root.position.y = Math.sin(t * .9) * .35; ring.rotation.y = t * .08
    scan.position.y = (t * 4) % 14; scan.material.opacity = .12 * (1 - scan.position.y / 14)
    waves.forEach((w, i) => { w.position.z = w.userData.z + Math.sin(t * 1.6 + i) * .8 })
    boats.forEach(b => { b.g.position.x += b.sp * 2 * dt; if (b.g.position.x > 72) b.g.position.x = -72; if (b.g.position.x < -72) b.g.position.x = 72; b.g.position.y = Math.sin(t * 1.4 + b.sp) * .12 })
    cars.forEach(c => { c.pos += c.sp * 1.8 * dt; const lim = c.axis === 'x' ? 64 : 50; if (c.pos > lim) c.pos = c.axis === 'x' ? -64 : -33; if (c.pos < (c.axis === 'x' ? -64 : -33)) c.pos = lim; if (c.axis === 'x') c.m.position.set(c.pos, .3, c.fixed); else c.m.position.set(c.fixed, .3, c.pos) })
    for (let i = 0; i < NP; i++) { pa[i * 3 + 1] += dt * (.6 + (i % 5) * .15); if (pa[i * 3 + 1] > 26) pa[i * 3 + 1] = 0 } pg.attributes.position.needsUpdate = true
    secHot.forEach(id => secMk[id].scale.setScalar(1 + .35 * Math.sin(t * 6)))
    if (G.iot.visible) sn.forEach((s, i) => s.scale.setScalar(1 + .35 * Math.sin(t * 3 + i)))
    if (selRing.visible) { const k = 1 + .08 * Math.sin(t * 4); selRing.scale.set(selRing.userData.s * k, selRing.userData.s * k, 1) }
    cam(); renderer.render(scene, camera) }
  loop()
  return {
    setLayers: o => { LK.forEach(k => { G[k].visible = !!o[k] }) },
    setMode: (m, h) => { st.mode = m; st.heat = h || {}; paint() },
    setTheme: n => { P.cur = PAL[n]; themed.forEach(([m, k]) => m.color.setHex(P.cur[k])); paint() },
    setSel: id => { st.sel = id; const e = id && ents[id]; selRing.visible = !!e; if (e) { selRing.position.set(e.b.x, .2, e.b.z); selRing.userData.s = Math.max(e.b.w, e.b.d) * .75; des.tx = e.b.x; des.tz = e.b.z; des.r = Math.min(des.r, 70) } paint() },
    setSec: m => { secHot.clear(); Object.keys(secMk).forEach(id => { const s = m[id] || 'ok'; secMk[id].material.color.setHex({ ok: 0x2aa198, warn: 0xf2b04a, off: 0x8a98a5, hot: 0xe5675f }[s]); if (s === 'hot') secHot.add(id); else secMk[id].scale.setScalar(1) }) },
    focusAt: (x, z) => { des.tx = x; des.tz = z; des.r = Math.min(des.r, 55) },
    reset: () => { Object.assign(des, DEF) }, zoom: f => { des.r = clamp(des.r * f, 25, 230) }, setAuto: b => { st.auto = b },
    dispose: () => { cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); if (dom.parentNode) dom.parentNode.removeChild(dom) }
  }
}

function Twin({ M, units, alerts, theme, sec, twinReq, clearReq, openSecCenter }) {
  const box = useRef(), wrap = useRef(), tipEl = useRef(), A = useRef(null)
  const [layers, setLayers] = useState({ residential: true, villas: true, roads: true, pools: true, beach: true, hotel: true, electric: false, water: false, hvac: false, iot: false, lighting: false, security: false })
  const [mode, setMode] = useState('Normal'), [sel, setSel] = useState(null), [hov, setHov] = useState(null), [auto, setAuto] = useState(false), [ok, setOk] = useState(true), [fs, setFs] = useState(false)
  const [gi, setGi] = useState(0), gn = useG(), [secSel, setSecSel] = useState(null)
  useEffect(() => setGi(0), [sel])
  const { s: stats, heat } = useMemo(() => {
    const g = {}; units.forEach(u => (g[u.building] = g[u.building] || []).push(u)); const f = .3 + .7 * M.s / 1.3, r = {}
    BLD.forEach(b => {
      if (b.sp) { const hot = b.id === 'HB1', al = alerts.filter(a => a.status !== 'Resolved' && a.fac === (hot ? 'Hotel Block' : 'Clubhouse')).length
        r[b.id] = { units: hot ? 320 : 0, den: hot ? 320 : 60, owners: 0, tenants: 0, occ: hot ? M.effOcc * 100 : M.s * 55, energy: M.kwh * (hot ? .16 : .08), water: M.water * (hot ? .12 : .04), req: hot ? 3 : 1, alerts: al, iot: hot ? 96 : 34, eq: eqOf(b.id) }
      } else { const a = g[b.id] || [], occN = a.filter(u => u.occupancy === 'Occupied').length
        r[b.id] = { units: a.length, den: Math.max(1, a.length), owners: new Set(a.map(u => u.ownerId)).size, tenants: a.filter(u => u.ownership === 'Rented').length, occ: a.length ? occN / a.length * 100 : 0, energy: a.reduce((s, u) => s + useOf(u, f, 'kwh'), 0), water: a.reduce((s, u) => s + useOf(u, f, 'water'), 0), req: a.reduce((s, u) => s + u.openReq, 0), alerts: a.filter(u => u.openReq >= 3).length, iot: Math.round(a.length / 3) + 4, eq: eqOf(b.id) } }
    })
    const keys = Object.keys(r), mx = fn => Math.max(...keys.map(fn), 1e-6), eM = mx(k => r[k].energy / r[k].den), rM = mx(k => r[k].req / r[k].den)
    const h = { Energy: {}, Occupancy: {}, Maintenance: {}, Infrastructure: {} }
    keys.forEach(k => { h.Energy[k] = r[k].energy / r[k].den / eM; h.Occupancy[k] = r[k].occ / 100; h.Maintenance[k] = r[k].req / r[k].den / rM; h.Infrastructure[k] = r[k].eq.reduce((s, e) => s + (e[1] === 'Fault' ? 1 : e[1] === 'Warning' ? .5 : 0), 0) / 2 })
    return { s: r, heat: h }
  }, [units, M, alerts])
  useEffect(() => {
    if (!window.THREE) { setOk(false); return }
    let api; try { api = buildTwin(box.current, { pick: id => { setSel(id); if (id) setSecSel(null) }, secPick: id => { setSecSel(id); setSel(null) }, hover: (id, x, y) => { if (tipEl.current) tipEl.current.style.transform = `translate(${x + 16}px,${y + 16}px)`; setHov(id) } }) } catch (e) { console.error(e); setOk(false); return }
    A.current = api; api.setTheme(theme); return () => api.dispose()
  }, [])
  useEffect(() => { A.current && A.current.setLayers(layers) }, [layers, ok])
  useEffect(() => { A.current && A.current.setMode(mode, heat[mode]) }, [mode, heat, ok])
  useEffect(() => { A.current && A.current.setTheme(theme) }, [theme])
  useEffect(() => { A.current && A.current.setSel(sel) }, [sel])
  useEffect(() => { A.current && A.current.setAuto(auto) }, [auto])
  useEffect(() => { A.current && A.current.setSec(secStatus(sec)) }, [sec.devices, sec.incidents, sec.gates, ok])
  useEffect(() => { if (!twinReq) return; setLayers(l => ({ ...l, security: true })); if (twinReq.id) { setSecSel(twinReq.id); setSel(null); const o = CAMS.find(c => c.id === twinReq.id) || GATES.find(g => g.id === twinReq.id); if (o && A.current) A.current.focusAt(o.x, o.z) } clearReq() }, [twinReq])
  useEffect(() => { const f = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f) }, [])
  const pickMode = m => { setMode(m); if (m === 'IoT') setLayers({ ...layers, iot: true }) }
  const b = sel && BLD.find(x => x.id === sel), s = sel && stats[sel], hb = hov && BLD.find(x => x.id === hov), hs = hov && stats[hov]
  const tog = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrap.current.requestFullscreen && wrap.current.requestFullscreen() }
  const stc = v => v === 'Normal' ? 'Normal' : v === 'Warning' ? 'Warning' : 'Critical'
  return <div ref={wrap} className="twin" style={{ height: fs ? '100vh' : 'calc(100vh - 170px)', background: theme === 'light' ? 'linear-gradient(180deg,#F4F0E8,#E8DFD0)' : 'linear-gradient(180deg,#08182a,#14344f)' }}>
    <div ref={box} className="twbox" />
    {!ok && <div className="card" style={{ position: 'absolute', left: '25%', right: '25%', top: '30%', zIndex: 5 }}><h3>3D engine unavailable</h3><div className="sub">Three.js could not be loaded (internet connection or WebGL is required).</div></div>}
    <div className="tw-badge">Illustrative 3D model – not the architectural masterplan</div>
    <div className="tw-hud"><span><i className="led" />LIVE</span><span>Load {fmt(M.kwh / 720 * 1.4 * (1 + .04 * Math.sin(gn)))} kW</span><span>Occupancy {(M.effOcc * 100).toFixed(0)} %</span><span>Alerts {alerts.filter(a => a.status !== 'Resolved').length}</span></div>
    <div className="tw-left card"><h3 style={{ marginBottom: 4 }}>Holographic Twin</h3>
      <h4>Security</h4><button className="btn sm mb" onClick={() => setLayers({ ...layers, security: true })}>Show cameras & gates</button><button className="btn sm mb" onClick={() => openSecCenter(null)}>Open Security Center</button>
      <h4>Visual mode</h4>{MODES.map(m => <button key={m} className={'tab mb' + (mode === m ? ' on' : '')} onClick={() => pickMode(m)}>{m === 'Normal' ? 'Normal appearance' : m === 'Energy' ? 'Energy heatmap' : m === 'Occupancy' ? 'Occupancy heatmap' : m === 'Maintenance' ? 'Maintenance alerts' : m === 'Infrastructure' ? 'Infrastructure status' : 'Smart-city IoT network'}</button>)}
      <h4>Layers</h4>{LAYERS.map(l => <label key={l[0]}><input type="checkbox" checked={layers[l[0]]} onChange={() => setLayers({ ...layers, [l[0]]: !layers[l[0]] })} />{l[1]}</label>)}
      <div className="sub" style={{ marginTop: 8 }}>Drag: rotate · Right-drag / Shift-drag: pan · Wheel: zoom · Click a building</div>
      <div className="mapref"><img src={IMG.aerial[0]} alt="Reference masterplan" /><span className="sub">Reference masterplan (actual)</span></div></div>
    <div className="tw-tools"><button className="btn" onClick={() => A.current && A.current.zoom(.8)}>＋</button><button className="btn" onClick={() => A.current && A.current.zoom(1.25)}>－</button><button className="btn" onClick={() => { A.current && A.current.reset(); setSel(null) }}>⟲ Reset view</button><button className={'btn' + (auto ? ' pri' : '')} onClick={() => setAuto(!auto)}>⟳ Auto-rotate</button><button className="btn" onClick={tog}>{fs ? '⤡ Exit full screen' : '⤢ Full screen'}</button></div>
    {secSel && (() => { const o = CAMS.find(c => c.id === secSel) || GATES.find(g => g.id === secSel); if (!o) return null; const isCam = !!o.zone, i = isCam ? camInfo(sec, o) : null, gs = isCam ? null : gateStats(sec, o.id)
      return <div className="tw-right card"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{o.name}</h3><button className="btn sm" onClick={() => setSecSel(null)}>✕</button></div><div className="sub">{o.id} · {isCam ? o.zone : o.loc}</div>
        {isCam ? (can(sec.role, 'cams') ? <><div style={{ margin: '8px 0' }}><CamView cam={o} ci={i} url={sec.streams[o.id]} /></div><Table cols={['Metric', 'Value']} rows={[['Status', <b className={stC(i.st)}>{i.st}</b>], ['Feed', i.feed], ['Recording', i.rec], ['Health', i.health + ' %'], ['Maintenance', i.d.status]]} /></> : <div className="sub">Camera feed restricted for your role ({sec.role}).</div>)
          : <Table cols={['Metric', 'Value']} rows={[['Status', gs.g.status], ['Barrier', gs.g.barrier], ['Entries', gs.entries], ['Exits', gs.exits], ['Traffic (10 min)', gs.traffic], ['Cameras', o.cams.join(', ')], ['Network', gs.g.net]]} />}
        <div style={{ marginTop: 8 }}><button className="btn sm pri" onClick={() => openSecCenter(o.id)}>Open in Security Center</button></div></div> })()}
    {b && s && <div className="tw-right card"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{b.name}</h3><button className="btn sm" onClick={() => setSel(null)}>✕</button></div>
      <div className="sub">ID {b.id} · {b.zone}</div><div style={{ height: 8 }} />{galOf(b.id) ? <><Pic k={galOf(b.id)[gi] || galOf(b.id)[0]} h={150} /><div className="thumbs">{galOf(b.id).map((k, i) => <img key={k} src={IMG[k][0]} className={i === gi ? 'on' : ''} onClick={() => setGi(i)} alt={k} />)}</div><span className="tag">{styOf(b.id)}</span></> : <Pic k={ZIMG[b.zone]} h={120} />}<div style={{ height: 8 }} />
      <Table cols={['Metric', 'Value']} rows={[['Units', s.units], ['Owners / tenants', s.owners + ' / ' + s.tenants], ['Occupancy', s.occ.toFixed(0) + ' %'], ['Energy', fmt(s.energy) + ' kWh/mo'], ['Water', fmt(s.water) + ' m³/mo'], ['Maintenance requests', s.req], ['Active alerts', s.alerts], ['Connected IoT devices', s.iot]]} />
      <h3 style={{ marginTop: 12, fontSize: 16 }}>Equipment status</h3><Table cols={['Equipment', 'Status']} rows={s.eq.map(e => [e[0], <b className={stc(e[1])}>{e[1]}</b>])} /></div>}
    <div ref={tipEl} className="tw-tip" style={{ display: hb ? 'block' : 'none' }}>{hb && hs && <><b>{hb.name}</b><div className="sub">{hs.units} units · {hs.occ.toFixed(0)} % occupied · {fmt(hs.energy)} kWh</div></>}</div>
    {(mode !== 'Normal' && mode !== 'IoT') && <div className="tw-legend card"><b>{mode === 'Energy' ? 'Energy per unit' : mode === 'Occupancy' ? 'Occupancy' : mode === 'Maintenance' ? 'Open requests per unit' : 'Equipment status'}</b><div className="lg" /><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{mode === 'Infrastructure' ? 'Normal' : 'Low'}</span><span>{mode === 'Infrastructure' ? 'Fault' : 'High'}</span></div></div>}
  </div>
}

/* ============ SECURITY, CCTV & GATE CONTROL – shared demo data model ============ */
const ROLES = ['Security Administrator', 'Security Supervisor', 'Security Operator', 'Maintenance Technician', 'Management Viewer']
const PERM = { cams: [0, 1, 2], identity: [0, 1, 2], gateCtl: [0, 1, 2], qrAdmin: [0, 1], incidents: [0, 1, 2], assign: [0, 1], maint: [0, 1, 3], audit: [0, 1], stream: [0] }
const PERM_LBL = { cams: 'View camera feeds', identity: 'See visitor identity data', gateCtl: 'Operate gates & barriers', qrAdmin: 'Revoke / suspend QR access', incidents: 'Handle incidents & notes', assign: 'Assign incidents', maint: 'Equipment maintenance actions', audit: 'View audit log', stream: 'Configure real camera streams' }
const can = (role, p) => PERM[p].includes(ROLES.indexOf(role))
const GATES = [
  { id: 'GATE-01', name: 'Main Entrance Gate', loc: 'South main road', x: -39, z: 52, cams: ['CAM-01', 'CAM-02'] },
  { id: 'GATE-02', name: 'Secondary Gate', loc: 'South-east road', x: 39, z: 52, cams: ['CAM-03'] },
  { id: 'GATE-03', name: 'East Service Gate', loc: 'East service road', x: 66, z: 24, cams: ['CAM-04', 'CAM-24'] },
  { id: 'GATE-04', name: 'West Residents Gate', loc: 'West boulevard', x: -66, z: 24, cams: ['CAM-05'] },
  { id: 'GATE-05', name: 'Villas Gate', loc: 'North-west villas road', x: -66, z: .5, cams: ['CAM-06'] },
  { id: 'GATE-06', name: 'Hotel Gate', loc: 'East hotel drive', x: 66, z: .5, cams: ['CAM-07'] },
  { id: 'GATE-07', name: 'Beach Access Gate', loc: 'Waterfront promenade', x: 0, z: -31, cams: ['CAM-08', 'CAM-15'] }]
const CZ = ['Gates', 'Residential', 'Villas & Chalets', 'Beach', 'Clubhouse & Hotel', 'Pools', 'Parking', 'Service', 'Roads']
const CAMS = [['CAM-01', 'Main Gate – Inbound Lane', 'Gates', 'gate', -39, 50], ['CAM-02', 'Main Gate – Outbound Lane', 'Gates', 'gate', -36, 53], ['CAM-03', 'Secondary Gate', 'Gates', 'gate', 39, 50], ['CAM-04', 'East Service Gate', 'Gates', 'gate', 64, 24], ['CAM-05', 'West Residents Gate', 'Gates', 'gate', -64, 24], ['CAM-06', 'Villas Gate', 'Gates', 'gate', -64, .5], ['CAM-07', 'Hotel Gate', 'Gates', 'gate', 64, .5], ['CAM-08', 'Beach Access Gate', 'Gates', 'gate', 0, -29],
  ['CAM-09', 'Beachfront Blocks', 'Residential', 'resi', -9, -30], ['CAM-10', 'Lagoon Residences', 'Residential', 'resi', 10, 22], ['CAM-11', 'Chalets A', 'Villas & Chalets', 'resi', -50, -12], ['CAM-12', 'Chalets B', 'Villas & Chalets', 'resi', -50, 30], ['CAM-13', 'Villas North', 'Villas & Chalets', 'resi', 49, 16], ['CAM-14', 'Villas South', 'Villas & Chalets', 'resi', 0, 48],
  ['CAM-15', 'Beach Entrance', 'Beach', 'beach', -20, -31], ['CAM-16', 'Beach Promenade', 'Beach', 'beach', 25, -31], ['CAM-17', 'Clubhouse Entrance', 'Clubhouse & Hotel', 'lobby', 0, -1], ['CAM-18', 'Hotel Lobby', 'Clubhouse & Hotel', 'lobby', 48, -8], ['CAM-19', 'Hotel Pool', 'Pools', 'pool', 58, -20], ['CAM-20', 'Beachfront Pool', 'Pools', 'pool', 0, -20], ['CAM-21', 'Lagoon Pool', 'Pools', 'pool', 0, 32],
  ['CAM-22', 'Parking Area A', 'Parking', 'parking', -20, 26], ['CAM-23', 'Parking Area B', 'Parking', 'parking', 22, 26], ['CAM-24', 'Staff & Service Entrance', 'Service', 'gate', 62, 30], ['CAM-25', 'Central Road', 'Roads', 'road', 20, .5], ['CAM-26', 'Roundabout', 'Roads', 'road', 0, -9]].map(a => ({ id: a[0], name: a[1], zone: a[2], type: a[3], x: a[4], z: a[5] }))
const DEV0 = () => {
  const d = [], add = (id, name, type, loc) => d.push({ id, name, type, loc, status: 'Operational', fault: '', detected: '', ticket: '', tech: '', eta: '', history: [] })
  CAMS.forEach(c => add(c.id, c.name + ' camera', 'Camera', c.zone))
  ;['NVR-01', 'NVR-02', 'NVR-03'].forEach((n, i) => add(n, 'Recording server ' + (i + 1), 'NVR / Recorder', 'Security data room'))
  GATES.forEach((g, i) => { const k = String(i + 1).padStart(2, '0'); add('QRS-' + k, 'QR scanner – ' + g.name, 'QR scanner', g.name); add('ACP-' + k, 'Access panel – ' + g.name, 'Access-control panel', g.name); add('BAR-' + k, 'Barrier – ' + g.name, 'Automatic barrier', g.name); add('GC-' + k, 'Gate controller – ' + g.name, 'Gate controller', g.name) })
  for (let i = 1; i <= 6; i++) add('SW-0' + i, 'Network switch ' + i, 'Network switch', i < 4 ? 'Gate cabinet ' + i : 'Zone cabinet ' + i)
  ;['Tamper sensor', 'Loop detector', 'Motion sensor', 'Vehicle sensor', 'Door contact', 'Glass-break sensor'].forEach((n, i) => add('SN-0' + (i + 1), n, 'Sensor', GATES[i].name))
  const set = (id, st, fault, tech, ticket, eta, det) => Object.assign(d.find(y => y.id === id), { status: st, fault, tech, ticket, eta, detected: det, history: [{ t: det, e: 'Fault detected: ' + fault }, ...(ticket ? [{ t: det, e: 'Ticket ' + ticket + ' opened, technician ' + tech + ' assigned' }] : [])] })
  set('CAM-07', 'Under maintenance', 'Lens obstruction / housing cleaning', 'Karim H.', 'MT-2201', 'Today 15:30', 'Today 07:42')
  set('CAM-16', 'Offline', 'Network link lost (PoE port on SW-04)', '', '', 'Pending dispatch', 'Today 09:05')
  set('CAM-22', 'Fault detected', 'Recording failure – storage write error on NVR-02', '', '', 'Pending dispatch', 'Today 08:20')
  set('QRS-04', 'Fault detected', 'QR reader module failure', '', '', 'Pending dispatch', 'Today 10:11')
  return d
}
const camInfo = (S, c) => { const d = S.devices.find(x => x.id === c.id), st = d.status === 'Offline' ? 'Offline' : d.status === 'Fault detected' ? 'Fault' : (d.status === 'Under maintenance' || d.status === 'Repair in progress') ? 'Maintenance' : 'Online', h = hash(c.id) % 9
  return { d, st, rec: { Online: 'Recording', Fault: 'Error', Offline: 'Stopped', Maintenance: 'Paused' }[st], health: { Online: 91 + h, Fault: 62, Offline: 0, Maintenance: 40 }[st], seen: st === 'Offline' || st === 'Maintenance' ? d.detected : 'Just now', feed: st === 'Offline' ? 'OFFLINE' : st === 'Maintenance' ? 'UNAVAILABLE' : S.streams[c.id] ? 'REAL (configured)' : 'SIMULATED' } }
const QT = ['Resident', 'Guest', 'Vehicle', 'Beach Access', 'Clubhouse', 'Hotel Guest', 'Delivery', 'Maintenance Service', 'Temporary Staff']
function genQR(units) {
  const r = rng(21), out = [], pool = units.filter(u => u.handover === 'Handed over' && u.occupancy === 'Occupied')
  for (let i = 0; i < 60; i++) { const ty = QT[i % 9], u = pool[Math.floor(r() * pool.length)], x = r(), st = i < 9 ? (i === 6 ? 'Expired' : i === 8 ? 'Revoked' : 'Active') : i === 15 ? 'Active' : x < .12 ? 'Expired' : x < .18 ? 'Revoked' : 'Active', hasUnit = ['Resident', 'Guest', 'Vehicle', 'Beach Access', 'Clubhouse'].includes(ty)
    out.push({ id: 'QR-' + (1000 + i), type: ty, unit: hasUnit ? u.id : '', holder: ty === 'Resident' || ty === 'Vehicle' ? 'Resident of ' + u.id : hasUnit ? 'Guest of ' + u.id : ty === 'Hotel Guest' ? 'Hotel guest, room ' + (100 + Math.floor(r() * 220)) : ty === 'Delivery' ? 'Courier ' + String.fromCharCode(65 + i % 6) : 'Staff member S' + (10 + i), state: st, from: '2026-10-' + String(10 + i % 15), exp: st === 'Expired' ? '2026-11-0' + (1 + i % 4) : '2026-12-' + String(10 + i % 20) }) }
  return out
}
const verify = (qrs, id, events) => { const q = qrs.find(x => x.id === id)
  if (!q) return { result: 'Unauthorized QR', dec: 'Denied', reason: 'QR is not registered in the access system' }
  if (q.state === 'Revoked') return { result: 'Revoked QR', dec: 'Denied', reason: 'Permission revoked by administrator' }
  if (q.state === 'Suspended') return { result: 'Access denied', dec: 'Denied', reason: 'Access suspended pending review' }
  if (q.state === 'Expired') return { result: 'Expired QR', dec: 'Denied', reason: 'Validity ended ' + q.exp }
  if (events.some(e => e.qr === id && e.dec === 'Approved' && Date.now() - e.ts < 8000)) return { result: 'Duplicate scan', dec: 'Denied', reason: 'Same QR scanned within 8 seconds' }
  return { result: { Resident: 'Valid QR', Vehicle: 'Valid QR', Guest: 'Temporary visitor access', 'Beach Access': 'Temporary visitor access', Clubhouse: 'Temporary visitor access', 'Hotel Guest': 'Temporary visitor access', Delivery: 'Delivery access', 'Maintenance Service': 'Staff access', 'Temporary Staff': 'Staff access' }[q.type], dec: 'Approved', reason: '' } }
const clsOf = (q, units) => { if (q.type === 'Delivery') return 'Delivery'; if (q.type === 'Maintenance Service' || q.type === 'Temporary Staff') return 'Staff'; if (q.type === 'Resident' || q.type === 'Vehicle') { const u = units.find(x => x.id === q.unit); return u && u.ownership === 'Rented' ? 'Tenant' : 'Owner' } return 'Guest' }
function seedEvents(qrs, units) {
  const r = rng(33), out = []; let ts = Date.now()
  for (let i = 0; i < 80; i++) { ts -= (60 + r() * 150) * 1000; const q = qrs[Math.floor(r() * qrs.length)], g = GATES[Math.floor(r() * 7)], veh = r() < .4 ? 'DEMO-' + (1000 + Math.floor(r() * 9000)) : '', v = verify(qrs, q.id, [])
    out.push({ id: 'EV-S' + i, ts, gate: g.id, ref: (veh ? 'VH-' : 'P-') + (hash(q.id + i) % 9000 + 1000), cls: clsOf(q, units), dir: r() < .55 ? 'Entry' : 'Exit', qr: q.id, unit: q.unit, type: q.type, valid: q.from + ' → ' + q.exp, veh, sim: true, cam: g.cams[0], ...v }) }
  return out
}
const seedInc = () => { const t = k => new Date(Date.now() - k * 60000).toLocaleTimeString(); return [
  { id: 'SEC-101', sev: 'Critical', time: t(12), loc: 'Main Entrance Gate', ref: 'GATE-01', dev: 'QRS-01', desc: 'Repeated rejected QR scans (4) – QR-1006', status: 'New', assignee: '', notes: [] },
  { id: 'SEC-102', sev: 'Warning', time: t(95), loc: 'Beach Promenade', ref: 'CAM-16', dev: 'CAM-16', desc: 'Camera disconnected – network link lost', status: 'Under investigation', assignee: 'IT Security', notes: [] },
  { id: 'SEC-103', sev: 'Warning', time: t(140), loc: 'Parking Area A', ref: 'CAM-22', dev: 'CAM-22', desc: 'Recording failure – NVR-02 storage write error', status: 'Assigned', assignee: 'IT Security', notes: [] },
  { id: 'SEC-104', sev: 'Warning', time: t(60), loc: 'East Service Gate', ref: 'GATE-03', dev: 'QRS-04', desc: 'QR scanner fault – reader module failure', status: 'New', assignee: '', notes: [] },
  { id: 'SEC-105', sev: 'Normal', time: t(200), loc: 'Hotel Gate', ref: 'GATE-06', dev: 'SN-04', desc: 'Unusual gate activity – 18 vehicles in 10 min (peak check-in)', status: 'Resolved', assignee: 'Gate Supervisor', notes: [{ t: t(190), u: 'Security Supervisor', text: 'Peak check-in traffic, no action required.' }] },
  { id: 'SEC-106', sev: 'Critical', time: t(400), loc: 'West Residents Gate', ref: 'GATE-04', dev: 'QRS-04', desc: 'Unauthorized entry attempt – unregistered QR', status: 'Closed', assignee: 'Security Team A', notes: [] }] }
const verifyGuest = (g, gate, dir, events) => { const st = gStatus(g), D = (result, reason) => ({ result, dec: 'Denied', reason })
  if (events.some(e => e.qr === g.qrId && e.dec === 'Approved' && Date.now() - e.ts < 8000)) return D('Duplicate scan', 'Same QR scanned within 8 seconds')
  if (dir === 'Exit') return g.inside ? { result: 'Temporary visitor access', dec: 'Approved', reason: '' } : D('Access denied', 'No matching entry recorded')
  if (st === 'Revoked') return D('Revoked QR', 'Permission revoked by administrator'); if (st === 'Used') return D('Access denied', 'Single-use invitation already used'); if (st === 'Expired') return D('Expired QR', 'Validity ended ' + fmtDT(g.expireAt)); if (st === 'Pending') return D('Access denied', 'Invitation not yet active (starts ' + fmtDT(g.activateAt) + ')')
  if (!g.gates.includes('ALL') && !g.gates.includes(gate)) return D('Access denied', 'Gate not permitted for this invitation')
  if (g.inside) return D('Access denied', 'Guest already inside (anti-passback)')
  return { result: 'Temporary visitor access', dec: 'Approved', reason: '' } }
function useSecurity(units, addAlert) {
  const [S, setS] = useState(() => { const qrs = genQR(units), gs = seedGuests(units); return { role: ROLES[0], guests: gs.gs, qrs, devices: DEV0(), gates: GATES.map(g => ({ id: g.id, status: 'Operational', barrier: 'Closed', net: 'Online', health: 95 + hash(g.id) % 5 })), events: [...gs.evs, ...seedEvents(qrs, units)].sort((a, b) => b.ts - a.ts), incidents: seedInc(), audit: [{ t: new Date().toLocaleString(), u: 'System', a: 'Security center initialised (demo data)', o: '—' }], streams: {}, ticket: 2202, inc: 107 } })
  const R = useRef(S); R.current = S
  const upd = fn => { const n = fn(R.current); R.current = n; setS(n) }
  const aud = (s, a, o) => [{ t: new Date().toLocaleString(), u: s.role, a, o }, ...s.audit].slice(0, 300)
  const deny = (a, o) => { upd(s => ({ ...s, audit: aud(s, 'DENIED: ' + a, o) })); return 'denied' }
  const A = {}, ok = p => can(R.current.role, p), gname = id => GATES.find(g => g.id === id).name
  A.setRole = r => upd(s => ({ ...s, role: r, audit: aud({ ...s, role: r }, 'Switched role (demo sign-in)', r) }))
  A.setQrs = f => upd(s => ({ ...s, qrs: typeof f === 'function' ? f(s.qrs) : f }))
  A.raise = inc => { upd(s => ({ ...s, inc: s.inc + 1, incidents: [{ id: 'SEC-' + s.inc, time: new Date().toLocaleTimeString(), status: 'New', assignee: '', notes: [], ...inc }, ...s.incidents] })); if (inc.sev !== 'Normal') addAlert({ sev: inc.sev, fac: inc.loc, desc: inc.desc, act: 'Open Security & Gate Control → Incidents' }) }
  A.push = ev => { upd(s => ({ ...s, events: [ev, ...s.events].slice(0, 500) })); if (ev.dec === 'Denied') { const n = R.current.events.filter(e => e.qr === ev.qr && e.dec === 'Denied' && Date.now() - e.ts < 600000).length
    if (ev.result === 'Unauthorized QR') A.raise({ sev: 'Critical', loc: gname(ev.gate), ref: ev.gate, dev: 'QRS-' + ev.gate.slice(-2), desc: 'Unauthorized QR presented (' + ev.qr + ')' })
    else if (n === 3 && !R.current.incidents.some(i => i.desc.includes(ev.qr) && !['Resolved', 'Closed'].includes(i.status))) A.raise({ sev: 'Warning', loc: gname(ev.gate), ref: ev.gate, dev: 'QRS-' + ev.gate.slice(-2), desc: 'Repeated rejected QR scans – ' + ev.qr }) } }
  A.scan = (qrId, gateId, dir, veh, sim) => { const s = R.current, g = s.gates.find(x => x.id === gateId), gu = s.guests.find(x => x.qrId === qrId), q = gu ? guestQR(gu) : s.qrs.find(x => x.id === qrId); dir = dir || 'Entry'
    let v = gu ? verifyGuest(gu, gateId, dir, s.events) : verify(s.qrs, qrId, s.events); if (g.status === 'Closed') v = { result: 'Access denied', dec: 'Denied', reason: 'Gate closed by operator' }
    const ev = { id: 'EV-' + Date.now() + Math.floor(Math.random() * 999), ts: Date.now(), gate: gateId, ref: gu ? 'G-REF-' + gu.id.slice(2) : (veh ? 'VH-' : 'P-') + (hash(qrId + s.events.length) % 9000 + 1000), cls: gu ? 'Guest' : q ? clsOf(q, units) : 'Unknown', dir, qr: qrId, unit: q ? q.unit : '', type: q ? q.type : '—', valid: gu ? fmtDT(gu.activateAt) + ' → ' + fmtDT(gu.expireAt) : q ? q.from + ' → ' + q.exp : '—', veh: veh || (gu ? gu.plate : ''), sim: !!sim, guest: gu ? gu.id : '', cam: GATES.find(x => x.id === gateId).cams[0], ...v }
    A.push(ev); if (gu && ev.dec === 'Approved') upd(x => ({ ...x, guests: x.guests.map(y => y.id !== gu.id ? y : { ...y, inside: dir === 'Entry', used: dir === 'Exit' && y.singleUse ? true : y.used }) })); return ev }
  A.createGuest = (f, asOwner) => { if (!asOwner && !ok('qrAdmin')) return deny('Create guest invitation', f.unit); const a = new Date(f.date + 'T' + f.start).getTime(), b = new Date(f.date + 'T' + f.end).getTime(); if (!(b > a)) return { err: 'Expiration time must be after the start time.' }
    const s = R.current, u = units.find(x => x.id === f.unit), n = Math.max(...s.guests.map(x => +x.id.slice(2)), 100) + 1, g = { id: 'G-' + n, name: f.name.trim(), unit: f.unit, hostName: u ? u.owner : 'Host', gates: f.gate === 'ALL' ? ['ALL'] : [f.gate], zones: f.zones.length ? f.zones : ['Resort entry'], plate: f.plate.trim(), singleUse: false, revoked: false, used: false, inside: false, token: mkToken(), old: [], qrId: 'QR-G' + n + '-1', issuedAt: Date.now(), activateAt: a, expireAt: b, tl: [] }
    upd(x => ({ ...x, guests: [g, ...x.guests], audit: aud(x, asOwner ? 'Guest invitation created (owner)' : 'Guest invitation created', g.id) })); return g }
  A.guestAct = (id, act, asOwner) => { if (!asOwner && !ok('qrAdmin')) return deny('Guest QR ' + act, id); const now = Date.now()
    upd(s => ({ ...s, guests: s.guests.map(g => { if (g.id !== id) return g; const add = (txt, o) => ({ ...g, ...o, tl: [...g.tl, { ts: now, txt }] })
      if (act === 'revoke' || act === 'suspend') return add(act === 'suspend' ? 'Access suspended by administrator' : 'QR revoked by administrator', { revoked: true }); if (act === 'reinstate') return add('Access reinstated', { revoked: false })
      if (act === 'regen') return add('New QR generated (previous QR replaced)', { token: mkToken(), old: [g.token, ...g.old] })
      if (act === 'renew') return add('Invitation renewed (+6 h)', { token: mkToken(), old: [g.token, ...g.old], revoked: false, used: false, expireAt: Math.max(now, g.expireAt) + 6 * 3600000, activateAt: Math.min(g.activateAt, now) }); return g }), audit: aud(s, 'Guest QR ' + act, id) })) }
  A.scanToken = (token, gate, dir, sim) => { const s = R.current, g = s.guests.find(x => x.token === token); if (g) return A.scan(g.qrId, gate, dir, '', sim); const o = s.guests.find(x => x.old.includes(token))
    if (o) { const ev = { id: 'EV-' + Date.now(), ts: Date.now(), gate, ref: 'G-REF-' + o.id.slice(2), cls: 'Guest', dir, qr: o.qrId, unit: o.unit, type: 'Guest', valid: '—', veh: '', sim: !!sim, guest: o.id, cam: GATES.find(x => x.id === gate).cams[0], result: 'Revoked QR', dec: 'Denied', reason: 'QR was replaced by a newer version' }; A.push(ev); return ev } return A.scan('QR-UNKNOWN', gate, dir, '', sim) }
  A.random = () => { const s = R.current, q = Math.random() < .92 ? s.qrs[Math.floor(Math.random() * s.qrs.length)] : { id: 'QR-9' + Math.floor(100 + Math.random() * 900) }; A.scan(q.id, GATES[Math.floor(Math.random() * 7)].id, Math.random() < .55 ? 'Entry' : 'Exit', Math.random() < .4 ? 'DEMO-' + (1000 + Math.floor(Math.random() * 9000)) : '', true) }
  A.demo = e => { const s = R.current, pk = f => (s.qrs.find(f) || s.qrs[0]).id, m = { resident: pk(q => q.type === 'Resident' && q.state === 'Active'), guest: pk(q => q.type === 'Guest' && q.state === 'Active'), expired: pk(q => q.state === 'Expired' && q.type === 'Delivery'), deliv: pk(q => q.type === 'Delivery' && q.state === 'Active') }; A.scan(m[e.rec.q], 'GATE-01', e.rec.dir, e.rec.veh, true) }
  A.barrier = id => { if (!ok('gateCtl')) return deny('Barrier control', id); upd(s => ({ ...s, gates: s.gates.map(g => g.id === id ? { ...g, barrier: g.barrier === 'Closed' ? 'Open' : 'Closed' } : g), audit: aud(s, 'Barrier toggled', id) })) }
  A.gateStatus = (id, st) => { if (!ok('gateCtl')) return deny('Gate status change', id); upd(s => ({ ...s, gates: s.gates.map(g => g.id === id ? { ...g, status: st } : g), audit: aud(s, 'Gate status set to ' + st, id) })) }
  A.qrState = (id, st) => { if (!ok('qrAdmin')) return deny('QR permission change', id); const gu = R.current.guests.find(x => x.qrId === id); if (gu) return A.guestAct(gu.id, st === 'Revoked' ? 'revoke' : st === 'Suspended' ? 'suspend' : 'reinstate'); upd(s => ({ ...s, qrs: s.qrs.map(q => q.id === id ? { ...q, state: st } : q), audit: aud(s, st === 'Revoked' ? 'QR revoked' : st === 'Suspended' ? 'Access suspended' : 'Access reinstated', id) })) }
  A.advance = id => { if (!ok('incidents')) return deny('Incident workflow', id); const F = ['New', 'Under investigation', 'Assigned', 'Resolved', 'Closed']; upd(s => ({ ...s, incidents: s.incidents.map(i => i.id === id ? { ...i, status: F[Math.min(4, F.indexOf(i.status) + 1)] } : i), audit: aud(s, 'Incident advanced', id) })) }
  A.assign = (id, team) => { if (!ok('assign')) return deny('Incident assignment', id); upd(s => ({ ...s, incidents: s.incidents.map(i => i.id === id ? { ...i, assignee: team, status: ['New', 'Under investigation'].includes(i.status) ? 'Assigned' : i.status } : i), audit: aud(s, 'Incident assigned to ' + team, id) })) }
  A.note = (id, text) => { if (!ok('incidents')) return deny('Investigation note', id); upd(s => ({ ...s, incidents: s.incidents.map(i => i.id === id ? { ...i, notes: [...i.notes, { t: new Date().toLocaleTimeString(), u: s.role, text }] } : i), audit: aud(s, 'Investigation note added', id) })) }
  A.devAct = (id, act, tech) => { if (!ok('maint')) return deny('Equipment action ' + act, id); const now = 'Today ' + new Date().toTimeString().slice(0, 5)
    upd(s => { const D = { dispatch: ['Under maintenance', 'Technician ' + tech + ' dispatched'], start: ['Repair in progress', 'Repair started'], complete: ['Maintenance completed', 'Repair completed and tested'], return: ['Operational', 'Returned to service'] }[act]
      return { ...s, ticket: s.ticket + (act === 'dispatch' && !s.devices.find(d => d.id === id).ticket ? 1 : 0), devices: s.devices.map(d => d.id !== id ? d : { ...d, status: D[0], tech: act === 'dispatch' ? tech : d.tech, ticket: d.ticket || (act === 'dispatch' ? 'MT-' + s.ticket : ''), eta: act === 'dispatch' ? 'Today +3 h' : act === 'complete' || act === 'return' ? 'Done' : d.eta, fault: act === 'return' ? '' : d.fault, history: [{ t: now, e: D[1] }, ...d.history] }),
        incidents: act === 'complete' ? s.incidents.map(i => i.dev === id && !['Resolved', 'Closed'].includes(i.status) ? { ...i, status: 'Resolved' } : i) : s.incidents, audit: aud(s, 'Equipment: ' + D[1], id) } }) }
  A.simFault = () => { const s = R.current, c = s.devices.filter(d => d.status === 'Operational'), d = c[Math.floor(Math.random() * c.length)], st = d.type === 'Camera' && Math.random() < .5 ? 'Offline' : 'Fault detected', now = 'Today ' + new Date().toTimeString().slice(0, 5), tk = 'MT-' + s.ticket, why = st === 'Offline' ? 'Connection lost' : 'Fault detected (self-test failed)'
    upd(x => ({ ...x, ticket: x.ticket + 1, devices: x.devices.map(y => y.id === d.id ? { ...y, status: st, fault: why + ' – simulated', detected: now, ticket: tk, tech: '', eta: 'Pending dispatch', history: [{ t: now, e: why + ', ticket ' + tk + ' generated automatically' }] } : y) }))
    const gk = /^(QRS|ACP|BAR|GC)-(\d\d)/.exec(d.id); A.raise({ sev: 'Warning', loc: d.loc, ref: d.type === 'Camera' ? d.id : gk ? 'GATE-' + gk[2] : '', dev: d.id, desc: d.name + ' – ' + why.toLowerCase() + ' (maintenance ticket ' + tk + ' generated)' }) }
  A.setStream = (id, url) => { if (!ok('stream')) return deny('Stream configuration', id); upd(s => { const st = { ...s.streams }; if (url) st[id] = url; else delete st[id]; return { ...s, streams: st, audit: aud(s, url ? 'Real stream configured' : 'Real stream removed', id) } }) }
  return { S, A }
}
const secStatus = S => { const m = {}; CAMS.forEach(c => { const i = camInfo(S, c); m[c.id] = i.st === 'Online' ? 'ok' : i.st === 'Offline' ? 'off' : 'warn' }); GATES.forEach(g => { m[g.id] = S.gates.find(x => x.id === g.id).status === 'Operational' ? 'ok' : 'warn' }); S.incidents.filter(i => !['Resolved', 'Closed'].includes(i.status) && i.sev === 'Critical').forEach(i => { if (i.ref && m[i.ref] !== undefined) m[i.ref] = 'hot' }); return m }
const gateStats = (S, id) => { const e = S.events.filter(x => x.gate === id), g = S.gates.find(x => x.id === id); return { g, entries: e.filter(x => x.dir === 'Entry' && x.dec === 'Approved').length, exits: e.filter(x => x.dir === 'Exit' && x.dec === 'Approved').length, denied: e.filter(x => x.dec === 'Denied').length, traffic: e.filter(x => Date.now() - x.ts < 600000).length } }
const secKpi = (S, M) => { const ci = CAMS.map(c => camInfo(S, c)), ap = S.events.filter(e => e.dec === 'Approved'), en = ap.filter(e => e.dir === 'Entry'), ex = ap.filter(e => e.dir === 'Exit')
  return { cams: CAMS.length, online: ci.filter(c => c.st === 'Online' || c.st === 'Fault').length, offline: ci.filter(c => c.st === 'Offline').length, maint: ci.filter(c => c.st === 'Maintenance').length, gates: GATES.length, active: S.gates.filter(g => g.status === 'Operational').length, entries: en.length, exits: ex.length,
    visitors: Math.max(0, Math.round(M.visitors / 30 * 3) + en.length - ex.length), vehicles: Math.max(0, Math.round(M.occU * .12) + en.filter(e => e.veh).length - ex.filter(e => e.veh).length), approved: ap.length, denied: S.events.length - ap.length, open: S.incidents.filter(i => !['Resolved', 'Closed'].includes(i.status)).length } }
/* ============ SIMULATED SURVEILLANCE SCENES (procedural animation – always labeled SIMULATED) ============ */
const kf = (t, pts) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0] || 1) } return pts[pts.length - 1][1] }
const sg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a))), es = x => x * x * (3 - 2 * x)
const pill = (g, x, y, txt, col, s) => { g.font = `bold ${s * .9}px sans-serif`; const w = g.measureText(txt).width + s; g.fillStyle = col; g.fillRect(x - w / 2, y - s * .9, w, s * 1.4); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(txt, x, y + s * .1); g.textAlign = 'left' }
const topCar = (g, x, y, s, col, dir, van) => { g.save(); g.translate(x, y); if (dir < 0) g.scale(-1, 1); const L = (van ? 5.4 : 4.4) * s, W = 2.1 * s; g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-L / 2 + s * .25, -W / 2 + s * .3, L, W); g.fillStyle = col; g.fillRect(-L / 2, -W / 2, L, W); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-L * .28, -W * .36, L * .42, W * .72); g.fillStyle = '#7fb6d6'; g.fillRect(L * .16, -W * .4, L * .13, W * .8); g.fillRect(-L * .34, -W * .38, L * .06, W * .76); g.fillStyle = '#ffe9a8'; g.fillRect(L / 2 - s * .25, -W * .38, s * .25, W * .22); g.fillRect(L / 2 - s * .25, W * .16, s * .25, W * .22); g.restore() }
const topPerson = (g, x, y, s, col, ph) => { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + s * .2, y + s * .25, s * .8, s * .45, 0, 0, 6.3); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(x, y + Math.sin(ph) * s * .12, s * .55, s * .85, 0, 0, 6.3); g.fill(); g.fillStyle = '#e9c9ad'; g.beginPath(); g.arc(x, y + Math.sin(ph) * s * .12, s * .38, 0, 6.3); g.fill() }
const topPalm = (g, x, y, s) => { g.fillStyle = '#4aa88e'; for (let i = 0; i < 7; i++) { g.save(); g.translate(x, y); g.rotate(i * .9); g.beginPath(); g.ellipse(s * .75, 0, s * .8, s * .17, 0, 0, 6.3); g.fill(); g.restore() } g.fillStyle = '#7a5a3a'; g.beginPath(); g.arc(x, y, s * .18, 0, 6.3); g.fill() }
function drawGate(g, w, h, t) {
  t = ((t % 60) + 60) % 60; const s = h / 18, W = f => f * w, H = f => f * h
  g.fillStyle = '#c4e6d6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { topPalm(g, W(i / 11 + .02 * Math.sin(i)), H(.1 + (i % 3) * .05), s * 1.5) }
  g.fillStyle = '#c3cfda'; g.fillRect(0, H(.30), w, H(.48)); g.fillStyle = '#ece3cf'; g.fillRect(0, H(.80), w, H(.1)); g.fillStyle = '#c4e6d6'; g.fillRect(0, H(.9), w, H(.1))
  for (let i = 0; i < 9; i++) topPalm(g, W(i / 8), H(.96), s * 1.4)
  g.strokeStyle = '#fff'; g.lineWidth = s * .12; g.setLineDash([s * 1.6, s * 1.4]); g.beginPath(); g.moveTo(0, H(.54)); g.lineTo(w, H(.54)); g.stroke(); g.setLineDash([]); g.beginPath(); g.moveTo(0, H(.31)); g.lineTo(w, H(.31)); g.moveTo(0, H(.77)); g.lineTo(w, H(.77)); g.stroke()
  g.fillStyle = 'rgba(80,100,120,.55)'; g.font = `bold ${s * .9}px sans-serif`; g.fillText('EXIT  ←', W(.04), H(.37)); g.fillText('ENTRY  →', W(.04), H(.72))
  g.fillStyle = '#f7fafc'; g.fillRect(W(.47), H(.45), W(.06), H(.18)); g.fillStyle = '#91C9ED'; g.fillRect(W(.475), H(.455), W(.05), H(.17) * .6); g.fillStyle = '#65B6E5'; g.fillRect(W(.47), H(.45), W(.06), s * .5)
  const aIn = es(sg(t, 11, 12.5)) - es(sg(t, 17.5, 19)) + es(sg(t, 51, 52.5)) - es(sg(t, 57, 58.5)), aOut = es(sg(t, 33, 34.5)) - es(sg(t, 40, 41.5))
  const arm = (bx, by, ang, L) => { const ex = bx + Math.cos(ang) * L, ey = by + Math.sin(ang) * L; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.lineWidth = s * .55; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke(); g.strokeStyle = '#e5675f'; g.setLineDash([s * .8, s * .8]); g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]); g.fillStyle = '#4b6178'; g.beginPath(); g.arc(bx, by, s * .6, 0, 6.3); g.fill() }
  arm(W(.56), H(.78), -Math.PI / 2 + aIn * 1.35, H(.24)); arm(W(.44), H(.30), Math.PI / 2 + aOut * 1.35, H(.24))
  const led = (x, y, a, b, c, d, bad) => { const c0 = t >= a && t < b ? ('rgba(80,200,230,' + (.6 + .4 * Math.sin(t * 14)) + ')') : t >= b && t < c ? '#35c9a0' : bad && t >= d[0] && t < d[1] ? '#e5675f' : '#8aa0b2'; g.fillStyle = '#334'; g.fillRect(x - s * .5, y - s * .8, s, s * 1.6); g.fillStyle = c0; g.beginPath(); g.arc(x, y, s * .38, 0, 6.3); g.fill() }
  led(W(.42), H(.785), 9.5, 14, 14, [44, 47.5], false); if (t >= 44 && t < 47.5) { g.fillStyle = '#e5675f'; g.beginPath(); g.arc(W(.42), H(.785), s * .38, 0, 6.3); g.fill() } if (t >= 49 && t < 50) { g.fillStyle = 'rgba(80,200,230,.9)'; g.beginPath(); g.arc(W(.42), H(.785), s * .38, 0, 6.3); g.fill() } if (t >= 50 && t < 53) { g.fillStyle = '#35c9a0'; g.beginPath(); g.arc(W(.42), H(.785), s * .38, 0, 6.3); g.fill() }
  led(W(.60), H(.84), 16, 21, 21, [0, 0]); if (t >= 42.5 && t < 46) { g.fillStyle = t < 43.5 ? 'rgba(80,200,230,.9)' : '#35c9a0'; g.beginPath(); g.arc(W(.60), H(.84), s * .38, 0, 6.3); g.fill() }
  led(W(.55), H(.325), 31, 37, 37, [0, 0])
  const cx = (a, b, c, d) => kf(t, [[a, b], [c, d]])
  const carA = kf(t, [[0, -.12], [9, .44], [13, .44], [24, 1.15]]); topCar(g, W(carA), H(.66), s, '#f3f6f9', 1)
  const carB = kf(t, [[24, 1.12], [32, .58], [35, .58], [46, -.15]]); if (t >= 24 && t <= 46) topCar(g, W(carB), H(.42), s, '#8fb8d6', -1)
  const van = kf(t, [[34, -.2], [43, .44], [52, .44], [60, 1.05]]); if (t >= 34) topCar(g, W(van), H(.66), s, '#e8c98a', 1, true)
  const p1 = kf(t, [[4, -.05], [16, .6], [19, .6], [30, 1.08]]); if (t >= 4 && t < 30) topPerson(g, W(p1), H(.84), s * .7, '#65B6E5', t * 7)
  const p2 = kf(t, [[40, 1.06], [43, .62], [44, .62], [52, -.06]]); if (t >= 40 && t < 52) topPerson(g, W(p2), H(.87), s * .7, '#C8A96A', t * 7)
  const gx = kf(t, [[44.5, .5], [47, .46], [49, .46], [51, .5]]), gy = kf(t, [[44.5, .54], [47, .75], [49, .75], [51, .54]]); topPerson(g, W(t > 44.5 && t < 51 ? gx : .5), H(t > 44.5 && t < 51 ? gy : .54), s * .8, '#2f4b66', t * 7)
  topPerson(g, W(.9), H(.2), s * .7, '#9fb4c4', t); topPerson(g, W(.13), H(.88), s * .7, '#ffffff', t * 2)
  if (t >= 11 && t < 14) pill(g, W(.45), H(.80), 'QR VALID – APPROVED', '#2aa198', s); if (t >= 17.8 && t < 21) pill(g, W(.6), H(.80), 'VISITOR APPROVED', '#2aa198', s)
  if (t >= 33 && t < 37) pill(g, W(.55), H(.27), 'EXIT RECORDED', '#2aa198', s); if (t >= 44 && t < 47.5) pill(g, W(.44), H(.81), 'QR EXPIRED – DENIED', '#e5675f', s); if (t >= 50 && t < 53) pill(g, W(.44), H(.81), 'DELIVERY APPROVED', '#2aa198', s); if (t >= 43.5 && t < 46) pill(g, W(.6), H(.80), 'VISITOR EXIT', '#65B6E5', s)
}
function drawZone(g, w, h, t, type, sd) {
  const s = h / 16, W = f => f * w, H = f => f * h, r = rng(sd + 3)
  if (type === 'pool') { g.fillStyle = '#e8e0cc'; g.fillRect(0, 0, w, h); g.fillStyle = '#6fd3d0'; g.fillRect(W(.12), H(.18), W(.76), H(.56)); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (let i = 0; i < 7; i++) { g.beginPath(); for (let x = 0; x <= 1; x += .05) g.lineTo(W(.12 + .76 * x), H(.22 + i * .075 + .012 * Math.sin(x * 12 + t * 2 + i))); g.stroke() } for (let i = 0; i < 6; i++) { g.fillStyle = '#fff'; g.fillRect(W(.14 + i * .13), H(.8), W(.07), H(.09)) } for (let i = 0; i < 4; i++) { const x = .2 + .6 * (.5 + .5 * Math.sin(t * (.3 + i * .1) + i * 2)), y = .3 + .35 * (.5 + .5 * Math.sin(t * (.25 + i * .07) + i)); topPerson(g, W(x), H(y), s * .6, ['#e5675f', '#fff', '#65B6E5', '#C8A96A'][i], t * 4) } topPalm(g, W(.06), H(.1), s * 1.6); topPalm(g, W(.94), H(.9), s * 1.6) }
  else if (type === 'beach') { g.fillStyle = '#f1e6c8'; g.fillRect(0, 0, w, h); const sea = g.createLinearGradient(0, 0, 0, H(.45)); sea.addColorStop(0, '#2aa6c9'); sea.addColorStop(1, '#8fe0e6'); g.fillStyle = sea; g.fillRect(0, 0, w, H(.42)); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); for (let x = 0; x <= 1.01; x += .04) g.lineTo(W(x), H(.1 + i * .09 + .015 * Math.sin(x * 14 - t * 2 + i))); g.stroke() } for (let i = 0; i < 6; i++) { g.fillStyle = ['#fff', '#e5675f', '#65B6E5'][i % 3]; g.beginPath(); g.arc(W(.1 + i * .16), H(.62 + (i % 2) * .15), s * .9, 0, 6.3); g.fill() } for (let i = 0; i < 5; i++) topPerson(g, W(((t * (.02 + i * .006) * (i % 2 ? 1 : -1) + i * .21) % 1 + 1) % 1), H(.5 + i * .07), s * .55, ['#2f4b66', '#C8A96A', '#65B6E5', '#e5675f', '#fff'][i], t * 6) }
  else if (type === 'parking') { g.fillStyle = '#c3cfda'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 2; for (let r2 = 0; r2 < 2; r2++) for (let i = 0; i < 8; i++) { const x = W(.06 + i * .115), y = H(r2 ? .62 : .1); g.strokeRect(x, y, W(.1), H(.28)); if (r() < .6) { g.fillStyle = ['#f3f6f9', '#8fb8d6', '#C8A96A', '#2f4b66'][Math.floor(r() * 4)]; g.fillRect(x + W(.015), y + H(.04), W(.07), H(.2)); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x + W(.02), y + H(.09), W(.06), H(.07)) } } topCar(g, W(((t * .05) % 1.2) - .1), H(.5), s * .8, '#e8c98a', 1); topPerson(g, W(.3 + .2 * Math.sin(t * .4)), H(.5), s * .5, '#65B6E5', t * 6) }
  else if (type === 'road') { g.fillStyle = '#c4e6d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#c3cfda'; g.fillRect(0, H(.3), w, H(.4)); g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(0, H(.5)); g.lineTo(w, H(.5)); g.stroke(); g.setLineDash([]); for (let i = 0; i < 8; i++) topPalm(g, W(i / 7), H(.14), s * 1.4); for (let i = 0; i < 3; i++) { topCar(g, W(((t * (.07 + i * .02) + i * .4) % 1.3) - .15), H(.6), s * .8, ['#f3f6f9', '#8fb8d6', '#C8A96A'][i], 1); topCar(g, W(1.15 - ((t * (.06 + i * .02) + i * .3) % 1.3)), H(.4), s * .8, ['#2f4b66', '#e8e2d4', '#65B6E5'][i], -1) } topPerson(g, W(((t * .03) % 1)), H(.8), s * .5, '#e5675f', t * 6) }
  else if (type === 'lobby') { g.fillStyle = '#eef3f6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d3dee6'; for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(W(i / 10), 0); g.lineTo(W(i / 10), h); g.stroke() } for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, H(i / 6)); g.lineTo(w, H(i / 6)); g.stroke() } g.fillStyle = '#C8A96A'; g.fillRect(W(.35), H(.12), W(.3), H(.12)); g.fillStyle = '#65B6E5'; g.fillRect(W(.08), H(.55), W(.18), H(.2)); g.fillRect(W(.74), H(.55), W(.18), H(.2)); for (let i = 0; i < 5; i++) topPerson(g, W(.15 + .7 * (.5 + .5 * Math.sin(t * (.2 + i * .05) + i * 1.7))), H(.3 + .5 * (.5 + .5 * Math.sin(t * (.17 + i * .04) + i))), s * .6, ['#2f4b66', '#C8A96A', '#65B6E5', '#e5675f', '#fff'][i], t * 6); topPalm(g, W(.05), H(.1), s * 1.2); topPalm(g, W(.95), H(.1), s * 1.2) }
  else { g.fillStyle = '#c4e6d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8e2d4'; g.fillRect(0, H(.55), w, H(.12)); g.fillRect(W(.45), 0, W(.1), h); for (let i = 0; i < 4; i++) { g.fillStyle = '#f7fafc'; g.fillRect(W(.04 + i * .13), H(.1), W(.1), H(.32)); g.fillStyle = '#1e4f91'; g.fillRect(W(.05 + i * .13), H(.13), W(.08), H(.12)); g.fillStyle = '#f7fafc'; g.fillRect(W(.58 + i * .1), H(.1), W(.08), H(.32)); g.fillStyle = '#1e4f91'; g.fillRect(W(.59 + i * .1), H(.13), W(.06), H(.12)) } for (let i = 0; i < 6; i++) topPalm(g, W(i / 5), H(.8), s * 1.3); for (let i = 0; i < 3; i++) topPerson(g, W(((t * (.03 + i * .01) + i * .3) % 1)), H(.61), s * .55, ['#65B6E5', '#C8A96A', '#2f4b66'][i], t * 6) }
}
function osd(g, w, h, label, right, rec) {
  const k = w / 320, nt = performance.now(), d = new Date(), pd = n => String(n).padStart(2, '0'), ts = d.getFullYear() + '-' + pd(d.getMonth() + 1) + '-' + pd(d.getDate()) + '  ' + pd(d.getHours()) + ':' + pd(d.getMinutes()) + ':' + pd(d.getSeconds())
  g.fillStyle = 'rgba(120,170,200,.08)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.05)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1)
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 26; i++) g.fillRect(Math.random() * w, Math.random() * h, 1.5 * k, 1.5 * k)
  const v = g.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, h * .85); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,30,50,.35)'); g.fillStyle = v; g.fillRect(0, 0, w, h)
  g.font = `bold ${9 * k}px ui-monospace,Consolas,monospace`; g.fillStyle = 'rgba(255,255,255,.92)'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 3; g.fillText(label, 6 * k, 13 * k); g.fillText(ts, 6 * k, h - 6 * k)
  g.textAlign = 'right'
  if (right === 'SIMULATED' || right === 'REAL') { const on = Math.floor(nt / 500) % 2 === 0; g.fillStyle = on ? '#ff3b3b' : 'rgba(255,59,59,.2)'; g.beginPath(); g.arc(w - 36 * k, 10 * k, 3.2 * k, 0, 6.3); g.fill(); g.fillStyle = '#ff6b6b'; g.fillText('LIVE', w - 6 * k, 13 * k); g.font = `bold ${7 * k}px ui-monospace,Consolas,monospace`; g.fillStyle = '#ffe08a'; g.fillText(right === 'REAL' ? 'USER-PROVIDED VIDEO' : 'SIMULATED FEED', w - 6 * k, 23 * k) }
  else { g.fillStyle = '#ffb4ab'; g.fillText(right, w - 6 * k, 13 * k) }
  if (rec) { g.font = `bold ${9 * k}px ui-monospace,Consolas,monospace`; g.fillStyle = rec === 'Error' ? '#ff6b6b' : '#ff4d4d'; g.fillText(rec === 'Error' ? '⚠ REC ERROR' : '● REC', w - 6 * k, h - 6 * k) }
  if (right === 'SIMULATED' || right === 'REAL') { g.textAlign = 'left'; g.font = `bold ${7 * k}px ui-monospace,Consolas,monospace`; g.fillStyle = rec === 'Error' ? '#ffd27a' : '#8bf0c0'; g.fillText((rec === 'Error' ? '● DEGRADED' : '● ONLINE') + '  1080p · 25 fps', 6 * k, 23 * k) }
  g.textAlign = 'left'; g.shadowBlur = 0
}
const GPH = { 'CAM-01': 'gate3', 'CAM-02': 'gate6', 'CAM-03': 'gate1', 'CAM-04': 'gate2', 'CAM-05': 'gate4', 'CAM-06': 'gate7', 'CAM-07': 'gate5', 'CAM-08': 'gate5', 'CAM-09': 'cam09', 'CAM-10': 'cam10', 'CAM-11': 'cam11', 'CAM-12': 'cam12', 'CAM-13': 'cam13', 'CAM-14': 'cam14', 'CAM-15': 'cam15', 'CAM-16': 'cam16', 'CAM-17': 'cam17', 'CAM-18': 'cam18', 'CAM-19': 'cam19', 'CAM-20': 'cam20', 'CAM-21': 'cam21', 'CAM-22': 'cam22', 'CAM-23': 'cam23', 'CAM-24': 'cam24', 'CAM-25': 'cam25', 'CAM-26': 'cam26' }, GIM = {}
const gimg = k => { if (!GIM[k]) { const i = new Image(); i.src = window.IMGS[k]; GIM[k] = i } return GIM[k] }
function kb(g, w, h, t, im, dv) { const p = (((t % 60) + 60) % 60) / 60, q = .5 - .5 * Math.cos(p * 6.2832), z = 1.05 + .12 * q, ar = w / h, iw = im.naturalWidth, ih = im.naturalHeight; let sw = iw, sh = iw / ar; if (sh > ih) { sh = ih; sw = ih * ar } sw /= z; sh /= z
  const dr = Math.sin(t * .9) * .004 + Math.sin(t * 2.3) * .0015, fx = Math.max(0, Math.min(1, (dv & 1 ? q : 1 - q) + dr)), fy = Math.max(0, Math.min(1, (dv & 2 ? q : 1 - q) * .5 + .25 + dr * .6))
  g.drawImage(im, (iw - sw) * fx, (ih - sh) * fy, sw, sh, 0, 0, w, h); g.fillStyle = 'rgba(255,255,255,' + (.015 + .015 * Math.sin(t * .5)) + ')'; g.fillRect(0, 0, w, h) }
function renderCam(g, w, h, t, cam, ci) {
  const k = w / 320
  if (ci.st === 'Offline') { for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${150 + Math.random() * 90},${160 + Math.random() * 90},${170 + Math.random() * 80},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 3 * k, 2 * k) } g.fillStyle = 'rgba(30,45,60,.82)'; g.fillRect(0, 0, w, h); g.font = `bold ${14 * k}px sans-serif`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('NO SIGNAL', w / 2, h / 2); g.textAlign = 'left'; osd(g, w, h, cam.id + '  ' + cam.name, 'OFFLINE', null); return }
  if (ci.st === 'Maintenance') { g.fillStyle = '#26384a'; g.fillRect(0, 0, w, h); g.font = `bold ${12 * k}px sans-serif`; g.fillStyle = '#ffe08a'; g.textAlign = 'center'; g.fillText('UNDER MAINTENANCE', w / 2, h / 2); g.font = `${8 * k}px sans-serif`; g.fillStyle = '#c9d6e2'; g.fillText('Feed unavailable', w / 2, h / 2 + 14 * k); g.textAlign = 'left'; osd(g, w, h, cam.id + '  ' + cam.name, 'UNAVAILABLE', null); return }
  const pk = GPH[cam.id], im = pk && gimg(pk); if (im && im.complete && im.naturalWidth) kb(g, w, h, t + hash(cam.id) % 60, im, hash(cam.id) % 4); else if (cam.type === 'gate') drawGate(g, w, h, t + hash(cam.id) % 60); else drawZone(g, w, h, t, cam.type, hash(cam.id) % 97)
  osd(g, w, h, cam.id + '  ' + cam.name, 'SIMULATED', ci.rec)
}
const CAMREG = new Set(); let camRaf = 0, camLast = 0
function camLoop(ts) { camRaf = requestAnimationFrame(camLoop); if (ts - camLast < 66) return; camLast = ts; CAMREG.forEach(f => f()) }
function SimCam({ cam, ci, big, onClick }) {
  const ref = useRef()
  useEffect(() => { const cv = ref.current, g = cv.getContext('2d'), draw = () => renderCam(g, cv.width, cv.height, performance.now() / 1000, cam, ci); draw(); CAMREG.add(draw); if (!camRaf) camRaf = requestAnimationFrame(camLoop); return () => { CAMREG.delete(draw); if (!CAMREG.size) { cancelAnimationFrame(camRaf); camRaf = 0 } } }, [cam.id, ci.st, ci.rec])
  return <canvas ref={ref} width={big ? 960 : 320} height={big ? 540 : 180} className="camcv" onClick={onClick} />
}
function CamView({ cam, ci, url, big, onClick }) {
  const [bad, setBad] = useState(false); useEffect(() => setBad(false), [url, cam.id])
  if (url && ci.st !== 'Offline' && ci.st !== 'Maintenance') {
    if (bad) return <div className="camcv nofeed"><b>UNAVAILABLE</b><span>Configured stream could not be opened</span></div>
    return /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url) ? <video className="camcv" src={url} autoPlay muted playsInline controls onError={() => setBad(true)} /> : <img className="camcv" src={url} alt={cam.name} onError={() => setBad(true)} />
  }
  return <SimCam cam={cam} ci={ci} big={big} onClick={onClick} />
}
const GATE_EV = [
  { t: 4, txt: 'Vehicle approaching Gate 01' }, { t: 10, txt: 'QR scanned – resident QR' }, { t: 11, txt: 'Access approved – barrier opening', rec: { q: 'resident', dir: 'Entry', veh: 'DEMO-4821' } }, { t: 14, txt: 'Vehicle entered the resort' },
  { t: 17.8, txt: 'Visitor QR scanned – pedestrian entry approved', rec: { q: 'guest', dir: 'Entry', veh: '' } }, { t: 24, txt: 'Vehicle approaching exit barrier' }, { t: 33, txt: 'Exit barrier opened – vehicle exit recorded', rec: { q: 'resident', dir: 'Exit', veh: 'DEMO-7710' } },
  { t: 37, txt: 'Delivery van approaching Gate 01' }, { t: 43.5, txt: 'Visitor exit recorded', rec: { q: 'guest', dir: 'Exit', veh: '' } }, { t: 44, txt: 'QR scanned – EXPIRED delivery QR, access denied', rec: { q: 'expired', dir: 'Entry', veh: 'DEMO-3395' } },
  { t: 45, txt: 'Security officer dispatched to verify the vehicle' }, { t: 50, txt: 'Delivery re-verified – access approved', rec: { q: 'deliv', dir: 'Entry', veh: 'DEMO-3395' } }, { t: 53, txt: 'Delivery vehicle entered the resort' }]
const gLabel = t => '10:' + String(1 + Math.floor(t / 6)).padStart(2, '0')
const PSEQ = [[0, 'gate3'], [8, 'gate1'], [22, 'gate6'], [36, 'gate7'], [50, 'gate3']]
const BANNERS = [[4, 'VEHICLE APPROACHING GATE 01', '#5B96B3'], [10, 'QR SCANNED', '#5B96B3'], [11, 'ACCESS APPROVED', '#2aa198'], [14, 'VEHICLE ENTERED THE RESORT', '#2aa198'], [17.8, 'VISITOR QR – APPROVED', '#2aa198'], [24, 'VEHICLE AT EXIT BARRIER', '#5B96B3'], [33, 'EXIT RECORDED', '#2aa198'], [37, 'DELIVERY VAN APPROACHING', '#5B96B3'], [43.5, 'VISITOR EXIT RECORDED', '#5B96B3'], [44, 'QR EXPIRED – ACCESS DENIED', '#e5675f'], [45, 'SECURITY OFFICER DISPATCHED', '#A68B61'], [50, 'DELIVERY RE-VERIFIED – APPROVED', '#2aa198'], [53, 'DELIVERY ENTERED THE RESORT', '#2aa198']]
function drawPhotoSeq(g, w, h, t) {
  let seg = 0; PSEQ.forEach((s, j) => { if (t >= s[0]) seg = j }); const a = PSEQ[seg], len = (PSEQ[seg + 1] ? PSEQ[seg + 1][0] : 60) - a[0], dt = t - a[0], prog = dt / len
  const draw = (key, pr, dv) => { const im = gimg(key); if (!(im.complete && im.naturalWidth)) return false; const z = 1.04 + .12 * pr, ar = w / h, iw = im.naturalWidth, ih = im.naturalHeight; let sw = iw, sh = iw / ar; if (sh > ih) { sh = ih; sw = ih * ar } sw /= z; sh /= z; g.drawImage(im, (iw - sw) * (dv ? pr : 1 - pr), (ih - sh) * (.3 + .3 * pr), sw, sh, 0, 0, w, h); return true }
  if (dt < 1.2) { if (!draw(PSEQ[(seg + PSEQ.length - 1) % PSEQ.length][1], 1, (seg + 1) % 2)) return false; g.globalAlpha = dt / 1.2; draw(a[1], prog, seg % 2); g.globalAlpha = 1 } else if (!draw(a[1], prog, seg % 2)) return false
  const s = h / 18; BANNERS.forEach(b => { const e = t - b[0]; if (e >= 0 && e < 3.4) { g.globalAlpha = Math.min(1, e * 3, (3.4 - e) * 3); pill(g, w / 2, h * .8, b[1], b[2], s); if (e < 1) { g.globalAlpha = (1 - e) * .8; g.strokeStyle = b[2]; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6) } g.globalAlpha = 1 } })
  return true
}
function drawCover(g, v, w, h) { const vw = v.videoWidth || w, vh = v.videoHeight || h, sc = Math.max(w / vw, h / vh), dw = vw * sc, dh = vh * sc; g.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh) }
function GateDemo({ onEvent, sync }) {
  const cv = useRef(), vid = useRef(null), st = useRef({ t: 0, last: 0, play: true, speed: 1, fired: new Set(), mode: 'photo' }), syncR = useRef(sync), evR = useRef(onEvent), [ui, setUi] = useState({ t: 0, play: true, speed: 1, mode: 'photo', name: '' })
  syncR.current = sync; evR.current = onEvent
  useEffect(() => { const g = cv.current.getContext('2d'); let raf; const loop = ts => { raf = requestAnimationFrame(loop); const s = st.current; if (!s.last) s.last = ts; const dt = Math.min(.1, (ts - s.last) / 1000); s.last = ts; const vm = s.mode === 'video' && vid.current
      if (vm) { const t0 = s.t; s.t = vid.current.currentTime % 60; if (s.t < t0 - .5) s.fired.clear() } else if (s.play) { const t0 = s.t; s.t = (s.t + dt * s.speed) % 60; if (s.t < t0) s.fired.clear() }
      if (!vm && s.play) GATE_EV.forEach((e, i) => { if (e.rec && s.t >= e.t && !s.fired.has(i)) { s.fired.add(i); if (syncR.current) evR.current(e) } })
      if (vm) { if (vid.current.readyState >= 2) drawCover(g, vid.current, 960, 540); else { g.fillStyle = '#26384a'; g.fillRect(0, 0, 960, 540) } } else if (!(s.mode === 'photo' && drawPhotoSeq(g, 960, 540, s.t))) drawGate(g, 960, 540, s.t)
      osd(g, 960, 540, 'GATE 01 – MAIN ENTRANCE  (DEMONSTRATION)', vm ? 'REAL' : 'SIMULATED', 'Rec'); g.font = 'bold 26px ui-monospace,Consolas,monospace'; g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 3; g.fillText(gLabel(s.t) + ':' + String(Math.floor((s.t % 6) * 10)).padStart(2, '0'), 400, 520); g.shadowBlur = 0 }
    raf = requestAnimationFrame(loop); const iv = setInterval(() => setUi(u => ({ ...u, t: st.current.t })), 250); return () => { cancelAnimationFrame(raf); clearInterval(iv); if (vid.current) vid.current.pause() } }, [])
  const S2 = st.current, setMode = m => { S2.mode = m; S2.fired.clear(); if (vid.current) { if (m === 'video') vid.current.play().catch(() => {}); else vid.current.pause() } setUi(u => ({ ...u, mode: m })) }
  const load = e => { const f = e.target.files[0]; if (!f) return; if (vid.current) vid.current.pause(); const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.src = URL.createObjectURL(f); v.playbackRate = S2.speed; v.play().catch(() => {}); vid.current = v; S2.play = true; setMode('video'); setUi(u => ({ ...u, name: f.name, play: true })) }
  const real = ui.mode === 'video'
  return <div className="grid g2"><div className="card"><h3>Gate 01 – one-minute activity demonstration <span className="tag" style={{ color: real ? '#2aa198' : '#b07a00' }}>{real ? 'USER VIDEO' : 'SIMULATED'}</span></h3><canvas ref={cv} width={960} height={540} className="camcv" />
    <div style={{ marginTop: 8 }}><button className="btn sm pri" onClick={() => { S2.play = !S2.play; if (vid.current && S2.mode === 'video') { S2.play ? vid.current.play() : vid.current.pause() } setUi({ ...ui, play: S2.play }) }}>{ui.play ? '⏸ Pause' : '▶ Play'}</button> <button className="btn sm" onClick={() => { S2.t = 0; S2.fired.clear(); if (vid.current) vid.current.currentTime = 0 }}>⟲ Restart</button> {[1, 2, 4].map(x => <button key={x} className={'btn sm' + (ui.speed === x ? ' pri' : '')} onClick={() => { S2.speed = x; if (vid.current) vid.current.playbackRate = x; setUi({ ...ui, speed: x }) }}>{x}×</button>)}</div>
    <div style={{ marginTop: 8 }}><span className="sub">View: </span><button className={'btn sm' + (ui.mode === 'photo' ? ' pri' : '')} onClick={() => setMode('photo')}>Gate photo sequence</button> <button className={'btn sm' + (ui.mode === 'scene' ? ' pri' : '')} onClick={() => setMode('scene')}>Animated scene</button> <label className={'btn sm' + (real ? ' pri' : '')} style={{ cursor: 'pointer' }}>🎞 Load my own video…<input type="file" accept="video/*" hidden onChange={load} /></label>{ui.name && <span className="sub"> {ui.name}</span>}</div>
    <div className="bar" style={{ marginTop: 8 }}><i style={{ width: ui.t / 60 * 100 + '%' }} /></div><div className="sub">{real ? 'Your video plays locally in this browser (nothing is uploaded). Demo events are not generated from real footage.' : 'Rendered gate photos with a 60-second motion sequence and scripted demo events – not a real camera feed. Load your own video to replace it.'}</div></div>
    <div className="card feed"><h3>Synchronised activity timeline</h3>{GATE_EV.map((e, i) => <div key={i} style={{ opacity: !real && ui.t >= e.t ? 1 : .45, background: !real && ui.t >= e.t && ui.t < e.t + 3 ? 'rgba(101,182,229,.18)' : 'none' }}><span>{gLabel(e.t)}</span>{!real && ui.t >= e.t ? '✓ ' : '· '}{e.txt}{e.rec && sync && !real ? ' ⟶ logged' : ''}</div>)}</div></div>
}
const TEAMS = ['Security Team A', 'Security Team B', 'Gate Supervisor', 'IT Security', 'Maintenance']
const TECHS = ['Karim H.', 'Sara A.', 'Omar M.', 'Hana R.']
const Lock = ({ role, need }) => <div className="card"><h3>🔒 Restricted</h3><div className="sub">Your role (<b>{role}</b>) cannot open this section. Required permission: {need}. Switch role at the top of this tab to demonstrate access levels.</div></div>
const sevC = s => s === 'Critical' ? 'Critical' : s === 'Warning' ? 'Warning' : 'Normal'
const stC = s => ['Online', 'Operational', 'Maintenance completed', 'Approved', 'Resolved', 'Closed'].includes(s) ? 'Normal' : ['Offline', 'Fault detected', 'Fault', 'Denied', 'New'].includes(s) ? 'Critical' : 'Warning'
function SecurityCenter({ S, A, M, units, openTwin, focus, clearFocus }) {
  const [t, setT] = useState('Overview'), [toast, setToast] = useState(''), [live, setLive] = useState(false), [sync, setSync] = useState(true)
  const [view, setView] = useState('Grid'), [zone, setZone] = useState('All'), [stf, setStf] = useState('All'), [q, setQ] = useState(''), [cam, setCam] = useState(null), [pg, setPg] = useState(0), [url, setUrl] = useState('')
  const [gf, setGf] = useState({ gate: 'All', win: 'Today', cls: 'All', dec: 'All', q: '' }), [selQ, setSelQ] = useState(null), [scanF, setScanF] = useState({ qr: S.qrs[0].id, gate: 'GATE-01', dir: 'Entry' }), [last, setLast] = useState(null), [qpg, setQpg] = useState(0)
  const [selI, setSelI] = useState(null), [note, setNote] = useState(''), [sevF, setSevF] = useState('All'), [selD, setSelD] = useState(null), [dtF, setDtF] = useState('All'), [dsF, setDsF] = useState('All'), [selG, setSelG] = useState(null)
  const role = S.role, K = secKpi(S, M), go = r => { if (r === 'denied') { setToast('Permission denied for role: ' + role + ' (action logged in audit trail)'); setTimeout(() => setToast(''), 3500) } return r }
  useEffect(() => { if (!live) return; const i = setInterval(() => A.random(), 2200); return () => clearInterval(i) }, [live])
  useEffect(() => { if (!focus) return; if (focus.id.startsWith('CAM')) { setT('CCTV'); setView('Single'); setCam(focus.id) } else { setT('Gates & Traffic'); setSelG(focus.id) } clearFocus() }, [focus])
  const idOk = can(role, 'identity'), mk = (x, f) => idOk ? x : f || '••••••'
  const SUB = ['Overview', 'CCTV', 'Gate Simulation', 'Gates & Traffic', 'QR Access', 'Guest Access', 'Incidents', 'Equipment', 'Access & Audit']
  const evRows = S.events.filter(e => (gf.gate === 'All' || e.gate === gf.gate) && (gf.win === 'Today' || Date.now() - e.ts < 3600000) && (gf.cls === 'All' || e.cls === gf.cls) && (gf.dec === 'All' || e.dec === gf.dec) && (!gf.q || (e.qr + e.ref + e.veh + e.unit).toLowerCase().includes(gf.q.toLowerCase())))
  const evTable = (rows, n) => <Table cols={['Time', 'Gate', 'Reference', 'Class', 'Dir.', 'QR', 'Verification', 'Decision', 'Vehicle']} rows={rows.slice(0, n).map(e => [new Date(e.ts).toLocaleTimeString(), e.gate, mk(e.ref), e.cls, e.dir, e.qr, <span title={e.reason}>{e.result}{e.sim ? ' ·sim' : ''}</span>, <b className={stC(e.dec)}>{e.dec}</b>, mk(e.veh || '—', '•••')])} />
  const ci = c => camInfo(S, c)
  const cams = CAMS.filter(c => (zone === 'All' || c.zone === zone) && (stf === 'All' || ci(c).st === stf) && (!q || (c.id + c.name + c.zone).toLowerCase().includes(q.toLowerCase())))
  const cc = CAMS.find(c => c.id === cam), cci = cc && ci(cc)
  const recs = c => { const r = rng(hash(c.id)), n = ['Motion detected', 'Person detected', 'Vehicle detected', 'Door / barrier activity', 'Crowd threshold reached']; const o = Array.from({ length: 5 }, (_, i) => ({ t: new Date(Date.now() - (i + 1) * (18 + r() * 40) * 60000).toLocaleTimeString(), e: n[Math.floor(r() * n.length)], d: Math.round(8 + r() * 50) + ' s clip' })); const i = ci(c); if (i.st === 'Offline') o.unshift({ t: i.d.detected, e: 'Connection error – link lost', d: 'error' }); if (i.st === 'Fault') o.unshift({ t: i.d.detected, e: 'Recording error – ' + i.d.fault, d: 'error' }); return o }
  const incs = S.incidents.filter(i => sevF === 'All' || i.sev === sevF), inc = S.incidents.find(i => i.id === selI)
  const devs = S.devices.filter(d => (dtF === 'All' || d.type === dtF) && (dsF === 'All' || d.status === dsF)), dev = S.devices.find(d => d.id === selD)
  const cnt = k => S.events.filter(e => e.result === k).length
  const allQ = [...S.qrs, ...S.guests.map(guestQR)], pgQ = allQ.slice(qpg * 10, qpg * 10 + 10), qsel = allQ.find(x => x.id === selQ)
  return <>
    <div className="card" style={{ marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><b>Signed-in role (demo)</b><select value={role} onChange={e => A.setRole(e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</select><span className="sub">All data is simulated and privacy-masked. Real camera feeds appear only when an authorised stream is configured.</span>{toast && <b className="Critical">{toast}</b>}</div>
    <Tabs items={SUB} v={t} set={setT} />
    {t === 'Overview' && <><div className="grid"><Kpi l="Total cameras" v={K.cams} /><Kpi l="Online cameras" v={K.online} /><Kpi l="Offline cameras" v={K.offline} /><Kpi l="Cameras under maintenance" v={K.maint} /><Kpi l="Total gates" v={K.gates} /><Kpi l="Active gates" v={K.active} /><Kpi l="Entries today" v={K.entries} /><Kpi l="Exits today" v={K.exits} /><Kpi l="Visitors inside" v={K.visitors} /><Kpi l="Vehicles inside" v={K.vehicles} /><Kpi l="QR approvals" v={K.approved} /><Kpi l="Rejected attempts" v={K.denied} /><Kpi l="Open incidents" v={K.open} /></div>
      <div className="grid g2"><div className="card"><h3>Latest access events</h3>{evTable(S.events, 8)}<div style={{ marginTop: 8 }}><button className={'btn sm' + (live ? ' pri' : '')} onClick={() => setLive(!live)}>{live ? '⏸ Stop live traffic' : '▶ Live traffic simulation'}</button> <button className="btn sm" onClick={() => openTwin(null)}>Open security layer in Holographic Twin</button></div></div>
        <div className="card"><h3>Open incidents</h3><Table cols={['ID', 'Sev.', 'Location', 'Description', 'Status']} rows={S.incidents.filter(i => !['Resolved', 'Closed'].includes(i.status)).slice(0, 6).map(i => [i.id, <b className={sevC(i.sev)}>{i.sev}</b>, i.loc, i.desc, i.status])} /></div></div></>}
    {t === 'CCTV' && (!can(role, 'cams') ? <Lock role={role} need="View camera feeds" /> : view === 'Single' && cc ? <div className="grid g2"><div className="card"><button className="btn sm" onClick={() => setView('Grid')}>◀ Back to grid</button> <button className="btn sm" onClick={() => { const i = CAMS.findIndex(c => c.id === cam); setCam(CAMS[(i + CAMS.length - 1) % CAMS.length].id) }}>‹ Prev</button> <button className="btn sm" onClick={() => { const i = CAMS.findIndex(c => c.id === cam); setCam(CAMS[(i + 1) % CAMS.length].id) }}>Next ›</button> <button className="btn sm" onClick={() => openTwin(cc.id)}>Locate in Holographic Twin</button>
        <div style={{ marginTop: 8 }}><CamView cam={cc} ci={cci} url={S.streams[cc.id]} big /></div><div className="sub">Feed type: <b>{cci.feed}</b>. Simulated footage is generated by the demo and is not a real camera.</div></div>
        <div className="card"><h3>{cc.id} – {cc.name}</h3><Table cols={['Field', 'Value']} rows={[['Location', cc.zone + ' · x ' + cc.x + ', z ' + cc.z], ['Status', <b className={stC(cci.st)}>{cci.st}</b>], ['Feed', cci.feed], ['Last connection', cci.seen], ['Recording', <b className={cci.rec === 'Recording' ? 'Normal' : 'Critical'}>{cci.rec}</b>], ['Health', cci.health + ' %'], ['Maintenance', cci.d.status + (cci.d.ticket ? ' · ' + cci.d.ticket : '')]]} />
          <h3 style={{ marginTop: 12, fontSize: 16 }}>Recorded events & errors</h3><Table cols={['Time', 'Event', 'Detail']} rows={recs(cc).map(r => [r.t, <span className={r.d === 'error' ? 'Critical' : ''}>{r.e}</span>, r.d])} />
          <h3 style={{ marginTop: 12, fontSize: 16 }}>Real stream integration</h3>{can(role, 'stream') ? <><input style={{ width: '100%' }} placeholder="Authorised stream URL (MP4 / WebM / HLS in Safari / MJPEG)" value={url} onChange={e => setUrl(e.target.value)} /><div style={{ marginTop: 6 }}><button className="btn sm pri" onClick={() => go(A.setStream(cc.id, url))}>Connect stream</button> <button className="btn sm" onClick={() => { setUrl(''); go(A.setStream(cc.id, '')) }}>Remove</button></div></> : <div className="sub">Only a Security Administrator can configure real streams.</div>}<div className="sub">A feed is labelled REAL only when you provide a valid, authorised stream URL.</div></div></div>
      : <><div className="card" style={{ marginBottom: 10 }}><input placeholder="Search cameras…" value={q} onChange={e => { setQ(e.target.value); setPg(0) }} /> <select value={zone} onChange={e => { setZone(e.target.value); setPg(0) }}>{['All', ...CZ].map(z => <option key={z}>{z}</option>)}</select> <select value={stf} onChange={e => { setStf(e.target.value); setPg(0) }}>{['All', 'Online', 'Fault', 'Offline', 'Maintenance'].map(z => <option key={z}>{z}</option>)}</select> <button className="btn sm" onClick={() => { setView('Single'); setCam(cam || CAMS[0].id) }}>Single-camera view</button> <span className="sub">{cams.length} cameras</span></div>
        <div className="camgrid">{cams.slice(pg * 12, pg * 12 + 12).map(c => { const i = ci(c); return <div key={c.id} className="card camcard"><CamView cam={c} ci={i} url={S.streams[c.id]} onClick={() => { setCam(c.id); setView('Single') }} /><div className="cm"><b>{c.id}</b> {c.name}<br /><span className="sub">{c.zone}</span><br /><span className={'tag ' + stC(i.st)}>{i.st}</span> <span className="tag">{i.feed}</span> <span className={'tag ' + (i.rec === 'Recording' ? '' : 'Critical')}>{i.rec}</span><br /><span className="sub">Last seen {i.seen} · health {i.health}% · {i.d.status}</span></div></div> })}</div>
        <div style={{ marginTop: 10 }}><button className="btn sm" disabled={pg === 0} onClick={() => setPg(pg - 1)}>◀ Prev</button> <span className="sub"> page {pg + 1} / {Math.max(1, Math.ceil(cams.length / 12))} </span><button className="btn sm" disabled={(pg + 1) * 12 >= cams.length} onClick={() => setPg(pg + 1)}>Next ▶</button></div></>)}
    {t === 'Gate Simulation' && (!can(role, 'cams') ? <Lock role={role} need="View camera feeds" /> : <><div className="card" style={{ marginBottom: 10 }}><label><input type="checkbox" checked={sync} onChange={() => setSync(!sync)} /> Sync demo events to dashboard counters, access log and QR checks</label></div><GateDemo sync={sync} onEvent={e => A.demo(e)} /><div className="camgrid" style={{ marginTop: 14 }}>{['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map(id => { const c = CAMS.find(x => x.id === id); return <div key={id} className="card camcard"><CamView cam={c} ci={camInfo(S, c)} url={S.streams[id]} /><div className="cm"><b>{c.id}</b> {c.name} <span className="tag">SIMULATED</span><br /><span className="sub">Rendered photo with a 60-second motion loop – not a live feed</span></div></div> })}</div></>)}
    {t === 'Gates & Traffic' && <><div className="card" style={{ marginBottom: 10 }}><button className={'btn sm' + (live ? ' pri' : '')} onClick={() => setLive(!live)}>{live ? '⏸ Stop live traffic' : '▶ Live traffic'}</button> <button className="btn sm" onClick={() => { for (let i = 0; i < 10; i++) A.random() }}>Traffic burst (10 events)</button></div>
      <div className="grid">{GATES.map(g => { const gs = gateStats(S, g.id), dv = id => S.devices.find(d => d.id === id), k = g.id.slice(-2), bad = ['QRS', 'ACP', 'BAR', 'GC'].filter(p => dv(p + '-' + k).status !== 'Operational').length; return <div key={g.id} className="card" style={{ outline: selG === g.id ? '2px solid var(--a)' : 'none' }}><b>{g.name}</b> <span className="sub">{g.id}</span><br /><span className="sub">{g.loc}</span><div style={{ margin: '6px 0' }}><span className={'tag ' + (gs.g.status === 'Operational' ? 'Normal' : 'Warning')}>{gs.g.status}</span> <span className="tag">Barrier {gs.g.barrier}</span> <span className="tag">Net {gs.g.net}</span></div>
        <small>Entries <b>{gs.entries}</b> · Exits <b>{gs.exits}</b> · Denied <b>{gs.denied}</b><br />Traffic (10 min): <b>{gs.traffic}</b><br />QR scanner: <b className={stC(dv('QRS-' + k).status === 'Operational' ? 'Online' : 'Fault')}>{dv('QRS-' + k).status}</b><br />Cameras: {g.cams.join(', ')}<br />Device health: <b>{gs.g.health - bad * 12}%</b></small>
        <div style={{ marginTop: 6 }}><button className="btn sm" onClick={() => go(A.barrier(g.id))}>{gs.g.barrier === 'Closed' ? 'Open barrier' : 'Close barrier'}</button> <select value={gs.g.status} onChange={e => go(A.gateStatus(g.id, e.target.value))}>{['Operational', 'Degraded', 'Closed'].map(x => <option key={x}>{x}</option>)}</select> <button className="btn sm" onClick={() => openTwin(g.id)}>Locate</button></div></div> })}</div>
      <div className="card" style={{ marginTop: 14 }}><h3>Entry / exit activity</h3><select value={gf.gate} onChange={e => setGf({ ...gf, gate: e.target.value })}>{['All', ...GATES.map(g => g.id)].map(x => <option key={x}>{x}</option>)}</select> <select value={gf.win} onChange={e => setGf({ ...gf, win: e.target.value })}>{['Today', 'Last hour'].map(x => <option key={x}>{x}</option>)}</select> <select value={gf.cls} onChange={e => setGf({ ...gf, cls: e.target.value })}>{['All', 'Resident', 'Owner', 'Tenant', 'Guest', 'Staff', 'Delivery'].map(x => <option key={x}>{x}</option>)}</select> <select value={gf.dec} onChange={e => setGf({ ...gf, dec: e.target.value })}>{['All', 'Approved', 'Denied'].map(x => <option key={x}>{x}</option>)}</select> <input placeholder="Search QR / ref / unit…" value={gf.q} onChange={e => setGf({ ...gf, q: e.target.value })} /> <span className="sub">{evRows.length} events</span>{!idOk && <div className="sub">Identity & vehicle references are masked for your role.</div>}{evTable(evRows, 25)}</div></>}
    {t === 'QR Access' && <><div className="grid">{['Valid QR', 'Expired QR', 'Revoked QR', 'Unauthorized QR', 'Duplicate scan', 'Access denied', 'Temporary visitor access', 'Staff access', 'Delivery access'].map(k => <Kpi key={k} l={k} v={cnt(k)} />)}</div>
      <div className="grid g2"><div className="card"><h3>Verify a QR scan</h3><select value={scanF.qr} onChange={e => setScanF({ ...scanF, qr: e.target.value })}>{allQ.map(x => <option key={x.id} value={x.id}>{x.id} · {x.type} · {x.state}</option>)}<option value="QR-9999">QR-9999 · unregistered</option></select> <select value={scanF.gate} onChange={e => setScanF({ ...scanF, gate: e.target.value })}>{GATES.map(g => <option key={g.id} value={g.id}>{g.id}</option>)}</select> <select value={scanF.dir} onChange={e => setScanF({ ...scanF, dir: e.target.value })}><option>Entry</option><option>Exit</option></select> <button className="btn pri sm" onClick={() => setLast(A.scan(scanF.qr, scanF.gate, scanF.dir, '', true))}>Scan</button>
          <ScanResult ev={last} S={S} showCam={can(role, 'cams')} /></div>
        <div className="card"><h3>Access history {qsel ? '– ' + qsel.id : ''}</h3>{qsel ? evTable(S.events.filter(e => e.qr === qsel.id), 8) : <div className="sub">Select “History” on a QR code.</div>}</div></div>
      <div className="card" style={{ marginTop: 14 }}><h3>QR permissions (shared with the City & Management module)</h3><Table cols={['QR', 'Type', 'Holder', 'Unit', 'Validity', 'State', '']} rows={pgQ.map(x => [<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><QRImg text={tokOf(S, x.id)} size={44} />{x.id}</span>, x.type, mk(x.holder), mk(x.unit || '—', '•••'), x.from + ' → ' + x.exp, <b className={x.state === 'Active' ? 'Normal' : 'Critical'}>{x.state}</b>, <><button className="btn sm" onClick={() => setSelQ(x.id)}>History</button> {x.state === 'Active' ? <><button className="btn sm" onClick={() => go(A.qrState(x.id, 'Revoked'))}>Revoke</button> <button className="btn sm" onClick={() => go(A.qrState(x.id, 'Suspended'))}>Suspend</button></> : x.state === 'Suspended' ? <button className="btn sm" onClick={() => go(A.qrState(x.id, 'Active'))}>Reinstate</button> : null}</>])} />
        <button className="btn sm" disabled={qpg === 0} onClick={() => setQpg(qpg - 1)}>◀</button> <span className="sub"> {qpg + 1} / {Math.ceil(allQ.length / 10)} </span><button className="btn sm" disabled={(qpg + 1) * 10 >= allQ.length} onClick={() => setQpg(qpg + 1)}>▶</button></div></>}
    {t === 'Guest Access' && <GuestAccess S={S} A={A} units={units} asOwner={false} showCam={can(role, 'cams')} />}
    {t === 'Incidents' && <><div className="card" style={{ marginBottom: 10 }}><select value={sevF} onChange={e => setSevF(e.target.value)}>{['All', 'Critical', 'Warning', 'Normal'].map(x => <option key={x}>{x}</option>)}</select> <button className="btn sm pri" onClick={() => go(can(role, 'incidents') ? A.raise({ sev: 'Warning', loc: 'Main Entrance Gate', ref: 'GATE-01', dev: 'SN-02', desc: 'Suspicious access pattern – repeated gate cycling (simulated)' }) : 'denied')}>Raise test alert</button> <span className="sub">Auto-generated from rejected scans, unauthorized QRs and equipment faults.</span></div>
      <div className="grid g2"><div className="card"><Table cols={['ID', 'Sev.', 'Time', 'Location', 'Device', 'Description', 'Status']} rows={incs.map(i => [<a style={{ cursor: 'pointer', color: 'var(--a)', fontWeight: 600 }} onClick={() => setSelI(i.id)}>{i.id}</a>, <b className={sevC(i.sev)}>{i.sev}</b>, i.time, i.loc, i.dev, i.desc, <b className={stC(i.status)}>{i.status}</b>])} /></div>
        <div className="card"><h3>{inc ? inc.id + ' – ' + inc.desc : 'Select an incident'}</h3>{inc && <><Table cols={['Field', 'Value']} rows={[['Severity', inc.sev], ['Location', inc.loc], ['Device', inc.dev], ['Status', inc.status], ['Assigned to', inc.assignee || '—']]} /><div style={{ margin: '8px 0' }}>Workflow: {['New', 'Under investigation', 'Assigned', 'Resolved', 'Closed'].map(s => <span key={s} className={'tag' + (s === inc.status ? ' on' : '')} style={{ marginRight: 4, background: s === inc.status ? 'var(--a)' : undefined, color: s === inc.status ? '#fff' : undefined }}>{s}</span>)}</div>
          <button className="btn sm pri" disabled={inc.status === 'Closed'} onClick={() => go(A.advance(inc.id))}>Advance status ▶</button> <select value="" onChange={e => e.target.value && go(A.assign(inc.id, e.target.value))}><option value="">Assign to…</option>{TEAMS.map(x => <option key={x}>{x}</option>)}</select>
          <h3 style={{ marginTop: 12, fontSize: 16 }}>Investigation notes</h3>{can(role, 'incidents') ? <>{inc.notes.map((n, i) => <div key={i} className="sub">{n.t} · {n.u}: {n.text}</div>)}<input style={{ width: '70%' }} placeholder="Add note…" value={note} onChange={e => setNote(e.target.value)} /> <button className="btn sm" onClick={() => { if (note) { go(A.note(inc.id, note)); setNote('') } }}>Add</button></> : <div className="sub">Notes are restricted for your role.</div>}</>}</div></div></>}
    {t === 'Equipment' && <><div className="grid">{['Operational', 'Offline', 'Fault detected', 'Under maintenance', 'Repair in progress', 'Maintenance completed'].map(s => <Kpi key={s} l={s} v={S.devices.filter(d => d.status === s).length} />)}</div>
      <div className="card" style={{ marginBottom: 10 }}><select value={dtF} onChange={e => setDtF(e.target.value)}>{['All', 'Camera', 'NVR / Recorder', 'QR scanner', 'Access-control panel', 'Automatic barrier', 'Gate controller', 'Network switch', 'Sensor'].map(x => <option key={x}>{x}</option>)}</select> <select value={dsF} onChange={e => setDsF(e.target.value)}>{['All', 'Operational', 'Offline', 'Fault detected', 'Under maintenance', 'Repair in progress', 'Maintenance completed'].map(x => <option key={x}>{x}</option>)}</select> <button className="btn sm pri" onClick={() => go(can(role, 'maint') ? A.simFault() : 'denied')}>Simulate fault</button> <span className="sub">{devs.length} devices</span></div>
      <div className="grid g2"><div className="card" style={{ maxHeight: 520, overflow: 'auto' }}><Table cols={['ID', 'Device', 'Location', 'Status', 'Ticket']} rows={devs.map(d => [<a style={{ cursor: 'pointer', color: 'var(--a)', fontWeight: 600 }} onClick={() => setSelD(d.id)}>{d.id}</a>, d.name, d.loc, <b className={stC(d.status)}>{d.status}</b>, d.ticket || '—'])} /></div>
        <div className="card"><h3>{dev ? dev.id + ' – ' + dev.name : 'Select a device'}</h3>{dev && <><Table cols={['Field', 'Value']} rows={[['Location', dev.loc], ['Status', dev.status], ['Fault', dev.fault || '—'], ['Detected', dev.detected || '—'], ['Maintenance ticket', dev.ticket || '—'], ['Technician', dev.tech || '—'], ['Estimated completion', dev.eta || '—']]} />
          <div style={{ margin: '8px 0' }}>{['Fault detected', 'Offline'].includes(dev.status) && <><select id="tech">{TECHS.map(x => <option key={x}>{x}</option>)}</select> <button className="btn sm pri" onClick={() => go(A.devAct(dev.id, 'dispatch', document.getElementById('tech').value))}>Dispatch technician</button></>} {dev.status === 'Under maintenance' && <button className="btn sm pri" onClick={() => go(A.devAct(dev.id, 'start'))}>Start repair</button>} {dev.status === 'Repair in progress' && <button className="btn sm pri" onClick={() => go(A.devAct(dev.id, 'complete'))}>Complete repair</button>} {dev.status === 'Maintenance completed' && <button className="btn sm pri" onClick={() => go(A.devAct(dev.id, 'return'))}>Return to service</button>}</div>
          <h3 style={{ fontSize: 16 }}>Repair history</h3>{dev.history.length ? dev.history.map((h, i) => <div key={i} className="sub">{h.t} · {h.e}</div>) : <div className="sub">No faults recorded.</div>}</>}</div></div></>}
    {t === 'Access & Audit' && <><div className="card"><h3>Role-based permissions</h3><Table cols={['Permission', ...ROLES.map(r => r.replace('Security ', ''))]} rows={Object.keys(PERM).map(p => [PERM_LBL[p], ...ROLES.map((r, i) => PERM[p].includes(i) ? <b className="Normal">✓</b> : '–')])} /><div className="sub">Active role: <b>{role}</b>. Visitor identities are pseudonymised demo references; sensitive fields are masked for roles without identity access.</div></div>
      {can(role, 'audit') ? <div className="card" style={{ marginTop: 14 }}><h3>Audit log</h3><Table cols={['Time', 'Role', 'Action', 'Target']} rows={S.audit.slice(0, 40).map(a => [a.t, a.u, a.a, a.o])} /></div> : <div style={{ marginTop: 14 }}><Lock role={role} need="View audit log" /></div>}</>}
  </>
}

/* ============ QR CODE ENCODER (ISO/IEC 18004, byte mode, ECC level M, versions 1-10) ============ */
const QR_ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26], QR_BLK = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5]
function qrEncode(text) {
  const data = Array.from(new TextEncoder().encode(text)), bit = (x, i) => ((x >>> i) & 1) !== 0
  const raw = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36 } return r }
  let ver = 1; for (; ver <= 10; ver++) { const cap = Math.floor(raw(ver) / 8) - QR_ECC[ver] * QR_BLK[ver], need = 4 + (ver < 10 ? 8 : 16) + data.length * 8; if (need <= cap * 8) break }
  if (ver > 10) throw new Error('QR payload too long')
  const size = ver * 4 + 17, bb = []; const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bb.push(bit(v, i) ? 1 : 0) }
  put(4, 4); put(data.length, ver < 10 ? 8 : 16); data.forEach(b => put(b, 8))
  const cap = Math.floor(raw(ver) / 8) - QR_ECC[ver] * QR_BLK[ver]; for (let i = 0; i < 4 && bb.length < cap * 8; i++) bb.push(0); while (bb.length % 8) bb.push(0)
  for (let p = 0xEC; bb.length < cap * 8; p ^= 0xEC ^ 0x11) put(p, 8)
  const cw = []; for (let i = 0; i < bb.length; i += 8) cw.push(parseInt(bb.slice(i, i + 8).join(''), 2))
  // Reed-Solomon
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x } return z }
  const ne = QR_ECC[ver], gen = Array(ne - 1).fill(0).concat([1]); let root = 1
  for (let i = 0; i < ne; i++) { for (let j = 0; j < gen.length; j++) { gen[j] = mul(gen[j], root); if (j + 1 < gen.length) gen[j] ^= gen[j + 1] } root = mul(root, 2) }
  const rs = d => { const r = Array(ne).fill(0); d.forEach(b => { const f = b ^ r.shift(); r.push(0); gen.forEach((c, i) => { r[i] ^= mul(c, f) }) }); return r }
  const nb = QR_BLK[ver], rc = Math.floor(raw(ver) / 8), ns = nb - rc % nb, sl = Math.floor(rc / nb), blocks = []
  for (let i = 0, k = 0; i < nb; i++) { const d = cw.slice(k, k + sl - ne + (i < ns ? 0 : 1)); k += d.length; const e = rs(d); if (i < ns) d.push(0); blocks.push(d.concat(e)) }
  const all = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== sl - ne || j >= ns) all.push(b[i]) })
  // matrix
  const m = Array.from({ length: size }, () => Array(size).fill(false)), fn = Array.from({ length: size }, () => Array(size).fill(false))
  const setF = (x, y, d) => { m[y][x] = d; fn[y][x] = true }
  for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0) }
  const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, d !== 2 && d !== 4) } }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4)
  const al = []; if (ver > 1) { const n = Math.floor(ver / 7) + 2, step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2; al.push(6); for (let p = size - 7; al.length < n; p -= step) al.splice(1, 0, p) }
  al.forEach((a, i) => al.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1) }))
  const fmt = mask => { const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const bits = ((d << 10) | r) ^ 0x5412
    for (let i = 0; i <= 5; i++) setF(8, i, bit(bits, i)); setF(8, 7, bit(bits, 6)); setF(8, 8, bit(bits, 7)); setF(7, 8, bit(bits, 8)); for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(bits, i))
    for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(bits, i)); for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(bits, i)); setF(8, size - 8, true) }
  fmt(0)
  if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const bits = (ver << 12) | r; for (let i = 0; i < 18; i++) { const c = bit(bits, i), a = size - 11 + i % 3, b = Math.floor(i / 3); setF(a, b, c); setF(b, a, c) } }
  let k = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v; if (!fn[y][x] && k < all.length * 8) { m[y][x] = bit(all[k >>> 3], 7 - (k & 7)); k++ } } }
  const mask = t => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const c = [(x + y) % 2 === 0, y % 2 === 0, x % 3 === 0, (x + y) % 3 === 0, (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, x * y % 2 + x * y % 3 === 0, (x * y % 2 + x * y % 3) % 2 === 0, ((x + y) % 2 + x * y % 3) % 2 === 0][t]; if (c && !fn[y][x]) m[y][x] = !m[y][x] } }
  const pen = () => { let p = 0; for (let a = 0; a < 2; a++) for (let i = 0; i < size; i++) { let run = 1; for (let j = 1; j < size; j++) { const c = a ? m[j][i] : m[i][j], pr = a ? m[j - 1][i] : m[i][j - 1]; if (c === pr) { run++; if (run === 5) p += 3; else if (run > 5) p++ } else run = 1 } }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3
    const dark = m.flat().filter(Boolean).length, tot = size * size; return p + (Math.ceil(Math.abs(dark * 20 - tot * 10) / tot) - 1) * 10 }
  let best = 0, bp = 1e9; for (let t = 0; t < 8; t++) { mask(t); fmt(t); const p = pen(); if (p < bp) { bp = p; best = t } mask(t) }
  mask(best); fmt(best); return m
}
function qrCanvas(text, px, quiet) { const m = qrEncode(text), n = m.length, q = quiet === undefined ? 4 : quiet, sc = Math.max(1, Math.floor(px / (n + 2 * q))), cv = document.createElement('canvas'); cv.width = cv.height = sc * (n + 2 * q); const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000'; m.forEach((row, y) => row.forEach((d, x) => { if (d) g.fillRect((x + q) * sc, (y + q) * sc, sc, sc) })); return cv }
function QRImg({ text, size }) { const ref = useRef(); useEffect(() => { const c = qrCanvas(text, (size || 180) * 2), t = ref.current; t.width = c.width; t.height = c.height; t.getContext('2d').drawImage(c, 0, 0) }, [text, size]); return <canvas ref={ref} className="qrcv" style={{ width: size || 180, height: size || 180 }} data-qr={text} /> }
function qrDownload(text, caption, name) { const c = qrCanvas(text, 560), o = document.createElement('canvas'); o.width = c.width; o.height = c.height + 70; const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0); g.fillStyle = '#243B53'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText(caption, o.width / 2, c.height + 28); g.font = '16px sans-serif'; g.fillStyle = '#b07a00'; g.fillText('DEMO QR – Silver Sands (simulated access system)', o.width / 2, c.height + 54); const a = document.createElement('a'); a.href = o.toDataURL('image/png'); a.download = name + '.png'; a.click() }
function qrPrint(text, caption) { try { const c = qrCanvas(text, 520), w = window.open('', '_blank'); w.document.write('<html><body style="font-family:sans-serif;text-align:center"><h2>' + caption + '</h2><img src="' + c.toDataURL() + '"/><p><b>DEMO QR</b> – Silver Sands (simulated access system)</p></body></html>'); w.document.close(); w.focus(); w.print() } catch (e) { alert('Printing is blocked in this window – use Download QR instead.') } }
const copyText = t => { try { navigator.clipboard.writeText(t) } catch (e) { const x = document.createElement('textarea'); x.value = t; document.body.appendChild(x); x.select(); document.execCommand('copy'); x.remove() } }

/* ============ GUEST INVITATIONS & QR VISUALISATION ============ */
const fmtDT = ts => new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), fmtT = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const gStatus = (g, now) => { now = now || Date.now(); return g.revoked ? 'Revoked' : g.used ? 'Used' : now > g.expireAt ? 'Expired' : now < g.activateAt ? 'Pending' : 'Active' }
const guestQR = g => ({ id: g.qrId, type: 'Guest', holder: g.name + ' (host ' + g.hostName + ')', unit: g.unit, state: gStatus(g), from: fmtDT(g.activateAt), exp: fmtDT(g.expireAt), guest: g.id })
const mkToken = r => { const rnd = r || (() => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296); return 'SSQR1.' + Array.from({ length: 14 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(rnd() * 32)]).join('') }
const tokOf = (S, qrId) => { const g = S.guests.find(x => x.qrId === qrId); return g ? g.token : 'SSQR1.' + Array.from({ length: 14 }, (_, i) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(hash(qrId + i) * 7 + i * 13) % 32]).join('') }
function seedGuests(units) {
  const r = rng(77), pool = units.filter(u => u.handover === 'Handed over' && u.occupancy === 'Occupied'), now = Date.now(), H = 3600000, M60 = 60000, d = new Date(); d.setHours(0, 0, 0, 0); const d0 = d.getTime(), at = (dd, hh, mm) => d0 + dd * 86400000 + (hh * 60 + mm) * M60
  const gs = [], evs = []
  const mk = (n, o) => { const u = pool[Math.floor(r() * pool.length)]; return { id: 'G-' + n, name: 'Demo guest ' + FN[Math.floor(r() * FN.length)] + ' ' + LN[Math.floor(r() * LN.length)][0] + '.', unit: u.id, hostName: u.owner, gates: ['ALL'], zones: ['Resort entry', 'Beach'], plate: '', singleUse: false, revoked: false, used: false, inside: false, token: mkToken(r), old: [], qrId: 'QR-G' + n + '-1', issuedAt: now - 5 * H, activateAt: now - 4 * H, expireAt: now + 6 * H, tl: [], ...o } }
  const E = (g, ts, dir, gate, dec, result, reason) => evs.push({ id: 'EV-G' + g.id + ts, ts, gate, ref: 'P-' + (hash(g.id) % 9000 + 1000), cls: 'Guest', dir, qr: g.qrId, unit: g.unit, type: 'Guest', valid: fmtDT(g.activateAt) + ' → ' + fmtDT(g.expireAt), veh: g.plate, sim: true, guest: g.id, cam: GATES.find(x => x.id === gate).cams[0], dec, result, reason: reason || '' })
  const ok = 'Temporary visitor access', add = (n, o, f) => { const g = mk(n, o); gs.push(g); f && f(g) }
  add(101, {}, g => { g.inside = true; E(g, now - 55 * M60, 'Entry', 'GATE-01', 'Approved', ok) })
  add(102, { zones: ['Resort entry', 'Clubhouse'] })
  add(103, { singleUse: true, used: true, issuedAt: now - 9 * H, activateAt: now - 8 * H, expireAt: now + 2 * H }, g => { E(g, now - 7 * H, 'Entry', 'GATE-02', 'Approved', ok); E(g, now - 5 * H, 'Exit', 'GATE-02', 'Approved', ok) })
  add(104, { singleUse: true, used: true, plate: 'DEMO-5521', gates: ['GATE-01', 'GATE-02'], issuedAt: at(-1, 10, 15), activateAt: at(-1, 10, 30), expireAt: at(-1, 18, 0) }, g => { E(g, at(-1, 11, 5), 'Entry', 'GATE-01', 'Approved', ok); E(g, at(-1, 14, 40), 'Exit', 'GATE-02', 'Approved', ok) })
  add(105, { issuedAt: now - 10 * H, activateAt: now - 9 * H, expireAt: now - 2 * H }, g => { E(g, now - 8 * H, 'Entry', 'GATE-03', 'Approved', ok); E(g, now - 3 * H, 'Exit', 'GATE-03', 'Approved', ok) })
  add(106, { revoked: true }, g => E(g, now - 30 * M60, 'Entry', 'GATE-03', 'Denied', 'Revoked QR', 'Permission revoked by administrator'))
  add(107, { issuedAt: now - H, activateAt: now + 2 * H, expireAt: now + 9 * H })
  add(108, { issuedAt: now - 2 * H, activateAt: at(1, 9, 0), expireAt: at(1, 20, 0), zones: ['Resort entry', 'Pools', 'Beach'] })
  add(109, { plate: 'DEMO-9034' }, g => { g.inside = true; E(g, now - 2 * H, 'Entry', 'GATE-01', 'Approved', ok) })
  add(110, {}, g => { E(g, now - 3 * H, 'Entry', 'GATE-02', 'Approved', ok); E(g, now - H, 'Exit', 'GATE-02', 'Approved', ok) })
  add(111, { issuedAt: now - 9 * H, activateAt: now - 8 * H, expireAt: now - 3 * H }, g => E(g, now - 20 * M60, 'Entry', 'GATE-01', 'Denied', 'Expired QR', 'Validity ended ' + fmtDT(g.expireAt)))
  add(112, { revoked: true, gates: ['GATE-01'] })
  add(113, { zones: ['Resort entry', 'Beach', 'Hotel'] }, g => { g.inside = true; E(g, now - 40 * M60, 'Entry', 'GATE-07', 'Approved', ok) })
  add(114, { issuedAt: now - 30 * M60, activateAt: now + 4 * H, expireAt: now + 12 * H })
  return { gs, evs }
}
function gTimeline(g, S) {
  const now = Date.now(), it = [{ ts: g.issuedAt, txt: 'QR generated for Guest ' + g.id, k: 'gen' }, { ts: g.activateAt, txt: g.activateAt <= now ? 'Invitation activated' : 'Invitation will activate', k: 'act', future: g.activateAt > now }, ...g.tl.map(x => ({ ...x, k: 'act' }))]
  S.events.filter(e => e.qr === g.qrId).forEach(e => { const gn = GATES.find(x => x.id === e.gate).name; it.push({ ts: e.ts, txt: 'QR scanned at ' + gn + ' (' + e.gate + ')' + (e.sim ? ' · DEMO' : ''), k: 'scan' })
    if (e.dec === 'Approved') { it.push({ ts: e.ts + 1, txt: (e.dir === 'Entry' ? 'Entry' : 'Exit') + ' approved', k: 'ok' }); it.push({ ts: Math.min(e.ts + 120000, Math.max(e.ts + 2, now)), txt: e.dir === 'Entry' ? 'Guest entered the resort' : 'Guest exited through ' + gn, k: e.dir === 'Entry' ? 'in' : 'out' }) } else it.push({ ts: e.ts + 1, txt: 'Access DENIED – ' + e.reason, k: 'no' }) })
  return it.sort((a, b) => a.ts - b.ts)
}
function ScanResult({ ev, S, showCam }) {
  if (!ev) return null; const g = S.guests.find(x => x.id === ev.guest), gn = GATES.find(x => x.id === ev.gate), cam = CAMS.find(c => c.id === ev.cam), ap = ev.dec === 'Approved'
  return <div className="card" style={{ marginTop: 10, borderLeft: '6px solid ' + (ap ? '#2aa198' : '#e5675f') }}><div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Cormorant Garamond,serif' }} className={ap ? 'Normal' : 'Critical'}>{ap ? '✔ APPROVED' : '✖ DENIED'} <span className="tag" style={{ color: '#b07a00' }}>DEMO · simulated scan</span></div>
    <div className="grid g2" style={{ margin: '6px 0' }}><div style={{ textAlign: 'center' }}><QRImg text={tokOf(S, ev.qr)} size={150} /><div className="sub">Scanned QR (secure token only)</div></div>
      <Table cols={['Field', 'Value']} rows={[['QR ID', ev.qr], ['Guest profile', g ? g.id + ' · ' + g.name : ev.type], ['Host / unit', g ? g.hostName + ' · ' + g.unit : ev.unit || '—'], ['Gate', (gn ? gn.name : '') + ' (' + ev.gate + ') · ' + ev.dir], ['Scanned at', new Date(ev.ts).toLocaleString()], ['Result', ev.result], ['Reason', ev.reason || '—'], ['Camera', ev.cam || '—'], ['Guest presence now', g ? (g.inside ? 'INSIDE the resort' : 'OUTSIDE') : '—']]} /></div>
    {showCam && cam && <div style={{ maxWidth: 360 }}><CamView cam={cam} ci={camInfo(S, cam)} url={S.streams[cam.id]} /><div className="sub">Connected camera {cam.id} · simulated view</div></div>}</div>
}
function GuestAccess({ S, A, units, asOwner, showCam }) {
  const [f, setF] = useState({ date: 'All', unit: 'All', owner: 'All', gate: 'All', status: 'All', q: '' }), [sel, setSel] = useState(null), [last, setLast] = useState(null), [sim, setSim] = useState({ gate: 'GATE-01', dir: 'Entry' }), [msg, setMsg] = useState('')
  const pool = units.filter(u => u.handover === 'Handed over' && u.occupancy === 'Occupied').slice(0, 80), d0 = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ name: '', unit: pool[0].id, date: d0, start: '12:00', end: '20:00', gate: 'ALL', zones: ['Resort entry'], plate: '' })
  const G = S.guests, now = Date.now(), st = g => gStatus(g, now), day = new Date(); day.setHours(0, 0, 0, 0); const t0 = day.getTime()
  const rows = G.filter(g => (f.status === 'All' || st(g) === f.status) && (f.unit === 'All' || g.unit === f.unit) && (f.owner === 'All' || g.hostName === f.owner) && (f.gate === 'All' || g.gates.includes('ALL') || g.gates.includes(f.gate)) && (f.date === 'All' || (f.date === 'Today' ? g.activateAt >= t0 && g.activateAt < t0 + 86400000 : f.date === 'Upcoming' ? g.activateAt >= t0 + 86400000 || g.activateAt > now : g.expireAt < now)) && (!f.q || (g.id + g.name + g.qrId + g.hostName + g.unit).toLowerCase().includes(f.q.toLowerCase())))
  const ge = S.events.filter(e => e.guest), g = G.find(x => x.id === sel), ev = g ? S.events.filter(e => e.qr === g.qrId) : []
  const act = (id, a) => { const r = A.guestAct(id, a, asOwner); if (r === 'denied') { setMsg('Permission denied for your role (logged).'); setTimeout(() => setMsg(''), 3000) } }
  const create = () => { if (!form.name.trim()) { setMsg('Enter a guest name or demo identity.'); return } const r = A.createGuest(form, asOwner); if (r === 'denied') setMsg('Permission denied for your role (logged).'); else if (r.err) setMsg(r.err); else { setMsg('Invitation ' + r.id + ' created – QR generated.'); setSel(r.id); setLast(null) } setTimeout(() => setMsg(''), 4000) }
  const zs = ['Resort entry', 'Beach', 'Clubhouse', 'Pools', 'Hotel']
  return <>
    <div className="grid"><Kpi l="Total guest invitations" v={G.length} /><Kpi l="Active guest QR codes" v={G.filter(x => st(x) === 'Active').length} /><Kpi l="Expired QR codes" v={G.filter(x => st(x) === 'Expired').length} /><Kpi l="Revoked QR codes" v={G.filter(x => st(x) === 'Revoked').length} /><Kpi l="Guests inside the resort" v={G.filter(x => x.inside).length} /><Kpi l="Guests who have exited" v={new Set(ge.filter(e => e.dir === 'Exit' && e.dec === 'Approved').map(e => e.guest)).size} /><Kpi l="Pending invitations" v={G.filter(x => st(x) === 'Pending').length} /><Kpi l="Rejected access attempts" v={ge.filter(e => e.dec === 'Denied').length} /></div>
    {msg && <div className="card" style={{ marginBottom: 10 }}><b>{msg}</b></div>}
    <div className="grid g2"><div className="card"><h3>New guest invitation</h3>
        <div className="sub">Each invitation gets its own unique QR (a random token – no personal data is encoded).</div>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
          <label className="sub">Guest name / demo identity<input style={{ width: '100%' }} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Demo guest Lina K." /></label>
          <label className="sub">Unit (host auto-filled)<select style={{ width: '100%' }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{pool.map(u => <option key={u.id} value={u.id}>{u.id} · {u.owner}</option>)}</select></label>
          <label className="sub">Visit date<input type="date" style={{ width: '100%' }} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
          <label className="sub">Allowed gate<select style={{ width: '100%' }} value={form.gate} onChange={e => setForm({ ...form, gate: e.target.value })}><option value="ALL">Any gate</option>{GATES.map(x => <option key={x.id} value={x.id}>{x.id} · {x.name}</option>)}</select></label>
          <label className="sub">Start time<input type="time" style={{ width: '100%' }} value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></label>
          <label className="sub">Expiration time<input type="time" style={{ width: '100%' }} value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></label>
          <label className="sub">Vehicle plate (optional)<input style={{ width: '100%' }} value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} placeholder="DEMO-0000" /></label>
          <div className="sub">Access zones<br />{zs.map(z => <label key={z} style={{ marginRight: 8 }}><input type="checkbox" style={{ padding: 0 }} checked={form.zones.includes(z)} onChange={() => setForm({ ...form, zones: form.zones.includes(z) ? form.zones.filter(x => x !== z) : [...form.zones, z] })} />{z}</label>)}</div></div>
        <button className="btn pri" style={{ marginTop: 10 }} onClick={create}>Create invitation & generate QR</button></div>
      <div className="card"><h3>Guest register</h3><input placeholder="Search guest, QR, host, unit…" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} /> <select value={f.date} onChange={e => setF({ ...f, date: e.target.value })}>{['All', 'Today', 'Upcoming', 'Past'].map(x => <option key={x}>{x}</option>)}</select> <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}>{['All', 'Active', 'Pending', 'Expired', 'Revoked', 'Used'].map(x => <option key={x}>{x}</option>)}</select> <select value={f.gate} onChange={e => setF({ ...f, gate: e.target.value })}>{['All', ...GATES.map(x => x.id)].map(x => <option key={x}>{x}</option>)}</select>
        <select value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })}>{['All', ...new Set(G.map(x => x.unit))].map(x => <option key={x}>{x}</option>)}</select> <select value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })}>{['All', ...new Set(G.map(x => x.hostName))].map(x => <option key={x}>{x}</option>)}</select>
        <div style={{ maxHeight: 360, overflow: 'auto', marginTop: 6 }}><Table cols={['Guest', 'Host · unit', 'Visit', 'QR', 'Status', 'Presence']} rows={rows.map(x => [<a style={{ cursor: 'pointer', color: 'var(--a)', fontWeight: 600 }} onClick={() => { setSel(x.id); setLast(null) }}>{x.id}</a>, x.hostName + ' · ' + x.unit, fmtDT(x.activateAt), x.qrId, <b className={stC(st(x) === 'Active' ? 'Online' : st(x) === 'Pending' ? 'Pending' : st(x) === 'Used' ? 'Online' : 'Offline')}>{st(x)}</b>, <b className={x.inside ? 'Normal' : ''}>{x.inside ? 'Inside' : 'Outside'}</b>])} /></div><div className="sub">{rows.length} guests</div></div></div>
    {g && <div className="card" style={{ marginTop: 14 }}><h3>Guest profile – {g.id} · {g.name}</h3>
      <div className="grid g2"><div style={{ textAlign: 'center' }}><div className="qrframe"><QRImg text={g.token} size={240} /></div><div><span className="tag" style={{ color: '#b07a00' }}>DEMO QR</span> <span className={'tag ' + (st(g) === 'Active' ? 'Normal' : st(g) === 'Pending' ? 'Warning' : 'Critical')}>{st(g)}</span> <span className="tag">{g.inside ? 'INSIDE' : 'OUTSIDE'}</span></div><div className="sub">Token: {g.token}</div>
          <div style={{ marginTop: 8 }}><button className="btn sm pri" onClick={() => act(g.id, 'regen')}>Generate new QR</button> <button className="btn sm" onClick={() => qrDownload(g.token, g.qrId + ' · ' + g.id, g.qrId)}>⬇ Download</button> <button className="btn sm" onClick={() => qrPrint(g.token, g.qrId + ' · ' + g.id)}>🖨 Print</button> <button className="btn sm" onClick={() => { copyText(g.qrId); setMsg('QR reference copied: ' + g.qrId); setTimeout(() => setMsg(''), 2500) }}>Copy reference</button> <button className="btn sm" onClick={() => act(g.id, 'revoke')}>Revoke</button> <button className="btn sm" onClick={() => act(g.id, 'renew')}>Renew (+6 h)</button> <button className="btn sm" onClick={() => document.getElementById('gh-' + g.id) && document.getElementById('gh-' + g.id).scrollIntoView({ behavior: 'smooth' })}>Access history</button></div></div>
        <Table cols={['Field', 'Value']} rows={[['QR ID', g.qrId], ['Guest reference', g.id], ['Guest (demo identity)', g.name], ['Host / owner', g.hostName], ['Unit', g.unit], ['Permissions', g.zones.join(', ')], ['Allowed gates', g.gates.includes('ALL') ? 'Any gate' : g.gates.join(', ')], ['Vehicle', g.plate || '—'], ['Issued', fmtDT(g.issuedAt)], ['Activation', fmtDT(g.activateAt)], ['Expiration', fmtDT(g.expireAt)], ['Single use', g.singleUse ? 'Yes' : 'No'], ['Status', st(g)]]} /></div>
      <h3 style={{ marginTop: 14 }}>Simulate gate scan <span className="tag" style={{ color: '#b07a00' }}>DEMO</span></h3><div className="sub">Entry or exit is recorded only after a successful verification – displaying a QR never marks the guest as inside.</div>
      <select value={sim.gate} onChange={e => setSim({ ...sim, gate: e.target.value })}>{GATES.map(x => <option key={x.id} value={x.id}>{x.id} · {x.name}</option>)}</select> <select value={sim.dir} onChange={e => setSim({ ...sim, dir: e.target.value })}><option>Entry</option><option>Exit</option></select> <button className="btn pri sm" onClick={() => setLast(A.scanToken(g.token, sim.gate, sim.dir, true))}>Scan this QR</button> {g.old.length > 0 && <button className="btn sm" onClick={() => setLast(A.scanToken(g.old[0], sim.gate, sim.dir, true))}>Scan previous (replaced) QR</button>}
      <ScanResult ev={last} S={S} showCam={showCam} />
      <h3 style={{ marginTop: 14 }}>Chronological timeline</h3><div className="tline">{gTimeline(g, S).map((x, i) => <div key={i} className={'ti ' + x.k} style={{ opacity: x.future ? .5 : 1 }}><i /><span className="sub">{fmtDT(x.ts)}</span> {x.txt}</div>)}</div>
      <h3 id={'gh-' + g.id} style={{ marginTop: 14 }}>QR scan history</h3>{ev.length ? <Table cols={['QR', 'Guest', 'Date', 'Time', 'Gate', 'Dir.', 'Decision', 'Reason', 'Camera', 'Vehicle']} rows={ev.map(e => [e.qr, g.id, new Date(e.ts).toLocaleDateString(), fmtT(e.ts), GATES.find(x => x.id === e.gate).name + ' (' + e.gate + ')', e.dir, <b className={stC(e.dec)}>{e.dec}</b>, e.reason || '—', e.cam || '—', e.veh || '—'])} /> : <div className="sub">No scans recorded yet.</div>}</div>}
  </>
}

/* ============ APP SHELL ============ */

const SV = p => <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{p}</svg>
const NAVIC = [
  SV(<><path d="M3 27h26" /><path d="M6 27V14l7-4v17" fill="currentColor" fillOpacity=".18" /><path d="M13 27V6l8 5v16" fill="currentColor" fillOpacity=".12" /><path d="M21 27V16l5 3v8" fill="currentColor" fillOpacity=".18" /><path d="M9 17h1M9 21h1M16 12h2M16 16h2M16 20h2M23 22h1" /><path d="M3 30c2.3-1.6 4.7 1.6 7 0s4.7 1.6 7 0 4.7 1.6 7 0 3-1 5 0" /></>),
  SV(<><circle cx="16" cy="16" r="13" fill="currentColor" fillOpacity=".1" /><path d="M18.5 4L8 18h7l-2 10 11-15h-7z" fill="currentColor" fillOpacity=".28" /></>),
  SV(<><path d="M16 15v15M10 30l6-15 6 15M12.5 24h7M14 19.5h4" /><circle cx="16" cy="12" r="2.2" fill="currentColor" /><path d="M11 7.5a7 7 0 0 0 0 9M21 7.5a7 7 0 0 1 0 9M7.5 4a12 12 0 0 0 0 16M24.5 4a12 12 0 0 1 0 16" /></>),
  SV(<><rect x="3.5" y="3.5" width="9" height="9" rx="1.8" /><rect x="19.5" y="3.5" width="9" height="9" rx="1.8" /><rect x="3.5" y="19.5" width="9" height="9" rx="1.8" /><rect x="6.5" y="6.5" width="3" height="3" fill="currentColor" /><rect x="22.5" y="6.5" width="3" height="3" fill="currentColor" /><rect x="6.5" y="22.5" width="3" height="3" fill="currentColor" /><path d="M19.5 19.5h3v3h-3zM25.5 19.5h3M19.5 25.5h3M25.5 22.5v6h-3" /></>),
  SV(<><path d="M21.5 3.5a6.5 6.5 0 0 0-6 8.8L4.8 23a2.9 2.9 0 0 0 4.2 4.2l10.7-10.7a6.5 6.5 0 0 0 8.8-6l-4 3.4-3.8-.8-.8-3.8z" fill="currentColor" fillOpacity=".2" /><circle cx="7" cy="25" r=".9" fill="currentColor" /></>),
  SV(<><path d="M4 4v24h24" /><rect x="8" y="18" width="4" height="8" rx="1" fill="currentColor" fillOpacity=".25" /><rect x="14" y="13" width="4" height="13" rx="1" fill="currentColor" fillOpacity=".25" /><rect x="20" y="9" width="4" height="17" rx="1" fill="currentColor" fillOpacity=".25" /><path d="M7 13l6-5 5 3 8-7" /><path d="M22 4h4v4" /></>),
  SV(<><path d="M16 3l11 6v14l-11 6-11-6V9z" fill="currentColor" fillOpacity=".12" /><path d="M5 9l11 6 11-6M16 15v14" /><ellipse cx="16" cy="30" rx="10" ry="1.4" /></>),
  SV(<><path d="M16 3l11 4v8c0 7-5 12-11 14C10 27 5 22 5 15V7z" fill="currentColor" fillOpacity=".12" /><rect x="10" y="12" width="9" height="7" rx="1.5" /><circle cx="14.5" cy="15.5" r="2" /><path d="M19 14l3-2v7l-3-2" /></>),
]
const ICO = {
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></svg>,
  sim: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="#f2b04a" stroke="#f2b04a" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffd978" stroke="#ffd978" strokeWidth="1.5" strokeLinejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></svg>,
}
const ThemeSw = ({ theme, setTheme }) => <button className="sw" aria-label="Switch light / dark mode" title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><span className="swk">{theme === 'light' ? ICO.sun : ICO.moon}</span></button>
const NAV = [[0,'Overview'],[1,'Energy & Sustainability'],[2,'COC'],[3,'City & Management'],[4,'Operations & Maintenance'],[5,'Business & Finance'],[6,'Holographic Resort Twin'],[7,'Security & Gate Control']]
export default function App() {
  const [tab, setTab] = useState(0), [fac, setFac] = useState('lagoon'), [mi, setMi] = useState(new Date().getMonth()), [sim, setSim] = useState(false), [bell, setBell] = useState(false), [q, setQ] = useState('')
  const [p, setP] = useState(() => ({ ...BASE, ...(JSON.parse(localStorage.getItem('ss_sim') || 'null') || {}) }))
  const [alerts, setAlerts] = useState(SEED_ALERTS)
  const [units, setUnits] = useState(() => { try { const s = JSON.parse(localStorage.getItem('ss_units') || 'null'); if (s && s.length && s[0].building) return s } catch (_) {} return UNITS0 })
  useEffect(() => { try { localStorage.setItem('ss_units', JSON.stringify(units)) } catch (_) {} }, [units])
  const us = useMemo(() => uStats(units), [units])
  const [theme, setTheme] = useState(() => { const t = localStorage.getItem('ss_theme') || 'light'; document.documentElement.dataset.theme = t; return t }), [logo, setLogo] = useState(() => localStorage.getItem('ss_logo') || '')
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('ss_theme', theme) }, [theme])
  const pickLogo = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { setLogo(r.result); try { localStorage.setItem('ss_logo', r.result) } catch (_) {} }; r.readAsDataURL(f) }
  useEffect(() => localStorage.setItem('ss_sim', JSON.stringify(p)), [p])
  const addAlert = a => setAlerts(x => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString().slice(0, 5), status:'Open', ...a }, ...x])
  const { S: sec, A: SA } = useSecurity(units, addAlert)
  const [twinReq, setTwinReq] = useState(null), [secFocus, setSecFocus] = useState(null)
  const M = useMemo(() => ({ ...calc(mi, p), p, newU: p.newUnits, newUnitsTotal: p.newUnits + 300 }), [mi, p])
  const B = useMemo(() => calc(mi, BASE), [mi])
  useEffect(() => { if (M.kwh > B.kwh * 1.25 && !alerts.some(a => a.desc.startsWith('High electricity'))) addAlert({ sev:'Warning', fac:'Main Substation', desc:'High electricity consumption vs baseline (+25%)', act:'Review load shedding & HVAC schedules' }) }, [M.kwh])
  const filt = q ? FAC.filter(f => f.name.toLowerCase().includes(q.toLowerCase())) : []
  const open = alerts.filter(a => a.status !== 'Resolved').length
  return <div className="app"><div className="side"><img className="sunlogo" src={window.IMGS.logoSun} alt="Silver Sands" />{NAV.map((n, i) => <button key={i} className={'nav' + (tab === i ? ' on' : '')} title={n[1]} onClick={() => setTab(i)}><span>{NAVIC[n[0]]}</span>{n[1].split(' ')[0]}</button>)}<div style={{ marginTop: 'auto' }}><ThemeSw theme={theme} setTheme={setTheme} /></div></div>
    <div className="main"><div className="top"><img className="brand" src={window.IMGS.logo} alt="Silver Sands North Coast" /><div style={{ position:'relative', flex:1 }}><input placeholder="Search facilities…" value={q} onChange={e => setQ(e.target.value)} />{filt.length > 0 && <div className="card" style={{ position:'absolute', top:42, zIndex:9 }}>{filt.map(f => <div key={f.id} style={{ cursor:'pointer', padding:4 }} onClick={() => { setFac(f.id); setTab(4); setQ('') }}>{f.name}</div>)}</div>}</div>
      <DigitalClock /><span className="tag Normal">● Systems nominal</span><button className="btn" onClick={() => setSim(!sim)}>{ICO.sim} Simulation</button><button className="btn" onClick={() => setBell(!bell)}>{ICO.bell} {open}</button><span className="sub">{theme === 'light' ? 'Light' : 'Dark'}</span><ThemeSw theme={theme} setTheme={setTheme} /><label className="logo" title="Click to upload your Schneider Electric logo">{logo ? <img src={logo} alt="Schneider Electric" /> : <span><i>●</i> Schneider Electric</span>}<input type="file" accept="image/*" hidden onChange={pickLogo} /></label><span className="tag">Admin · Demo</span></div>
      {bell && <div className="card" style={{ position:'fixed', right:20, top:60, width:430, zIndex:30, maxHeight:'70vh', overflow:'auto' }}><h3>Notification center</h3>{alerts.map(a => <div key={a.id} style={{ borderBottom:'1px solid var(--bd)', padding:'8px 0', fontSize:12 }}><b className={a.sev}>{a.sev}</b> · {a.time} · {a.fac} · <i>{a.status}</i><div>{a.desc}</div><div className="sub">Action: {a.act}</div>{a.status === 'Open' && <button className="btn sm" onClick={() => setAlerts(alerts.map(x => x.id === a.id ? { ...x, status:'Acknowledged' } : x))}>Acknowledge</button>} {a.status !== 'Resolved' && <button className="btn sm" onClick={() => setAlerts(alerts.map(x => x.id === a.id ? { ...x, status:'Resolved' } : x))}>Resolve</button>}</div>)}</div>}
      <div className="pg"><h1>{NAV[tab][1]}</h1><div className="sub">Viewing {MONTHS[mi]} · all data simulated · {JSON.stringify(p) === JSON.stringify(BASE) ? 'Baseline scenario' : 'Simulated scenario active'}</div>
        {tab === 0 && <Overview M={M} B={B} mi={mi} alerts={alerts} setFac={setFac} fac={fac} us={us} sec={sec} />}
        {tab === 1 && <Energy M={M} B={B} p={p} setFac={setFac} fac={fac} />}
        {tab === 2 && <Summit M={M} addAlert={addAlert} sec={sec} />}
        {tab === 3 && <Resident M={M} units={units} setUnits={setUnits} sec={sec} SA={SA} />}
        {tab === 4 && <Ops M={M} setFac={setFac} fac={fac} addAlert={addAlert} />}
        {tab === 5 && <Business M={M} B={B} p={p} />}
        {tab === 6 && <Twin M={M} units={units} alerts={alerts} theme={theme} sec={sec} twinReq={twinReq} clearReq={() => setTwinReq(null)} openSecCenter={id => { setSecFocus(id ? { id } : null); setTab(7) }} />}
        {tab === 7 && <SecurityCenter S={sec} A={SA} M={M} units={units} openTwin={id => { setTwinReq({ id }); setTab(6) }} focus={secFocus} clearFocus={() => setSecFocus(null)} />}
      </div></div>{sim && <SimPanel p={p} setP={setP} mi={mi} setMi={setMi} close={() => setSim(false)} />}</div>
}

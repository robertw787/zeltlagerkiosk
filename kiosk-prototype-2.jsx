import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── Demo-Daten ──────────────────────────────────────────────
const KINDER_INIT = [
  { id: 1, name: "Anna L.", guthaben: 12.5, startGuthaben: 15.0 },
  { id: 2, name: "Ben K.", guthaben: 8.0, startGuthaben: 10.0 },
  { id: 3, name: "Clara M.", guthaben: 0.5, startGuthaben: 10.0 },
  { id: 4, name: "David S.", guthaben: 20.0, startGuthaben: 20.0 },
  { id: 5, name: "Emma T.", guthaben: 6.0, startGuthaben: 6.0 },
  { id: 6, name: "Finn R.", guthaben: -1.5, startGuthaben: 5.0 },
];

const MITARBEITER_INIT = [
  { id: 1, name: "Max", rolle: "admin", user: "admin", pass: "admin", guthaben: 10.0, startGuthaben: 10.0, code: null },
  { id: 2, name: "Lisa", rolle: "verkauf", user: "lisa", pass: "lisa", guthaben: 5.0, startGuthaben: 5.0, code: null },
  { id: 3, name: "Jonas", rolle: "verkauf", user: null, pass: null, guthaben: 0.0, startGuthaben: 0.0, code: "K7F2QX" },
  { id: 4, name: "Petra (Küche)", rolle: "einkauf", user: null, pass: null, guthaben: 8.0, startGuthaben: 8.0, code: null },
];

const PRODUKTE_INIT = [
  { id: 1, name: "Gummibärchen", preis: 0.5, bestand: 40, kategorie: "Süßes", emoji: "🐻", aktiv: true },
  { id: 2, name: "Schokoriegel", preis: 1.0, bestand: 25, kategorie: "Süßes", emoji: "🍫", aktiv: true },
  { id: 3, name: "Lutscher", preis: 0.3, bestand: 60, kategorie: "Süßes", emoji: "🍭", aktiv: true },
  { id: 4, name: "Chips", preis: 1.2, bestand: 0, kategorie: "Snacks", emoji: "🥔", aktiv: false },
  { id: 5, name: "Apfelsaft", preis: 0.8, bestand: 30, kategorie: "Getränke", emoji: "🧃", aktiv: true },
  { id: 6, name: "Wasser", preis: 0.4, bestand: 50, kategorie: "Getränke", emoji: "💧", aktiv: true },
  { id: 7, name: "Kaugummi", preis: 0.4, bestand: 35, kategorie: "Süßes", emoji: "🫧", aktiv: true },
  { id: 8, name: "Brezel", preis: 0.9, bestand: 18, kategorie: "Snacks", emoji: "🥨", aktiv: true },
];

// ─── Helpers ─────────────────────────────────────────────────
const euro = (n) => (n < 0 ? "-" : "") + Math.abs(n).toFixed(2).replace(".", ",") + " €";
const now = () => new Date().toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit" });
const today = () => new Date().toLocaleDateString("de-DE");
let _bid = 100;
const newId = () => ++_bid;
const PIE_COLORS = ["#e8734a", "#4caf76", "#4a90d9", "#e8a034", "#9b59b6", "#1abc9c", "#e05555", "#f39c12"];

// Rollen: admin & verkauf brauchen Zugang (Login), einkauf kauft nur ein (kein Zugang)
const ROLLEN = {
  admin:   { label: "Admin",       farbe: "#e8734a", zugang: true },
  verkauf: { label: "Verkauf",     farbe: "#4caf76", zugang: true },
  einkauf: { label: "Nur Einkauf", farbe: "#4a90d9", zugang: false },
};
const rolleInfo = (r) => ROLLEN[r] || ROLLEN.verkauf;

// ─── Theme ───────────────────────────────────────────────────
const T = {
  bg: "#fdf6ec", card: "#ffffff", accent: "#e8734a", accentHover: "#d4623b",
  green: "#4caf76", greenHover: "#3d9963", red: "#e05555", blue: "#4a90d9",
  text: "#2d2a26", muted: "#8a8580", border: "#e8e2d9", tagBg: "#fef0e6",
  shadow: "0 2px 12px rgba(45,42,38,0.07)", radius: "14px",
};
const font = `'Nunito', sans-serif`;

// ─── Styles ──────────────────────────────────────────────────
const S = {
  app: { fontFamily: font, background: T.bg, color: T.text, minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 6px rgba(0,0,0,0.04)", gap: "10px" },
  logo: { fontSize: "20px", fontWeight: 800, color: T.accent, display: "flex", alignItems: "center", gap: "8px", letterSpacing: "-0.5px", whiteSpace: "nowrap" },
  nav: { display: "flex", gap: "4px", background: "#f5f0e8", borderRadius: "12px", padding: "4px" },
  navBtn: (a) => ({ padding: "8px 16px", borderRadius: "10px", border: "none", cursor: "pointer", fontFamily: font, fontSize: "14px", fontWeight: a ? 700 : 500, background: a ? "#fff" : "transparent", color: a ? T.accent : T.muted, boxShadow: a ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all .15s", whiteSpace: "nowrap" }),
  main: { flex: 1, padding: "20px", maxWidth: "1100px", width: "100%", margin: "0 auto" },
  card: { background: T.card, borderRadius: T.radius, boxShadow: T.shadow, padding: "18px", border: `1px solid ${T.border}` },
  h2: { fontSize: "20px", fontWeight: 800, marginBottom: "4px", letterSpacing: "-0.3px" },
  sub: { fontSize: "13px", color: T.muted, marginBottom: "16px" },
  btn: (bg) => ({ padding: "12px 18px", borderRadius: "11px", border: "none", background: bg, color: "#fff", fontFamily: font, fontWeight: 700, fontSize: "15px", cursor: "pointer", minHeight: "46px" }),
  btnSmall: (bg) => ({ padding: "8px 12px", borderRadius: "9px", border: "none", background: bg, color: "#fff", fontFamily: font, fontWeight: 700, fontSize: "13px", cursor: "pointer", minHeight: "38px" }),
  input: { padding: "12px 14px", borderRadius: "10px", border: `1.5px solid ${T.border}`, fontFamily: font, fontSize: "15px", width: "100%", background: "#fff", color: T.text, outline: "none" },
  badge: (bg) => ({ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: bg, color: "#fff", marginLeft: "6px" }),
  pill: (bg, col) => ({ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: bg, color: col }),
};

const RESPONSIVE_CSS = `
  * { box-sizing: border-box; margin: 0; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; }
  button:active { transform: scale(0.97); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: #d4cfc7; border-radius: 3px; }

  .mobileNav { display: none; }
  .mobileCartBar { display: none; }
  .userTag { display: inline; }

  /* ── Mobile ── */
  @media (max-width: 760px) {
    .desktopNav { display: none !important; }
    .mobileNav {
      display: flex !important; position: fixed; bottom: 0; left: 0; right: 0;
      background: #fff; border-top: 1px solid ${T.border}; z-index: 60;
      padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); justify-content: space-around;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
    }
    .mobileNavBtn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
      border: none; background: none; font-family: ${font}; cursor: pointer; padding: 6px 2px; min-height: 52px; }
    .appMainWrap { padding-bottom: 78px; }
    .appMain { padding: 14px !important; }
    .hideMobile { display: none !important; }
    .stack { flex-direction: column !important; }
    .stack > * { width: 100% !important; }
    .cartSidebar { display: none !important; }
    .mobileCartBar { display: flex !important; }
    .prodGrid { grid-template-columns: repeat(2, 1fr) !important; }
    .twoCol { grid-template-columns: 1fr !important; }
    .kpiGrid { grid-template-columns: repeat(2, 1fr) !important; }
    .modalCard { max-width: 100% !important; border-radius: 18px 18px 0 0 !important;
      position: fixed !important; bottom: 0; left: 0; right: 0; max-height: 90vh !important;
      animation: slideUp .22s ease !important; }
    .modalWrap { align-items: flex-end !important; padding: 0 !important; }
    .h2m { font-size: 18px !important; }
    .scrollX { overflow-x: auto; }
  }
  @media (max-width: 380px) {
    .prodGrid { grid-template-columns: repeat(2, 1fr) !important; }
    .logoText { display: none; }
  }
`;

// ─── Login ───────────────────────────────────────────────────
function Login({ onLogin, mitarbeiter }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    const m = mitarbeiter.find((x) => x.user === user.trim() && x.pass === pass);
    if (m) onLogin(m);
    else setErr("Benutzername oder Passwort stimmt nicht.");
  };

  return (
    <div style={{ ...S.app, alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{RESPONSIVE_CSS}</style>
      <div style={{ ...S.card, width: "100%", maxWidth: "380px", textAlign: "center", padding: "28px 22px" }}>
        <div style={{ fontSize: "44px", marginBottom: "6px" }}>🏕️</div>
        <div style={{ fontSize: "24px", fontWeight: 800, color: T.accent, marginBottom: "2px" }}>Camp Kiosk</div>
        <div style={{ fontSize: "13px", color: T.muted, marginBottom: "22px" }}>Anmelden, um den Kiosk zu öffnen</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input style={S.input} placeholder="Benutzername" value={user}
            onChange={(e) => setUser(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoCapitalize="none" />
          <input style={S.input} type="password" placeholder="Passwort" value={pass}
            onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          {err && <div style={{ color: T.red, fontSize: "13px", fontWeight: 600 }}>{err}</div>}
          <button style={S.btn(T.accent)} onClick={submit}>Anmelden</button>
        </div>
        <div style={{ marginTop: "18px", fontSize: "12px", color: T.muted }}>Demo-Zugang: <b>admin / admin</b></div>
      </div>
    </div>
  );
}

// ─── Verkauf (Kinder & Team kaufen) ──────────────────────────
function VerkaufPage({ kinder, setKinder, mitarbeiter, setMitarbeiter, produkte, setProdukte, addBestellung, aktuellerMa }) {
  const [kaeuferTyp, setKaeuferTyp] = useState("kind"); // "kind" | "mitarbeiter"
  const [kaeuferId, setKaeuferId] = useState(null);
  const [suche, setSuche] = useState("");
  const [warenkorb, setWarenkorb] = useState({}); // produktId -> menge
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const liste = kaeuferTyp === "kind" ? kinder : mitarbeiter;
  const setListe = kaeuferTyp === "kind" ? setKinder : setMitarbeiter;
  const kaeufer = liste.find((x) => x.id === kaeuferId) || null;

  const gefiltert = liste.filter((x) => x.name.toLowerCase().includes(suche.toLowerCase()));
  const aktiveProdukte = produkte.filter((p) => p.aktiv);

  const warenkorbItems = Object.entries(warenkorb)
    .map(([pid, menge]) => { const p = produkte.find((x) => x.id === +pid); return p ? { ...p, menge } : null; })
    .filter(Boolean);
  const summe = warenkorbItems.reduce((s, i) => s + i.preis * i.menge, 0);
  const anzahl = warenkorbItems.reduce((s, i) => s + i.menge, 0);

  const add = (p) => {
    if (p.bestand <= (warenkorb[p.id] || 0)) return;
    setWarenkorb((w) => ({ ...w, [p.id]: (w[p.id] || 0) + 1 }));
  };
  const sub = (pid) => setWarenkorb((w) => {
    const n = (w[pid] || 0) - 1; const c = { ...w };
    if (n <= 0) delete c[pid]; else c[pid] = n; return c;
  });

  const bestellen = () => {
    if (!kaeufer || warenkorbItems.length === 0) return;
    // Bestand reduzieren
    setProdukte((prev) => prev.map((p) => warenkorb[p.id] ? { ...p, bestand: p.bestand - warenkorb[p.id] } : p));
    // Guthaben abziehen (Überziehen erlaubt)
    setListe((prev) => prev.map((x) => x.id === kaeufer.id ? { ...x, guthaben: +(x.guthaben - summe).toFixed(2) } : x));
    addBestellung({
      id: newId(), kaeuferTyp, kaeuferId: kaeufer.id, kaeuferName: kaeufer.name,
      summe: +summe.toFixed(2), status: "aktiv", ts: now(), datum: today(),
      verkauftVon: aktuellerMa.name,
      positionen: warenkorbItems.map((i) => ({ produktId: i.id, name: i.name, menge: i.menge, einzelpreis: i.preis })),
    });
    const ueberzogen = kaeufer.guthaben - summe < 0;
    setToast({ name: kaeufer.name, summe, ueberzogen });
    setWarenkorb({}); setCartOpen(false);
    setTimeout(() => setToast(null), 3200);
  };

  const Cart = () => (
    <div>
      <div style={{ fontWeight: 800, fontSize: "16px", marginBottom: "10px" }}>🛒 Warenkorb</div>
      {!kaeufer && <div style={{ fontSize: "13px", color: T.muted, padding: "8px 0" }}>Erst {kaeuferTyp === "kind" ? "ein Kind" : "eine Person"} auswählen.</div>}
      {kaeufer && (
        <div style={{ background: T.tagBg, borderRadius: "10px", padding: "8px 12px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "14px" }}>{kaeufer.name}</span>
          <span style={{ fontWeight: 800, fontSize: "13px", color: kaeufer.guthaben < 0 ? T.red : T.green }}>{euro(kaeufer.guthaben)}</span>
        </div>
      )}
      {warenkorbItems.length === 0 && <div style={{ fontSize: "13px", color: T.muted, padding: "8px 0" }}>Noch nichts ausgewählt.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "230px", overflowY: "auto" }}>
        {warenkorbItems.map((i) => (
          <div key={i.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <span style={{ fontSize: "14px", flex: 1 }}>{i.emoji} {i.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button style={{ ...S.btnSmall("#eee"), color: T.text, minWidth: "34px", minHeight: "34px", padding: "0" }} onClick={() => sub(i.id)}>−</button>
              <span style={{ fontWeight: 700, minWidth: "18px", textAlign: "center" }}>{i.menge}</span>
              <button style={{ ...S.btnSmall(T.green), minWidth: "34px", minHeight: "34px", padding: "0" }} onClick={() => add(i)}>+</button>
              <span style={{ fontWeight: 700, fontSize: "13px", minWidth: "52px", textAlign: "right" }}>{euro(i.preis * i.menge)}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${T.border}`, marginTop: "12px", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: "16px" }}>Summe</span>
        <span style={{ fontWeight: 900, fontSize: "18px", color: T.accent }}>{euro(summe)}</span>
      </div>
      {kaeufer && summe > 0 && kaeufer.guthaben - summe < 0 && (
        <div style={{ background: "#fdecec", color: T.red, borderRadius: "10px", padding: "8px 12px", marginTop: "10px", fontSize: "12.5px", fontWeight: 700 }}>
          ⚠️ Guthaben wird überzogen! Neuer Stand: {euro(kaeufer.guthaben - summe)}
        </div>
      )}
      <button style={{ ...S.btn(T.green), width: "100%", marginTop: "12px", opacity: kaeufer && warenkorbItems.length ? 1 : 0.5 }}
        disabled={!kaeufer || !warenkorbItems.length} onClick={bestellen}>
        Bestellen · {euro(summe)}
      </button>
    </div>
  );

  return (
    <div style={{ animation: "fadeIn .25s" }}>
      <div style={S.h2} className="h2m">Verkauf</div>
      <div style={S.sub}>Käufer wählen, Produkte antippen, bestellen. Guthaben wird automatisch verrechnet.</div>

      {/* Käufer-Typ Umschalter */}
      <div style={{ display: "inline-flex", gap: "4px", background: "#f5f0e8", borderRadius: "12px", padding: "4px", marginBottom: "14px" }}>
        {[["kind", "🧒 Kinder"], ["mitarbeiter", "👥 Team"]].map(([k, l]) => (
          <button key={k} style={S.navBtn(kaeuferTyp === k)} onClick={() => { setKaeuferTyp(k); setKaeuferId(null); }}>{l}</button>
        ))}
      </div>

      <div className="twoCol" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "18px", alignItems: "start" }}>
        {/* Linke Spalte: Käufer + Produkte */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={S.card}>
            <input style={{ ...S.input, marginBottom: "10px" }} placeholder={`${kaeuferTyp === "kind" ? "Kind" : "Person"} suchen …`}
              value={suche} onChange={(e) => setSuche(e.target.value)} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
              {gefiltert.map((x) => (
                <button key={x.id} onClick={() => setKaeuferId(x.id)}
                  style={{ padding: "8px 14px", borderRadius: "20px", border: `1.5px solid ${kaeuferId === x.id ? T.accent : T.border}`,
                    background: kaeuferId === x.id ? T.accent : "#fff", color: kaeuferId === x.id ? "#fff" : T.text,
                    fontFamily: font, fontWeight: 700, fontSize: "13.5px", cursor: "pointer", minHeight: "40px" }}>
                  {x.name} · <span style={{ opacity: 0.8 }}>{euro(x.guthaben)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="prodGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
            {aktiveProdukte.map((p) => {
              const imKorb = warenkorb[p.id] || 0;
              const aus = p.bestand <= imKorb;
              return (
                <button key={p.id} onClick={() => add(p)} disabled={aus}
                  style={{ background: "#fff", border: `1.5px solid ${imKorb ? T.accent : T.border}`, borderRadius: "14px",
                    padding: "14px 10px", cursor: aus ? "not-allowed" : "pointer", textAlign: "center", fontFamily: font,
                    opacity: aus ? 0.45 : 1, position: "relative", minHeight: "104px" }}>
                  {imKorb > 0 && <span style={{ position: "absolute", top: "6px", right: "6px", background: T.accent, color: "#fff", borderRadius: "20px", fontSize: "11px", fontWeight: 800, padding: "1px 7px" }}>{imKorb}</span>}
                  <div style={{ fontSize: "30px" }}>{p.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: "13.5px", marginTop: "4px" }}>{p.name}</div>
                  <div style={{ color: T.accent, fontWeight: 800, fontSize: "13px" }}>{euro(p.preis)}</div>
                  <div style={{ fontSize: "11px", color: p.bestand < 5 ? T.red : T.muted, marginTop: "2px" }}>{p.bestand} übrig</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rechte Spalte: Warenkorb (Desktop) */}
        <div className="cartSidebar" style={{ ...S.card, position: "sticky", top: "78px" }}>
          <Cart />
        </div>
      </div>

      {/* Mobiler Warenkorb-Balken */}
      <button className="mobileCartBar" onClick={() => setCartOpen(true)}
        style={{ position: "fixed", left: "12px", right: "12px", bottom: "84px", zIndex: 55, background: anzahl ? T.green : "#bdbdbd",
          color: "#fff", border: "none", borderRadius: "14px", padding: "14px 18px", fontFamily: font, fontWeight: 800, fontSize: "15px",
          display: "none", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}>
        <span>🛒 Warenkorb ({anzahl})</span><span>{euro(summe)}</span>
      </button>

      {cartOpen && (
        <div className="modalWrap" style={modalWrapStyle} onClick={() => setCartOpen(false)}>
          <div className="modalCard" style={{ ...modalCardStyle, maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <Cart />
            <button style={{ ...S.btn("#eee"), color: T.text, width: "100%", marginTop: "8px" }} onClick={() => setCartOpen(false)}>Schließen</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: "92px", left: "50%", transform: "translateX(-50%)", zIndex: 80,
          background: toast.ueberzogen ? T.red : T.green, color: "#fff", padding: "12px 20px", borderRadius: "12px",
          fontWeight: 700, fontSize: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", maxWidth: "92vw", textAlign: "center" }}>
          {toast.ueberzogen ? "⚠️" : "✅"} {toast.name}: {euro(toast.summe)} verbucht{toast.ueberzogen ? " (Guthaben überzogen)" : ""}
        </div>
      )}
    </div>
  );
}

// ─── Käufer-Verwaltung (Kinder oder Team) ───────────────────
function KaeuferPage({ titel, untertitel, liste, setListe, istTeam, rolle, log, setLog, aktuellerMa, bestellungen, mitarbeiter, setMitarbeiter }) {
  const istAdmin = rolle === "admin";
  const [detail, setDetail] = useState(null);
  const [anpassen, setAnpassen] = useState(null);
  const [betrag, setBetrag] = useState("");
  const [grund, setGrund] = useState("");
  const [neuName, setNeuName] = useState("");
  const [neuGuthaben, setNeuGuthaben] = useState("");
  const [neuRolle, setNeuRolle] = useState("verkauf");
  const [confirm, setConfirm] = useState(null);

  const speichernAnpassung = () => {
    const b = parseFloat(betrag.replace(",", "."));
    if (isNaN(b) || !anpassen) return;
    setListe((prev) => prev.map((x) => x.id === anpassen.id ? { ...x, guthaben: +(x.guthaben + b).toFixed(2), startGuthaben: +(x.startGuthaben + (b > 0 ? b : 0)).toFixed(2) } : x));
    setLog((prev) => [{ id: newId(), kaeuferId: anpassen.id, name: anpassen.name, betrag: b, grund: grund || "manuell", ts: now() }, ...prev]);
    setAnpassen(null); setBetrag(""); setGrund("");
  };

  const neuAnlegen = () => {
    if (!neuName.trim()) return;
    const g = parseFloat((neuGuthaben || "0").replace(",", ".")) || 0;
    const eintrag = { id: newId(), name: neuName.trim(), guthaben: g, startGuthaben: g };
    if (istTeam) {
      eintrag.rolle = neuRolle;
      // "einkauf" kauft nur ein und braucht keinen Zugang ⇒ kein Einladungscode.
      // admin/verkauf bekommen einen Einladungscode für die Erstanmeldung.
      eintrag.user = null; eintrag.pass = null;
      eintrag.code = rolleInfo(neuRolle).zugang ? Math.random().toString(36).slice(2, 8).toUpperCase() : null;
    }
    setListe((prev) => [...prev, eintrag]);
    setNeuName(""); setNeuGuthaben(""); setNeuRolle("verkauf");
  };

  const loeschen = (x) => {
    if (istTeam) {
      if (x.id === aktuellerMa.id)
        return setConfirm({ titel: "Nicht möglich", text: "Du kannst dich nicht selbst löschen.", warnung: true });
      if (x.rolle === "admin" && liste.filter((m) => m.rolle === "admin").length <= 1)
        return setConfirm({ titel: "Nicht möglich", text: "Der letzte Admin kann nicht gelöscht werden – sonst kommt niemand mehr an die Verwaltung.", warnung: true });
    }
    setConfirm({
      titel: `${x.name} löschen?`,
      text: istTeam
        ? "Der Eintrag wird entfernt. Bereits getätigte Bestellungen bleiben mit Namen erhalten."
        : "Das Kind und sein Guthaben werden entfernt. Bereits getätigte Bestellungen bleiben mit Namen erhalten.",
      onConfirm: () => setListe((prev) => prev.filter((m) => m.id !== x.id)),
    });
  };

  const tagesStatistik = (id) => {
    const map = {};
    bestellungen.filter((b) => b.kaeuferId === id && b.kaeuferTyp === (istTeam ? "mitarbeiter" : "kind") && b.status === "aktiv")
      .forEach((b) => { map[b.datum] = map[b.datum] || { anzahl: 0, summe: 0 }; map[b.datum].anzahl++; map[b.datum].summe += b.summe; });
    return Object.entries(map).map(([datum, v]) => ({ datum, ...v }));
  };

  return (
    <div style={{ animation: "fadeIn .25s" }}>
      <div style={S.h2} className="h2m">{titel}</div>
      <div style={S.sub}>{untertitel}</div>

      {istAdmin && (
        <div style={{ ...S.card, marginBottom: "16px" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "10px" }}>➕ {istTeam ? "Mitarbeiter" : "Kind"} hinzufügen</div>
          <div className="stack" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input style={{ ...S.input, flex: "2 1 140px" }} placeholder="Name" value={neuName} onChange={(e) => setNeuName(e.target.value)} />
            {istTeam && (
              <select style={{ ...S.input, flex: "1 1 130px" }} value={neuRolle} onChange={(e) => setNeuRolle(e.target.value)}>
                <option value="verkauf">Verkauf (mit Zugang)</option>
                <option value="admin">Admin (mit Zugang)</option>
                <option value="einkauf">Nur Einkauf (kein Zugang)</option>
              </select>
            )}
            <input style={{ ...S.input, flex: "1 1 110px" }} placeholder="Guthaben €" value={neuGuthaben} onChange={(e) => setNeuGuthaben(e.target.value)} />
            <button style={S.btn(T.green)} onClick={neuAnlegen}>Anlegen</button>
          </div>
          {istTeam && (
            <div style={{ fontSize: "12px", color: T.muted, marginTop: "8px" }}>
              {rolleInfo(neuRolle).zugang
                ? "Bekommt einen Einladungscode für die Erstanmeldung (App-Zugang)."
                : "„Nur Einkauf“ kann ausschließlich Süßigkeiten kaufen – keine Anmeldung, kein Code."}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
        {liste.map((x) => (
          <div key={x.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "16px" }}>{x.name}
                  {istTeam && <span style={S.badge(rolleInfo(x.rolle).farbe)}>{rolleInfo(x.rolle).label}</span>}
                </div>
                <div style={{ fontSize: "12px", color: T.muted, marginTop: "2px" }}>Start: {euro(x.startGuthaben)}</div>
                {istTeam && x.code && <div style={{ fontSize: "11px", color: T.blue, marginTop: "2px" }}>Einladungscode: <b>{x.code}</b></div>}
                {istTeam && !rolleInfo(x.rolle).zugang && <div style={{ fontSize: "11px", color: T.muted, marginTop: "2px" }}>🔒 Kein App-Zugang · kauft nur ein</div>}
              </div>
              <div style={{ fontWeight: 900, fontSize: "18px", color: x.guthaben < 0 ? T.red : T.green, whiteSpace: "nowrap" }}>{euro(x.guthaben)}</div>
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
              <button style={{ ...S.btnSmall("#f0ebe3"), color: T.text }} onClick={() => setDetail(x)}>📅 Verlauf</button>
              {istAdmin && <button style={S.btnSmall(T.accent)} onClick={() => setAnpassen(x)}>💰 Guthaben</button>}
              {istAdmin && <button style={S.btnSmall(T.red)} onClick={() => loeschen(x)}>🗑️ Löschen</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Guthaben anpassen Modal */}
      {anpassen && (
        <div className="modalWrap" style={modalWrapStyle} onClick={() => setAnpassen(null)}>
          <div className="modalCard" style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: "17px", marginBottom: "4px" }}>Guthaben anpassen</div>
            <div style={{ fontSize: "13px", color: T.muted, marginBottom: "14px" }}>{anpassen.name} · aktuell {euro(anpassen.guthaben)}</div>
            <input style={{ ...S.input, marginBottom: "10px" }} placeholder="Betrag (z. B. 5 oder -2,50)" value={betrag} onChange={(e) => setBetrag(e.target.value)} />
            <input style={{ ...S.input, marginBottom: "14px" }} placeholder="Grund (z. B. Einzahlung Eltern)" value={grund} onChange={(e) => setGrund(e.target.value)} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ ...S.btn("#eee"), color: T.text, flex: 1 }} onClick={() => setAnpassen(null)}>Abbrechen</button>
              <button style={{ ...S.btn(T.green), flex: 1 }} onClick={speichernAnpassung}>Speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* Verlauf Modal */}
      {detail && (
        <div className="modalWrap" style={modalWrapStyle} onClick={() => setDetail(null)}>
          <div className="modalCard" style={{ ...modalCardStyle, maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: "17px", marginBottom: "2px" }}>{detail.name}</div>
            <div style={{ fontSize: "13px", color: T.muted, marginBottom: "14px" }}>Aktuell {euro(detail.guthaben)} · Start {euro(detail.startGuthaben)}</div>

            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>Ausgaben pro Tag</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "14px" }}>
              {tagesStatistik(detail.id).length === 0 && <div style={{ fontSize: "13px", color: T.muted }}>Noch keine Bestellungen.</div>}
              {tagesStatistik(detail.id).map((t) => (
                <div key={t.datum} style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px", padding: "6px 10px", background: T.tagBg, borderRadius: "8px" }}>
                  <span>{t.datum} · {t.anzahl} Bestellung(en)</span><span style={{ fontWeight: 700 }}>{euro(t.summe)}</span>
                </div>
              ))}
            </div>

            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "6px" }}>Guthaben-Bewegungen</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "180px", overflowY: "auto" }}>
              {log.filter((l) => l.kaeuferId === detail.id).length === 0 && <div style={{ fontSize: "13px", color: T.muted }}>Keine manuellen Anpassungen.</div>}
              {log.filter((l) => l.kaeuferId === detail.id).map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 10px", borderBottom: `1px solid ${T.border}` }}>
                  <span>{l.ts} · {l.grund}</span>
                  <span style={{ fontWeight: 700, color: l.betrag >= 0 ? T.green : T.red }}>{l.betrag >= 0 ? "+" : ""}{euro(l.betrag)}</span>
                </div>
              ))}
            </div>
            <button style={{ ...S.btn("#eee"), color: T.text, width: "100%", marginTop: "16px" }} onClick={() => setDetail(null)}>Schließen</button>
          </div>
        </div>
      )}

      <ConfirmDialog data={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

// ─── Produkte ────────────────────────────────────────────────
function ProduktePage({ produkte, setProdukte, rolle }) {
  const istAdmin = rolle === "admin";
  const [name, setName] = useState(""); const [preis, setPreis] = useState("");
  const [emoji, setEmoji] = useState("🍬"); const [kategorie, setKategorie] = useState("Süßes"); const [bestand, setBestand] = useState("");
  const [confirm, setConfirm] = useState(null);

  const loeschen = (p) => setConfirm({
    titel: `${p.emoji} ${p.name} löschen?`,
    text: "Das Produkt wird aus dem Sortiment entfernt. Bereits getätigte Bestellungen behalten Name und Preis als Snapshot.",
    onConfirm: () => setProdukte((prev) => prev.filter((x) => x.id !== p.id)),
  });

  const anlegen = () => {
    if (!name.trim() || !preis) return;
    setProdukte((prev) => [...prev, { id: newId(), name: name.trim(), preis: parseFloat(preis.replace(",", ".")) || 0,
      bestand: parseInt(bestand) || 0, kategorie, emoji: emoji || "🍬", aktiv: true }]);
    setName(""); setPreis(""); setBestand("");
  };
  const toggle = (id) => setProdukte((prev) => prev.map((p) => p.id === id ? { ...p, aktiv: !p.aktiv } : p));
  const ampel = (b) => b === 0 ? T.red : b < 8 ? T.accent : T.green;

  return (
    <div style={{ animation: "fadeIn .25s" }}>
      <div style={S.h2} className="h2m">Produkte</div>
      <div style={S.sub}>Sortiment, Preise und Bestand verwalten.</div>

      {istAdmin && (
        <div style={{ ...S.card, marginBottom: "16px" }}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "10px" }}>➕ Neues Produkt</div>
          <div className="stack" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input style={{ ...S.input, maxWidth: "70px", textAlign: "center" }} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
            <input style={{ ...S.input, flex: "2 1 140px" }} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={{ ...S.input, flex: "1 1 90px" }} placeholder="Preis €" value={preis} onChange={(e) => setPreis(e.target.value)} />
            <input style={{ ...S.input, flex: "1 1 90px" }} placeholder="Bestand" value={bestand} onChange={(e) => setBestand(e.target.value)} />
            <select style={{ ...S.input, flex: "1 1 110px" }} value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
              <option>Süßes</option><option>Snacks</option><option>Getränke</option>
            </select>
            <button style={S.btn(T.green)} onClick={anlegen}>Anlegen</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
        {produkte.map((p) => (
          <div key={p.id} style={{ ...S.card, opacity: p.aktiv ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "28px" }}>{p.emoji}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "15px" }}>{p.name}</div>
                  <span style={S.pill(T.tagBg, T.accent)}>{p.kategorie}</span>
                </div>
              </div>
              <div style={{ fontWeight: 900, fontSize: "17px", color: T.accent }}>{euro(p.preis)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: ampel(p.bestand) }}>{p.bestand === 0 ? "Ausverkauft" : `${p.bestand} im Bestand`}</span>
              {istAdmin && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button style={S.btnSmall(p.aktiv ? "#f0ebe3" : T.green)} onClick={() => toggle(p.id)}>
                    <span style={{ color: p.aktiv ? T.text : "#fff" }}>{p.aktiv ? "Deaktivieren" : "Aktivieren"}</span></button>
                  <button style={S.btnSmall(T.red)} onClick={() => loeschen(p)}>🗑️</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog data={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

// ─── Berichte ────────────────────────────────────────────────
function BerichtePage({ bestellungen, kinder, mitarbeiter }) {
  const aktive = bestellungen.filter((b) => b.status === "aktiv");
  const umsatz = aktive.reduce((s, b) => s + b.summe, 0);
  const anzahl = aktive.length;
  const schnitt = anzahl ? umsatz / anzahl : 0;

  const umsatzProTag = useMemo(() => {
    const m = {}; aktive.forEach((b) => { m[b.datum] = (m[b.datum] || 0) + b.summe; });
    return Object.entries(m).map(([datum, umsatz]) => ({ datum, umsatz: +umsatz.toFixed(2) }));
  }, [bestellungen]);

  const topProdukte = useMemo(() => {
    const m = {}; aktive.forEach((b) => b.positionen.forEach((p) => { m[p.name] = (m[p.name] || 0) + p.menge; }));
    return Object.entries(m).map(([name, menge]) => ({ name, menge })).sort((a, b) => b.menge - a.menge).slice(0, 6);
  }, [bestellungen]);

  const exportExcel = () => {
    const ausgaben = (typ, id) => bestellungen.filter((b) => b.kaeuferTyp === typ && b.kaeuferId === id && b.status === "aktiv").reduce((s, b) => s + b.summe, 0);
    const wb = XLSX.utils.book_new();

    // Blatt 1: Kinder
    const kinderRows = [["Name", "Start-Guthaben (€)", "Ausgaben (€)", "Aktuelles Guthaben (€)"]];
    kinder.forEach((k) => kinderRows.push([k.name, +k.startGuthaben.toFixed(2), +ausgaben("kind", k.id).toFixed(2), +k.guthaben.toFixed(2)]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kinderRows), "Kinder");

    // Blatt 2: Mitarbeiter
    const maRows = [["Name", "Rolle", "Start-Guthaben (€)", "Ausgaben (€)", "Aktuelles Guthaben (€)"]];
    mitarbeiter.forEach((m) => maRows.push([m.name, m.rolle, +m.startGuthaben.toFixed(2), +ausgaben("mitarbeiter", m.id).toFixed(2), +m.guthaben.toFixed(2)]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(maRows), "Mitarbeiter");

    // Blatt 3: Bestellungen
    const bRows = [["Datum", "Uhrzeit", "Käufer-Typ", "Käufer", "Artikel", "Summe (€)", "Status", "Verkauft von"]];
    bestellungen.forEach((b) => bRows.push([
      b.datum, b.ts, b.kaeuferTyp === "kind" ? "Kind" : "Mitarbeiter", b.kaeuferName,
      b.positionen.map((p) => `${p.menge}× ${p.name}`).join(", "), +b.summe.toFixed(2), b.status, b.verkauftVon || "",
    ]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bRows), "Bestellungen");

    XLSX.writeFile(wb, `camp-kiosk-export_${today().replace(/\./g, "-")}.xlsx`);
  };

  const Kpi = ({ label, value, color }) => (
    <div style={{ ...S.card, textAlign: "center" }}>
      <div style={{ fontSize: "13px", color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 900, color, marginTop: "4px" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ animation: "fadeIn .25s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
        <div>
          <div style={S.h2} className="h2m">Berichte</div>
          <div style={S.sub}>Umsatz, Verkäufe und Export für die Endabrechnung.</div>
        </div>
        <button style={S.btn(T.green)} onClick={exportExcel}>📊 Excel-Export (3 Tabellen)</button>
      </div>

      <div className="kpiGrid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <Kpi label="Umsatz gesamt" value={euro(umsatz)} color={T.accent} />
        <Kpi label="Bestellungen" value={anzahl} color={T.green} />
        <Kpi label="Ø pro Bestellung" value={euro(schnitt)} color={T.blue} />
      </div>

      <div className="twoCol" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div style={S.card}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "10px" }}>Umsatz pro Tag</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={umsatzProTag.length ? umsatzProTag : [{ datum: today(), umsatz: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="datum" tick={{ fontSize: 11, fill: T.muted }} />
              <YAxis tick={{ fontSize: 11, fill: T.muted }} />
              <Tooltip formatter={(v) => euro(v)} />
              <Bar dataKey="umsatz" fill={T.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "10px" }}>Top-Produkte (Stück)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={topProdukte.length ? topProdukte : [{ name: "—", menge: 1 }]} dataKey="menge" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e) => e.name}>
                {topProdukte.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontWeight: 800, fontSize: "15px", marginBottom: "10px" }}>Letzte Bestellungen</div>
        <div className="scrollX">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px", minWidth: "560px" }}>
            <thead>
              <tr style={{ color: T.muted, textAlign: "left" }}>
                <th style={{ padding: "8px" }}>Zeit</th><th style={{ padding: "8px" }}>Käufer</th>
                <th style={{ padding: "8px" }}>Artikel</th><th style={{ padding: "8px", textAlign: "right" }}>Summe</th>
              </tr>
            </thead>
            <tbody>
              {[...bestellungen].reverse().slice(0, 12).map((b) => (
                <tr key={b.id} style={{ borderTop: `1px solid ${T.border}`, opacity: b.status === "aktiv" ? 1 : 0.5 }}>
                  <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{b.ts}</td>
                  <td style={{ padding: "8px" }}>{b.kaeuferName} {b.kaeuferTyp === "mitarbeiter" && <span style={S.pill(T.tagBg, T.green)}>Team</span>}</td>
                  <td style={{ padding: "8px" }}>{b.positionen.map((p) => `${p.menge}× ${p.name}`).join(", ")}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>{euro(b.summe)}</td>
                </tr>
              ))}
              {bestellungen.length === 0 && <tr><td colSpan={4} style={{ padding: "16px", textAlign: "center", color: T.muted }}>Noch keine Bestellungen.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Modal-Styles (shared) ───────────────────────────────────
// Eigener Bestätigungs-/Hinweisdialog (Browser-confirm/alert sind im Sandbox-iframe blockiert).
// data = { titel, text, warnung?, onConfirm? }. warnung=true ⇒ nur "Verstanden"-Button.
function ConfirmDialog({ data, onClose }) {
  if (!data) return null;
  const { titel, text, warnung, onConfirm } = data;
  return (
    <div className="modalWrap" style={modalWrapStyle} onClick={onClose}>
      <div className="modalCard" style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: "17px", marginBottom: "6px" }}>{titel}</div>
        <div style={{ fontSize: "14px", color: T.muted, marginBottom: "18px", lineHeight: 1.45 }}>{text}</div>
        {warnung ? (
          <button style={{ ...S.btn(T.accent), width: "100%" }} onClick={onClose}>Verstanden</button>
        ) : (
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={{ ...S.btn("#eee"), color: T.text, flex: 1 }} onClick={onClose}>Abbrechen</button>
            <button style={{ ...S.btn(T.red), flex: 1 }} onClick={() => { onConfirm && onConfirm(); onClose(); }}>Löschen</button>
          </div>
        )}
      </div>
    </div>
  );
}

const modalWrapStyle = { position: "fixed", inset: 0, background: "rgba(45,42,38,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" };
const modalCardStyle = { background: "#fff", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "400px", boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflowY: "auto", maxHeight: "85vh" };

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const [ma, setMa] = useState(null);
  const [page, setPage] = useState("verkauf");
  const [kinder, setKinder] = useState(KINDER_INIT);
  const [mitarbeiter, setMitarbeiter] = useState(MITARBEITER_INIT);
  const [produkte, setProdukte] = useState(PRODUKTE_INIT);
  const [bestellungen, setBestellungen] = useState([]);
  const [kinderLog, setKinderLog] = useState([]);
  const [maLog, setMaLog] = useState([]);

  if (!ma) return <Login onLogin={setMa} mitarbeiter={mitarbeiter} />;
  const isAdmin = ma.rolle === "admin";
  const addBestellung = (b) => setBestellungen((prev) => [...prev, b]);

  const pages = [
    { key: "verkauf", label: "Verkauf", icon: "🛒" },
    { key: "kinder", label: "Kinder", icon: "🧒" },
    { key: "team", label: "Team", icon: "👥" },
    { key: "produkte", label: "Produkte", icon: "🍬" },
    ...(isAdmin ? [{ key: "berichte", label: "Berichte", icon: "📊" }] : []),
  ];

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{RESPONSIVE_CSS}</style>

      <header style={S.header}>
        <div style={S.logo}>🏕️ <span className="logoText">Camp Kiosk</span></div>
        <nav className="desktopNav" style={S.nav}>
          {pages.map((p) => (
            <button key={p.key} style={S.navBtn(page === p.key)} onClick={() => setPage(p.key)}>{p.icon} {p.label}</button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="userTag hideMobile" style={{ fontSize: "13px", color: T.muted }}>
            {ma.name} <span style={S.badge(isAdmin ? T.accent : T.green)}>{ma.rolle}</span>
          </span>
          <button style={S.btnSmall("#f0ebe3")} onClick={() => setMa(null)}><span style={{ color: T.text }}>Abmelden</span></button>
        </div>
      </header>

      <div className="appMainWrap" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <main className="appMain" style={S.main}>
          {page === "verkauf" && (
            <VerkaufPage kinder={kinder} setKinder={setKinder} mitarbeiter={mitarbeiter} setMitarbeiter={setMitarbeiter}
              produkte={produkte} setProdukte={setProdukte} addBestellung={addBestellung} aktuellerMa={ma} />
          )}
          {page === "kinder" && (
            <KaeuferPage titel="Kinder" untertitel="Guthaben einsehen, anpassen und Verlauf prüfen." liste={kinder} setListe={setKinder}
              istTeam={false} rolle={ma.rolle} log={kinderLog} setLog={setKinderLog} aktuellerMa={ma} bestellungen={bestellungen} />
          )}
          {page === "team" && (
            <KaeuferPage titel="Team" untertitel="Mitarbeiter verwalten – sie haben eigenes Guthaben und kaufen ebenfalls ein." liste={mitarbeiter} setListe={setMitarbeiter}
              istTeam={true} rolle={ma.rolle} log={maLog} setLog={setMaLog} aktuellerMa={ma} bestellungen={bestellungen} />
          )}
          {page === "produkte" && <ProduktePage produkte={produkte} setProdukte={setProdukte} rolle={ma.rolle} />}
          {page === "berichte" && isAdmin && <BerichtePage bestellungen={bestellungen} kinder={kinder} mitarbeiter={mitarbeiter} />}
        </main>
      </div>

      {/* Mobile Bottom-Nav */}
      <nav className="mobileNav">
        {pages.map((p) => (
          <button key={p.key} className="mobileNavBtn" onClick={() => setPage(p.key)}
            style={{ color: page === p.key ? T.accent : T.muted }}>
            <span style={{ fontSize: "20px" }}>{p.icon}</span>
            <span style={{ fontSize: "10.5px", fontWeight: page === p.key ? 800 : 600 }}>{p.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

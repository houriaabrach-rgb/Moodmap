"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Brain, CalendarDays, Check, ChevronRight, Moon, Sparkles } from "lucide-react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type Entry = { id: string; date: string; mood: number; sleep: number; activities: string[] };
type ModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: Record<string, unknown>; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void> };
declare global { interface Document { modelContext?: ModelContext } }

const STORAGE_KEY = "moodmap.entries.v1";
const MIN_ENTRIES = 7;
const activities = [
  { id: "bewegung", label: "Bewegung" },
  { id: "arbeit", label: "Konzentrierte Arbeit" },
  { id: "menschen", label: "Zeit mit Menschen" },
  { id: "draussen", label: "Draußen gewesen" },
  { id: "entspannung", label: "Bewusste Pause" },
];
const moodLabels = ["Sehr schwer", "Schwer", "Okay", "Gut", "Sehr gut"];

function dateDaysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return value.toISOString().slice(0, 10);
}

const demoEntries: Entry[] = [
  { id: "demo-1", date: dateDaysAgo(8), mood: 2, sleep: 5.5, activities: ["arbeit"] },
  { id: "demo-2", date: dateDaysAgo(7), mood: 3, sleep: 6.5, activities: ["menschen"] },
  { id: "demo-3", date: dateDaysAgo(6), mood: 4, sleep: 7.5, activities: ["bewegung", "draussen"] },
  { id: "demo-4", date: dateDaysAgo(5), mood: 2, sleep: 5, activities: ["arbeit"] },
  { id: "demo-5", date: dateDaysAgo(4), mood: 5, sleep: 8, activities: ["bewegung", "menschen"] },
  { id: "demo-6", date: dateDaysAgo(3), mood: 4, sleep: 7, activities: ["entspannung", "draussen"] },
  { id: "demo-7", date: dateDaysAgo(2), mood: 3, sleep: 6, activities: ["arbeit"] },
  { id: "demo-8", date: dateDaysAgo(1), mood: 5, sleep: 8.5, activities: ["bewegung", "draussen"] },
];

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function buildInsights(entries: Entry[]) {
  const rested = entries.filter((entry) => entry.sleep >= 7);
  const short = entries.filter((entry) => entry.sleep < 7);
  const sleepDifference = average(rested.map((entry) => entry.mood)) - average(short.map((entry) => entry.mood));
  const activityResults = activities.map((activity) => {
    const withActivity = entries.filter((entry) => entry.activities.includes(activity.id));
    const withoutActivity = entries.filter((entry) => !entry.activities.includes(activity.id));
    return {
      ...activity,
      count: withActivity.length,
      difference: withActivity.length && withoutActivity.length
        ? average(withActivity.map((entry) => entry.mood)) - average(withoutActivity.map((entry) => entry.mood))
        : 0,
    };
  });
  const bestActivity = activityResults.filter((result) => result.count >= 2).sort((a, b) => b.difference - a.difference)[0];
  return { sleepDifference, restedDays: rested.length, bestActivity };
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00`));
}

function createEntry(input: Omit<Entry, "id">): Entry {
  return { ...input, id: `${input.date}-${Date.now()}-${Math.random().toString(16).slice(2)}` };
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>(demoEntries);
  const [usingDemo, setUsingDemo] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState("4");
  const [sleep, setSleep] = useState("7.5");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(["bewegung"]);
  const [saved, setSaved] = useState(false);
  const entriesRef = useRef(entries);
  const demoRef = useRef(usingDemo);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Entry[];
        if (Array.isArray(parsed)) { setEntries(parsed); setUsingDemo(false); }
      } catch { window.localStorage.removeItem(STORAGE_KEY); }
    }
    setLoaded(true);
  }, []);

  useEffect(() => { entriesRef.current = entries; demoRef.current = usingDemo; }, [entries, usingDemo]);

  const sortedEntries = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries]);
  const insights = useMemo(() => buildInsights(entries), [entries]);
  const hasEnoughData = entries.length >= MIN_ENTRIES;

  function persist(next: Entry[]) {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setEntries(sorted);
    setUsingDemo(false);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  }

  function saveEntry(entry: Entry) {
    const base = demoRef.current ? [] : entriesRef.current;
    persist([...base.filter((item) => item.date !== entry.date), entry]);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sleepValue = Number(sleep);
    if (!date || !Number.isFinite(sleepValue) || sleepValue < 0 || sleepValue > 24) return;
    saveEntry(createEntry({ date, mood: Number(mood), sleep: sleepValue, activities: selectedActivities }));
  }

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const addEntry = context.registerTool({
      name: "add_moodmap_entry",
      title: "MoodMap-Eintrag hinzufügen",
      description: "Speichert Stimmung, Schlaf und Aktivitäten für einen Tag im lokalen MoodMap-Profil.",
      inputSchema: { type: "object", properties: { date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, mood: { type: "integer", minimum: 1, maximum: 5 }, sleep: { type: "number", minimum: 0, maximum: 24 }, activities: { type: "array", items: { type: "string", enum: activities.map((activity) => activity.id) }, uniqueItems: true } }, required: ["date", "mood", "sleep", "activities"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const value = input as Partial<Entry>;
        const allowed = new Set(activities.map((activity) => activity.id));
        if (typeof value.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !Number.isInteger(value.mood) || Number(value.mood) < 1 || Number(value.mood) > 5 || typeof value.sleep !== "number" || value.sleep < 0 || value.sleep > 24 || !Array.isArray(value.activities) || value.activities.some((activity) => !allowed.has(activity))) throw new Error("Ungültige Werte für den MoodMap-Eintrag.");
        const entry = createEntry({ date: value.date, mood: Number(value.mood), sleep: value.sleep, activities: value.activities });
        saveEntry(entry);
        return { saved: true, date: entry.date, totalEntries: (demoRef.current ? 0 : entriesRef.current.length) + 1 };
      },
    }, { signal: lifecycle.signal });
    const readInsights = context.registerTool({
      name: "read_moodmap_insights",
      title: "MoodMap-Muster lesen",
      description: "Liest die aktuell berechneten Zusammenhänge aus dem lokalen MoodMap-Profil.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        const current = demoRef.current ? [] : entriesRef.current;
        if (current.length < MIN_ENTRIES) return { ready: false, entries: current.length, needed: MIN_ENTRIES - current.length };
        const result = buildInsights(current);
        return { ready: true, entries: current.length, sleepMoodDifference: Number(result.sleepDifference.toFixed(1)), strongestActivity: result.bestActivity?.label ?? null, activityMoodDifference: result.bestActivity ? Number(result.bestActivity.difference.toFixed(1)) : null };
      },
    }, { signal: lifecycle.signal });
    Promise.allSettled([Promise.resolve(addEntry), Promise.resolve(readInsights)]);
    return () => lifecycle.abort();
  }, []);

  if (!loaded) return <main className="min-h-screen bg-background" aria-busy="true" />;

  const chartData = sortedEntries.slice(-14).map((entry) => ({ ...entry, label: formatShortDate(entry.date) }));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-[14px] bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(36,91,78,0.22)]"><Brain className="size-5" aria-hidden="true" /></div>
            <div><p className="text-lg font-semibold tracking-[-0.03em]">MoodMap</p><p className="text-xs text-muted-foreground">Dein Muster, Tag für Tag</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground"><span className="size-2 rounded-full bg-[#2f8f72]" aria-hidden="true" />Lokal gespeichert</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-7 px-6 py-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:px-10 lg:py-10">
        <aside>
          <form onSubmit={handleSubmit} className="sticky top-6 rounded-[28px] border border-border bg-card p-6 shadow-[0_22px_60px_rgba(20,47,42,0.08)]">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div><p className="eyebrow">Tagescheck</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Wie war dein Tag?</h1></div>
              <div className="grid size-11 place-items-center rounded-2xl bg-[#e8f5ee] text-[#246b57]"><CalendarDays className="size-5" aria-hidden="true" /></div>
            </div>
            <label className="field-label" htmlFor="entry-date">Datum</label>
            <Input id="entry-date" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} className="mt-2 h-11 rounded-xl bg-background" required />

            <fieldset className="mt-6">
              <legend className="field-label">Stimmung</legend>
              <RadioGroup value={mood} onValueChange={setMood} className="mt-3 grid grid-cols-5 gap-2">
                {moodLabels.map((label, index) => {
                  const value = String(index + 1);
                  return <label key={label} className={`mood-option ${mood === value ? "mood-option-active" : ""}`}><RadioGroupItem value={value} aria-label={label} className="sr-only" /><span className="text-lg font-semibold">{value}</span><span className="sr-only">{label}</span></label>;
                })}
              </RadioGroup>
              <p className="mt-2 text-center text-sm font-medium text-[#246b57]">{moodLabels[Number(mood) - 1]}</p>
            </fieldset>

            <div className="mt-6">
              <label className="field-label" htmlFor="sleep">Schlafdauer</label>
              <div className="relative mt-2"><Moon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="sleep" type="number" min="0" max="24" step="0.5" value={sleep} onChange={(event) => setSleep(event.target.value)} className="h-11 rounded-xl bg-background pl-10 pr-16" required /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Stunden</span></div>
            </div>

            <fieldset className="mt-6">
              <legend className="field-label">Was hat deinen Tag geprägt?</legend>
              <div className="mt-3 grid gap-2">
                {activities.map((activity) => {
                  const checked = selectedActivities.includes(activity.id);
                  return <label key={activity.id} className={`activity-option ${checked ? "activity-option-active" : ""}`}><Checkbox checked={checked} onCheckedChange={(next) => setSelectedActivities((current) => next ? [...current, activity.id] : current.filter((item) => item !== activity.id))} /><span>{activity.label}</span></label>;
                })}
              </div>
            </fieldset>

            <Button type="submit" size="lg" className="mt-7 h-12 w-full rounded-xl bg-[#245b4e] text-base shadow-[0_10px_24px_rgba(36,91,78,0.2)] hover:bg-[#19473d]">{saved ? <Check className="size-5" /> : <Sparkles className="size-5" />}{saved ? "Gespeichert" : "Tag speichern"}</Button>
            <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">Ein Eintrag für dasselbe Datum ersetzt den bisherigen.</p>
          </form>
        </aside>

        <section className="min-w-0">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="eyebrow">Deine Auswertung</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Was beeinflusst deine Stimmung?</h2><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">MoodMap vergleicht deine Tage und zeigt wiederkehrende Zusammenhänge. Muster sind Hinweise, keine Diagnose.</p></div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-right"><p className="text-2xl font-semibold tracking-[-0.04em]">{entries.length}</p><p className="text-xs text-muted-foreground">erfasste Tage</p></div>
          </div>

          {usingDemo && <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#d7b65a]/35 bg-[#fff8df] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#765f1b]">Du siehst gerade Beispieldaten</p><p className="mt-1 text-sm text-[#765f1b]/75">Dein erster gespeicherter Tag startet dein persönliches Profil.</p></div><Button type="button" variant="outline" onClick={() => persist([])} className="rounded-xl border-[#d7b65a]/50 bg-white/60 text-[#765f1b] hover:bg-white">Eigene Daten starten</Button></div>}

          {!hasEnoughData ? (
            <div className="rounded-[28px] border border-border bg-card p-8 shadow-[0_18px_50px_rgba(20,47,42,0.06)]"><div className="grid size-12 place-items-center rounded-2xl bg-[#e8f5ee] text-[#246b57]"><Activity className="size-6" /></div><h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Noch {MIN_ENTRIES - entries.length} {MIN_ENTRIES - entries.length === 1 ? "Tag" : "Tage"} bis zur ersten Auswertung</h3><p className="mt-2 max-w-xl leading-7 text-muted-foreground">Ab sieben Einträgen kann MoodMap Schlaf, Aktivitäten und Stimmung sinnvoll miteinander vergleichen.</p><div className="mt-6 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-[#2f8f72] transition-all" style={{ width: `${Math.min(100, (entries.length / MIN_ENTRIES) * 100)}%` }} /></div></div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <article className="insight-card insight-card-green"><div className="flex items-center justify-between"><span className="insight-icon"><Moon className="size-5" /></span><span className="data-pill">{insights.restedDays} von {entries.length} Tagen</span></div><p className="mt-7 text-sm font-medium text-[#28634f]">Schlaf und Stimmung</p><p className="mt-2 text-[2.6rem] font-semibold leading-none tracking-[-0.06em]">{insights.sleepDifference >= 0 ? "+" : ""}{insights.sleepDifference.toFixed(1)}</p><p className="mt-3 max-w-sm text-sm leading-6 text-[#315d51]">Stimmungspunkte an Tagen mit mindestens sieben Stunden Schlaf.</p></article>
                <article className="insight-card insight-card-blue"><div className="flex items-center justify-between"><span className="insight-icon insight-icon-blue"><Activity className="size-5" /></span><span className="data-pill data-pill-blue">{insights.bestActivity?.count ?? 0} Tage</span></div><p className="mt-7 text-sm font-medium text-[#315d75]">Stärkster positiver Begleiter</p><p className="mt-2 truncate text-[2.1rem] font-semibold leading-tight tracking-[-0.05em]">{insights.bestActivity?.label ?? "Noch unklar"}</p><p className="mt-3 max-w-sm text-sm leading-6 text-[#405f6e]">{insights.bestActivity ? `${insights.bestActivity.difference >= 0 ? "+" : ""}${insights.bestActivity.difference.toFixed(1)} Stimmungspunkte im Vergleich zu anderen Tagen.` : "Mehr unterschiedliche Aktivitäten helfen beim Vergleichen."}</p></article>
              </div>
              <article className="mt-5 rounded-[28px] border border-border bg-card p-6 shadow-[0_18px_50px_rgba(20,47,42,0.06)] sm:p-7">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="eyebrow">Verlauf</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Stimmung und Schlaf im Vergleich</h3></div><div className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#2f8f72]" /> Stimmung</span><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[#6a8fb5]" /> Schlaf</span></div></div>
                <div className="mt-6 h-[280px] w-full" aria-label="Liniendiagramm für Stimmung und Schlaf"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="#e7ebe8" strokeDasharray="4 6" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#75817c", fontSize: 12 }} dy={10} /><YAxis yAxisId="mood" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tick={{ fill: "#75817c", fontSize: 12 }} /><YAxis yAxisId="sleep" orientation="right" domain={[0, 10]} hide /><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #dde5e0", boxShadow: "0 14px 40px rgba(20,47,42,.12)", fontSize: 13 }} labelStyle={{ color: "#245b4e", fontWeight: 700 }} /><Line yAxisId="mood" type="monotone" dataKey="mood" name="Stimmung" stroke="#2f8f72" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} /><Line yAxisId="sleep" type="monotone" dataKey="sleep" name="Schlaf" stroke="#6a8fb5" strokeWidth={2.5} strokeDasharray="6 5" dot={false} /></ComposedChart></ResponsiveContainer></div>
              </article>
            </>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-3">{[{ label: "Ø Stimmung", value: average(entries.map((entry) => entry.mood)).toFixed(1) }, { label: "Ø Schlaf", value: `${average(entries.map((entry) => entry.sleep)).toFixed(1)} Std.` }, { label: "Letzter Eintrag", value: sortedEntries.length ? formatShortDate(sortedEntries.at(-1)!.date) : "Noch keiner" }].map((stat) => <div key={stat.label} className="rounded-2xl border border-border/80 bg-card px-5 py-4"><p className="text-xs text-muted-foreground">{stat.label}</p><p className="mt-1 text-lg font-semibold tracking-[-0.02em]">{stat.value}</p></div>)}</div>
          <div className="mt-6 flex items-center gap-2 text-xs leading-5 text-muted-foreground"><ChevronRight className="size-4 shrink-0" aria-hidden="true" />Deine Daten bleiben in diesem Browser. Ohne Konto werden sie nicht zwischen Geräten übertragen.</div>
        </section>
      </div>
    </main>
  );
}

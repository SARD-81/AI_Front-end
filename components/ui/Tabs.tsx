export function Tabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button key={tab} className={`rounded-lg px-3 py-1 text-sm ${value === tab ? 'bg-indigo-600' : 'bg-slate-800'}`} onClick={() => onChange(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

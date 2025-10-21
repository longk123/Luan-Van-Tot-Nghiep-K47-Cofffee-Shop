// === src/components/AreaTabs.jsx ===
export default function AreaTabs({ areas, activeId, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {areas.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={`px-3 py-2 rounded-xl border text-sm ${
            activeId === a.id ? 'bg-amber-200 border-amber-300' : 'bg-white hover:bg-amber-50'
          }`}
          title={a.mo_ta || ''}
        >
          {a.ten}
        </button>
      ))}
    </div>
  );
}

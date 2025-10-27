// === src/components/AreaTabs.jsx ===
export default function AreaTabs({ areas, activeId, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {areas.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus:outline-none ${
            activeId === a.id 
              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 shadow-lg scale-105 border-2 border-amber-500' 
              : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-amber-700 hover:shadow-md hover:scale-105 border-2 border-gray-200 hover:border-amber-300'
          }`}
          title={a.mo_ta || ''}
        >
          {a.ten}
        </button>
      ))}
    </div>
  );
}


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
              ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white shadow-lg' 
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gradient-to-r hover:from-[#f5e6d3] hover:via-[#f0ddc4] hover:to-[#f5e6d3] hover:text-[#c9975b] hover:border-[#c9975b]'
          }`}
          title={a.mo_ta || ''}
        >
          {a.ten}
        </button>
      ))}
    </div>
  );
}


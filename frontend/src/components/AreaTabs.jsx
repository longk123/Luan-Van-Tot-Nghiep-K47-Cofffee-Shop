// === src/components/AreaTabs.jsx ===
export default function AreaTabs({ areas, activeId, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {areas.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus:outline-none border-2 ${
            activeId === a.id 
              ? 'bg-[#c9975b] text-white border-[#c9975b]' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-[#f5e6d3] hover:text-[#c9975b] hover:border-[#c9975b]'
          }`}
          title={a.mo_ta || ''}
        >
          {a.ten}
        </button>
      ))}
    </div>
  );
}


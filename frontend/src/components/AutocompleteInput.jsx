import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

export default function AutocompleteInput({ label, options, onSelect, value, placeholder, isStringArray = false }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Filtrado 
  const filteredOptions = options.filter(opt => {
    if (!opt) return false;
    const term = query.toLowerCase();
    
    if (isStringArray) {
        return opt.toLowerCase().includes(term);
    } else {
        return (
          opt.iata.toLowerCase().includes(term) ||
          opt.city.toLowerCase().includes(term) ||
          opt.name.toLowerCase().includes(term) ||
          opt.country.toLowerCase().includes(term)
        );
    }
  });

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Actualizar el query si el valor cambia externamente (ej: reseteos)
  useEffect(() => {
    if (value) {
        if (isStringArray) {
            setQuery(value);
        } else {
            const selected = options.find(o => o.iata === value);
            if (selected) {
                setQuery(`${selected.city} (${selected.iata})`);
            }
        }
    } else {
        setQuery('');
    }
  }, [value, options, isStringArray]);

  return (
    <div ref={wrapperRef} className="relative mb-3 w-full">
      <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1 ml-1 font-semibold">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-neon-cyan opacity-70" />
        </div>
        <input
          type="text"
          className="w-full bg-black/40 border border-glass-border text-white text-sm rounded-lg focus:ring-neon-cyan focus:border-neon-cyan block pl-10 p-2.5 outline-none transition-all placeholder:text-gray-600"
          placeholder={placeholder || "Buscar..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            onSelect(null); // Clear selection when typing
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-[#0f0f16] border border-glass-border rounded-lg shadow-2xl max-h-48 overflow-y-auto">
          {filteredOptions.map((opt, idx) => {
            const key = isStringArray ? opt : opt.iata;
            return (
                <li
                key={key + idx}
                onClick={() => {
                    if (isStringArray) {
                        setQuery(opt);
                        setIsOpen(false);
                        onSelect(opt);
                    } else {
                        setQuery(`${opt.city} (${opt.iata})`);
                        setIsOpen(false);
                        onSelect(opt.iata);
                    }
                }}
                className="cursor-pointer px-4 py-2.5 text-sm text-gray-300 hover:bg-neon-cyan/10 hover:text-white transition-colors flex justify-between items-center border-b border-white/5 last:border-0"
                >
                {isStringArray ? (
                    <span>{opt}</span>
                ) : (
                    <>
                        <div className="flex flex-col">
                            <span className="font-medium">{opt.city} <span className="text-[10px] text-gray-500 uppercase ml-1">{opt.country}</span></span>
                            <span className="text-[10px] text-gray-400 truncate w-40">{opt.name}</span>
                        </div>
                        <span className="font-mono text-neon-cyan font-bold bg-neon-cyan/10 px-2 py-0.5 rounded">{opt.iata}</span>
                    </>
                )}
                </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

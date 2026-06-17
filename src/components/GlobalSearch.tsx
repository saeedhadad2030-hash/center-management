import { useState, useEffect, useRef } from 'react';
import { globalSearch } from '../store';
import { Search, Users, Layers, UserCheck, X } from 'lucide-react';

interface GlobalSearchProps {
  onSelect: (type: string, id: string) => void;
}

export default function GlobalSearch({ onSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: string; id: string; name: string; subtitle: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      const found = globalSearch(query);
      setResults(found);
      setIsOpen(found.length > 0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'student': return <Users size={16} className="text-blue-500" />;
      case 'group': return <Layers size={16} className="text-purple-500" />;
      case 'teacher': return <UserCheck size={16} className="text-green-500" />;
      default: return <Search size={16} className="text-gray-400" />;
    }
  };

  const handleSelect = (result: { type: string; id: string }) => {
    onSelect(result.type, result.id);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="بحث عن طالب، مجموعة، مدرس..."
          className="w-full md:w-64 pr-9 pl-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white outline-none transition"
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
          >
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-full md:w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          <div className="p-2 border-b bg-gray-50">
            <p className="text-xs text-gray-500">{results.length} نتيجة</p>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {results.map((result, i) => (
              <button
                key={`${result.type}-${result.id}-${i}`}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition text-right border-b last:border-0"
              >
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  {getIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{result.name}</p>
                  <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

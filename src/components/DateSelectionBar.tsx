import React, { useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { DatePickerInput } from './DatePickerInput';
import { formatIndonesianDate, parseIndonesianDate } from '../utils/date';

interface DateSelectionBarProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  accent?: 'amber' | 'indigo';
}

export const DateSelectionBar: React.FC<DateSelectionBarProps> = ({ value, onChange, label, accent = 'indigo' }) => {
  const days = useMemo(() => {
    const base = parseIndonesianDate(value || formatIndonesianDate(new Date()));
    const result: Array<{ date: string; day: string; number: number; today: boolean }> = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const date = formatIndonesianDate(d);
      result.push({ date, day: dayNames[d.getDay()], number: d.getDate(), today: date === formatIndonesianDate(new Date()) });
    }
    return result;
  }, [value]);

  const shift = (offset: number) => {
    const base = parseIndonesianDate(value);
    base.setDate(base.getDate() + offset);
    onChange(formatIndonesianDate(base));
  };
  const activeClass = accent === 'amber' ? 'bg-amber-500 border-amber-600' : 'bg-indigo-600 border-indigo-700';
  const ringClass = accent === 'amber' ? 'ring-amber-300' : 'ring-indigo-300';

  return (
    <div className="space-y-2">
      <DatePickerInput value={value} onChange={onChange} label={label} />
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => shift(-1)} className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100" title="Hari sebelumnya">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="grid grid-cols-7 gap-1 flex-1">
          {days.map((item) => (
            <button key={item.date} type="button" onClick={() => onChange(item.date)}
              className={`min-w-0 px-1 py-1.5 rounded-lg border text-center transition-all ${item.date === value ? `${activeClass} text-white shadow-sm ring-2 ${ringClass}` : item.today ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <span className="block text-[9px] font-bold">{item.day}</span>
              <span className="block text-xs font-extrabold">{item.number}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => shift(1)} className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100" title="Hari berikutnya">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
        <CalendarDays className="w-3 h-3" /> Klik tanggal untuk menampilkan data pada hari operasional tersebut.
      </div>
    </div>
  );
};

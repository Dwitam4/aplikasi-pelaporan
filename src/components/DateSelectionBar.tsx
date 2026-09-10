import React, { useMemo } from 'react';
import { Calendar, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = formatIndonesianDate(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + index - 3);
      const date = formatIndonesianDate(d);
      return {
        date,
        dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        monthShort: d.toLocaleString('id-ID', { month: 'short' }),
        isToday: date === today,
        isSelected: date === value,
      };
    });
  }, [value]);

  const shift = (offset: number) => {
    const base = parseIndonesianDate(value || formatIndonesianDate(new Date()));
    base.setDate(base.getDate() + offset);
    onChange(formatIndonesianDate(base));
  };

  const selectedClass = accent === 'amber'
    ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
    : 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400';
  const panelClass = accent === 'amber'
    ? 'bg-amber-100/50 border-amber-200/90'
    : 'bg-indigo-50/70 border-indigo-200/90';
  const iconClass = accent === 'amber' ? 'text-amber-700' : 'text-indigo-700';

  return (
    <div className="space-y-2.5">
      <DatePickerInput value={value} onChange={onChange} label={label} />
      <div className={`p-2 rounded-2xl border ${panelClass}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className={`w-3.5 h-3.5 ${iconClass}`} />
            <span>Pilih tanggal operasional:</span>
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shift(-7)} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold" title="Mundur 1 minggu">« -7 Hari</button>
            <button type="button" onClick={() => shift(7)} className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold" title="Maju 1 minggu">+7 Hari »</button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => shift(-1)} className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700" title="Hari sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1">
            {days.map((item) => (
              <button key={item.date} type="button" onClick={() => onChange(item.date)}
                className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl transition-all border text-center ${item.isSelected ? selectedClass : item.isToday ? 'bg-white text-slate-900 border-amber-400 hover:bg-amber-50 font-medium' : 'bg-white/85 text-slate-800 border-slate-200 hover:bg-white hover:border-indigo-300'}`}>
                <span className={`text-[10px] uppercase font-extrabold ${item.isSelected ? 'text-white/80' : 'text-slate-500'}`}>{item.dayName}</span>
                <span className="text-sm sm:text-base font-black my-0.5">{item.dayNumber}</span>
                <span className={`text-[9px] font-semibold ${item.isSelected ? 'text-white/80' : 'text-slate-400'}`}>{item.monthShort}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => shift(1)} className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700" title="Hari berikutnya"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><CalendarDays className="w-3 h-3" /> Klik tanggal untuk memilih tanggal operasional.</div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Check, 
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { 
  formatIndonesianDate, 
  parseIndonesianDate, 
  toIsoDateString,
  getCalendarMonthMatrix, 
  INDONESIAN_MONTHS, 
  INDONESIAN_DAYS_SHORT 
} from '../utils/date';

interface DatePickerInputProps {
  value: string;
  onChange: (formattedDate: string) => void;
  label?: string;
  className?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label = 'TANGGAL OPERASIONAL',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nativeDateInputRef = useRef<HTMLInputElement>(null);

  // Parsed selected date
  const selectedDate = parseIndonesianDate(value);
  const today = new Date();

  // Month and Year view in the calendar popover - default to today's month and year
  const [viewYear, setViewYear] = useState<number>(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => today.getMonth());

  // Automatically focus and highlight TODAY when opening the calendar
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }
  }, [isOpen]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (date: Date) => {
    const formatted = formatIndonesianDate(date);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleQuickPreset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    handleSelectDate(d);
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const parts = e.target.value.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      handleSelectDate(date);
    }
  };

  const isSelected = (date: Date) => {
    return (
      date.getFullYear() === selectedDate.getFullYear() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getDate() === selectedDate.getDate()
    );
  };

  const calendarMatrix = getCalendarMonthMatrix(viewYear, viewMonth);

  // Year options for select
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 9 }, (_, i) => currentYear - 3 + i);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
            {label}
          </label>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-0.5">
            <CalendarDays className="w-3 h-3" /> Pilih Kalender
          </span>
        </div>
      )}

      {/* Main Trigger Button / Input Display */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 flex items-center justify-between px-3 py-2 text-sm bg-slate-50 hover:bg-white border text-left rounded-lg transition-all shadow-xs ${
            isOpen
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white'
              : 'border-slate-300 hover:border-slate-400'
          }`}
          title="Klik untuk membuka pilihan kalender"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
              {value || formatIndonesianDate(new Date())}
            </span>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200 shrink-0 ml-2">
            Ganti Tanggal ▾
          </span>
        </button>

        {/* Hidden Native Date Input for direct device calendar trigger */}
        <input
          ref={nativeDateInputRef}
          type="date"
          value={toIsoDateString(selectedDate)}
          onChange={handleNativeChange}
          className="sr-only"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => {
            if (nativeDateInputRef.current?.showPicker) {
              nativeDateInputRef.current.showPicker();
            } else {
              setIsOpen(true);
            }
          }}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-300 transition-colors"
          title="Buka Kalender Bawaan Perangkat"
        >
          <CalendarDays className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Day Chips under input */}
      <div className="flex flex-wrap gap-1 mt-1.5">
        <button
          type="button"
          onClick={() => handleQuickPreset(0)}
          className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors border border-slate-200"
        >
          Hari Ini
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset(1)}
          className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors border border-slate-200"
        >
          Besok (+1)
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset(2)}
          className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors border border-slate-200"
        >
          Lusa (+2)
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset(-1)}
          className="text-[11px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors border border-slate-200"
        >
          Kemarin
        </button>
      </div>

      {/* Dropdown Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month/Year selector and navigation */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Dropdown */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border-0 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {INDONESIAN_MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border-0 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {INDONESIAN_DAYS_SHORT.map((day, i) => (
              <span
                key={day}
                className={`text-[11px] font-bold py-1 ${
                  i === 0 ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarMatrix.map((cell, idx) => {
              const selected = isSelected(cell.date);
              const isSunday = cell.date.getDay() === 0;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(cell.date)}
                  className={`h-8 sm:h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative ${
                    selected
                      ? 'bg-emerald-600 text-white font-bold shadow-md ring-2 ring-emerald-300'
                      : cell.isToday
                      ? 'bg-amber-50 text-amber-900 font-extrabold border-2 border-amber-400 ring-2 ring-amber-200 hover:bg-amber-100 shadow-xs'
                      : cell.isCurrentMonth
                      ? isSunday
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{cell.dayNumber}</span>
                  {cell.isToday && !selected && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Footer Buttons */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleQuickPreset(0)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              <span>Hari Ini</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

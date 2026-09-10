import React, { useState, useMemo, useEffect } from 'react';
import { 
  Inbox, 
  User, 
  Users,
  Clock, 
  Calendar, 
  CalendarDays,
  PlaneTakeoff, 
  PlaneLanding, 
  Car, 
  Check, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft,
  ChevronRight,
  Sparkles, 
  Plus, 
  Pencil,
  Save,
  X,
  Phone, 
  MapPin, 
  Navigation, 
  AlertCircle,
  ExternalLink,
  Filter,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { UnassignedPassenger, ReportDocument } from '../types';
import { DatePickerInput } from './DatePickerInput';
import { 
  formatIndonesianDate, 
  parseIndonesianDate,
  INDONESIAN_DAYS_SHORT,
  INDONESIAN_MONTHS
} from '../utils/date';
import { getFilledRows } from '../utils/spreadsheet';

interface UnassignedPassengerPoolProps {
  unassignedPassengers: UnassignedPassenger[];
  reports: ReportDocument[];
  currentDate: string;
  onAssignToDriver: (passengerId: string, targetReportId: string, assignWholeGroup?: boolean) => void;
  onDeleteUnassigned: (passengerId: string) => void;
  onEditUnassigned?: (updated: UnassignedPassenger) => void;
  onOpenAddDriver: (date: string, jam?: string) => void;
  onOpenAddPassenger: (date?: string, mode?: 'queue' | 'auto') => void;
  onSwitchActiveDate?: (date: string) => void;
}

export const UnassignedPassengerPool: React.FC<UnassignedPassengerPoolProps> = ({
  unassignedPassengers,
  reports,
  currentDate,
  onAssignToDriver,
  onDeleteUnassigned,
  onEditUnassigned,
  onOpenAddDriver,
  onOpenAddPassenger,
  onSwitchActiveDate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => currentDate || formatIndonesianDate(new Date()));
  const [filterMode, setFilterMode] = useState<'selectedDate' | 'all'>('selectedDate');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<UnassignedPassenger | null>(null);
  const [assignWholeGroupMap, setAssignWholeGroupMap] = useState<Record<string, boolean>>({});

  // Sync selectedDate with currentDate if currentDate changes externally and user hasn't explicitly picked
  useEffect(() => {
    if (currentDate && filterMode === 'selectedDate' && !selectedDate) {
      setSelectedDate(currentDate);
    }
  }, [currentDate, filterMode, selectedDate]);

  // List of all dates that currently have unassigned passengers
  const datesWithQueue = useMemo(() => {
    const map = new Map<string, number>();
    unassignedPassengers.forEach((p) => {
      if (p.tanggal) {
        map.set(p.tanggal, (map.get(p.tanggal) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [unassignedPassengers]);

  // All unique dates from reports as well
  const allKnownDates = useMemo(() => {
    const set = new Set<string>();
    unassignedPassengers.forEach((p) => p.tanggal && set.add(p.tanggal));
    reports.forEach((r) => r.tanggal && set.add(r.tanggal));
    if (currentDate) set.add(currentDate);
    if (selectedDate) set.add(selectedDate);
    return Array.from(set);
  }, [unassignedPassengers, reports, currentDate, selectedDate]);

  // Filtered passengers based on mode
  const filteredPassengers = useMemo(() => {
    if (filterMode === 'selectedDate') {
      return unassignedPassengers.filter((p) => p.tanggal === selectedDate);
    }
    return unassignedPassengers;
  }, [unassignedPassengers, filterMode, selectedDate]);

  const countTotal = unassignedPassengers.length;
  const countSelectedDate = unassignedPassengers.filter((p) => p.tanggal === selectedDate).length;
  
  const keberangkatanCount = filteredPassengers.filter(
    (p) => (p.tripType || 'keberangkatan') === 'keberangkatan'
  ).length;
  const kedatanganCount = filteredPassengers.filter(
    (p) => p.tripType === 'kedatangan'
  ).length;

  // Drivers available on the selected date
  const driversOnSelectedDate = useMemo(() => {
    return reports.filter((r) => r.tanggal === selectedDate);
  }, [reports, selectedDate]);

  // Interactive 7-day strip centered on selected date
  const calendarStripDays = useMemo(() => {
    const base = parseIndonesianDate(selectedDate);
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const dateStr = formatIndonesianDate(d);
      const queueCount = unassignedPassengers.filter((p) => p.tanggal === dateStr).length;
      const driverCount = reports.filter((r) => r.tanggal === dateStr).length;
      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const dayName = dayNames[d.getDay()];
      const isToday = formatIndonesianDate(new Date()) === dateStr;
      const isSelected = selectedDate === dateStr;

      days.push({
        dateStr,
        dayName,
        dayNumber: d.getDate(),
        monthShort: d.toLocaleString('id-ID', { month: 'short' }),
        queueCount,
        driverCount,
        isToday,
        isSelected,
      });
    }
    return days;
  }, [selectedDate, unassignedPassengers, reports]);

  // Shift selected date by +/- offset days
  const handleShiftDate = (days: number) => {
    const parsed = parseIndonesianDate(selectedDate);
    const nextDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() + days);
    setSelectedDate(formatIndonesianDate(nextDate));
    setFilterMode('selectedDate');
  };

  const handleJumpToday = () => {
    setSelectedDate(formatIndonesianDate(new Date()));
    setFilterMode('selectedDate');
  };

  const handleJumpTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(formatIndonesianDate(tomorrow));
    setFilterMode('selectedDate');
  };

  return (
    <div className="mb-5 bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-orange-50/50 border border-amber-300 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Icon, Title & Expand Trigger */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                <span>Antrian Penumpang (Pool Siap Angkut)</span>
              </h4>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-xs ${
                countSelectedDate > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {filterMode === 'selectedDate' 
                  ? `${countSelectedDate} Antrean (${selectedDate})` 
                  : `${countTotal} Antrean (Semua Tanggal)`
                }
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Pilih tanggal di kalender untuk melihat antrean penumpang per hari. Penumpang hanya masuk ke driver dan jam yang Anda pilih secara manual.
            </p>
          </div>
          <button 
            type="button" 
            className="text-slate-400 hover:text-slate-700 ml-auto md:ml-2 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            title={isExpanded ? 'Sembunyikan detail antrean' : 'Tampilkan detail antrean'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          
          {/* Mode Switcher */}
          <div className="bg-white p-0.5 rounded-xl border border-amber-200 text-xs font-bold flex shadow-xs">
            <button
              type="button"
              onClick={() => setFilterMode('selectedDate')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterMode === 'selectedDate'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={`Tampilkan hanya tanggal terpilih: ${selectedDate}`}
            >
              <Calendar className="w-3 h-3" />
              <span>Tanggal Terpilih ({countSelectedDate})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan seluruh antrian dari semua tanggal"
            >
              Semua ({countTotal})
            </button>
          </div>

          {/* Add Passenger Directly to Queue */}
          <button
            type="button"
            onClick={() => onOpenAddPassenger(selectedDate, 'queue')}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
            title="Tambah penumpang baru langsung ke dalam antrean tanggal ini"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Antrean Baru</span>
          </button>
        </div>
      </div>

      {/* ── INTERACTIVE CALENDAR DATE SELECTOR BAR ── */}
      <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-2.5">
        
        {/* Row 1: Calendar Input, Quick Steppers & Date Sync */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-white/90 p-2.5 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 shrink-0">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              <span>Pilih Tanggal di Kalender:</span>
            </span>

            <div className="w-full sm:w-72">
              <DatePickerInput
                value={selectedDate}
                onChange={(newDate) => {
                  setSelectedDate(newDate);
                  setFilterMode('selectedDate');
                }}
                label=""
              />
            </div>

            {/* Quick Navigation Steppers */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center transition-colors"
                title="Pindah ke 1 hari sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleJumpToday}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                title="Loncat ke Hari Ini"
              >
                Hari Ini
              </button>

              <button
                type="button"
                onClick={handleJumpTomorrow}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                title="Loncat ke Besok"
              >
                Besok
              </button>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center transition-colors"
                title="Pindah ke 1 hari berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Date Chips with Queue Indicators */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5 text-xs">
            {onSwitchActiveDate && driversOnSelectedDate.length > 0 && selectedDate !== currentDate && (
              <button
                type="button"
                onClick={() => onSwitchActiveDate(selectedDate)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                title="Buka dan sinkronkan manifest armada driver di bawah ke tanggal ini"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Buka Armada Driver ({selectedDate})</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: 7-Day Interactive Visual Calendar Strip */}
        <div className="bg-amber-100/50 p-2 rounded-2xl border border-amber-200/90">
          <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
            <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>Kalender Antrean Harian (Klik tanggal untuk memuat antrean):</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleShiftDate(-7)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-amber-200 text-slate-700 hover:bg-amber-50 font-semibold"
                title="Mundur 1 minggu"
              >
                « -7 Hari
              </button>
              <button
                type="button"
                onClick={() => handleShiftDate(7)}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-amber-200 text-slate-700 hover:bg-amber-50 font-semibold"
                title="Maju 1 minggu"
              >
                +7 Hari »
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarStripDays.map((item) => {
              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => {
                    setSelectedDate(item.dateStr);
                    setFilterMode('selectedDate');
                  }}
                  className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl transition-all border text-center ${
                    item.isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-400'
                      : item.isToday
                      ? 'bg-white text-slate-900 border-amber-400 hover:bg-amber-50 font-medium'
                      : 'bg-white/85 text-slate-800 border-slate-200 hover:bg-white hover:border-amber-300'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-extrabold ${
                    item.isSelected ? 'text-amber-100' : 'text-slate-500'
                  }`}>
                    {item.dayName}
                  </span>
                  <span className="text-sm sm:text-base font-black my-0.5">
                    {item.dayNumber}
                  </span>
                  <span className={`text-[9px] font-semibold ${
                    item.isSelected ? 'text-amber-100' : 'text-slate-400'
                  }`}>
                    {item.monthShort}
                  </span>

                  {/* Antrean Badge */}
                  <div className="mt-1 flex flex-col items-center gap-0.5 w-full">
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold w-full truncate ${
                      item.queueCount > 0
                        ? item.isSelected
                          ? 'bg-white text-amber-900 shadow-xs'
                          : 'bg-amber-500 text-white shadow-xs'
                        : item.isSelected
                        ? 'bg-amber-600 text-amber-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.queueCount > 0 ? `${item.queueCount} Antrean` : '0 Antrean'}
                    </span>
                    {item.driverCount > 0 && (
                      <span className={`text-[8px] font-medium truncate ${
                        item.isSelected ? 'text-amber-100' : 'text-slate-500'
                      }`}>
                        🚗 {item.driverCount} Armada
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── EXPANDED CONTENT GRID ── */}
      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-amber-200/80 space-y-3">
          
          {/* Quick Metrics Bar for Selected Date */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold bg-white/70 px-3 py-1.5 rounded-xl border border-amber-200/60">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-700">
              <span>
                Status Tanggal: <strong>{filterMode === 'selectedDate' ? selectedDate : 'Semua Tanggal'}</strong>
              </span>
              <span>•</span>
              <span className="text-amber-900 font-bold">
                Total Antrean: {filteredPassengers.length} Penumpang
              </span>
              <span>•</span>
              <span className="text-sky-800 font-bold flex items-center gap-1">
                <PlaneTakeoff className="w-3 h-3 text-sky-600" />
                <span>🛫 Keberangkatan: {keberangkatanCount}</span>
              </span>
              <span>•</span>
              <span className="text-indigo-800 font-bold flex items-center gap-1">
                <PlaneLanding className="w-3 h-3 text-indigo-600" />
                <span>🛬 Kedatangan: {kedatanganCount}</span>
              </span>
            </div>
            <div className="text-slate-600 text-xs">
              Armada Bertugas: <strong>{driversOnSelectedDate.length} Driver</strong>
            </div>
          </div>

          {/* Content: Passengers or Empty State */}
          {filteredPassengers.length === 0 ? (
            /* Empty State Container (Always shown when 0 passengers on selected date) */
            <div className="bg-white/80 rounded-2xl p-6 border border-dashed border-amber-300 text-center flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shadow-xs">
                <Inbox className="w-6 h-6" />
              </div>
              <div className="max-w-md">
                <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                  Tidak Ada Antrean Penumpang untuk Tanggal Ini
                </h5>
                <p className="text-xs text-slate-600 mt-1">
                  Semua penumpang pada tanggal <strong>{selectedDate}</strong> sudah masuk ke dalam armada driver, atau belum ada pesanan baru yang masuk ke antrean.
                </p>
              </div>

              {/* Action Buttons in Empty State */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => onOpenAddPassenger(selectedDate, 'queue')}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Masukkan Penumpang ke Antrean Tanggal Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAddDriver(selectedDate)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <Car className="w-4 h-4" />
                  <span>+ Buat Driver Baru di Tanggal Ini</span>
                </button>
              </div>
            </div>
          ) : (
            /* Grid of Queued Passenger Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPassengers.map((passenger) => {
                // Find drivers on this passenger's date
                const driversOnDate = reports.filter((r) => r.tanggal === passenger.tanggal);
                // Highlight driver with matching jam
                const matchingDriver = driversOnDate.find((r) => r.jamMulai === passenger.jam);

                const isKeberangkatan = (passenger.tripType || 'keberangkatan') === 'keberangkatan';

                return (
                  <div 
                    key={passenger.id}
                    className="bg-white rounded-2xl p-3.5 border border-amber-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    {/* Top Badges & Actions */}
                    <div>
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Jam Badge */}
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600" />
                            <span>{passenger.jam || '05:30'} WIB</span>
                          </span>

                          {/* Trip Type Badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                            isKeberangkatan
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}>
                            {isKeberangkatan ? (
                              <>
                                <PlaneTakeoff className="w-3 h-3 text-sky-600" />
                                <span>Keberangkatan</span>
                              </>
                            ) : (
                              <>
                                <PlaneLanding className="w-3 h-3 text-indigo-600" />
                                <span>Kedatangan</span>
                              </>
                            )}
                          </span>

                          {/* Date Badge (especially useful if viewing 'all' dates) */}
                          {filterMode === 'all' && (
                            <span className="text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-slate-500" />
                              <span>{passenger.tanggal}</span>
                            </span>
                          )}
                        </div>

                        {/* Actions: Edit & Delete */}
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingPassenger({ ...passenger })}
                            className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Edit data antrean penumpang"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Action with Inline Confirmation */}
                          {confirmDeleteId === passenger.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteUnassigned(passenger.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 rounded-lg shadow-xs"
                              >
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1.5 py-0.5 rounded-lg"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(passenger.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                              title="Hapus dari antrean"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Group Booking Badge if part of a multi-passenger booking */}
                      {passenger.bookingGroupId && (
                        <div className="mb-2 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-[11px] font-medium flex flex-col gap-0.5">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5 text-indigo-700">
                              <Users className="w-3.5 h-3.5" />
                              <span>Rombongan {passenger.totalSeatsInBooking || 'Multi'} Kursi (Kursi #{passenger.seatIndex || 1})</span>
                            </span>
                            <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.2 rounded font-mono font-bold">
                              {unassignedPassengers.filter((p) => p.bookingGroupId === passenger.bookingGroupId).length} di Antrean
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Pemesan Utama: <strong>{passenger.bookerName || passenger.nama}</strong>
                          </div>
                        </div>
                      )}

                      {/* Passenger Name & Phone */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{passenger.nama}</span>
                        </h5>
                        {passenger.hp && (
                          <a
                            href={`https://wa.me/${passenger.hp.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg font-mono font-bold flex items-center gap-1 shrink-0 border border-emerald-200 transition-colors"
                            title="Chat WhatsApp Penumpang"
                          >
                            <Phone className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{passenger.hp}</span>
                          </a>
                        )}
                      </div>

                      {/* Pick-up / Drop-off info */}
                      <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <span className="truncate"><strong>Jemput:</strong> {passenger.jemput || '-'}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="truncate"><strong>Antar:</strong> {passenger.antar || '✓'}</span>
                        </div>
                        {passenger.keterangan && (
                          <div className="text-[10px] text-slate-500 italic truncate bg-white px-2 py-1 rounded-md border border-slate-200 mt-1">
                            "{passenger.keterangan}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Driver Assignment Controls */}
                    <div className="pt-2 border-t border-slate-100">
                      {(() => {
                        const poolGroupMembers = passenger.bookingGroupId 
                          ? unassignedPassengers.filter((p) => p.bookingGroupId === passenger.bookingGroupId)
                          : [];
                        const isGroup = poolGroupMembers.length > 1;
                        const isAssignWholeGroup = assignWholeGroupMap[passenger.id] ?? true;
                        const seatsNeeded = isGroup && isAssignWholeGroup ? poolGroupMembers.length : 1;

                        return (
                          <>
                            <div className="text-[10px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Car className="w-3.5 h-3.5 text-slate-500" />
                                <span>Tugaskan ke Driver ({passenger.tanggal}):</span>
                              </span>
                              {matchingDriver && (
                                <span className="text-purple-700 font-bold text-[9px] bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  ⭐ Jam Cocok
                                </span>
                              )}
                            </div>

                            {/* Option to assign whole group or single seat */}
                            {isGroup && (
                              <div className="mb-1.5 p-1.5 bg-indigo-50/80 rounded-lg border border-indigo-200 flex items-center justify-between text-[10px]">
                                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-900 select-none">
                                  <input
                                    type="checkbox"
                                    checked={isAssignWholeGroup}
                                    onChange={(e) => {
                                      setAssignWholeGroupMap((prev) => ({
                                        ...prev,
                                        [passenger.id]: e.target.checked,
                                      }));
                                    }}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                  />
                                  <span>Tugaskan Seluruh Rombongan ({poolGroupMembers.length} Kursi) Sekaligus</span>
                                </label>
                              </div>
                            )}

                            {driversOnDate.length > 0 ? (
                              <div className="space-y-1.5">
                                <select
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      onAssignToDriver(passenger.id, val, Boolean(isGroup && isAssignWholeGroup));
                                    }
                                  }}
                                  defaultValue=""
                                  className="w-full text-xs font-bold bg-slate-50 hover:bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-amber-500 transition-colors"
                                >
                                  <option value="" disabled>-- Pilih Driver untuk {seatsNeeded > 1 ? `${seatsNeeded} Orang` : 'Penumpang Ini'} --</option>
                                  {driversOnDate.map((driverReport) => {
                                    const pTrip = passenger.tripType || 'keberangkatan';
                                    const pTripLabel = pTrip === 'kedatangan' ? 'Kedatangan' : 'Keberangkatan';
                                    const filledThisTrip = getFilledRows(driverReport.rows).filter(
                                      (r) => (r.tripType || 'keberangkatan') === pTrip
                                    ).length;
                                    const cap = driverReport.kapasitas || 7;
                                    const remaining = Math.max(0, cap - filledThisTrip);
                                    const hasEnough = remaining >= seatsNeeded;
                                    const isJamExact = driverReport.jamMulai === passenger.jam;

                                    return (
                                      <option 
                                        key={driverReport.id} 
                                        value={driverReport.id} 
                                        disabled={!hasEnough}
                                      >
                                        {isJamExact ? '⭐ ' : ''}{driverReport.driver} ({driverReport.kendaraan}) - Sisa {remaining}/{cap} {pTripLabel} {hasEnough ? `(Cukup ${seatsNeeded} org)` : `(Penuh: butuh ${seatsNeeded})`} [Jam {driverReport.jamMulai || '-'}]
                                      </option>
                                    );
                                  })}
                                </select>

                                {/* Quick Add Driver if no driver fits */}
                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                  <span>Atau tambah armada:</span>
                                  <button
                                    type="button"
                                    onClick={() => onOpenAddDriver(passenger.tanggal, passenger.jam)}
                                    className="text-purple-700 hover:text-purple-900 font-bold hover:underline flex items-center gap-0.5"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Driver Baru Jam {passenger.jam}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-center space-y-1.5">
                                <div className="text-[11px] text-amber-900 font-medium">
                                  Belum ada driver terdaftar pada tanggal <strong>{passenger.tanggal}</strong>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onOpenAddDriver(passenger.tanggal, passenger.jam)}
                                  className="w-full py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Buat Driver Jam {passenger.jam}</span>
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Edit Penumpang Antrean */}
      {editingPassenger && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Edit Antrean Penumpang</h3>
                  <p className="text-xs text-slate-500">Perbarui data nama, jam, tanggal, atau rute penjemputan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPassenger(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingPassenger && onEditUnassigned) {
                  onEditUnassigned(editingPassenger);
                }
                setEditingPassenger(null);
              }}
              className="space-y-3.5"
            >
              {/* Nama & HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nama Penumpang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPassenger.nama}
                    onChange={(e) => setEditingPassenger({ ...editingPassenger, nama: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={editingPassenger.hp || ''}
                    onChange={(e) => setEditingPassenger({ ...editingPassenger, hp: e.target.value })}
                    placeholder="Contoh: 08123456789"
                    className="w-full px-3 py-2 text-xs font-mono font-semibold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Tanggal & Jam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tanggal Operasional
                  </label>
                  <DatePickerInput
                    value={editingPassenger.tanggal || ''}
                    onChange={(d) => setEditingPassenger({ ...editingPassenger, tanggal: d })}
                    label=""
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Jam Operasional / Penjemputan
                  </label>
                  <input
                    type="text"
                    value={editingPassenger.jam || ''}
                    onChange={(e) => setEditingPassenger({ ...editingPassenger, jam: e.target.value })}
                    placeholder="Contoh: 05:30"
                    className="w-full px-3 py-2 text-xs font-mono font-semibold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Trip Type: Keberangkatan vs Kedatangan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Arah Perjalanan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPassenger({ ...editingPassenger, tripType: 'keberangkatan' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      (editingPassenger.tripType || 'keberangkatan') === 'keberangkatan'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <PlaneTakeoff className="w-3.5 h-3.5" />
                    <span>Keberangkatan (Antar)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPassenger({ ...editingPassenger, tripType: 'kedatangan' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      editingPassenger.tripType === 'kedatangan'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <PlaneLanding className="w-3.5 h-3.5" />
                    <span>Kedatangan (Jemput)</span>
                  </button>
                </div>
              </div>

              {/* Jemput & Antar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Titik Jemput
                  </label>
                  <input
                    type="text"
                    value={editingPassenger.jemput || ''}
                    onChange={(e) => setEditingPassenger({ ...editingPassenger, jemput: e.target.value })}
                    placeholder="Alamat penjemputan"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Titik Antar
                  </label>
                  <input
                    type="text"
                    value={editingPassenger.antar || ''}
                    onChange={(e) => setEditingPassenger({ ...editingPassenger, antar: e.target.value })}
                    placeholder="Tujuan pengantaran"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Keterangan / Catatan Khusus
                </label>
                <input
                  type="text"
                  value={editingPassenger.keterangan || ''}
                  onChange={(e) => setEditingPassenger({ ...editingPassenger, keterangan: e.target.value })}
                  placeholder="Bawa koper, titip barang, dll."
                  className="w-full px-3 py-2 text-xs font-medium text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPassenger(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

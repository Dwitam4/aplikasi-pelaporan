import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  CalendarRange,
  User, 
  Users,
  Car, 
  Train, 
  Search, 
  Download, 
  Trash2, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Phone, 
  MessageCircle, 
  Plus, 
  ExternalLink,
  Filter,
  Layers,
  Sparkles,
  AlertCircle,
  PlaneTakeoff,
  PlaneLanding
} from 'lucide-react';
import { ReportDocument, ReportRow } from '../types';
import { getFilledRows, exportMultiDriverExcel, exportToExcel, getWhatsAppUrl } from '../utils/spreadsheet';
import { DatePickerInput } from './DatePickerInput';
import { parseIndonesianDate, formatIndonesianDate, INDONESIAN_MONTHS } from '../utils/date';

interface ReportHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedReports: ReportDocument[];
  currentReportId: string;
  onSelectReport: (report: ReportDocument) => void;
  onDeleteReport: (id: string) => void;
  onNewReport: () => void;
  onOpenAddPassenger: () => void;
}

export const ReportHistoryDrawer: React.FC<ReportHistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedReports,
  currentReportId,
  onSelectReport,
  onDeleteReport,
  onNewReport,
  onOpenAddPassenger,
}) => {
  // Filter mode: 'daily' | 'range' | 'month'
  const [filterMode, setFilterMode] = useState<'daily' | 'range' | 'month'>('daily');

  // Extract all unique dates from reports
  const allUniqueDates: string[] = useMemo(() => {
    return Array.from(new Set(savedReports.map((r) => r.tanggal).filter(Boolean)));
  }, [savedReports]);

  // 1. Daily filter state
  const [selectedDate, setSelectedDate] = useState<string>(
    allUniqueDates[0] || savedReports[0]?.tanggal || 'Semua Tanggal'
  );

  // 2. Date Range filter state (up to 31 days)
  const now = new Date();
  const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState<string>(formatIndonesianDate(past30));
  const [endDate, setEndDate] = useState<string>(formatIndonesianDate(now));

  // 3. Month filter state
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('all');
  const [selectedHourFilter, setSelectedHourFilter] = useState<string>('all');
  const [viewTab, setViewTab] = useState<'passengers' | 'drivers'>('passengers');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate range days count
  const rangeDaysCount = useMemo(() => {
    const s = parseIndonesianDate(startDate);
    const e = parseIndonesianDate(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  // Range preset helper
  const handleSetPresetRange = (days: number) => {
    const end = parseIndonesianDate(endDate);
    const validEnd = isNaN(end.getTime()) ? new Date() : end;
    const start = new Date(validEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setStartDate(formatIndonesianDate(start));
    setEndDate(formatIndonesianDate(validEnd));
  };

  // Safe handler for start date
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    const s = parseIndonesianDate(newStart);
    const e = parseIndonesianDate(endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 31 || diff < 1) {
        // Automatically cap end date to 31 days
        const newEnd = new Date(s.getTime() + 30 * 24 * 60 * 60 * 1000);
        setEndDate(formatIndonesianDate(newEnd));
      }
    }
  };

  // Safe handler for end date
  const handleEndDateChange = (newEnd: string) => {
    const s = parseIndonesianDate(startDate);
    const e = parseIndonesianDate(newEnd);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 31) {
        // Cap start date to 31 days prior
        const newStart = new Date(e.getTime() - 30 * 24 * 60 * 60 * 1000);
        setStartDate(formatIndonesianDate(newStart));
        setEndDate(newEnd);
        return;
      }
    }
    setEndDate(newEnd);
  };

  // Filter reports according to active mode
  const reportsForDate = useMemo(() => {
    if (filterMode === 'daily') {
      if (selectedDate === 'all') return savedReports;
      return savedReports.filter((r) => r.tanggal === selectedDate);
    }

    if (filterMode === 'range') {
      const s = parseIndonesianDate(startDate);
      s.setHours(0, 0, 0, 0);
      const e = parseIndonesianDate(endDate);
      e.setHours(23, 59, 59, 999);

      return savedReports.filter((r) => {
        if (!r.tanggal) return false;
        const d = parseIndonesianDate(r.tanggal);
        return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
      });
    }

    if (filterMode === 'month') {
      return savedReports.filter((r) => {
        if (!r.tanggal) return false;
        const d = parseIndonesianDate(r.tanggal);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }

    return savedReports;
  }, [filterMode, selectedDate, startDate, endDate, selectedMonth, selectedYear, savedReports]);

  // Available drivers for current filtered reports
  const uniqueDriversForDate: string[] = useMemo(() => {
    return Array.from(new Set(reportsForDate.map((r) => r.driver).filter(Boolean)));
  }, [reportsForDate]);

  // Extract all unique operational hours across passengers in reportsForDate
  const uniqueHoursForDate: string[] = useMemo(() => {
    const hours = new Set<string>();
    reportsForDate.forEach((rep) => {
      rep.rows.forEach((r) => {
        if (r.nama && r.nama.trim()) {
          hours.add(r.jam || rep.jamMulai || '05:30');
        }
      });
      if (rep.jamMulai) hours.add(rep.jamMulai);
    });
    return Array.from(hours).sort();
  }, [reportsForDate]);

  // Passenger count per hour
  const passengerCountByHour = useMemo(() => {
    const map = new Map<string, number>();
    reportsForDate.forEach((rep) => {
      if (selectedDriverFilter !== 'all' && rep.driver !== selectedDriverFilter) return;
      getFilledRows(rep.rows).forEach((r) => {
        const jam = r.jam || rep.jamMulai || '05:30';
        map.set(jam, (map.get(jam) || 0) + 1);
      });
    });
    return map;
  }, [reportsForDate, selectedDriverFilter]);

  // Flattened passengers for current date filter
  const allFlattenedPassengers = useMemo(() => {
    const list: Array<{
      passenger: ReportRow;
      report: ReportDocument;
      tanggal: string;
      jam: string;
      driver: string;
      kendaraan: string;
      platNomor?: string;
    }> = [];

    reportsForDate.forEach((rep) => {
      if (selectedDriverFilter !== 'all' && rep.driver !== selectedDriverFilter) return;
      const filled = getFilledRows(rep.rows);
      filled.forEach((r) => {
        const jam = r.jam || rep.jamMulai || '05:30';
        if (selectedHourFilter !== 'all' && jam !== selectedHourFilter) return;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            r.nama.toLowerCase().includes(q) ||
            r.hp.toLowerCase().includes(q) ||
            r.antar.toLowerCase().includes(q) ||
            r.jemput.toLowerCase().includes(q) ||
            r.keterangan.toLowerCase().includes(q) ||
            (rep.driver && rep.driver.toLowerCase().includes(q)) ||
            (rep.kendaraan && rep.kendaraan.toLowerCase().includes(q));
          if (!matches) return;
        }

        list.push({
          passenger: r,
          report: rep,
          tanggal: rep.tanggal,
          jam,
          driver: rep.driver || 'Driver',
          kendaraan: rep.kendaraan || 'Armada',
          platNomor: rep.platNomor,
        });
      });
    });

    return list.sort((a, b) => {
      const cmpDate = a.tanggal.localeCompare(b.tanggal);
      if (cmpDate !== 0) return cmpDate;
      const cmpJam = a.jam.localeCompare(b.jam);
      if (cmpJam !== 0) return cmpJam;
      return a.passenger.nama.localeCompare(b.passenger.nama);
    });
  }, [reportsForDate, selectedDriverFilter, selectedHourFilter, searchQuery]);

  // Grouped by hour
  const groupedByHour = useMemo(() => {
    const map = new Map<string, typeof allFlattenedPassengers>();
    allFlattenedPassengers.forEach((item) => {
      const h = item.jam || '05:30';
      const arr = map.get(h) || [];
      arr.push(item);
      map.set(h, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allFlattenedPassengers]);

  // Filter reports by selected driver & hour
  const displayedReports = useMemo(() => {
    return reportsForDate.filter((r) => {
      if (selectedDriverFilter !== 'all' && r.driver !== selectedDriverFilter) return false;
      if (selectedHourFilter !== 'all') {
        const hasHour = r.rows.some((row) => (row.jam || r.jamMulai || '05:30') === selectedHourFilter && row.nama && row.nama.trim());
        if (!hasHour && (r.jamMulai || '05:30') !== selectedHourFilter) return false;
      }
      return true;
    });
  }, [reportsForDate, selectedDriverFilter, selectedHourFilter]);

  // Calculate statistics for current filtered reports
  const totalPassengersForDate = useMemo(() => {
    return reportsForDate.reduce((acc, r) => acc + getFilledRows(r.rows).length, 0);
  }, [reportsForDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Riwayat Penugasan & Penumpang</h3>
              <p className="text-xs text-slate-300">
                Pilih tanggal harian, rentang tanggal (s/d 31 hari), atau rekap per bulan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          
          {/* Mode Tabs: Harian vs Rentang Tanggal vs Bulanan */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setFilterMode('daily');
                setSelectedDriverFilter('all');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center ${
                filterMode === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📅 Tanggal Harian
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('range');
                setSelectedDriverFilter('all');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                filterMode === 'range'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rentang (s/d 31 Hari)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('month');
                setSelectedDriverFilter('all');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center ${
                filterMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🗓️ Rekap Bulanan
            </button>
          </div>

          {/* 1. View: Daily Date Tabs */}
          {filterMode === 'daily' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pilih Tanggal Riwayat:</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {allUniqueDates.length} Tanggal Operasional
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('all');
                    setSelectedDriverFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedDate === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  Semua Tanggal ({savedReports.length} Armada)
                </button>

                {allUniqueDates.map((dateStr) => {
                  const countReports = savedReports.filter((r) => r.tanggal === dateStr).length;
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedDriverFilter('all');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span>{dateStr}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {countReports} armada
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. View: Date Range Filter (Max 31 Days) */}
          {filterMode === 'range' && (
            <div className="bg-white p-3 rounded-2xl border border-indigo-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pilih Rentang Tanggal (Maksimal 31 Hari):</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {rangeDaysCount} Hari Terpilih
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DatePickerInput
                  label="Dari Tanggal"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="w-full"
                />
                <DatePickerInput
                  label="Sampai Tanggal"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="w-full"
                />
              </div>

              {/* Quick Presets for Date Range */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-500">Pilihan Cepat:</span>
                <button
                  type="button"
                  onClick={() => handleSetPresetRange(7)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetRange(14)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  14 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetRange(30)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  30 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetRange(31)}
                  className="px-2.5 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  31 Hari Penuh
                </button>
              </div>
            </div>
          )}

          {/* 3. View: Month & Year Selector */}
          {filterMode === 'month' && (
            <div className="bg-white p-3 rounded-2xl border border-indigo-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🗓️ Pilih Bulan & Tahun Laporan:</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Bulan:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    {INDONESIAN_MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Tahun:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Driver Filter & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
            <div>
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                <Car className="w-3.5 h-3.5 text-emerald-600" />
                <span>Filter Driver:</span>
              </label>
              <select
                value={selectedDriverFilter}
                onChange={(e) => setSelectedDriverFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
              >
                <option value="all">Semua Driver ({reportsForDate.length} Armada)</option>
                {uniqueDriversForDate.map((drv) => (
                  <option key={drv} value={drv}>
                    👤 {drv}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>Cari Penumpang / Lokasi:</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor HP, jemput..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Date / Range Summary Stats Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-800">
                Armada: <strong>{reportsForDate.length}</strong> | Total Penumpang: <strong>{totalPassengersForDate} Orang</strong>
              </span>
            </div>

            {reportsForDate.length > 0 && (
              <button
                type="button"
                onClick={() => exportMultiDriverExcel(reportsForDate)}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold transition-colors flex items-center gap-1"
                title="Unduh Rekap Excel Semua Data Terpilih"
              >
                <Download className="w-3 h-3 text-emerald-600" />
                <span>Unduh Rekap Excel</span>
              </button>
            )}
          </div>

          {/* Filter Jam Keberangkatan / Operasional */}
          <div className="pt-2 border-t border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Filter Jam Operasional:</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                {uniqueHoursForDate.length} Jam Terjadwal
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedHourFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedHourFilter === 'all'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                Semua Jam ({totalPassengersForDate})
              </button>
              {uniqueHoursForDate.map((hr) => {
                const cnt = passengerCountByHour.get(hr) || 0;
                const isSel = selectedHourFilter === hr;
                return (
                  <button
                    key={hr}
                    type="button"
                    onClick={() => setSelectedHourFilter(hr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1 ${
                      isSel
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>{hr} WIB</span>
                    <span className={`text-[10px] px-1 rounded font-mono ${
                      isSel ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {cnt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* View Mode Switcher: Rekap Penumpang vs Lembar Driver */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-300 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setViewTab('passengers')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                viewTab === 'passengers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Daftar Penumpang ({allFlattenedPassengers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab('drivers')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                viewTab === 'drivers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lembar Driver ({displayedReports.length})</span>
            </button>
          </div>

        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: REKAP SEMUA PENUMPANG PER JAM & PER TANGGAL */}
          {viewTab === 'passengers' && (
            <div>
              {allFlattenedPassengers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Users className="w-12 h-12 mx-auto opacity-30 text-indigo-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Tidak ada data penumpang pada jam/tanggal ini</p>
                    <p className="text-xs text-slate-500 mt-0.5">Silakan pilih jam lain, ubah tanggal, atau tambah penumpang baru.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddPassenger();
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
                  >
                    + Tambah Penumpang Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedByHour.map(([hour, items]) => (
                    <div key={hour} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      {/* Hour Header */}
                      <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs text-amber-950 font-mono">
                            Jam {hour} WIB
                          </span>
                          <span className="text-[11px] font-semibold text-amber-800">
                            • {items.length} Penumpang
                          </span>
                        </div>

                        <span className="text-[10px] font-semibold text-slate-500">
                          {items[0]?.tanggal}
                        </span>
                      </div>

                      {/* Passenger items */}
                      <div className="divide-y divide-slate-100">
                        {items.map((item, idx) => {
                          const isHadir = item.passenger.kehadiran === 'sudah_ada' || (!item.passenger.kehadiran && item.passenger.status === 'selesai');
                          const isKeberangkatan = (item.passenger.tripType || 'keberangkatan') === 'keberangkatan';

                          return (
                            <div
                              key={item.passenger.id || idx}
                              className="p-3 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Nama */}
                                  <span className="font-bold text-sm text-slate-900">
                                    {item.passenger.nama || 'Tanpa Nama'}
                                  </span>

                                  {/* Tanggal & Jam Badge */}
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <Calendar className="w-3 h-3 text-indigo-600" />
                                    <span>{item.tanggal}</span>
                                  </span>

                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>{item.jam} WIB</span>
                                  </span>

                                  {/* TripType Badge */}
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                    isKeberangkatan
                                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  }`}>
                                    {isKeberangkatan ? (
                                      <>
                                        <PlaneTakeoff className="w-2.5 h-2.5 text-sky-600" />
                                        <span>Keberangkatan</span>
                                      </>
                                    ) : (
                                      <>
                                        <PlaneLanding className="w-2.5 h-2.5 text-indigo-600" />
                                        <span>Kedatangan</span>
                                      </>
                                    )}
                                  </span>

                                  {/* Kehadiran Badge */}
                                  {isHadir ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Sudah Ada
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                      Belum Ada
                                    </span>
                                  )}
                                </div>

                                {/* Rute Jemput & Antar */}
                                <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
                                  <span>📍 Jemput: <strong>{item.passenger.jemput || '-'}</strong></span>
                                  <span>➔ ↗️ Antar: <strong>{item.passenger.antar || '-'}</strong></span>
                                  {item.passenger.keterangan && (
                                    <span className="text-amber-800 font-medium bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                      {item.passenger.keterangan}
                                    </span>
                                  )}
                                </div>

                                {/* Driver & Kendaraan */}
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                  <Car className="w-3 h-3 text-emerald-600" />
                                  <span>Driver: <strong>{item.driver}</strong> ({item.kendaraan}{item.platNomor ? ` • ${item.platNomor}` : ''})</span>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {item.passenger.hp && (
                                  <a
                                    href={getWhatsAppUrl(item.passenger.hp)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[11px] font-bold transition-colors flex items-center gap-1"
                                    title="Hubungi WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WA</span>
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectReport(item.report);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition-colors flex items-center gap-1"
                                  title="Buka Lembar Manifest Driver"
                                >
                                  <span>Buka Driver</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TAMPILAN LEMBAR PER DRIVER & ARMADA */}
          {viewTab === 'drivers' && (
            displayedReports.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <FileSpreadsheet className="w-12 h-12 mx-auto opacity-30" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Tidak ada riwayat penugasan driver yang cocok</p>
                  <p className="text-xs text-slate-500 mt-0.5">Silakan ubah filter tanggal atau jam operasional.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddPassenger();
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
                >
                  + Tambah Penumpang Sekarang
                </button>
              </div>
            ) : (
              displayedReports.map((reportItem) => {
                const isCurrent = reportItem.id === currentReportId;
                const filledRows = getFilledRows(reportItem.rows);

                // Filter rows by search query and hour filter
                const matchedRows = filledRows.filter((r) => {
                  const rJam = r.jam || reportItem.jamMulai || '05:30';
                  if (selectedHourFilter !== 'all' && rJam !== selectedHourFilter) return false;

                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    r.nama.toLowerCase().includes(q) ||
                    r.hp.toLowerCase().includes(q) ||
                    r.antar.toLowerCase().includes(q) ||
                    r.jemput.toLowerCase().includes(q) ||
                    r.keterangan.toLowerCase().includes(q)
                  );
                });

                return (
                  <div
                    key={reportItem.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isCurrent
                        ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/30 shadow-md'
                        : 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                          <Car className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">
                              {reportItem.driver || 'Driver Tanpa Nama'}
                            </h4>
                            {reportItem.driverHp && (
                              <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                📞 {reportItem.driverHp}
                              </span>
                            )}
                            <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700">
                              {reportItem.kendaraan}
                            </span>
                            {reportItem.platNomor && (
                              <span className="text-[10px] font-mono font-bold bg-slate-900 text-amber-300 px-2 py-0.5 rounded shadow-2xs">
                                {reportItem.platNomor}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-500">
                              • {reportItem.namaKereta || 'BIB/RGA'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>📅 {reportItem.tanggal}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              {filledRows.length} Penumpang Terdaftar
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectReport(reportItem);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                        >
                          <span>Buka Lembar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => exportToExcel(reportItem)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Unduh Excel Driver Ini"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const pnpCount = getFilledRows(reportItem.rows).length;
                            const msg = pnpCount > 0
                              ? `Hapus lembar penugasan "${reportItem.driver || 'Driver'} - ${reportItem.tanggal}"? Seluruh ${pnpCount} penumpang di dalamnya TETAP AMAN tersimpan di database dan otomatis dikembalikan ke Antrian Penumpang agar dapat ditugaskan kembali.`
                              : `Hapus lembar penugasan "${reportItem.driver || 'Driver'} - ${reportItem.tanggal}"?`;
                            if (confirm(msg)) {
                              onDeleteReport(reportItem.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Penugasan Ini (Penumpang Tetap Aman)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Passenger Rows List */}
                    <div className="p-3">
                      {matchedRows.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2 text-center">
                          {filledRows.length === 0 ? 'Belum ada penumpang terdaftar untuk driver ini.' : 'Tidak ada penumpang yang cocok dengan filter jam/pencarian.'}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {matchedRows.map((r, idx) => {
                            return (
                              <div key={r.id || idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-xl transition-colors gap-2">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className="w-5 text-center font-mono text-slate-400 font-bold shrink-0 mt-0.5">
                                    {r.no || idx + 1}.
                                  </span>
                                  <div className="min-w-0 space-y-1">
                                    <div className="font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                                      <span className="text-sm text-slate-900">{r.nama || 'Tanpa Nama'}</span>

                                      {/* TANGGAL & JAM UNTUK SETIAP PENUMPANG */}
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                        <Calendar className="w-3 h-3 text-indigo-600" />
                                        <span>{reportItem.tanggal}</span>
                                      </span>

                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                                        <Clock className="w-3 h-3 text-amber-600" />
                                        <span>{r.jam || reportItem.jamMulai || '-'} WIB</span>
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                      {r.hp && <span>📞 {r.hp}</span>}
                                      <span>📍 {r.jemput || '-'} ➔ ↗️ {r.antar || '-'}</span>
                                      {r.keterangan && <span className="text-amber-800 font-medium">({r.keterangan})</span>}
                                    </div>
                                  </div>
                                </div>

                                {r.hp && (
                                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                                    <a
                                      href={getWhatsAppUrl(r.hp)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors flex items-center gap-1 text-[11px] font-bold"
                                      title="Hubungi WhatsApp"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      <span>WA</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNewReport();
            }}
            className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lembar Armada Baru</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddPassenger();
            }}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Penumpang</span>
          </button>
        </div>

      </div>
    </div>
  );
};

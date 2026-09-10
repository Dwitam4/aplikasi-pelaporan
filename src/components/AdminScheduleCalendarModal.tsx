import React, { useState } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Search,
  Filter,
  Trash2
} from 'lucide-react';
import { ReportDocument, UserRole } from '../types';
import { 
  formatIndonesianDate, 
  parseIndonesianDate, 
  getCalendarMonthMatrix, 
  INDONESIAN_MONTHS, 
  INDONESIAN_DAYS_SHORT 
} from '../utils/date';
import { getFilledRows } from '../utils/spreadsheet';
import { detectShiftType, SHIFT_DEFINITIONS } from '../utils/shift';

interface AdminScheduleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportDocument[];
  activeReportId: string;
  onSelectReport: (reportId: string) => void;
  onOpenAddDriverModal: (targetDate: string) => void;
  onOpenAddPassengerModal: (targetDate: string) => void;
  onDeleteReport?: (reportId: string) => void;
}

export const AdminScheduleCalendarModal: React.FC<AdminScheduleCalendarModalProps> = ({
  isOpen,
  onClose,
  reports,
  activeReportId,
  onSelectReport,
  onOpenAddDriverModal,
  onOpenAddPassengerModal,
  onDeleteReport,
}) => {
  const activeReport = reports.find((r) => r.id === activeReportId) || reports[0];
  const initialDateObj = activeReport ? parseIndonesianDate(activeReport.tanggal) : new Date();

  const [viewYear, setViewYear] = useState<number>(() => initialDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => initialDateObj.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => 
    activeReport?.tanggal || formatIndonesianDate(new Date())
  );
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

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

  const handleGoToToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDateStr(formatIndonesianDate(today));
  };

  // Calendar matrix
  const calendarMatrix = getCalendarMonthMatrix(viewYear, viewMonth);

  // Group reports by formatted date string
  const reportsByDateMap = new Map<string, ReportDocument[]>();
  reports.forEach((rep) => {
    if (!rep.tanggal) return;
    const list = reportsByDateMap.get(rep.tanggal) || [];
    list.push(rep);
    reportsByDateMap.set(rep.tanggal, list);
  });

  // Reports on the currently selected date
  const selectedDateReports = reportsByDateMap.get(selectedDateStr) || [];

  // Filter selected date reports by search query if any
  const filteredDateReports = selectedDateReports.filter((rep) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (rep.driver && rep.driver.toLowerCase().includes(q)) ||
      (rep.kendaraan && rep.kendaraan.toLowerCase().includes(q)) ||
      (rep.platNomor && rep.platNomor.toLowerCase().includes(q)) ||
      (rep.namaKereta && rep.namaKereta.toLowerCase().includes(q)) ||
      rep.rows.some((r) => r.nama.toLowerCase().includes(q) || r.hp.includes(q))
    );
  });

  // Total statistics for selected date
  const totalPassengersOnDate = selectedDateReports.reduce(
    (acc, r) => acc + getFilledRows(r.rows).length,
    0
  );
  const totalCompletedOnDate = selectedDateReports.filter((r) => r.statusTugas === 'selesai').length;
  const totalActiveOnDate = selectedDateReports.length - totalCompletedOnDate;

  // Year options for select dropdown
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 9 }, (_, i) => currentYear - 3 + i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Kalender Jadwal Operasional Driver & Armada
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Admin Jadwal
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Pantau penugasan driver, kapasitas mobil, dan ceklis per tanggal operasional
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content: 2-Column Split (Calendar on Left, Date Detail on Right) */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* Left Column: Interactive Month Calendar (7 cols on desktop) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto bg-slate-50/50">
            
            {/* Month & Year Navigation Header */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <select
                    value={viewMonth}
                    onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                    className="text-sm font-bold text-slate-800 bg-white border border-slate-300 px-3 py-1.5 rounded-xl focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                  >
                    {INDONESIAN_MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewYear}
                    onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                    className="text-sm font-bold text-slate-800 bg-white border border-slate-300 px-3 py-1.5 rounded-xl focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                  >
                    {yearOptions.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                  >
                    Hari Ini
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {INDONESIAN_DAYS_SHORT.map((day, i) => (
                  <span
                    key={day}
                    className={`text-[11px] font-bold py-1 ${
                      i === 0 ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Days Matrix Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarMatrix.map((cell, idx) => {
                  const cellDateStr = formatIndonesianDate(cell.date);
                  const isSelected = cellDateStr === selectedDateStr;
                  const dayReports = reportsByDateMap.get(cellDateStr) || [];
                  const hasSchedules = dayReports.length > 0;
                  const isSunday = cell.date.getDay() === 0;

                  // Stats for this day cell
                  const totalPnp = dayReports.reduce((acc, r) => acc + getFilledRows(r.rows).length, 0);
                  const anyFull = dayReports.some((r) => {
                    const filled = getFilledRows(r.rows).length;
                    return filled >= (r.kapasitas || 7);
                  });
                  const allDone = hasSchedules && dayReports.every((r) => r.statusTugas === 'selesai');

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedDateStr(cellDateStr)}
                      className={`min-h-[64px] sm:min-h-[72px] p-1 sm:p-1.5 rounded-2xl flex flex-col justify-between items-start transition-all relative border text-left ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/60 z-10'
                          : cell.isToday
                          ? 'bg-amber-50/80 border-amber-300 text-slate-800 hover:bg-amber-100/80'
                          : cell.isCurrentMonth
                          ? hasSchedules
                            ? 'bg-white border-indigo-200 hover:border-indigo-400 text-slate-900 shadow-xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-slate-100/60 hover:bg-slate-200/60 border-slate-200/50 text-slate-400 opacity-60'
                      }`}
                    >
                      {/* Day Number and Today Marker */}
                      <div className="w-full flex items-center justify-between">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            isSelected
                              ? 'text-white'
                              : cell.isToday
                              ? 'text-amber-700 font-extrabold'
                              : isSunday
                              ? 'text-rose-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {cell.isToday && (
                          <span
                            className={`text-[9px] font-extrabold px-1 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            Kini
                          </span>
                        )}
                      </div>

                      {/* Schedule Badge Indicators on Day Cell */}
                      <div className="w-full mt-1 space-y-0.5">
                        {hasSchedules ? (
                          <>
                            {/* Number of Drivers / Armada */}
                            <div
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center justify-between ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : allDone
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : anyFull
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              }`}
                            >
                              <span className="truncate">{dayReports.length} Driver</span>
                              {anyFull && !isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 ml-0.5" title="Ada mobil penuh" />
                              )}
                            </div>

                            {/* Passenger Count Indicator */}
                            {totalPnp > 0 && (
                              <div
                                className={`text-[9px] font-medium px-1 truncate ${
                                  isSelected ? 'text-indigo-100' : 'text-slate-500'
                                }`}
                              >
                                👥 {totalPnp} pnp
                              </div>
                            )}
                          </>
                        ) : (
                          cell.isCurrentMonth && (
                            <span
                              className={`text-[9px] block ${
                                isSelected ? 'text-indigo-200' : 'text-slate-300'
                              }`}
                            >
                              -
                            </span>
                          )
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Ada Jadwal</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Kapasitas Penuh</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Shift Selesai</span>
                </span>
              </div>
              <span className="text-[11px] text-indigo-700 font-semibold">
                Klik tanggal untuk melihat rincian armada
              </span>
            </div>
          </div>

          {/* Right Column: Selected Date Schedule Detail (5 cols on desktop) */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col h-full bg-white overflow-y-auto">
            
            {/* Header of Selected Date */}
            <div className="pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Rincian Jadwal Tanggal:
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {selectedDateReports.length} Armada Terdaftar
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {selectedDateStr}
              </h4>
              
              {/* Quick Summary Pill for this day */}
              {selectedDateReports.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    👥 Total: <strong>{totalPassengersOnDate} Penumpang</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    🏁 {totalCompletedOnDate} Selesai
                  </span>
                  {totalActiveOnDate > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      ⚡ {totalActiveOnDate} Bertugas
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Search Filter input */}
            {selectedDateReports.length > 2 && (
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Cari driver, mobil, atau penumpang..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            )}

            {/* List of Schedules on Selected Date */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredDateReports.length > 0 ? (
                filteredDateReports.map((rep, idx) => {
                  const filledRows = getFilledRows(rep.rows);
                  const filledCount = filledRows.length;
                  const kapasitas = rep.kapasitas || 7;
                  const isFull = filledCount >= kapasitas;
                  const isDone = rep.statusTugas === 'selesai';
                  const isCurrentActive = rep.id === activeReportId;
                  const jamStr = (rep.jamMulai || rep.jamSelesai)
                    ? `${rep.jamMulai || '05:00'} - ${rep.jamSelesai || '12:00'}`
                    : 'Shift Reguler';

                  return (
                    <div
                      key={rep.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isCurrentActive
                          ? 'border-indigo-500 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Driver & Armada Top Line */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {rep.driver || `Driver #${idx + 1}`}
                              </span>
                              {isDone ? (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Selesai
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  Bertugas
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {rep.kendaraan} {rep.platNomor ? `(${rep.platNomor})` : ''} • {rep.namaKereta || 'BIB/RGA'}
                            </p>
                          </div>
                        </div>

                        {/* Capacity Badge */}
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                              isFull
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : filledCount > 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {filledCount}/{kapasitas} Kursi {isFull ? '(PENUH)' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Shift Time & Details */}
                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md border ${SHIFT_DEFINITIONS[detectShiftType(rep.jamMulai, rep.jamSelesai, rep.catatanHeader)].badgeClass}`}>
                            {SHIFT_DEFINITIONS[detectShiftType(rep.jamMulai, rep.jamSelesai, rep.catatanHeader)].shortName}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{jamStr}</span>
                          </span>
                        </div>
                        {rep.catatanHeader && (
                          <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            {rep.catatanHeader}
                          </span>
                        )}
                      </div>

                      {/* Passenger snippet names if any */}
                      {filledRows.length > 0 && (
                        <div className="mt-2 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700">Penumpang ({filledRows.length}): </span>
                          <span className="text-slate-500">
                            {filledRows.slice(0, 3).map((p) => p.nama).filter(Boolean).join(', ')}
                            {filledRows.length > 3 ? ` +${filledRows.length - 3} lainnya` : ''}
                          </span>
                        </div>
                      )}

                      {/* Action to switch to this report */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectReport(rep.id);
                              onClose();
                            }}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all ${
                              isCurrentActive
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:border-indigo-300'
                            }`}
                          >
                            <span>{isCurrentActive ? 'Sedang Dibuka' : 'Buka Lembar Tugas Ini'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          {onDeleteReport && (
                            <button
                              type="button"
                              onClick={() => {
                                const pnpCount = getFilledRows(rep.rows).length;
                                const msg = pnpCount > 0
                                  ? `Hapus penugasan ${rep.driver || 'Driver'} (${rep.kendaraan}) beserta ${pnpCount} penumpang di dalamnya?`
                                  : `Hapus penugasan ${rep.driver || 'Driver'} (${rep.kendaraan})?`;
                                if (window.confirm(msg)) {
                                  onDeleteReport(rep.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Penugasan Driver Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {!isFull && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectReport(rep.id);
                              onClose();
                              onOpenAddPassengerModal(selectedDateStr);
                            }}
                            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ Penumpang</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Empty state for selected date */
                <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3 my-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">
                      Belum Ada Jadwal Driver
                    </h5>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Tidak ada armada yang ditugaskan untuk tanggal <strong>{selectedDateStr}</strong>. Tambahkan jadwal driver baru untuk mulai menerima penumpang.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddDriverModal(selectedDateStr);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tugaskan Driver di Tanggal Ini</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action Footer on Right Column */}
            <div className="pt-3 mt-3 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddDriverModal(selectedDateStr);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Driver</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddPassengerModal(selectedDateStr);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Users className="w-4 h-4" />
                <span>+ Tambah Penumpang</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Kalender Operasional Khusus Admin • Multi-Tanggal & Multi-Driver</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

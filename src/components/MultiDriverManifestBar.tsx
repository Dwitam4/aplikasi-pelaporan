import React, { useState } from 'react';
import { 
  Car, 
  User, 
  Plus, 
  Users, 
  Download, 
  Calendar, 
  Train, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarDays,
  Clock,
  CheckCircle2,
  RotateCcw,
  Check,
  PlaneTakeoff,
  PlaneLanding
} from 'lucide-react';
import { ReportDocument, UserRole } from '../types';
import { getFilledRows, exportMultiDriverExcel } from '../utils/spreadsheet';
import { detectShiftType, SHIFT_DEFINITIONS } from '../utils/shift';
import confetti from 'canvas-confetti';

interface MultiDriverManifestBarProps {
  reports: ReportDocument[];
  activeReportId: string;
  onSelectReport: (id: string) => void;
  onOpenAddDriverModal: () => void;
  onOpenEditDriverModal: (report: ReportDocument) => void;
  onOpenDeleteDriverModal?: (report: ReportDocument) => void;
  onDeleteReport?: (id: string) => void;
  onOpenShareModal: () => void;
  onToggleTaskStatus?: (reportId: string) => void;
  onOpenScheduleCalendar?: () => void;
  role: UserRole;
  currentReport: ReportDocument;
}

export const MultiDriverManifestBar: React.FC<MultiDriverManifestBarProps> = ({
  reports,
  activeReportId,
  onSelectReport,
  onOpenAddDriverModal,
  onOpenEditDriverModal,
  onOpenDeleteDriverModal,
  onDeleteReport,
  onOpenShareModal,
  onToggleTaskStatus,
  onOpenScheduleCalendar,
  role,
  currentReport,
}) => {
  // Current active operational date
  const selectedDate = currentReport.tanggal || 'Hari Ini';

  // Get all unique operational dates available across all reports (sorted)
  const allUniqueDates: string[] = Array.from(
    new Set(reports.map((r) => r.tanggal).filter(Boolean))
  );

  // Filter reports that belong specifically to the currently selected date
  const dateReports = reports.filter((r) => r.tanggal === selectedDate);
  const displayReports = dateReports.length > 0 ? dateReports : [currentReport];

  // Calculate totals for this date
  const totalPassengersOnDate = displayReports.reduce((acc, rep) => {
    return acc + getFilledRows(rep.rows).length;
  }, 0);

  const totalKeberangkatanOnDate = displayReports.reduce((acc, rep) => {
    return acc + getFilledRows(rep.rows).filter((r) => (r.tripType || 'keberangkatan') === 'keberangkatan').length;
  }, 0);

  const totalKedatanganOnDate = displayReports.reduce((acc, rep) => {
    return acc + getFilledRows(rep.rows).filter((r) => r.tripType === 'kedatangan').length;
  }, 0);

  const completedCount = displayReports.filter((r) => r.statusTugas === 'selesai').length;
  const activeCount = displayReports.length - completedCount;

  const handleExportDateExcel = () => {
    const filename = exportMultiDriverExcel(displayReports);
    if (filename) {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
    }
  };

  // Switch to another date by selecting the first report with that date
  const handleSwitchDate = (targetDate: string) => {
    const targetReport = reports.find((r) => r.tanggal === targetDate);
    if (targetReport) {
      onSelectReport(targetReport.id);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-4 mb-6">
      
      {/* 1. Date Header & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        
        {/* Left: Date Information & Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tanggal Operasional:
              </span>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {selectedDate}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                {totalPassengersOnDate} Penumpang
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                <PlaneTakeoff className="w-3 h-3 text-sky-600" />
                <span>{totalKeberangkatanOnDate} Berangkat</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                <PlaneLanding className="w-3 h-3 text-indigo-600" />
                <span>{totalKedatanganOnDate} Datang</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                {displayReports.length} Armada ({activeCount} Aktif • {completedCount} Selesai)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola penumpang terpisah antara Keberangkatan & Kedatangan per tanggal operasional.
            </p>
          </div>
        </div>

        {/* Right: Actions for Admin (Calendar, Add Driver, Export Excel) */}
        {role === 'admin' && (
          <div className="flex flex-wrap items-center gap-2">
            {onOpenScheduleCalendar && (
              <button
                type="button"
                onClick={onOpenScheduleCalendar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors shadow-xs"
                title="Buka Kalender Jadwal Operasional untuk cek dan kelola seluruh tanggal"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>📅 Kalender Jadwal</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportDateExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-200 transition-colors shadow-xs"
              title="Unduh 1 file Excel berisi seluruh driver & armada pada tanggal ini"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rekap Excel ({displayReports.length} Armada)</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddDriverModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs transition-all shadow-sm shrink-0"
              title="Tambah armada dan driver baru untuk shift berikutnya"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Driver Bertugas</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Multiple Dates Filter Chips (if more than 1 date exists) */}
      {allUniqueDates.length > 1 && (
        <div className="flex items-center gap-1.5 pt-2.5 pb-1 overflow-x-auto scrollbar-thin text-xs">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" /> Pilih Tanggal:
          </span>
          {allUniqueDates.map((dateStr) => {
            const isCurrentDate = dateStr === selectedDate;
            const reportsOnDate = reports.filter((r) => r.tanggal === dateStr);
            const pnpCount = reportsOnDate.reduce((acc, r) => acc + getFilledRows(r.rows).length, 0);
            const kebCount = reportsOnDate.reduce(
              (acc, r) => acc + getFilledRows(r.rows).filter((row) => (row.tripType || 'keberangkatan') === 'keberangkatan').length,
              0
            );
            const kedCount = reportsOnDate.reduce(
              (acc, r) => acc + getFilledRows(r.rows).filter((row) => row.tripType === 'kedatangan').length,
              0
            );

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleSwitchDate(dateStr)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 ${
                  isCurrentDate
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{dateStr}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isCurrentDate ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {pnpCount} pnp (🛫{kebCount} • 🛬{kedCount})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Driver & Fleet Manifest Tabs Grid / Carousel */}
      <div className="flex items-center gap-2 pt-3 overflow-x-auto pb-1 scrollbar-thin">
        {displayReports.map((rep, idx) => {
          const isActive = rep.id === activeReportId;
          const filledRows = getFilledRows(rep.rows);
          const filledCount = filledRows.length;
          const kebCount = filledRows.filter((r) => (r.tripType || 'keberangkatan') === 'keberangkatan').length;
          const kedCount = filledRows.filter((r) => r.tripType === 'kedatangan').length;
          const kapasitas = rep.kapasitas || 7;
          const isFull = filledCount >= kapasitas;
          const isDone = rep.statusTugas === 'selesai';
          const armadaName = rep.kendaraan || `Armada #${idx + 1}`;
          const driverName = rep.driver || `Driver #${idx + 1}`;
          const routeName = rep.namaKereta || 'BIB/RGA';
          const jamStr = (rep.jamMulai || rep.jamSelesai) 
            ? `${rep.jamMulai || '05:00'}-${rep.jamSelesai || '12:00'}` 
            : '05:00-12:00';

          return (
            <div
              key={rep.id}
              className={`flex items-center rounded-xl border transition-all shrink-0 ${
                isActive
                  ? isDone
                    ? 'bg-emerald-800 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40'
                    : 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300/40'
                  : isDone
                  ? 'bg-emerald-50/70 hover:bg-emerald-100/70 text-slate-800 border-emerald-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {/* Tab Button (Select Driver) */}
              <button
                type="button"
                onClick={() => onSelectReport(rep.id)}
                className="flex items-center gap-2.5 px-3 py-2 text-left"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : isDone 
                      ? 'bg-emerald-200 text-emerald-800' 
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm">{armadaName}</span>
                    {rep.platNomor && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                        isActive 
                          ? 'bg-black/30 text-amber-300' 
                          : 'bg-slate-200 text-slate-800'
                      }`}>
                        {rep.platNomor}
                      </span>
                    )}
                    
                    {/* Shift Time / Done Badge */}
                    {isDone ? (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase flex items-center gap-0.5 ${
                        isActive ? 'bg-emerald-950 text-emerald-200' : 'bg-emerald-600 text-white'
                      }`}>
                        <CheckCircle2 className="w-2.5 h-2.5" /> Selesai
                      </span>
                    ) : (
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-1 ${
                        isActive 
                          ? 'bg-indigo-900/90 text-indigo-100' 
                          : `${SHIFT_DEFINITIONS[detectShiftType(rep.jamMulai, rep.jamSelesai, rep.catatanHeader)].badgeClass}`
                      }`}>
                        <span>{SHIFT_DEFINITIONS[detectShiftType(rep.jamMulai, rep.jamSelesai, rep.catatanHeader)].shortName}</span>
                        <span className="font-mono text-[8.5px] opacity-90">{jamStr}</span>
                      </span>
                    )}
                  </div>
                  
                  <div
                    className={`text-[11px] flex items-center gap-1 mt-0.5 ${
                      isActive ? 'text-indigo-100' : 'text-slate-500'
                    }`}
                  >
                    <User className="w-3 h-3 opacity-80" />
                    <span className="font-semibold truncate max-w-[90px]">
                      {driverName}
                    </span>
                    <span>•</span>
                    <span
                      className={`font-bold ${
                        isFull
                          ? isActive
                            ? 'text-rose-200 font-extrabold'
                            : 'text-rose-600 font-extrabold'
                          : isActive
                          ? 'text-amber-200'
                          : 'text-emerald-600'
                      }`}
                    >
                      {filledCount}/{kapasitas} {isFull ? 'FULL' : 'pnp'}
                    </span>
                    <span className={`text-[10px] ml-0.5 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      (🛫{kebCount} 🛬{kedCount})
                    </span>
                  </div>
                </div>
              </button>

              {/* Action Buttons for Admin (Toggle Selesai, Edit) */}
              <div className={`flex items-center pr-2 pl-1 border-l ${
                isActive ? 'border-white/20' : 'border-slate-200'
              }`}>
                {onToggleTaskStatus && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTaskStatus(rep.id);
                    }}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? isDone 
                          ? 'text-emerald-200 hover:bg-white/20' 
                          : 'text-amber-200 hover:bg-white/20'
                        : isDone
                        ? 'text-emerald-700 hover:bg-emerald-200'
                        : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-200'
                    }`}
                    title={isDone ? 'Tugas Selesai (Klik untuk ubah jadi aktif)' : 'Sedang Bertugas (Klik jika shift sudah selesai)'}
                  >
                    {isDone ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Clock className="w-3.5 h-3.5" />}
                  </button>
                )}

                {role === 'admin' && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditDriverModal(rep);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'text-white/80 hover:text-white hover:bg-white/20' 
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'
                      }`}
                      title="Edit info pengemudi, armada, jam, atau tanggal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteReport && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const pnpCount = getFilledRows(rep.rows).length;
                          const msg = pnpCount > 0
                            ? `Hapus lembar tugas ${rep.driver || 'Driver'} (${rep.kendaraan}) beserta ${pnpCount} penumpang di dalamnya?`
                            : `Hapus lembar tugas ${rep.driver || 'Driver'} (${rep.kendaraan})?`;
                          if (window.confirm(msg)) {
                            onDeleteReport(rep.id);
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'text-rose-200 hover:text-white hover:bg-rose-600/50'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title="Hapus penugasan driver & armada ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Shortcut "+ Tambah Driver" button in the tab bar for Admin */}
        {role === 'admin' && (
          <button
            type="button"
            onClick={onOpenAddDriverModal}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/70 text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Driver Baru</span>
          </button>
        )}
      </div>
    </div>
  );
};

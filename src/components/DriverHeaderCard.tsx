import React from 'react';
import { Train, Calendar, Car, User, FileText, Send, ShieldAlert, CheckCircle2, MessageSquare, Clock, Check, RotateCcw } from 'lucide-react';
import { ReportDocument } from '../types';
import { getFilledRows } from '../utils/spreadsheet';

interface DriverHeaderCardProps {
  report: ReportDocument;
  onSwitchToAdmin: () => void;
  onShareToAdmin: () => void;
  onToggleTaskStatus?: () => void;
}

export const DriverHeaderCard: React.FC<DriverHeaderCardProps> = ({
  report,
  onSwitchToAdmin,
  onShareToAdmin,
  onToggleTaskStatus,
}) => {
  const filledCount = getFilledRows(report.rows).length;
  const isCompleted = report.statusTugas === 'selesai';
  const jamTugas = (report.jamMulai || report.jamSelesai) 
    ? `${report.jamMulai || '05:00'} - ${report.jamSelesai || '12:00'}` 
    : '05:00 - 12:00';

  return (
    <div className={`text-white rounded-2xl p-4 sm:p-6 shadow-md border mb-6 transition-all ${
      isCompleted
        ? 'bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border-emerald-700/80'
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border-slate-700'
    }`}>
      {/* Top Badge & Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700/80 mb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>TUGAS SELESAI (DRIVER & MOBIL TERSEDIA)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>MODE DRIVER: SEDANG BERTUGAS</span>
            </span>
          )}

          <span className="text-xs text-slate-400 hidden md:inline">
            {isCompleted
              ? `Shift telah diselesaikan${report.waktuSelesaiActual ? ` pada pukul ${report.waktuSelesaiActual} WIB` : ''}. Driver & kendaraan siap untuk penugasan berikutnya.`
              : 'Tugas Driver: Ceklis kehadiran penumpang & tekan "Selesai Tugas" jika shift rampung.'}
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {onToggleTaskStatus && (
            <button
              type="button"
              onClick={onToggleTaskStatus}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
                isCompleted
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold'
              }`}
              title={isCompleted ? 'Buka kembali status tugas menjadi aktif bertugas' : 'Tandai shift ini telah selesai'}
            >
              {isCompleted ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Buka Kembali Tugas</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>🏁 Selesai Tugas Shift Ini</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onShareToAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim ke WA Admin</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-600 transition-colors"
            title="Beralih ke mode Admin"
          >
            Mode Admin
          </button>
        </div>
      </div>

      {/* Task Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Kereta / Rute */}
        <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
          <div className="text-[11px] text-indigo-300 font-semibold flex items-center gap-1 mb-1">
            <Train className="w-3.5 h-3.5" />
            KERETA / RUTE
          </div>
          <div className="text-sm sm:text-base font-bold text-white font-mono tracking-wide">
            {report.namaKereta || 'BIB/RGA'}
          </div>
        </div>

        {/* Tanggal & Jam Tugas */}
        <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
          <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5" />
            JAM OPERASIONAL
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate font-mono">
            {jamTugas} WIB
          </div>
          <div className="text-[10px] text-slate-300 truncate mt-0.5">
            {report.tanggal || 'Hari Ini'}
          </div>
        </div>

        {/* Armada Kendaraan */}
        <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
          <div className="text-[11px] text-blue-300 font-semibold flex items-center gap-1 mb-1">
            <Car className="w-3.5 h-3.5" />
            ARMADA & PLAT
          </div>
          <div className="text-sm sm:text-base font-bold text-white uppercase font-mono flex items-center gap-1.5 flex-wrap">
            <span>{report.kendaraan || 'Luxio'}</span>
            {report.platNomor && (
              <span className="text-xs bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                {report.platNomor}
              </span>
            )}
          </div>
        </div>

        {/* Driver & Status */}
        <div className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
          <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1 mb-1">
            <User className="w-3.5 h-3.5" />
            STATUS OPERASIONAL
          </div>
          <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
            {isCompleted ? (
              <span className="text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tersedia (Selesai)</span>
              </span>
            ) : (
              <span className="text-amber-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>Aktif Bertugas</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">
            {filledCount} Penumpang Terdaftar
          </div>
        </div>
      </div>

      {/* Driver Note & Instructions */}
      <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">Driver:</span>
          <span className="text-white font-bold">{report.driver || 'Driver Lapangan'}</span>
          {report.driverHp && (
            <span className="text-emerald-300 font-mono">({report.driverHp})</span>
          )}
          {report.catatanHeader && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 italic">"{report.catatanHeader}"</span>
            </>
          )}
        </div>
        <div className="text-[11px] font-medium text-amber-300/90 flex items-center gap-1.5">
          {isCompleted ? (
            <span className="text-emerald-300 font-bold">
              ✅ Tugas selesai. Status driver & armada otomatis TERSEDIA untuk penugasan berikutnya.
            </span>
          ) : (
            <span>
              💡 Ceklis kehadiran penumpang. Setelah semua selesai diantar/dijemput, klik tombol <strong>"🏁 Selesai Tugas Shift Ini"</strong> di atas.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

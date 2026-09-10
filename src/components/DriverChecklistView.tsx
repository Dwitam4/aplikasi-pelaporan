import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MessageCircle, 
  Phone, 
  Search, 
  Send, 
  Car, 
  User, 
  Train, 
  Calendar, 
  Check, 
  XCircle, 
  FileText,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  RotateCcw,
  Flag,
  Lock,
  Ban
} from 'lucide-react';
import { ReportDocument, ReportRow, KehadiranStatus } from '../types';
import { getWhatsAppUrl, getFilledRows, normalizeKehadiran, getKehadiranLabel } from '../utils/spreadsheet';
import confetti from 'canvas-confetti';

interface DriverChecklistViewProps {
  report: ReportDocument;
  onChangeRows: (newRows: ReportRow[]) => void;
  onShareToAdmin: () => void;
  onSwitchToAdmin: () => void;
  onToggleTaskStatus?: () => void;
}

const QUICK_REASONS = [
  'Batal Berangkat',
  'HP Tidak Aktif / Mati',
  'Ganti Jadwal Kereta',
  'Titik Jemput Berubah',
  'Salah Armada / Tertinggal',
  'Sudah Naik Armada Lain',
  'Tiba Tepat Waktu',
];

export const DriverChecklistView: React.FC<DriverChecklistViewProps> = ({
  report,
  onChangeRows,
  onShareToAdmin,
  onSwitchToAdmin,
  onToggleTaskStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'datang' | 'belum' | 'batal'>('all');

  const isCompleted = report.statusTugas === 'selesai';
  const jamTugas = (report.jamMulai || report.jamSelesai) 
    ? `${report.jamMulai || '05:00'} - ${report.jamSelesai || '12:00'}` 
    : '05:00 - 12:00';

  // Filter only rows that have passenger names or data filled
  const allRows = report.rows;
  const filledRows = allRows.filter((r) => r.nama.trim() || r.hp.trim() || (r.jam && r.jam.trim()) || r.antar.trim() || r.jemput.trim() || r.keterangan.trim());

  const handleSetKehadiran = (rowId: string, newStatus: KehadiranStatus) => {
    if (isCompleted) return; // Strict lock
    const updated = allRows.map((r) => {
      if (r.id === rowId) {
        return {
          ...r,
          kehadiran: newStatus,
          status: newStatus === 'datang' ? ('selesai' as const) : newStatus === 'batal' ? ('batal' as const) : ('proses' as const),
        };
      }
      return r;
    });
    onChangeRows(updated);

    if (newStatus === 'datang') {
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.85 } });
    }
  };

  const handleUpdateKeterangan = (rowId: string, text: string) => {
    if (isCompleted) return; // Strict lock
    const updated = allRows.map((r) => {
      if (r.id === rowId) {
        return { ...r, keterangan: text };
      }
      return r;
    });
    onChangeRows(updated);
  };

  const handleQuickReason = (rowId: string, reason: string) => {
    if (isCompleted) return; // Strict lock
    const current = allRows.find((r) => r.id === rowId)?.keterangan || '';
    const newText = current ? `${current}, ${reason}` : reason;
    handleUpdateKeterangan(rowId, newText);
  };

  // Counts
  const totalCount = filledRows.length;
  const datangCount = filledRows.filter((r) => normalizeKehadiran(r.kehadiran) === 'datang').length;
  const belumCount = filledRows.filter((r) => normalizeKehadiran(r.kehadiran) === 'belum_datang').length;
  const batalCount = filledRows.filter((r) => normalizeKehadiran(r.kehadiran) === 'batal').length;
  const progressPercent = totalCount > 0 ? Math.round((datangCount / totalCount) * 100) : 0;

  // Filtered rows for display
  const displayedRows = filledRows.filter((r) => {
    const status = normalizeKehadiran(r.kehadiran);
    if (filterTab === 'datang' && status !== 'datang') return false;
    if (filterTab === 'belum' && status !== 'belum_datang') return false;
    if (filterTab === 'batal' && status !== 'batal') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (r.jam && r.jam.toLowerCase().includes(q)) ||
        r.nama.toLowerCase().includes(q) ||
        r.hp.toLowerCase().includes(q) ||
        r.antar.toLowerCase().includes(q) ||
        r.jemput.toLowerCase().includes(q) ||
        r.keterangan.toLowerCase().includes(q) ||
        String(r.no).includes(q)
      );
    }
    return true;
  });

  // Direct WhatsApp report to Admin with checklist status
  const handleSendChecklistToWA = () => {
    let msg = `*📋 UPDATE LAPORAN CHECKLIST DRIVER*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🚗 *Armada:* ${report.kendaraan || '-'}${report.platNomor ? ` [${report.platNomor}]` : ''}\n`;
    msg += `👤 *Driver:* ${report.driver || '-'}${report.driverHp ? ` (${report.driverHp})` : ''}\n`;
    msg += `📅 *Tanggal:* ${report.tanggal || '-'}\n`;
    msg += `🕒 *Jam Tugas:* ${jamTugas} WIB\n`;
    msg += `🚦 *Status Tugas:* ${isCompleted ? '✅ SELESAI (DRIVER & MOBIL TERSEDIA)' : '🟢 SEDANG BERTUGAS'}\n`;
    msg += `🚆 *Kereta/Rute:* ${report.namaKereta || '-'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `📊 *RINGKASAN KEHADIRAN:*\n`;
    msg += `🟢 *Datang / Hadir:* ${datangCount} orang\n`;
    msg += `🟡 *Belum Datang:* ${belumCount} orang\n`;
    msg += `🔴 *Batal:* ${batalCount} orang\n`;
    msg += `👥 *Total Terdaftar:* ${totalCount} orang (${progressPercent}% Selesai)\n\n`;

    msg += `*RINCIAN PENUMPANG:*\n`;

    if (filledRows.length === 0) {
      msg += `_(Belum ada daftar penumpang)_\n`;
    } else {
      filledRows.forEach((r, idx) => {
        const norm = normalizeKehadiran(r.kehadiran);
        const icon = norm === 'datang' ? '🟢 [DATANG]' : norm === 'batal' ? '🔴 [BATAL]' : '🟡 [BELUM DATANG]';
        const jamStr = r.jam ? ` (🕒 ${r.jam})` : '';
        msg += `\n${r.no || idx + 1}. *${r.nama || 'Tanpa Nama'}*${jamStr} ${icon}\n`;
        if (r.hp) msg += `   📞 HP: ${r.hp}\n`;
        if (r.jemput) msg += `   📍 Jemput: ${r.jemput}\n`;
        if (r.antar) msg += `   ↗️ Antar: ${r.antar}\n`;
        if (r.keterangan) msg += `   💬 *Ket: ${r.keterangan}*\n`;
      });
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `_Laporan dikirim otomatis dari Sistem Checklist Driver_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-4 mb-8">
      
      {/* 1. Shift & Completion Banner for Driver */}
      <div className={`rounded-2xl p-4 sm:p-5 border shadow-sm transition-all ${
        isCompleted
          ? 'bg-slate-900 border-slate-800 text-white'
          : 'bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 border-amber-300 text-amber-950'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isCompleted ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-amber-500 text-white'
            }`}>
              {isCompleted ? <Lock className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-extrabold text-sm sm:text-base">
                  {isCompleted ? '🔒 Tugas Selesai - Data Checklist Terkunci' : 'Shift Operasional Sedang Berjalan'}
                </h4>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  isCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-200 text-amber-900'
                }`}>
                  🕒 {jamTugas} WIB
                </span>
                {isCompleted && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-slate-950">
                    Driver & Mobil Tersedia
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {isCompleted ? (
                  <span>
                    Tugas ini telah diselesaikan oleh driver <strong>{report.driver}</strong>. Sesuai ketentuan, data checklist telah <strong>dikunci secara otomatis</strong> dan tidak dapat diubah kembali. Driver dan armada <strong>{report.kendaraan} ({report.platNomor || '-'})</strong> kini berstatus <strong>TERSEDIA</strong> untuk penugasan berikutnya.
                  </span>
                ) : (
                  <span>
                    Driver bertugas: <strong>{report.driver}</strong> • Armada: <strong>{report.kendaraan} {report.platNomor ? `[${report.platNomor}]` : ''}</strong>. Ceklis status kehadiran (Datang / Belum Datang / Batal), lalu klik tombol <strong>"🏁 Selesai Tugas Shift Ini"</strong> bila semua selesai.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Selesai Button (Disabled and locked if already completed) */}
          {onToggleTaskStatus && (
            <div className="shrink-0 w-full sm:w-auto">
              {!isCompleted ? (
                <button
                  type="button"
                  onClick={onToggleTaskStatus}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse"
                >
                  <Check className="w-4 h-4" />
                  <span>🏁 Selesai Tugas Shift Ini</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Terkunci Permanen</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Live Progress & Status Counters Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                Checklist Kehadiran Penumpang
              </h3>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 border border-slate-200">
                {report.kendaraan} • {report.driver || 'Driver'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync PC & HP</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tanggal: <strong>{report.tanggal}</strong> • Rute: <strong>{report.namaKereta || 'BIB/RGA'}</strong> • Jam: <strong>{jamTugas}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={handleSendChecklistToWA}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Update ke WA Admin</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600">Progres Kehadiran:</span>
            <span className="text-emerald-700">{datangCount} Datang • {belumCount} Belum • {batalCount} Batal ({progressPercent}% Selesai)</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (datangCount / totalCount) * 100 : 0}%` }}
              title="Datang"
            />
            <div 
              className="h-full bg-red-400 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (batalCount / totalCount) * 100 : 0}%` }}
              title="Batal"
            />
          </div>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('datang')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              filterTab === 'datang'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Datang ({datangCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('belum')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              filterTab === 'belum'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Belum Datang ({belumCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('batal')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              filterTab === 'batal'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Batal ({batalCount})</span>
          </button>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] ml-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari jam, nama penumpang, lokasi, HP..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. Passenger Cards List */}
      {displayedRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6" />
          </div>
          {totalCount === 0 ? (
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">
                Daftar Penumpang Kosong
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tugas baru pada armada ini belum memiliki data penumpang. Penumpang dapat ditambahkan melalui mode Admin.
              </p>
            </div>
          ) : (
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">
                Tidak ada penumpang yang sesuai filter
              </h4>
              <button
                type="button"
                onClick={() => {
                  setFilterTab('all');
                  setSearchQuery('');
                }}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Tampilkan Semua Penumpang
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayedRows.map((row, idx) => {
            const normStatus = normalizeKehadiran(row.kehadiran);
            const isDatang = normStatus === 'datang';
            const isBatal = normStatus === 'batal';
            const isBelum = normStatus === 'belum_datang';

            return (
              <div
                key={row.id || idx}
                className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  isDatang
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                    : isBatal
                    ? 'bg-red-50/40 border-red-300 shadow-xs'
                    : 'bg-white border-slate-200 shadow-sm hover:border-amber-300'
                }`}
              >
                {/* Card Top / Header */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Passenger No & Name */}
                    <div className="flex items-start gap-2.5">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 ${
                        isDatang ? 'bg-emerald-600 text-white' : isBatal ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {row.no || idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900">
                            {row.nama || 'Tanpa Nama'}
                          </h4>

                          {/* Jam Badge */}
                          {row.jam && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>{row.jam}</span>
                            </span>
                          )}

                          {isDatang && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Datang
                            </span>
                          )}
                          {isBatal && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              <Ban className="w-3 h-3 text-red-600" />
                              Batal
                            </span>
                          )}
                        </div>
                        
                        {/* Phone with WhatsApp and Call button */}
                        {row.hp ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-slate-600 font-medium">
                              📞 {row.hp}
                            </span>
                            <a
                              href={getWhatsAppUrl(row.hp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-semibold transition-colors"
                              title="Chat WhatsApp Penumpang"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WA</span>
                            </a>
                            <a
                              href={`tel:${row.hp}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                              title="Telepon Langsung"
                            >
                              <Phone className="w-3 h-3 text-slate-600" />
                              <span>Telp</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic mt-0.5 block">
                            (Nomor HP belum diisi)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Status Icon Tag */}
                    <div className="shrink-0">
                      {isDatang ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : isBatal ? (
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                          <XCircle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Info (Jemput -> Antar) */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-500" /> Titik Jemput:
                      </div>
                      <div className="font-semibold text-slate-800 mt-0.5 truncate">
                        {row.jemput || '-'}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-emerald-500" /> Tujuan Antar:
                      </div>
                      <div className="font-semibold text-slate-800 mt-0.5 truncate">
                        {row.antar || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom / 3-State Status Buttons & Keterangan */}
                <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 space-y-2.5">
                  
                  {/* 3-Way Attendance Buttons */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Status Kehadiran:
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {/* 1. Datang */}
                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => handleSetKehadiran(row.id, 'datang')}
                        className={`py-2 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                          isDatang
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                            : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Datang</span>
                      </button>

                      {/* 2. Belum Datang */}
                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => handleSetKehadiran(row.id, 'belum_datang')}
                        className={`py-2 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                          isBelum
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                            : 'bg-white hover:bg-amber-50 text-slate-700 border border-slate-200'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Belum</span>
                      </button>

                      {/* 3. Batal */}
                      <button
                        type="button"
                        disabled={isCompleted}
                        onClick={() => handleSetKehadiran(row.id, 'batal')}
                        className={`py-2 px-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                          isBatal
                            ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300'
                            : 'bg-white hover:bg-red-50 text-slate-700 border border-slate-200'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Batal</span>
                      </button>
                    </div>
                  </div>

                  {/* Keterangan / Alasan Driver */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>Keterangan / Alasan:</span>
                      </label>
                      {isBatal && !row.keterangan && (
                        <span className="text-[10px] text-red-600 font-semibold animate-pulse">
                          *Wajib isi alasan batal
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      disabled={isCompleted}
                      value={row.keterangan || ''}
                      onChange={(e) => handleUpdateKeterangan(row.id, e.target.value)}
                      placeholder={isBatal ? 'Tuliskan alasan pembatalan...' : isBelum ? 'Contoh: HP tidak aktif, menunggu di stasiun...' : 'Catatan / keterangan (opsional)...'}
                      className={`w-full px-3 py-1.5 text-xs rounded-xl border transition-all ${
                        isBatal && !row.keterangan
                          ? 'bg-red-50/60 border-red-300 focus:bg-white focus:ring-2 focus:ring-red-500'
                          : isBelum && !row.keterangan
                          ? 'bg-amber-50/50 border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-500'
                          : 'bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500'
                      } disabled:opacity-60 disabled:bg-slate-100`}
                    />

                    {/* Quick reason chips */}
                    {!isCompleted && (!isDatang || isBatal) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {QUICK_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => handleQuickReason(row.id, reason)}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                          >
                            + {reason}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Bottom Sticky Summary Bar for Driver */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">
              Status Shift ({jamTugas} WIB): {datangCount} Hadir • {belumCount} Belum • {batalCount} Batal
            </div>
            <p className="text-xs text-slate-400">
              {isCompleted 
                ? '✅ Shift selesai dan terkunci. Driver & mobil telah berstatus TERSEDIA.' 
                : 'Pastikan seluruh penumpang terkonfirmasi sebelum armada berangkat.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onToggleTaskStatus && !isCompleted && (
            <button
              type="button"
              onClick={onToggleTaskStatus}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Selesai Tugas</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSendChecklistToWA}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Kirim WA Admin</span>
          </button>
        </div>
      </div>

    </div>
  );
};

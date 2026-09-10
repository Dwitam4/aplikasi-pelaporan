import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  MessageSquare, 
  Smartphone, 
  Copy, 
  Check, 
  Send, 
  ExternalLink, 
  FileSpreadsheet,
  QrCode,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ReportDocument } from '../types';
import { getFilledRows, exportToExcel } from '../utils/spreadsheet';
import { generateDriverShareUrl } from '../utils/shareLink';

interface ShareDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportDocument;
}

export const ShareDriverModal: React.FC<ShareDriverModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [driverPhone, setDriverPhone] = useState(report.driverHp || '');

  React.useEffect(() => {
    if (isOpen && report.driverHp) {
      setDriverPhone(report.driverHp);
    }
  }, [isOpen, report.driverHp]);

  if (!isOpen) return null;

  const appDriverUrl = generateDriverShareUrl(report);
  const filledRows = getFilledRows(report.rows);

  // Generate WhatsApp formatted text message of the passenger log
  const generateWhatsAppMessage = () => {
    let msg = `*📋 LAPORAN OPERASIONAL & ANTAR JEMPUT*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🚆 *Kereta/Moda:* ${report.namaKereta || '-'}\n`;
    msg += `📅 *Tanggal:* ${report.tanggal || '-'}\n`;
    msg += `🚗 *Armada:* ${report.kendaraan || '-'}${report.platNomor ? ` [${report.platNomor}]` : ''}\n`;
    if (report.driver) msg += `👤 *Driver:* ${report.driver}${report.driverHp ? ` (${report.driverHp})` : ''}\n`;
    if (report.catatanHeader) msg += `📝 *Catatan:* ${report.catatanHeader}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `*DAFTAR PENUMPANG (${filledRows.length} Orang):*\n`;

    if (filledRows.length === 0) {
      msg += `_(Belum ada data penumpang terisi)_\n`;
    } else {
      filledRows.forEach((r, idx) => {
        const jamStr = r.jam ? ` [${r.jam}]` : '';
        const tripStr = r.tripType === 'kedatangan' ? ' (Kedatangan)' : ' (Keberangkatan)';
        msg += `\n*${r.no || idx + 1}. ${r.nama || 'Tanpa Nama'}*${jamStr}${tripStr}\n`;
        if (r.hp) msg += `   📞 HP: ${r.hp}\n`;
        if (r.jemput) msg += `   📍 Jemput: ${r.jemput}\n`;
        if (r.antar) msg += `   ↗️ Antar: ${r.antar}\n`;
        if (r.keterangan) msg += `   💬 Ket: ${r.keterangan}\n`;
      });
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🔗 *Link Tugas Driver:* ${appDriverUrl}\n`;
    return msg;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appDriverUrl);
      setCopiedLink(true);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyWhatsAppText = async () => {
    try {
      const msg = generateWhatsAppMessage();
      await navigator.clipboard.writeText(msg);
      setCopiedText(true);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      setTimeout(() => setCopiedText(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendToWhatsApp = () => {
    const msg = encodeURIComponent(generateWhatsAppMessage());
    let cleanPhone = driverPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${msg}` 
      : `https://api.whatsapp.com/send?text=${msg}`;

    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Bagikan ke Driver / Tim Lapangan</h3>
              <p className="text-xs text-slate-400">
                Kirim link aplikasi atau rangkuman data penumpang langsung ke WhatsApp driver
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* Method 1: Kirim Rangkuman ke WhatsApp */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>1. Kirim Daftar Penumpang ke WhatsApp Driver</span>
            </div>
            <p className="text-xs text-slate-600">
              Kirim jadwal manifest hari ini ({report.namaKereta || 'BIB/RGA'} - {report.tanggal}) lengkap dengan no HP dan titik jemput ke WA Driver.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Nomor WA Driver (opsional, misal: 081234...)"
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSendToWhatsApp}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Buka di WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleCopyWhatsAppText}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs sm:text-sm rounded-lg transition-colors"
                title="Salin Teks Pesan"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? 'Tersalin' : 'Salin Teks'}</span>
              </button>
            </div>

            {/* Preview Message Box */}
            <div className="mt-2 bg-white p-3 rounded-lg border border-slate-200 text-[11px] sm:text-xs font-mono text-slate-700 whitespace-pre-line max-h-36 overflow-y-auto shadow-inner">
              {generateWhatsAppMessage()}
            </div>
          </div>

          {/* Method 2: Berikan Link Akses Aplikasi ke Driver */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>2. Bagikan Link Aplikasi Web (Bisa dibuka di HP Driver)</span>
            </div>
            <p className="text-xs text-slate-600">
              Driver dapat membuka link ini di browser HP (Chrome / Safari) untuk langsung input data, scan foto formulir, atau melihat nomor penumpang.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appDriverUrl}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-600 font-mono select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 shrink-0 shadow-sm ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link'}</span>
              </button>
            </div>

            {/* Tip for Driver Phone Home Screen */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-950 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                💡 Tips untuk Driver:
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Driver bisa membuka link di Chrome / Safari HP, lalu tap menu <strong>Titik Tiga (⋮)</strong> atau icon <strong>Share</strong> &gt; pilih <strong>"Tambahkan ke Layar Utama (Add to Home Screen)"</strong> agar icon aplikasi muncul di layar HP driver seperti aplikasi bawaan.
              </p>
            </div>
          </div>

          {/* Method 3: Bagikan Dokumen Spreadsheet Excel */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs sm:text-sm text-slate-800">
                  Unduh File Excel (.xlsx) untuk Lampiran WA
                </h4>
                <p className="text-[11px] text-slate-500">
                  Kirim file dokumen Excel langsung ke grup admin atau driver
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => exportToExcel(report)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Unduh Excel</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

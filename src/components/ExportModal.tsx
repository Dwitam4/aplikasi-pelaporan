import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  Copy, 
  Printer, 
  Sparkles,
  ExternalLink,
  Table,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ReportDocument } from '../types';
import { 
  exportToExcel, 
  exportToCSV, 
  copyToGoogleSheetsClipboard, 
  getFilledRows,
  exportMultiDriverExcel
} from '../utils/spreadsheet';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportDocument;
  allReports?: ReportDocument[];
  onOpenPrint: () => void;
  onOpenShareDriver?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  report,
  allReports = [],
  onOpenPrint,
  onOpenShareDriver,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const filledCount = getFilledRows(report.rows).length;
  const sameDayReports = allReports.filter((r) => r.tanggal === report.tanggal);
  const multiReports = sameDayReports.length > 1 ? sameDayReports : allReports;

  const handleExportExcel = () => {
    const filename = exportToExcel(report);
    setDownloadSuccess(`File Excel berhasil diunduh: ${filename}`);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
  };

  const handleExportAllDrivers = () => {
    const filename = exportMultiDriverExcel(multiReports);
    setDownloadSuccess(`File Rekap Multi-Driver berhasil diunduh: ${filename}`);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
  };

  const handleExportCSV = () => {
    const filename = exportToCSV(report);
    setDownloadSuccess(`File CSV berhasil diunduh: ${filename}`);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
  };

  const handleCopyGoogleSheets = async () => {
    const ok = await copyToGoogleSheetsClipboard(report);
    if (ok) {
      setCopied(true);
      setDownloadSuccess('Format Google Sheets berhasil disalin ke Clipboard!');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/50 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Keluaran & Ekspor Spreadsheet</h3>
              <p className="text-xs text-emerald-200">
                Pilih format keluaran spreadsheet untuk laporan Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{downloadSuccess}</span>
            </div>
          )}

          {/* Quick Summary Info */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-800">{report.namaKereta || 'Laporan'}</span>
              <span className="mx-2">•</span>
              <span>{report.tanggal}</span>
            </div>
            <div className="font-semibold text-emerald-700">
              {filledCount} Baris Terisi ({report.rows.length} Baris Lembar)
            </div>
          </div>

          {/* Multi-Driver Consolidated Export Option */}
          {multiReports.length > 1 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs sm:text-sm">
                    Unduh Rekap Semua Driver ({multiReports.length} Armada)
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    File Excel multi-sheet: sheet rekap gabungan + sheet terpisah untuk setiap armada/driver.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportAllDrivers}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-sm flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Rekap Semua Driver</span>
              </button>
            </div>
          )}

          {/* Export Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* 1. Excel XLSX */}
            <div
              onClick={handleExportExcel}
              className="p-4 rounded-xl border-2 border-emerald-200 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-800 transition-colors">
                  Unduh Microsoft Excel (.xlsx)
                </h4>
                <p className="text-xs text-slate-500">
                  File spreadsheet lengkap dengan format header, lebar kolom otomatis, dan ringkasan total.
                </p>
              </div>
              <button
                type="button"
                className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh .XLSX</span>
              </button>
            </div>

            {/* 2. Google Sheets Clipboard Format */}
            <div
              onClick={handleCopyGoogleSheets}
              className="p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Table className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-800 transition-colors">
                  Salin ke Google Sheets
                </h4>
                <p className="text-xs text-slate-500">
                  Salin format tabel (TSV). Buka Google Sheets lalu tekan <strong>Ctrl + V</strong> untuk tempel langsung.
                </p>
              </div>
              <button
                type="button"
                className={`mt-4 w-full py-2 px-3 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin ke Clipboard'}</span>
              </button>
            </div>

            {/* 3. Kirim ke WhatsApp Driver */}
            {onOpenShareDriver && (
              <div
                onClick={() => {
                  onClose();
                  onOpenShareDriver();
                }}
                className="p-3.5 rounded-xl border border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer transition-all flex items-center justify-between group col-span-1 sm:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-xs">Kirim ke WhatsApp Driver</h4>
                    <p className="text-[11px] text-slate-500">Kirim daftar manifest atau bagikan link aplikasi ke driver</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700" />
              </div>
            )}

            {/* 4. CSV File */}
            <div
              onClick={handleExportCSV}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-xs">Unduh Format CSV (.csv)</h4>
                  <p className="text-[11px] text-slate-500">Mendukung UTF-8 untuk semua sistem</p>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </div>

            {/* 4. Print & PDF View */}
            <div
              onClick={() => {
                onClose();
                onOpenPrint();
              }}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-xs">Cetak & Simpan PDF</h4>
                  <p className="text-[11px] text-slate-500">Tampilan formulir fisik siap print</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
            </div>
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

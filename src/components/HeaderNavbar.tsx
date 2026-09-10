import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  FolderOpen, 
  Sparkles, 
  Share2, 
  Settings2, 
  UserPlus, 
  ShieldCheck, 
  Smartphone, 
  Database, 
  Calendar,
  Menu,
  X,
  Send,
  HelpCircle
} from 'lucide-react';
import { UserRole } from '../types';

interface HeaderNavbarProps {
  role: UserRole;
  onChangeRole: (newRole: UserRole) => void;
  onOpenMasterPresets: () => void;
  onOpenAiScan: () => void;
  onOpenExport: () => void;
  onOpenPrint: () => void;
  onOpenShareDriver: () => void;
  onNewReport: () => void;
  onOpenHistory: () => void;
  onOpenAddPassenger?: () => void;
  onOpenScheduleCalendar?: () => void;
  onQuickGoogleSheetsCopy: () => void;
  totalRowsCount: number;
  filledRowsCount: number;
  isCloudSynced?: boolean;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  role,
  onChangeRole,
  onOpenMasterPresets,
  onOpenAiScan,
  onOpenExport,
  onOpenPrint,
  onOpenShareDriver,
  onNewReport,
  onOpenHistory,
  onOpenAddPassenger,
  onOpenScheduleCalendar,
  onQuickGoogleSheetsCopy,
  totalRowsCount,
  filledRowsCount,
  isCloudSynced = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileAction = (action: () => void) => {
    setIsMobileMenuOpen(false);
    action();
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* 1. Left Brand & Role Mode Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-bold text-sm sm:text-base md:text-lg text-slate-100 tracking-tight truncate max-w-[130px] sm:max-w-none">
                  Pelaporan Spreadsheet
                </h1>

                {/* Cloud Sync Live Status Badge */}
                <div 
                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border transition-colors ${
                    isCloudSynced
                      ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                      : 'bg-amber-950/80 border-amber-700/60 text-amber-400'
                  }`}
                  title={isCloudSynced ? 'Database terhubung secara Real-Time (PC & HP tersinkron)' : 'Menghubungkan ke Cloud...'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span className="hidden xs:inline">{isCloudSynced ? 'Live Sync' : 'Sync...'}</span>
                </div>
              </div>

              <p className="text-[10.5px] text-slate-400 hidden lg:block">
                Penjadwalan Armada & Manifest Penumpang ({filledRowsCount} penumpang aktif)
              </p>
            </div>
          </div>

          {/* 2. Desktop Actions (Large & Medium Screens) */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {onOpenAddPassenger && (
              <button
                onClick={onOpenAddPassenger}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-95"
                title="Tambah data penumpang baru, tentukan tanggal dan pilih driver"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Penumpang</span>
              </button>
            )}

            {onOpenScheduleCalendar && (
              <button
                onClick={onOpenScheduleCalendar}
                className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
                title="Buka Kalender Jadwal Operasional"
              >
                <Calendar className="w-4 h-4 text-indigo-200" />
                <span>Kalender</span>
              </button>
            )}

            <button
              onClick={onOpenMasterPresets}
              className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-bold rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 shadow-xs transition-colors"
              title="Master Data Driver, Kendaraan & Rute"
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Master Data</span>
            </button>

            <button
              onClick={onOpenAiScan}
              className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm transition-all"
              title="Pindai form fisik kertas dengan AI"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Pindai AI</span>
            </button>

            <button
              onClick={onOpenShareDriver}
              className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition-all"
              title="Bagikan link checklist ke Driver via WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-100" />
              <span className="hidden xl:inline">Kirim ke Driver</span>
            </button>

            <button
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-colors"
              title="Ekspor ke Excel, Google Sheets, atau CSV"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor</span>
            </button>

            <button
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Riwayat penugasan per tanggal dan driver"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Riwayat</span>
            </button>
          </div>

          {/* 3. Mobile Header Controls (Hamburger & Quick Buttons) */}
          <div className="flex md:hidden items-center gap-1.5">
            {role === 'admin' && onOpenAddPassenger && (
              <button
                type="button"
                onClick={onOpenAddPassenger}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Pnp</span>
              </button>
            )}

            {role === 'driver' && (
              <button
                type="button"
                onClick={onOpenShareDriver}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WA</span>
              </button>
            )}

            {/* Mobile Drawer Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              aria-label="Menu Navigasi"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* 4. Mobile Menu Dropdown Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1 pb-0.5">
            Menu Operasional
          </div>

          <div className="grid grid-cols-2 gap-2">
            {onOpenAddPassenger && (
              <button
                type="button"
                onClick={() => handleMobileAction(onOpenAddPassenger)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold text-left"
              >
                <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>+ Penumpang</span>
              </button>
            )}

            {onOpenScheduleCalendar && (
              <button
                type="button"
                onClick={() => handleMobileAction(onOpenScheduleCalendar)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold text-left"
              >
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Kalender Shift</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleMobileAction(onOpenMasterPresets)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold text-left"
            >
              <Database className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Master Data</span>
            </button>

            <button
              type="button"
              onClick={() => handleMobileAction(onOpenAiScan)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold text-left"
            >
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Pindai Form AI</span>
            </button>

            <button
              type="button"
              onClick={() => handleMobileAction(onOpenShareDriver)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold text-left"
            >
              <Share2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Kirim Link Driver</span>
            </button>

            <button
              type="button"
              onClick={() => handleMobileAction(onOpenExport)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold text-left"
            >
              <Download className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Ekspor Excel/Sheets</span>
            </button>

            <button
              type="button"
              onClick={() => handleMobileAction(onOpenHistory)}
              className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold text-center"
            >
              <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Lihat Riwayat Laporan</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  MessageCircle, 
  Phone, 
  Search, 
  Check, 
  Eraser, 
  Edit2, 
  UserPlus, 
  ClipboardList, 
  Clock, 
  AlertCircle, 
  Lock,
  LayoutGrid,
  Table as TableIcon,
  MapPin,
  ArrowRight,
  Sparkles,
  Ban,
  PlaneTakeoff,
  PlaneLanding
} from 'lucide-react';
import { ReportRow, MasterPresets, UserRole, TripType } from '../types';
import { getWhatsAppUrl, defaultMasterPresets } from '../utils/spreadsheet';

interface SpreadsheetGridProps {
  rows: ReportRow[];
  onChangeRows: (newRows: ReportRow[]) => void;
  onQuickAddRow: () => void;
  onOpenAddPassengerModal?: () => void;
  onOpenEditPassengerModal?: (row: ReportRow) => void;
  onDeletePassenger?: (row: ReportRow) => void;
  onAddMultipleRows?: (count: number) => void;
  onClearEmptyRows: () => void;
  presets?: MasterPresets;
  role?: UserRole;
  isLocked?: boolean;
  kapasitas?: number;
  kendaraan?: string;
  onOpenPresetsModal?: () => void;
}

const TIME_PRESETS = ['05:00', '05:30', '06:00', '06:30', '07:00', '08:00', '12:00', '16:00'];
const KETERANGAN_PRESETS = ['Batal tiket', 'Ganti jadwal', 'HP tidak aktif', 'Salah titik', 'Titip barang'];

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  rows,
  onChangeRows,
  onQuickAddRow,
  onOpenAddPassengerModal,
  onOpenEditPassengerModal,
  onDeletePassenger,
  onAddMultipleRows,
  onClearEmptyRows,
  presets = defaultMasterPresets,
  role = 'admin',
  isLocked = false,
  kapasitas = 7,
  kendaraan = 'Mobil',
  onOpenPresetsModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colKey: keyof ReportRow } | null>(null);
  const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');
  const [tripFilter, setTripFilter] = useState<'all' | 'keberangkatan' | 'kedatangan'>('all');

  // Count Keberangkatan and Kedatangan (Capacity is INDEPENDENT: 7 Keberangkatan + 7 Kedatangan)
  const countKeberangkatan = rows.filter((r) => (r.tripType || 'keberangkatan') === 'keberangkatan' && (r.nama || r.hp)).length;
  const countKedatangan = rows.filter((r) => r.tripType === 'kedatangan' && (r.nama || r.hp)).length;

  const maxCapacity = kapasitas || 7;
  const remainingKeberangkatan = Math.max(0, maxCapacity - countKeberangkatan);
  const remainingKedatangan = Math.max(0, maxCapacity - countKedatangan);
  const isFullKeberangkatan = countKeberangkatan >= maxCapacity;
  const isFullKedatangan = countKedatangan >= maxCapacity;
  const isFull = isFullKeberangkatan && isFullKedatangan;
  const filledCount = countKeberangkatan + countKedatangan;

  // Update a single cell
  const handleCellChange = (index: number, field: keyof ReportRow, value: string | number) => {
    if (isLocked && role === 'driver') return;
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChangeRows(updated);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (isLocked && role === 'driver') return;
    if (onDeletePassenger && rows[index] && (rows[index].nama.trim() || rows[index].hp.trim())) {
      onDeletePassenger(rows[index]);
      return;
    }
    const updated = rows.filter((_, i) => i !== index);
    const renumbered = updated.map((r, i) => ({ ...r, no: i + 1 }));
    onChangeRows(renumbered);
  };

  // Toggle tripType between Keberangkatan (default Antar: Stasiun) and Kedatangan (default Jemput: Stasiun)
  const handleTripTypeToggle = (originalIndex: number) => {
    if (isLocked && role === 'driver') return;
    const current = rows[originalIndex];
    const currentType = current.tripType || 'keberangkatan';
    const nextType: TripType = currentType === 'keberangkatan' ? 'kedatangan' : 'keberangkatan';

    let newAntar = current.antar;
    let newJemput = current.jemput;

    if (nextType === 'keberangkatan') {
      if (!newAntar || newAntar === 'Stasiun' || newAntar === '✓' || newJemput === 'Stasiun') {
        newAntar = 'Stasiun';
      }
      if (newJemput === 'Stasiun') {
        newJemput = '';
      }
    } else {
      if (!newJemput || newJemput === 'Stasiun' || newAntar === 'Stasiun' || newAntar === '✓') {
        newJemput = 'Stasiun';
      }
      if (newAntar === 'Stasiun' || newAntar === '✓') {
        newAntar = '';
      }
    }

    const updated = [...rows];
    updated[originalIndex] = {
      ...current,
      tripType: nextType,
      antar: newAntar,
      jemput: newJemput,
    };
    onChangeRows(updated);
  };

  // Duplicate row
  const handleDuplicateRow = (index: number) => {
    if (isLocked && role === 'driver') return;
    const target = rows[index];
    const newRow: ReportRow = {
      ...target,
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      no: rows.length + 1,
    };
    const updated = [...rows];
    updated.splice(index + 1, 0, newRow);
    const renumbered = updated.map((r, i) => ({ ...r, no: i + 1 }));
    onChangeRows(renumbered);
  };

  // Quick preset insert into cell
  const handleApplyPreset = (index: number, field: 'antar' | 'jemput' | 'keterangan' | 'jam', presetValue: string) => {
    if (isLocked && role === 'driver') return;
    const current = rows[index][field] || '';
    const updated = [...rows];
    if (current === presetValue) {
      updated[index] = { ...updated[index], [field]: '' };
    } else {
      updated[index] = { ...updated[index], [field]: presetValue };
    }
    onChangeRows(updated);
  };

  // Filter rows by search and tripType
  const filteredRowsWithIndex = rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .filter(({ row }) => {
      if (tripFilter !== 'all') {
        const rowTrip = row.tripType || 'keberangkatan';
        if (rowTrip !== tripFilter) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (row.jam && row.jam.toLowerCase().includes(q)) ||
        row.nama.toLowerCase().includes(q) ||
        row.hp.toLowerCase().includes(q) ||
        row.antar.toLowerCase().includes(q) ||
        row.jemput.toLowerCase().includes(q) ||
        row.keterangan.toLowerCase().includes(q) ||
        String(row.no).includes(q)
      );
    });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      
      {/* Lock banner if task is completed and locked */}
      {isLocked && (
        <div className="bg-amber-500/10 border-b border-amber-300 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 text-amber-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Tugas Selesai:</strong> Driver telah menyelesaikan shift ini.
            </span>
          </div>
          {role === 'admin' && (
            <span className="text-[11px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-bold shrink-0">
              Admin Mode (Bebas Edit)
            </span>
          )}
        </div>
      )}

      {/* Grid Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Left: Search Bar */}
        <div className="relative flex-1 min-w-0 sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jam, nama penumpang, no HP, tujuan..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Actions, View Switcher & Capacity Status */}
        <div className="flex items-center flex-wrap gap-2 justify-between sm:justify-end">
          
          {/* View Mode Toggle (Mobile / Tablet / PC switch) */}
          <div className="inline-flex p-0.5 bg-slate-200/80 rounded-xl text-xs border border-slate-300/80">
            <button
              type="button"
              onClick={() => setViewMode('auto')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === 'auto'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan otomatis menyesuaikan layar (Tabel di PC, Kartu di HP)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px]">Otomatis</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Tabel Spreadsheet Lengkap"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="text-[11px]">Tabel</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Kartu Penumpang Responsif"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span className="text-[11px]">Kartu</span>
            </button>
          </div>

          {/* Capacity status pill (Keberangkatan & Kedatangan are separate 7 seats each) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                isFullKeberangkatan
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : countKeberangkatan > 0
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isFullKeberangkatan ? 'bg-rose-600 animate-pulse' : 'bg-sky-500'}`} />
              <span>
                🛫 Brkt: <strong>{countKeberangkatan}/{maxCapacity}</strong>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                (Sisa {remainingKeberangkatan})
              </span>
            </div>

            <div
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                isFullKedatangan
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : countKedatangan > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isFullKedatangan ? 'bg-rose-600 animate-pulse' : 'bg-indigo-500'}`} />
              <span>
                🛬 Dtg: <strong>{countKedatangan}/{maxCapacity}</strong>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                (Sisa {remainingKedatangan})
              </span>
            </div>
          </div>

          {onOpenAddPassengerModal && (!isLocked || role === 'admin') && (
            <button
              type="button"
              onClick={isFull ? undefined : onOpenAddPassengerModal}
              disabled={isFull}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl text-white transition-all shadow-sm ${
                isFull
                  ? 'bg-slate-400 opacity-50 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">+ Tambah Penumpang</span>
              <span className="sm:hidden">+ Pnp</span>
            </button>
          )}

          {(!isLocked || role === 'admin') && (
            <>
              <button
                type="button"
                onClick={isFull ? undefined : onQuickAddRow}
                disabled={isFull}
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl border transition-colors shadow-xs ${
                  isFull
                    ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                    : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
                title="Tambah baris kosong langsung"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Baris Cepat</span>
              </button>

              <button
                type="button"
                onClick={onClearEmptyRows}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Bersihkan baris kosong"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Bersihkan</span>
              </button>
            </>
          )}

        </div>
      </div>

      {/* Keberangkatan & Kedatangan Split Bar */}
      <div className="px-3 sm:px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs font-bold text-xs">
          <button
            type="button"
            onClick={() => setTripFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all ${
              tripFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({rows.length})
          </button>

          <button
            type="button"
            onClick={() => setTripFilter('keberangkatan')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              tripFilter === 'keberangkatan'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-sky-800 hover:bg-sky-50'
            }`}
          >
            <PlaneTakeoff className="w-3.5 h-3.5" />
            <span>Keberangkatan ({countKeberangkatan})</span>
          </button>

          <button
            type="button"
            onClick={() => setTripFilter('kedatangan')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              tripFilter === 'kedatangan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-800 hover:bg-indigo-50'
            }`}
          >
            <PlaneLanding className="w-3.5 h-3.5" />
            <span>Kedatangan ({countKedatangan})</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:inline">
          💡 Driver sekali jalan bisa melayani keberangkatan dan kedatangan sekaligus.
        </span>
      </div>

      {/* Capacity Warning Banner when vehicle is 100% full */}
      {isFull && (
        <div className="bg-rose-50 border-b border-rose-200 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-rose-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Kapasitas Penuh ({filledCount}/{maxCapacity}):</strong> Mobil {kendaraan} telah penuh. Gunakan tombol <strong>+ Driver Baru</strong> untuk menugaskan armada tambahan.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-rose-200 text-rose-900 rounded-md font-bold shrink-0">
            Maks {maxCapacity}
          </span>
        </div>
      )}

      {/* ── CARD VIEW (FOR MOBILE OR USER SELECTED) ── */}
      {(viewMode === 'cards' || (viewMode === 'auto')) && (
        <div className={`p-3 sm:p-4 ${viewMode === 'auto' ? 'block md:hidden' : 'block'}`}>
          {filteredRowsWithIndex.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="font-bold text-slate-700 text-sm">Belum ada data penumpang</p>
              <p className="text-xs text-slate-500 mt-0.5">Tugaskan penumpang menggunakan tombol di atas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredRowsWithIndex.map(({ row, originalIndex }) => {
                const isFilled = Boolean(row.nama || row.hp || row.jam);

                return (
                  <div
                    key={row.id || originalIndex}
                    className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between ${
                      isFilled
                        ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                        : 'bg-slate-50 border-dashed border-slate-300'
                    }`}
                  >
                    {/* Top Row: Number, Name, Time, and Type Badge */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 bg-slate-200 text-slate-700">
                            {row.no || originalIndex + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {row.nama || <span className="text-slate-400 italic">Baris Kosong</span>}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {row.jam && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded">
                                  <Clock className="w-3 h-3 text-purple-700" />
                                  {row.jam}
                                </span>
                              )}
                              {/* Jenis Perjalanan Badge */}
                              <button
                                type="button"
                                disabled={isLocked && role === 'driver'}
                                onClick={() => handleTripTypeToggle(originalIndex)}
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded border transition-colors ${
                                  row.tripType === 'kedatangan'
                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                    : 'bg-sky-100 text-sky-800 border-sky-200'
                                }`}
                                title="Klik untuk mengubah jenis (Keberangkatan / Kedatangan)"
                              >
                                {row.tripType === 'kedatangan' ? (
                                  <>
                                    <PlaneLanding className="w-2.5 h-2.5 text-indigo-600" />
                                    <span>Kedatangan</span>
                                  </>
                                ) : (
                                  <>
                                    <PlaneTakeoff className="w-2.5 h-2.5 text-sky-600" />
                                    <span>Keberangkatan</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Phone & Direct WA/Call Buttons */}
                      {row.hp && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                          <span className="text-xs font-mono text-slate-600 truncate flex-1">
                            📞 {row.hp}
                          </span>
                          <a
                            href={getWhatsAppUrl(row.hp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WA</span>
                          </a>
                          <a
                            href={`tel:${row.hp}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-600" />
                            <span>Telp</span>
                          </a>
                        </div>
                      )}

                      {/* Jemput & Antar Location Chips */}
                      {(row.jemput || row.antar) && (
                        <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px]">
                          {row.jemput && (
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 truncate">
                              <span className="text-[10px] text-indigo-600 font-bold block">Jemput:</span>
                              <span className="font-semibold text-slate-800">{row.jemput}</span>
                            </div>
                          )}
                          {row.antar && (
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 truncate">
                              <span className="text-[10px] text-emerald-600 font-bold block">Antar:</span>
                              <span className="font-semibold text-slate-800">{row.antar}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {row.keterangan && (
                        <div className="mt-2 text-xs text-slate-600 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/60">
                          <span className="font-bold text-amber-900">Ket:</span> {row.keterangan}
                        </div>
                      )}
                    </div>

                    {/* Card Actions (Edit, Move, Delete) */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        {isFilled && onOpenEditPassengerModal && (!isLocked || role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => onOpenEditPassengerModal(row)}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit / Pindah</span>
                          </button>
                        )}
                      </div>

                      {(!isLocked || role === 'admin') && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(originalIndex)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            title="Duplikat"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(originalIndex)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TABLE VIEW (FOR PC / DESKTOP OR USER SELECTED) ── */}
      {(viewMode === 'table' || (viewMode === 'auto')) && (
        <div className={`${viewMode === 'auto' ? 'hidden md:block' : 'block'} overflow-x-auto scrollbar-thin`}>
          
          {/* Table Swipe Hint for smaller landscape screens */}
          <div className="md:hidden bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-800 border-b border-indigo-100 flex items-center justify-between">
            <span>👉 Geser ke samping untuk melihat seluruh kolom</span>
            <span className="text-[10px] bg-indigo-200 px-1.5 py-0.2 rounded font-bold">Tabel Spreadsheet</span>
          </div>

          <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-900 text-slate-100 uppercase tracking-wider text-[11px] font-bold border-b border-slate-800 sticky top-0 z-10">
                <th className="py-3 px-2 w-12 text-center border-r border-slate-800">
                  NO
                </th>
                <th className="py-3 px-2 w-24 text-center border-r border-slate-800">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>JAM</span>
                  </div>
                </th>
                <th className="py-3 px-2 w-28 text-center border-r border-slate-800">
                  <span>JENIS</span>
                </th>
                <th className="py-3 px-3 w-40 border-r border-slate-800">
                  HP / WHATSAPP
                </th>
                <th className="py-3 px-3 min-w-[160px] border-r border-slate-800">
                  NAMA PENUMPANG
                </th>
                <th className="py-3 px-3 w-28 text-center border-r border-slate-800">
                  ANTAR
                </th>
                <th className="py-3 px-3 w-32 text-center border-r border-slate-800">
                  JEMPUT
                </th>
                <th className="py-3 px-3 min-w-[160px] border-r border-slate-800">
                  KETERANGAN
                </th>
                <th className="py-3 px-2 w-24 text-center">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRowsWithIndex.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">Belum ada daftar penumpang</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tugas baru dalam keadaan kosong. Gunakan tombol <strong>+ Tambah Penumpang</strong> untuk mengisi.</p>
                  </td>
                </tr>
              ) : (
                filteredRowsWithIndex.map(({ row, originalIndex }) => {
                  const isFilled = Boolean(row.nama || row.hp || row.jam || row.antar || row.jemput || row.keterangan);
                  const isRowFocused = selectedCell?.rowIdx === originalIndex;

                  return (
                    <tr
                      key={row.id || originalIndex}
                      className={`group transition-colors ${
                        isRowFocused
                          ? 'bg-emerald-50/60'
                          : isFilled
                          ? 'bg-white hover:bg-slate-50/80'
                          : 'bg-slate-50/40 hover:bg-slate-50'
                      }`}
                    >
                      {/* NO */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 font-mono font-bold text-slate-600">
                        <input
                          type="number"
                          disabled={isLocked && role === 'driver'}
                          value={row.no || originalIndex + 1}
                          onChange={(e) => handleCellChange(originalIndex, 'no', parseInt(e.target.value) || originalIndex + 1)}
                          className="w-10 text-center bg-transparent focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded p-1 font-semibold disabled:opacity-60"
                        />
                      </td>

                      {/* JAM */}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          disabled={isLocked && role === 'driver'}
                          value={row.jam || ''}
                          onChange={(e) => handleCellChange(originalIndex, 'jam', e.target.value)}
                          onFocus={() => setSelectedCell({ rowIdx: originalIndex, colKey: 'jam' })}
                          placeholder="06:30"
                          className="w-full text-center px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-slate-900 font-mono font-bold text-xs disabled:opacity-60"
                        />
                        <div className="flex flex-wrap justify-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {TIME_PRESETS.slice(0, 3).map((time) => (
                            <button
                              key={time}
                              type="button"
                              disabled={isLocked && role === 'driver'}
                              onClick={() => handleApplyPreset(originalIndex, 'jam', time)}
                              className={`text-[9px] px-1 py-0.2 rounded border transition-colors ${
                                row.jam === time
                                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                                  : 'bg-slate-100 hover:bg-amber-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* JENIS (Keberangkatan / Kedatangan) */}
                      <td className="py-2 px-2 border-r border-slate-200 text-center">
                        <button
                          type="button"
                          disabled={isLocked && role === 'driver'}
                          onClick={() => handleTripTypeToggle(originalIndex)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors inline-flex items-center gap-1 ${
                            row.tripType === 'kedatangan'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                          }`}
                          title="Klik untuk mengubah jenis (Keberangkatan / Kedatangan)"
                        >
                          {row.tripType === 'kedatangan' ? (
                            <>
                              <PlaneLanding className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Kedatangan</span>
                            </>
                          ) : (
                            <>
                              <PlaneTakeoff className="w-3.5 h-3.5 text-sky-600" />
                              <span>Keberangkatan</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* HP / WHATSAPP */}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            disabled={isLocked && role === 'driver'}
                            value={row.hp}
                            onChange={(e) => handleCellChange(originalIndex, 'hp', e.target.value)}
                            onFocus={() => setSelectedCell({ rowIdx: originalIndex, colKey: 'hp' })}
                            placeholder="08..."
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-slate-800 font-mono text-xs sm:text-sm disabled:opacity-60"
                          />
                          {row.hp && row.hp.replace(/[^0-9]/g, '').length >= 7 && (
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={getWhatsAppUrl(row.hp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                                title={`Chat WhatsApp ke ${row.hp}`}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={`tel:${row.hp}`}
                                className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                title="Telepon Langsung"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* NAMA */}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          disabled={isLocked && role === 'driver'}
                          value={row.nama}
                          onChange={(e) => handleCellChange(originalIndex, 'nama', e.target.value)}
                          onFocus={() => setSelectedCell({ rowIdx: originalIndex, colKey: 'nama' })}
                          placeholder="Nama penumpang..."
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-slate-900 font-semibold disabled:opacity-60"
                        />
                      </td>

                      {/* ANTAR */}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          disabled={isLocked && role === 'driver'}
                          value={row.antar}
                          onChange={(e) => handleCellChange(originalIndex, 'antar', e.target.value)}
                          onFocus={() => setSelectedCell({ rowIdx: originalIndex, colKey: 'antar' })}
                          placeholder="✓ / Tujuan"
                          className="w-full text-center px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-slate-800 font-semibold text-xs sm:text-sm disabled:opacity-60"
                        />
                        <div className="flex flex-wrap justify-center gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {presets.antarList.slice(0, 3).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              disabled={isLocked && role === 'driver'}
                              onClick={() => handleApplyPreset(originalIndex, 'antar', preset)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                row.antar === preset
                                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                  : 'bg-slate-100 hover:bg-blue-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* JEMPUT */}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          disabled={isLocked && role === 'driver'}
                          value={row.jemput}
                          onChange={(e) => handleCellChange(originalIndex, 'jemput', e.target.value)}
                          onFocus={() => setSelectedCell({ rowIdx: originalIndex, colKey: 'jemput' })}
                          placeholder="Lokasi / ✓"
                          className="w-full text-center px-1.5 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-slate-800 font-medium text-xs sm:text-sm disabled:opacity-60"
                        />
                        <div className="flex flex-wrap justify-center gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {presets.jemputList.slice(0, 3).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              disabled={isLocked && role === 'driver'}
                              onClick={() => handleApplyPreset(originalIndex, 'jemput', preset)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                row.jemput === preset
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                  : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* KETERANGAN */}
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          type="text"
                          disabled={isLocked && role === 'driver'}
                          value={row.keterangan}
                          onChange={(e) => handleCellChange(originalIndex, 'keterangan', e.target.value)}
                          onFocus={() => setSelectedCell({ rowIdx: originalIndex, colKey: 'keterangan' })}
                          placeholder="Catatan / alasan..."
                          className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg text-slate-800 text-xs sm:text-sm disabled:opacity-60"
                        />
                        <div className="flex flex-wrap gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {KETERANGAN_PRESETS.slice(0, 3).map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              disabled={isLocked && role === 'driver'}
                              onClick={() => handleApplyPreset(originalIndex, 'keterangan', preset)}
                              className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                                row.keterangan === preset
                                  ? 'bg-slate-800 text-white border-slate-800 font-bold'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* AKSI */}
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isFilled && onOpenEditPassengerModal && (!isLocked || role === 'admin') && (
                            <button
                              type="button"
                              onClick={() => onOpenEditPassengerModal(row)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit & Pindah Driver"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(!isLocked || role === 'admin') && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDuplicateRow(originalIndex)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                title="Duplikasi Baris"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(originalIndex)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus Baris"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid Bottom Bar */}
      <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Menampilkan <strong>{filteredRowsWithIndex.length}</strong> baris</span>
        </div>
        {(!isLocked || role === 'admin') && (
          <div className="flex items-center gap-3">
            {onOpenAddPassengerModal && (
              <button
                type="button"
                onClick={onOpenAddPassengerModal}
                className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline"
              >
                <UserPlus className="w-3.5 h-3.5" /> + Tambah Penumpang
              </button>
            )}
            <button
              type="button"
              onClick={onQuickAddRow}
              className="text-slate-600 hover:text-slate-800 font-semibold flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> + Baris Cepat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

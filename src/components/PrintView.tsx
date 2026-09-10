import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  X, 
  FileSpreadsheet, 
  PlaneTakeoff, 
  PlaneLanding, 
  Clock, 
  Car, 
  User, 
  Calendar,
  Layers,
  ChevronDown,
  CheckCircle2,
  Users
} from 'lucide-react';
import { ReportDocument, ReportRow } from '../types';
import { exportToExcel, getFilledRows } from '../utils/spreadsheet';
import { DatePickerInput } from './DatePickerInput';

interface PrintViewProps {
  report: ReportDocument;
  reports?: ReportDocument[];
  onClose: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ report, reports = [], onClose }) => {
  // Available dates across all reports
  const allReports = useMemo(() => {
    if (reports.length > 0) return reports;
    return [report];
  }, [reports, report]);

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    allReports.forEach((r) => r.tanggal && dates.add(r.tanggal));
    if (report.tanggal) dates.add(report.tanggal);
    return Array.from(dates);
  }, [allReports, report]);

  // Selected date for printing
  const [selectedDate, setSelectedDate] = useState<string>(report.tanggal || '');

  // Scope: 'driver' (dokumen per driver) vs 'rekap-tanggal' (rekap gabungan seluruh armada di tanggal tersebut)
  const [printScope, setPrintScope] = useState<'driver' | 'rekap-tanggal'>('driver');

  // Selected driver report id
  const [selectedReportId, setSelectedReportId] = useState<string>(report.id);

  // Filter 2 tabel: 'both' | 'keberangkatan' | 'kedatangan'
  const [printFilter, setPrintFilter] = useState<'both' | 'keberangkatan' | 'kedatangan'>('both');

  // Reports matching selected date
  const reportsOnSelectedDate = useMemo(() => {
    return allReports.filter((r) => r.tanggal === selectedDate);
  }, [allReports, selectedDate]);

  // Current active single report
  const activeReport = useMemo(() => {
    const found = reportsOnSelectedDate.find((r) => r.id === selectedReportId);
    return found || reportsOnSelectedDate[0] || report;
  }, [reportsOnSelectedDate, selectedReportId, report]);

  // All rows for single driver report vs rekap-tanggal
  const activeRowsWithMeta = useMemo(() => {
    if (printScope === 'driver') {
      return getFilledRows(activeReport.rows).map((row) => ({
        ...row,
        driverName: activeReport.driver,
        kendaraanName: activeReport.kendaraan,
        platNomor: activeReport.platNomor,
      }));
    }

    // Rekap Tanggal: Aggregate filled rows from all drivers on this date
    const aggregated: Array<ReportRow & { driverName: string; kendaraanName: string; platNomor: string }> = [];
    reportsOnSelectedDate.forEach((rep) => {
      const filled = getFilledRows(rep.rows);
      filled.forEach((row) => {
        aggregated.push({
          ...row,
          driverName: rep.driver,
          kendaraanName: rep.kendaraan,
          platNomor: rep.platNomor,
        });
      });
    });

    // Sort by jam
    return aggregated.sort((a, b) => (a.jam || '').localeCompare(b.jam || ''));
  }, [printScope, activeReport, reportsOnSelectedDate]);

  // Separate into Keberangkatan and Kedatangan
  const keberangkatanRows = useMemo(() => {
    return activeRowsWithMeta.filter(
      (r) => (r.tripType || 'keberangkatan') === 'keberangkatan'
    );
  }, [activeRowsWithMeta]);

  const kedatanganRows = useMemo(() => {
    return activeRowsWithMeta.filter((r) => r.tripType === 'kedatangan');
  }, [activeRowsWithMeta]);

  const showKeberangkatan = printFilter === 'both' || printFilter === 'keberangkatan';
  const showKedatangan = printFilter === 'both' || printFilter === 'kedatangan';

  const handlePrint = () => {
    window.print();
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const firstRep = allReports.find((r) => r.tanggal === newDate);
    if (firstRep) {
      setSelectedReportId(firstRep.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto p-2 sm:p-6 flex flex-col items-center">
      
      {/* Control Bar (hidden in browser print) */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-4 mb-4 print:hidden border border-slate-200 space-y-3.5">
        
        {/* Top Control Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3 text-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base">Pratinjau Cetak / PDF Operasional</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  2 Tabel Terpisah
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pilih tanggal dan model cetak: Per Driver Armada atau Rekap Seluruh Driver per Tanggal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>

            <button
              type="button"
              onClick={() => exportToExcel(activeReport)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Filters (Date & Scope & Table Mode) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          
          {/* 1. Pilih Tanggal (Bedakan per tanggal untuk memudahkan admin) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Tanggal Cetak:</span>
            </label>
            <DatePickerInput
              value={selectedDate}
              onChange={handleDateChange}
              label=""
            />
            {uniqueDates.length > 1 && (
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-500 font-medium">Pilih cepat:</span>
                {uniqueDates.slice(0, 4).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDateChange(d)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all ${
                      selectedDate === d
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {d.split(' ')[0]} {d.split(' ')[1]?.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Format Cetak: Per Driver vs Rekap Harian Tanggal */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>2. Format Dokumen:</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintScope('driver')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  printScope === 'driver'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Driver
              </button>
              <button
                type="button"
                onClick={() => setPrintScope('rekap-tanggal')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  printScope === 'rekap-tanggal'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rekap Tanggal
              </button>
            </div>

            {/* If Per Driver, pick driver dropdown */}
            {printScope === 'driver' && reportsOnSelectedDate.length > 0 && (
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                {reportsOnSelectedDate.map((r) => (
                  <option key={r.id} value={r.id}>
                    Driver: {r.driver} ({r.kendaraan}) - Jam {r.jamMulai || '-'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Filter Tabel: Keduanya vs Keberangkatan vs Kedatangan */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <span>3. Pilihan Tabel Cetak:</span>
            </label>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setPrintFilter('both')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between border ${
                  printFilter === 'both'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Kedua Tabel (Lengkap)</span>
                <span className="text-[10px] font-mono">{activeRowsWithMeta.length} pnp</span>
              </button>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setPrintFilter('keberangkatan')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                    printFilter === 'keberangkatan'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-white text-sky-800 border-slate-200 hover:bg-sky-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <PlaneTakeoff className="w-3 h-3" />
                    <span>Keberangkatan</span>
                  </span>
                  <span className="text-[10px] font-mono">{keberangkatanRows.length}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintFilter('kedatangan')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                    printFilter === 'kedatangan'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-indigo-800 border-slate-200 hover:bg-indigo-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <PlaneLanding className="w-3 h-3" />
                    <span>Kedatangan</span>
                  </span>
                  <span className="text-[10px] font-mono">{kedatanganRows.length}</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Printable Sheet (exact physical paper style) */}
      <div className="w-full max-w-4xl bg-white text-black p-6 sm:p-8 rounded-xl shadow-2xl print:shadow-none print:p-0 print:m-0 border border-slate-300 font-sans print:border-none">
        
        {/* Top Header of Print Sheet */}
        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-sm sm:text-base tracking-wide">
                  {printScope === 'rekap-tanggal' ? 'REKAP OPERASIONAL HARIAN:' : 'NAMA KERETA:'}
                </span>
                <span className="font-mono font-bold text-lg text-slate-900 border-b border-black px-2 pb-0.5 min-w-[120px]">
                  {printScope === 'rekap-tanggal' ? `BIB / RGA (${reportsOnSelectedDate.length} Armada)` : (activeReport.namaKereta || '-')}
                </span>
              </div>

              {printScope === 'driver' ? (
                <>
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="font-semibold text-slate-700">DRIVER / PETUGAS:</span>
                    <span className="font-bold text-slate-900">{activeReport.driver} {activeReport.driverHp ? `(${activeReport.driverHp})` : ''}</span>
                  </div>
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="font-semibold text-slate-700">JAM TUGAS / SHIFT:</span>
                    <span className="font-mono font-bold text-slate-900">{activeReport.jamMulai || '05:00'} - {activeReport.jamSelesai || '12:00'} WIB</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold border border-black ml-1">
                      {activeReport.statusTugas === 'selesai' ? 'SELESAI' : 'AKTIF'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-700">
                  <span>Daftar rekap seluruh penumpang dari <strong>{reportsOnSelectedDate.length} driver</strong> yang bertugas pada tanggal ini.</span>
                </div>
              )}
            </div>

            <div className="space-y-1 text-right">
              <div className="flex items-baseline gap-2 justify-end">
                <span className="font-bold text-sm sm:text-base tracking-wide">TANGGAL:</span>
                <span className="font-bold text-base text-slate-900 border-b border-black px-2 pb-0.5 min-w-[140px]">
                  {selectedDate || '-'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 justify-end text-xs">
                <span className="font-semibold text-slate-700">
                  {printScope === 'rekap-tanggal' ? 'TOTAL ARMADA:' : 'ARMADA & PLAT:'}
                </span>
                <span className="font-bold text-slate-900 uppercase font-mono">
                  {printScope === 'rekap-tanggal' 
                    ? `${reportsOnSelectedDate.length} Driver Terdaftar`
                    : `${activeReport.kendaraan || 'Luxio'} ${activeReport.platNomor ? `[${activeReport.platNomor}]` : ''} (${activeRowsWithMeta.length}/${activeReport.kapasitas || 7} Kursi)`}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Summary Pill Bar */}
          <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-xs font-semibold text-slate-700">
            <div className="flex items-center gap-3">
              <span>Total Penumpang: <strong>{activeRowsWithMeta.length} Orang</strong></span>
              <span>•</span>
              <span className="text-sky-900 font-bold">🛫 Keberangkatan: {keberangkatanRows.length} Orang</span>
              <span>•</span>
              <span className="text-indigo-900 font-bold">🛬 Kedatangan: {kedatanganRows.length} Orang</span>
            </div>
            <div>
              <span className="text-slate-600">
                Tanggal: <strong>{selectedDate}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ── TABEL 1: DAFTAR PENUMPANG KEBERANGKATAN ── */}
        {showKeberangkatan && (
          <div className="mb-6">
            <div className="bg-sky-100 border-2 border-b-0 border-black px-3 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm tracking-wide text-slate-900 uppercase">
                <span>DAFTAR KEBERANGKATAN</span>
              </div>
              <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-black">
                {keberangkatanRows.length} Orang
              </span>
            </div>

            <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-slate-100 font-bold uppercase text-center">
                  <th className="border-r-2 border-black py-1.5 px-2 w-10">NO</th>
                  <th className="border-r-2 border-black py-1.5 px-2 w-16 text-center">JAM</th>
                  <th className="border-r-2 border-black py-1.5 px-2.5 w-36 text-left">HP / WA</th>
                  <th className="border-r-2 border-black py-1.5 px-2.5 text-left">NAMA PENUMPANG</th>
                  <th className="border-r-2 border-black py-1.5 px-2 w-28 text-left">JEMPUT</th>
                  <th className="border-r-2 border-black py-1.5 px-2 w-28 text-left">ANTAR</th>
                  {printScope === 'rekap-tanggal' && (
                    <th className="border-r-2 border-black py-1.5 px-2 w-28 text-left">DRIVER</th>
                  )}
                  <th className="py-1.5 px-2 text-left">KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                {keberangkatanRows.length === 0 ? (
                  <tr>
                    <td colSpan={printScope === 'rekap-tanggal' ? 8 : 7} className="py-4 text-center text-slate-500 italic border-b border-slate-300">
                      Tidak ada data penumpang keberangkatan pada tanggal {selectedDate}
                    </td>
                  </tr>
                ) : (
                  keberangkatanRows.map((row, idx) => (
                    <tr key={row.id || idx} className="border-b border-slate-400 h-8 sm:h-8.5">
                      <td className="border-r-2 border-black text-center font-mono font-bold py-1 px-1">
                        {idx + 1}
                      </td>
                      <td className="border-r-2 border-black text-center font-mono font-semibold py-1 px-1 text-slate-900">
                        {row.jam || '-'}
                      </td>
                      <td className="border-r-2 border-black font-mono py-1 px-2 text-[11px] sm:text-xs">
                        {row.hp || ''}
                      </td>
                      <td className="border-r-2 border-black font-semibold py-1 px-2">
                        {row.nama || ''}
                      </td>
                      <td className="border-r-2 border-black py-1 px-2 text-slate-800">
                        {row.jemput || ''}
                      </td>
                      <td className="border-r-2 border-black py-1 px-2 font-medium text-slate-800">
                        {row.antar || ''}
                      </td>
                      {printScope === 'rekap-tanggal' && (
                        <td className="border-r-2 border-black py-1 px-2 font-semibold text-slate-900 text-xs">
                          {row.driverName || '-'}
                        </td>
                      )}
                      <td className="py-1 px-2 text-slate-700 text-[11px] sm:text-xs">
                        {row.keterangan || ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TABEL 2: DAFTAR PENUMPANG KEDATANGAN ── */}
        {showKedatangan && (
          <div className="mb-6">
            <div className="bg-indigo-100 border-2 border-b-0 border-black px-3 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm tracking-wide text-slate-900 uppercase">
                <span>DAFTAR KEDATANGAN</span>
              </div>
              <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-black">
                {kedatanganRows.length} Orang
              </span>
            </div>

            <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-black bg-slate-100 font-bold uppercase text-center">
                  <th className="border-r-2 border-black py-1.5 px-2 w-10">NO</th>
                  <th className="border-r-2 border-black py-1.5 px-2 w-16 text-center">JAM</th>
                  <th className="border-r-2 border-black py-1.5 px-2.5 w-36 text-left">HP / WA</th>
                  <th className="border-r-2 border-black py-1.5 px-2.5 text-left">NAMA PENUMPANG</th>
                  <th className="border-r-2 border-black py-1.5 px-2 w-28 text-left">JEMPUT</th>
                  <th className="border-r-2 border-black py-1.5 px-2 w-28 text-left">ANTAR</th>
                  {printScope === 'rekap-tanggal' && (
                    <th className="border-r-2 border-black py-1.5 px-2 w-28 text-left">DRIVER</th>
                  )}
                  <th className="py-1.5 px-2 text-left">KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                {kedatanganRows.length === 0 ? (
                  <tr>
                    <td colSpan={printScope === 'rekap-tanggal' ? 8 : 7} className="py-4 text-center text-slate-500 italic border-b border-slate-300">
                      Tidak ada data penumpang kedatangan pada tanggal {selectedDate}
                    </td>
                  </tr>
                ) : (
                  kedatanganRows.map((row, idx) => (
                    <tr key={row.id || idx} className="border-b border-slate-400 h-8 sm:h-8.5">
                      <td className="border-r-2 border-black text-center font-mono font-bold py-1 px-1">
                        {idx + 1}
                      </td>
                      <td className="border-r-2 border-black text-center font-mono font-semibold py-1 px-1 text-slate-900">
                        {row.jam || '-'}
                      </td>
                      <td className="border-r-2 border-black font-mono py-1 px-2 text-[11px] sm:text-xs">
                        {row.hp || ''}
                      </td>
                      <td className="border-r-2 border-black font-semibold py-1 px-2">
                        {row.nama || ''}
                      </td>
                      <td className="border-r-2 border-black py-1 px-2 text-slate-800">
                        {row.jemput || ''}
                      </td>
                      <td className="border-r-2 border-black py-1 px-2 font-medium text-slate-800">
                        {row.antar || ''}
                      </td>
                      {printScope === 'rekap-tanggal' && (
                        <td className="border-r-2 border-black py-1 px-2 font-semibold text-slate-900 text-xs">
                          {row.driverName || '-'}
                        </td>
                      )}
                      <td className="py-1 px-2 text-slate-700 text-[11px] sm:text-xs">
                        {row.keterangan || ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer of Print Document */}
        <div className="mt-6 pt-3 border-t-2 border-black flex justify-between items-end text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              {printScope === 'rekap-tanggal'
                ? `Rekap Operasional Tanggal ${selectedDate}`
                : `Catatan: ${activeReport.catatanHeader || '-'}`}
            </p>
            <p className="text-slate-600 text-[11px]">
              Rincian: Keberangkatan: {keberangkatanRows.length} pnp • Kedatangan: {kedatanganRows.length} pnp • Total: {activeRowsWithMeta.length} pnp
            </p>
            <p className="text-slate-500 text-[10px]">
              Dicetak pada: {new Date().toLocaleString('id-ID')}
            </p>
          </div>
          <div className="text-center w-48">
            <p className="text-slate-700 mb-12 font-medium">
              {printScope === 'rekap-tanggal' ? 'Penanggung Jawab / Admin' : 'Petugas / Pengemudi'}
            </p>
            <p className="font-bold border-t border-black pt-1">
              {printScope === 'rekap-tanggal' ? '( Admin Operasional )' : (activeReport.driver || '( ........................ )')}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

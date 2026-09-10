import React from 'react';
import { Users, PlaneTakeoff, PlaneLanding, Car } from 'lucide-react';
import { ReportDocument } from '../types';
import { getFilledRows } from '../utils/spreadsheet';

interface ReportSummaryCardsProps {
  report: ReportDocument;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({ report }) => {
  const filledRows = getFilledRows(report.rows);
  const totalPassengers = filledRows.length;
  
  const keberangkatanCount = filledRows.filter(
    (r) => (r.tripType || 'keberangkatan') === 'keberangkatan'
  ).length;
  const kedatanganCount = filledRows.filter(
    (r) => r.tripType === 'kedatangan'
  ).length;

  const kapasitas = report.kapasitas || 7;
  const remainingSeats = Math.max(0, kapasitas - totalPassengers);
  const isFull = totalPassengers >= kapasitas;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total Penumpang */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">Total Penumpang</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{totalPassengers}</span>
            <span className="text-xs text-slate-400 font-medium">orang</span>
          </div>
        </div>
      </div>

      {/* Keberangkatan */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-sky-100 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold shrink-0">
          <PlaneTakeoff className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs font-semibold text-sky-700">
            <span>Keberangkatan</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-sky-950">{keberangkatanCount}</span>
            <span className="text-xs text-sky-600 font-medium">orang</span>
          </div>
        </div>
      </div>

      {/* Kedatangan */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-indigo-100 shadow-xs flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
          <PlaneLanding className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
            <span>Kedatangan</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-indigo-950">{kedatanganCount}</span>
            <span className="text-xs text-indigo-600 font-medium">orang</span>
          </div>
        </div>
      </div>

      {/* Kapasitas Armada */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs flex items-center gap-3 ${
        isFull 
          ? 'bg-rose-50/50 border-rose-200' 
          : 'bg-white border-slate-200/80'
      }`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${
          isFull ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-600'
        }`}>
          <Car className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 truncate">Kapasitas Kursi</p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-extrabold ${isFull ? 'text-rose-700' : 'text-slate-900'}`}>
              {totalPassengers}/{kapasitas}
            </span>
            <span className="text-xs font-medium text-slate-500 truncate">
              {isFull ? '(Penuh)' : `(Sisa ${remainingSeats})`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

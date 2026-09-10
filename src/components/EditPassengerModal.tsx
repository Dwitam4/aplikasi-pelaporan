import React, { useState } from 'react';
import { 
  X, 
  UserCheck, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Navigation, 
  FileText, 
  Car, 
  Check, 
  Trash2,
  PlaneTakeoff,
  PlaneLanding,
  Clock
} from 'lucide-react';
import { ReportDocument, MasterPresets, ReportRow, TripType } from '../types';

interface EditPassengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportDocument[];
  currentReportId: string;
  passenger: ReportRow;
  presets: MasterPresets;
  onSave: (data: {
    targetReportId: string;
    updatedPassenger: ReportRow;
  }) => void;
  onDelete: (passengerId: string) => void;
}

export const EditPassengerModal: React.FC<EditPassengerModalProps> = ({
  isOpen,
  onClose,
  reports,
  currentReportId,
  passenger,
  presets,
  onSave,
  onDelete,
}) => {
  const [selectedReportId, setSelectedReportId] = useState(currentReportId);
  const [tripType, setTripType] = useState<TripType>(passenger.tripType || 'keberangkatan');
  const [jam, setJam] = useState<string>(passenger.jam || '05:30');
  const [nama, setNama] = useState(passenger.nama);
  const [hp, setHp] = useState(passenger.hp);
  const [jemput, setJemput] = useState(passenger.jemput);
  const [antar, setAntar] = useState(passenger.antar);
  const [keterangan, setKeterangan] = useState(passenger.keterangan);

  if (!isOpen) return null;

  const handleTripTypeChange = (newTrip: TripType) => {
    setTripType(newTrip);
    if (newTrip === 'keberangkatan') {
      // Keberangkatan default: Antar ke Stasiun
      if (!antar || antar === 'Stasiun' || antar === '✓' || jemput === 'Stasiun') {
        setAntar('Stasiun');
      }
      if (jemput === 'Stasiun') {
        setJemput('');
      }
    } else {
      // Kedatangan default: Jemput dari Stasiun
      if (!jemput || jemput === 'Stasiun' || antar === 'Stasiun' || antar === '✓') {
        setJemput('Stasiun');
      }
      if (antar === 'Stasiun' || antar === '✓') {
        setAntar('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    onSave({
      targetReportId: selectedReportId,
      updatedPassenger: {
        ...passenger,
        nama: nama.trim(),
        hp: hp.trim(),
        jam: jam.trim(),
        tripType,
        jemput: jemput.trim(),
        antar: antar.trim(),
        keterangan: keterangan.trim(),
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Edit Data Penumpang</h3>
              <p className="text-xs text-slate-300">
                Ubah informasi penumpang atau pindahkan penugasan driver
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Reassign Driver */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Car className="w-4 h-4 text-emerald-600" />
              <span>Penugasan Driver & Armada:</span>
            </label>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
            >
              {reports.map((r) => {
                const jamStr = (r.jamMulai || r.jamSelesai) ? `[${r.jamMulai || '05:00'}-${r.jamSelesai || '12:00'}]` : '[05:00-12:00]';
                const statusTag = r.statusTugas === 'selesai' ? '✅ (Selesai)' : '🟢 (Aktif)';
                return (
                  <option key={r.id} value={r.id}>
                    {r.tanggal} • {jamStr} {r.driver || 'Driver'} ({r.kendaraan}{r.platNomor ? ` - ${r.platNomor}` : ''}) {statusTag}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Jenis Perjalanan: Keberangkatan vs Kedatangan */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <span>Jenis Perjalanan & Jam:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTripTypeChange('keberangkatan')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                  tripType === 'keberangkatan'
                    ? 'border-sky-500 bg-sky-50 text-sky-950 font-bold ring-1 ring-sky-300'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <PlaneTakeoff className="w-4 h-4 text-sky-600 shrink-0" />
                <div className="text-xs">
                  <div>🛫 Keberangkatan</div>
                  <div className="text-[10px] text-slate-500 font-normal">Antar ke Stasiun</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTripTypeChange('kedatangan')}
                className={`p-2.5 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                  tripType === 'kedatangan'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-950 font-bold ring-1 ring-indigo-300'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                }`}
              >
                <PlaneLanding className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="text-xs">
                  <div>🛬 Kedatangan</div>
                  <div className="text-[10px] text-slate-500 font-normal">Jemput dari Stasiun</div>
                </div>
              </button>
            </div>

            {/* Jam Selector */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>Jam:</span>
              </span>
              <input
                type="time"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex items-center gap-1 overflow-x-auto">
                {['05:30', '07:00', '09:00', '11:00', '13:00', '15:30', '17:00', '19:00'].map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setJam(time)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors ${
                      jam === time
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-white border border-slate-200 hover:bg-purple-50 text-slate-700'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nama & HP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 mb-1 block">
                Nama Penumpang:
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>No. HP / WhatsApp:</span>
              </label>
              <input
                type="text"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Jemput & Antar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Titik Jemput:</span>
              </label>
              <input
                type="text"
                value={jemput}
                onChange={(e) => setJemput(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Stasiun', ...presets.jemputList.filter((j) => j !== 'Stasiun')].slice(0, 4).map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setJemput(j)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                      jemput === j
                        ? 'bg-indigo-600 text-white border-indigo-700 font-bold'
                        : 'bg-white border-slate-200 hover:bg-indigo-50 text-slate-700'
                    }`}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                <span>Titik Antar:</span>
              </label>
              <input
                type="text"
                value={antar}
                onChange={(e) => setAntar(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Stasiun', ...presets.antarList.filter((a) => a !== 'Stasiun')].slice(0, 4).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAntar(a)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                      antar === a
                        ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                        : 'bg-white border-slate-200 hover:bg-emerald-50 text-slate-700'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Keterangan Kendala / Catatan:</span>
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Hapus penumpang "${passenger.nama}"?`)) {
                  onDelete(passenger.id);
                  onClose();
                }
              }}
              className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

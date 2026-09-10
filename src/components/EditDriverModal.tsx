import React, { useState, useEffect } from 'react';
import { 
  X, 
  Car, 
  User, 
  Train, 
  Check, 
  Trash2, 
  AlertTriangle,
  FileText,
  ChevronDown,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Sunrise,
  Sun,
  Moon
} from 'lucide-react';
import { ReportDocument, MasterPresets } from '../types';
import { DatePickerInput } from './DatePickerInput';
import { DateSelectionBar } from './DateSelectionBar';
import { getFilledRows, defaultMasterDrivers, defaultMasterVehicles } from '../utils/spreadsheet';
import { 
  detectShiftType, 
  getDriverShiftsOnDate, 
  getVehicleShiftsOnDate, 
  SHIFT_DEFINITIONS, 
  ShiftType 
} from '../utils/shift';

interface EditDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportDocument;
  reports?: ReportDocument[];
  masterPresets: MasterPresets;
  onSave: (updatedFields: Partial<ReportDocument>) => void;
  onDelete: (id: string) => void;
}

const SHIFT_PRESET_BUTTONS = [
  { type: 'pagi' as ShiftType, label: 'Shift Pagi (05:00 - 12:00)', icon: Sunrise, jamMulai: '05:00', jamSelesai: '12:00' },
  { type: 'siang' as ShiftType, label: 'Shift Siang (12:00 - 18:00)', icon: Sun, jamMulai: '12:00', jamSelesai: '18:00' },
  { type: 'malam' as ShiftType, label: 'Shift Malam (18:00 - 23:00)', icon: Moon, jamMulai: '18:00', jamSelesai: '23:00' },
];

export const EditDriverModal: React.FC<EditDriverModalProps> = ({
  isOpen,
  onClose,
  report,
  reports = [],
  masterPresets,
  onSave,
  onDelete,
}) => {
  const drivers = masterPresets.drivers && masterPresets.drivers.length > 0
    ? masterPresets.drivers
    : defaultMasterDrivers;

  const vehicles = masterPresets.vehicles && masterPresets.vehicles.length > 0
    ? masterPresets.vehicles
    : defaultMasterVehicles;

  const [driver, setDriver] = useState(report.driver || '');
  const [driverHp, setDriverHp] = useState(report.driverHp || '');
  const [driverId, setDriverId] = useState(report.driverId || '');
  const [kendaraan, setKendaraan] = useState(report.kendaraan || '');
  const [platNomor, setPlatNomor] = useState(report.platNomor || '');
  const [vehicleId, setVehicleId] = useState(report.vehicleId || '');
  const [kapasitas, setKapasitas] = useState(report.kapasitas || 7);
  const [namaKereta, setNamaKereta] = useState(report.namaKereta || '');
  const [tanggal, setTanggal] = useState(report.tanggal || '');
  const [jamMulai, setJamMulai] = useState(report.jamMulai || '05:00');
  const [jamSelesai, setJamSelesai] = useState(report.jamSelesai || '12:00');
  const [statusTugas, setStatusTugas] = useState<'aktif' | 'selesai'>(report.statusTugas || 'aktif');
  const [catatanHeader, setCatatanHeader] = useState(report.catatanHeader || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDriver(report.driver || '');
      setDriverHp(report.driverHp || '');
      setDriverId(report.driverId || '');
      setKendaraan(report.kendaraan || '');
      setPlatNomor(report.platNomor || '');
      setVehicleId(report.vehicleId || '');
      setKapasitas(report.kapasitas || 7);
      setNamaKereta(report.namaKereta || '');
      setTanggal(report.tanggal || '');
      setJamMulai(report.jamMulai || '05:00');
      setJamSelesai(report.jamSelesai || '12:00');
      setStatusTugas(report.statusTugas || 'aktif');
      setCatatanHeader(report.catatanHeader || '');
      setShowDeleteConfirm(false);
      setErrorMsg('');
    }
  }, [isOpen, report]);

  if (!isOpen) return null;

  const filledCount = getFilledRows(report.rows).length;
  const currentShiftType = detectShiftType(jamMulai, jamSelesai, catatanHeader);

  // Shift status calculations for current driver & vehicle in other reports on this date
  const driverShiftStatus = getDriverShiftsOnDate(
    reports,
    tanggal,
    driverId || driver,
    report.id
  );

  const vehicleShiftStatus = getVehicleShiftsOnDate(
    reports,
    tanggal,
    vehicleId || platNomor || kendaraan,
    report.id
  );

  const hasDriverShiftConflict = statusTugas === 'aktif' && !driverShiftStatus.canWorkOnShift(currentShiftType);
  const hasVehicleShiftConflict = statusTugas === 'aktif' && !vehicleShiftStatus.canUseOnShift(currentShiftType);

  const handleSelectDriver = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const found = drivers.find((d) => d.id === val || d.nama === val);
    if (found) {
      setDriver(found.nama);
      setDriverHp(found.hp || '');
      setDriverId(found.id);
    } else {
      setDriver(val);
      setDriverId('');
    }
    if (errorMsg) setErrorMsg('');
  };

  const handleSelectVehicle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const found = vehicles.find((v) => v.id === val || v.platNomor === val);
    if (found) {
      setKendaraan(found.model);
      setPlatNomor(found.platNomor);
      setVehicleId(found.id);
      setKapasitas(found.kapasitas || 7);
    } else {
      setKendaraan(val);
      setVehicleId('');
    }
    if (errorMsg) setErrorMsg('');
  };

  const handleApplyShiftPreset = (preset: typeof SHIFT_PRESET_BUTTONS[0]) => {
    setJamMulai(preset.jamMulai);
    setJamSelesai(preset.jamSelesai);
    setCatatanHeader(SHIFT_DEFINITIONS[preset.type].label);
    if (errorMsg) setErrorMsg('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver.trim()) {
      setErrorMsg('Nama pengemudi / driver tidak boleh kosong!');
      return;
    }
    if (!tanggal.trim()) {
      setErrorMsg('Tanggal operasional tidak boleh kosong!');
      return;
    }

    const targetShift = detectShiftType(jamMulai, jamSelesai, catatanHeader);
    const finalKendaraan = kendaraan.trim() || report.kendaraan || 'Armada Standar';
    const finalPlatNomor = platNomor.trim().toUpperCase() || report.platNomor || '-';

    onSave({
      driver: driver.trim(),
      driverHp: driverHp.trim(),
      driverId: driverId || undefined,
      kendaraan: finalKendaraan,
      platNomor: finalPlatNomor,
      vehicleId: vehicleId || undefined,
      kapasitas: Number(kapasitas) || 7,
      namaKereta: namaKereta.trim(),
      tanggal: tanggal.trim(),
      jamMulai: jamMulai.trim() || '05:00',
      jamSelesai: jamSelesai.trim() || '12:00',
      statusTugas,
      waktuSelesaiActual: statusTugas === 'selesai' ? (report.waktuSelesaiActual || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })) : undefined,
      catatanHeader: catatanHeader.trim() || SHIFT_DEFINITIONS[targetShift].label,
      title: `Laporan ${finalKendaraan}${namaKereta.trim() ? ` (${namaKereta.trim()})` : ''}`,
    });
    onClose();
  };

  const handleDeleteConfirm = () => {
    onDelete(report.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Edit Data Driver & Armada</h3>
              <p className="text-xs text-slate-300">Ubah info driver, mobil, shift operasional, atau status tugas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation View */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-950 mb-1">
                  Hapus Lembar Tugas Driver Ini?
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Anda akan menghapus lembar tugas <strong>{report.kendaraan || 'Armada'}</strong> dengan driver <strong>{report.driver || 'Driver'}</strong> ({report.tanggal}).
                  {filledCount > 0 ? (
                    <span className="block mt-2 font-bold text-emerald-800 bg-emerald-100/90 p-2.5 rounded-xl border border-emerald-300 shadow-2xs">
                      ✓ Penumpang Aman: Sebanyak {filledCount} data penumpang di lembar ini TIDAK AKAN HILANG dan otomatis dikembalikan ke Daftar Antrian Penumpang agar dapat ditugaskan kembali ke driver lain.
                    </span>
                  ) : (
                    <span className="block mt-1 text-slate-600">
                      Lembar tugas ini belum memiliki penumpang.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Lembar Ini</span>
              </button>
            </div>
          </div>
        ) : (
          /* Main Form */
          <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Status Tugas Toggle */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Status Operasional Tugas *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatusTugas('aktif')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${
                    statusTugas === 'aktif'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                  <span>🟢 Sedang Bertugas (Aktif)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusTugas('selesai')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${
                    statusTugas === 'selesai'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>✅ Selesai (Tersedia)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {statusTugas === 'selesai'
                  ? '💡 Status "Selesai" membebaskan driver dan kendaraan sehingga siap ditugaskan untuk shift berikutnya pada tanggal ini.'
                  : '⚠️ Status "Aktif" menandakan driver & mobil sedang bertugas pada shift ini.'}
              </p>
            </div>

            {/* Tanggal Operasional */}
            <div>
              <DateSelectionBar
                value={tanggal}
                onChange={(newDate) => {
                  setTanggal(newDate);
                  if (errorMsg) setErrorMsg('');
                }}
                label="Tanggal Tugas Operasional *"
                accent="indigo"
              />
            </div>

            {/* Jam Tugas & Presets */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Shift & Jam Tugas</span>
                </label>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${SHIFT_DEFINITIONS[currentShiftType].badgeClass}`}>
                  {SHIFT_DEFINITIONS[currentShiftType].shortName}
                </span>
              </div>

              {/* Shift Presets Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {SHIFT_PRESET_BUTTONS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = currentShiftType === preset.type;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyShiftPreset(preset)}
                      className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all border ${
                        isSelected
                          ? preset.type === 'pagi'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : preset.type === 'siang'
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{preset.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Jam Mulai</label>
                  <input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Jam Selesai</label>
                  <input
                    type="time"
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Driver Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pengemudi / Driver *</span>
              </label>
              
              <div className="relative mb-2">
                <select
                  value={driverId || driver}
                  onChange={handleSelectDriver}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-xs"
                >
                  <option value="">-- Pilih dari Master Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama} {d.hp ? `(${d.hp})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={driver}
                  onChange={(e) => {
                    setDriver(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Nama Driver"
                  className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={driverHp}
                  onChange={(e) => setDriverHp(e.target.value)}
                  placeholder="No. HP / WA (0812...)"
                  className="px-3 py-2 text-xs sm:text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Kendaraan & Plat */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-600" />
                <span>Armada Kendaraan & Plat Nomor (Opsional)</span>
              </label>

              <div className="relative mb-2">
                <select
                  value={vehicleId || platNomor}
                  onChange={handleSelectVehicle}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none shadow-xs"
                >
                  <option value="">-- Pilih dari Master Kendaraan (Opsional) --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.model} [{v.platNomor}] ({v.kapasitas || 7} Kursi)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={kendaraan}
                  onChange={(e) => {
                    setKendaraan(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Model Kendaraan"
                  className="px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  value={platNomor}
                  onChange={(e) => setPlatNomor(e.target.value.toUpperCase())}
                  placeholder="Plat Nomor"
                  className="px-3 py-2 text-xs sm:text-sm font-mono font-bold uppercase text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Kereta / Rute */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider mb-1.5">
                <Train className="w-3.5 h-3.5 text-blue-600" />
                <span>Nama Kereta / Rute Penjemputan</span>
              </label>
              <input
                type="text"
                value={namaKereta}
                onChange={(e) => setNamaKereta(e.target.value)}
                placeholder="Contoh: BIB/RGA"
                className="w-full px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Catatan Tambahan */}
            <div>
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Catatan Header</span>
              </label>
              <input
                type="text"
                value={catatanHeader}
                onChange={(e) => setCatatanHeader(e.target.value)}
                placeholder="Misal: Shift Pagi / Kumpul Stasiun Barat"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Lembar</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

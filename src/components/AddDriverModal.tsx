import React, { useState, useEffect } from 'react';
import { 
  X, 
  Car, 
  User, 
  Train, 
  Calendar, 
  Check, 
  Plus, 
  AlertCircle,
  FileText,
  Phone,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  Info,
  Clock,
  Sun,
  Sunrise,
  Moon,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { MasterPresets, MasterDriver, MasterVehicle, ReportDocument } from '../types';
import { DatePickerInput } from './DatePickerInput';
import { formatIndonesianDate } from '../utils/date';
import { defaultMasterDrivers, defaultMasterVehicles, defaultJadwalList } from '../utils/spreadsheet';
import { 
  detectShiftType, 
  getDriverShiftsOnDate, 
  getVehicleShiftsOnDate, 
  SHIFT_DEFINITIONS, 
  ShiftType 
} from '../utils/shift';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  initialJam?: string;
  masterPresets: MasterPresets;
  reports?: ReportDocument[];
  onSave: (data: {
    driver: string;
    driverHp?: string;
    driverId?: string;
    kendaraan: string;
    platNomor?: string;
    vehicleId?: string;
    kapasitas?: number;
    namaKereta: string;
    tanggal: string;
    jamMulai?: string;
    jamSelesai?: string;
    catatanHeader?: string;
  }) => void;
  onOpenMasterData?: (tab?: 'drivers' | 'vehicles' | 'kereta' | 'jemputAntar' | 'jadwal') => void;
}

export const AddDriverModal: React.FC<AddDriverModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialJam,
  masterPresets,
  reports = [],
  onSave,
  onOpenMasterData,
}) => {
  const [tanggal, setTanggal] = useState<string>(() => initialDate || formatIndonesianDate(new Date()));
  
  // Available lists with fallback defaults
  const drivers = masterPresets.drivers && masterPresets.drivers.length > 0
    ? masterPresets.drivers
    : defaultMasterDrivers;

  const vehicles = masterPresets.vehicles && masterPresets.vehicles.length > 0
    ? masterPresets.vehicles
    : defaultMasterVehicles;

  const activeDrivers = React.useMemo(() => drivers.filter((d) => d.status !== 'nonaktif'), [drivers]);
  const activeVehicles = React.useMemo(() => vehicles.filter((v) => v.status !== 'nonaktif'), [vehicles]);

  const operationalSchedules = masterPresets.jadwalList && masterPresets.jadwalList.length > 0
    ? masterPresets.jadwalList
    : defaultJadwalList;

  // Selected state
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [showCustomVehicle, setShowCustomVehicle] = useState(false);
  const [namaKereta, setNamaKereta] = useState<string>(() => masterPresets.keretaList[0] || 'BIB/RGA');
  const [jamMulai, setJamMulai] = useState<string>(() => initialJam || '05:30');
  const [jamSelesai, setJamSelesai] = useState<string>('08:30');
  const [catatanHeader, setCatatanHeader] = useState<string>(() => `Jadwal ${initialJam || '05:30'} WIB`);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Quick inline add toggles
  const [isQuickAddDriver, setIsQuickAddDriver] = useState(false);
  const [quickDriverNama, setQuickDriverNama] = useState('');
  const [quickDriverHp, setQuickDriverHp] = useState('');

  const [isQuickAddVehicle, setIsQuickAddVehicle] = useState(false);
  const [quickVehicleModel, setQuickVehicleModel] = useState('');
  const [quickVehiclePlat, setQuickVehiclePlat] = useState('');

  // Selected shift based on start time / header
  const currentShiftType = detectShiftType(jamMulai, jamSelesai, catatanHeader);

  // Set initial selections ONLY when modal opens
  useEffect(() => {
    if (isOpen) {
      setTanggal(initialDate || formatIndonesianDate(new Date()));
      setErrorMsg('');
      setIsQuickAddDriver(false);
      setIsQuickAddVehicle(false);
      setShowCustomVehicle(false);

      const targetJam = initialJam || operationalSchedules[0] || '05:30';
      setJamMulai(targetJam);
      const [h, m] = targetJam.split(':').map(Number);
      const endH = (h + 3) % 24;
      setJamSelesai(`${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`);
      setCatatanHeader(`Jadwal ${targetJam} WIB`);

      if (activeDrivers.length > 0) {
        setSelectedDriverId(activeDrivers[0].id);
        if (activeDrivers[0].mobil) {
          const matchedV = activeVehicles.find(
            (v) => v.model.toLowerCase() === activeDrivers[0].mobil?.toLowerCase() || v.platNomor === activeDrivers[0].platNomor
          );
          if (matchedV) setSelectedVehicleId(matchedV.id);
        }
      }
      if (activeVehicles.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(activeVehicles[0].id);
      }
    }
  }, [isOpen, initialDate, initialJam]);

  // Sync paired car automatically when driver changes
  useEffect(() => {
    const drv = activeDrivers.find((d) => d.id === selectedDriverId);
    if (drv && drv.mobil) {
      const matchedV = activeVehicles.find(
        (v) => v.model.toLowerCase() === drv.mobil?.toLowerCase() || v.platNomor === drv.platNomor
      );
      if (matchedV) {
        setSelectedVehicleId(matchedV.id);
      }
    }
  }, [selectedDriverId, activeDrivers, activeVehicles]);

  if (!isOpen) return null;

  const existingReportsOnDate = reports.filter((r) => r.tanggal === tanggal);

  // Current selected driver and vehicle objects
  const currentSelectedDriver = activeDrivers.find((d) => d.id === selectedDriverId);
  const matchedDriverVehicle = activeVehicles.find(
    (v) =>
      (currentSelectedDriver?.mobil && v.model.toLowerCase() === currentSelectedDriver.mobil.toLowerCase()) ||
      (currentSelectedDriver?.platNomor && v.platNomor.toLowerCase() === currentSelectedDriver.platNomor.toLowerCase())
  );
  const currentSelectedVehicle = activeVehicles.find((v) => v.id === selectedVehicleId);

  // Auto-resolved vehicle info so user does not need to choose a car
  const autoVehicleModel =
    currentSelectedVehicle?.model ||
    matchedDriverVehicle?.model ||
    currentSelectedDriver?.mobil ||
    activeVehicles[0]?.model ||
    'Armada Standar';

  const autoVehiclePlat =
    currentSelectedVehicle?.platNomor ||
    matchedDriverVehicle?.platNomor ||
    currentSelectedDriver?.platNomor ||
    activeVehicles[0]?.platNomor ||
    '-';

  const autoKapasitas =
    currentSelectedVehicle?.kapasitas ||
    matchedDriverVehicle?.kapasitas ||
    activeVehicles[0]?.kapasitas ||
    7;

  const autoVehicleId =
    currentSelectedVehicle?.id ||
    matchedDriverVehicle?.id ||
    activeVehicles[0]?.id;

  // Existing tasks of this driver on this date
  const targetDriverIdent = isQuickAddDriver 
    ? quickDriverNama.trim().toLowerCase() 
    : (currentSelectedDriver?.nama?.toLowerCase().trim() || '');

  const driverTasksOnDate = reports.filter((r) => {
    if (r.tanggal !== tanggal) return false;
    if (!targetDriverIdent) return false;
    return (
      (r.driver && r.driver.toLowerCase().trim() === targetDriverIdent) ||
      (r.driverId && r.driverId === currentSelectedDriver?.id)
    );
  });

  const handleApplyScheduleTime = (timeStr: string) => {
    setJamMulai(timeStr);
    const [h, m] = timeStr.split(':').map(Number);
    const endH = (h + 3) % 24;
    setJamSelesai(`${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`);
    setCatatanHeader(`Jadwal ${timeStr} WIB`);
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Resolve Driver Info
    let finalDriverName = '';
    let finalDriverHp = '';
    let finalDriverId: string | undefined = undefined;

    if (isQuickAddDriver) {
      if (!quickDriverNama.trim()) {
        setErrorMsg('Nama driver baru wajib diisi!');
        return;
      }
      finalDriverName = quickDriverNama.trim();
      finalDriverHp = quickDriverHp.trim();
    } else {
      if (!currentSelectedDriver) {
        setErrorMsg('Pilih driver dari daftar master!');
        return;
      }
      finalDriverName = currentSelectedDriver.nama;
      finalDriverHp = currentSelectedDriver.hp || '';
      finalDriverId = currentSelectedDriver.id;
    }

    // 2. Resolve Vehicle Info (Tidak perlu memilih mobil)
    let finalVehicleModel = autoVehicleModel;
    let finalPlatNomor = autoVehiclePlat;
    let finalVehicleId: string | undefined = autoVehicleId;
    let finalKapasitas = autoKapasitas;

    if (showCustomVehicle) {
      if (isQuickAddVehicle) {
        if (quickVehicleModel.trim()) {
          finalVehicleModel = quickVehicleModel.trim();
          finalPlatNomor = quickVehiclePlat.trim().toUpperCase() || '-';
          finalVehicleId = undefined;
          finalKapasitas = 7;
        }
      } else if (currentSelectedVehicle) {
        finalVehicleModel = currentSelectedVehicle.model;
        finalPlatNomor = currentSelectedVehicle.platNomor || '-';
        finalVehicleId = currentSelectedVehicle.id;
        finalKapasitas = currentSelectedVehicle.kapasitas || 7;
      }
    }

    if (!tanggal.trim()) {
      setErrorMsg('Tanggal operasional wajib dipilih!');
      return;
    }

    const targetShift = detectShiftType(jamMulai, jamSelesai, catatanHeader);

    // Driver can be scheduled at any hour without waiting for previous tasks to finish
    setErrorMsg('');
    onSave({
      driver: finalDriverName,
      driverHp: finalDriverHp,
      driverId: finalDriverId,
      kendaraan: finalVehicleModel,
      platNomor: finalPlatNomor,
      vehicleId: finalVehicleId,
      kapasitas: finalKapasitas,
      namaKereta: namaKereta.trim() || 'BIB/RGA',
      tanggal: tanggal.trim(),
      jamMulai: jamMulai.trim() || '05:00',
      jamSelesai: jamSelesai.trim() || '12:00',
      catatanHeader: catatanHeader.trim() || SHIFT_DEFINITIONS[targetShift].label,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Tugaskan Driver</h3>
              <p className="text-xs text-slate-300">
                Driver dapat ditugaskan di jam berapapun tanpa menunggu tugas selesai
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4.5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-shake">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* 1. Tanggal Penugasan */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
            <DatePickerInput
              value={tanggal}
              onChange={(newDate) => {
                setTanggal(newDate);
                if (errorMsg) setErrorMsg('');
              }}
              label="1. TANGGAL PENUGASAN OPERASIONAL *"
            />
            {existingReportsOnDate.length > 0 && (
              <p className="text-[11px] text-indigo-700 font-medium px-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>
                  Ada {existingReportsOnDate.length} tugas armada pada tanggal {tanggal}. Driver dapat ditugaskan di jam berapapun secara fleksibel.
                </span>
              </p>
            )}
          </div>

          {/* 2. Jam Tugas & Jadwal Operasional */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>2. Pilih Jam Jadwal Tugas *</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  {operationalSchedules.length} Jadwal
                </span>
                {onOpenMasterData && (
                  <button
                    type="button"
                    onClick={() => onOpenMasterData('jadwal')}
                    className="text-[11px] text-purple-600 hover:text-purple-800 font-bold hover:underline"
                    title="Edit 6 Jam Jadwal di Master Data"
                  >
                    ⚙️ Edit Jadwal
                  </button>
                )}
              </div>
            </div>

            {/* Quick 6 Schedule Chips */}
            <div>
              <p className="text-[11px] text-slate-500 mb-1.5">
                Pilih salah satu jam operasional atau sesuaikan jam manual (bisa dijam berapapun):
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {operationalSchedules.map((timeStr) => {
                  const isSelected = jamMulai === timeStr;
                  return (
                    <button
                      key={timeStr}
                      type="button"
                      onClick={() => handleApplyScheduleTime(timeStr)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-0.5 transition-all border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                          : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{timeStr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Time Input */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Jam Mulai Tugas
                </label>
                <input
                  type="time"
                  value={jamMulai}
                  onChange={(e) => {
                    setJamMulai(e.target.value);
                    setCatatanHeader(`Jadwal ${e.target.value} WIB`);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Perkiraan Jam Selesai
                </label>
                <input
                  type="time"
                  value={jamSelesai}
                  onChange={(e) => {
                    setJamSelesai(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Pilih Driver Bertugas */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <User className="w-4 h-4 text-indigo-600" />
                <span>3. Pilih Driver Bertugas *</span>
              </label>
              
              <button
                type="button"
                onClick={() => setIsQuickAddDriver(!isQuickAddDriver)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{isQuickAddDriver ? 'Pilih dari Master' : '+ Driver Baru'}</span>
              </button>
            </div>

            {!isQuickAddDriver ? (
              <div>
                <div className="relative">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => {
                      setSelectedDriverId(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-xs"
                  >
                    {activeDrivers.map((d) => {
                      const dTasks = reports.filter(
                        (r) =>
                          r.tanggal === tanggal &&
                          ((r.driver && r.driver.toLowerCase().trim() === d.nama.toLowerCase().trim()) ||
                            r.driverId === d.id)
                      );
                      const taskBadge =
                        dTasks.length > 0
                          ? `• (${dTasks.length} tugas hari ini: ${dTasks.map((t) => t.jamMulai || 'Jadwal').join(', ')})`
                          : '• (Siap Bertugas)';

                      return (
                        <option
                          key={d.id}
                          value={d.id}
                          className="text-slate-900 font-bold"
                        >
                          {d.nama} {d.mobil ? `• ${d.mobil} [${d.platNomor || '-'}]` : ''} {taskBadge}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                {/* Driver Status Live Banner */}
                {currentSelectedDriver && (
                  <div className="mt-2 space-y-1.5">
                    {driverTasksOnDate.length > 0 ? (
                      <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="text-[11px] leading-tight">
                          <strong>{currentSelectedDriver.nama}</strong> memiliki {driverTasksOnDate.length} tugas pada tanggal {tanggal} ({driverTasksOnDate.map((t) => t.jamMulai || 'Jadwal').join(', ')}). <strong>Dapat langsung ditugaskan di jam {jamMulai} WIB tanpa menunggu selesai!</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="flex items-center gap-1 font-mono text-emerald-700 font-semibold">
                          <Phone className="w-3 h-3" />
                          {currentSelectedDriver.hp || 'No HP belum dicatat'}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          ✅ Siap Bertugas di Jam {jamMulai} WIB
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Quick Add Driver Form */
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-2 animate-in fade-in duration-100">
                <div className="text-[11px] font-bold text-indigo-900">
                  Input Cepat Driver Baru (langsung ditugaskan):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={quickDriverNama}
                    onChange={(e) => setQuickDriverNama(e.target.value)}
                    placeholder="Nama Driver, misal: Pak Joko"
                    className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={quickDriverHp}
                    onChange={(e) => setQuickDriverHp(e.target.value)}
                    placeholder="No. HP / WA (0812...)"
                    className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Armada Kendaraan (Otomatis & Tidak Perlu Memilih) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    4. Armada Kendaraan (Otomatis)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tidak perlu memilih mobil — otomatis disiapkan dari data driver / armada standar
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCustomVehicle(!showCustomVehicle)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline shrink-0"
              >
                {showCustomVehicle ? 'Sembunyikan' : '⚙️ Sesuaikan Mobil (Opsional)'}
              </button>
            </div>

            {/* Auto-resolved vehicle preview */}
            <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">{autoVehicleModel}</span>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {autoVehiclePlat}
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Kapasitas: {autoKapasitas} Kursi
              </span>
            </div>

            {/* Optional Custom Vehicle Picker */}
            {showCustomVehicle && (
              <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600">Pilih Armada Pengganti:</span>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddVehicle(!isQuickAddVehicle)}
                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isQuickAddVehicle ? 'Pilih dari Master' : '+ Mobil Baru'}</span>
                  </button>
                </div>

                {!isQuickAddVehicle ? (
                  <div className="relative">
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => {
                        setSelectedVehicleId(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none shadow-xs"
                    >
                      {activeVehicles.map((v) => (
                        <option key={v.id} value={v.id} className="text-slate-900 font-bold">
                          {v.model} [{v.platNomor}] (Kapasitas: {v.kapasitas || 7} Kursi)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                    <div className="text-[11px] font-bold text-emerald-900">
                      Input Cepat Mobil & Plat Nomor Baru:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={quickVehicleModel}
                        onChange={(e) => setQuickVehicleModel(e.target.value)}
                        placeholder="Model Mobil (Luxio, HiAce, Avanza)"
                        className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                      <input
                        type="text"
                        value={quickVehiclePlat}
                        onChange={(e) => setQuickVehiclePlat(e.target.value.toUpperCase())}
                        placeholder="Plat Nomor (N 1234 XX)"
                        className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold uppercase"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Nama Kereta / Rute Penjemputan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Train className="w-3.5 h-3.5 text-blue-600" />
              <span>5. Nama Kereta / Rute</span>
            </label>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {masterPresets.keretaList.map((kereta) => (
                <button
                  key={kereta}
                  type="button"
                  onClick={() => setNamaKereta(kereta)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                    namaKereta.toLowerCase() === kereta.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {kereta}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={namaKereta}
              onChange={(e) => setNamaKereta(e.target.value)}
              placeholder="Contoh: BIB/RGA, ARGO-01, BIB, RGA"
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* 6. Catatan Tambahan (Opsional) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Catatan Tambahan (Opsional)</span>
            </label>
            <input
              type="text"
              value={catatanHeader}
              onChange={(e) => setCatatanHeader(e.target.value)}
              placeholder="Misal: Shift Pagi / Kumpul Stasiun Barat / Jam 04:30"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-400 font-normal text-slate-800"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5">
            {onOpenMasterData && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMasterData();
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                ⚙️ Kelola Master Data
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Tugaskan Driver ({jamMulai} WIB)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

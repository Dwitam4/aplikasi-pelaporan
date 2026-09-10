import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  UserPlus, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Navigation, 
  FileText, 
  Car, 
  Clock, 
  Check, 
  AlertCircle,
  AlertTriangle,
  Users,
  PlaneTakeoff,
  PlaneLanding,
  Sparkles,
  Inbox,
  ArrowRight,
  Plus,
  Minus,
  Info
} from 'lucide-react';
import { ReportDocument, MasterPresets, ReportRow, TripType } from '../types';
import { DatePickerInput } from './DatePickerInput';
import { formatIndonesianDate } from '../utils/date';
import { getFilledRows, defaultJadwalList } from '../utils/spreadsheet';

interface AddPassengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportDocument[];
  currentReport?: ReportDocument;
  initialDate?: string;
  initialJam?: string;
  initialMode?: 'queue' | 'auto' | 'manual';
  presets: MasterPresets;
  onSavePassenger: (data: {
    targetReportId?: string; // If undefined, saved to unassigned queue!
    passenger?: Omit<ReportRow, 'id' | 'no'>;
    passengers?: Array<Omit<ReportRow, 'id' | 'no'>>;
    tanggal: string;
  }) => void;
  onOpenAddDriverModal: (date: string, jam?: string) => void;
}

export const AddPassengerModal: React.FC<AddPassengerModalProps> = ({
  isOpen,
  onClose,
  reports,
  currentReport,
  initialDate,
  initialJam,
  initialMode,
  presets,
  onSavePassenger,
  onOpenAddDriverModal,
}) => {
  const [tanggal, setTanggal] = useState<string>(() => 
    initialDate || currentReport?.tanggal || formatIndonesianDate(new Date())
  );

  // Operational schedule list from presets (6 slots)
  const operationalSchedules = presets.jadwalList && presets.jadwalList.length > 0
    ? presets.jadwalList
    : defaultJadwalList;

  // Passenger fields
  const [jam, setJam] = useState<string>('05:30');
  const [tripType, setTripType] = useState<TripType>('keberangkatan');
  const [nama, setNama] = useState('');
  const [hp, setHp] = useState('');
  // Default Keberangkatan: Antar ke Stasiun, Jemput dari alamat/penumpang (bisa diedit)
  // Default Kedatangan: Jemput dari Stasiun, Antar ke alamat/tujuan (bisa diedit)
  const [jemput, setJemput] = useState<string>('');
  const [antar, setAntar] = useState<string>('Stasiun');
  const [keterangan, setKeterangan] = useState('');

  // Handler for trip type switch that adapts defaults while allowing user to edit
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

  // Multi-passenger booking states (1 pemesan bisa pesan untuk beberapa orang)
  const [jumlahOrang, setJumlahOrang] = useState<number>(1);
  const [additionalNames, setAdditionalNames] = useState<Record<number, string>>({});
  const [isDetailNamesOpen, setIsDetailNamesOpen] = useState<boolean>(true);

  // Driver Assignment Mode: 'queue' (Entry dulu, pilih driver nanti) | 'auto' (Otomatis) | 'manual' (Pilih driver)
  const [assignmentMode, setAssignmentMode] = useState<'queue' | 'auto' | 'manual'>('auto');
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // Available drivers on chosen date
  const availableReportsForDate = useMemo(() => {
    return reports.filter((r) => r.tanggal === tanggal);
  }, [reports, tanggal]);

  // Drivers on date matching chosen jam
  const matchingDrivers = useMemo(() => {
    return availableReportsForDate.filter((r) => {
      if (!r.jamMulai) return false;
      return r.jamMulai.trim() === jam.trim() || r.jamMulai.startsWith(jam.substring(0, 2));
    });
  }, [availableReportsForDate, jam]);

  // Helper to count passengers for specific trip direction (Keberangkatan & Kedatangan are independent)
  const getFilledForTrip = (rows: ReportRow[], targetTrip: TripType) => {
    return getFilledRows(rows).filter((r) => (r.tripType || 'keberangkatan') === targetTrip).length;
  };

  // Best auto-assigned driver with enough seats for jumlahOrang on the specific trip direction
  const autoTargetReport = useMemo(() => {
    // 1. Prefer driver with matching jam AND enough remaining seats for this trip direction
    const matchingWithEnoughSeats = matchingDrivers.find((r) => {
      const filled = getFilledForTrip(r.rows, tripType);
      const cap = r.kapasitas || 7;
      const remaining = Math.max(0, cap - filled);
      return remaining >= jumlahOrang;
    });
    if (matchingWithEnoughSeats) return matchingWithEnoughSeats;

    // 2. Fallback: any driver on that date with enough remaining seats for this trip direction
    const anyWithEnoughSeats = availableReportsForDate.find((r) => {
      const filled = getFilledForTrip(r.rows, tripType);
      const cap = r.kapasitas || 7;
      const remaining = Math.max(0, cap - filled);
      return remaining >= jumlahOrang;
    });
    if (anyWithEnoughSeats) return anyWithEnoughSeats;

    // 3. If no driver has enough seats for the requested count, return the one with the most seats
    if (availableReportsForDate.length > 0) {
      const sortedBySeats = [...availableReportsForDate].sort((a, b) => {
        const remainingA = (a.kapasitas || 7) - getFilledForTrip(a.rows, tripType);
        const remainingB = (b.kapasitas || 7) - getFilledForTrip(b.rows, tripType);
        return remainingB - remainingA;
      });
      return sortedBySeats[0];
    }

    return null;
  }, [availableReportsForDate, matchingDrivers, jumlahOrang, tripType]);

  // Selected report object
  const selectedReport = useMemo(() => {
    if (assignmentMode === 'auto') {
      return autoTargetReport;
    }
    const found = availableReportsForDate.find((r) => r.id === selectedReportId);
    return found || availableReportsForDate[0] || null;
  }, [assignmentMode, autoTargetReport, availableReportsForDate, selectedReportId]);

  // Capacity calculations for this specific trip direction (Keberangkatan / Kedatangan independent)
  const selectedFilledCount = selectedReport ? getFilledForTrip(selectedReport.rows, tripType) : 0;
  const selectedCapacity = selectedReport ? (selectedReport.kapasitas || 7) : 7;
  const selectedRemainingSeats = Math.max(0, selectedCapacity - selectedFilledCount);
  const isSelectedVehicleFull = selectedRemainingSeats <= 0;
  const hasEnoughSeatsInSelected = selectedRemainingSeats >= jumlahOrang;

  // Max capacity on this date for the selected trip direction
  const maxRemainingSeatsOnDate = useMemo(() => {
    if (availableReportsForDate.length === 0) return 0;
    return Math.max(0, ...availableReportsForDate.map((r) => {
      const filled = getFilledForTrip(r.rows, tripType);
      const cap = r.kapasitas || 7;
      return cap - filled;
    }));
  }, [availableReportsForDate, tripType]);

  // Ceiling for jumlahOrang based on mode & capacity
  const maxAllowedSeats = useMemo(() => {
    if (assignmentMode === 'queue' || availableReportsForDate.length === 0) {
      // In queue mode or when no driver yet, can book up to full fleet capacity (e.g. 14)
      return 14;
    }
    if (selectedReport) {
      return selectedRemainingSeats > 0 ? selectedRemainingSeats : 1;
    }
    return maxRemainingSeatsOnDate > 0 ? maxRemainingSeatsOnDate : 1;
  }, [assignmentMode, selectedReport, selectedRemainingSeats, maxRemainingSeatsOnDate, availableReportsForDate]);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      const dateToSet = initialDate || currentReport?.tanggal || formatIndonesianDate(new Date());
      setTanggal(dateToSet);
      setNama('');
      setHp('');
      setJemput(presets.jemputList[0] || '');
      setAntar(presets.antarList[0] || '✓');
      setKeterangan('');
      setTripType('keberangkatan');
      setJumlahOrang(1);
      setAdditionalNames({});

      const startJam = initialJam || currentReport?.jamMulai || operationalSchedules[0] || '05:30';
      setJam(startJam);

      if (initialMode) {
        setAssignmentMode(initialMode);
      } else if (currentReport) {
        setSelectedReportId(currentReport.id);
        setAssignmentMode('auto');
      } else {
        setAssignmentMode('auto');
      }
    }
  }, [isOpen, currentReport, initialDate, initialJam, initialMode]);

  // Handle seat quantity change
  const handleSetJumlahOrang = (newCount: number) => {
    const clamped = Math.max(1, Math.min(newCount, maxAllowedSeats));
    setJumlahOrang(clamped);
  };

  const handleUpdateAdditionalName = (seatIdx: number, val: string) => {
    setAdditionalNames((prev) => ({
      ...prev,
      [seatIdx]: val,
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    // Validate seat availability if assigning directly to a driver
    if (assignmentMode !== 'queue') {
      if (!selectedReport) {
        // Fallback to queue if no driver exists
        savePassengersToQueue();
        onClose();
        return;
      }

      if (!hasEnoughSeatsInSelected) {
        // Warning: not enough seats
        return;
      }
    }

    const bookingGroupId = jumlahOrang > 1 
      ? `grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` 
      : undefined;

    const passengersList: Array<Omit<ReportRow, 'id' | 'no'>> = [];

    for (let i = 0; i < jumlahOrang; i++) {
      const seatNum = i + 1;
      let passengerName = '';
      if (i === 0) {
        passengerName = nama.trim();
      } else {
        const customName = additionalNames[seatNum]?.trim();
        passengerName = customName || `${nama.trim()} (${seatNum})`;
      }

      const passengerNote = jumlahOrang > 1
        ? `${keterangan.trim() ? `${keterangan.trim()} • ` : ''}[Rombongan ${jumlahOrang} Orang: Kursi ${seatNum}/${jumlahOrang} - Pemesan: ${nama.trim()}]`
        : keterangan.trim();

      passengersList.push({
        jam: jam.trim(),
        tripType,
        nama: passengerName,
        hp: hp.trim(),
        jemput: jemput.trim(),
        antar: antar.trim(),
        keterangan: passengerNote,
        status: 'proses',
        kehadiran: 'belum_datang',
        bookingGroupId,
        bookerName: nama.trim(),
        totalSeatsInBooking: jumlahOrang,
        seatIndex: seatNum,
      });
    }

    if (assignmentMode === 'queue') {
      onSavePassenger({
        targetReportId: undefined,
        passengers: passengersList,
        passenger: passengersList[0],
        tanggal,
      });
    } else {
      onSavePassenger({
        targetReportId: selectedReport?.id,
        passengers: passengersList,
        passenger: passengersList[0],
        tanggal,
      });
    }

    onClose();
  };

  const savePassengersToQueue = () => {
    const bookingGroupId = jumlahOrang > 1 
      ? `grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` 
      : undefined;

    const passengersList: Array<Omit<ReportRow, 'id' | 'no'>> = [];
    for (let i = 0; i < jumlahOrang; i++) {
      const seatNum = i + 1;
      const passengerName = i === 0 
        ? nama.trim() 
        : (additionalNames[seatNum]?.trim() || `${nama.trim()} (${seatNum})`);

      const passengerNote = jumlahOrang > 1
        ? `${keterangan.trim() ? `${keterangan.trim()} • ` : ''}[Rombongan ${jumlahOrang} Orang: Kursi ${seatNum}/${jumlahOrang} - Pemesan: ${nama.trim()}]`
        : keterangan.trim();

      passengersList.push({
        jam: jam.trim(),
        tripType,
        nama: passengerName,
        hp: hp.trim(),
        jemput: jemput.trim(),
        antar: antar.trim(),
        keterangan: passengerNote,
        status: 'proses',
        kehadiran: 'belum_datang',
        bookingGroupId,
        bookerName: nama.trim(),
        totalSeatsInBooking: jumlahOrang,
        seatIndex: seatNum,
      });
    }

    onSavePassenger({
      targetReportId: undefined,
      passengers: passengersList,
      passenger: passengersList[0],
      tanggal,
    });
  };

  const hasDriversOnDate = availableReportsForDate.length > 0;
  const hasMatchingDriverOnJam = matchingDrivers.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Input Pemesanan Penumpang</h3>
              <p className="text-xs text-slate-300">
                Pesan 1 atau beberapa orang sekaligus selama kursi armada tersedia
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
          
          {/* 1. Tanggal Operasional */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <DatePickerInput
              value={tanggal}
              onChange={(newDate) => setTanggal(newDate)}
              label="1. TANGGAL OPERASIONAL PENUMPANG *"
            />
          </div>

          {/* 2. Jam Dijemput (Pilihan 6 Jadwal Operasional & Jam Manual) */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>2. Jam Dijemput Penumpang *</span>
              </label>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-200/70 text-purple-900">
                {jam} WIB
              </span>
            </div>

            <p className="text-[11px] text-purple-900/80">
              Pilih dari 6 jam jadwal operasional atau ketik jam penjemputan spesifik:
            </p>

            {/* 6 Quick Operational Schedule Chips */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {operationalSchedules.map((timeStr) => {
                const isSelected = jam === timeStr;
                return (
                  <button
                    key={timeStr}
                    type="button"
                    onClick={() => setJam(timeStr)}
                    className={`py-2 px-1 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-0.5 transition-all border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                        : 'bg-white hover:bg-purple-100/50 text-slate-700 border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <span>{timeStr}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Time Picker */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-purple-800 font-medium whitespace-nowrap">Jam Custom:</span>
              <input
                type="time"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono font-bold bg-white border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-slate-900"
              />
            </div>
          </div>

          {/* 3. Jenis Perjalanan: Keberangkatan vs Kedatangan (Dibagi 2) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <span>3. Jenis Perjalanan *</span>
            </label>
            <p className="text-[11px] text-slate-500">
              Pilih arah perjalanan penumpang:
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              {/* Option Keberangkatan */}
              <button
                type="button"
                onClick={() => handleTripTypeChange('keberangkatan')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 ${
                  tripType === 'keberangkatan'
                    ? 'border-sky-500 bg-sky-50/80 text-sky-950 shadow-sm ring-1 ring-sky-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${tripType === 'keberangkatan' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <PlaneTakeoff className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">🛫 Keberangkatan</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Default Antar ke Stasiun (Tetap bisa diedit)
                  </div>
                </div>
              </button>

              {/* Option Kedatangan */}
              <button
                type="button"
                onClick={() => handleTripTypeChange('kedatangan')}
                className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2.5 ${
                  tripType === 'kedatangan'
                    ? 'border-indigo-500 bg-indigo-50/80 text-indigo-950 shadow-sm ring-1 ring-indigo-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${tripType === 'kedatangan' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <PlaneLanding className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">🛬 Kedatangan</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Default Jemput dari Stasiun (Tetap bisa diedit)
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 4. JUMLAH ORANG / KURSI YANG DIPESAN (Fitur Multi-Passenger) */}
          <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/70 border-2 border-indigo-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 uppercase tracking-wider">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>4. Jumlah Orang / Kursi Dipesan *</span>
              </label>

              {/* Status Sisa Kursi Real-Time */}
              {assignmentMode !== 'queue' && selectedReport ? (
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                  isSelectedVehicleFull
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : hasEnoughSeatsInSelected
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {isSelectedVehicleFull
                    ? 'Armada Penuh (0 Kursi)'
                    : `Sisa ${selectedRemainingSeats} Kursi Tersedia`}
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Mode Antrean (Fleksibel)
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-600">
              Satu kontak pemesan dapat memesan tiket untuk beberapa orang sekaligus selama kursi armada masih tersedia.
            </p>

            {/* Counter Stepper Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center bg-white border border-indigo-300 rounded-2xl p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleSetJumlahOrang(jumlahOrang - 1)}
                  disabled={jumlahOrang <= 1}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Kurangi jumlah orang"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="px-4 py-1 text-center min-w-[100px]">
                  <span className="font-extrabold text-base sm:text-lg text-indigo-950">
                    {jumlahOrang}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1.5">
                    {jumlahOrang === 1 ? 'Orang' : 'Orang'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSetJumlahOrang(jumlahOrang + 1)}
                  disabled={
                    assignmentMode !== 'queue' && selectedReport
                      ? jumlahOrang >= selectedRemainingSeats
                      : jumlahOrang >= maxAllowedSeats
                  }
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold"
                  title="Tambah jumlah orang"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Seat Chips (1 s/d 7) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                  const isExceedingCurrentDriver = assignmentMode !== 'queue' && selectedReport && num > selectedRemainingSeats;
                  const isSelected = jumlahOrang === num;

                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={Boolean(isExceedingCurrentDriver)}
                      onClick={() => handleSetJumlahOrang(num)}
                      className={`h-9 px-3 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs ring-2 ring-indigo-300'
                          : isExceedingCurrentDriver
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                          : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                      }`}
                      title={isExceedingCurrentDriver ? `Kursi tidak cukup (hanya sisa ${selectedRemainingSeats})` : `Pesan untuk ${num} orang`}
                    >
                      <span>{num} Org</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warning if capacity exceeded */}
            {assignmentMode !== 'queue' && selectedReport && jumlahOrang > selectedRemainingSeats && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Sisa kursi armada <strong>{selectedReport.driver}</strong> tinggal <strong>{selectedRemainingSeats} kursi</strong>. Kurangi jumlah orang atau pilih armada lain / mode Entry Dulu.
                </span>
              </div>
            )}
          </div>

          {/* 5. Identitas & Kontak Pemesan */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" />
                <span>5. Data Kontak & Pemesan Utama</span>
              </span>
              {jumlahOrang > 1 && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Pemesan Kursi 1 ({jumlahOrang} Kursi Total)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <span>Nama Pemesan / Kontak:</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Pak Budi Santoso"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>No. HP / WhatsApp Pemesan:</span>
                </label>
                <input
                  type="text"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900"
                />
              </div>
            </div>

            {/* List of Additional Passenger Names if jumlahOrang > 1 */}
            {jumlahOrang > 1 && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Daftar Nama Penumpang (Kursi 1 s/d {jumlahOrang}):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDetailNamesOpen(!isDetailNamesOpen)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {isDetailNamesOpen ? 'Sembunyikan' : 'Rincikan Nama'}
                  </button>
                </div>

                {isDetailNamesOpen && (
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-500 mb-2">
                      💡 <strong>Tip Operator:</strong> Jika nama rekan belum diketahui, biarkan kosong. Sistem akan otomatis mengisi nama sesuai pemesan utama (misal: <em>{nama || 'Budi'} (2)</em>).
                    </p>

                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {Array.from({ length: jumlahOrang }, (_, i) => {
                        const seatNum = i + 1;
                        if (seatNum === 1) {
                          return (
                            <div key={seatNum} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg text-xs">
                              <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                                #1
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] text-slate-400 block font-semibold">Kursi 1 (Pemesan Utama):</span>
                                <span className="font-bold text-slate-800 truncate block">
                                  {nama.trim() || <span className="text-slate-400 italic">Isi nama pemesan di atas</span>}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                                Kontak Utama
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={seatNum} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg text-xs">
                            <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                              #{seatNum}
                            </span>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={additionalNames[seatNum] || ''}
                                onChange={(e) => handleUpdateAdditionalName(seatNum, e.target.value)}
                                placeholder={`Nama Penumpang Kursi #${seatNum} (opsional: ${nama ? `${nama} (${seatNum})` : `Penumpang ${seatNum}`})`}
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Titik Jemput & Antar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Titik Jemput:</span>
                </label>
                <input
                  type="text"
                  value={jemput}
                  onChange={(e) => setJemput(e.target.value)}
                  placeholder="Lokasi penjemputan..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Stasiun', ...presets.jemputList.filter((j) => j !== 'Stasiun')].slice(0, 5).map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setJemput(j)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                        jemput === j
                          ? 'bg-indigo-600 text-white border-indigo-700 font-bold'
                          : 'bg-white border-slate-200 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800'
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
                  placeholder="Tujuan pengantaran..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Stasiun', ...presets.antarList.filter((a) => a !== 'Stasiun')].slice(0, 5).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAntar(a)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                        antar === a
                          ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                          : 'bg-white border-slate-200 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800'
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
                <span>Keterangan Tambahan (Opsional):</span>
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Misal: Bawa bagasi 3 koper, minta kursi depan, dll."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* 6. Penugasan Driver: Fleksibel & Cek Kapasitas */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Car className="w-4 h-4 text-emerald-600" />
                <span>6. Penugasan Armada Driver</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {availableReportsForDate.length} Driver Bertugas di Tanggal Ini
              </span>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAssignmentMode('auto')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  assignmentMode === 'auto'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Otomatis</span>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentMode('manual')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  assignmentMode === 'manual'
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3 h-3 text-indigo-600" />
                <span>Pilih Manual</span>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentMode('queue')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                  assignmentMode === 'queue'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Inbox className="w-3 h-3" />
                <span>Entry Dulu</span>
              </button>
            </div>

            {/* Mode 1: ENTRY DULU (Antrian Tanpa Driver) */}
            {assignmentMode === 'queue' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Inbox className="w-4 h-4 text-amber-700" />
                  <span>Simpan ke Antrian (Driver Dipilih Nanti)</span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  Pemesanan sebanyak <strong>{jumlahOrang} orang</strong> akan disimpan ke dalam <strong>Daftar Antrian Penumpang</strong>. Admin atau operator dapat memasukkannya ke armada driver yang memiliki sisa kursi cukup sewaktu-waktu nanti.
                </p>
              </div>
            )}

            {/* Mode 2: OTOMATIS */}
            {assignmentMode === 'auto' && (
              <div className="space-y-2">
                {autoTargetReport ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sistem Otomatis Memilih Driver:</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        hasEnoughSeatsInSelected
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}>
                        {hasMatchingDriverOnJam ? '⭐ Jam Cocok' : 'Sisa Kursi Cukup'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-emerald-300/80 flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{autoTargetReport.driver}</span>
                          <span className="text-[10px] text-slate-500 font-normal">({autoTargetReport.kendaraan} - {autoTargetReport.platNomor})</span>
                        </h5>
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                          Jadwal: {autoTargetReport.jamMulai || '-'}-{autoTargetReport.jamSelesai || '-'} • Rute: {autoTargetReport.namaKereta || 'BIB/RGA'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-800">
                          {selectedFilledCount}/{selectedCapacity} Kursi Terisi
                        </div>
                        <div className={`text-[10px] font-bold ${hasEnoughSeatsInSelected ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {hasEnoughSeatsInSelected
                            ? `Tersedia ${selectedRemainingSeats} Kursi (Cukup)`
                            : `Sisa ${selectedRemainingSeats} (Kurang ${jumlahOrang - selectedRemainingSeats})`}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
                    <p className="text-xs font-bold text-amber-950">
                      {hasDriversOnDate 
                        ? `Tidak ada driver dengan sisa minimal ${jumlahOrang} kursi pada tanggal ini`
                        : 'Belum ada driver bertugas pada tanggal ini'}
                    </p>
                    <p className="text-[11px] text-amber-800">
                      Sisa kursi terbesar saat ini: {maxRemainingSeatsOnDate} kursi. Tambahkan driver baru jam {jam}, atau simpan penumpang ke antrean terlebih dahulu.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenAddDriverModal(tanggal, jam)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambahkan Driver Jam {jam}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignmentMode('queue')}
                        className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs"
                      >
                        Simpan Antrian Dulu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 3: PILIH MANUAL DRIVER */}
            {assignmentMode === 'manual' && (
              <div className="space-y-2">
                {hasDriversOnDate ? (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableReportsForDate.map((rep) => {
                      const isSelected = rep.id === (selectedReportId || (selectedReport?.id));
                      const filledCount = getFilledRows(rep.rows).length;
                      const kapasitas = rep.kapasitas || 7;
                      const remaining = Math.max(0, kapasitas - filledCount);
                      const isFull = remaining <= 0;
                      const hasEnough = remaining >= jumlahOrang;
                      const isJamMatch = rep.jamMulai === jam;

                      return (
                        <div
                          key={rep.id}
                          onClick={() => {
                            setSelectedReportId(rep.id);
                          }}
                          className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? hasEnough
                                ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-1 ring-indigo-400'
                                : 'border-rose-500 bg-rose-50/70 text-rose-950 shadow-xs ring-1 ring-rose-300'
                              : isFull
                              ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60'
                              : !hasEnough
                              ? 'border-amber-200 bg-amber-50/40 text-slate-700'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="font-bold text-xs truncate">{rep.driver}</span>
                              {isJamMatch && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-800 font-bold rounded">
                                  Jam Cocok ({rep.jamMulai})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isFull 
                                  ? 'bg-red-100 text-red-700' 
                                  : hasEnough
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                Sisa {remaining}/{kapasitas} {hasEnough ? '✓' : `(Kurang ${jumlahOrang - remaining})`}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-700" />}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                            <span>{rep.kendaraan} ({rep.platNomor || '-'})</span>
                            <span className="font-mono">🕒 {rep.jamMulai || '-'}-{rep.jamSelesai || '-'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                    <p className="text-xs font-bold text-amber-900">
                      Tidak ada driver pada tanggal {tanggal}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenAddDriverModal(tanggal, jam)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Driver Baru Jam {jam}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Button to Add Driver if not satisfied with existing drivers */}
            {hasDriversOnDate && !hasMatchingDriverOnJam && assignmentMode !== 'queue' && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                <span className="text-[11px] text-amber-900">
                  Driver pada jam <strong>{jam}</strong> belum ada.
                </span>
                <button
                  type="button"
                  onClick={() => onOpenAddDriverModal(tanggal, jam)}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shrink-0"
                >
                  + Tambah Driver Jam {jam}
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                !nama.trim() || 
                (assignmentMode !== 'queue' && (!selectedReport || !hasEnoughSeatsInSelected))
              }
              className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-1.5 ${
                !nama.trim()
                  ? 'bg-slate-400 opacity-50 cursor-not-allowed'
                  : assignmentMode === 'queue'
                  ? 'bg-amber-600 hover:bg-amber-700 active:scale-95'
                  : !selectedReport || !hasEnoughSeatsInSelected
                  ? 'bg-rose-500 opacity-60 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {assignmentMode === 'queue'
                  ? `Simpan ${jumlahOrang} Orang ke Antrean`
                  : !selectedReport
                  ? 'Belum Ada Driver'
                  : !hasEnoughSeatsInSelected
                  ? `Kursi Kurang (Sisa ${selectedRemainingSeats}/${jumlahOrang})`
                  : `Simpan & Masukkan ${jumlahOrang} Orang ke Driver`}
              </span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

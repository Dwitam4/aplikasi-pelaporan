import { ReportDocument } from '../types';

export type ShiftType = 'pagi' | 'siang' | 'malam';

export interface ShiftPresetInfo {
  type: ShiftType;
  label: string;
  shortName: string;
  jamMulai: string;
  jamSelesai: string;
  colorClass: string;
  badgeClass: string;
}

export const SHIFT_DEFINITIONS: Record<ShiftType, ShiftPresetInfo> = {
  pagi: {
    type: 'pagi',
    label: 'Shift Pagi (05:00 - 12:00)',
    shortName: 'Shift Pagi',
    jamMulai: '05:00',
    jamSelesai: '12:00',
    colorClass: 'amber',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  siang: {
    type: 'siang',
    label: 'Shift Siang (12:00 - 18:00)',
    shortName: 'Shift Siang',
    jamMulai: '12:00',
    jamSelesai: '18:00',
    colorClass: 'blue',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  malam: {
    type: 'malam',
    label: 'Shift Malam (18:00 - 23:00)',
    shortName: 'Shift Malam',
    jamMulai: '18:00',
    jamSelesai: '23:00',
    colorClass: 'indigo',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  },
};

/**
 * Detect shift category from start time, end time, and header notes
 */
export function detectShiftType(
  jamMulai?: string,
  jamSelesai?: string,
  catatanHeader?: string
): ShiftType {
  const note = (catatanHeader || '').toLowerCase();
  if (note.includes('pagi') || note.includes('morning') || note.includes('subuh')) return 'pagi';
  if (note.includes('siang') || note.includes('sore') || note.includes('afternoon')) return 'siang';
  if (note.includes('malam') || note.includes('night')) return 'malam';

  if (jamMulai) {
    const parts = jamMulai.split(':');
    const hour = parseInt(parts[0], 10);
    if (!isNaN(hour)) {
      if (hour >= 4 && hour < 12) return 'pagi';
      if (hour >= 12 && hour < 18) return 'siang';
      if (hour >= 18 || hour < 4) return 'malam';
    }
  }

  if (jamSelesai) {
    const parts = jamSelesai.split(':');
    const hour = parseInt(parts[0], 10);
    if (!isNaN(hour)) {
      if (hour <= 12) return 'pagi';
      if (hour <= 18) return 'siang';
      return 'malam';
    }
  }

  return 'pagi';
}

export interface DriverShiftAssignment {
  shift: ShiftType;
  shiftLabel: string;
  reportId: string;
  kendaraan: string;
  platNomor?: string;
  jamStr: string;
  statusTugas: 'aktif' | 'selesai';
}

/**
 * Get all shifts for a driver on a specific date
 */
export function getDriverShiftsOnDate(
  reports: ReportDocument[],
  date: string,
  driverIdOrName: string,
  excludeReportId?: string
): {
  assignments: DriverShiftAssignment[];
  shifts: ShiftType[];
  isWorkingOnShift: (shift: ShiftType) => boolean;
  statusKeterangan: string;
  canWorkOnShift: (shift: ShiftType) => boolean;
  getShiftConflictMessage: (targetShift: ShiftType, driverName: string) => string | null;
} {
  const cleanTarget = driverIdOrName.trim().toLowerCase();
  if (!cleanTarget) {
    return {
      assignments: [],
      shifts: [],
      isWorkingOnShift: () => false,
      statusKeterangan: 'Tersedia',
      canWorkOnShift: () => true,
      getShiftConflictMessage: () => null,
    };
  }

  const matches = reports.filter((r) => {
    if (excludeReportId && r.id === excludeReportId) return false;
    if (r.tanggal !== date) return false;

    const matchesId = r.driverId && r.driverId.toLowerCase() === cleanTarget;
    const matchesName = r.driver && r.driver.toLowerCase().trim() === cleanTarget;
    return matchesId || matchesName;
  });

  const assignments: DriverShiftAssignment[] = matches.map((r) => {
    const shift = detectShiftType(r.jamMulai, r.jamSelesai, r.catatanHeader);
    const jamStr = (r.jamMulai || r.jamSelesai)
      ? `${r.jamMulai || '05:00'} - ${r.jamSelesai || '12:00'}`
      : SHIFT_DEFINITIONS[shift].label;

    return {
      shift,
      shiftLabel: SHIFT_DEFINITIONS[shift].shortName,
      reportId: r.id,
      kendaraan: r.kendaraan || 'Armada',
      platNomor: r.platNomor,
      jamStr,
      statusTugas: r.statusTugas || 'aktif',
    };
  });

  const shifts = assignments.map((a) => a.shift);

  const isWorkingOnShift = (shift: ShiftType) => shifts.includes(shift);

  let statusKeterangan = 'Tersedia (Bebas Shift)';
  if (assignments.length > 0) {
    const shiftNames = assignments.map((a) => a.shiftLabel).join(' & ');
    statusKeterangan = `Sedang bertugas di ${shiftNames}`;
  }

  // Driver can be scheduled at any hour without waiting for previous tasks to finish
  const canWorkOnShift = (_targetShift: ShiftType) => {
    return true;
  };

  const getShiftConflictMessage = (_targetShift: ShiftType, _driverName: string) => {
    return null;
  };

  return {
    assignments,
    shifts,
    isWorkingOnShift,
    statusKeterangan,
    canWorkOnShift,
    getShiftConflictMessage,
  };
}

/**
 * Get all shifts for a vehicle on a specific date
 */
export function getVehicleShiftsOnDate(
  reports: ReportDocument[],
  date: string,
  vehicleIdOrPlat: string,
  excludeReportId?: string
) {
  const cleanTarget = vehicleIdOrPlat.trim().toLowerCase();
  if (!cleanTarget) {
    return {
      assignments: [],
      shifts: [] as ShiftType[],
      canUseOnShift: () => true,
      getConflictMessage: () => null,
    };
  }

  const matches = reports.filter((r) => {
    if (excludeReportId && r.id === excludeReportId) return false;
    if (r.tanggal !== date) return false;

    const matchesId = r.vehicleId && r.vehicleId.toLowerCase() === cleanTarget;
    const matchesPlat = r.platNomor && r.platNomor.toLowerCase().trim() === cleanTarget;
    const matchesModel = r.kendaraan && r.kendaraan.toLowerCase().trim() === cleanTarget;
    return matchesId || matchesPlat || matchesModel;
  });

  const assignments = matches.map((r) => {
    const shift = detectShiftType(r.jamMulai, r.jamSelesai, r.catatanHeader);
    return {
      shift,
      driver: r.driver || 'Driver',
      kendaraan: r.kendaraan,
      platNomor: r.platNomor,
      statusTugas: r.statusTugas || 'aktif',
    };
  });

  const shifts = assignments.map((a) => a.shift);

  const canUseOnShift = (_targetShift: ShiftType) => {
    return true;
  };

  const getConflictMessage = (_targetShift: ShiftType, _vehicleName: string) => {
    return null;
  };

  return {
    assignments,
    shifts,
    canUseOnShift,
    getConflictMessage,
  };
}

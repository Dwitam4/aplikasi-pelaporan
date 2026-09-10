export type UserRole = 'admin' | 'driver';

export interface MasterDriver {
  id: string;
  nama: string;
  hp: string;
  mobil?: string; // Mobil paten yang digunakan (misal Luxio)
  platNomor?: string; // Plat paten (misal N 1823 WX)
  kapasitas?: number; // Kapasitas kursi (misal 7)
  catatan?: string;
  status: 'aktif' | 'nonaktif';
}

export interface MasterVehicle {
  id: string;
  model: string;
  platNomor: string;
  kapasitas: number;
  warna?: string;
  status: 'aktif' | 'perbaikan' | 'nonaktif';
}

export interface MasterPresets {
  keretaList: string[];
  kendaraanList: string[];
  antarList: string[];
  jemputList: string[];
  jadwalList: string[]; // 6 operational schedule times, e.g. ['05:30', '07:30', '11:00', '15:30', '17:30', '19:30']
  drivers: MasterDriver[];
  vehicles: MasterVehicle[];
}

export type KehadiranStatus = 'datang' | 'belum_datang' | 'batal';
export type TripType = 'keberangkatan' | 'kedatangan';

export interface ReportRow {
  id: string;
  no: number;
  tanggal?: string; // Tanggal operasional / tanggal penumpang, misal "2026-08-26" atau "Rabu, 26 Agustus 2026"
  jam?: string; // Jam jemput/antar/keberangkatan penumpang, misal "05:30"
  hp: string;
  nama: string;
  antar: string;
  jemput: string;
  keterangan: string; // Keterangan/alasan: alasan batal, titik spesifik, dll
  tripType?: TripType; // 'keberangkatan' | 'kedatangan'
  status?: 'selesai' | 'proses' | 'batal';
  kehadiran?: 'datang' | 'belum_datang' | 'batal' | 'sudah_ada' | 'belum_ada';
  tarif?: number;
  bookingGroupId?: string; // ID rombongan pemesanan jika 1 orang memesan untuk beberapa kursi
  bookerName?: string; // Nama pemesan / kontak utama
  totalSeatsInBooking?: number; // Total orang dalam rombongan pemesanan ini
  seatIndex?: number; // Nomor urut kursi dalam pemesanan (1, 2, dst)
}

export interface UnassignedPassenger extends ReportRow {
  tanggal: string; // Operational date, e.g. "Rabu, 26 Agustus 2026"
  createdAt: string;
}

export interface ReportDocument {
  id: string;
  title: string;
  namaKereta: string;
  tanggal: string;
  jamMulai?: string; // e.g. "05:00"
  jamSelesai?: string; // e.g. "12:00"
  statusTugas?: 'aktif' | 'selesai'; // 'aktif' = sedang bertugas, 'selesai' = tugas selesai / driver & mobil tersedia
  waktuSelesaiActual?: string; // timestamp when marked completed
  kendaraan: string;
  platNomor?: string;
  driver: string;
  driverHp?: string;
  driverId?: string;
  vehicleId?: string;
  kapasitas?: number;
  catatanHeader: string;
  rows: ReportRow[];
  createdAt: string;
  updatedAt: string;
}

export type ExportFormat = 'xlsx' | 'csv' | 'google-sheets-clipboard' | 'print';

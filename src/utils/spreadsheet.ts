import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportDocument, ReportRow, MasterPresets, MasterDriver, MasterVehicle } from '../types';

export const defaultMasterDrivers: MasterDriver[] = [
  { id: 'drv-1', nama: 'Pak Wahyu', hp: '089635479788', mobil: 'Luxio', platNomor: 'N 1823 WX', kapasitas: 7, catatan: 'Driver Utama', status: 'aktif' },
  { id: 'drv-2', nama: 'Pak Budi', hp: '081234567890', mobil: 'Grandmax', platNomor: 'N 1092 AB', kapasitas: 8, catatan: 'Driver Reguler', status: 'aktif' },
  { id: 'drv-3', nama: 'Pak Joko', hp: '085712345678', mobil: 'Avanza', platNomor: 'N 1450 CD', kapasitas: 7, catatan: 'Driver Reguler', status: 'aktif' },
  { id: 'drv-4', nama: 'Pak Agus', hp: '087812345678', mobil: 'HiAce Commuter', platNomor: 'N 7721 KL', kapasitas: 14, catatan: 'Driver Shuttle', status: 'aktif' },
  { id: 'drv-5', nama: 'Pak Hendra', hp: '081398765432', mobil: 'Innova Reborn', platNomor: 'N 1555 EF', kapasitas: 7, catatan: 'Driver Cadangan', status: 'aktif' },
];

export const defaultMasterVehicles: MasterVehicle[] = [
  { id: 'veh-1', model: 'Luxio', platNomor: 'N 1823 WX', kapasitas: 7, warna: 'Putih', status: 'aktif' },
  { id: 'veh-2', model: 'Grandmax', platNomor: 'N 1092 AB', kapasitas: 8, warna: 'Hitam', status: 'aktif' },
  { id: 'veh-3', model: 'Avanza', platNomor: 'N 1450 CD', kapasitas: 7, warna: 'Silver', status: 'aktif' },
  { id: 'veh-4', model: 'HiAce Commuter', platNomor: 'N 7721 KL', kapasitas: 14, warna: 'Putih', status: 'aktif' },
  { id: 'veh-5', model: 'Innova Reborn', platNomor: 'N 1555 EF', kapasitas: 7, warna: 'Abu-abu', status: 'aktif' },
  { id: 'veh-6', model: 'APV Arena', platNomor: 'N 1980 GH', kapasitas: 8, warna: 'Merah Marun', status: 'aktif' },
];

export const defaultJadwalList: string[] = ['05:30', '07:30', '11:00', '15:30', '17:30', '19:30'];

export const defaultMasterPresets: MasterPresets = {
  keretaList: ['BIB/RGA', 'BIB', 'RGA', 'ARGO-01', 'ARGO-02', 'JAYABAYA', 'SHUTTLE-A'],
  kendaraanList: ['Luxio', 'Grandmax', 'Avanza', 'HiAce', 'Innova', 'APV'],
  antarList: ['✓', 'Tu', 'BIB', 'RGA', 'Stasiun', 'Pool'],
  jemputList: ['✓', 'Tukum', 'SMA 3', 'Klapan', 'Terminal', 'Rumah'],
  jadwalList: defaultJadwalList,
  drivers: defaultMasterDrivers,
  vehicles: defaultMasterVehicles,
};

export const createEmptyReportRows = (count: number = 0): ReportRow[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `row-${Date.now()}-${i + 1}`,
    no: i + 1,
    jam: '',
    hp: '',
    nama: '',
    antar: '',
    jemput: '',
    keterangan: '',
    tripType: 'keberangkatan',
    kehadiran: 'belum_datang',
    status: 'proses',
  }));

export const initialSampleReport: ReportDocument = {
  id: 'rep-sample-01',
  title: 'Laporan Antar Jemput Penumpang',
  namaKereta: 'BIB/RGA',
  tanggal: 'Rabu, 26 Agustus 2026',
  jamMulai: '05:00',
  jamSelesai: '12:00',
  statusTugas: 'aktif',
  kendaraan: 'Luxio',
  platNomor: 'N 1823 WX',
  driver: 'Pak Wahyu',
  driverHp: '089635479788',
  driverId: 'drv-1',
  vehicleId: 'veh-1',
  kapasitas: 7,
  catatanHeader: 'Shift Pagi (05:00 - 12:00)',
  rows: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Normalize attendance status into standard 'datang' | 'belum_datang' | 'batal'
 */
export function normalizeKehadiran(status?: string): 'datang' | 'belum_datang' | 'batal' {
  if (!status) return 'belum_datang';
  if (status === 'datang' || status === 'sudah_ada' || status === 'selesai') return 'datang';
  if (status === 'batal') return 'batal';
  return 'belum_datang';
}

export function getKehadiranLabel(status?: string): string {
  const norm = normalizeKehadiran(status);
  if (norm === 'datang') return 'Datang';
  if (norm === 'batal') return 'Batal';
  return 'Belum Datang';
}

/**
 * Clean & filter rows that actually have data
 */
export function getFilledRows(rows: ReportRow[]): ReportRow[] {
  return rows.filter((r) => r.nama.trim() || r.hp.trim() || (r.jam && r.jam.trim()) || r.antar.trim() || r.jemput.trim() || r.keterangan.trim());
}

/**
 * Format phone numbers into clean WhatsApp links
 */
export function getWhatsAppUrl(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return `https://wa.me/${clean}`;
}

/**
 * Export report document to Excel (.xlsx) file
 */
export function exportToExcel(report: ReportDocument, customFileName?: string): string {
  const filledRows = getFilledRows(report.rows);
  const rowsToExport = filledRows.length > 0 ? report.rows : report.rows.slice(0, 13);

  // Construct structured spreadsheet array of arrays (AOA)
  const vehInfo = report.platNomor ? `${report.kendaraan || '-'} (${report.platNomor})` : (report.kendaraan || '-');
  const drvInfo = report.driverHp ? `${report.driver || '-'} (${report.driverHp})` : (report.driver || '-');
  const jamInfo = (report.jamMulai || report.jamSelesai) ? `${report.jamMulai || '05:00'} - ${report.jamSelesai || '12:00'} WIB` : 'Reguler';
  const statusInfo = report.statusTugas === 'selesai' ? 'SELESAI (TERSEDIA)' : 'SEDANG BERTUGAS';

  const aoa: (string | number)[][] = [
    ['LAPORAN OPERASIONAL & ANTAR JEMPUT'],
    [''],
    ['NAMA KERETA / MODA:', report.namaKereta || '-', '', 'TANGGAL:', report.tanggal || '-', '', 'ARMADA & PLAT:', vehInfo],
    ['DRIVER / PETUGAS:', drvInfo, '', 'JAM TUGAS:', jamInfo, '', 'STATUS:', statusInfo],
    ['CATATAN HEADER:', report.catatanHeader || '-', '', '', '', '', ''],
    [''],
    ['NO', 'TANGGAL', 'JAM', 'JENIS (BERANGKAT/DATANG)', 'NO HP / WHATSAPP', 'NAMA PENUMPANG', 'ANTAR', 'JEMPUT', 'KETERANGAN'],
  ];

  // Add rows
  rowsToExport.forEach((row, index) => {
    aoa.push([
      row.no || index + 1,
      row.tanggal || report.tanggal || '-',
      row.jam || report.jamMulai || '',
      row.tripType === 'kedatangan' ? 'Kedatangan' : 'Keberangkatan',
      row.hp || '',
      row.nama || '',
      row.antar || '',
      row.jemput || '',
      row.keterangan || '',
    ]);
  });

  // Summary Row
  aoa.push(['']);
  aoa.push(['TOTAL PENUMPANG TERISI:', filledRows.length]);
  aoa.push(['WAKTU CETAK / EKSPOR:', new Date().toLocaleString('id-ID')]);

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Set explicit column widths for beautiful Excel viewing
  worksheet['!cols'] = [
    { wch: 6 },  // NO
    { wch: 18 }, // TANGGAL (sebelum JAM)
    { wch: 10 }, // JAM
    { wch: 16 }, // JENIS
    { wch: 18 }, // HP
    { wch: 26 }, // NAMA
    { wch: 14 }, // ANTAR
    { wch: 18 }, // JEMPUT
    { wch: 28 }, // KETERANGAN
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');

  const safeDate = (report.tanggal || 'Laporan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeKereta = (report.namaKereta || 'Transport').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = customFileName || `Laporan_${safeKereta}_${safeDate}.xlsx`;

  XLSX.writeFile(workbook, fileName);
  return fileName;
}

/**
 * Export report document to CSV (.csv) file with UTF-8 BOM
 */
export function exportToCSV(report: ReportDocument, customFileName?: string): string {
  const filledRows = getFilledRows(report.rows);
  const rowsToExport = filledRows.length > 0 ? report.rows : report.rows.slice(0, 13);

  const escapeCsv = (val: string | number | undefined) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines: string[] = [];
  lines.push(`${escapeCsv('LAPORAN OPERASIONAL')}`);
  lines.push(`${escapeCsv('NAMA KERETA')},${escapeCsv(report.namaKereta)},${escapeCsv('TANGGAL')},${escapeCsv(report.tanggal)},${escapeCsv('KENDARAAN')},${escapeCsv(report.kendaraan)}`);
  lines.push(`${escapeCsv('DRIVER')},${escapeCsv(report.driver)},${escapeCsv('CATATAN')},${escapeCsv(report.catatanHeader)}`);
  lines.push('');
  lines.push(['NO', 'TANGGAL', 'JAM', 'JENIS', 'NO HP', 'NAMA', 'ANTAR', 'JEMPUT', 'KETERANGAN'].map(escapeCsv).join(','));

  rowsToExport.forEach((row, idx) => {
    lines.push([
      row.no || idx + 1,
      row.tanggal || report.tanggal || '-',
      row.jam || report.jamMulai || '',
      row.tripType === 'kedatangan' ? 'Kedatangan' : 'Keberangkatan',
      row.hp || '',
      row.nama || '',
      row.antar || '',
      row.jemput || '',
      row.keterangan || '',
    ].map(escapeCsv).join(','));
  });

  lines.push('');
  lines.push(`${escapeCsv('TOTAL PENUMPANG')},${filledRows.length}`);

  // UTF-8 BOM (\uFEFF) ensures Excel opens Indonesian characters and numbers without encoding bugs
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeDate = (report.tanggal || 'Laporan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeKereta = (report.namaKereta || 'Transport').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = customFileName || `Laporan_${safeKereta}_${safeDate}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return fileName;
}

/**
 * Copy data as Tab-Separated Values (TSV) ready to paste into Google Sheets / Excel
 */
export async function copyToGoogleSheetsClipboard(report: ReportDocument): Promise<boolean> {
  const filledRows = getFilledRows(report.rows);
  const rowsToExport = filledRows.length > 0 ? report.rows : report.rows.slice(0, 13);

  const lines: string[] = [];
  lines.push(`NAMA KERETA:\t${report.namaKereta}\tTANGGAL:\t${report.tanggal}\tKENDARAAN:\t${report.kendaraan}`);
  lines.push(`DRIVER:\t${report.driver}\tCATATAN:\t${report.catatanHeader}`);
  lines.push('');
  lines.push(['NO', 'TANGGAL', 'JAM', 'JENIS', 'HP', 'NAMA', 'ANTAR', 'JEMPUT', 'KETERANGAN'].join('\t'));

  rowsToExport.forEach((row, idx) => {
    lines.push([
      row.no || idx + 1,
      row.tanggal || report.tanggal || '-',
      row.jam || report.jamMulai || '',
      row.tripType === 'kedatangan' ? 'Kedatangan' : 'Keberangkatan',
      row.hp || '',
      row.nama || '',
      row.antar || '',
      row.jemput || '',
      row.keterangan || '',
    ].join('\t'));
  });

  const tsvText = lines.join('\n');

  try {
    await navigator.clipboard.writeText(tsvText);
    return true;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}

/**
 * Export multiple driver reports (e.g. all drivers for the same day) into a multi-sheet Excel file
 */
export function exportMultiDriverExcel(reports: ReportDocument[], customFileName?: string): string {
  if (!reports || reports.length === 0) return '';

  const workbook = XLSX.utils.book_new();

  // 1. First Sheet: Master Consolidated Summary
  const summaryAoa: (string | number)[][] = [
    ['REKAP GABUNGAN SEMUA ARMADA & DRIVER'],
    ['TANGGAL TUGAS:', reports[0].tanggal || 'Hari Ini', '', 'TOTAL ARMADA:', reports.length],
    ['WAKTU EKSPOR:', new Date().toLocaleString('id-ID')],
    [''],
    ['NO', 'TANGGAL', 'JAM', 'JENIS', 'ARMADA / MODEL', 'PLAT NOMOR', 'DRIVER', 'NO HP DRIVER', 'KERETA/RUTE', 'NO HP PENUMPANG', 'NAMA PENUMPANG', 'ANTAR', 'JEMPUT', 'KETERANGAN'],
  ];

  let globalCounter = 1;
  reports.forEach((rep) => {
    const filled = getFilledRows(rep.rows);
    const rows = filled.length > 0 ? filled : rep.rows.slice(0, 5);
    rows.forEach((r) => {
      summaryAoa.push([
        globalCounter++,
        r.tanggal || rep.tanggal || '-',
        r.jam || rep.jamMulai || '',
        r.tripType === 'kedatangan' ? 'Kedatangan' : 'Keberangkatan',
        rep.kendaraan || '-',
        rep.platNomor || '-',
        rep.driver || '-',
        rep.driverHp || '-',
        rep.namaKereta || '-',
        r.hp || '',
        r.nama || '',
        r.antar || '',
        r.jemput || '',
        r.keterangan || '',
      ]);
    });
  });

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
  summarySheet['!cols'] = [
    { wch: 6 },  // NO
    { wch: 18 }, // TANGGAL (sebelum JAM)
    { wch: 10 }, // JAM
    { wch: 14 }, // JENIS
    { wch: 16 }, // ARMADA
    { wch: 14 }, // PLAT NOMOR
    { wch: 18 }, // DRIVER
    { wch: 16 }, // HP DRIVER
    { wch: 14 }, // KERETA
    { wch: 18 }, // HP PENUMPANG
    { wch: 24 }, // NAMA PENUMPANG
    { wch: 12 }, // ANTAR
    { wch: 16 }, // JEMPUT
    { wch: 25 }, // KETERANGAN
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Rekap Gabungan');

  // 2. Individual Sheet for each driver/vehicle
  reports.forEach((rep, index) => {
    const filled = getFilledRows(rep.rows);
    const rows = filled.length > 0 ? rep.rows : rep.rows.slice(0, 13);
    const vName = rep.platNomor ? `${rep.kendaraan || 'Armada'} (${rep.platNomor})` : (rep.kendaraan || 'Armada');
    const dName = rep.driverHp ? `${rep.driver || 'Driver'} (${rep.driverHp})` : (rep.driver || 'Driver');

    const sheetAoa: (string | number)[][] = [
      [`LAPORAN ARMADA #${index + 1}: ${vName} - Driver: ${dName}`],
      [''],
      ['NAMA KERETA:', rep.namaKereta || '-', '', 'TANGGAL:', rep.tanggal || '-', '', 'ARMADA & PLAT:', vName],
      ['DRIVER / HP:', dName, '', 'CATATAN:', rep.catatanHeader || '-', '', '', ''],
      [''],
      ['NO', 'TANGGAL', 'JAM', 'JENIS', 'NO HP / WHATSAPP', 'NAMA PENUMPANG', 'ANTAR', 'JEMPUT', 'KETERANGAN'],
    ];

    rows.forEach((r, rIdx) => {
      sheetAoa.push([
        r.no || rIdx + 1,
        r.tanggal || rep.tanggal || '-',
        r.jam || rep.jamMulai || '',
        r.tripType === 'kedatangan' ? 'Kedatangan' : 'Keberangkatan',
        r.hp || '',
        r.nama || '',
        r.antar || '',
        r.jemput || '',
        r.keterangan || '',
      ]);
    });

    sheetAoa.push(['']);
    sheetAoa.push(['TOTAL PENUMPANG:', filled.length]);

    const driverSheet = XLSX.utils.aoa_to_sheet(sheetAoa);
    driverSheet['!cols'] = [
      { wch: 6 },
      { wch: 18 }, // TANGGAL (sebelum JAM)
      { wch: 10 }, // JAM
      { wch: 14 }, // JENIS
      { wch: 18 },
      { wch: 25 },
      { wch: 14 },
      { wch: 18 },
      { wch: 28 },
    ];

    // Create safe tab title (max 31 chars for Excel sheet names)
    const baseName = `${rep.kendaraan || 'Armada'}_${rep.driver || `Driver${index + 1}`}`;
    const safeSheetName = baseName.replace(/[:\\/?*[\]]/g, '').substring(0, 28) || `Driver ${index + 1}`;
    
    // Ensure unique sheet name
    let finalSheetName = safeSheetName;
    let dupCounter = 1;
    while (workbook.SheetNames.includes(finalSheetName)) {
      finalSheetName = `${safeSheetName.substring(0, 25)}_${dupCounter++}`;
    }

    XLSX.utils.book_append_sheet(workbook, driverSheet, finalSheetName);
  });

  const safeDate = (reports[0].tanggal || 'HariIni').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = customFileName || `Rekap_Semua_Driver_${safeDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

/**
 * Export single report document to PDF (.pdf) format with professional styling
 */
export function exportToPDF(report: ReportDocument, customFileName?: string): string {
  const filledRows = getFilledRows(report.rows);
  const rowsToExport = filledRows.length > 0 ? report.rows : report.rows.slice(0, 13);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const vehInfo = report.platNomor ? `${report.kendaraan || '-'} (${report.platNomor})` : (report.kendaraan || '-');
  const drvInfo = report.driverHp ? `${report.driver || '-'} (${report.driverHp})` : (report.driver || '-');
  const jamInfo = (report.jamMulai || report.jamSelesai) ? `${report.jamMulai || '05:00'} - ${report.jamSelesai || '12:00'} WIB` : 'Reguler';
  const statusInfo = report.statusTugas === 'selesai' ? 'SELESAI (TERSEDIA)' : 'SEDANG BERTUGAS';

  // Title Header
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 78, 59); // emerald-900
  doc.text('LAPORAN OPERASIONAL & MANIFEST PENUMPANG', 14, 14);

  // Subheader details in 3 columns
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(`Nama Kereta / Rute : ${report.namaKereta || '-'}`, 14, 21);
  doc.text(`Tanggal Operasional: ${report.tanggal || '-'}`, 14, 26);
  doc.text(`Driver / Petugas   : ${drvInfo}`, 14, 31);

  doc.text(`Armada & Plat : ${vehInfo}`, 115, 21);
  doc.text(`Jam Tugas     : ${jamInfo}`, 115, 26);
  doc.text(`Status Shift  : ${statusInfo}`, 115, 31);

  if (report.catatanHeader) {
    doc.text(`Catatan: ${report.catatanHeader}`, 210, 21);
  }
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 210, 26);
  doc.text(`Total Penumpang: ${filledRows.length} Orang`, 210, 31);

  // Table Data
  const tableData = rowsToExport.map((row, idx) => [
    row.no || idx + 1,
    row.tanggal || report.tanggal || '-',
    row.jam || report.jamMulai || '-',
    row.tripType === 'kedatangan' ? 'Kedatangan' : 'Keberangkatan',
    row.hp || '-',
    row.nama || '-',
    row.antar || '-',
    row.jemput || '-',
    row.keterangan || '-',
  ]);

  autoTable(doc, {
    startY: 36,
    head: [['NO', 'TANGGAL', 'JAM', 'JENIS', 'NO HP / WA', 'NAMA PENUMPANG', 'ANTAR', 'JEMPUT', 'KETERANGAN']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105], // emerald-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },  // NO
      1: { halign: 'center', cellWidth: 26 },  // TANGGAL (sebelum JAM)
      2: { halign: 'center', cellWidth: 16 },  // JAM
      3: { halign: 'center', cellWidth: 24 },  // JENIS
      4: { cellWidth: 30 },                   // NO HP
      5: { fontStyle: 'bold', cellWidth: 42 }, // NAMA
      6: { cellWidth: 28 },                   // ANTAR
      7: { cellWidth: 28 },                   // JEMPUT
      8: { cellWidth: 'auto' },               // KETERANGAN
    },
  });

  const safeDate = (report.tanggal || 'Laporan').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDriver = (report.driver || 'Driver').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = customFileName || `Laporan_${safeDriver}_${safeDate}.pdf`;

  doc.save(fileName);
  return fileName;
}

/**
 * Export consolidated multi-driver reports to PDF (.pdf) format
 */
export function exportMultiDriverPDF(reports: ReportDocument[], customFileName?: string): string {
  if (!reports || reports.length === 0) return '';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const dateStr = reports[0]?.tanggal || 'Hari Ini';

  // Title Header
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('REKAP GABUNGAN SEMUA DRIVER & PENUMPANG', 14, 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Operasional: ${dateStr}`, 14, 21);
  doc.text(`Total Armada Bertugas: ${reports.length} Driver`, 14, 26);

  const totalFilled = reports.reduce((sum, r) => sum + getFilledRows(r.rows).length, 0);
  doc.text(`Total Seluruh Penumpang: ${totalFilled} Orang`, 115, 21);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 115, 26);

  const tableData: (string | number)[][] = [];
  let globalNo = 1;

  reports.forEach((rep) => {
    const filled = getFilledRows(rep.rows);
    const rows = filled.length > 0 ? filled : rep.rows.slice(0, 5);
    rows.forEach((r) => {
      tableData.push([
        globalNo++,
        r.tanggal || rep.tanggal || '-',
        r.jam || rep.jamMulai || '-',
        r.tripType === 'kedatangan' ? 'Kedatangan' : 'Keberangkatan',
        rep.driver || '-',
        `${rep.kendaraan || '-'}${rep.platNomor ? ` (${rep.platNomor})` : ''}`,
        r.hp || '-',
        r.nama || '-',
        r.antar || '-',
        r.jemput || '-',
        r.keterangan || '-',
      ]);
    });
  });

  autoTable(doc, {
    startY: 32,
    head: [['NO', 'TANGGAL', 'JAM', 'JENIS', 'DRIVER', 'ARMADA / PLAT', 'NO HP', 'NAMA PENUMPANG', 'ANTAR', 'JEMPUT', 'KETERANGAN']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },   // NO
      1: { halign: 'center', cellWidth: 24 },  // TANGGAL (sebelum JAM)
      2: { halign: 'center', cellWidth: 14 },  // JAM
      3: { halign: 'center', cellWidth: 22 },  // JENIS
      4: { fontStyle: 'bold', cellWidth: 24 }, // DRIVER
      5: { cellWidth: 26 },                   // ARMADA
      6: { cellWidth: 24 },                   // HP
      7: { fontStyle: 'bold', cellWidth: 34 }, // NAMA
      8: { cellWidth: 22 },                   // ANTAR
      9: { cellWidth: 22 },                   // JEMPUT
      10: { cellWidth: 'auto' },              // KETERANGAN
    },
  });

  const safeDate = dateStr.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = customFileName || `Rekap_Semua_Driver_${safeDate}.pdf`;

  doc.save(fileName);
  return fileName;
}


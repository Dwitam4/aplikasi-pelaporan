import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  Download, 
  Printer, 
  Plus, 
  Share2, 
  Copy, 
  Check, 
  Info,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Settings2,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Calendar,
  Car,
  Database,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { ReportDocument, ReportRow, UserRole, MasterPresets, UnassignedPassenger } from './types';
import { initialSampleReport, copyToGoogleSheetsClipboard, getFilledRows, defaultMasterPresets, createEmptyReportRows } from './utils/spreadsheet';
import { formatIndonesianDate } from './utils/date';
import { decodeReportPayload } from './utils/shareLink';
import { 
  subscribeToReports, 
  subscribeToMasterPresets, 
  saveReportToDatabase, 
  deleteReportFromDatabase, 
  saveMasterPresetsToDatabase,
  seedInitialDatabaseIfEmpty,
  subscribeToUnassignedPassengers,
  saveUnassignedPassengersToDatabase
} from './services/firebaseSync';
import { HeaderNavbar } from './components/HeaderNavbar';
import { MultiDriverManifestBar } from './components/MultiDriverManifestBar';
import { SpreadsheetGrid } from './components/SpreadsheetGrid';
import { ReportSummaryCards } from './components/ReportSummaryCards';
import { AiScanModal } from './components/AiScanModal';
import { ExportModal } from './components/ExportModal';
import { ReportHistoryDrawer } from './components/ReportHistoryDrawer';
import { PrintView } from './components/PrintView';
import { ShareDriverModal } from './components/ShareDriverModal';
import { MasterPresetsModal } from './components/MasterPresetsModal';
import { AddDriverModal } from './components/AddDriverModal';
import { EditDriverModal } from './components/EditDriverModal';
import { AddPassengerModal } from './components/AddPassengerModal';
import { EditPassengerModal } from './components/EditPassengerModal';
import { AdminScheduleCalendarModal } from './components/AdminScheduleCalendarModal';
import { UnassignedPassengerPool } from './components/UnassignedPassengerPool';

const STORAGE_KEY = 'pelaporan_spreadsheet_data_v1';
const ACTIVE_ID_KEY = 'pelaporan_spreadsheet_active_id_v1';
const PRESETS_STORAGE_KEY = 'pelaporan_master_presets_v1';
const ROLE_STORAGE_KEY = 'pelaporan_user_role_v1';
const UNASSIGNED_STORAGE_KEY = 'pelaporan_unassigned_passengers_v1';

export default function App() {
  // Check URL params for role=driver
  const getInitialRole = (): UserRole => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRole = urlParams.get('role');
      if (urlRole === 'driver') return 'driver';
      if (urlRole === 'admin') return 'admin';
      
      const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
      if (storedRole === 'driver' || storedRole === 'admin') return storedRole;
    } catch (e) {}
    return 'admin';
  };

  const [userRole, setUserRole] = useState<UserRole>(getInitialRole);

  // Master presets state (Kereta, Kendaraan, Antar, Jemput)
  const [masterPresets, setMasterPresets] = useState<MasterPresets>(() => {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.keretaList && parsed.kendaraanList && parsed.antarList && parsed.jemputList) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse master presets:', e);
    }
    return defaultMasterPresets;
  });

  // Load saved reports or fallback to sample, with support for incoming shared URL payload
  const [savedReports, setSavedReports] = useState<ReportDocument[]>(() => {
    try {
      // Check if a shared report payload was passed in the URL (e.g. from WhatsApp driver link)
      const urlParams = new URLSearchParams(window.location.search);
      const sharedData = urlParams.get('data');
      if (sharedData) {
        const decoded = decodeReportPayload(sharedData);
        if (decoded && decoded.id) {
          const stored = localStorage.getItem(STORAGE_KEY);
          let existing: ReportDocument[] = [];
          if (stored) {
            try { existing = JSON.parse(stored); } catch (e) {}
          }
          const index = existing.findIndex((r) => r.id === decoded.id);
          if (index >= 0) {
            existing[index] = decoded;
          } else {
            existing.unshift(decoded);
          }
          return existing;
        }
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sanitize: strip out completely empty rows so only real passengers are kept in list
          const sanitized = parsed.map((doc: ReportDocument) => {
            const filledRows = getFilledRows(doc.rows || []);
            const renumbered = filledRows.map((r, idx) => ({ ...r, no: idx + 1 }));
            return {
              ...doc,
              rows: renumbered,
            };
          });
          return sanitized;
        }
      }
    } catch (e) {
      console.warn('Failed to parse local storage:', e);
    }
    return [initialSampleReport];
  });

  const [activeReportId, setActiveReportId] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlReportId = urlParams.get('reportId');
      if (urlReportId) return urlReportId;

      const activeId = localStorage.getItem(ACTIVE_ID_KEY);
      if (activeId) return activeId;
    } catch (e) {}
    return initialSampleReport.id;
  });

  // Current active report
  const currentReport = savedReports.find((r) => r.id === activeReportId) || savedReports[0] || initialSampleReport;

  // Modals state
  const [isAiScanOpen, setIsAiScanOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isShareDriverOpen, setIsShareDriverOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isScheduleCalendarOpen, setIsScheduleCalendarOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [addDriverInitialDate, setAddDriverInitialDate] = useState<string>('');
  const [addDriverInitialJam, setAddDriverInitialJam] = useState<string | undefined>(undefined);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<ReportDocument | null>(null);

  // Passenger Modals & Unassigned Passengers Pool
  const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);
  const [addPassengerInitialDate, setAddPassengerInitialDate] = useState<string | undefined>();
  const [addPassengerInitialMode, setAddPassengerInitialMode] = useState<'queue' | 'auto' | 'manual' | undefined>();
  const [isEditPassengerOpen, setIsEditPassengerOpen] = useState(false);
  const [passengerToEdit, setPassengerToEdit] = useState<ReportRow | null>(null);
  const [unassignedPassengers, setUnassignedPassengers] = useState<UnassignedPassenger[]>(() => {
    try {
      const stored = localStorage.getItem(UNASSIGNED_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);

  // 1. Initial Firestore seed & live real-time subscription for Reports, Presets, and Unassigned Pool
  useEffect(() => {
    // Attempt initial seed if empty
    seedInitialDatabaseIfEmpty(initialSampleReport, defaultMasterPresets);

    // Subscribe to real-time reports from Firestore
    const unsubscribeReports = subscribeToReports(
      (remoteReports) => {
        if (remoteReports && remoteReports.length > 0) {
          setSavedReports(remoteReports);
          // If active report is not in new list, select the first one
          setActiveReportId((currId) => {
            const exists = remoteReports.some((r) => r.id === currId);
            return exists ? currId : remoteReports[0].id;
          });
        }
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Live sync error, operating with local copy:', err);
        setIsCloudSynced(false);
      }
    );

    // Subscribe to real-time master presets from Firestore
    const unsubscribePresets = subscribeToMasterPresets(
      (remotePresets) => {
        if (remotePresets && remotePresets.keretaList) {
          setMasterPresets(remotePresets);
        }
      },
      (err) => {
        console.warn('Presets live sync notice:', err);
      }
    );

    // Subscribe to unassigned passengers pool from Firestore
    const unsubscribeUnassigned = subscribeToUnassignedPassengers(
      (remotePassengers) => {
        if (remotePassengers) {
          setUnassignedPassengers(remotePassengers);
        }
      },
      (err) => {
        console.warn('Unassigned pool sync notice:', err);
      }
    );

    return () => {
      unsubscribeReports();
      unsubscribePresets();
      unsubscribeUnassigned();
    };
  }, []);

  // Sync unassigned passengers to local storage
  useEffect(() => {
    try {
      localStorage.setItem(UNASSIGNED_STORAGE_KEY, JSON.stringify(unassignedPassengers));
    } catch (e) {
      console.error('Failed to save unassigned passengers to local storage', e);
    }
  }, [unassignedPassengers]);

  // Sync reports to local storage as fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedReports));
      localStorage.setItem(ACTIVE_ID_KEY, activeReportId);
    } catch (e) {
      console.error('Failed to save reports to local storage', e);
    }
  }, [savedReports, activeReportId]);

  // Sync presets to local storage
  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(masterPresets));
    } catch (e) {
      console.error('Failed to save master presets to local storage', e);
    }
  }, [masterPresets]);

  // Sync role to local storage
  useEffect(() => {
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, userRole);
    } catch (e) {}
  }, [userRole]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setUserRole(newRole);
    if (newRole === 'driver') {
      showToast('Beralih ke Mode Driver (Ceklis kehadiran penumpang)');
    } else {
      showToast('Beralih ke Mode Admin (Akses penuh)');
    }
  };

  // Update current report
  const handleUpdateReport = (updatedFields: Partial<ReportDocument>) => {
    const updatedDoc = {
      ...currentReport,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic local state update
    setSavedReports((prev) =>
      prev.map((r) => (r.id === currentReport.id ? updatedDoc : r))
    );

    // Save to Firestore Real-Time Cloud
    saveReportToDatabase(updatedDoc).catch((err) => {
      console.error('Failed to save report to Firestore:', err);
    });
  };

  // Update rows of current report
  const handleUpdateRows = (newRows: ReportRow[]) => {
    handleUpdateReport({ rows: newRows });
  };

  // Add a new row directly
  const handleQuickAddRow = () => {
    const maxTripCap = currentReport.kapasitas || 7;
    const kebCount = currentReport.rows.filter(
      (r) => (r.tripType || 'keberangkatan') === 'keberangkatan' && (r.nama.trim() || r.hp.trim())
    ).length;
    const kedCount = currentReport.rows.filter(
      (r) => r.tripType === 'kedatangan' && (r.nama.trim() || r.hp.trim())
    ).length;

    // A driver can take up to maxTripCap Keberangkatan AND maxTripCap Kedatangan
    if (kebCount >= maxTripCap && kedCount >= maxTripCap) {
      showToast(`⚠️ Kapasitas mobil ${currentReport.kendaraan} sudah PENUH (${maxTripCap} Keberangkatan + ${maxTripCap} Kedatangan)! Tambah armada baru.`);
      return;
    }

    // Default Keberangkatan: Antar ke Stasiun, Default Kedatangan: Jemput dari Stasiun (bisa diedit)
    const defaultTrip = kebCount < maxTripCap ? 'keberangkatan' : 'kedatangan';
    const nextNo = currentReport.rows.length + 1;
    const newRow: ReportRow = {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      no: nextNo,
      tanggal: currentReport.tanggal,
      jam: currentReport.jamMulai || '05:30',
      tripType: defaultTrip,
      hp: '',
      nama: '',
      antar: defaultTrip === 'keberangkatan' ? 'Stasiun' : '',
      jemput: defaultTrip === 'kedatangan' ? 'Stasiun' : '',
      keterangan: '',
      status: 'proses',
      kehadiran: 'belum_datang',
    };
    handleUpdateRows([...currentReport.rows, newRow]);
  };

  // Clear empty rows
  const handleClearEmptyRows = () => {
    const filled = getFilledRows(currentReport.rows);
    if (filled.length === 0) {
      showToast('Tidak ada baris yang terisi.');
      return;
    }
    const renumbered = filled.map((r, i) => ({ ...r, no: i + 1 }));
    handleUpdateRows(renumbered);
    showToast(`Dibersihkan! Tersisa ${filled.length} baris terisi.`);
  };

  // New report creation
  const handleCreateNewReport = () => {
    const dateFormatted = formatIndonesianDate(new Date());

    const newDoc: ReportDocument = {
      id: 'rep-' + Date.now(),
      title: 'Laporan Baru',
      namaKereta: masterPresets.keretaList[0] || 'BIB/RGA',
      tanggal: dateFormatted,
      kendaraan: masterPresets.kendaraanList[0] || 'Luxio',
      driver: '',
      catatanHeader: '',
      rows: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSavedReports((prev) => [newDoc, ...prev]);
    setActiveReportId(newDoc.id);
    saveReportToDatabase(newDoc).catch((err) => console.error(err));
    showToast('Lembar armada baru siap digunakan.');
  };

  // Save new driver assignment (modal)
  const handleSaveNewDriverAssignment = (data: {
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
  }) => {
    const kapasitas = data.kapasitas || 7;

    // Passenger assignment is intentionally manual. A new driver starts with an empty manifest;
    // the admin chooses each passenger, driver, and schedule from the queue.
    const initialRows: ReportRow[] = [];

    const newDoc: ReportDocument = {
      id: 'rep-' + Date.now(),
      title: `Laporan ${data.kendaraan} (${data.driver || 'Driver'})`,
      namaKereta: data.namaKereta || 'BIB/RGA',
      tanggal: data.tanggal,
      jamMulai: data.jamMulai || '05:00',
      jamSelesai: data.jamSelesai || '12:00',
      statusTugas: 'aktif',
      kendaraan: data.kendaraan,
      platNomor: data.platNomor,
      driver: data.driver,
      driverHp: data.driverHp,
      driverId: data.driverId,
      vehicleId: data.vehicleId,
      kapasitas: data.kapasitas || 7,
      catatanHeader: data.catatanHeader || '',
      rows: initialRows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSavedReports((prev) => [newDoc, ...prev]);
    setActiveReportId(newDoc.id);
    saveReportToDatabase(newDoc).catch((err) => console.error(err));

    confetti({ particleCount: 45, spread: 65, origin: { y: 0.8 } });
    showToast(`Driver ${data.driver} (${data.kendaraan}${data.platNomor ? ` - ${data.platNomor}` : ''}) [${data.jamMulai || '05:00'}-${data.jamSelesai || '12:00'}] berhasil ditugaskan! Manifest masih kosong — pilih penumpang secara manual.`);
  };

  // Edit unassigned passenger in queue
  const handleEditUnassignedPassenger = (updated: UnassignedPassenger) => {
    const updatedPool = unassignedPassengers.map((p) => (p.id === updated.id ? updated : p));
    setUnassignedPassengers(updatedPool);
    saveUnassignedPassengersToDatabase(updatedPool).catch(console.error);
    showToast(`Data antrean penumpang "${updated.nama}" berhasil diperbarui!`);
  };

  // Toggle task status ('aktif' <-> 'selesai')
  const handleToggleTaskStatus = (reportId: string, customStatus?: 'aktif' | 'selesai') => {
    let toggledTo = '';
    let driverName = '';
    let carName = '';

    const target = savedReports.find((r) => r.id === reportId);
    if (!target) return;

    const current = target.statusTugas || 'aktif';
    const nextStatus = customStatus || (current === 'aktif' ? 'selesai' : 'aktif');
    toggledTo = nextStatus;
    driverName = target.driver || 'Driver';
    carName = target.kendaraan || 'Armada';
    const isCompleting = nextStatus === 'selesai';
    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const updatedDoc: ReportDocument = {
      ...target,
      statusTugas: nextStatus,
      waktuSelesaiActual: isCompleting ? (target.waktuSelesaiActual || nowStr) : undefined,
      updatedAt: new Date().toISOString(),
    };

    setSavedReports((prev) =>
      prev.map((r) => (r.id === reportId ? updatedDoc : r))
    );
    saveReportToDatabase(updatedDoc).catch((err) => console.error(err));

    if (toggledTo === 'selesai') {
      confetti({ particleCount: 65, spread: 75, origin: { y: 0.7 } });
      showToast(`🎉 Tugas ${driverName} (${carName}) SELESAI. Driver & mobil kini TERSEDIA kembali untuk tugas berikutnya!`);
    } else {
      showToast(`Status tugas ${driverName} (${carName}) diubah ke AKTIF (Sedang Bertugas).`);
    }
  };

  // Save edit driver assignment
  const handleSaveEditDriver = (updatedFields: Partial<ReportDocument>) => {
    if (driverToEdit) {
      const updatedDoc: ReportDocument = {
        ...driverToEdit,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };
      setSavedReports((prev) =>
        prev.map((r) =>
          r.id === driverToEdit.id ? updatedDoc : r
        )
      );
      saveReportToDatabase(updatedDoc).catch((err) => console.error(err));
      showToast(`Data driver & armada berhasil diperbarui.`);
      setDriverToEdit(null);
    }
  };

  // Add Passenger workflow (assign passenger(s) to selected driver, or save to unassigned pool)
  const handleSavePassenger = (data: {
    targetReportId?: string;
    passenger?: Omit<ReportRow, 'id' | 'no'>;
    passengers?: Array<Omit<ReportRow, 'id' | 'no'>>;
    tanggal: string;
  }) => {
    const listToSave = data.passengers && data.passengers.length > 0
      ? data.passengers
      : data.passenger
      ? [data.passenger]
      : [];

    if (listToSave.length === 0) return;

    const count = listToSave.length;
    const bookerName = listToSave[0].bookerName || listToSave[0].nama;

    // If targetReportId is not provided, save to unassigned pool! ("Entry Dulu")
    if (!data.targetReportId) {
      const newUnassignedItems: UnassignedPassenger[] = listToSave.map((p, idx) => ({
        ...p,
        id: 'unassigned-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
        no: 0,
        tripType: p.tripType || 'keberangkatan',
        tanggal: data.tanggal,
        createdAt: new Date().toISOString(),
      }));

      const updatedPool = [...newUnassignedItems, ...unassignedPassengers];
      setUnassignedPassengers(updatedPool);
      saveUnassignedPassengersToDatabase(updatedPool).catch(console.error);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      if (count > 1) {
        showToast(`Pesanan rombongan ${count} orang ("${bookerName}") disimpan ke Antrean Tunggu.`);
      } else {
        showToast(`Penumpang "${bookerName}" disimpan ke Antrean Tunggu (Pilihan Driver Nanti).`);
      }
      return;
    }

    const targetDoc = savedReports.find((r) => r.id === data.targetReportId);
    if (!targetDoc) return;

    // Check capacity: Keberangkatan & Kedatangan independent capacity (e.g. 7 seats each)
    const tripTypeTarget = listToSave[0].tripType || 'keberangkatan';
    const filledForTrip = getFilledRows(targetDoc.rows).filter((r) => (r.tripType || 'keberangkatan') === tripTypeTarget).length;
    const kapasitas = targetDoc.kapasitas || 7;
    const remainingSeats = Math.max(0, kapasitas - filledForTrip);

    if (remainingSeats < count) {
      showToast(`⚠️ Tidak bisa menambahkan: Armada ${targetDoc.kendaraan} (${targetDoc.driver}) sisa ${remainingSeats} kursi untuk ${tripTypeTarget === 'keberangkatan' ? 'Keberangkatan' : 'Kedatangan'}, tidak cukup untuk ${count} orang!`);
      return;
    }

    // Insert passengers into targetDoc: replace empty rows first, then append
    const existingRows = [...targetDoc.rows];
    let insertIndex = 0;

    for (let p of listToSave) {
      const emptyIndex = existingRows.findIndex(
        (r, idx) => idx >= insertIndex && !r.nama.trim() && !r.hp.trim() && !r.antar.trim() && !r.jemput.trim() && !r.keterangan.trim()
      );

      const newPassengerRow: ReportRow = {
        ...p,
        id: 'pnp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        no: emptyIndex >= 0 ? emptyIndex + 1 : existingRows.length + 1,
      };

      if (emptyIndex >= 0) {
        existingRows[emptyIndex] = newPassengerRow;
        insertIndex = emptyIndex + 1;
      } else {
        existingRows.push(newPassengerRow);
        insertIndex = existingRows.length;
      }
    }

    const finalRows = existingRows.map((r, i) => ({ ...r, no: i + 1 }));

    const updatedDoc: ReportDocument = {
      ...targetDoc,
      rows: finalRows,
      updatedAt: new Date().toISOString(),
    };

    setSavedReports((prev) =>
      prev.map((r) => (r.id === targetDoc.id ? updatedDoc : r))
    );
    setActiveReportId(targetDoc.id);
    saveReportToDatabase(updatedDoc).catch((err) => console.error(err));
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    if (count > 1) {
      showToast(`🎉 ${count} kursi pemesanan rombongan (${bookerName}) berhasil dimasukkan ke armada ${targetDoc.driver} (${targetDoc.kendaraan})!`);
    } else {
      showToast(`Penumpang "${bookerName}" berhasil ditugaskan ke ${targetDoc.driver || 'Driver'}!`);
    }
  };

  // Assign a passenger (or whole group) from unassigned pool to a specific driver report
  const handleAssignUnassignedToDriver = (
    passengerId: string, 
    targetReportId: string,
    assignWholeGroup: boolean = false
  ) => {
    const unassignedItem = unassignedPassengers.find((p) => p.id === passengerId);
    if (!unassignedItem) return;

    const targetDoc = savedReports.find((r) => r.id === targetReportId);
    if (!targetDoc) {
      showToast('⚠️ Driver/Armada tujuan tidak ditemukan.');
      return;
    }

    // Determine passengers to assign
    let itemsToAssign: UnassignedPassenger[] = [];
    if (assignWholeGroup && unassignedItem.bookingGroupId) {
      itemsToAssign = unassignedPassengers.filter(
        (p) => p.bookingGroupId === unassignedItem.bookingGroupId
      );
    } else {
      itemsToAssign = [unassignedItem];
    }

    const countToAssign = itemsToAssign.length;
    const tripTypeTarget = itemsToAssign[0].tripType || 'keberangkatan';
    const filledForTrip = getFilledRows(targetDoc.rows).filter((r) => (r.tripType || 'keberangkatan') === tripTypeTarget).length;
    const kapasitas = targetDoc.kapasitas || 7;
    const remainingSeats = Math.max(0, kapasitas - filledForTrip);

    if (remainingSeats < countToAssign) {
      showToast(`⚠️ Sisa kursi armada ${targetDoc.kendaraan} (${targetDoc.driver}) untuk ${tripTypeTarget === 'keberangkatan' ? 'Keberangkatan' : 'Kedatangan'} hanya ${remainingSeats} kursi, tidak cukup untuk ${countToAssign} orang!`);
      return;
    }

    const existingRows = [...targetDoc.rows];
    let insertIndex = 0;

    for (const item of itemsToAssign) {
      const emptyIndex = existingRows.findIndex(
        (r, idx) => idx >= insertIndex && !r.nama.trim() && !r.hp.trim() && !r.antar.trim() && !r.jemput.trim() && !r.keterangan.trim()
      );

      const newPassengerRow: ReportRow = {
        id: 'pnp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        no: emptyIndex >= 0 ? emptyIndex + 1 : existingRows.length + 1,
        nama: item.nama,
        hp: item.hp,
        antar: item.antar,
        jemput: item.jemput,
        jam: item.jam,
        keterangan: item.keterangan,
        tripType: item.tripType || 'keberangkatan',
        tarif: item.tarif,
        kehadiran: item.kehadiran || 'belum_datang',
        status: item.status || 'proses',
        bookingGroupId: item.bookingGroupId,
        bookerName: item.bookerName,
        totalSeatsInBooking: item.totalSeatsInBooking,
        seatIndex: item.seatIndex,
      };

      if (emptyIndex >= 0) {
        existingRows[emptyIndex] = newPassengerRow;
        insertIndex = emptyIndex + 1;
      } else {
        existingRows.push(newPassengerRow);
        insertIndex = existingRows.length;
      }
    }

    const finalRows = existingRows.map((r, i) => ({ ...r, no: i + 1 }));

    const updatedDoc: ReportDocument = {
      ...targetDoc,
      rows: finalRows,
      updatedAt: new Date().toISOString(),
    };

    // Remove from unassigned pool
    const assignedIds = new Set(itemsToAssign.map((p) => p.id));
    const updatedPool = unassignedPassengers.filter((p) => !assignedIds.has(p.id));
    setUnassignedPassengers(updatedPool);
    saveUnassignedPassengersToDatabase(updatedPool).catch(console.error);

    // Save updated report
    setSavedReports((prev) =>
      prev.map((r) => (r.id === targetDoc.id ? updatedDoc : r))
    );
    setActiveReportId(targetDoc.id);
    saveReportToDatabase(updatedDoc).catch(console.error);

    confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
    if (countToAssign > 1) {
      showToast(`🎉 ${countToAssign} orang rombongan (${unassignedItem.bookerName || unassignedItem.nama}) berhasil dimasukkan ke driver ${targetDoc.driver}!`);
    } else {
      showToast(`Penumpang "${unassignedItem.nama}" berhasil dimasukkan ke driver ${targetDoc.driver}!`);
    }
  };

  // Auto assign all unassigned passengers
  const handleAutoAssignAllUnassigned = () => {
    if (unassignedPassengers.length === 0) return;

    let remainingPool = [...unassignedPassengers];
    let reportsMap = new Map<string, ReportDocument>();
    savedReports.forEach((r) => reportsMap.set(r.id, { ...r, rows: [...r.rows] }));

    let assignedCount = 0;

    // Group items by bookingGroupId where applicable to keep groups in same vehicle
    const processedIds = new Set<string>();

    for (const item of unassignedPassengers) {
      if (processedIds.has(item.id)) continue;

      let groupItems = [item];
      if (item.bookingGroupId) {
        groupItems = unassignedPassengers.filter(
          (p) => p.bookingGroupId === item.bookingGroupId && !processedIds.has(p.id)
        );
      }

      const count = groupItems.length;

      const tripTarget = item.tripType || 'keberangkatan';
      // Find candidate report on same date with remaining capacity for this trip direction >= count
      const candidates = Array.from(reportsMap.values()).filter((r) => {
        const isSameDate = r.tanggal === item.tanggal;
        const filledForTrip = getFilledRows(r.rows).filter(
          (row) => (row.tripType || 'keberangkatan') === tripTarget
        ).length;
        const cap = r.kapasitas || 7;
        return isSameDate && (cap - filledForTrip) >= count;
      });

      if (candidates.length === 0) {
        // If whole group cannot fit in one car, and group > 1, try individual assignment if fallback
        if (count > 1) {
          // Leave for manual split or continue
          continue;
        }
        continue;
      }

      // Prefer candidate whose header matches preferred jam
      const matched = candidates.find((r) => {
        if (!item.jam) return true;
        return r.jamMulai === item.jam || r.rows.some((row) => row.jam === item.jam);
      }) || candidates[0];

      // Assign items to this candidate
      const existingRows = [...matched.rows];
      let insertIndex = 0;

      for (const p of groupItems) {
        const firstEmptyIndex = existingRows.findIndex(
          (r, idx) => idx >= insertIndex && !r.nama.trim() && !r.hp.trim() && !r.antar.trim() && !r.jemput.trim() && !r.keterangan.trim()
        );

        const newPassengerRow: ReportRow = {
          id: 'pnp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          no: firstEmptyIndex >= 0 ? firstEmptyIndex + 1 : existingRows.length + 1,
          nama: p.nama,
          hp: p.hp,
          antar: p.antar,
          jemput: p.jemput,
          jam: p.jam,
          keterangan: p.keterangan,
          tripType: p.tripType || 'keberangkatan',
          tarif: p.tarif,
          kehadiran: p.kehadiran || 'belum_datang',
          status: p.status || 'proses',
          bookingGroupId: p.bookingGroupId,
          bookerName: p.bookerName,
          totalSeatsInBooking: p.totalSeatsInBooking,
          seatIndex: p.seatIndex,
        };

        if (firstEmptyIndex >= 0) {
          existingRows[firstEmptyIndex] = newPassengerRow;
          insertIndex = firstEmptyIndex + 1;
        } else {
          existingRows.push(newPassengerRow);
          insertIndex = existingRows.length;
        }

        processedIds.add(p.id);
        remainingPool = remainingPool.filter((rem) => rem.id !== p.id);
        assignedCount++;
      }

      matched.rows = existingRows.map((r, i) => ({ ...r, no: i + 1 }));
      matched.updatedAt = new Date().toISOString();
      reportsMap.set(matched.id, matched);
    }

    if (assignedCount > 0) {
      const updatedReportsArray = Array.from(reportsMap.values());
      setSavedReports(updatedReportsArray);
      setUnassignedPassengers(remainingPool);

      // Save to Firestore
      saveUnassignedPassengersToDatabase(remainingPool).catch(console.error);
      updatedReportsArray.forEach((r) => saveReportToDatabase(r).catch(console.error));

      confetti({ particleCount: 50, spread: 70, origin: { y: 0.8 } });
      showToast(`Berhasil menugaskan ${assignedCount} penumpang secara otomatis ke driver!`);
    } else {
      showToast('Tidak ada driver dengan kapasitas tersedia pada tanggal yang sesuai.');
    }
  };

  // Delete passenger from unassigned pool
  const handleDeleteUnassigned = (passengerId: string) => {
    const updated = unassignedPassengers.filter((p) => p.id !== passengerId);
    setUnassignedPassengers(updated);
    saveUnassignedPassengersToDatabase(updated).catch(console.error);
    showToast('Penumpang dihapus dari antrean tunggu.');
  };

  // Create new driver on the fly and add passenger
  const handleCreateDriverAndAddPassenger = (data: {
    driver: string;
    kendaraan: string;
    namaKereta: string;
    tanggal: string;
    passenger: Omit<ReportRow, 'id' | 'no'>;
  }) => {
    const newPassengerRow: ReportRow = {
      ...data.passenger,
      id: 'pnp-' + Date.now(),
      no: 1,
    };

    const newDoc: ReportDocument = {
      id: 'rep-' + Date.now(),
      title: `Laporan ${data.kendaraan} (${data.driver})`,
      namaKereta: data.namaKereta || 'BIB/RGA',
      tanggal: data.tanggal,
      kendaraan: data.kendaraan,
      driver: data.driver,
      catatanHeader: '',
      rows: [newPassengerRow],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSavedReports((prev) => [newDoc, ...prev]);
    setActiveReportId(newDoc.id);
    saveReportToDatabase(newDoc).catch((err) => console.error(err));
    confetti({ particleCount: 50, spread: 65, origin: { y: 0.8 } });
    showToast(`Penumpang "${data.passenger.nama}" ditugaskan ke driver baru ${data.driver}!`);
  };

  // Save edited passenger & support reassigning to different driver report
  const handleSaveEditPassenger = (data: {
    targetReportId: string;
    updatedPassenger: ReportRow;
  }) => {
    if (data.targetReportId === currentReport.id) {
      // Edit in place
      const updatedRows = currentReport.rows.map((r) =>
        r.id === data.updatedPassenger.id ? data.updatedPassenger : r
      );
      handleUpdateRows(updatedRows);
      showToast(`Data penumpang "${data.updatedPassenger.nama}" diperbarui.`);
    } else {
      // Move to target report
      // 1. Remove from current
      const filteredCurrent = currentReport.rows.filter((r) => r.id !== data.updatedPassenger.id);
      const renumberedCurrent = filteredCurrent.map((r, i) => ({ ...r, no: i + 1 }));
      const updatedCurrentDoc = {
        ...currentReport,
        rows: renumberedCurrent,
        updatedAt: new Date().toISOString(),
      };
      
      // 2. Add to target
      const targetDoc = savedReports.find((r) => r.id === data.targetReportId);
      if (targetDoc) {
        const targetRows = [...targetDoc.rows, { ...data.updatedPassenger, no: targetDoc.rows.length + 1 }];
        const updatedTargetDoc = {
          ...targetDoc,
          rows: targetRows,
          updatedAt: new Date().toISOString(),
        };

        setSavedReports((prev) =>
          prev.map((r) => {
            if (r.id === currentReport.id) return updatedCurrentDoc;
            if (r.id === targetDoc.id) return updatedTargetDoc;
            return r;
          })
        );
        setActiveReportId(targetDoc.id);
        saveReportToDatabase(updatedCurrentDoc).catch((err) => console.error(err));
        saveReportToDatabase(updatedTargetDoc).catch((err) => console.error(err));
        showToast(`Penumpang "${data.updatedPassenger.nama}" dipindahkan ke ${targetDoc.driver || 'Driver'}.`);
      }
    }
  };

  // Delete passenger
  const handleDeletePassenger = (passengerId: string) => {
    const updated = currentReport.rows.filter((r) => r.id !== passengerId);
    const renumbered = updated.map((r, i) => ({ ...r, no: i + 1 }));
    handleUpdateRows(renumbered);
    showToast('Penumpang berhasil dihapus.');
  };

  // Delete report/fleet
  const handleDeleteReport = (id: string) => {
    const targetReport = savedReports.find((r) => r.id === id);
    let restoredCount = 0;

    // Preserve passengers: do NOT delete passengers when driver is deleted!
    // Return all valid passengers back to unassignedPassengers queue and persist to Firestore.
    if (targetReport && targetReport.rows && targetReport.rows.length > 0) {
      const validRows = targetReport.rows.filter(
        (row) => (row.nama && row.nama.trim() !== '') || (row.hp && row.hp.trim() !== '')
      );
      if (validRows.length > 0) {
        restoredCount = validRows.length;
        const restoredPassengers: UnassignedPassenger[] = validRows.map((r, idx) => ({
          ...r,
          id: r.id || `pnp-ret-${Date.now()}-${idx}`,
          tanggal: targetReport.tanggal || formatIndonesianDate(new Date()),
          jam: r.jam || targetReport.jamMulai || '05:30',
          keterangan: r.keterangan ? `${r.keterangan} (Eks driver: ${targetReport.driver || 'Driver'})` : `Eks driver: ${targetReport.driver || 'Driver'}`,
          createdAt: new Date().toISOString(),
        }));

        setUnassignedPassengers((prev) => {
          const updated = [...restoredPassengers, ...prev];
          saveUnassignedPassengersToDatabase(updated).catch((err) =>
            console.error('Gagal menyimpan penumpang ke antrian:', err)
          );
          return updated;
        });
      }
    }

    // Delete report from Firestore
    deleteReportFromDatabase(id).catch((err) => console.error(err));

    const remaining = savedReports.filter((r) => r.id !== id);
    if (remaining.length === 0) {
      const dateFormatted = formatIndonesianDate(new Date());
      const newDoc: ReportDocument = {
        id: 'rep-' + Date.now(),
        title: 'Laporan Baru',
        namaKereta: masterPresets.keretaList[0] || 'BIB/RGA',
        tanggal: dateFormatted,
        kendaraan: masterPresets.kendaraanList[0] || 'Luxio',
        driver: '',
        catatanHeader: '',
        rows: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSavedReports([newDoc]);
      setActiveReportId(newDoc.id);
      saveReportToDatabase(newDoc).catch((err) => console.error(err));
    } else {
      setSavedReports(remaining);
      if (activeReportId === id) {
        setActiveReportId(remaining[0].id);
      }
    }

    if (restoredCount > 0) {
      showToast(`Driver dihapus. ${restoredCount} penumpang tersimpan aman & dikembalikan ke antrian!`);
    } else {
      showToast('Penugasan driver berhasil dihapus.');
    }
  };

  // Quick Google Sheets Copy
  const handleQuickCopy = async () => {
    const ok = await copyToGoogleSheetsClipboard(currentReport);
    if (ok) {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
      showToast('Tabel berhasil disalin! Tekan Ctrl+V di Google Sheets / Excel.');
    } else {
      showToast('Gagal menyalin ke clipboard.');
    }
  };

  // Apply AI Scanned Data
  const handleApplyAiData = (scannedData: {
    namaKereta?: string;
    tanggal?: string;
    kendaraan?: string;
    catatanHeader?: string;
    rows: ReportRow[];
  }) => {
    const updated: Partial<ReportDocument> = {};
    if (scannedData.namaKereta) updated.namaKereta = scannedData.namaKereta;
    if (scannedData.tanggal) updated.tanggal = scannedData.tanggal;
    if (scannedData.kendaraan) updated.kendaraan = scannedData.kendaraan;
    if (scannedData.catatanHeader) updated.catatanHeader = scannedData.catatanHeader;
    
    let finalRows = scannedData.rows;
    if (finalRows.length < 13) {
      const extra = Array.from({ length: 13 - finalRows.length }, (_, i) => ({
        id: 'row-extra-' + Date.now() + '-' + i,
        no: finalRows.length + i + 1,
        hp: '',
        nama: '',
        antar: '',
        jemput: '',
        keterangan: '',
      }));
      finalRows = [...finalRows, ...extra];
    }
    updated.rows = finalRows;

    handleUpdateReport(updated);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    showToast('Data hasil pindai AI berhasil diterapkan ke spreadsheet!');
  };

  const filledCount = getFilledRows(currentReport.rows).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <HeaderNavbar
        role={userRole}
        onChangeRole={handleRoleChange}
        onOpenMasterPresets={() => setIsPresetsModalOpen(true)}
        onOpenAiScan={() => setIsAiScanOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenPrint={() => setIsPrintOpen(true)}
        onOpenShareDriver={() => setIsShareDriverOpen(true)}
        onNewReport={handleCreateNewReport}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAddPassenger={() => setIsAddPassengerOpen(true)}
        onOpenScheduleCalendar={() => setIsScheduleCalendarOpen(true)}
        onQuickGoogleSheetsCopy={handleQuickCopy}
        totalRowsCount={currentReport.rows.length}
        filledRowsCount={filledCount}
        isCloudSynced={isCloudSynced}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 pb-24 md:pb-8">
        
        {/* Streamlined Scheduling Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl text-white p-3.5 sm:p-5 mb-4 sm:mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold">
                  Penjadwalan Armada & Manifest Penumpang
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  {formatIndonesianDate(currentReport?.tanggal) || currentReport?.tanggal || 'Hari Ini'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 hidden sm:block mt-0.5">
                Kelola jadwal, jam keberangkatan/kedatangan, dan antrean penumpang per tanggal secara terpusat.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsScheduleCalendarOpen(true)}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-1.5 transition-all border border-emerald-500/50"
              title="Cek kalender jadwal dan kapasitas per tanggal"
            >
              <Calendar className="w-4 h-4 text-emerald-200" />
              <span>Kalender</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddPassengerOpen(true)}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5 transition-all relative"
            >
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>+ Penumpang</span>
              {unassignedPassengers.length > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-extrabold shadow-sm" title={`${unassignedPassengers.length} penumpang belum ditugaskan ke driver`}>
                  {unassignedPassengers.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="hidden sm:flex px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-sm items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor</span>
            </button>
          </div>
        </div>

        {/* Multi-Driver & Fleet Task Switcher (Grouped Per Tanggal) */}
        <MultiDriverManifestBar
          reports={savedReports}
          activeReportId={activeReportId}
          onSelectReport={(id) => setActiveReportId(id)}
          onOpenAddDriverModal={() => setIsAddDriverOpen(true)}
          onOpenEditDriverModal={(rep) => {
            setDriverToEdit(rep);
            setIsEditDriverOpen(true);
          }}
          onDeleteReport={handleDeleteReport}
          onOpenShareModal={() => setIsShareDriverOpen(true)}
          onToggleTaskStatus={handleToggleTaskStatus}
          onOpenScheduleCalendar={() => setIsScheduleCalendarOpen(true)}
          role="admin"
          currentReport={currentReport}
        />

        {/* Unassigned Passenger Pool ("Entry Dulu, Pilih Driver Nanti") */}
        <UnassignedPassengerPool
          unassignedPassengers={unassignedPassengers}
          reports={savedReports}
          currentDate={currentReport.tanggal}
          onAssignToDriver={handleAssignUnassignedToDriver}
          onDeleteUnassigned={handleDeleteUnassigned}
          onEditUnassigned={handleEditUnassignedPassenger}
          onOpenAddDriver={(date, jam) => {
            setAddDriverInitialDate(date);
            setAddDriverInitialJam(jam);
            setIsAddDriverOpen(true);
          }}
          onOpenAddPassenger={(date, mode) => {
            setAddPassengerInitialDate(date);
            setAddPassengerInitialMode(mode || 'queue');
            setIsAddPassengerOpen(true);
          }}
          onSwitchActiveDate={(date) => {
            const rep = savedReports.find((r) => r.tanggal === date);
            if (rep) setActiveReportId(rep.id);
          }}
        />

        {/* Summary Metric Counters */}
        <ReportSummaryCards report={currentReport} />

        {/* Primary Spreadsheet Grid */}
        <SpreadsheetGrid
          rows={currentReport.rows}
          onChangeRows={handleUpdateRows}
          onQuickAddRow={handleQuickAddRow}
          onOpenAddPassengerModal={() => setIsAddPassengerOpen(true)}
          onOpenEditPassengerModal={(row) => {
            setPassengerToEdit(row);
            setIsEditPassengerOpen(true);
          }}
          onClearEmptyRows={handleClearEmptyRows}
          presets={masterPresets}
          role="admin"
          isLocked={currentReport.statusTugas === 'selesai'}
          kapasitas={currentReport.kapasitas || 7}
          kendaraan={currentReport.kendaraan}
          onOpenPresetsModal={() => setIsPresetsModalOpen(true)}
        />

        {/* Google Sheets Guide Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                Integrasi Mudah dengan Google Sheets & Microsoft Excel
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gunakan tombol <strong>Salin Format Spreadsheet</strong> atau <strong>Unduh File</strong> untuk mendistribusikan manifest harian.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleQuickCopy}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Format Spreadsheet</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File</span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 text-white px-2 py-1.5 safe-pb flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => setIsAddPassengerOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-emerald-400 hover:text-emerald-300 transition-colors flex-1 min-h-[44px]"
        >
          <UserPlus className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">+ Penumpang</span>
        </button>

        <button
          type="button"
          onClick={() => setIsScheduleCalendarOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-indigo-300 hover:text-indigo-200 transition-colors flex-1 min-h-[44px]"
        >
          <Calendar className="w-5 h-5 mb-0.5 text-indigo-400" />
          <span className="text-[10px] font-bold">Kalender</span>
        </button>

        <button
          type="button"
          onClick={() => setIsAddDriverOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-amber-400 hover:text-amber-300 transition-colors flex-1 min-h-[44px]"
        >
          <Car className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-bold">+ Driver</span>
        </button>

        <button
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-amber-300 hover:text-amber-200 transition-colors flex-1 min-h-[44px]"
        >
          <CheckCircle2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium">Riwayat</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPresetsModalOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-300 hover:text-white transition-colors flex-1 min-h-[44px]"
        >
          <Database className="w-5 h-5 mb-0.5 text-slate-400" />
          <span className="text-[10px] font-medium">Master</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-5 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Aplikasi Pelaporan Spreadsheet • Format Standar Kereta / Antar-Jemput ({currentReport.namaKereta || 'BIB/RGA'})
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Penyimpanan Lokal Aktif</span>
            <span>•</span>
            <button
              onClick={() => setIsPresetsModalOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              Kelola Master Presets
            </button>
            <span>•</span>
            <button
              onClick={() => setIsPrintOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              Mode Cetak
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <AddPassengerModal
        isOpen={isAddPassengerOpen}
        onClose={() => {
          setIsAddPassengerOpen(false);
          setAddPassengerInitialDate(undefined);
          setAddPassengerInitialMode(undefined);
        }}
        reports={savedReports}
        currentReport={currentReport}
        initialDate={addPassengerInitialDate}
        initialMode={addPassengerInitialMode}
        presets={masterPresets}
        onSavePassenger={handleSavePassenger}
        onOpenAddDriverModal={(date, jam) => {
          setAddDriverInitialDate(date);
          setAddDriverInitialJam(jam);
          setIsAddPassengerOpen(false);
          setIsAddDriverOpen(true);
        }}
      />

      {passengerToEdit && (
        <EditPassengerModal
          isOpen={isEditPassengerOpen}
          onClose={() => {
            setIsEditPassengerOpen(false);
            setPassengerToEdit(null);
          }}
          reports={savedReports}
          currentReportId={currentReport.id}
          passenger={passengerToEdit}
          presets={masterPresets}
          onSave={handleSaveEditPassenger}
          onDelete={handleDeletePassenger}
        />
      )}

      <MasterPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        presets={masterPresets}
        onSavePresets={(updated) => {
          setMasterPresets(updated);
          saveMasterPresetsToDatabase(updated).catch((err) => console.error(err));
          showToast('Master presets berhasil disimpan & disinkronkan!');
        }}
      />

      <AiScanModal
        isOpen={isAiScanOpen}
        onClose={() => setIsAiScanOpen(false)}
        onApplyData={handleApplyAiData}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        report={currentReport}
        allReports={savedReports}
        onOpenPrint={() => setIsPrintOpen(true)}
        onOpenShareDriver={() => setIsShareDriverOpen(true)}
      />

      <ShareDriverModal
        isOpen={isShareDriverOpen}
        onClose={() => setIsShareDriverOpen(false)}
        report={currentReport}
      />

      <AddDriverModal
        isOpen={isAddDriverOpen}
        onClose={() => {
          setIsAddDriverOpen(false);
          setAddDriverInitialJam(undefined);
        }}
        initialDate={addDriverInitialDate || currentReport.tanggal}
        initialJam={addDriverInitialJam}
        masterPresets={masterPresets}
        reports={savedReports}
        onOpenMasterData={() => setIsPresetsModalOpen(true)}
        onSave={(data) => {
          handleSaveNewDriverAssignment(data);
          setAddDriverInitialJam(undefined);
        }}
      />

      {driverToEdit && (
        <EditDriverModal
          isOpen={isEditDriverOpen}
          onClose={() => {
            setIsEditDriverOpen(false);
            setDriverToEdit(null);
          }}
          report={driverToEdit}
          reports={savedReports}
          masterPresets={masterPresets}
          onSave={handleSaveEditDriver}
          onDelete={(id) => {
            handleDeleteReport(id);
            setIsEditDriverOpen(false);
            setDriverToEdit(null);
          }}
        />
      )}

      <ReportHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedReports={savedReports}
        currentReportId={currentReport.id}
        onSelectReport={(rep) => setActiveReportId(rep.id)}
        onDeleteReport={handleDeleteReport}
        onNewReport={handleCreateNewReport}
        onOpenAddPassenger={() => setIsAddPassengerOpen(true)}
      />

      <AdminScheduleCalendarModal
        isOpen={isScheduleCalendarOpen}
        onClose={() => setIsScheduleCalendarOpen(false)}
        reports={savedReports}
        activeReportId={activeReportId}
        onSelectReport={(reportId) => {
          setActiveReportId(reportId);
        }}
        onOpenAddDriverModal={(date) => {
          setAddDriverInitialDate(date);
          setIsScheduleCalendarOpen(false);
          setIsAddDriverOpen(true);
        }}
        onOpenAddPassengerModal={(date) => {
          setIsScheduleCalendarOpen(false);
          setIsAddPassengerOpen(true);
        }}
        onDeleteReport={handleDeleteReport}
      />

      {isPrintOpen && (
        <PrintView
          report={currentReport}
          reports={savedReports}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
}

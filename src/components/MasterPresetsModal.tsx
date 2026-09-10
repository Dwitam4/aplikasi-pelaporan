import React, { useState } from 'react';
import { 
  X, 
  Car, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  User,
  Phone,
  Edit2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { MasterPresets, MasterDriver } from '../types';
import { defaultMasterPresets, defaultJadwalList } from '../utils/spreadsheet';

interface MasterPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: MasterPresets;
  onSavePresets: (updated: MasterPresets) => void;
  initialTab?: 'drivers' | 'jadwal' | string;
}

export const MasterPresetsModal: React.FC<MasterPresetsModalProps> = ({
  isOpen,
  onClose,
  presets,
  onSavePresets,
  initialTab = 'drivers',
}) => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'jadwal'>(
    initialTab === 'jadwal' ? 'jadwal' : 'drivers'
  );
  
  const [currentPresets, setCurrentPresets] = useState<MasterPresets>(() => ({
    ...presets,
    jadwalList: presets.jadwalList && presets.jadwalList.length > 0 ? presets.jadwalList : defaultJadwalList,
    drivers: presets.drivers && presets.drivers.length > 0 ? presets.drivers : defaultMasterPresets.drivers,
  }));
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states for adding / editing Driver + Paired Vehicle
  const [newDriverNama, setNewDriverNama] = useState('');
  const [newDriverHp, setNewDriverHp] = useState('');
  const [newDriverMobil, setNewDriverMobil] = useState('Luxio');
  const [newDriverPlat, setNewDriverPlat] = useState('');
  const [newDriverKapasitas, setNewDriverKapasitas] = useState<number>(7);
  const [newDriverCatatan, setNewDriverCatatan] = useState('');
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  // Jadwal Operasional states
  const [newJadwalInput, setNewJadwalInput] = useState('');
  const [editingJadwalIndex, setEditingJadwalIndex] = useState<number | null>(null);
  const [editJadwalValue, setEditJadwalValue] = useState('');

  if (!isOpen) return null;

  const triggerSuccess = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const persistPresets = (updated: MasterPresets) => {
    setCurrentPresets(updated);
    onSavePresets(updated);
    triggerSuccess();
  };

  // --- DRIVER & PAIRED VEHICLE HANDLERS ---
  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverNama.trim()) return;

    const driversList = currentPresets.drivers || [];
    let updatedDrivers: MasterDriver[];

    if (editingDriverId) {
      updatedDrivers = driversList.map((d) =>
        d.id === editingDriverId
          ? {
              ...d,
              nama: newDriverNama.trim(),
              hp: newDriverHp.trim(),
              mobil: newDriverMobil.trim() || 'Luxio',
              platNomor: newDriverPlat.trim().toUpperCase() || 'N 1823 WX',
              kapasitas: Number(newDriverKapasitas) || 7,
              catatan: newDriverCatatan.trim(),
            }
          : d
      );
      setEditingDriverId(null);
    } else {
      const newDriver: MasterDriver = {
        id: `drv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nama: newDriverNama.trim(),
        hp: newDriverHp.trim(),
        mobil: newDriverMobil.trim() || 'Luxio',
        platNomor: newDriverPlat.trim().toUpperCase() || 'N 1823 WX',
        kapasitas: Number(newDriverKapasitas) || 7,
        catatan: newDriverCatatan.trim(),
        status: 'aktif',
      };
      updatedDrivers = [...driversList, newDriver];
    }

    persistPresets({ ...currentPresets, drivers: updatedDrivers });
    setNewDriverNama('');
    setNewDriverHp('');
    setNewDriverMobil('Luxio');
    setNewDriverPlat('');
    setNewDriverKapasitas(7);
    setNewDriverCatatan('');
  };

  const handleEditDriver = (driver: MasterDriver) => {
    setEditingDriverId(driver.id);
    setNewDriverNama(driver.nama);
    setNewDriverHp(driver.hp || '');
    setNewDriverMobil(driver.mobil || 'Luxio');
    setNewDriverPlat(driver.platNomor || '');
    setNewDriverKapasitas(driver.kapasitas || 7);
    setNewDriverCatatan(driver.catatan || '');
  };

  const handleCancelEdit = () => {
    setEditingDriverId(null);
    setNewDriverNama('');
    setNewDriverHp('');
    setNewDriverMobil('Luxio');
    setNewDriverPlat('');
    setNewDriverKapasitas(7);
    setNewDriverCatatan('');
  };

  const handleToggleDriverStatus = (driverId: string) => {
    const driversList = currentPresets.drivers || [];
    const updated = driversList.map((d) =>
      d.id === driverId ? { ...d, status: d.status === 'aktif' ? ('nonaktif' as const) : ('aktif' as const) } : d
    );
    persistPresets({ ...currentPresets, drivers: updated });
  };

  const handleDeleteDriver = (driverId: string) => {
    const driversList = currentPresets.drivers || [];
    const updated = driversList.filter((d) => d.id !== driverId);
    persistPresets({ ...currentPresets, drivers: updated });
    if (editingDriverId === driverId) {
      handleCancelEdit();
    }
  };

  // --- JADWAL OPERASIONAL HANDLERS ---
  const handleAddJadwal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJadwalInput.trim()) return;

    let timeStr = newJadwalInput.trim();
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':');
      timeStr = `${h.padStart(2, '0')}:${m}`;
    }

    const list = currentPresets.jadwalList || defaultJadwalList;
    if (list.includes(timeStr)) return;

    const updated = [...list, timeStr].sort();
    persistPresets({ ...currentPresets, jadwalList: updated });
    setNewJadwalInput('');
  };

  const handleRemoveJadwal = (jam: string) => {
    const list = currentPresets.jadwalList || defaultJadwalList;
    const updated = list.filter((j) => j !== jam);
    persistPresets({ ...currentPresets, jadwalList: updated });
  };

  const handleStartEditJadwal = (idx: number, currentVal: string) => {
    setEditingJadwalIndex(idx);
    setEditJadwalValue(currentVal);
  };

  const handleSaveEditJadwal = (idx: number) => {
    if (!editJadwalValue.trim()) return;
    let timeStr = editJadwalValue.trim();
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [h, m] = timeStr.split(':');
      timeStr = `${h.padStart(2, '0')}:${m}`;
    }

    const list = [...(currentPresets.jadwalList || defaultJadwalList)];
    list[idx] = timeStr;
    list.sort();
    persistPresets({ ...currentPresets, jadwalList: list });
    setEditingJadwalIndex(null);
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan data Master Driver dan Jadwal Operasional ke pengaturan awal?')) {
      persistPresets({
        ...currentPresets,
        drivers: defaultMasterPresets.drivers,
        jadwalList: defaultJadwalList,
      });
    }
  };

  const driversList = currentPresets.drivers || defaultMasterPresets.drivers;
  const jadwalList = currentPresets.jadwalList || defaultJadwalList;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Pengaturan Data Master</h3>
              <p className="text-xs text-slate-300">
                Kelola Driver & Mobil Paten serta Jadwal Jam Operasional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2 Tab Navigation (Driver & Mobil Paten + Jadwal Operasional) */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2.5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'drivers'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4 text-indigo-600" />
            <span>Driver & Mobil (Paten)</span>
            <span className="text-[11px] px-2 py-0.5 bg-indigo-100 text-indigo-800 font-mono rounded-full font-bold">
              {driversList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jadwal')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'jadwal'
                ? 'bg-white text-purple-700 border-purple-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 text-purple-600" />
            <span>Jadwal Operasional</span>
            <span className="text-[11px] px-2 py-0.5 bg-purple-100 text-purple-800 font-mono rounded-full font-bold">
              {jadwalList.length} Jam
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* TAB 1: DRIVER & MOBIL PATEN */}
          {activeTab === 'drivers' && (
            <div className="space-y-5">
              {/* Add / Edit Driver Form */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    {editingDriverId ? 'Edit Driver & Mobil' : 'Tambah Driver & Mobil Paten'}
                  </span>
                  {editingDriverId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveDriver} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        Nama Driver <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Pak Wahyu"
                        value={newDriverNama}
                        onChange={(e) => setNewDriverNama(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        No. HP / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="08xxxxxxxxxx"
                        value={newDriverHp}
                        onChange={(e) => setNewDriverHp(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Paired Car Information (Paten) */}
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-indigo-900 mb-1 block flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Mobil yang Digunakan:</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Luxio / Grandmax"
                        value={newDriverMobil}
                        onChange={(e) => setNewDriverMobil(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-indigo-900 mb-1 block">
                        Plat Nomor Polisi:
                      </label>
                      <input
                        type="text"
                        placeholder="N 1823 WX"
                        value={newDriverPlat}
                        onChange={(e) => setNewDriverPlat(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-indigo-900 mb-1 block">
                        Kapasitas Kursi (Default):
                      </label>
                      <select
                        value={newDriverKapasitas}
                        onChange={(e) => setNewDriverKapasitas(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                      >
                        <option value={7}>7 Kursi (Luxio / Avanza)</option>
                        <option value={8}>8 Kursi (Grandmax / APV)</option>
                        <option value={14}>14 Kursi (HiAce Commuter)</option>
                        <option value={10}>10 Kursi</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      Catatan Tambahan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Standby Shift Pagi / Rute Stasiun"
                      value={newDriverCatatan}
                      onChange={(e) => setNewDriverCatatan(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      {editingDriverId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingDriverId ? 'Simpan Perubahan' : 'Tambah Driver & Mobil'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Driver List Cards */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 block mb-1">
                  Daftar Driver & Mobil Paten ({driversList.length}):
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {driversList.map((driver) => (
                    <div
                      key={driver.id}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {driver.nama}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              driver.status === 'aktif'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {driver.status}
                          </span>
                        </div>

                        {/* Driver Car Details Badge */}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 font-semibold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            <Car className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{driver.mobil || 'Luxio'}</span>
                            {driver.platNomor && (
                              <span className="font-mono font-bold text-slate-700">[{driver.platNomor}]</span>
                            )}
                            <span className="text-[10px] text-indigo-700">({driver.kapasitas || 7} Kursi)</span>
                          </span>

                          {driver.hp && (
                            <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {driver.hp}
                            </span>
                          )}
                        </div>

                        {driver.catatan && (
                          <p className="text-[11px] text-slate-500 italic">
                            {driver.catatan}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDriverStatus(driver.id)}
                          className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                            driver.status === 'aktif'
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                          }`}
                          title="Ubah Status Aktif / Nonaktif"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditDriver(driver)}
                          className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                          title="Edit Driver & Mobil"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                          title="Hapus Driver"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JADWAL OPERASIONAL */}
          {activeTab === 'jadwal' && (
            <div className="space-y-5">
              {/* Add Time Form */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Tambah Jam Operasional Baru
                </span>

                <form onSubmit={handleAddJadwal} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: 09:00"
                    value={newJadwalInput}
                    onChange={(e) => setNewJadwalInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Jam</span>
                  </button>
                </form>
              </div>

              {/* Jadwal List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 block mb-1">
                  Daftar Jam Operasional Aktif ({jadwalList.length} Slot):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {jadwalList.map((jamStr, idx) => {
                    const isEditing = editingJadwalIndex === idx;

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editJadwalValue}
                              onChange={(e) => setEditJadwalValue(e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-50 border border-purple-300 rounded-lg text-xs font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditJadwal(idx)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingJadwalIndex(null)}
                              className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 text-xs font-bold font-mono flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-mono font-bold text-sm text-slate-900">
                                {jamStr} WIB
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditJadwal(idx, jamStr)}
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveJadwal(jamStr)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Standar Awal</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs"
          >
            Selesai & Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

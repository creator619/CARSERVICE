import React, { useState, useMemo } from 'react';
import {
  Disc,
  Plus,
  Search,
  Snowflake,
  Sun,
  CloudSun,
  MapPin,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowRightLeft,
  X,
  Car,
  User,
} from 'lucide-react';
import { AppData, TireSet } from '../types';

const formatDate = (d: string) => (d ? d.replace(/-/g, '.') : '—');

interface TireHotelViewProps {
  data: AppData;
  onSaveTireSet: (payload: Partial<TireSet>) => Promise<void>;
  onToggleTireSetStatus: (id: string) => Promise<void>;
  onDeleteTireSet: (id: string) => Promise<void>;
}

export const TireHotelView: React.FC<TireHotelViewProps> = ({
  data,
  onSaveTireSet,
  onToggleTireSetStatus,
  onDeleteTireSet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<'ALL' | 'winter' | 'summer' | 'allseason'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'stored' | 'mounted'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [ticketTireSet, setTicketTireSet] = useState<TireSet | null>(null);

  const tireSets = data.tireSets || [];

  const filteredSets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tireSets.filter((ts) => {
      if (seasonFilter !== 'ALL' && ts.season !== seasonFilter) return false;
      if (statusFilter !== 'ALL' && ts.status !== statusFilter) return false;
      if (!q) return true;
      const veh = data.vehicles.find((v) => v.id === ts.vehicleId);
      const cust = data.customers.find((c) => c.id === ts.customerId);
      return (
        ts.storageCode.toLowerCase().includes(q) ||
        ts.brand.toLowerCase().includes(q) ||
        ts.model.toLowerCase().includes(q) ||
        ts.size.toLowerCase().includes(q) ||
        ts.location.toLowerCase().includes(q) ||
        (veh?.licensePlate.toLowerCase().includes(q) ?? false) ||
        (cust?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tireSets, searchQuery, seasonFilter, statusFilter, data.vehicles, data.customers]);

  const stats = useMemo(() => {
    const storedCount = tireSets.filter((t) => t.status === 'stored').length;
    const mountedCount = tireSets.filter((t) => t.status === 'mounted').length;
    const wornCount = tireSets.filter(
      (t) => Math.min(t.treadFL, t.treadFR, t.treadRL, t.treadRR) < 4.0
    ).length;
    return { total: tireSets.length, storedCount, mountedCount, wornCount };
  }, [tireSets]);

  const getSeasonBadge = (season: TireSet['season']) => {
    if (season === 'winter') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Snowflake className="w-3.5 h-3.5" />
          Téli szett
        </span>
      );
    }
    if (season === 'summer') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Sun className="w-3.5 h-3.5" />
          Nyári szett
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CloudSun className="w-3.5 h-3.5" />
        4 évszakos
      </span>
    );
  };

  const getTreadColor = (mm: number) => {
    if (mm < 3.0) return 'text-red-700 bg-red-50 border-red-200';
    if (mm < 4.2) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-[#161F30] rounded-xl p-5 text-white shadow-sm border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
              Szezonális Kerékraktár
            </span>
            <span className="text-xs text-slate-400 font-mono">GUMIABRONCS-HOTEL MODUL</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Ügyfél Kerékgarnitúrák & Profilmélység Nyilvántartás
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Téli/nyári szettek pontos raktári polckódja, 4-kerekes profilmélység mérése, DOT-szám és nyomtatható tárolási jegy.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer self-start lg:self-auto"
        >
          <Plus className="w-4 h-4" />
          Új garnitúra betárolása
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 border-t-[3px] border-t-blue-600 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Összes nyilvántartott szett
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Disc className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats.total} garnitúra</p>
          <p className="text-xs text-slate-500 mt-1">{stats.total * 4} db kerék összesen</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 border-t-[3px] border-t-emerald-600 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Raktárban betárolva
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2 font-mono">{stats.storedCount} szett</p>
          <p className="text-xs text-slate-500 mt-1">Polchelyen azonosítva</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 border-t-[3px] border-t-indigo-600 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jelenleg autón (Felszerelve)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats.mountedCount} szett</p>
          <p className="text-xs text-slate-500 mt-1">Kiadva szezonális futásra</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 border-t-[3px] border-t-amber-500 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Kopott (&lt; 4.0 mm) abroncsok
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2 font-mono">{stats.wornCount} szett</p>
          <p className="text-xs text-slate-500 mt-1">Új gumiabroncs ajánlat javasolt</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés tárolási kódra (pl. GH-2025), rendszámra, ügyfélre, méretre vagy polcra..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            {(['ALL', 'winter', 'summer', 'allseason'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeasonFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  seasonFilter === s
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'ALL'
                  ? 'Minden szezon'
                  : s === 'winter'
                  ? 'Téli'
                  : s === 'summer'
                  ? 'Nyári'
                  : '4 évszakos'}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            {(['ALL', 'stored', 'mounted'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Mind' : st === 'stored' ? 'Raktárban' : 'Autón'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tire Sets Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSets.map((ts) => {
          const vehicle = data.vehicles.find((v) => v.id === ts.vehicleId);
          const customer = data.customers.find((c) => c.id === ts.customerId);
          const minTread = Math.min(ts.treadFL, ts.treadFR, ts.treadRL, ts.treadRR);
          const isWorn = minTread < 4.0;

          return (
            <div
              key={ts.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Header bar */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-900 text-white">
                      {ts.storageCode}
                    </span>
                    {getSeasonBadge(ts.season)}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        ts.status === 'stored'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {ts.status === 'stored' ? 'Raktárban tárolva' : 'Autóra felszerelve'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    {ts.location}
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                  {/* Vehicle & Customer */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {vehicle?.licensePlate || 'Ismeretlen'}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Jármű'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{customer?.name || 'Ügyfél'}</span>
                    </div>
                  </div>

                  {/* Tire Spec */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/70 p-3 rounded-lg border border-slate-200/70">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                        Gyártó / Típus
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {ts.brand} {ts.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                        Méret & Index
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900">{ts.size}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                        DOT / Gyártás
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        DOT {ts.dot} (4 db)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                        Kivitel
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {ts.rimType === 'alloy'
                          ? 'Alufelnire szerelt'
                          : ts.rimType === 'steel'
                          ? 'Acélfelnire szerelt'
                          : 'Csak gumiabroncs'}
                      </span>
                    </div>
                  </div>

                  {/* 4-corner Tread Depths */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Profilmélység mérések (4 kerék)
                      </span>
                      {isWorn && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Cserehatár közelében (&lt;4.0 mm)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Bal első (BE)', val: ts.treadFL },
                        { label: 'Jobb első (JE)', val: ts.treadFR },
                        { label: 'Bal hátsó (BH)', val: ts.treadRL },
                        { label: 'Jobb hátsó (JH)', val: ts.treadRR },
                      ].map((corner) => (
                        <div
                          key={corner.label}
                          className={`px-2.5 py-2 rounded-lg border text-center ${getTreadColor(
                            corner.val
                          )}`}
                        >
                          <span className="block text-[10px] font-semibold opacity-75">
                            {corner.label}
                          </span>
                          <span className="text-sm font-mono font-bold">
                            {corner.val.toFixed(1)} mm
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {ts.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-200/70">
                      <span className="font-semibold text-slate-700">Megjegyzés: </span>
                      {ts.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Betárolva: <strong className="text-slate-700">{formatDate(ts.storedAt)}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTicketTireSet(ts)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    Tárolási jegy
                  </button>

                  <button
                    onClick={() => onToggleTireSetStatus(ts.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    {ts.status === 'stored' ? 'Kiadás / Felszerelés' : 'Visszatárolás raktárba'}
                  </button>

                  <button
                    onClick={() => onDeleteTireSet(ts.id)}
                    title="Törlés"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddTireSetModal
          data={data}
          onClose={() => setIsAddModalOpen(false)}
          onSave={async (payload) => {
            await onSaveTireSet(payload);
            setIsAddModalOpen(false);
          }}
        />
      )}

      {/* Printable Storage Ticket Modal */}
      {ticketTireSet && (
        <TireTicketModal
          tireSet={ticketTireSet}
          data={data}
          onClose={() => setTicketTireSet(null)}
        />
      )}
    </div>
  );
};

const AddTireSetModal: React.FC<{
  data: AppData;
  onClose: () => void;
  onSave: (payload: Partial<TireSet>) => Promise<void>;
}> = ({ data, onClose, onSave }) => {
  const firstVehicle = data.vehicles[0];
  const [vehicleId, setVehicleId] = useState(firstVehicle?.id || '');
  const [season, setSeason] = useState<TireSet['season']>('winter');
  const [brand, setBrand] = useState('Continental');
  const [model, setModel] = useState('WinterContact TS 870');
  const [size, setSize] = useState('205/55 R16 91H');
  const [dot, setDot] = useState('3423');
  const [rimType, setRimType] = useState<TireSet['rimType']>('alloy');
  const [treadFL, setTreadFL] = useState(6.8);
  const [treadFR, setTreadFR] = useState(6.8);
  const [treadRL, setTreadRL] = useState(7.2);
  const [treadRR, setTreadRR] = useState(7.2);
  const [location, setLocation] = useState('B-sor / 4. polc / 2');
  const [notes, setNotes] = useState('');

  const selectedVehicle = data.vehicles.find((v) => v.id === vehicleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      vehicleId,
      customerId: selectedVehicle?.customerId || data.customers[0]?.id || '',
      season,
      brand,
      model,
      size,
      dot,
      rimType,
      treadFL,
      treadFR,
      treadRL,
      treadRR,
      location,
      status: 'stored',
      storedAt: new Date().toISOString().slice(0, 10),
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">Új Kerékgarnitúra Betárolása</h3>
            <p className="text-xs text-slate-400">Gumiabroncs-hotel raktári felvételi adatlap</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jármű & Ügyfél kiválasztása
              </label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {data.vehicles.map((v) => {
                  const c = data.customers.find((cu) => cu.id === v.customerId);
                  return (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} — {v.make} {v.model} ({c?.name})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Évszak</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value as TireSet['season'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="winter">Téli garnitúra</option>
                <option value="summer">Nyári garnitúra</option>
                <option value="allseason">4 évszakos garnitúra</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Felni / Szereltség
              </label>
              <select
                value={rimType}
                onChange={(e) => setRimType(e.target.value as TireSet['rimType'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="alloy">Alufelnire szerelt kerék</option>
                <option value="steel">Acélfelnire szerelt kerék</option>
                <option value="tire_only">Csak gumiabroncs (felni nélkül)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Abroncs gyártó
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mintázat / Modell
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Méret és súly/sebességindex
              </label>
              <input
                type="text"
                required
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">DOT szám</label>
              <input
                type="text"
                required
                value={dot}
                onChange={(e) => setDot(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Profilmélység mérések (mm)
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Bal első (BE)</span>
                <input
                  type="number"
                  step="0.1"
                  value={treadFL}
                  onChange={(e) => setTreadFL(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Jobb első (JE)</span>
                <input
                  type="number"
                  step="0.1"
                  value={treadFR}
                  onChange={(e) => setTreadFR(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Bal hátsó (BH)</span>
                <input
                  type="number"
                  step="0.1"
                  value={treadRL}
                  onChange={(e) => setTreadRL(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">Jobb hátsó (JH)</span>
                <input
                  type="number"
                  step="0.1"
                  value={treadRR}
                  onChange={(e) => setTreadRR(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Raktári polckód / Pozíció
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Állapot megjegyzés
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pl. TPMS szenzorokkal, felni karcmentes..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
            >
              Garnitúra rögzítése
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TireTicketModal: React.FC<{
  tireSet: TireSet;
  data: AppData;
  onClose: () => void;
}> = ({ tireSet, data, onClose }) => {
  const vehicle = data.vehicles.find((v) => v.id === tireSet.vehicleId);
  const customer = data.customers.find((c) => c.id === tireSet.customerId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <span className="text-sm font-bold">Gumiabroncs-Hotel Tárolási Igazolás</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Nyomtatás
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 text-slate-900">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-tight">
                AutoTech Pro Szerviz Kft.
              </h2>
              <p className="text-xs text-slate-500">Szezonális Gumiabroncs-Hotel Tárolási Jegy</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-bold px-2.5 py-1 rounded bg-slate-900 text-white">
                {tireSet.storageCode}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Polc: {tireSet.location}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Tulajdonos / Ügyfél
              </span>
              <p className="font-bold text-slate-900 mt-0.5">{customer?.name}</p>
              <p className="text-slate-600">{customer?.phone}</p>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Jármű</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {vehicle?.licensePlate} — {vehicle?.make} {vehicle?.model}
              </p>
              <p className="text-slate-600 font-mono text-[11px]">{vehicle?.vin}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Abroncs típusa:</span>
              <span className="font-bold">
                {tireSet.brand} {tireSet.model} ({tireSet.size})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Évszak / DOT / Darabszám:</span>
              <span className="font-mono font-semibold">
                {tireSet.season === 'winter'
                  ? 'Téli'
                  : tireSet.season === 'summer'
                  ? 'Nyári'
                  : '4 évszakos'}{' '}
                | DOT {tireSet.dot} | 4 db
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Profilmélység (BE / JE / BH / JH):</span>
              <span className="font-mono font-bold">
                {tireSet.treadFL} / {tireSet.treadFR} / {tireSet.treadRL} / {tireSet.treadRR} mm
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs text-slate-500">
            <div className="border-t border-slate-400 pt-1.5">Raktáros / Szerviz átvevő</div>
            <div className="border-t border-slate-400 pt-1.5">Ügyfél aláírása</div>
          </div>
        </div>
      </div>
    </div>
  );
};

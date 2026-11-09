import React, { useState, useEffect, useMemo } from 'react';
import {
  BookCheck,
  ShieldCheck,
  Printer,
  Plus,
  Gauge,
  Wrench,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Car,
  FileText,
  Trash2,
  X,
  TrendingUp,
} from 'lucide-react';
import {
  AppData,
  Vehicle,
  ServiceBookEntry,
  WorkOrder,
  WORK_ORDER_STATUS_META,
  calculateWorkOrderTotals,
  formatHuf,
} from '../types';

interface DigitalServiceBookViewProps {
  data: AppData;
  initialVehicleId?: string;
  onCreateEntry: (payload: Partial<ServiceBookEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onSelectWorkOrder: (wo: WorkOrder) => void;
}

const SERVICE_CHECK_ITEMS: { key: keyof ServiceBookEntry; label: string }[] = [
  { key: 'oilChanged', label: 'Motorolaj + olajszűrő' },
  { key: 'airFilterChanged', label: 'Levegőszűrő' },
  { key: 'pollenFilterChanged', label: 'Utastéri pollenszűrő' },
  { key: 'fuelFilterChanged', label: 'Üzemanyagszűrő' },
  { key: 'sparkPlugsChanged', label: 'Gyújtógyertya / Izzítás' },
  { key: 'brakeFluidChanged', label: 'Fékfolyadék (DOT4)' },
  { key: 'transmissionOilChanged', label: 'Sebességváltó-olaj' },
  { key: 'timingBeltChanged', label: 'Vezérlés készlet + vízpumpa' },
  { key: 'brakesServiced', label: 'Féktárcsa / Fékbetét csere' },
  { key: 'bodyInspectionOk', label: 'Állapot- és korrózió-ellenőrzés' },
];

export const DigitalServiceBookView: React.FC<DigitalServiceBookViewProps> = ({
  data,
  initialVehicleId,
  onCreateEntry,
  onDeleteEntry,
  onSelectWorkOrder,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicleId || data.vehicles[0]?.id || ''
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrintCertificateOpen, setIsPrintCertificateOpen] = useState(false);

  useEffect(() => {
    if (initialVehicleId) {
      setSelectedVehicleId(initialVehicleId);
    }
  }, [initialVehicleId]);

  const vehicle =
    data.vehicles.find((v) => v.id === selectedVehicleId) || data.vehicles[0];
  const customer = vehicle
    ? data.customers.find((c) => c.id === vehicle.customerId)
    : undefined;

  const entries = useMemo(() => {
    if (!vehicle) return [];
    return (data.serviceBookEntries || [])
      .filter((e) => e.vehicleId === vehicle.id)
      .sort((a, b) => b.mileageKm - a.mileageKm);
  }, [data.serviceBookEntries, vehicle]);

  const vehicleWorkOrders = useMemo(() => {
    if (!vehicle) return [];
    return data.workOrders
      .filter((w) => w.vehicleId === vehicle.id)
      .sort((a, b) => b.mileageIn - a.mileageIn);
  }, [data.workOrders, vehicle]);

  // Chronological mileage points for Odometer Verification Chart
  const mileagePoints = useMemo(() => {
    if (!vehicle) return [];
    const map = new Map<string, { date: string; km: number; label: string }>();
    for (const e of entries) {
      map.set(`${e.date}-${e.mileageKm}`, {
        date: e.date.slice(0, 10),
        km: e.mileageKm,
        label: e.certificateCode,
      });
    }
    for (const wo of vehicleWorkOrders) {
      const d = wo.createdAt.slice(0, 10);
      map.set(`${d}-${wo.mileageIn}`, {
        date: d,
        km: wo.mileageIn,
        label: wo.orderNumber,
      });
    }
    const list = Array.from(map.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    return list;
  }, [entries, vehicleWorkOrders, vehicle]);

  // Verify odometer monotonicity
  const isOdometerConsistent = useMemo(() => {
    for (let i = 1; i < mileagePoints.length; i++) {
      if (mileagePoints[i].km < mileagePoints[i - 1].km) return false;
    }
    return true;
  }, [mileagePoints]);

  // Maintenance Intervals Calculation
  const maintenanceStatus = useMemo(() => {
    if (!vehicle) return null;
    const currentKm = vehicle.mileageKm;

    // 1. Oil Change (interval: 15,000 km)
    const lastOilEntry = entries.find((e) => e.oilChanged);
    const lastOilKm = lastOilEntry ? lastOilEntry.mileageKm : Math.max(0, currentKm - 14200);
    const oilDrivenKm = Math.max(0, currentKm - lastOilKm);
    const oilRemainingKm = 15000 - oilDrivenKm;
    const oilPct = Math.min(100, Math.round((oilDrivenKm / 15000) * 100));

    // 2. Timing Belt / Chain (interval: 180,000 km)
    const lastTimingEntry = entries.find((e) => e.timingBeltChanged);
    const lastTimingKm = lastTimingEntry ? lastTimingEntry.mileageKm : 0;
    const timingDrivenKm = Math.max(0, currentKm - lastTimingKm);
    const timingInterval = vehicle.make === 'Ford' ? 160000 : 180000;
    const timingRemainingKm = timingInterval - timingDrivenKm;
    const timingPct = Math.min(100, Math.round((timingDrivenKm / timingInterval) * 100));

    // 3. Transmission / Brake Fluid (interval: 60,000 km)
    const lastTransEntry = entries.find(
      (e) => e.transmissionOilChanged || e.brakeFluidChanged
    );
    const lastTransKm = lastTransEntry ? lastTransEntry.mileageKm : Math.max(0, currentKm - 45000);
    const transDrivenKm = Math.max(0, currentKm - lastTransKm);
    const transRemainingKm = 60000 - transDrivenKm;
    const transPct = Math.min(100, Math.round((transDrivenKm / 60000) * 100));

    // 4. MOT Expiry
    const refDate = new Date('2026-11-09T08:00:00');
    const expDate = new Date(vehicle.motExpiry);
    const motDaysLeft = Math.ceil(
      (expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      oil: { lastKm: lastOilKm, lastDate: lastOilEntry?.date || '—', remainingKm: oilRemainingKm, pct: oilPct },
      timing: {
        lastKm: lastTimingKm,
        lastDate: lastTimingEntry?.date || 'Gyári eredeti',
        remainingKm: timingRemainingKm,
        interval: timingInterval,
        pct: timingPct,
      },
      fluid: {
        lastKm: lastTransKm,
        lastDate: lastTransEntry?.date || '—',
        remainingKm: transRemainingKm,
        pct: transPct,
      },
      motDaysLeft,
    };
  }, [vehicle, entries]);

  if (!vehicle) {
    return (
      <div className="bg-white rounded-xl p-12 text-center border border-slate-200 text-sm text-slate-500">
        Nincs kiválasztott gépjármű a rendszerben.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Dark Header Banner */}
      <div className="bg-[#161F30] rounded-xl p-5 text-white shadow-sm border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
              OEM Hitelesített Nyilvántartás
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ELEKTRONIKUS SZERVIZKÖNYV & KARBANTARTÁSI NAPLÓ
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Digitális Szervizkönyv & Jármű Életút-idővonal
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Hitelesített futásteljesítmény-történet, gyári szervizperiódus kalkulátor és nyomtatható szervizkönyv-igazolás.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={vehicle.id}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
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

          <button
            onClick={() => setIsPrintCertificateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            Szervizkönyv kivonat nyomtatása
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Új bejegyzés hitelesítése
          </button>
        </div>
      </div>

      {/* Vehicle Passport Card + Odometer Consistency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 border-t-[3px] border-t-blue-600 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-slate-300 rounded overflow-hidden text-sm font-mono font-bold shadow-2xs">
                  <span className="bg-blue-700 text-white px-2 py-1 text-xs">H</span>
                  <span className="bg-slate-50 text-slate-900 px-3 py-1">
                    {vehicle.licensePlate}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tulajdonos: <strong className="text-slate-800">{customer?.name}</strong> ({customer?.phone})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                {isOdometerConsistent
                  ? 'Hitelesített futásteljesítmény'
                  : 'Km-óra eltérés vizsgálandó'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  Alvázszám (VIN)
                </span>
                <span className="font-mono font-bold text-slate-900 text-[11px]">{vehicle.vin}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  Évjárat / Motor
                </span>
                <span className="font-bold text-slate-900">
                  {vehicle.year} • {vehicle.engineCode} ({vehicle.fuelType})
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  Teljesítmény
                </span>
                <span className="font-bold text-slate-900">
                  {vehicle.powerKw} kW ({Math.round(vehicle.powerKw * 1.36)} LE)
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
                <span className="text-[10px] font-semibold uppercase text-blue-700 block">
                  Aktuális km-óra állás
                </span>
                <span className="font-mono font-bold text-blue-950 text-sm">
                  {vehicle.mileageKm.toLocaleString('hu-HU')} km
                </span>
              </div>
            </div>
          </div>

          {vehicle.notes && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                <strong>Jármű műszaki feljegyzés:</strong> {vehicle.notes}
              </span>
            </div>
          )}
        </div>

        {/* Mileage Progression Mini-Chart */}
        <div className="bg-white rounded-xl border border-slate-200/90 border-t-[3px] border-t-emerald-600 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Km-óra futásgörbe
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-600">
                {mileagePoints.length} rögzített pont
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Minden szervizlátogatáskor rögzített km-állás kronologikus sorrendben:
            </p>
          </div>

          <div className="space-y-2">
            {mileagePoints.slice(-5).map((pt) => {
              const maxKm = Math.max(vehicle.mileageKm, 1);
              const barPct = Math.max(12, Math.min(100, Math.round((pt.km / maxKm) * 100)));
              return (
                <div key={`${pt.date}-${pt.km}`} className="text-xs">
                  <div className="flex items-center justify-between text-[11px] mb-0.5 tabular-nums">
                    <span className="font-medium text-slate-600">
                      {pt.date} <span className="text-slate-400">({pt.label})</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {pt.km.toLocaleString('hu-HU')} km
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4 Maintenance Interval Calculators */}
      {maintenanceStatus && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Oil interval */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Motorolaj & szűrők (15e km)
              </span>
              {maintenanceStatus.oil.remainingKm <= 1500 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p
              className={`text-lg font-bold font-mono mt-1.5 ${
                maintenanceStatus.oil.remainingKm <= 0
                  ? 'text-rose-700'
                  : maintenanceStatus.oil.remainingKm <= 2000
                  ? 'text-amber-700'
                  : 'text-slate-900'
              }`}
            >
              {maintenanceStatus.oil.remainingKm > 0
                ? `${maintenanceStatus.oil.remainingKm.toLocaleString('hu-HU')} km van hátra`
                : `Esedékes (${Math.abs(maintenanceStatus.oil.remainingKm).toLocaleString('hu-HU')} km-rel túllépve)`}
            </p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-2">
              <div
                className={`h-full rounded-full ${
                  maintenanceStatus.oil.remainingKm <= 0
                    ? 'bg-rose-600'
                    : maintenanceStatus.oil.remainingKm <= 2000
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${maintenanceStatus.oil.pct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 tabular-nums">
              Utolsó csere: <strong>{maintenanceStatus.oil.lastKm.toLocaleString('hu-HU')} km</strong> ({maintenanceStatus.oil.lastDate})
            </p>
          </div>

          {/* 2. Timing Belt / Chain */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Vezérlés szett ({maintenanceStatus.timing.interval / 1000}e km)
              </span>
              {maintenanceStatus.timing.remainingKm <= 15000 ? (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <p
              className={`text-lg font-bold font-mono mt-1.5 ${
                maintenanceStatus.timing.remainingKm <= 10000
                  ? 'text-rose-700'
                  : 'text-slate-900'
              }`}
            >
              {maintenanceStatus.timing.remainingKm > 0
                ? `${maintenanceStatus.timing.remainingKm.toLocaleString('hu-HU')} km van hátra`
                : 'Vezérléscsere azonnal esedékes!'}
            </p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-2">
              <div
                className={`h-full rounded-full ${
                  maintenanceStatus.timing.remainingKm <= 15000
                    ? 'bg-rose-600'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${maintenanceStatus.timing.pct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 tabular-nums">
              Utolsó vezérlés: <strong>{maintenanceStatus.timing.lastKm > 0 ? `${maintenanceStatus.timing.lastKm.toLocaleString('hu-HU')} km` : 'Gyári eredeti'}</strong>
            </p>
          </div>

          {/* 3. Transmission & Brake Fluid */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Váltóolaj & Fékfolyadék (60e km)
              </span>
              <Gauge className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-lg font-bold font-mono text-slate-900 mt-1.5">
              {maintenanceStatus.fluid.remainingKm > 0
                ? `${maintenanceStatus.fluid.remainingKm.toLocaleString('hu-HU')} km van hátra`
                : 'Csere javasolt'}
            </p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-2">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${maintenanceStatus.fluid.pct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 tabular-nums">
              Utolsó csere: <strong>{maintenanceStatus.fluid.lastKm.toLocaleString('hu-HU')} km</strong> ({maintenanceStatus.fluid.lastDate})
            </p>
          </div>

          {/* 4. MOT Expiry */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Műszaki vizsga érvényesség
              </span>
              <CalendarClock
                className={`w-4 h-4 ${
                  maintenanceStatus.motDaysLeft <= 30 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              />
            </div>
            <p
              className={`text-lg font-bold font-mono mt-1.5 ${
                maintenanceStatus.motDaysLeft <= 30 ? 'text-rose-700' : 'text-slate-900'
              }`}
            >
              {maintenanceStatus.motDaysLeft > 0
                ? `${maintenanceStatus.motDaysLeft} nap múlva jár le`
                : 'Lejárt!'}
            </p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-2">
              <div
                className={`h-full rounded-full ${
                  maintenanceStatus.motDaysLeft <= 30 ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(10, Math.round((maintenanceStatus.motDaysLeft / 730) * 100)))}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 tabular-nums">
              Forgalmi engedély lejárat: <strong>{vehicle.motExpiry}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Main Content: Official Stamped Entries Timeline + Active/Completed Work Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left 2 Columns: Stamped Digital Service Book Entries */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookCheck className="w-4 h-4 text-blue-700" />
              Hitelesített Digitális Szervizkönyv Bejegyzések ({entries.length} db)
            </h3>
            <span className="text-xs text-slate-500">
              Időrendben a legfrissebbtől
            </span>
          </div>

          <div className="relative pl-6 border-l-2 border-blue-600/30 space-y-4">
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                className="relative bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute -left-[31px] top-5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                    idx === 0 ? 'bg-blue-600' : 'bg-slate-400'
                  }`}
                />

                {/* Entry Header */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-900 text-white">
                      {entry.certificateCode}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {entry.serviceType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs tabular-nums">
                    <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                      {entry.mileageKm.toLocaleString('hu-HU')} km
                    </span>
                    <span className="text-slate-600 font-medium">{entry.date}</span>
                    <button
                      onClick={() => onDeleteEntry(entry.id)}
                      title="Bejegyzés törlése"
                      className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Entry Body */}
                <div className="p-5 space-y-3.5">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {entry.summary}
                  </p>

                  {/* Checked Service Operations */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                    {SERVICE_CHECK_ITEMS.map(({ key, label }) => {
                      const checked = Boolean(entry[key]);
                      return (
                        <div
                          key={key}
                          className={`px-2 py-1.5 rounded text-[11px] font-medium border flex items-center gap-1.5 ${
                            checked
                              ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200'
                              : 'bg-slate-50/60 text-slate-400 border-slate-200/60'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 ${
                              checked ? 'text-emerald-600' : 'text-slate-300'
                            }`}
                          />
                          <span className="truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer Stamp */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div>
                      Szervizpartner: <strong className="text-slate-800">{entry.workshopName}</strong> • Hitelesítő szerelő:{' '}
                      <strong className="text-slate-800">{entry.mechanicName}</strong>
                    </div>
                    <div className="tabular-nums">
                      Következő esedékes szerviz:{' '}
                      <strong className="text-blue-800">
                        {entry.nextServiceKm.toLocaleString('hu-HU')} km
                      </strong>{' '}
                      {entry.nextServiceDate ? `vagy ${entry.nextServiceDate}` : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {entries.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200 text-xs text-slate-500">
                Ehhez a gépjárműhöz még nincs rögzített szervizkönyvi pecsét. Kattints az „Új bejegyzés hitelesítése” gombra!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Linked Workshop Work Orders */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Kapcsolódó Műhely Munkalapok ({vehicleWorkOrders.length} db)
          </h3>

          <div className="space-y-3">
            {vehicleWorkOrders.map((wo) => {
              const totals = calculateWorkOrderTotals(wo);
              const statusMeta = WORK_ORDER_STATUS_META[wo.status];
              return (
                <div
                  key={wo.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {wo.orderNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 tabular-nums">
                    {wo.createdAt} • <strong>{wo.mileageIn.toLocaleString('hu-HU')} km</strong>
                  </div>

                  <p className="text-xs text-slate-800 line-clamp-2 bg-slate-50 p-2.5 rounded border border-slate-200/70">
                    {wo.customerComplaint}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                      {formatHuf(totals.totalGross)}
                    </span>
                    <button
                      onClick={() => onSelectWorkOrder(wo)}
                      className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium transition cursor-pointer"
                    >
                      Munkalap megnyitása
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Service Book Entry Modal */}
      {isAddModalOpen && (
        <AddServiceBookEntryModal
          vehicle={vehicle}
          data={data}
          onClose={() => setIsAddModalOpen(false)}
          onSave={async (payload) => {
            await onCreateEntry(payload);
            setIsAddModalOpen(false);
          }}
        />
      )}

      {/* Printable Official Digital Service Book Certificate */}
      {isPrintCertificateOpen && (
        <PrintableServiceBookModal
          vehicle={vehicle}
          customer={customer}
          entries={entries}
          onClose={() => setIsPrintCertificateOpen(false)}
        />
      )}
    </div>
  );
};

const AddServiceBookEntryModal: React.FC<{
  vehicle: Vehicle;
  data: AppData;
  onClose: () => void;
  onSave: (payload: Partial<ServiceBookEntry>) => Promise<void>;
}> = ({ vehicle, data, onClose, onSave }) => {
  const latestWo = data.workOrders.find((w) => w.vehicleId === vehicle.id);
  const [date, setDate] = useState('2026-11-09');
  const [mileageKm, setMileageKm] = useState(latestWo?.mileageIn || vehicle.mileageKm);
  const [workshopName, setWorkshopName] = useState('AutoTech Pro Szerviz Kft.');
  const [mechanicName, setMechanicName] = useState(
    data.mechanics[0]?.name || 'Farkas Péter'
  );
  const [serviceType, setServiceType] = useState(
    'Időszakos gyári inspekció + olajcsere szerviz'
  );
  const [summary, setSummary] = useState(
    latestWo
      ? `${latestWo.customerComplaint} ${latestWo.diagnosis || ''}`.trim()
      : 'Gyári előírás szerinti időszakos karbantartás és biztonsági átvizsgálás elvégezve.'
  );
  const [nextServiceKm, setNextServiceKm] = useState(
    (latestWo?.mileageIn || vehicle.mileageKm) + 15000
  );
  const [nextServiceDate, setNextServiceDate] = useState('2027-11-09');

  const [checks, setChecks] = useState<Record<string, boolean>>({
    oilChanged: true,
    airFilterChanged: true,
    pollenFilterChanged: true,
    fuelFilterChanged: false,
    sparkPlugsChanged: false,
    brakeFluidChanged: false,
    transmissionOilChanged: false,
    timingBeltChanged: false,
    brakesServiced: Boolean(latestWo && latestWo.customerComplaint.toLowerCase().includes('fék')),
    bodyInspectionOk: true,
  });

  const toggleCheck = (key: string) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      vehicleId: vehicle.id,
      date,
      mileageKm,
      workshopName,
      mechanicName,
      serviceType,
      ...checks,
      summary,
      nextServiceKm,
      nextServiceDate,
      workOrderId: latestWo?.id || '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden my-6">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">
              Új Digitális Szervizkönyv Bejegyzés Hitelesítése
            </h3>
            <p className="text-xs text-slate-400">
              {vehicle.licensePlate} — {vehicle.make} {vehicle.model} (VIN: {vehicle.vin})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Szerviz dátuma
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Km-óra állás (km)
              </label>
              <input
                type="number"
                required
                value={mileageKm}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setMileageKm(val);
                  setNextServiceKm(val + 15000);
                }}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hitelesítő szerelő
              </label>
              <select
                value={mechanicName}
                onChange={(e) => setMechanicName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {data.mechanics.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Szerviz megnevezése / periódus
              </label>
              <input
                type="text"
                required
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Szervizpartner / Márkaszerviz
              </label>
              <input
                type="text"
                required
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Elvégzett gyári karbantartási műveletek (pipáld be)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERVICE_CHECK_ITEMS.map(({ key, label }) => {
                const active = Boolean(checks[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleCheck(key)}
                    className={`px-3 py-2 rounded-lg border text-left font-medium flex items-center gap-2 transition cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-blue-600 text-blue-950'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-blue-600' : 'text-slate-300'
                      }`}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Részletes műszaki összefoglaló és beépített alkatrészek
            </label>
            <textarea
              rows={3}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Következő szerviz esedékes (km)
              </label>
              <input
                type="number"
                value={nextServiceKm}
                onChange={(e) => setNextServiceKm(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Következő szerviz dátuma
              </label>
              <input
                type="date"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              Digitális pecsét rögzítése
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PrintableServiceBookModal: React.FC<{
  vehicle: Vehicle;
  customer?: { name: string; phone: string; address: string };
  entries: ServiceBookEntry[];
  onClose: () => void;
}> = ({ vehicle, customer, entries, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-300 shadow-xl max-w-4xl w-full overflow-hidden my-6">
        <div className="no-print px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <span className="text-sm font-bold">
            Hitelesített Digitális Szervizkönyv Kivonat — Nyomtatási kép
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Nyomtatás / PDF mentés
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 text-slate-900 max-h-[82vh] overflow-y-auto print:max-h-none">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight">
                AUTOTECH PRO SZERVIZ KFT. — DIGITÁLIS SZERVIZKÖNYV KIVONAT
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                1116 Budapest, Kondorosi út 18. • Elektronikus karbantartási és futásteljesítmény-igazolás
              </p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 rounded bg-slate-900 text-white font-mono text-xs font-bold">
                HITELESÍTETT KIVONAT
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Kiállítva: 2026.11.09.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Rendszám / Gyártmány:</span>
              <strong className="font-mono text-sm">
                {vehicle.licensePlate} — {vehicle.make} {vehicle.model}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Alvázszám (VIN):</span>
              <strong className="font-mono">{vehicle.vin}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Évjárat / Motorkód:</span>
              <strong>
                {vehicle.year} • {vehicle.engineCode} ({vehicle.fuelType})
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Jelenlegi km-óra állás:</span>
              <strong className="font-mono text-sm">
                {vehicle.mileageKm.toLocaleString('hu-HU')} km
              </strong>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Hitelesített szervizlátogatások ({entries.length} bejegyzés)
            </h4>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900 text-[11px] uppercase text-slate-600">
                  <th className="py-2 pr-2">Igazolásszám</th>
                  <th className="py-2 px-2">Dátum</th>
                  <th className="py-2 px-2 text-right">Km-állás</th>
                  <th className="py-2 px-2">Elvégzett szerviz & műveletek</th>
                  <th className="py-2 pl-2">Szervizpartner / Szerelő</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="py-3 pr-2 font-mono font-bold">{e.certificateCode}</td>
                    <td className="py-3 px-2 tabular-nums whitespace-nowrap">{e.date}</td>
                    <td className="py-3 px-2 text-right font-mono font-bold whitespace-nowrap">
                      {e.mileageKm.toLocaleString('hu-HU')} km
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-900">{e.serviceType}</div>
                      <div className="text-slate-600 mt-0.5">{e.summary}</div>
                    </td>
                    <td className="py-3 pl-2 whitespace-nowrap">
                      <div className="font-semibold">{e.workshopName}</div>
                      <div className="text-slate-500">{e.mechanicName}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-12 pt-10 text-center text-xs text-slate-600">
            <div className="border-t border-slate-400 pt-2 mx-6">
              AutoTech Pro Szerviz Kft. — Digitális Bélyegző & Hitelesítés
            </div>
            <div className="border-t border-slate-400 pt-2 mx-6">
              Tulajdonos / Ügyfél ({customer?.name || ''})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

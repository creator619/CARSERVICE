import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Printer,
  Wrench,
  FileCheck2,
  Car,
  UserCheck,
} from 'lucide-react';
import {
  AppData,
  WorkOrder,
  WorkOrderStatus,
  WORK_ORDER_STATUS_META,
  calculateWorkOrderTotals,
  formatHuf,
  InspectionState,
} from '../types';
import { CarWalkaroundWidget } from './CarWalkaroundWidget';

interface CustomerPortalViewProps {
  data: AppData;
  initialWorkOrderId?: string;
  onApproveQuote: (workOrderId: string, approvedBy: string) => Promise<void>;
  onPrintWorkOrder: (wo: WorkOrder, docType: 'work_order' | 'quote' | 'invoice') => void;
}

const PORTAL_STEPS: { status: WorkOrderStatus; title: string; subtitle: string }[] = [
  { status: 'received', title: '1. Beérkezett', subtitle: 'Állapotfelmérés' },
  { status: 'quoting', title: '2. Árajánlat', subtitle: 'Jóváhagyásra vár' },
  { status: 'waiting_parts', title: '3. Alkatrész', subtitle: 'Logisztika / Raktár' },
  { status: 'in_progress', title: '4. Javítás alatt', subtitle: 'Műhelymunka' },
  { status: 'testing', title: '5. Ellenőrzés', subtitle: 'Minőségkontroll' },
  { status: 'ready', title: '6. Elkészült', subtitle: 'Átvehető' },
];

const STATUS_STEP_INDEX: Record<WorkOrderStatus, number> = {
  received: 0,
  quoting: 1,
  waiting_parts: 2,
  in_progress: 3,
  testing: 4,
  ready: 5,
  completed: 5,
};

const INSPECTION_BADGE: Record<InspectionState, { label: string; cls: string }> = {
  ok: { label: 'Megfelelő', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  warn: { label: 'Figyelendő / Kopott', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  bad: { label: 'Azonnali csere javasolt', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
};

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  data,
  initialWorkOrderId,
  onApproveQuote,
  onPrintWorkOrder,
}) => {
  const [selectedWoId, setSelectedWoId] = useState<string>(
    initialWorkOrderId || data.workOrders[0]?.id || ''
  );
  const [approverName, setApproverName] = useState<string>('');

  useEffect(() => {
    if (initialWorkOrderId) {
      setSelectedWoId(initialWorkOrderId);
    }
  }, [initialWorkOrderId]);

  const currentWo =
    data.workOrders.find((w) => w.id === selectedWoId) || data.workOrders[0];
  const customer = currentWo
    ? data.customers.find((c) => c.id === currentWo.customerId)
    : undefined;
  const vehicle = currentWo
    ? data.vehicles.find((v) => v.id === currentWo.vehicleId)
    : undefined;
  const mechanic = currentWo
    ? data.mechanics.find((m) => m.id === currentWo.mechanicId)
    : undefined;

  useEffect(() => {
    if (customer?.name) {
      setApproverName(`${customer.name} (Online ügyfélportál)`);
    }
  }, [customer?.name, selectedWoId]);

  if (!currentWo) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Nincs megjeleníthető munkalap az ügyfélportálon.
      </div>
    );
  }

  const totals = calculateWorkOrderTotals(currentWo);
  const activeStepIdx = STATUS_STEP_INDEX[currentWo.status] ?? 0;
  const isApproved = Boolean(currentWo.inspection?.quoteApproved);

  return (
    <div className="space-y-6">
      {/* Top Selector Bar */}
      <div className="bg-white border border-slate-200/90 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Ügyfél Állapotkövető és Online Árajánlat-Jóváhagyó Portál
          </div>
          <h1 className="text-base font-bold text-slate-900">
            Élő szervizkövetés és digitális állapotfelmérő jegyzőkönyv
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="text-xs font-medium text-slate-600">
            Munkalap / Rendszám kiválasztása:
          </label>
          <select
            value={currentWo.id}
            onChange={(e) => setSelectedWoId(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
          >
            {data.workOrders.map((w) => {
              const v = data.vehicles.find((veh) => veh.id === w.vehicleId);
              const c = data.customers.find((cust) => cust.id === w.customerId);
              return (
                <option key={w.id} value={w.id}>
                  {v?.licensePlate} — {w.orderNumber} ({c?.name}) {!w.inspection?.quoteApproved ? '• [Jóváhagyásra vár]' : ''}
                </option>
              );
            })}
          </select>

          <button
            onClick={() => onPrintWorkOrder(currentWo, 'quote')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Árajánlat nyomtatása
          </button>
        </div>
      </div>

      {/* Vehicle & Status Stepper Banner */}
      <div className="bg-[#161F30] text-white border border-slate-800 rounded-lg p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/80">
          <div className="flex items-center gap-3.5">
            <div className="inline-flex items-center border border-slate-500 rounded overflow-hidden text-sm font-mono font-bold">
              <span className="bg-blue-700 text-white px-1.5 py-1 text-[10px]">H</span>
              <span className="bg-white text-slate-900 px-2.5 py-1">
                {vehicle?.licensePlate}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {vehicle?.make} {vehicle?.model} ({vehicle?.year})
              </h2>
              <p className="text-xs text-slate-300">
                Munkalapszám: <span className="font-mono font-semibold text-blue-300">{currentWo.orderNumber}</span> • Ügyfél: {customer?.name} • Km-állás: {currentWo.mileageIn.toLocaleString('hu-HU')} km
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-md">
              <span className="text-slate-400 block text-[10px] uppercase">Felelős szerelő</span>
              <span className="font-semibold text-white">{mechanic?.name || '—'}</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-md">
              <span className="text-slate-400 block text-[10px] uppercase">Várható elkészülés</span>
              <span className="font-semibold text-emerald-300 tabular-nums">
                {currentWo.estimatedCompletion}
              </span>
            </div>
          </div>
        </div>

        {/* 6-Step Progress Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {PORTAL_STEPS.map((st, idx) => {
            const done = idx < activeStepIdx || currentWo.status === 'completed';
            const current = idx === activeStepIdx && currentWo.status !== 'completed';
            return (
              <div
                key={st.status}
                className={`p-3 rounded-md border transition ${
                  current
                    ? 'bg-blue-600/25 border-blue-400 text-white'
                    : done
                    ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{st.title}</span>
                  {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {current && <Clock className="w-3.5 h-3.5 text-blue-300" />}
                </div>
                <p className="text-[11px] opacity-80">{st.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quote Approval Callout Box */}
      <div
        className={`rounded-lg p-5 border shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          isApproved
            ? 'bg-emerald-50/70 border-emerald-300'
            : 'bg-amber-50/80 border-amber-300 border-l-4 border-l-amber-500'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCheck2
              className={`w-5 h-5 ${
                isApproved ? 'text-emerald-700' : 'text-amber-700'
              }`}
            />
            <h3 className="text-sm font-bold text-slate-900">
              {isApproved
                ? 'Árajánlat és javítási megrendelés ügyfél által jóváhagyva'
                : 'A feltárt hibák javításához és az alkatrészek beépítéséhez jóváhagyás szükséges'}
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            {isApproved
              ? `Jóváhagyta: ${currentWo.inspection?.quoteApprovedBy || customer?.name} • Időpont: ${currentWo.inspection?.quoteApprovedAt}`
              : `Kérjük, tekintse át az alábbi állapotfelmérési jegyzőkönyvet és a ${formatHuf(totals.totalGross)} összegű tételes árajánlatot.`}
          </p>
        </div>

        {!isApproved ? (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="text"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Jóváhagyó neve..."
              className="px-3 py-2 rounded-md bg-white border border-amber-300 text-xs text-slate-900 font-medium w-56"
            />
            <button
              onClick={() => onApproveQuote(currentWo.id, approverName)}
              className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Árajánlat jóváhagyása és javítás indítása
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 text-white text-xs font-semibold shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            Jóváhagyva ({formatHuf(totals.totalGross)})
          </span>
        )}
      </div>

      {/* Diagnosis & 6-Point Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-lg p-5 space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-700" />
            Bejelentett hiba és szerviz szakvélemény
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1">
                Ügyfél által jelzett hibajelenség / megrendelés
              </span>
              <p className="text-slate-900 font-medium">{currentWo.customerComplaint}</p>
            </div>
            <div className="p-3 rounded-md bg-blue-50/50 border border-blue-200/80">
              <span className="text-[11px] font-semibold uppercase text-blue-800 block mb-1">
                Műszeres diagnosztika és megállapítás
              </span>
              <p className="text-slate-900 font-medium">
                {currentWo.diagnosis || 'Állapotfelmérés folyamatban.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-5 space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-700" />
            6-pontos biztonsági átvizsgálás eredménye
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {[
              { label: 'Fékrendszer', val: currentWo.inspection?.brakes },
              { label: 'Futómű és kormányzás', val: currentWo.inspection?.suspension },
              { label: 'Motor és folyadékszintek', val: currentWo.inspection?.engineOil },
              { label: 'Gumiabroncsok', val: currentWo.inspection?.tires },
              { label: 'Akkumulátor és töltés', val: currentWo.inspection?.battery },
              { label: 'Világítás és elektronika', val: currentWo.inspection?.lights },
            ].map((row) => {
              const b = INSPECTION_BADGE[row.val || 'ok'];
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between p-2.5 rounded border border-slate-200 bg-slate-50/60"
                >
                  <span className="font-medium text-slate-700">{row.label}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${b.cls}`}>
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Read-Only 2D Walkaround & Wheel Measurements */}
      <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-700" />
              2D Karosszéria Állapotlap és Kerékmérési Jegyzőkönyv
            </h3>
            <p className="text-xs text-slate-500">
              Átvételkor rögzített külső sérülések, gumiabroncs profilmélységek (mm) és fékbetét állapot (%)
            </p>
          </div>
        </div>

        <CarWalkaroundWidget
          damageMarkers={currentWo.inspection?.damageMarkers || []}
          wheelMeasurements={
            currentWo.inspection?.wheelMeasurements || {
              fl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
              fr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
              rl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
              rr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
            }
          }
          readOnly={true}
        />
      </div>

      {/* Itemized Quote Table */}
      <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Tételes Költségvetés és Árajánlat
          </h3>
          <span className="text-xs text-slate-500 tabular-nums">
            {(currentWo.items || []).length} tétel
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Típus</th>
                <th className="py-3 px-3">Cikkszám</th>
                <th className="py-3 px-3">Tétel megnevezése</th>
                <th className="py-3 px-3 text-right">Mennyiség</th>
                <th className="py-3 px-3 text-right">Nettó egységár</th>
                <th className="py-3 px-3 text-right">Nettó összesen</th>
                <th className="py-3 px-4 text-right">Bruttó (27% ÁFA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {(currentWo.items || []).map((item) => {
                const lineNet = item.quantity * item.unitPriceNet;
                const lineGross = Math.round(lineNet * 1.27);
                return (
                  <tr key={item.id}>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          item.type === 'part'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {item.type === 'part' ? 'Alkatrész' : 'Munkadíj'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{item.sku}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{item.name}</td>
                    <td className="py-3 px-3 text-right">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatHuf(item.unitPriceNet)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800">
                      {formatHuf(lineNet)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatHuf(lineGross)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 tabular-nums">
          <div className="text-xs text-slate-500">
            Választott fizetési mód: <strong className="text-slate-800">{currentWo.paymentMethod}</strong>
            {currentWo.discountPercent > 0 && (
              <span className="ml-3 text-emerald-700 font-semibold">
                • Ügyfélkedvezmény: -{currentWo.discountPercent}% (-{formatHuf(totals.discountAmountNet)} nettó)
              </span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Nettó végösszeg</span>
              <span className="text-sm font-semibold text-slate-800">{formatHuf(totals.totalNet)}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">27% ÁFA</span>
              <span className="text-sm font-semibold text-slate-800">{formatHuf(totals.vatAmount)}</span>
            </div>
            <div className="bg-blue-700 text-white px-4 py-2 rounded-md text-right">
              <span className="text-[10px] text-blue-200 block uppercase tracking-wider">
                Fizetendő bruttó végösszeg
              </span>
              <span className="text-base font-bold">{formatHuf(totals.totalGross)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Printer,
  Plus,
  Calendar,
  Wrench,
  TrendingUp,
  Package,
  Car,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  AppData,
  WorkOrder,
  WORK_ORDER_STATUS_META,
  PRIORITY_META,
  WORKSHOP_BAYS,
  calculateWorkOrderTotals,
  formatHuf,
} from '../types';

interface DashboardViewProps {
  data: AppData;
  onNavigate: (tab: string) => void;
  onSelectWorkOrder: (wo: WorkOrder) => void;
  onPrintWorkOrder: (wo: WorkOrder, docType?: 'work_order' | 'quote' | 'invoice') => void;
  onRestockItem: (itemId: string, delta: number) => void;
  onOpenNewWorkOrder: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigate,
  onSelectWorkOrder,
  onPrintWorkOrder,
  onRestockItem,
  onOpenNewWorkOrder,
}) => {
  const activeWorkOrders = data.workOrders.filter((w) => w.status !== 'completed');
  const readyWorkOrders = data.workOrders.filter((w) => w.status === 'ready');

  let totalGrossRevenue = 0;
  let totalPartsNet = 0;
  let totalLaborNet = 0;
  for (const wo of data.workOrders) {
    const t = calculateWorkOrderTotals(wo);
    totalGrossRevenue += t.totalGross;
    totalPartsNet += t.partsNet;
    totalLaborNet += t.laborNet;
  }

  const lowStockItems = data.inventory.filter((item) => item.stock <= item.minStock);

  const refDate = new Date('2026-11-09T08:00:00');
  const expiringVehicles = data.vehicles.filter((v) => {
    const exp = new Date(v.motExpiry);
    const diffDays = Math.ceil((exp.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 45;
  });

  const scheduledAppointments = data.appointments.filter((a) => a.status === 'scheduled');

  const getCustomer = (id: string) => data.customers.find((c) => c.id === id);
  const getVehicle = (id: string) => data.vehicles.find((v) => v.id === id);
  const getMechanic = (id: string) => data.mechanics.find((m) => m.id === id);

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Műhelyoperáció és napi áttekintés
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aktuális munkalapok, szerelőállások kihasználtsága és készletfigyelés
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('appointments')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-300 shadow-2xs transition cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Előjegyzések ({scheduledAppointments.length})
          </button>
          <button
            onClick={onOpenNewWorkOrder}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
            Új munkalap felvétele
          </button>
        </div>
      </div>

      {/* Distinct Color-Coded KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Blue */}
        <div
          onClick={() => onNavigate('work-orders')}
          className="bg-white border border-slate-200/90 border-t-3 border-t-blue-600 hover:border-slate-300 rounded-lg p-4 shadow-2xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Nyitott munkalapok</span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {activeWorkOrders.length} db
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
              {readyWorkOrders.length} átadható
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Összesen {data.workOrders.length} rögzített munkalap
          </div>
        </div>

        {/* KPI 2: Emerald */}
        <div
          onClick={() => onNavigate('billing')}
          className="bg-white border border-slate-200/90 border-t-3 border-t-emerald-600 hover:border-slate-300 rounded-lg p-4 shadow-2xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Időszaki bruttó forgalom</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {formatHuf(totalGrossRevenue)}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between text-[11px] text-slate-500 tabular-nums">
            <span>Alkatrész: {formatHuf(totalPartsNet)}</span>
            <span>Munkadíj: {formatHuf(totalLaborNet)}</span>
          </div>
        </div>

        {/* KPI 3: Amber */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white border border-slate-200/90 border-t-3 border-t-amber-500 hover:border-slate-300 rounded-lg p-4 shadow-2xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Raktári készletfigyelés</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {lowStockItems.length} tétel
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
              minimum alatt
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            {data.inventory.length} aktív cikkszám a törzsben
          </div>
        </div>

        {/* KPI 4: Indigo */}
        <div
          onClick={() => onNavigate('vehicles')}
          className="bg-white border border-slate-200/90 border-t-3 border-t-indigo-600 hover:border-slate-300 rounded-lg p-4 shadow-2xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Nyilvántartott járműpark</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {data.vehicles.length} autó
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-medium">
              {expiringVehicles.length} lejáró műszaki
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            {data.customers.length} szerződött és egyéni ügyfél
          </div>
        </div>
      </div>

      {/* Contrasting Dark-Slate Workshop Floor Panel */}
      <div className="bg-[#161F30] text-white border border-slate-800 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Műhelyállások és emelők aktuális foglaltsága
            </h2>
            <p className="text-xs text-slate-400">
              Kattints bármelyik munkaállomásra a hozzátartozó munkalap megnyitásához
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300 tabular-nums">
            Foglalt állások: {WORKSHOP_BAYS.filter((bay) => activeWorkOrders.some((w) => w.bay === bay)).length} / {WORKSHOP_BAYS.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {WORKSHOP_BAYS.map((bayName) => {
            const activeWo =
              activeWorkOrders.find(
                (w) => w.bay === bayName && w.status !== 'ready' && w.status !== 'completed'
              ) || activeWorkOrders.find((w) => w.bay === bayName);

            const veh = activeWo ? getVehicle(activeWo.vehicleId) : undefined;
            const mech = activeWo ? getMechanic(activeWo.mechanicId) : undefined;

            return (
              <div
                key={bayName}
                onClick={() => activeWo && onSelectWorkOrder(activeWo)}
                className={`rounded-md p-3.5 border transition flex flex-col justify-between ${
                  activeWo
                    ? 'bg-[#1E293B] border-slate-700 border-t-3 border-t-blue-500 hover:border-slate-500 cursor-pointer'
                    : 'bg-[#131B2A] border-slate-800/90 border-t-3 border-t-emerald-600/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-700/70">
                    <span className="text-xs font-medium text-slate-200 truncate">{bayName}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                        activeWo
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {activeWo ? 'Foglalt' : 'Szabad'}
                    </span>
                  </div>

                  {activeWo && veh ? (
                    <>
                      <div className="inline-flex items-center border border-slate-500 rounded overflow-hidden text-[11px] font-mono font-semibold mb-1.5">
                        <span className="bg-blue-700 text-white px-1 py-0.2 text-[9px]">H</span>
                        <span className="bg-white text-slate-900 px-1.5 py-0.2">
                          {veh.licensePlate}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white leading-snug">
                        {veh.make} {veh.model}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {activeWo.customerComplaint}
                      </p>
                    </>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-xs font-medium text-emerald-400/90">Szabad munkaállomás</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Azonnal fogadható</p>
                    </div>
                  )}
                </div>

                {activeWo && (
                  <div className="mt-3 pt-2 border-t border-slate-700/70 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-300 truncate">{mech?.name}</span>
                    <span className="font-mono text-blue-300 font-medium">
                      {activeWo.orderNumber}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid: Active Work Orders Table + Distinct Notice Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Work Orders Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs">
          <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Folyamatban lévő munkalapok</h3>
              <p className="text-xs text-slate-500">
                Aktív javítások és átadásra váró járművek
              </p>
            </div>
            <button
              onClick={() => onNavigate('work-orders')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
            >
              Összes megtekintése →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Munkalap</th>
                  <th className="py-2.5 px-3">Jármű és ügyfél</th>
                  <th className="py-2.5 px-3">Szerelő</th>
                  <th className="py-2.5 px-3">Státusz</th>
                  <th className="py-2.5 px-3 text-right">Bruttó összeg</th>
                  <th className="py-2.5 px-4 text-right">Művelet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {activeWorkOrders.map((wo) => {
                  const veh = getVehicle(wo.vehicleId);
                  const cust = getCustomer(wo.customerId);
                  const mech = getMechanic(wo.mechanicId);
                  const statusMeta = WORK_ORDER_STATUS_META[wo.status];
                  const prioMeta = PRIORITY_META[wo.priority];
                  const totals = calculateWorkOrderTotals(wo);

                  return (
                    <tr key={wo.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectWorkOrder(wo)}
                          className="font-mono font-semibold text-blue-700 hover:underline text-left cursor-pointer"
                        >
                          {wo.orderNumber}
                        </button>
                        <div className="mt-0.5">
                          <span className={`px-1.5 py-0.2 text-[10px] rounded border ${prioMeta.badgeClass}`}>
                            {prioMeta.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center border border-slate-300 rounded overflow-hidden text-[11px] font-mono font-semibold">
                            <span className="bg-blue-700 text-white px-1 text-[9px]">H</span>
                            <span className="bg-slate-50 text-slate-900 px-1.5">
                              {veh?.licensePlate}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900">
                            {veh?.make} {veh?.model}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">{cust?.name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{mech?.name}</div>
                        <div className="text-slate-500 text-[11px]">{wo.bay}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium border ${statusMeta.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">
                        {formatHuf(totals.totalGross)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onSelectWorkOrder(wo)}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium transition cursor-pointer"
                          >
                            Adatlap
                          </button>
                          <button
                            onClick={() => onPrintWorkOrder(wo, 'work_order')}
                            className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition cursor-pointer"
                            title="Munkalap nyomtatása"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Color-Accented Notice Cards */}
        <div className="space-y-6">
          {/* Low Stock Notice Card */}
          <div className="bg-white border border-slate-200/90 border-l-4 border-l-amber-500 rounded-lg p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Utánrendelendő alkatrészek ({lowStockItems.length})
              </h3>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Raktár →
              </button>
            </div>
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Minden raktári tétel eléri a minimum készletszintet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {item.sku} • Készlet:{' '}
                        <span className="text-rose-700 font-semibold">
                          {item.stock} {item.unit}
                        </span>{' '}
                        (min. {item.minStock})
                      </p>
                    </div>
                    <button
                      onClick={() => onRestockItem(item.id, 5)}
                      className="shrink-0 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-medium transition cursor-pointer"
                    >
                      +5 {item.unit}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expiring MOT Notice Card */}
          <div className="bg-white border border-slate-200/90 border-l-4 border-l-indigo-600 rounded-lg p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Esedékes műszaki vizsgák ({expiringVehicles.length})
              </h3>
              <button
                onClick={() => onNavigate('vehicles')}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                Járművek →
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {expiringVehicles.map((veh) => {
                const cust = getCustomer(veh.customerId);
                return (
                  <div
                    key={veh.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 font-mono font-semibold text-[11px] text-slate-900">
                          {veh.licensePlate}
                        </span>
                        <span className="text-xs font-medium text-slate-900">
                          {veh.make} {veh.model}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {cust?.name} • {cust?.phone}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-medium tabular-nums">
                      {veh.motExpiry}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

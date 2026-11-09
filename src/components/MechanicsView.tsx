import React, { useState } from 'react';
import {
  Plus,
  Phone,
  X,
} from 'lucide-react';
import {
  AppData,
  Mechanic,
  WorkOrder,
  WORKSHOP_BAYS,
  WORK_ORDER_STATUS_META,
  formatHuf,
  calculateWorkOrderTotals,
} from '../types';

interface MechanicsViewProps {
  data: AppData;
  onCreateMechanic: (payload: Partial<Mechanic>) => Promise<void>;
  onSelectWorkOrder: (wo: WorkOrder) => void;
}

export const MechanicsView: React.FC<MechanicsViewProps> = ({
  data,
  onCreateMechanic,
  onSelectWorkOrder,
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    role: 'Autószerelő szaktechnikus',
    specialty: 'Általános szerviz, fék, futómű',
    hourlyRate: 16500,
    bay: WORKSHOP_BAYS[4],
    phone: '+36 30 511 0099',
    status: 'available' as 'available' | 'busy' | 'off',
  });

  const getVehicle = (id: string) => data.vehicles.find((v) => v.id === id);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
            Műhelykapacitás és szerelők
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Munkatársak terheltsége, elszámolt normaórák, rezsióradíjak és munkaállomások
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Új munkatárs felvétele
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.mechanics.map((mech) => {
          const mechOrders = data.workOrders.filter((w) => w.mechanicId === mech.id);
          const activeOrders = mechOrders.filter((w) => w.status !== 'completed');

          let totalLaborHours = 0;
          let totalLaborNetRevenue = 0;
          for (const wo of mechOrders) {
            for (const item of wo.items || []) {
              if (item.type === 'labor') {
                totalLaborHours += Number(item.quantity) || 0;
                totalLaborNetRevenue +=
                  (Number(item.quantity) || 0) * (Number(item.unitPriceNet) || 0);
              }
            }
          }

          return (
            <div
              key={mech.id}
              className="bg-white border border-zinc-200/90 rounded-lg p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-zinc-900 text-white flex items-center justify-center font-semibold text-xs">
                      {mech.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">{mech.name}</h3>
                      <p className="text-xs text-zinc-600">{mech.role}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Szakterület: {mech.specialty}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      activeOrders.length > 0
                        ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {activeOrders.length > 0
                      ? `${activeOrders.length} aktív munkalap`
                      : 'Szabad kapacitás'}
                  </span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2.5 bg-zinc-50 p-3 rounded-md border border-zinc-200/80 text-xs mb-4 tabular-nums">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Rezsióradíj (nettó)</span>
                    <span className="font-semibold text-zinc-900">
                      {formatHuf(mech.hourlyRate)}/óra
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Elszámolt órák</span>
                    <span className="font-semibold text-zinc-900">
                      {totalLaborHours.toFixed(1)} óra
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Munkadíj-teljesítmény</span>
                    <span className="font-semibold text-zinc-900">
                      {formatHuf(totalLaborNetRevenue)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                  <span>
                    Beosztott állás: <strong className="text-zinc-800 font-medium">{mech.bay}</strong>
                  </span>
                  <span className="flex items-center gap-1 tabular-nums">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    {mech.phone}
                  </span>
                </div>

                {/* Assigned Work Orders */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-500 block">
                    Hozzárendelt munkalapok ({mechOrders.length})
                  </span>
                  {mechOrders.map((wo) => {
                    const veh = getVehicle(wo.vehicleId);
                    const statusMeta = WORK_ORDER_STATUS_META[wo.status];
                    const totals = calculateWorkOrderTotals(wo);
                    return (
                      <div
                        key={wo.id}
                        onClick={() => onSelectWorkOrder(wo)}
                        className="p-2.5 rounded-md bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-between gap-2 cursor-pointer transition text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-semibold text-zinc-900">
                            {wo.orderNumber}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-white border border-zinc-300 font-mono font-semibold text-zinc-900 text-[11px]">
                            {veh?.licensePlate}
                          </span>
                          <span className="text-zinc-600 truncate">
                            {veh?.make} {veh?.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] border ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                          <span className="font-semibold text-zinc-900">
                            {formatHuf(totals.totalGross)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-zinc-300 rounded-lg max-w-md w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">Új munkatárs felvétele</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded hover:bg-zinc-200/60 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-600 mb-1">Teljes név *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Pl. Németh Gergely"
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-zinc-600 mb-1">Beosztás</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-zinc-600 mb-1">Szakterület</label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Nettó rezsióradíj (Ft/óra)</label>
                  <input
                    type="number"
                    step={500}
                    value={form.hourlyRate}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, hourlyRate: Number(e.target.value) || 15000 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Műhelyállás</label>
                  <select
                    value={form.bay}
                    onChange={(e) => setForm((p) => ({ ...p, bay: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  >
                    {WORKSHOP_BAYS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  onClick={async () => {
                    if (!form.name.trim()) return;
                    await onCreateMechanic(form);
                    setShowNewModal(false);
                  }}
                  className="px-4 py-1.5 rounded bg-zinc-900 text-white font-medium cursor-pointer"
                >
                  Mentés
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

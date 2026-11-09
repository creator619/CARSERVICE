import React, { useState } from 'react';
import {
  Plus,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import {
  AppData,
  Appointment,
  WorkOrder,
  WORKSHOP_BAYS,
} from '../types';

interface AppointmentsViewProps {
  data: AppData;
  onCreateAppointment: (payload: Partial<Appointment>) => Promise<void>;
  onConvertAppointment: (id: string) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onSelectWorkOrder: (wo: WorkOrder) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  data,
  onCreateAppointment,
  onConvertAppointment,
  onDeleteAppointment,
  onSelectWorkOrder,
}) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('all');

  const firstVeh = data.vehicles[0];
  const [form, setForm] = useState({
    vehicleId: firstVeh?.id || '',
    customerId: firstVeh?.customerId || data.customers[0]?.id || '',
    mechanicId: data.mechanics[0]?.id || '',
    bay: WORKSHOP_BAYS[0],
    date: '2026-11-09',
    startTime: '11:00',
    endTime: '13:00',
    serviceType: 'Időszakos olajcsere és átvizsgálás',
    notes: '',
  });

  const getCustomer = (id: string) => data.customers.find((c) => c.id === id);
  const getVehicle = (id: string) => data.vehicles.find((v) => v.id === id);
  const getMechanic = (id: string) => data.mechanics.find((m) => m.id === id);

  const uniqueDates = Array.from(new Set(data.appointments.map((a) => a.date))).sort();

  const filteredAppointments = data.appointments.filter(
    (a) => dateFilter === 'all' || a.date === dateFilter
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
            Előjegyzési naptár és időpontfoglalás
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Szerelőállások időbeosztása és érkező járművek munkalapra vétele
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-md bg-zinc-200/70 p-0.5 border border-zinc-200 text-xs">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Összes nap ({data.appointments.length})
            </button>
            {uniqueDates.map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-3 py-1 rounded font-medium tabular-nums transition cursor-pointer ${
                  dateFilter === d
                    ? 'bg-white text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Új előjegyzés
          </button>
        </div>
      </div>

      {/* Appointments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAppointments.map((apt) => {
          const veh = getVehicle(apt.vehicleId);
          const cust = getCustomer(apt.customerId);
          const mech = getMechanic(apt.mechanicId);
          const linkedWo = apt.workOrderId
            ? data.workOrders.find((w) => w.id === apt.workOrderId)
            : undefined;

          return (
            <div
              key={apt.id}
              className="bg-white border border-zinc-200/90 hover:border-zinc-300 rounded-lg p-5 flex flex-col justify-between transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-800 tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {apt.date} • {apt.startTime} – {apt.endTime}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {apt.status === 'converted' ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                        Munkalapon
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-medium">
                        Előjegyezve
                      </span>
                    )}
                    <button
                      onClick={() => onDeleteAppointment(apt.id)}
                      className="p-1 rounded text-zinc-400 hover:text-red-700 transition cursor-pointer"
                      title="Időpont törlése"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-zinc-100 border border-zinc-300 text-zinc-900 font-mono font-semibold text-xs">
                    {veh?.licensePlate}
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {veh?.make} {veh?.model}
                  </h3>
                </div>

                <p className="text-xs text-zinc-500 mb-3 tabular-nums">
                  {cust?.name} • {cust?.phone}
                </p>

                <div className="bg-zinc-50 p-3 rounded-md border border-zinc-200/70 text-xs space-y-1 mb-3">
                  <div className="font-semibold text-zinc-900">{apt.serviceType}</div>
                  {apt.notes && <p className="text-zinc-500">{apt.notes}</p>}
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Szerelő: <strong className="text-zinc-800 font-medium">{mech?.name}</strong></span>
                  <span className="text-zinc-700">{apt.bay}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100">
                {apt.status === 'converted' && linkedWo ? (
                  <button
                    onClick={() => onSelectWorkOrder(linkedWo)}
                    className="w-full py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium transition cursor-pointer"
                  >
                    Munkalap megnyitása ({linkedWo.orderNumber})
                  </button>
                ) : (
                  <button
                    onClick={() => onConvertAppointment(apt.id)}
                    className="w-full py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition cursor-pointer"
                  >
                    Jármű átvétele és munkalap nyitása
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW APPOINTMENT MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-zinc-300 rounded-lg max-w-lg w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">Új előjegyzés rögzítése</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded hover:bg-zinc-200/60 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-600 mb-1">Gépjármű és ügyfél *</label>
                <select
                  value={form.vehicleId}
                  onChange={(e) => {
                    const v = data.vehicles.find((veh) => veh.id === e.target.value);
                    setForm((p) => ({
                      ...p,
                      vehicleId: e.target.value,
                      customerId: v?.customerId || p.customerId,
                    }));
                  }}
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                >
                  {data.vehicles.map((v) => {
                    const c = getCustomer(v.customerId);
                    return (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} – {v.make} {v.model} ({c?.name})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Szerelő *</label>
                  <select
                    value={form.mechanicId}
                    onChange={(e) => {
                      const m = data.mechanics.find((mech) => mech.id === e.target.value);
                      setForm((p) => ({
                        ...p,
                        mechanicId: e.target.value,
                        bay: m?.bay || p.bay,
                      }));
                    }}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  >
                    {data.mechanics.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Dátum *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Kezdés *</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Befejezés *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1">Tervezett szervizművelet *</label>
                <input
                  type="text"
                  value={form.serviceType}
                  onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value }))}
                  placeholder="Pl. Időszakos átvizsgálás és fékcsere"
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-600 mb-1">Megjegyzés</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Ügyfél megvárja..."
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                />
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
                    if (!form.serviceType.trim()) return;
                    await onCreateAppointment(form);
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

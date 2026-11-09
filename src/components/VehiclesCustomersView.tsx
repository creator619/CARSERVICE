import React, { useState } from 'react';
import {
  Search,
  Plus,
  History,
  BookCheck,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  X,
  Trash2,
} from 'lucide-react';
import {
  AppData,
  Customer,
  Vehicle,
  WorkOrder,
  WORK_ORDER_STATUS_META,
  calculateWorkOrderTotals,
  formatHuf,
} from '../types';

interface VehiclesCustomersViewProps {
  data: AppData;
  onCreateCustomer: (payload: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onCreateVehicle: (payload: Partial<Vehicle>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onSelectWorkOrder: (wo: WorkOrder) => void;
  onOpenServiceBook?: (vehicleId: string) => void;
}

export const VehiclesCustomersView: React.FC<VehiclesCustomersViewProps> = ({
  data,
  onCreateCustomer,
  onDeleteCustomer,
  onCreateVehicle,
  onDeleteVehicle,
  onSelectWorkOrder,
  onOpenServiceBook,
}) => {
  const [subTab, setSubTab] = useState<'vehicles' | 'customers'>('vehicles');
  const [search, setSearch] = useState('');
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);

  const [custForm, setCustForm] = useState({
    name: '',
    type: 'personal' as 'personal' | 'company',
    taxNumber: '',
    phone: '',
    email: '',
    address: '',
    discountPercent: 0,
    notes: '',
  });

  const [vehForm, setVehForm] = useState({
    customerId: data.customers[0]?.id || '',
    licensePlate: '',
    vin: '',
    make: '',
    model: '',
    year: 2021,
    engineCode: '',
    fuelType: 'Benzin',
    displacementCc: 1968,
    powerKw: 110,
    mileageKm: 85000,
    motExpiry: '2027-06-30',
    color: 'Ezüst metál',
    notes: '',
  });

  const getCustomer = (id: string) => data.customers.find((c) => c.id === id);

  const filteredVehicles = data.vehicles.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const c = getCustomer(v.customerId);
    return (
      v.licensePlate.toLowerCase().includes(q) ||
      v.vin.toLowerCase().includes(q) ||
      `${v.make} ${v.model}`.toLowerCase().includes(q) ||
      v.engineCode.toLowerCase().includes(q) ||
      (c && `${c.name} ${c.phone}`.toLowerCase().includes(q))
    );
  });

  const filteredCustomers = data.customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.taxNumber.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  const refDate = new Date('2026-11-09T08:00:00');
  const isMotExpiring = (motExpiry: string) => {
    const exp = new Date(motExpiry);
    const diffDays = Math.ceil((exp.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 45;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
            Járműnyilvántartás és ügyféltörzs
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Gépjárművek műszaki adatai, szervizelőzmények és partnerkapcsolatok
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rendszám, alvázszám, ügyfél..."
              className="pl-8 pr-3 py-1.5 rounded-md bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 w-56"
            />
          </div>

          <div className="inline-flex rounded-md bg-zinc-200/70 p-0.5 border border-zinc-200 text-xs">
            <button
              onClick={() => setSubTab('vehicles')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                subTab === 'vehicles'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Járművek ({data.vehicles.length})
            </button>
            <button
              onClick={() => setSubTab('customers')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                subTab === 'customers'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Ügyfelek ({data.customers.length})
            </button>
          </div>

          <button
            onClick={() => setShowNewCustomerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 text-xs font-medium transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Új ügyfél
          </button>

          <button
            onClick={() => {
              setVehForm((prev) => ({
                ...prev,
                customerId: data.customers[0]?.id || '',
              }));
              setShowNewVehicleModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Új jármű
          </button>
        </div>
      </div>

      {/* VEHICLES VIEW */}
      {subTab === 'vehicles' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVehicles.map((veh) => {
            const cust = getCustomer(veh.customerId);
            const vehOrders = data.workOrders.filter((w) => w.vehicleId === veh.id);
            const expiring = isMotExpiring(veh.motExpiry);

            return (
              <div
                key={veh.id}
                className="bg-white border border-zinc-200/90 hover:border-zinc-300 rounded-lg p-5 flex flex-col justify-between transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center border border-zinc-300 rounded overflow-hidden text-xs font-mono font-semibold shrink-0">
                        <span className="bg-blue-800 text-white px-1.5 py-1 text-[10px]">H</span>
                        <span className="bg-zinc-50 text-zinc-900 px-2 py-1">
                          {veh.licensePlate}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {veh.make} {veh.model}
                        </h3>
                        <p className="text-xs text-zinc-500 tabular-nums">
                          {veh.year} • {veh.fuelType} • {veh.powerKw} kW ({Math.round(veh.powerKw * 1.36)} LE)
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteVehicle(veh.id)}
                      className="p-1 rounded text-zinc-400 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                      title="Jármű törlése"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50/80 p-3 rounded-md border border-zinc-200/70 mb-3 tabular-nums">
                    <div className="col-span-2">
                      <span className="text-zinc-500">Alvázszám:</span>{' '}
                      <span className="font-mono text-zinc-800 font-medium">{veh.vin}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Motorkód:</span>{' '}
                      <span className="font-mono text-zinc-800">{veh.engineCode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Km-állás:</span>{' '}
                      <span className="font-semibold text-zinc-900">
                        {veh.mileageKm.toLocaleString('hu-HU')} km
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1.5 border-t border-zinc-200/70">
                      <span className="text-zinc-500">Műszaki érvényesség:</span>
                      <span
                        className={`font-medium ${
                          expiring ? 'text-amber-800' : 'text-zinc-800'
                        }`}
                      >
                        {veh.motExpiry}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-600 space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Tulajdonos:</span>
                      <span className="font-medium text-zinc-900">{cust?.name}</span>
                    </div>
                    <div className="flex items-center justify-between tabular-nums">
                      <span className="text-zinc-500">Elérhetőség:</span>
                      <span className="text-zinc-700">{cust?.phone}</span>
                    </div>
                  </div>

                  {veh.notes && (
                    <p className="text-[11px] text-zinc-500 bg-zinc-50 px-3 py-2 rounded border border-zinc-200/60 mb-3">
                      {veh.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500">
                    Előélet: <strong className="text-zinc-800 font-medium">{vehOrders.length} munkalap</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onOpenServiceBook && (
                      <button
                        onClick={() => onOpenServiceBook(veh.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium transition cursor-pointer"
                      >
                        <BookCheck className="w-3.5 h-3.5" />
                        Szervizkönyv
                      </button>
                    )}
                    <button
                      onClick={() => setHistoryVehicle(veh)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium transition cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      Munkalapok
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CUSTOMERS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => {
            const custVehicles = data.vehicles.filter((v) => v.customerId === cust.id);
            const custOrders = data.workOrders.filter((w) => w.customerId === cust.id);

            return (
              <div
                key={cust.id}
                className="bg-white border border-zinc-200/90 rounded-lg p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
                        {cust.type === 'company' ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">{cust.name}</h3>
                        <span className="text-[11px] text-zinc-500">
                          {cust.type === 'company'
                            ? `Céges partner • Adószám: ${cust.taxNumber || '—'}`
                            : 'Magánszemély'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {cust.discountPercent > 0 && (
                        <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-medium tabular-nums">
                          -{cust.discountPercent}%
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteCustomer(cust.id)}
                        className="p-1 rounded text-zinc-400 hover:text-red-700 transition cursor-pointer"
                        title="Ügyfél törlése"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-700 bg-zinc-50/80 p-3 rounded-md border border-zinc-200/70 mb-3">
                    <div className="flex items-center gap-2 tabular-nums">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{cust.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{cust.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{cust.address || '—'}</span>
                    </div>
                  </div>

                  {cust.notes && (
                    <p className="text-xs text-zinc-500 mb-3">{cust.notes}</p>
                  )}

                  <div>
                    <span className="text-[11px] font-medium text-zinc-500 block mb-1.5">
                      Járművek ({custVehicles.length} db)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {custVehicles.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setHistoryVehicle(v)}
                          className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs text-zinc-800 font-medium flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <span className="font-mono font-semibold text-zinc-900">
                            {v.licensePlate}
                          </span>
                          <span className="text-zinc-600">
                            {v.make} {v.model}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500 tabular-nums">
                  <span>Rögzítve: {cust.createdAt}</span>
                  <span>{custOrders.length} munkalap</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VEHICLE SERVICE HISTORY MODAL */}
      {historyVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-zinc-300 rounded-lg max-w-3xl w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-zinc-900 text-white font-mono font-semibold text-xs">
                  {historyVehicle.licensePlate}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Szerviztörténet — {historyVehicle.make} {historyVehicle.model} ({historyVehicle.year})
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">VIN: {historyVehicle.vin}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryVehicle(null)}
                className="p-1.5 rounded hover:bg-zinc-200/60 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
              {data.workOrders
                .filter((w) => w.vehicleId === historyVehicle.id)
                .map((wo) => {
                  const totals = calculateWorkOrderTotals(wo);
                  const statusMeta = WORK_ORDER_STATUS_META[wo.status];
                  return (
                    <div
                      key={wo.id}
                      className="p-4 rounded-md bg-zinc-50 border border-zinc-200 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="font-mono font-semibold text-zinc-900 text-xs">
                            {wo.orderNumber}
                          </span>
                          <span className="text-xs text-zinc-500">• {wo.createdAt}</span>
                          <span className="text-xs font-medium text-zinc-700">
                            • {wo.mileageIn.toLocaleString('hu-HU')} km
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] border ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                          <button
                            onClick={() => {
                              setHistoryVehicle(null);
                              onSelectWorkOrder(wo);
                            }}
                            className="px-2.5 py-1 rounded bg-zinc-900 text-white font-medium text-xs cursor-pointer"
                          >
                            Munkalap megnyitása
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-800">
                        <strong>Megrendelt munka:</strong> {wo.customerComplaint}
                      </p>
                      {wo.diagnosis && (
                        <p className="text-xs text-zinc-600">
                          <strong>Elvégzett javítás:</strong> {wo.diagnosis}
                        </p>
                      )}
                      <div className="pt-2 border-t border-zinc-200/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-500">
                          Tételek: {(wo.items || []).map((i) => i.name).join(', ')}
                        </span>
                        <span className="font-semibold text-zinc-900 shrink-0 ml-3 tabular-nums">
                          {formatHuf(totals.totalGross)}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {data.workOrders.filter((w) => w.vehicleId === historyVehicle.id).length === 0 && (
                <div className="py-12 text-center text-xs text-zinc-500">
                  Ehhez a járműhöz még nem tartozik korábbi munkalap.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-zinc-300 rounded-lg max-w-lg w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">Új ügyfél rögzítése</h3>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="p-1 rounded hover:bg-zinc-200/60 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Ügyfél típusa</label>
                  <select
                    value={custForm.type}
                    onChange={(e) =>
                      setCustForm((p) => ({
                        ...p,
                        type: e.target.value as 'personal' | 'company',
                      }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  >
                    <option value="personal">Magánszemély</option>
                    <option value="company">Cég / Flottapartner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Kedvezmény (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={custForm.discountPercent}
                    onChange={(e) =>
                      setCustForm((p) => ({ ...p, discountPercent: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1">Név / Cégnév *</label>
                <input
                  type="text"
                  value={custForm.name}
                  onChange={(e) => setCustForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Pl. Nagy Péter"
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                />
              </div>

              {custForm.type === 'company' && (
                <div>
                  <label className="block text-zinc-600 mb-1">Adószám</label>
                  <input
                    type="text"
                    value={custForm.taxNumber}
                    onChange={(e) => setCustForm((p) => ({ ...p, taxNumber: e.target.value }))}
                    placeholder="12345678-2-41"
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Telefonszám *</label>
                  <input
                    type="text"
                    value={custForm.phone}
                    onChange={(e) => setCustForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+36 30 123 4567"
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">E-mail cím</label>
                  <input
                    type="email"
                    value={custForm.email}
                    onChange={(e) => setCustForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="ugyfel@email.hu"
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1">Számlázási cím</label>
                <input
                  type="text"
                  value={custForm.address}
                  onChange={(e) => setCustForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="1117 Budapest, Példa utca 12."
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  onClick={async () => {
                    if (!custForm.name.trim() || !custForm.phone.trim()) return;
                    await onCreateCustomer(custForm);
                    setShowNewCustomerModal(false);
                    setCustForm({
                      name: '',
                      type: 'personal',
                      taxNumber: '',
                      phone: '',
                      email: '',
                      address: '',
                      discountPercent: 0,
                      notes: '',
                    });
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

      {/* NEW VEHICLE MODAL */}
      {showNewVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-zinc-300 rounded-lg max-w-xl w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">Új gépjármű felvétele</h3>
              <button
                onClick={() => setShowNewVehicleModal(false)}
                className="p-1 rounded hover:bg-zinc-200/60 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-600 mb-1">Tulajdonos *</label>
                <select
                  value={vehForm.customerId}
                  onChange={(e) => setVehForm((p) => ({ ...p, customerId: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                >
                  {data.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Rendszám *</label>
                  <input
                    type="text"
                    value={vehForm.licensePlate}
                    onChange={(e) =>
                      setVehForm((p) => ({ ...p, licensePlate: e.target.value.toUpperCase() }))
                    }
                    placeholder="AA-BC-123"
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Alvázszám (VIN) *</label>
                  <input
                    type="text"
                    value={vehForm.vin}
                    onChange={(e) =>
                      setVehForm((p) => ({ ...p, vin: e.target.value.toUpperCase() }))
                    }
                    placeholder="WVWZZZ..."
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Gyártmány *</label>
                  <input
                    type="text"
                    value={vehForm.make}
                    onChange={(e) => setVehForm((p) => ({ ...p, make: e.target.value }))}
                    placeholder="Volkswagen"
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Modell *</label>
                  <input
                    type="text"
                    value={vehForm.model}
                    onChange={(e) => setVehForm((p) => ({ ...p, model: e.target.value }))}
                    placeholder="Passat 2.0 TDI"
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Évjárat</label>
                  <input
                    type="number"
                    value={vehForm.year}
                    onChange={(e) =>
                      setVehForm((p) => ({ ...p, year: Number(e.target.value) || 2020 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Motorkód</label>
                  <input
                    type="text"
                    value={vehForm.engineCode}
                    onChange={(e) => setVehForm((p) => ({ ...p, engineCode: e.target.value }))}
                    placeholder="DFGA"
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Üzemanyag</label>
                  <select
                    value={vehForm.fuelType}
                    onChange={(e) => setVehForm((p) => ({ ...p, fuelType: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  >
                    <option value="Benzin">Benzin</option>
                    <option value="Dízel">Dízel</option>
                    <option value="Hibrid">Hibrid</option>
                    <option value="Elektromos">Elektromos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Teljesítmény (kW)</label>
                  <input
                    type="number"
                    value={vehForm.powerKw}
                    onChange={(e) =>
                      setVehForm((p) => ({ ...p, powerKw: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Km-óra állás</label>
                  <input
                    type="number"
                    value={vehForm.mileageKm}
                    onChange={(e) =>
                      setVehForm((p) => ({ ...p, mileageKm: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Műszaki érvényessége</label>
                  <input
                    type="date"
                    value={vehForm.motExpiry}
                    onChange={(e) => setVehForm((p) => ({ ...p, motExpiry: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  onClick={() => setShowNewVehicleModal(false)}
                  className="px-4 py-1.5 rounded bg-white border border-zinc-300 text-zinc-700 cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  onClick={async () => {
                    if (!vehForm.licensePlate.trim() || !vehForm.make.trim()) return;
                    await onCreateVehicle(vehForm);
                    setShowNewVehicleModal(false);
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

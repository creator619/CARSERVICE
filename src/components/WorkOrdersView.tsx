import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Printer,
  ChevronRight,
  Trash2,
  X,
  Receipt,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  AppData,
  WorkOrder,
  WorkOrderStatus,
  WorkOrderPriority,
  WorkOrderItem,
  VehicleInspection,
  InspectionState,
  WORK_ORDER_STATUS_META,
  PRIORITY_META,
  WORKSHOP_BAYS,
  DEFAULT_WHEEL_MEASUREMENTS,
  calculateWorkOrderTotals,
  formatHuf,
} from '../types';
import { CarWalkaroundWidget } from './CarWalkaroundWidget';

interface WorkOrdersViewProps {
  data: AppData;
  selectedWorkOrder: WorkOrder | null;
  isCreatingNew: boolean;
  onClearSelection: () => void;
  onCreateWorkOrder: (payload: Partial<WorkOrder>) => Promise<void>;
  onUpdateWorkOrder: (id: string, payload: Partial<WorkOrder>) => Promise<void>;
  onUpdateStatus: (id: string, status: WorkOrderStatus) => Promise<void>;
  onIssueInvoice: (id: string, paymentStatus: 'invoiced' | 'paid', paymentMethod: string) => Promise<void>;
  onDeleteWorkOrder: (id: string) => Promise<void>;
  onPrintWorkOrder: (wo: WorkOrder, docType?: 'work_order' | 'quote' | 'invoice') => void;
  onOpenCustomerPortal?: (wo: WorkOrder) => void;
}

const STATUS_ORDER: WorkOrderStatus[] = [
  'received',
  'quoting',
  'waiting_parts',
  'in_progress',
  'testing',
  'ready',
  'completed',
];

const LABOR_TEMPLATES = [
  { sku: 'LAB-OIL', name: 'Időszakos motorolaj és szűrők cseréje + szervizintervallum nullázás', hours: 1.0 },
  { sku: 'LAB-DIAG', name: 'Gyári diagnosztikai hibakódolvasás és élőadat-elemzés', hours: 0.8 },
  { sku: 'LAB-BRAKE', name: 'Féktárcsa és fékbetét csere tengelyenként + fékhatásmérés', hours: 1.5 },
  { sku: 'LAB-ALIGN', name: '3D futómű-geometria ellenőrzés és beállítás', hours: 1.2 },
  { sku: 'LAB-MOT', name: 'Műszaki vizsga előtti teljes műszeres átvizsgálás', hours: 1.5 },
  { sku: 'LAB-AC', name: 'Klímarendszer nyomáspróba, hűtőközeg töltés és tisztítás', hours: 1.0 },
];

export const WorkOrdersView: React.FC<WorkOrdersViewProps> = ({
  data,
  selectedWorkOrder,
  isCreatingNew,
  onClearSelection,
  onCreateWorkOrder,
  onUpdateWorkOrder,
  onUpdateStatus,
  onIssueInvoice,
  onDeleteWorkOrder,
  onPrintWorkOrder,
  onOpenCustomerPortal,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  useEffect(() => {
    if (selectedWorkOrder) {
      const fresh = data.workOrders.find((w) => w.id === selectedWorkOrder.id) || selectedWorkOrder;
      setEditingOrder(fresh);
    }
  }, [selectedWorkOrder, data.workOrders]);

  useEffect(() => {
    if (isCreatingNew) {
      openNewWorkOrderModal();
    }
  }, [isCreatingNew]);

  const getCustomer = (id: string) => data.customers.find((c) => c.id === id);
  const getVehicle = (id: string) => data.vehicles.find((v) => v.id === id);
  const getMechanic = (id: string) => data.mechanics.find((m) => m.id === id);

  const openNewWorkOrderModal = () => {
    const firstVehicle = data.vehicles[0];
    const firstCustomer = firstVehicle
      ? getCustomer(firstVehicle.customerId)
      : data.customers[0];
    const firstMechanic = data.mechanics[0];

    setIsNewModalOpen(true);
    setEditingOrder({
      id: '',
      orderNumber: 'ÚJ MUNKALAP',
      customerId: firstCustomer?.id || '',
      vehicleId: firstVehicle?.id || '',
      mechanicId: firstMechanic?.id || '',
      bay: firstMechanic?.bay || WORKSHOP_BAYS[0],
      status: 'received',
      priority: 'normal',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      estimatedCompletion: new Date(Date.now() + 8 * 3600 * 1000)
        .toISOString()
        .slice(0, 16)
        .replace('T', ' '),
      completedAt: '',
      mileageIn: firstVehicle?.mileageKm || 100000,
      fuelLevel: 50,
      customerComplaint: '',
      diagnosis: '',
      inspection: {
        brakes: 'ok',
        suspension: 'ok',
        engineOil: 'ok',
        tires: 'ok',
        battery: 'ok',
        lights: 'ok',
        bodyNotes: '',
        damageMarkers: [],
        wheelMeasurements: DEFAULT_WHEEL_MEASUREMENTS,
      },
      items: [],
      discountPercent: firstCustomer?.discountPercent || 0,
      invoiceNumber: '',
      paymentStatus: 'unbilled',
      paymentMethod: 'Bankkártya',
      quoteApproved: false,
      quoteApprovedAt: '',
      quoteApprovedBy: '',
    });
  };

  const closeModal = () => {
    setEditingOrder(null);
    setIsNewModalOpen(false);
    onClearSelection();
  };

  const filteredOrders = data.workOrders.filter((wo) => {
    if (statusFilter !== 'all' && wo.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const veh = getVehicle(wo.vehicleId);
    const cust = getCustomer(wo.customerId);
    return (
      wo.orderNumber.toLowerCase().includes(q) ||
      wo.customerComplaint.toLowerCase().includes(q) ||
      (veh && `${veh.licensePlate} ${veh.make} ${veh.model} ${veh.vin}`.toLowerCase().includes(q)) ||
      (cust && `${cust.name} ${cust.phone}`.toLowerCase().includes(q))
    );
  });

  const getNextStatus = (current: WorkOrderStatus): WorkOrderStatus | null => {
    const idx = STATUS_ORDER.indexOf(current);
    if (idx >= 0 && idx < STATUS_ORDER.length - 1) {
      return STATUS_ORDER[idx + 1];
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Munkalapok és szervizfolyamat
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gépjárművek javítási státuszai, műszaki állapotfelmérés és alkatrész-felhasználás
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rendszám, munkalap, ügyfél..."
              className="pl-8 pr-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-blue-600"
          >
            <option value="all">Összes státusz ({data.workOrders.length})</option>
            {STATUS_ORDER.map((st) => (
              <option key={st} value={st}>
                {WORK_ORDER_STATUS_META[st].label}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-md bg-slate-200/80 p-0.5 border border-slate-300/80">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Folyamatábra
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>

          <button
            onClick={openNewWorkOrderModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Új munkalap
          </button>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3.5 items-start">
          {(
            ['received', 'waiting_parts', 'in_progress', 'testing', 'ready', 'completed'] as WorkOrderStatus[]
          ).map((colStatus) => {
            const meta = WORK_ORDER_STATUS_META[colStatus];
            const colOrders = filteredOrders.filter((o) =>
              colStatus === 'received'
                ? o.status === 'received' || o.status === 'quoting'
                : o.status === colStatus
            );

            return (
              <div
                key={colStatus}
                className={`bg-slate-200/55 border border-slate-300/80 border-t-3 ${meta.columnBorder} rounded-lg overflow-hidden flex flex-col min-h-[460px]`}
              >
                <div className={`flex items-center justify-between px-3 py-2.5 border-b border-slate-200/90 ${meta.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                    <h3 className="text-xs font-semibold text-slate-800">
                      {meta.label}
                    </h3>
                  </div>
                  <span className="px-1.5 py-0.2 text-[11px] font-semibold rounded bg-white/90 border border-slate-200 text-slate-700 tabular-nums">
                    {colOrders.length}
                  </span>
                </div>

                <div className="p-2.5 space-y-2.5">
                  {colOrders.map((wo) => {
                    const veh = getVehicle(wo.vehicleId);
                    const cust = getCustomer(wo.customerId);
                    const mech = getMechanic(wo.mechanicId);
                    const prio = PRIORITY_META[wo.priority];
                    const totals = calculateWorkOrderTotals(wo);
                    const nextSt = getNextStatus(wo.status);

                    return (
                      <div
                        key={wo.id}
                        onClick={() => {
                          setIsNewModalOpen(false);
                          setEditingOrder(wo);
                        }}
                        className="bg-white hover:border-blue-400 border border-slate-200/90 rounded-md p-3 transition cursor-pointer shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-[11px] font-semibold text-blue-700">
                            {wo.orderNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[10px] font-medium rounded border ${prio.badgeClass}`}
                          >
                            {prio.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          <div className="inline-flex items-center border border-slate-300 rounded overflow-hidden text-[11px] font-mono font-semibold shrink-0">
                            <span className="bg-blue-700 text-white px-1 text-[9px]">H</span>
                            <span className="bg-slate-50 text-slate-900 px-1.5">
                              {veh?.licensePlate}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {veh?.make} {veh?.model}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 mb-2 truncate">
                          {cust?.name}
                        </p>

                        <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-200/70 mb-2.5 leading-relaxed">
                          {wo.customerComplaint}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <span className="truncate font-medium text-slate-700">{mech?.name}</span>
                          <span className="font-bold text-slate-900 tabular-nums">
                            {formatHuf(totals.totalGross)}
                          </span>
                        </div>

                        <div
                          className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onPrintWorkOrder(wo, 'work_order')}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                              title="Munkalap nyomtatása"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {wo.quoteApproved ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium"
                                title={`Jóváhagyva: ${wo.quoteApprovedBy || ''} (${wo.quoteApprovedAt || ''})`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Jóváhagyva
                              </span>
                            ) : (
                              <button
                                onClick={() => onOpenCustomerPortal?.(wo)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-medium transition cursor-pointer"
                                title="Megnyitás az Ügyfélportálon jóváhagyáshoz"
                              >
                                <Clock className="w-3 h-3" />
                                Jóváhagyásra vár
                              </button>
                            )}
                          </div>

                          {nextSt && (
                            <button
                              onClick={() => onUpdateStatus(wo.id, nextSt)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[11px] font-medium transition cursor-pointer"
                              title={`Léptetés: ${WORK_ORDER_STATUS_META[nextSt].label}`}
                            >
                              Tovább
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colOrders.length === 0 && (
                    <div className="py-10 text-center text-[11px] text-slate-400 border border-dashed border-slate-300/80 rounded-md">
                      Üres fázis
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Munkalapszám</th>
                  <th className="py-3 px-4">Jármű</th>
                  <th className="py-3 px-4">Ügyfél</th>
                  <th className="py-3 px-4">Szerelő / Állás</th>
                  <th className="py-3 px-4">Megrendelt munka</th>
                  <th className="py-3 px-4">Státusz</th>
                  <th className="py-3 px-4 text-right">Bruttó végösszeg</th>
                  <th className="py-3 px-4 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {filteredOrders.map((wo) => {
                  const veh = getVehicle(wo.vehicleId);
                  const cust = getCustomer(wo.customerId);
                  const mech = getMechanic(wo.mechanicId);
                  const statusMeta = WORK_ORDER_STATUS_META[wo.status];
                  const totals = calculateWorkOrderTotals(wo);

                  return (
                    <tr key={wo.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setIsNewModalOpen(false);
                            setEditingOrder(wo);
                          }}
                          className="font-mono font-semibold text-blue-700 hover:underline cursor-pointer"
                        >
                          {wo.orderNumber}
                        </button>
                        <div className="text-[11px] text-slate-500 tabular-nums">{wo.createdAt}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center border border-slate-300 rounded overflow-hidden text-[11px] font-mono font-semibold">
                          <span className="bg-blue-700 text-white px-1 text-[9px]">H</span>
                          <span className="bg-slate-50 text-slate-900 px-1.5">
                            {veh?.licensePlate}
                          </span>
                        </div>
                        <div className="font-medium text-slate-900 mt-0.5">
                          {veh?.make} {veh?.model}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{cust?.name}</div>
                        <div className="text-slate-500 tabular-nums">{cust?.phone}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 font-medium">{mech?.name}</div>
                        <div className="text-slate-500 text-[11px]">{wo.bay}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2">{wo.customerComplaint}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${statusMeta.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatHuf(totals.totalGross)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setIsNewModalOpen(false);
                              setEditingOrder(wo);
                            }}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium transition cursor-pointer"
                          >
                            Megnyitás
                          </button>
                          <button
                            onClick={() => onPrintWorkOrder(wo, 'work_order')}
                            className="p-1 rounded bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 transition cursor-pointer"
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
      )}

      {/* WORK ORDER EDITOR MODAL */}
      {editingOrder && (
        <WorkOrderEditorModal
          data={data}
          order={editingOrder}
          isNew={isNewModalOpen}
          onClose={closeModal}
          onSave={async (updated) => {
            if (isNewModalOpen) {
              await onCreateWorkOrder(updated);
            } else {
              await onUpdateWorkOrder(editingOrder.id, updated);
            }
            closeModal();
          }}
          onIssueInvoice={async (paymentStatus, paymentMethod) => {
            if (!isNewModalOpen && editingOrder.id) {
              await onUpdateWorkOrder(editingOrder.id, editingOrder);
              await onIssueInvoice(editingOrder.id, paymentStatus, paymentMethod);
              closeModal();
            }
          }}
          onDelete={async () => {
            if (!isNewModalOpen && editingOrder.id) {
              await onDeleteWorkOrder(editingOrder.id);
              closeModal();
            }
          }}
          onPrint={(docType) => onPrintWorkOrder(editingOrder, docType)}
          onOpenPortal={() => {
            const target = editingOrder;
            closeModal();
            onOpenCustomerPortal?.(target);
          }}
        />
      )}
    </div>
  );
};

interface WorkOrderEditorModalProps {
  data: AppData;
  order: WorkOrder;
  isNew: boolean;
  onClose: () => void;
  onSave: (order: WorkOrder) => Promise<void>;
  onIssueInvoice: (paymentStatus: 'invoiced' | 'paid', paymentMethod: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onPrint: (docType: 'work_order' | 'quote' | 'invoice') => void;
  onOpenPortal?: () => void;
}

const WorkOrderEditorModal: React.FC<WorkOrderEditorModalProps> = ({
  data,
  order: initialOrder,
  isNew,
  onClose,
  onSave,
  onIssueInvoice,
  onDelete,
  onPrint,
  onOpenPortal,
}) => {
  const [form, setForm] = useState<WorkOrder>(initialOrder);
  const [selectedPartId, setSelectedPartId] = useState<string>(data.inventory[0]?.id || '');
  const [partQty, setPartQty] = useState<number>(1);
  const [selectedLaborIdx, setSelectedLaborIdx] = useState<number>(0);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemType, setCustomItemType] = useState<'part' | 'labor'>('labor');
  const [customItemQty, setCustomItemQty] = useState(1);
  const [customItemPrice, setCustomItemPrice] = useState(16000);

  const handleVehicleChange = (vehicleId: string) => {
    const veh = data.vehicles.find((v) => v.id === vehicleId);
    const cust = veh ? data.customers.find((c) => c.id === veh.customerId) : undefined;
    setForm((prev) => ({
      ...prev,
      vehicleId,
      customerId: cust?.id || prev.customerId,
      mileageIn: veh?.mileageKm || prev.mileageIn,
      discountPercent: cust?.discountPercent ?? prev.discountPercent,
    }));
  };

  const handleAddInventoryPart = () => {
    const inv = data.inventory.find((i) => i.id === selectedPartId);
    if (!inv) return;
    const newItem: WorkOrderItem = {
      id: 'item-' + Date.now() + Math.random().toString(36).slice(2, 5),
      type: 'part',
      sku: inv.sku,
      name: `${inv.brand} ${inv.name}`,
      quantity: Number(partQty) || 1,
      unit: inv.unit,
      unitPriceNet: inv.sellPriceNet,
      vatRate: inv.vatRate,
    };
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleAddLaborTemplate = () => {
    const tpl = LABOR_TEMPLATES[selectedLaborIdx];
    if (!tpl) return;
    const mech = data.mechanics.find((m) => m.id === form.mechanicId);
    const hourlyRate = mech?.hourlyRate || 16000;
    const newItem: WorkOrderItem = {
      id: 'item-' + Date.now() + Math.random().toString(36).slice(2, 5),
      type: 'labor',
      sku: tpl.sku,
      name: tpl.name,
      quantity: tpl.hours,
      unit: 'óra',
      unitPriceNet: hourlyRate,
      vatRate: 27,
    };
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return;
    const newItem: WorkOrderItem = {
      id: 'item-' + Date.now() + Math.random().toString(36).slice(2, 5),
      type: customItemType,
      sku: customItemType === 'part' ? 'EGYEDI-ALK' : 'EGYEDI-MD',
      name: customItemName.trim(),
      quantity: Number(customItemQty) || 1,
      unit: customItemType === 'part' ? 'db' : 'óra',
      unitPriceNet: Number(customItemPrice) || 0,
      vatRate: 27,
    };
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setCustomItemName('');
  };

  const updateInspectionField = (
    key: keyof Omit<VehicleInspection, 'bodyNotes' | 'damageMarkers' | 'wheelMeasurements'>,
    val: InspectionState
  ) => {
    setForm((prev) => ({
      ...prev,
      inspection: {
        ...prev.inspection,
        [key]: val,
      },
    }));
  };

  const totals = calculateWorkOrderTotals(form);
  const currentCustomer = data.customers.find((c) => c.id === form.customerId);
  const currentVehicle = data.vehicles.find((v) => v.id === form.vehicleId);

  const inspectionFields: {
    key: keyof Omit<VehicleInspection, 'bodyNotes' | 'damageMarkers' | 'wheelMeasurements'>;
    label: string;
  }[] = [
    { key: 'brakes', label: 'Fékrendszer (tárcsa, betét, fékcső)' },
    { key: 'suspension', label: 'Futómű, lengéscsillapító, kormányzás' },
    { key: 'engineOil', label: 'Motor, olajszint, hűtő- és fékfolyadék' },
    { key: 'tires', label: 'Gumiabroncsok állapota és profilmélység' },
    { key: 'battery', label: 'Akkumulátor (SOH) és generátor töltés' },
    { key: 'lights', label: 'Világítás, jelzőberendezések, ablaktörlő' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-300 rounded-lg max-w-5xl w-full overflow-hidden shadow-xl my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#0F172A] text-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono font-semibold text-xs">
              {form.orderNumber}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {isNew ? 'Új szerviz munkalap felvétele' : 'Munkalap és állapotfelmérés'}
              </h3>
              <p className="text-xs text-slate-300">
                {currentVehicle
                  ? `${currentVehicle.licensePlate} — ${currentVehicle.make} ${currentVehicle.model} • Ügyfél: ${currentCustomer?.name || ''}`
                  : 'Válaszd ki a gépjárművet és töltsd ki a munkalap adatait'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && (
              <>
                {onOpenPortal && (
                  <button
                    type="button"
                    onClick={onOpenPortal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 text-xs font-medium transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ügyfélportál nézet
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onPrint('work_order')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-medium transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  Nyomtatási kép
                </button>
                <button
                  type="button"
                  onClick={() => onIssueInvoice('paid', form.paymentMethod)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Számlázás és lezárás
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Gépjármű kiválasztása
              </label>
              <select
                value={form.vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {data.vehicles.map((v) => {
                  const c = data.customers.find((cust) => cust.id === v.customerId);
                  return (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} – {v.make} {v.model} ({c?.name})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Felelős szerelő
              </label>
              <select
                value={form.mechanicId}
                onChange={(e) => {
                  const mech = data.mechanics.find((m) => m.id === e.target.value);
                  setForm((prev) => ({
                    ...prev,
                    mechanicId: e.target.value,
                    bay: mech?.bay || prev.bay,
                  }));
                }}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {data.mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({formatHuf(m.hourlyRate)}/óra)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Műhelyállás
              </label>
              <select
                value={form.bay}
                onChange={(e) => setForm((prev) => ({ ...prev, bay: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {WORKSHOP_BAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Státusz
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value as WorkOrderStatus }))
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {STATUS_ORDER.map((st) => (
                  <option key={st} value={st}>
                    {WORK_ORDER_STATUS_META[st].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Km-óra állás felvételkor
              </label>
              <input
                type="number"
                value={form.mileageIn}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, mileageIn: Number(e.target.value) || 0 }))
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center justify-between">
                <span>Üzemanyagszint</span>
                <span className="text-blue-700 font-semibold tabular-nums">{form.fuelLevel}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.fuelLevel}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fuelLevel: Number(e.target.value) }))
                }
                className="w-full accent-blue-600 mt-1.5 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Prioritás
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, priority: e.target.value as WorkOrderPriority }))
                }
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="low">Alacsony</option>
                <option value="normal">Normál</option>
                <option value="high">Kiemelt</option>
                <option value="urgent">Sürgős</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Vállalt határidő
              </label>
              <input
                type="text"
                value={form.estimatedCompletion}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, estimatedCompletion: e.target.value }))
                }
                placeholder="2026-11-10 16:00"
                className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-900 tabular-nums focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Complaint & Diagnosis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ügyfél által jelzett hibajelenség / megrendelt munka
              </label>
              <textarea
                rows={3}
                value={form.customerComplaint}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customerComplaint: e.target.value }))
                }
                placeholder="Az ügyfél által elmondott hibajelenség vagy kért karbantartás..."
                className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Szerviz diagnosztika / megállapított hiba
              </label>
              <textarea
                rows={3}
                value={form.diagnosis}
                onChange={(e) => setForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="Műszeres vizsgálat eredménye és javítási javaslat..."
                className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* 6-Point Inspection */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-800 mb-3">
              Munkafelvételi állapotfelmérés
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {inspectionFields.map(({ key, label }) => {
                const currentVal = form.inspection?.[key] || 'ok';
                return (
                  <div
                    key={key}
                    className="p-3 rounded-md bg-white border border-slate-200 flex flex-col justify-between gap-2"
                  >
                    <span className="text-xs font-medium text-slate-800">{label}</span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => updateInspectionField(key, 'ok')}
                        className={`py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                          currentVal === 'ok'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Megfelelő
                      </button>
                      <button
                        type="button"
                        onClick={() => updateInspectionField(key, 'warn')}
                        className={`py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                          currentVal === 'warn'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Figyelendő
                      </button>
                      <button
                        type="button"
                        onClick={() => updateInspectionField(key, 'bad')}
                        className={`py-1 rounded text-[11px] font-medium border transition cursor-pointer ${
                          currentVal === 'bad'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Cserélendő
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <input
                type="text"
                value={form.inspection?.bodyNotes || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    inspection: { ...prev.inspection, bodyNotes: e.target.value },
                  }))
                }
                placeholder="Karosszéria megjegyzés (pl. meglévő fényezési sérülések rögzítése)..."
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* 2D Body Damage Walkaround & 4-Corner Wheel Measurements */}
          <CarWalkaroundWidget
            damageMarkers={form.inspection?.damageMarkers || []}
            wheelMeasurements={form.inspection?.wheelMeasurements || DEFAULT_WHEEL_MEASUREMENTS}
            onChangeMarkers={(markers) =>
              setForm((prev) => ({
                ...prev,
                inspection: { ...prev.inspection, damageMarkers: markers },
              }))
            }
            onChangeWheels={(wheels) =>
              setForm((prev) => ({
                ...prev,
                inspection: { ...prev.inspection, wheelMeasurements: wheels },
              }))
            }
          />

          {/* Line Items */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800">
                Alkatrészek és munkadíj tételek
              </h4>
              <span className="text-xs text-slate-500 tabular-nums">
                {(form.items || []).length} tétel
              </span>
            </div>

            {/* Quick Add Bars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-white border border-slate-200 flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-medium text-slate-600 w-full">
                  Alkatrész kivételezése raktárból:
                </div>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-xs text-slate-900"
                >
                  {data.inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      [{inv.sku}] {inv.name} — {formatHuf(inv.sellPriceNet)} + ÁFA ({inv.stock} {inv.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={partQty}
                  onChange={(e) => setPartQty(Number(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 rounded bg-slate-50 border border-slate-300 text-xs text-slate-900 text-center tabular-nums"
                />
                <button
                  type="button"
                  onClick={handleAddInventoryPart}
                  className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs transition cursor-pointer"
                >
                  + Hozzáadás
                </button>
              </div>

              <div className="p-3 rounded-md bg-white border border-slate-200 flex flex-wrap items-center gap-2">
                <div className="text-[11px] font-medium text-slate-600 w-full">
                  Normaóra munkadíj sablonok:
                </div>
                <select
                  value={selectedLaborIdx}
                  onChange={(e) => setSelectedLaborIdx(Number(e.target.value))}
                  className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-xs text-slate-900"
                >
                  {LABOR_TEMPLATES.map((tpl, idx) => (
                    <option key={tpl.sku} value={idx}>
                      {tpl.name} ({tpl.hours} óra)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddLaborTemplate}
                  className="px-3 py-1.5 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-medium text-xs transition cursor-pointer"
                >
                  + Munkadíj
                </button>
              </div>
            </div>

            {/* Custom Item */}
            <div className="p-3 rounded-md bg-white border border-slate-200 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-slate-600">Egyedi tétel:</span>
              <select
                value={customItemType}
                onChange={(e) => setCustomItemType(e.target.value as 'part' | 'labor')}
                className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-900"
              >
                <option value="labor">Munkadíj</option>
                <option value="part">Alkatrész</option>
              </select>
              <input
                type="text"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                placeholder="Megnevezés..."
                className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-900"
              />
              <input
                type="number"
                step="0.5"
                value={customItemQty}
                onChange={(e) => setCustomItemQty(Number(e.target.value) || 1)}
                className="w-20 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-900 text-center tabular-nums"
              />
              <input
                type="number"
                step="500"
                value={customItemPrice}
                onChange={(e) => setCustomItemPrice(Number(e.target.value) || 0)}
                className="w-28 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-900 text-right tabular-nums"
              />
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium transition cursor-pointer"
              >
                + Felvétel
              </button>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto bg-white rounded-md border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                    <th className="py-2 px-3">Típus</th>
                    <th className="py-2 px-2">Cikkszám</th>
                    <th className="py-2 px-2">Megnevezés</th>
                    <th className="py-2 px-2 text-right">Mennyiség</th>
                    <th className="py-2 px-2 text-right">Nettó egységár</th>
                    <th className="py-2 px-2 text-right">Nettó összesen</th>
                    <th className="py-2 px-2 text-right">Bruttó (27%)</th>
                    <th className="py-2 px-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {(form.items || []).map((item, idx) => {
                    const lineNet = item.quantity * item.unitPriceNet;
                    const lineGross = Math.round(lineNet * 1.27);
                    return (
                      <tr key={item.id}>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              item.type === 'part'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {item.type === 'part' ? 'Alkatrész' : 'Munkadíj'}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-500">{item.sku}</td>
                        <td className="py-2 px-2 font-medium text-slate-900">{item.name}</td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 1;
                              setForm((prev) => {
                                const copy = [...prev.items];
                                copy[idx] = { ...copy[idx], quantity: val };
                                return { ...prev, items: copy };
                              });
                            }}
                            className="w-16 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-300 text-right text-slate-900"
                          />{' '}
                          <span className="text-slate-500">{item.unit}</span>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          <input
                            type="number"
                            step="500"
                            value={item.unitPriceNet}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setForm((prev) => {
                                const copy = [...prev.items];
                                copy[idx] = { ...copy[idx], unitPriceNet: val };
                                return { ...prev, items: copy };
                              });
                            }}
                            className="w-24 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-300 text-right text-slate-900"
                          />
                        </td>
                        <td className="py-2 px-2 text-right text-slate-700 font-medium tabular-nums">
                          {formatHuf(lineNet)}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-900 font-semibold tabular-nums">
                          {formatHuf(lineGross)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                items: prev.items.filter((_, i) => i !== idx),
                              }))
                            }
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-3 border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <label className="text-slate-600 mr-2">Kedvezmény (%):</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={form.discountPercent}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        discountPercent: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-16 px-2 py-1 rounded bg-white border border-slate-300 text-slate-900 text-center tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-slate-600 mr-2">Fizetési mód:</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                    }
                    className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-900"
                  >
                    <option value="Bankkártya">Bankkártya</option>
                    <option value="Készpénz">Készpénz</option>
                    <option value="Átutalás">Átutalás (8 nap)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-right tabular-nums">
                <div>
                  <span className="text-[11px] text-slate-500 block">Nettó részösszeg</span>
                  <span className="text-sm font-semibold text-slate-800">{formatHuf(totals.totalNet)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">27% ÁFA</span>
                  <span className="text-sm font-semibold text-slate-800">{formatHuf(totals.vatAmount)}</span>
                </div>
                <div className="bg-blue-700 text-white px-4 py-2 rounded-md">
                  <span className="text-[10px] text-blue-200 block uppercase tracking-wider">
                    Fizetendő bruttó
                  </span>
                  <span className="text-base font-bold">
                    {formatHuf(totals.totalGross)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <div>
            {!isNew && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-rose-50 text-rose-700 border border-transparent hover:border-rose-200 text-xs font-medium transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Munkalap törlése
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={() => onSave(form)}
              className="px-5 py-1.5 rounded-md bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs transition cursor-pointer"
            >
              {isNew ? 'Munkalap létrehozása' : 'Módosítások mentése'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

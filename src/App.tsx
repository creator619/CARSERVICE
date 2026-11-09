import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Wrench,
  Car,
  CalendarClock,
  Package,
  Receipt,
  UserCheck,
  Plus,
  RotateCcw,
  Search,
  Check,
  Disc,
  Smartphone,
  BookCheck,
} from 'lucide-react';
import {
  AppData,
  WorkOrder,
  WorkOrderStatus,
  Customer,
  Vehicle,
  InventoryItem,
  Appointment,
  Mechanic,
  TireSet,
  ServiceBookEntry,
} from './types';
import { DashboardView } from './components/DashboardView';
import { WorkOrdersView } from './components/WorkOrdersView';
import { VehiclesCustomersView } from './components/VehiclesCustomersView';
import { AppointmentsView } from './components/AppointmentsView';
import { InventoryView } from './components/InventoryView';
import { BillingView } from './components/BillingView';
import { MechanicsView } from './components/MechanicsView';
import { TireHotelView } from './components/TireHotelView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { DigitalServiceBookView } from './components/DigitalServiceBookView';
import { PrintableDocumentModal } from './components/PrintableDocumentModal';

export function App() {
  const [data, setData] = useState<AppData>({
    customers: [],
    vehicles: [],
    mechanics: [],
    inventory: [],
    workOrders: [],
    appointments: [],
    tireSets: [],
    serviceBookEntries: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [roleView, setRoleView] = useState<'admin' | 'mechanic' | 'warehouse' | 'portal'>('admin');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [portalWorkOrderId, setPortalWorkOrderId] = useState<string | undefined>(undefined);
  const [serviceBookVehicleId, setServiceBookVehicleId] = useState<string | undefined>(undefined);
  const [isCreatingWorkOrder, setIsCreatingWorkOrder] = useState(false);
  const [printTarget, setPrintTarget] = useState<{
    wo: WorkOrder;
    docType: 'work_order' | 'quote' | 'invoice';
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const fetchBootstrap = async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBootstrap();
  }, []);

  const apiCall = async (url: string, method: string, body?: unknown, successMsg?: string) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      const nextState = await res.json();
      setData(nextState);
      if (successMsg) showToast(successMsg);
      return nextState;
    }
  };

  const activeWorkOrdersCount = data.workOrders.filter((w) => w.status !== 'completed').length;
  const lowStockCount = data.inventory.filter((i) => i.stock <= i.minStock).length;
  const scheduledAptCount = data.appointments.filter((a) => a.status === 'scheduled').length;
  const storedTireSetsCount = (data.tireSets || []).filter((t) => t.status === 'stored').length;
  const pendingQuotesCount = data.workOrders.filter(
    (w) => !w.quoteApproved && w.status !== 'completed'
  ).length;

  const quickSearchResults = globalSearch.trim()
    ? [
        ...data.vehicles
          .filter((v) =>
            `${v.licensePlate} ${v.make} ${v.model} ${v.vin}`
              .toLowerCase()
              .includes(globalSearch.toLowerCase())
          )
          .slice(0, 3)
          .map((v) => ({
            type: 'Jármű',
            label: `${v.licensePlate} — ${v.make} ${v.model}`,
            action: () => {
              setActiveTab('vehicles');
              setGlobalSearch('');
            },
          })),
        ...data.workOrders
          .filter((w) =>
            `${w.orderNumber} ${w.customerComplaint}`
              .toLowerCase()
              .includes(globalSearch.toLowerCase())
          )
          .slice(0, 3)
          .map((w) => ({
            type: 'Munkalap',
            label: `${w.orderNumber} — ${w.customerComplaint.slice(0, 48)}`,
            action: () => {
              setSelectedWorkOrder(w);
              setActiveTab('work-orders');
              setGlobalSearch('');
            },
          })),
      ]
    : [];

  const navItems = [
    {
      id: 'dashboard',
      label: 'Áttekintés',
      icon: LayoutDashboard,
      count: null,
      badgeTone: 'default',
    },
    {
      id: 'work-orders',
      label: 'Munkalapok & Felvétel',
      icon: Wrench,
      count: activeWorkOrdersCount > 0 ? activeWorkOrdersCount : null,
      badgeTone: 'blue',
    },
    {
      id: 'customer-portal',
      label: 'Ügyfélportál & Jóváhagyás',
      icon: Smartphone,
      count: pendingQuotesCount > 0 ? `${pendingQuotesCount} vár` : null,
      badgeTone: 'amber',
    },
    {
      id: 'appointments',
      label: 'Előjegyzési naptár',
      icon: CalendarClock,
      count: scheduledAptCount > 0 ? scheduledAptCount : null,
      badgeTone: 'indigo',
    },
    {
      id: 'vehicles',
      label: 'Járművek és ügyfelek',
      icon: Car,
      count: data.vehicles.length,
      badgeTone: 'default',
    },
    {
      id: 'service-book',
      label: 'Digitális szervizkönyv',
      icon: BookCheck,
      count: (data.serviceBookEntries || []).length || null,
      badgeTone: 'indigo',
    },
    {
      id: 'tire-hotel',
      label: 'Gumiabroncs-hotel',
      icon: Disc,
      count: storedTireSetsCount > 0 ? `${storedTireSetsCount} szett` : null,
      badgeTone: 'blue',
    },
    {
      id: 'inventory',
      label: 'Alkatrészraktár',
      icon: Package,
      count: lowStockCount > 0 ? `${lowStockCount} hiány` : null,
      badgeTone: 'amber',
    },
    {
      id: 'billing',
      label: 'Számlázás és pénzügy',
      icon: Receipt,
      count: null,
      badgeTone: 'default',
    },
    {
      id: 'mechanics',
      label: 'Műhely és szerelők',
      icon: UserCheck,
      count: null,
      badgeTone: 'default',
    },
  ];

  return (
    <div className="min-h-screen bg-[#EEF1F5] text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="no-print w-full lg:w-64 bg-[#0F172A] text-slate-300 border-b lg:border-b-0 lg:border-r border-slate-800 shrink-0 flex flex-col justify-between">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
                AT
              </div>
              <div>
                <div className="text-sm font-semibold text-white tracking-tight leading-none">
                  AutoTech Pro
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Szervizirányítási rendszer
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action */}
          <div className="p-4">
            <button
              onClick={() => {
                setSelectedWorkOrder(null);
                setIsCreatingWorkOrder(true);
                setActiveTab('work-orders');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.2]" />
              Új munkalap felvétele
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Szervizmodulok
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsCreatingWorkOrder(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-800/95 text-white border-l-3 border-blue-500 pl-2.5'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums ${
                        item.badgeTone === 'amber'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : item.badgeTone === 'blue'
                          ? 'bg-blue-500/25 text-blue-200 border border-blue-500/30'
                          : item.badgeTone === 'indigo'
                          ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Telephely</span>
            <span className="text-slate-200 font-medium">Budapest — Kondorosi út 18.</span>
          </div>
          <button
            onClick={() =>
              apiCall('/api/reset-demo', 'POST', undefined, 'Mintaadatok visszaállítva.')
            }
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Alapállapot visszaállítása
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="no-print h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {/* Global Search */}
          <div className="relative w-full max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Gyorskeresés rendszám, munkalapszám vagy alvázszám alapján..."
              className="w-full pl-9 pr-4 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition"
            />
            {quickSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden z-50">
                {quickSearchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={res.action}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs border-b border-slate-100 last:border-0 cursor-pointer"
                  >
                    <span className="text-slate-900 font-medium truncate">{res.label}</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                      {res.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Role Switcher */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
              <button
                onClick={() => {
                  setRoleView('admin');
                  setActiveTab('dashboard');
                }}
                className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                  roleView === 'admin'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Munkafelvétel
              </button>
              <button
                onClick={() => {
                  setRoleView('mechanic');
                  setActiveTab('work-orders');
                }}
                className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                  roleView === 'mechanic'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Műhelynézet
              </button>
              <button
                onClick={() => {
                  setRoleView('warehouse');
                  setActiveTab('tire-hotel');
                }}
                className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                  roleView === 'warehouse'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gumihotel & Raktár
              </button>
              <button
                onClick={() => {
                  setRoleView('portal');
                  setActiveTab('customer-portal');
                }}
                className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                  roleView === 'portal'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ügyfélportál
              </button>
            </div>
          </div>
        </header>

        {/* Subtle Notification Toast */}
        {toastMessage && (
          <div className="no-print fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-900 text-white text-xs font-medium shadow-lg border border-slate-700">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Active View */}
        <main className="p-6 lg:p-7 flex-1 max-w-[1600px] w-full mx-auto">
          {loading ? (
            <div className="py-24 text-center text-xs text-slate-500">
              Adatok betöltése...
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  data={data}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onSelectWorkOrder={(wo) => {
                    setSelectedWorkOrder(wo);
                    setActiveTab('work-orders');
                  }}
                  onPrintWorkOrder={(wo, docType = 'work_order') =>
                    setPrintTarget({ wo, docType })
                  }
                  onRestockItem={(id, delta) =>
                    apiCall(
                      `/api/inventory/${id}/restock`,
                      'POST',
                      { delta },
                      'Készletmennyiség frissítve.'
                    )
                  }
                  onOpenNewWorkOrder={() => {
                    setSelectedWorkOrder(null);
                    setIsCreatingWorkOrder(true);
                    setActiveTab('work-orders');
                  }}
                />
              )}

              {activeTab === 'work-orders' && (
                <WorkOrdersView
                  data={data}
                  selectedWorkOrder={selectedWorkOrder}
                  isCreatingNew={isCreatingWorkOrder}
                  onClearSelection={() => {
                    setSelectedWorkOrder(null);
                    setIsCreatingWorkOrder(false);
                  }}
                  onCreateWorkOrder={async (payload: Partial<WorkOrder>) => {
                    await apiCall(
                      '/api/work-orders',
                      'POST',
                      payload,
                      'Munkalap rögzítve.'
                    );
                  }}
                  onUpdateWorkOrder={async (id: string, payload: Partial<WorkOrder>) => {
                    await apiCall(
                      `/api/work-orders/${id}`,
                      'PUT',
                      payload,
                      'Munkalap módosításai mentve.'
                    );
                  }}
                  onUpdateStatus={async (id: string, status: WorkOrderStatus) => {
                    await apiCall(
                      `/api/work-orders/${id}/status`,
                      'PATCH',
                      { status },
                      'Státusz frissítve.'
                    );
                  }}
                  onIssueInvoice={async (
                    id: string,
                    paymentStatus: 'invoiced' | 'paid',
                    paymentMethod: string
                  ) => {
                    await apiCall(
                      `/api/work-orders/${id}/invoice`,
                      'POST',
                      { paymentStatus, paymentMethod },
                      'Számla rögzítve.'
                    );
                  }}
                  onDeleteWorkOrder={async (id: string) => {
                    await apiCall(`/api/work-orders/${id}`, 'DELETE', undefined, 'Munkalap törölve.');
                  }}
                  onPrintWorkOrder={(wo, docType = 'work_order') =>
                    setPrintTarget({ wo, docType })
                  }
                  onOpenCustomerPortal={(wo) => {
                    setPortalWorkOrderId(wo.id);
                    setActiveTab('customer-portal');
                  }}
                />
              )}

              {activeTab === 'customer-portal' && (
                <CustomerPortalView
                  data={data}
                  initialWorkOrderId={portalWorkOrderId}
                  onApproveQuote={async (workOrderId, approvedBy) => {
                    await apiCall(
                      `/api/work-orders/${workOrderId}/approve-quote`,
                      'POST',
                      { approvedBy },
                      'Árajánlat ügyfél által jóváhagyva!'
                    );
                  }}
                  onPrintWorkOrder={(wo, docType) => setPrintTarget({ wo, docType })}
                />
              )}

              {activeTab === 'tire-hotel' && (
                <TireHotelView
                  data={data}
                  onSaveTireSet={async (payload: Partial<TireSet>) => {
                    await apiCall(
                      '/api/tire-sets',
                      'POST',
                      payload,
                      'Kerékgarnitúra betárolva a Gumihotelbe.'
                    );
                  }}
                  onToggleTireSetStatus={async (id: string) => {
                    await apiCall(
                      `/api/tire-sets/${id}/toggle-status`,
                      'PATCH',
                      {},
                      'Kerékgarnitúra státusza módosítva.'
                    );
                  }}
                  onDeleteTireSet={async (id: string) => {
                    await apiCall(
                      `/api/tire-sets/${id}`,
                      'DELETE',
                      undefined,
                      'Kerékgarnitúra törölve.'
                    );
                  }}
                />
              )}

              {activeTab === 'vehicles' && (
                <VehiclesCustomersView
                  data={data}
                  onCreateCustomer={async (payload: Partial<Customer>) => {
                    await apiCall('/api/customers', 'POST', payload, 'Ügyfél rögzítve.');
                  }}
                  onDeleteCustomer={async (id: string) => {
                    await apiCall(`/api/customers/${id}`, 'DELETE', undefined, 'Ügyfél törölve.');
                  }}
                  onCreateVehicle={async (payload: Partial<Vehicle>) => {
                    await apiCall('/api/vehicles', 'POST', payload, 'Gépjármű rögzítve.');
                  }}
                  onDeleteVehicle={async (id: string) => {
                    await apiCall(`/api/vehicles/${id}`, 'DELETE', undefined, 'Jármű törölve.');
                  }}
                  onSelectWorkOrder={(wo) => {
                    setSelectedWorkOrder(wo);
                    setActiveTab('work-orders');
                  }}
                  onOpenServiceBook={(vehicleId) => {
                    setServiceBookVehicleId(vehicleId);
                    setActiveTab('service-book');
                  }}
                />
              )}

              {activeTab === 'service-book' && (
                <DigitalServiceBookView
                  data={data}
                  initialVehicleId={serviceBookVehicleId}
                  onCreateEntry={async (payload: Partial<ServiceBookEntry>) => {
                    await apiCall(
                      '/api/service-book',
                      'POST',
                      payload,
                      'Digitális szervizkönyv bejegyzés hitelesítve és rögzítve.'
                    );
                  }}
                  onDeleteEntry={async (id: string) => {
                    await apiCall(
                      `/api/service-book/${id}`,
                      'DELETE',
                      undefined,
                      'Szervizkönyv bejegyzés törölve.'
                    );
                  }}
                  onSelectWorkOrder={(wo) => {
                    setSelectedWorkOrder(wo);
                    setActiveTab('work-orders');
                  }}
                />
              )}

              {activeTab === 'appointments' && (
                <AppointmentsView
                  data={data}
                  onCreateAppointment={async (payload: Partial<Appointment>) => {
                    await apiCall(
                      '/api/appointments',
                      'POST',
                      payload,
                      'Előjegyzés rögzítve.'
                    );
                  }}
                  onConvertAppointment={async (id: string) => {
                    const res = await apiCall(
                      `/api/appointments/${id}/convert`,
                      'POST',
                      {},
                      'Munkalap megnyitva az előjegyzésből.'
                    );
                    if (res?.createdWorkOrderId) {
                      const created = res.workOrders.find(
                        (w: WorkOrder) => w.id === res.createdWorkOrderId
                      );
                      if (created) {
                        setSelectedWorkOrder(created);
                        setActiveTab('work-orders');
                      }
                    }
                  }}
                  onDeleteAppointment={async (id: string) => {
                    await apiCall(
                      `/api/appointments/${id}`,
                      'DELETE',
                      undefined,
                      'Előjegyzés törölve.'
                    );
                  }}
                  onSelectWorkOrder={(wo) => {
                    setSelectedWorkOrder(wo);
                    setActiveTab('work-orders');
                  }}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryView
                  data={data}
                  onCreateItem={async (payload: Partial<InventoryItem>) => {
                    await apiCall(
                      '/api/inventory',
                      'POST',
                      payload,
                      'Cikkszám felvéve.'
                    );
                  }}
                  onRestockItem={async (id: string, delta: number) => {
                    await apiCall(
                      `/api/inventory/${id}/restock`,
                      'POST',
                      { delta },
                      'Készlet módosítva.'
                    );
                  }}
                  onDeleteItem={async (id: string) => {
                    await apiCall(
                      `/api/inventory/${id}`,
                      'DELETE',
                      undefined,
                      'Cikkszám törölve.'
                    );
                  }}
                />
              )}

              {activeTab === 'billing' && (
                <BillingView
                  data={data}
                  onIssueInvoice={async (workOrderId, paymentStatus, paymentMethod) => {
                    await apiCall(
                      `/api/work-orders/${workOrderId}/invoice`,
                      'POST',
                      { paymentStatus, paymentMethod },
                      'Pénzügyi státusz frissítve.'
                    );
                  }}
                  onPrintDocument={(wo, docType) => setPrintTarget({ wo, docType })}
                  onSelectWorkOrder={(wo) => {
                    setSelectedWorkOrder(wo);
                    setActiveTab('work-orders');
                  }}
                />
              )}

              {activeTab === 'mechanics' && (
                <MechanicsView
                  data={data}
                  onCreateMechanic={async (payload: Partial<Mechanic>) => {
                    await apiCall(
                      '/api/mechanics',
                      'POST',
                      payload,
                      'Munkatárs rögzítve.'
                    );
                  }}
                  onSelectWorkOrder={(wo) => {
                    setSelectedWorkOrder(wo);
                    setActiveTab('work-orders');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Printable Document Modal */}
      {printTarget && (
        <PrintableDocumentModal
          workOrder={printTarget.wo}
          customer={data.customers.find((c) => c.id === printTarget.wo.customerId)}
          vehicle={data.vehicles.find((v) => v.id === printTarget.wo.vehicleId)}
          mechanic={data.mechanics.find((m) => m.id === printTarget.wo.mechanicId)}
          initialDocType={printTarget.docType}
          onClose={() => setPrintTarget(null)}
        />
      )}
    </div>
  );
}
export default App;

import initialDemoData from './initialDemoState.json';
import { AppData, DEFAULT_WHEEL_MEASUREMENTS } from './types';

const STORAGE_KEY = 'autotech_pro_dms_state_v2';

function cloneInitialState(): AppData {
  return JSON.parse(JSON.stringify(initialDemoData)) as AppData;
}

export function getStandaloneState(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.workOrders)) {
        return {
          ...cloneInitialState(),
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.warn('localStorage read failed:', e);
  }
  const fresh = cloneInitialState();
  saveStandaloneState(fresh);
  return fresh;
}

export function saveStandaloneState(state: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

export function handleStandaloneApi(
  url: string,
  method: string,
  body?: any
): AppData & { createdWorkOrderId?: string } {
  const m = method.toUpperCase();
  let state = getStandaloneState();

  if (url === '/api/bootstrap' && m === 'GET') {
    return state;
  }

  if (url === '/api/reset-demo' && m === 'POST') {
    state = cloneInitialState();
    saveStandaloneState(state);
    return state;
  }

  // CUSTOMERS
  if (url === '/api/customers' && m === 'POST') {
    const newCustomer = {
      id: 'cust-' + Date.now(),
      name: body.name || '',
      type: body.type || 'personal',
      taxNumber: body.taxNumber || '',
      phone: body.phone || '',
      email: body.email || '',
      address: body.address || '',
      discountPercent: Number(body.discountPercent) || 0,
      notes: body.notes || '',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    state.customers = [...state.customers, newCustomer];
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/customers/') && m === 'DELETE') {
    const id = url.split('/')[3];
    state.customers = state.customers.filter((c) => c.id !== id);
    state.vehicles = state.vehicles.filter((v) => v.customerId !== id);
    saveStandaloneState(state);
    return state;
  }

  // VEHICLES
  if (url === '/api/vehicles' && m === 'POST') {
    const newVehicle = {
      id: 'veh-' + Date.now(),
      customerId: body.customerId || state.customers[0]?.id || '',
      licensePlate: String(body.licensePlate || '').toUpperCase(),
      vin: String(body.vin || '').toUpperCase(),
      make: body.make || '',
      model: body.model || '',
      year: Number(body.year) || 2021,
      engineCode: body.engineCode || '',
      fuelType: body.fuelType || 'Benzin',
      displacementCc: Number(body.displacementCc) || 1968,
      powerKw: Number(body.powerKw) || 110,
      mileageKm: Number(body.mileageKm) || 0,
      motExpiry: body.motExpiry || '2027-06-30',
      color: body.color || '',
      notes: body.notes || '',
    };
    state.vehicles = [...state.vehicles, newVehicle];
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/vehicles/') && m === 'DELETE') {
    const id = url.split('/')[3];
    state.vehicles = state.vehicles.filter((v) => v.id !== id);
    saveStandaloneState(state);
    return state;
  }

  // MECHANICS
  if (url === '/api/mechanics' && m === 'POST') {
    const newMech = {
      id: 'mech-' + Date.now(),
      name: body.name || '',
      role: body.role || 'Autószerelő',
      specialty: body.specialty || '',
      hourlyRate: Number(body.hourlyRate) || 16000,
      bay: body.bay || '1. Csápos emelő',
      phone: body.phone || '',
      status: body.status || 'available',
      avatarColor: body.avatarColor || 'blue',
    };
    state.mechanics = [...state.mechanics, newMech];
    saveStandaloneState(state);
    return state;
  }

  // INVENTORY
  if (url === '/api/inventory' && m === 'POST') {
    const newItem = {
      id: 'inv-' + Date.now(),
      sku: String(body.sku || '').toUpperCase(),
      name: body.name || '',
      category: body.category || 'Egyéb',
      brand: body.brand || '',
      supplier: body.supplier || 'Bárdi Autó',
      buyPriceNet: Number(body.buyPriceNet) || 0,
      sellPriceNet: Number(body.sellPriceNet) || 0,
      vatRate: Number(body.vatRate) || 27,
      stock: Number(body.stock) || 0,
      minStock: Number(body.minStock) || 2,
      unit: body.unit || 'db',
      location: body.location || '',
    };
    state.inventory = [...state.inventory, newItem];
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/inventory/') && url.endsWith('/restock') && m === 'POST') {
    const id = url.split('/')[3];
    const delta = Number(body?.delta) || 1;
    state.inventory = state.inventory.map((item) =>
      item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item
    );
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/inventory/') && m === 'DELETE') {
    const id = url.split('/')[3];
    state.inventory = state.inventory.filter((i) => i.id !== id);
    saveStandaloneState(state);
    return state;
  }

  // WORK ORDERS
  if (url === '/api/work-orders' && m === 'POST') {
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const orderNumber = `ML-2026-${String(101 + state.workOrders.length).padStart(4, '0')}`;
    const newWo = {
      id: 'wo-' + Date.now(),
      orderNumber,
      customerId: body.customerId || '',
      vehicleId: body.vehicleId || '',
      mechanicId: body.mechanicId || '',
      bay: body.bay || '1. Csápos emelő',
      status: body.status || 'received',
      priority: body.priority || 'normal',
      createdAt: nowStr,
      estimatedCompletion: body.estimatedCompletion || nowStr,
      completedAt: '',
      mileageIn: Number(body.mileageIn) || 0,
      fuelLevel: Number(body.fuelLevel) || 50,
      customerComplaint: body.customerComplaint || '',
      diagnosis: body.diagnosis || '',
      inspection: body.inspection || {
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
      items: body.items || [],
      discountPercent: Number(body.discountPercent) || 0,
      invoiceNumber: '',
      paymentStatus: 'unbilled' as const,
      paymentMethod: body.paymentMethod || 'Bankkártya',
      quoteApproved: Boolean(body.quoteApproved),
      quoteApprovedAt: body.quoteApprovedAt || '',
      quoteApprovedBy: body.quoteApprovedBy || '',
    };
    state.workOrders = [newWo, ...state.workOrders];
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/work-orders/') && url.endsWith('/status') && m === 'PATCH') {
    const id = url.split('/')[3];
    const nextStatus = body?.status;
    state.workOrders = state.workOrders.map((wo) =>
      wo.id === id ? { ...wo, status: nextStatus } : wo
    );
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/work-orders/') && url.endsWith('/approve-quote') && m === 'POST') {
    const id = url.split('/')[3];
    const approvedBy = body?.approvedBy || 'Ügyfél (Online jóváhagyás)';
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    state.workOrders = state.workOrders.map((wo) => {
      if (wo.id !== id) return wo;
      const nextSt = wo.status === 'received' || wo.status === 'quoting' ? 'in_progress' : wo.status;
      return {
        ...wo,
        status: nextSt,
        quoteApproved: true,
        quoteApprovedAt: nowStr,
        quoteApprovedBy: approvedBy,
        inspection: {
          ...wo.inspection,
          quoteApproved: true,
          quoteApprovedAt: nowStr,
          quoteApprovedBy: approvedBy,
        },
      };
    });
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/work-orders/') && url.endsWith('/invoice') && m === 'POST') {
    const id = url.split('/')[3];
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const invCount = state.workOrders.filter((w) => w.invoiceNumber).length;
    state.workOrders = state.workOrders.map((wo) => {
      if (wo.id !== id) return wo;
      return {
        ...wo,
        status: body?.paymentStatus === 'paid' ? 'completed' : wo.status,
        completedAt: wo.completedAt || nowStr,
        invoiceNumber: wo.invoiceNumber || `SZ-2026-${String(891 + invCount).padStart(4, '0')}`,
        paymentStatus: body?.paymentStatus || 'paid',
        paymentMethod: body?.paymentMethod || wo.paymentMethod,
      };
    });
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/work-orders/') && m === 'PUT') {
    const id = url.split('/')[3];
    state.workOrders = state.workOrders.map((wo) =>
      wo.id === id ? { ...wo, ...body, id } : wo
    );
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/work-orders/') && m === 'DELETE') {
    const id = url.split('/')[3];
    state.workOrders = state.workOrders.filter((wo) => wo.id !== id);
    saveStandaloneState(state);
    return state;
  }

  // APPOINTMENTS
  if (url === '/api/appointments' && m === 'POST') {
    const newApt = {
      id: 'apt-' + Date.now(),
      customerId: body.customerId || '',
      vehicleId: body.vehicleId || '',
      mechanicId: body.mechanicId || '',
      bay: body.bay || '1. Csápos emelő',
      date: body.date || '2026-11-10',
      startTime: body.startTime || '09:00',
      endTime: body.endTime || '11:00',
      serviceType: body.serviceType || '',
      notes: body.notes || '',
      status: 'scheduled' as const,
      workOrderId: '',
    };
    state.appointments = [...state.appointments, newApt];
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/appointments/') && url.endsWith('/convert') && m === 'POST') {
    const id = url.split('/')[3];
    const apt = state.appointments.find((a) => a.id === id);
    if (!apt) return state;
    const veh = state.vehicles.find((v) => v.id === apt.vehicleId);
    const woId = 'wo-' + Date.now();
    const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const newWo = {
      id: woId,
      orderNumber: `ML-2026-${String(101 + state.workOrders.length).padStart(4, '0')}`,
      customerId: apt.customerId,
      vehicleId: apt.vehicleId,
      mechanicId: apt.mechanicId,
      bay: apt.bay,
      status: 'received' as const,
      priority: 'normal' as const,
      createdAt: nowStr,
      estimatedCompletion: `${apt.date} ${apt.endTime}`,
      completedAt: '',
      mileageIn: veh?.mileageKm || 100000,
      fuelLevel: 50,
      customerComplaint: `${apt.serviceType}${apt.notes ? ' — ' + apt.notes : ''}`,
      diagnosis: '',
      inspection: {
        brakes: 'ok' as const,
        suspension: 'ok' as const,
        engineOil: 'ok' as const,
        tires: 'ok' as const,
        battery: 'ok' as const,
        lights: 'ok' as const,
        bodyNotes: '',
        damageMarkers: [],
        wheelMeasurements: DEFAULT_WHEEL_MEASUREMENTS,
      },
      items: [],
      discountPercent: 0,
      invoiceNumber: '',
      paymentStatus: 'unbilled' as const,
      paymentMethod: 'Bankkártya',
    };
    state.workOrders = [newWo, ...state.workOrders];
    state.appointments = state.appointments.map((a) =>
      a.id === id ? { ...a, status: 'converted' as const, workOrderId: woId } : a
    );
    saveStandaloneState(state);
    return { ...state, createdWorkOrderId: woId };
  }

  if (url.startsWith('/api/appointments/') && m === 'DELETE') {
    const id = url.split('/')[3];
    state.appointments = state.appointments.filter((a) => a.id !== id);
    saveStandaloneState(state);
    return state;
  }

  // TIRE HOTEL
  if (url === '/api/tire-sets' && m === 'POST') {
    const newTireSet = {
      id: 'tire-' + Date.now(),
      storageCode: `GH-2026-${String((state.tireSets || []).length + 1).padStart(3, '0')}`,
      customerId: body.customerId || '',
      vehicleId: body.vehicleId || '',
      season: body.season || 'winter',
      brand: body.brand || '',
      model: body.model || '',
      size: body.size || '',
      dot: body.dot || '',
      rimType: body.rimType || 'alloy',
      treadFL: Number(body.treadFL) || 6.5,
      treadFR: Number(body.treadFR) || 6.5,
      treadRL: Number(body.treadRL) || 6.5,
      treadRR: Number(body.treadRR) || 6.5,
      location: body.location || 'GH-A1-01',
      status: body.status || 'stored',
      storedAt: new Date().toISOString().slice(0, 10),
      notes: body.notes || '',
    };
    state.tireSets = [...(state.tireSets || []), newTireSet];
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/tire-sets/') && url.endsWith('/toggle-status') && m === 'PATCH') {
    const id = url.split('/')[3];
    state.tireSets = (state.tireSets || []).map((t) =>
      t.id === id
        ? { ...t, status: t.status === 'stored' ? 'mounted' : 'stored' }
        : t
    );
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/tire-sets/') && m === 'DELETE') {
    const id = url.split('/')[3];
    state.tireSets = (state.tireSets || []).filter((t) => t.id !== id);
    saveStandaloneState(state);
    return state;
  }

  // DIGITAL SERVICE BOOK
  if (url === '/api/service-book' && m === 'POST') {
    const list = state.serviceBookEntries || [];
    const km = Number(body.mileageKm) || 0;
    const newEntry = {
      id: 'sb-' + Date.now(),
      certificateCode: `DSB-2026-${1001 + list.length}`,
      vehicleId: body.vehicleId || '',
      date: body.date || new Date().toISOString().slice(0, 10),
      mileageKm: km,
      workshopName: body.workshopName || 'AutoTech Pro Szerviz Kft.',
      mechanicName: body.mechanicName || 'Farkas Péter',
      serviceType: body.serviceType || 'Időszakos karbantartás',
      oilChanged: Boolean(body.oilChanged),
      airFilterChanged: Boolean(body.airFilterChanged),
      pollenFilterChanged: Boolean(body.pollenFilterChanged),
      fuelFilterChanged: Boolean(body.fuelFilterChanged),
      sparkPlugsChanged: Boolean(body.sparkPlugsChanged),
      brakeFluidChanged: Boolean(body.brakeFluidChanged),
      transmissionOilChanged: Boolean(body.transmissionOilChanged),
      timingBeltChanged: Boolean(body.timingBeltChanged),
      brakesServiced: Boolean(body.brakesServiced),
      bodyInspectionOk: Boolean(body.bodyInspectionOk),
      summary: body.summary || '',
      nextServiceKm: Number(body.nextServiceKm) || km + 15000,
      nextServiceDate: body.nextServiceDate || '',
      workOrderId: body.workOrderId || '',
    };
    state.serviceBookEntries = [newEntry, ...list];
    if (km > 0) {
      state.vehicles = state.vehicles.map((v) =>
        v.id === body.vehicleId ? { ...v, mileageKm: Math.max(v.mileageKm, km) } : v
      );
    }
    saveStandaloneState(state);
    return state;
  }

  if (url.startsWith('/api/service-book/') && m === 'DELETE') {
    const id = url.split('/')[3];
    state.serviceBookEntries = (state.serviceBookEntries || []).filter((e) => e.id !== id);
    saveStandaloneState(state);
    return state;
  }

  return state;
}

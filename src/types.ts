export type CustomerType = 'personal' | 'company';

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  taxNumber: string;
  phone: string;
  email: string;
  address: string;
  discountPercent: number;
  notes: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  licensePlate: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  engineCode: string;
  fuelType: string;
  displacementCc: number;
  powerKw: number;
  mileageKm: number;
  motExpiry: string;
  color: string;
  notes: string;
}

export interface Mechanic {
  id: string;
  name: string;
  role: string;
  specialty: string;
  hourlyRate: number;
  bay: string;
  phone: string;
  status: 'available' | 'busy' | 'off';
  avatarColor: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  supplier: string;
  buyPriceNet: number;
  sellPriceNet: number;
  vatRate: number;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
}

export type InspectionState = 'ok' | 'warn' | 'bad';

export type DamageType = 'scratch' | 'dent' | 'chip' | 'paint';

export interface DamageMarker {
  id: string;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  type: DamageType;
  note: string;
}

export interface WheelCornerMeasurement {
  treadMm: number;
  brakePct: number;
  pressureBar: number;
}

export interface WheelMeasurementsMap {
  fl: WheelCornerMeasurement;
  fr: WheelCornerMeasurement;
  rl: WheelCornerMeasurement;
  rr: WheelCornerMeasurement;
}

export interface VehicleInspection {
  brakes: InspectionState;
  suspension: InspectionState;
  engineOil: InspectionState;
  tires: InspectionState;
  battery: InspectionState;
  lights: InspectionState;
  bodyNotes: string;
  damageMarkers?: DamageMarker[];
  wheelMeasurements?: WheelMeasurementsMap;
  quoteApproved?: boolean;
  quoteApprovedAt?: string;
  quoteApprovedBy?: string;
}

export interface WorkOrderItem {
  id: string;
  type: 'part' | 'labor';
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  unitPriceNet: number;
  vatRate: number;
}

export type WorkOrderStatus =
  | 'received'
  | 'quoting'
  | 'waiting_parts'
  | 'in_progress'
  | 'testing'
  | 'ready'
  | 'completed';

export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export type PaymentStatus = 'unbilled' | 'quoted' | 'invoiced' | 'paid';

export interface WorkOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  vehicleId: string;
  mechanicId: string;
  bay: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  createdAt: string;
  estimatedCompletion: string;
  completedAt: string;
  mileageIn: number;
  fuelLevel: number;
  customerComplaint: string;
  diagnosis: string;
  inspection: VehicleInspection;
  items: WorkOrderItem[];
  discountPercent: number;
  invoiceNumber: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  vehicleId: string;
  mechanicId: string;
  bay: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  notes: string;
  status: 'scheduled' | 'arrived' | 'converted' | 'cancelled';
  workOrderId: string;
}

export interface TireSet {
  id: string;
  storageCode: string;
  customerId: string;
  vehicleId: string;
  season: 'winter' | 'summer' | 'allseason';
  brand: string;
  model: string;
  size: string;
  dot: string;
  rimType: 'alloy' | 'steel' | 'tire_only';
  treadFL: number;
  treadFR: number;
  treadRL: number;
  treadRR: number;
  location: string;
  status: 'stored' | 'mounted';
  storedAt: string;
  notes: string;
}

export interface ServiceBookEntry {
  id: string;
  certificateCode: string;
  vehicleId: string;
  date: string;
  mileageKm: number;
  workshopName: string;
  mechanicName: string;
  serviceType: string;
  oilChanged: boolean;
  airFilterChanged: boolean;
  pollenFilterChanged: boolean;
  fuelFilterChanged: boolean;
  sparkPlugsChanged: boolean;
  brakeFluidChanged: boolean;
  transmissionOilChanged: boolean;
  timingBeltChanged: boolean;
  brakesServiced: boolean;
  bodyInspectionOk: boolean;
  summary: string;
  nextServiceKm: number;
  nextServiceDate: string;
  workOrderId?: string;
}

export interface AppData {
  customers: Customer[];
  vehicles: Vehicle[];
  mechanics: Mechanic[];
  inventory: InventoryItem[];
  workOrders: WorkOrder[];
  appointments: Appointment[];
  tireSets: TireSet[];
  serviceBookEntries?: ServiceBookEntry[];
}

export const DAMAGE_TYPE_META: Record<
  DamageType,
  { label: string; short: string; colorClass: string; dotColor: string }
> = {
  scratch: {
    label: 'Karc / Horzsolás',
    short: 'K',
    colorClass: 'bg-amber-100 text-amber-900 border-amber-300',
    dotColor: '#D97706',
  },
  dent: {
    label: 'Horpadás / Deformáció',
    short: 'H',
    colorClass: 'bg-rose-100 text-rose-900 border-rose-300',
    dotColor: '#E11D48',
  },
  chip: {
    label: 'Kőfelverődés / Szélvédő',
    short: 'S',
    colorClass: 'bg-blue-100 text-blue-900 border-blue-300',
    dotColor: '#2563EB',
  },
  paint: {
    label: 'Fényezési / Korrózió hiba',
    short: 'F',
    colorClass: 'bg-violet-100 text-violet-900 border-violet-300',
    dotColor: '#7C3AED',
  },
};

export const WORK_ORDER_STATUS_META: Record<
  WorkOrderStatus,
  { label: string; badgeClass: string; dotClass: string; columnBorder: string; headerBg: string }
> = {
  received: {
    label: 'Felvétel alatt',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    dotClass: 'bg-slate-500',
    columnBorder: 'border-t-slate-500',
    headerBg: 'bg-slate-100/90',
  },
  quoting: {
    label: 'Árajánlatra vár',
    badgeClass: 'bg-violet-50 text-violet-900 border-violet-200',
    dotClass: 'bg-violet-600',
    columnBorder: 'border-t-violet-600',
    headerBg: 'bg-violet-50/80',
  },
  waiting_parts: {
    label: 'Alkatrészre vár',
    badgeClass: 'bg-amber-100/80 text-amber-900 border-amber-300',
    dotClass: 'bg-amber-600',
    columnBorder: 'border-t-amber-500',
    headerBg: 'bg-amber-50/80',
  },
  in_progress: {
    label: 'Műhelyben / Javítás',
    badgeClass: 'bg-blue-100/80 text-blue-900 border-blue-300',
    dotClass: 'bg-blue-600',
    columnBorder: 'border-t-blue-600',
    headerBg: 'bg-blue-50/80',
  },
  testing: {
    label: 'Próbaút / Ellenőrzés',
    badgeClass: 'bg-indigo-100/80 text-indigo-900 border-indigo-300',
    dotClass: 'bg-indigo-600',
    columnBorder: 'border-t-indigo-600',
    headerBg: 'bg-indigo-50/80',
  },
  ready: {
    label: 'Átadható',
    badgeClass: 'bg-emerald-100/80 text-emerald-900 border-emerald-300',
    dotClass: 'bg-emerald-600',
    columnBorder: 'border-t-emerald-600',
    headerBg: 'bg-emerald-50/80',
  },
  completed: {
    label: 'Lezárva',
    badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-300',
    dotClass: 'bg-zinc-400',
    columnBorder: 'border-t-zinc-400',
    headerBg: 'bg-zinc-100/80',
  },
};

export const PRIORITY_META: Record<
  WorkOrderPriority,
  { label: string; badgeClass: string }
> = {
  low: { label: 'Alacsony', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' },
  normal: { label: 'Normál', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' },
  high: { label: 'Kiemelt', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  urgent: { label: 'Sürgős', badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-semibold' },
};

export const WORKSHOP_BAYS = [
  '1. Csápos emelő',
  '2. Csápos emelő',
  '3. Négyoszlopos / Futóműpad',
  '4. Diagnosztika & Klíma',
  '5. Gumiszerviz & Gyorsszerviz',
];

export const DEFAULT_WHEEL_MEASUREMENTS: WheelMeasurementsMap = {
  fl: { treadMm: 6.2, brakePct: 75, pressureBar: 2.3 },
  fr: { treadMm: 6.2, brakePct: 75, pressureBar: 2.3 },
  rl: { treadMm: 6.5, brakePct: 80, pressureBar: 2.2 },
  rr: { treadMm: 6.5, brakePct: 80, pressureBar: 2.2 },
};

export function formatHuf(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

export function calculateWorkOrderTotals(order: Pick<WorkOrder, 'items' | 'discountPercent'>) {
  let partsNet = 0;
  let laborNet = 0;

  for (const item of order.items || []) {
    const lineNet = (Number(item.quantity) || 0) * (Number(item.unitPriceNet) || 0);
    if (item.type === 'part') {
      partsNet += lineNet;
    } else {
      laborNet += lineNet;
    }
  }

  const subtotalNet = partsNet + laborNet;
  const discountRate = Math.min(100, Math.max(0, Number(order.discountPercent) || 0)) / 100;
  const discountAmountNet = Math.round(subtotalNet * discountRate);
  const totalNet = Math.round(subtotalNet - discountAmountNet);
  const vatAmount = Math.round(totalNet * 0.27);
  const totalGross = totalNet + vatAmount;

  return {
    partsNet,
    laborNet,
    subtotalNet,
    discountAmountNet,
    totalNet,
    vatAmount,
    totalGross,
  };
}

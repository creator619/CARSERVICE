import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import {
  AppData,
  WorkOrder,
  calculateWorkOrderTotals,
  formatHuf,
  WORK_ORDER_STATUS_META,
} from '../types';

interface BillingViewProps {
  data: AppData;
  onIssueInvoice: (
    workOrderId: string,
    paymentStatus: 'quoted' | 'invoiced' | 'paid',
    paymentMethod: string
  ) => Promise<void>;
  onPrintDocument: (wo: WorkOrder, docType: 'work_order' | 'quote' | 'invoice') => void;
  onSelectWorkOrder: (wo: WorkOrder) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  data,
  onIssueInvoice,
  onPrintDocument,
  onSelectWorkOrder,
}) => {
  const [filterPayment, setFilterPayment] = useState<string>('all');

  const getCustomer = (id: string) => data.customers.find((c) => c.id === id);
  const getVehicle = (id: string) => data.vehicles.find((v) => v.id === id);

  let paidGross = 0;
  let invoicedPendingGross = 0;
  let unbilledWorkInProgressGross = 0;

  for (const wo of data.workOrders) {
    const t = calculateWorkOrderTotals(wo);
    if (wo.paymentStatus === 'paid') {
      paidGross += t.totalGross;
    } else if (wo.paymentStatus === 'invoiced') {
      invoicedPendingGross += t.totalGross;
    } else {
      unbilledWorkInProgressGross += t.totalGross;
    }
  }

  const filteredOrders = data.workOrders.filter(
    (wo) => filterPayment === 'all' || wo.paymentStatus === filterPayment
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
            Számlázás és pénzügyi elszámolás
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kiállított számlák, árajánlatok, ÁFA-összesítés és kiegyenlítések kezelése
          </p>
        </div>

        <div className="inline-flex rounded-md bg-zinc-200/70 p-0.5 border border-zinc-200 text-xs">
          {[
            { key: 'all', label: 'Összes' },
            { key: 'unbilled', label: 'Számlázatlan' },
            { key: 'quoted', label: 'Árajánlat' },
            { key: 'invoiced', label: 'Kiállítva' },
            { key: 'paid', label: 'Kiegyenlítve' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterPayment(tab.key)}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                filterPayment === tab.key
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="bg-white border border-slate-200/90 border-t-3 border-t-emerald-600 rounded-lg p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Kiegyenlített számlák (bruttó)</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatHuf(paidGross)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Pénztárba és bankszámlára beérkezett</p>
        </div>

        <div className="bg-white border border-slate-200/90 border-t-3 border-t-amber-500 rounded-lg p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Kiegyenlítésre váró számlák</span>
          <p className="text-xl font-bold text-amber-800 mt-1">
            {formatHuf(invoicedPendingGross)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Kiállított, átutalásra vagy fizetésre vár</p>
        </div>

        <div className="bg-white border border-slate-200/90 border-t-3 border-t-blue-600 rounded-lg p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Folyamatban lévő munkák állománya</span>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatHuf(unbilledWorkInProgressGross)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Nyitott munkalapok és árajánlatok</p>
        </div>
      </div>

      {/* Billing Table */}
      <div className="bg-white border border-zinc-200/90 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-4">Munkalap / Számlaszám</th>
                <th className="py-3 px-4">Ügyfél és jármű</th>
                <th className="py-3 px-4 text-right">Alkatrész nettó</th>
                <th className="py-3 px-4 text-right">Munkadíj nettó</th>
                <th className="py-3 px-4 text-right">Kedv.</th>
                <th className="py-3 px-4 text-right">ÁFA (27%)</th>
                <th className="py-3 px-4 text-right">Bruttó végösszeg</th>
                <th className="py-3 px-4 text-center">Státusz</th>
                <th className="py-3 px-4 text-right">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 tabular-nums">
              {filteredOrders.map((wo) => {
                const cust = getCustomer(wo.customerId);
                const veh = getVehicle(wo.vehicleId);
                const totals = calculateWorkOrderTotals(wo);

                return (
                  <tr key={wo.id} className="hover:bg-zinc-50/80 transition">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onSelectWorkOrder(wo)}
                        className="font-mono font-semibold text-zinc-900 hover:underline cursor-pointer"
                      >
                        {wo.orderNumber}
                      </button>
                      {wo.invoiceNumber ? (
                        <div className="font-mono text-[11px] text-zinc-600">
                          {wo.invoiceNumber}
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-400">—</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-900">{cust?.name}</div>
                      <div className="text-zinc-500">
                        <span className="font-mono text-zinc-700">{veh?.licensePlate}</span> —{' '}
                        {veh?.make} {veh?.model}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600">
                      {formatHuf(totals.partsNet)}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600">
                      {formatHuf(totals.laborNet)}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600">
                      {wo.discountPercent > 0 ? `-${wo.discountPercent}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600">
                      {formatHuf(totals.vatAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-zinc-900">
                      {formatHuf(totals.totalGross)}
                      <div className="text-[10px] font-normal text-zinc-500">
                        {wo.paymentMethod}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {wo.paymentStatus === 'paid' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-[11px]">
                          Kiegyenlítve
                        </span>
                      )}
                      {wo.paymentStatus === 'invoiced' && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-medium text-[11px]">
                          Számlázva
                        </span>
                      )}
                      {wo.paymentStatus === 'quoted' && (
                        <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-300 text-stone-700 font-medium text-[11px]">
                          Árajánlat
                        </span>
                      )}
                      {wo.paymentStatus === 'unbilled' && (
                        <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-600 text-[11px]">
                          {WORK_ORDER_STATUS_META[wo.status]?.label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {wo.paymentStatus !== 'invoiced' && wo.paymentStatus !== 'paid' && (
                          <button
                            onClick={() =>
                              onIssueInvoice(wo.id, 'invoiced', wo.paymentMethod || 'Bankkártya')
                            }
                            className="px-2.5 py-1 rounded bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-medium transition cursor-pointer"
                          >
                            Számla kiállítása
                          </button>
                        )}
                        {wo.paymentStatus !== 'paid' && (
                          <button
                            onClick={() =>
                              onIssueInvoice(wo.id, 'paid', wo.paymentMethod || 'Bankkártya')
                            }
                            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-medium transition cursor-pointer"
                          >
                            Fizetve
                          </button>
                        )}
                        <button
                          onClick={() => onPrintDocument(wo, 'invoice')}
                          className="p-1 rounded bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-600 transition cursor-pointer"
                          title="Számlakép nyomtatása"
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
    </div>
  );
};

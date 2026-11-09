import React, { useState } from 'react';
import {
  Printer,
  X,
} from 'lucide-react';
import {
  WorkOrder,
  Customer,
  Vehicle,
  Mechanic,
  calculateWorkOrderTotals,
  formatHuf,
  WORK_ORDER_STATUS_META,
  InspectionState,
} from '../types';

interface PrintableDocumentModalProps {
  workOrder: WorkOrder;
  customer?: Customer;
  vehicle?: Vehicle;
  mechanic?: Mechanic;
  initialDocType?: 'work_order' | 'quote' | 'invoice';
  onClose: () => void;
}

const INSPECTION_LABELS: Record<InspectionState, { text: string; color: string }> = {
  ok: { text: 'Megfelelő', color: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  warn: { text: 'Figyelendő', color: 'text-amber-800 bg-amber-50 border-amber-200' },
  bad: { text: 'Csere szükséges', color: 'text-red-800 bg-red-50 border-red-200' },
};

export const PrintableDocumentModal: React.FC<PrintableDocumentModalProps> = ({
  workOrder,
  customer,
  vehicle,
  mechanic,
  initialDocType = 'work_order',
  onClose,
}) => {
  const [docType, setDocType] = useState<'work_order' | 'quote' | 'invoice'>(initialDocType);
  const totals = calculateWorkOrderTotals(workOrder);

  const docTitle =
    docType === 'work_order'
      ? 'SZERVIZ MUNKALAP ÉS ÁLLAPOTFELMÉRŐ LAP'
      : docType === 'quote'
      ? 'SZERVIZ ÁRAJÁNLAT'
      : 'SZÁMLA / SZERVIZ ELSZÁMOLÁS';

  const docNumber =
    docType === 'invoice'
      ? workOrder.invoiceNumber || `DÍJBEKÉRŐ-${workOrder.orderNumber}`
      : workOrder.orderNumber;

  const renderInspectionPill = (state: InspectionState) => {
    const info = INSPECTION_LABELS[state || 'ok'];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${info.color}`}>
        {info.text}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white border border-zinc-300 rounded-lg max-w-4xl w-full overflow-hidden shadow-xl my-8">
        {/* Toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-zinc-100 border-b border-zinc-200">
          <div className="inline-flex rounded-md bg-zinc-200/80 p-0.5 border border-zinc-300 text-xs">
            <button
              onClick={() => setDocType('work_order')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                docType === 'work_order'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Munkalap
            </button>
            <button
              onClick={() => setDocType('quote')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                docType === 'quote'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Árajánlat
            </button>
            <button
              onClick={() => setDocType('invoice')}
              className={`px-3 py-1 rounded font-medium transition cursor-pointer ${
                docType === 'invoice'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Számlakép
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Nyomtatás / PDF mentés
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-zinc-200/60 text-zinc-500 transition cursor-pointer"
              title="Bezárás"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="bg-white text-zinc-900 p-8 md:p-10 max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start border-b border-zinc-900 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-zinc-900 flex items-center justify-center font-bold text-white text-xs">
                  AT
                </div>
                <h1 className="text-lg font-bold tracking-tight text-zinc-900">
                  AUTOTECH PRO SZERVIZ KFT.
                </h1>
              </div>
              <p className="text-xs text-zinc-600 mt-1">
                1116 Budapest, Kondorosi út 18. • Adószám: 25910482-2-43 • Cégjegyzékszám: 01-09-384910
              </p>
              <p className="text-xs text-zinc-600">
                Tel.: +36 1 550 8200 • E-mail: munkafelvetel@autotechpro.hu • Web: www.autotechpro.hu
              </p>
            </div>
            <div className="text-left md:text-right">
              <span className="inline-block px-2.5 py-0.5 rounded bg-zinc-900 text-white text-[11px] font-semibold tracking-wider uppercase">
                {docTitle}
              </span>
              <p className="text-base font-bold text-zinc-900 mt-1.5 font-mono">{docNumber}</p>
              <p className="text-xs text-zinc-500 tabular-nums">
                Kiállítva: {workOrder.createdAt} • {WORK_ORDER_STATUS_META[workOrder.status]?.label}
              </p>
            </div>
          </div>

          {/* Customer & Vehicle Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-zinc-200 text-xs">
            <div className="bg-zinc-50 p-4 rounded-md border border-zinc-200">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Megrendelő / Ügyfél adatai
              </h3>
              <p className="font-semibold text-sm text-zinc-900">{customer?.name || '—'}</p>
              {customer?.taxNumber && (
                <p className="text-zinc-600 mt-0.5">Adószám: {customer.taxNumber}</p>
              )}
              <p className="text-zinc-600 mt-1">Cím: {customer?.address || '—'}</p>
              <p className="text-zinc-600">Telefon: {customer?.phone || '—'}</p>
              <p className="text-zinc-600">E-mail: {customer?.email || '—'}</p>
            </div>

            <div className="bg-zinc-50 p-4 rounded-md border border-zinc-200">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Gépjármű műszaki adatai
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums">
                <div>
                  <span className="text-zinc-500">Rendszám:</span>{' '}
                  <span className="font-mono font-semibold text-zinc-900">{vehicle?.licensePlate || '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Gyártmány:</span>{' '}
                  <span className="font-medium text-zinc-900">
                    {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : '—'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-500">Alvázszám (VIN):</span>{' '}
                  <span className="font-mono font-medium text-zinc-800">{vehicle?.vin || '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Motorkód:</span>{' '}
                  <span className="font-medium text-zinc-800">
                    {vehicle?.engineCode || '—'} ({vehicle?.fuelType || '—'})
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Km-óra állás:</span>{' '}
                  <span className="font-semibold text-zinc-900">
                    {workOrder.mileageIn.toLocaleString('hu-HU')} km
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500">Üzemanyagszint:</span>{' '}
                  <span className="font-medium text-zinc-800">{workOrder.fuelLevel}%</span>
                </div>
                <div>
                  <span className="text-zinc-500">Szerelő:</span>{' '}
                  <span className="font-medium text-zinc-800">{mechanic?.name || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Complaint & Diagnosis */}
          <div className="py-5 border-b border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Ügyfél által jelzett hibajelenség / megrendelt munka
              </h4>
              <p className="text-zinc-800 bg-zinc-50 p-3 rounded border border-zinc-200">
                {workOrder.customerComplaint || 'Nincs megadva.'}
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Szerviz diagnosztika / szakvélemény
              </h4>
              <p className="text-zinc-800 bg-zinc-50 p-3 rounded border border-zinc-200">
                {workOrder.diagnosis || 'Átvizsgálás alatt.'}
              </p>
            </div>
          </div>

          {/* Vehicle Inspection Checklist */}
          {docType !== 'invoice' && (
            <div className="py-5 border-b border-zinc-200">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Állapotfelmérő ellenőrzőlista
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded border border-zinc-200">
                  <span className="text-zinc-700">Fékrendszer:</span>
                  {renderInspectionPill(workOrder.inspection?.brakes)}
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-zinc-200">
                  <span className="text-zinc-700">Futómű / Kormányzás:</span>
                  {renderInspectionPill(workOrder.inspection?.suspension)}
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-zinc-200">
                  <span className="text-zinc-700">Motor / Folyadékszintek:</span>
                  {renderInspectionPill(workOrder.inspection?.engineOil)}
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-zinc-200">
                  <span className="text-zinc-700">Gumiabroncsok:</span>
                  {renderInspectionPill(workOrder.inspection?.tires)}
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-zinc-200">
                  <span className="text-zinc-700">Akkumulátor / Töltés:</span>
                  {renderInspectionPill(workOrder.inspection?.battery)}
                </div>
                <div className="flex items-center justify-between p-2 rounded border border-zinc-200">
                  <span className="text-zinc-700">Világítás:</span>
                  {renderInspectionPill(workOrder.inspection?.lights)}
                </div>
              </div>
              {workOrder.inspection?.wheelMeasurements && (
                <div className="mt-3 pt-3 border-t border-zinc-200">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                    4-kerekes gumiabroncs profilmélység, fékbetét és nyomásmérés
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                    {[
                      { key: 'fl' as const, label: 'Bal első (BE)' },
                      { key: 'fr' as const, label: 'Jobb első (JE)' },
                      { key: 'rl' as const, label: 'Bal hátsó (BH)' },
                      { key: 'rr' as const, label: 'Jobb hátsó (JH)' },
                    ].map(({ key, label }) => {
                      const m = workOrder.inspection.wheelMeasurements?.[key];
                      if (!m) return null;
                      return (
                        <div key={key} className="p-2 rounded bg-zinc-50 border border-zinc-200">
                          <div className="font-sans font-semibold text-zinc-800 text-[11px]">{label}</div>
                          <div className="text-zinc-600 mt-0.5">
                            Profil: <strong>{m.treadMm} mm</strong> • Fék: <strong>{m.brakePct}%</strong> • {m.pressureBar} bar
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {(workOrder.inspection?.damageMarkers || []).length > 0 && (
                <div className="mt-2.5 text-xs text-zinc-700">
                  <strong>Rögzített karosszéria sérülések ({workOrder.inspection.damageMarkers!.length} db): </strong>
                  {workOrder.inspection.damageMarkers!.map((m, idx) => (
                    <span key={m.id}>
                      {idx > 0 ? '; ' : ''}#{idx + 1} {m.note}
                    </span>
                  ))}
                </div>
              )}
              {workOrder.inspection?.bodyNotes && (
                <p className="text-xs text-zinc-600 mt-2">
                  <strong>Karosszéria megjegyzés:</strong> {workOrder.inspection.bodyNotes}
                </p>
              )}
              {workOrder.quoteApproved && (
                <div className="mt-2.5 px-3 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium inline-block">
                  ✓ Árajánlat ügyfél által online jóváhagyva ({workOrder.quoteApprovedBy || customer?.name} • {workOrder.quoteApprovedAt})
                </div>
              )}
            </div>
          )}

          {/* Line Items Table */}
          <div className="py-5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Felhasznált alkatrészek és elvégzett munkafolyamatok
            </h4>
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-600 text-[11px] uppercase">
                  <th className="py-2 pr-2">Típus</th>
                  <th className="py-2 px-2">Cikkszám</th>
                  <th className="py-2 px-2">Megnevezés</th>
                  <th className="py-2 px-2 text-right">Menny.</th>
                  <th className="py-2 px-2 text-right">Nettó egységár</th>
                  <th className="py-2 px-2 text-right">Nettó összesen</th>
                  <th className="py-2 pl-2 text-right">Bruttó (27% ÁFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(workOrder.items || []).map((item) => {
                  const lineNet = item.quantity * item.unitPriceNet;
                  const lineGross = Math.round(lineNet * (1 + (item.vatRate || 27) / 100));
                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-2 text-zinc-600">
                        {item.type === 'part' ? 'Alkatrész' : 'Munkadíj'}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-zinc-600">{item.sku || '—'}</td>
                      <td className="py-2.5 px-2 font-medium text-zinc-900">{item.name}</td>
                      <td className="py-2.5 px-2 text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2.5 px-2 text-right">{formatHuf(item.unitPriceNet)}</td>
                      <td className="py-2.5 px-2 text-right">{formatHuf(lineNet)}</td>
                      <td className="py-2.5 pl-2 text-right font-semibold text-zinc-900">{formatHuf(lineGross)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Financial Summary */}
            <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-t border-zinc-900 pt-4">
              <div className="text-xs text-zinc-600 space-y-1 max-w-md">
                <p>
                  <strong>Fizetési mód:</strong> {workOrder.paymentMethod || 'Bankkártya'} •{' '}
                  <strong>Várható elkészülés:</strong> {workOrder.estimatedCompletion}
                </p>
                <p>
                  A beépített új alkatrészekre a gyártói előírásoknak megfelelően 12–24 hónap, az elvégzett
                  javítási munkára 6 hónap jótállást vállalunk.
                </p>
              </div>

              <div className="w-full md:w-80 space-y-1.5 text-xs bg-zinc-50 p-4 rounded-md border border-zinc-200 tabular-nums">
                <div className="flex justify-between text-zinc-600">
                  <span>Alkatrészek nettó:</span>
                  <span>{formatHuf(totals.partsNet)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Munkadíj nettó:</span>
                  <span>{formatHuf(totals.laborNet)}</span>
                </div>
                {workOrder.discountPercent > 0 && (
                  <div className="flex justify-between text-zinc-800 font-medium">
                    <span>Kedvezmény ({workOrder.discountPercent}%):</span>
                    <span>- {formatHuf(totals.discountAmountNet)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-zinc-900 pt-1 border-t border-zinc-200">
                  <span>Nettó végösszeg:</span>
                  <span>{formatHuf(totals.totalNet)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>ÁFA (27%):</span>
                  <span>{formatHuf(totals.vatAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-zinc-900 pt-2 border-t border-zinc-300">
                  <span>Fizetendő bruttó:</span>
                  <span>{formatHuf(totals.totalGross)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-12 mt-6 text-center text-xs text-zinc-600">
            <div>
              <div className="border-t border-zinc-400 pt-2 mx-8">
                Munkafelvétel / Szerviz képviselője ({mechanic?.name || 'AutoTech Pro'})
              </div>
            </div>
            <div>
              <div className="border-t border-zinc-400 pt-2 mx-8">
                Megrendelő / Ügyfél aláírása ({customer?.name || ''})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

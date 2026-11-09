import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { AppData, InventoryItem, formatHuf } from '../types';

interface InventoryViewProps {
  data: AppData;
  onCreateItem: (payload: Partial<InventoryItem>) => Promise<void>;
  onRestockItem: (id: string, delta: number) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  data,
  onCreateItem,
  onRestockItem,
  onDeleteItem,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  const [form, setForm] = useState({
    sku: '',
    name: '',
    category: 'Szűrők',
    brand: 'MANN-FILTER',
    supplier: 'Bárdi Autó',
    buyPriceNet: 4500,
    sellPriceNet: 7200,
    vatRate: 27,
    stock: 6,
    minStock: 3,
    unit: 'db',
    location: 'B1-05',
  });

  const categories = Array.from(new Set(data.inventory.map((i) => i.category)));

  const filteredItems = data.inventory.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (onlyLowStock && item.stock > item.minStock) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.sku.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.supplier.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q)
    );
  });

  const totalBuyValueNet = data.inventory.reduce(
    (acc, i) => acc + i.buyPriceNet * i.stock,
    0
  );
  const totalSellValueNet = data.inventory.reduce(
    (acc, i) => acc + i.sellPriceNet * i.stock,
    0
  );
  const lowStockCount = data.inventory.filter((i) => i.stock <= i.minStock).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
            Alkatrészraktár és készletnyilvántartás
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cikkszámok, beszállítói árak, polchelyek és automatikus munkalap-készletlevonás
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cikkszám, megnevezés, polc..."
              className="pl-8 pr-3 py-1.5 rounded-md bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-500 w-56"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-white border border-zinc-300 text-xs text-zinc-700 focus:outline-none focus:border-zinc-500"
          >
            <option value="all">Összes kategória</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-blue-700 hover:bg-blue-600 text-white font-medium text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Új cikkszám
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="bg-white border border-slate-200/90 border-t-3 border-t-blue-600 rounded-lg p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">
            Raktárkészlet beszerzési értéke (nettó)
          </span>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatHuf(totalBuyValueNet)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {data.inventory.length} aktív cikkszám
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 border-t-3 border-t-emerald-600 rounded-lg p-4 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">
            Raktárkészlet értékesítési értéke (nettó)
          </span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {formatHuf(totalSellValueNet)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Tervezett árréstömeg: {formatHuf(totalSellValueNet - totalBuyValueNet)}
          </p>
        </div>

        <div
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`border border-t-3 border-t-amber-500 rounded-lg p-4 cursor-pointer shadow-2xs transition ${
            onlyLowStock
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <span className="text-xs font-medium text-slate-500">
            Utánrendelendő tételek
          </span>
          <p className="text-xl font-bold text-amber-800 mt-1">{lowStockCount} cikkszám</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {onlyLowStock ? 'Szűrés aktív (kattints a feloldáshoz)' : 'Kattints a szűréshez'}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-zinc-200/90 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-4">Cikkszám / Polc</th>
                <th className="py-3 px-4">Megnevezés</th>
                <th className="py-3 px-4">Márka / Beszállító</th>
                <th className="py-3 px-4 text-right">Beszerzési nettó</th>
                <th className="py-3 px-4 text-right">Eladási nettó</th>
                <th className="py-3 px-4 text-right">Eladási bruttó</th>
                <th className="py-3 px-4 text-center">Készlet</th>
                <th className="py-3 px-4 text-right">Készletművelet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 tabular-nums">
              {filteredItems.map((item) => {
                const isLow = item.stock <= item.minStock;
                const marginPct =
                  item.buyPriceNet > 0
                    ? Math.round(((item.sellPriceNet - item.buyPriceNet) / item.buyPriceNet) * 100)
                    : 0;
                const grossPrice = Math.round(item.sellPriceNet * (1 + item.vatRate / 100));

                return (
                  <tr key={item.id} className="hover:bg-zinc-50/80 transition">
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-zinc-900">{item.sku}</span>
                      <div className="text-[11px] text-zinc-500">Polc: {item.location || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-900">{item.name}</div>
                      <span className="text-[11px] text-zinc-500">{item.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-800">{item.brand}</div>
                      <div className="text-zinc-500 text-[11px]">{item.supplier}</div>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-600">
                      {formatHuf(item.buyPriceNet)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-medium text-zinc-900">
                        {formatHuf(item.sellPriceNet)}
                      </div>
                      <div className="text-[10px] text-zinc-500">+{marginPct}% árrés</div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-zinc-900">
                      {formatHuf(grossPrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          isLow
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                        }`}
                      >
                        {item.stock} {item.unit}
                      </span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        min. {item.minStock}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onRestockItem(item.id, -1)}
                          className="px-2 py-1 rounded bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 font-medium cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => onRestockItem(item.id, 1)}
                          className="px-2 py-1 rounded bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 font-medium cursor-pointer"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => onRestockItem(item.id, 5)}
                          className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-white font-medium cursor-pointer"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1 rounded text-zinc-400 hover:text-red-700 cursor-pointer ml-1"
                          title="Cikkszám törlése"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* NEW ITEM MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-zinc-300 rounded-lg max-w-xl w-full overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">Új alkatrész cikkszám felvétele</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded hover:bg-zinc-200/60 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Cikkszám (SKU) *</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value.toUpperCase() }))}
                    placeholder="Pl. BRK-BOSCH-0986"
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Kategória</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  >
                    <option value="Olajok és folyadékok">Olajok és folyadékok</option>
                    <option value="Szűrők">Szűrők</option>
                    <option value="Fékrendszer">Fékrendszer</option>
                    <option value="Motor és vezérlés">Motor és vezérlés</option>
                    <option value="Futómű és kormányzás">Futómű és kormányzás</option>
                    <option value="Elektromosság">Elektromosság</option>
                    <option value="Klíma és hűtés">Klíma és hűtés</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 mb-1">Megnevezés *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Pl. Hátsó féktárcsa szett 300mm"
                  className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Gyártó / Márka</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Beszállító</label>
                  <select
                    value={form.supplier}
                    onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  >
                    <option value="Bárdi Autó">Bárdi Autó</option>
                    <option value="Unix Autó">Unix Autó</option>
                    <option value="Inter Cars">Inter Cars</option>
                    <option value="Szakál-Metál">Szakál-Metál</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Polchely</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Beszerzési ár (nettó Ft)</label>
                  <input
                    type="number"
                    value={form.buyPriceNet}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, buyPriceNet: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Eladási ár (nettó Ft)</label>
                  <input
                    type="number"
                    value={form.sellPriceNet}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, sellPriceNet: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-600 mb-1">Nyitókészlet</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, stock: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Minimum készlet</label>
                  <input
                    type="number"
                    value={form.minStock}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, minStock: Number(e.target.value) || 1 }))
                    }
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-1">Egység</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded bg-white border border-zinc-300 text-zinc-900"
                  />
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
                    if (!form.sku.trim() || !form.name.trim()) return;
                    await onCreateItem(form);
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

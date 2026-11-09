import React, { useState } from 'react';
import { Trash2, PlusCircle } from 'lucide-react';
import {
  DamageMarker,
  DamageType,
  DAMAGE_TYPE_META,
  WheelMeasurementsMap,
  WheelCornerMeasurement,
} from '../types';

interface CarWalkaroundWidgetProps {
  damageMarkers: DamageMarker[];
  wheelMeasurements: WheelMeasurementsMap;
  readOnly?: boolean;
  onChangeMarkers?: (markers: DamageMarker[]) => void;
  onChangeWheels?: (wheels: WheelMeasurementsMap) => void;
}

const DEFAULT_WHEELS: WheelMeasurementsMap = {
  fl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
  fr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
  rl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
  rr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
};

export const CarWalkaroundWidget: React.FC<CarWalkaroundWidgetProps> = ({
  damageMarkers = [],
  wheelMeasurements = DEFAULT_WHEELS,
  readOnly = false,
  onChangeMarkers,
  onChangeWheels,
}) => {
  const [selectedType, setSelectedType] = useState<DamageType>('scratch');
  const [pendingNote, setPendingNote] = useState<string>('');

  const wheels = {
    fl: wheelMeasurements?.fl || DEFAULT_WHEELS.fl,
    fr: wheelMeasurements?.fr || DEFAULT_WHEELS.fr,
    rl: wheelMeasurements?.rl || DEFAULT_WHEELS.rl,
    rr: wheelMeasurements?.rr || DEFAULT_WHEELS.rr,
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onChangeMarkers) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const defaultLabel = DAMAGE_TYPE_META[selectedType].label;
    const newMarker: DamageMarker = {
      id: 'dm-' + Date.now() + Math.random().toString(36).slice(2, 4),
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
      type: selectedType,
      note: pendingNote.trim() || `${defaultLabel} (${damageMarkers.length + 1}. pont)`,
    };

    onChangeMarkers([...damageMarkers, newMarker]);
    setPendingNote('');
  };

  const updateWheel = (
    corner: keyof WheelMeasurementsMap,
    field: keyof WheelCornerMeasurement,
    val: number
  ) => {
    if (readOnly || !onChangeWheels) return;
    onChangeWheels({
      ...wheels,
      [corner]: {
        ...wheels[corner],
        [field]: val,
      },
    });
  };

  const renderWheelBox = (
    corner: keyof WheelMeasurementsMap,
    title: string,
    code: string
  ) => {
    const w = wheels[corner];
    const treadLow = w.treadMm < 4.0;
    const brakeLow = w.brakePct < 30;

    return (
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-2xs">
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-800">{title}</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold">
            {code}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] tabular-nums">
          <div>
            <label className="text-slate-500 block text-[10px]">Profil (mm)</label>
            {readOnly ? (
              <span
                className={`font-semibold ${
                  treadLow ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {w.treadMm.toFixed(1)} mm
              </span>
            ) : (
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={w.treadMm}
                onChange={(e) =>
                  updateWheel(corner, 'treadMm', Number(e.target.value) || 0)
                }
                className={`w-full mt-0.5 px-1.5 py-1 rounded border text-xs font-semibold ${
                  treadLow
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            )}
          </div>

          <div>
            <label className="text-slate-500 block text-[10px]">Fékbetét (%)</label>
            {readOnly ? (
              <span
                className={`font-semibold ${
                  brakeLow ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {w.brakePct}%
              </span>
            ) : (
              <input
                type="number"
                step="5"
                min="5"
                max="100"
                value={w.brakePct}
                onChange={(e) =>
                  updateWheel(corner, 'brakePct', Number(e.target.value) || 0)
                }
                className={`w-full mt-0.5 px-1.5 py-1 rounded border text-xs font-semibold ${
                  brakeLow
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            )}
          </div>

          <div>
            <label className="text-slate-500 block text-[10px]">Nyomás (bar)</label>
            {readOnly ? (
              <span className="font-semibold text-slate-900">
                {w.pressureBar.toFixed(1)} bar
              </span>
            ) : (
              <input
                type="number"
                step="0.1"
                min="1.5"
                max="4.5"
                value={w.pressureBar}
                onChange={(e) =>
                  updateWheel(corner, 'pressureBar', Number(e.target.value) || 0)
                }
                className="w-full mt-0.5 px-1.5 py-1 rounded bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold"
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar for selecting damage type before clicking on car diagram */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-md border border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-600 font-medium mr-1">
              Sérülés típusa (kattints az ábrára a jelöléshez):
            </span>
            {(Object.keys(DAMAGE_TYPE_META) as DamageType[]).map((t) => {
              const meta = DAMAGE_TYPE_META[t];
              const active = selectedType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: meta.dotColor }}
                  />
                  {meta.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <input
              type="text"
              value={pendingNote}
              onChange={(e) => setPendingNote(e.target.value)}
              placeholder="Sérülés leírása (opcionális kattintás előtt)..."
              className="w-full px-2.5 py-1 rounded bg-slate-50 border border-slate-300 text-xs text-slate-900"
            />
          </div>
        </div>
      )}

      {/* Main Walkaround Layout: Left Wheels | Center Top-Down Car Blueprint | Right Wheels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left Side Wheels (FL & RL) */}
        <div className="lg:col-span-3 space-y-3">
          {renderWheelBox('fl', 'Bal első kerék', 'BE / FL')}
          {renderWheelBox('rl', 'Bal hátsó kerék', 'BH / RL')}
        </div>

        {/* Center Top-Down Car Blueprint SVG */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md p-3 flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 px-2">
            <span>← ELEJE (FRONT)</span>
            <span>FELÜLNÉZETI KAROSSZÉRIA TÉRKÉP</span>
            <span>HÁTULJA (REAR) →</span>
          </div>

          <div className="relative w-full max-w-[460px] aspect-[2/1] select-none">
            <svg
              viewBox="0 0 400 200"
              onClick={handleSvgClick}
              className={`w-full h-full ${
                readOnly ? '' : 'cursor-crosshair'
              }`}
            >
              {/* Technical Grid Background */}
              <defs>
                <pattern
                  id="blueprintGrid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="400" height="200" rx="8" fill="url(#blueprintGrid)" />

              {/* Four Tires Silhouette */}
              <rect x="72" y="18" width="52" height="16" rx="4" fill="#334155" />
              <rect x="72" y="166" width="52" height="16" rx="4" fill="#334155" />
              <rect x="272" y="18" width="52" height="16" rx="4" fill="#334155" />
              <rect x="272" y="166" width="52" height="16" rx="4" fill="#334155" />

              {/* Outer Car Body Contour */}
              <path
                d="M 32 65
                   Q 24 100 32 135
                   Q 42 162 80 164
                   L 325 164
                   Q 362 162 370 135
                   Q 376 100 370 65
                   Q 362 38 325 36
                   L 80 36
                   Q 42 38 32 65 Z"
                fill="#F8FAFC"
                stroke="#475569"
                strokeWidth="2"
              />

              {/* Front Hood Lines */}
              <path
                d="M 42 56 L 122 46 M 42 144 L 122 154"
                stroke="#94A3B8"
                strokeWidth="1.2"
              />

              {/* Windshield (Front) */}
              <path
                d="M 122 46 L 158 54 L 158 146 L 122 154 Q 112 100 122 46 Z"
                fill="#E2E8F0"
                stroke="#64748B"
                strokeWidth="1.5"
              />

              {/* Cabin Roof */}
              <rect
                x="158"
                y="54"
                width="108"
                height="92"
                rx="6"
                fill="#FFFFFF"
                stroke="#64748B"
                strokeWidth="1.5"
              />

              {/* Rear Window */}
              <path
                d="M 266 54 L 304 48 Q 312 100 304 152 L 266 146 Z"
                fill="#E2E8F0"
                stroke="#64748B"
                strokeWidth="1.5"
              />

              {/* Side Mirrors */}
              <path
                d="M 134 36 L 128 22 L 144 24 L 144 36 Z"
                fill="#CBD5E1"
                stroke="#475569"
                strokeWidth="1.2"
              />
              <path
                d="M 134 164 L 128 178 L 144 176 L 144 164 Z"
                fill="#CBD5E1"
                stroke="#475569"
                strokeWidth="1.2"
              />

              {/* Door Pillar Dividers */}
              <line x1="212" y1="36" x2="212" y2="54" stroke="#94A3B8" strokeWidth="1.2" />
              <line x1="212" y1="146" x2="212" y2="164" stroke="#94A3B8" strokeWidth="1.2" />

              {/* Headlights & Taillights */}
              <path d="M 33 56 Q 38 44 52 41" fill="none" stroke="#0284C7" strokeWidth="3" />
              <path d="M 33 144 Q 38 156 52 159" fill="none" stroke="#0284C7" strokeWidth="3" />
              <path d="M 366 52 Q 371 64 371 76" fill="none" stroke="#E11D48" strokeWidth="3" />
              <path d="M 366 148 Q 371 136 371 124" fill="none" stroke="#E11D48" strokeWidth="3" />

              {/* Orientation Labels */}
              <text x="200" y="13" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="600">
                BAL OLDAL (VEZETŐ OLDAL)
              </text>
              <text x="200" y="195" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="600">
                JOBB OLDAL (UTAS OLDAL)
              </text>

              {/* Damage Markers Pins */}
              {damageMarkers.map((m, idx) => {
                const cx = (m.x / 100) * 400;
                const cy = (m.y / 100) * 200;
                const meta = DAMAGE_TYPE_META[m.type || 'scratch'];
                return (
                  <g key={m.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="10"
                      fill={meta.dotColor}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={cx}
                      y={cy + 3.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {!readOnly && (
            <p className="text-[11px] text-slate-400 mt-1">
              Kattints a karosszéria bármely pontjára új sérülés-jelölő elhelyezéséhez.
            </p>
          )}
        </div>

        {/* Right Side Wheels (FR & RR) */}
        <div className="lg:col-span-3 space-y-3">
          {renderWheelBox('fr', 'Jobb első kerék', 'JE / FR')}
          {renderWheelBox('rr', 'Jobb hátsó kerék', 'JH / RR')}
        </div>
      </div>

      {/* Recorded Damage Markers List */}
      {damageMarkers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-3">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Rögzített karosszéria- és külső sérülési pontok ({damageMarkers.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {damageMarkers.map((m, idx) => {
              const meta = DAMAGE_TYPE_META[m.type || 'scratch'];
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: meta.dotColor }}
                    >
                      {idx + 1}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border shrink-0 ${meta.colorClass}`}>
                      {meta.label}
                    </span>
                    {readOnly ? (
                      <span className="text-slate-800 truncate">{m.note}</span>
                    ) : (
                      <input
                        type="text"
                        value={m.note}
                        onChange={(e) => {
                          if (!onChangeMarkers) return;
                          const copy = [...damageMarkers];
                          copy[idx] = { ...copy[idx], note: e.target.value };
                          onChangeMarkers(copy);
                        }}
                        className="flex-1 min-w-0 bg-white px-2 py-0.5 rounded border border-slate-300 text-xs text-slate-900"
                      />
                    )}
                  </div>
                  {!readOnly && onChangeMarkers && (
                    <button
                      type="button"
                      onClick={() =>
                        onChangeMarkers(damageMarkers.filter((_, i) => i !== idx))
                      }
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Jelölés törlése"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

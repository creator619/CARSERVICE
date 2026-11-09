import express from 'express';
import { createServer as createViteServer } from 'vite';
import { db, initDb, seedDatabase } from './db.mjs';

initDb();

function serializeWorkOrder(row) {
  if (!row) return null;
  let inspection = {
    brakes: 'ok',
    suspension: 'ok',
    engineOil: 'ok',
    tires: 'ok',
    battery: 'ok',
    lights: 'ok',
    bodyNotes: '',
    damageMarkers: [],
    wheelMeasurements: {
      fl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
      fr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
      rl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
      rr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
    },
    quoteApproved: false,
    quoteApprovedAt: '',
    quoteApprovedBy: '',
  };
  let items = [];
  try {
    const parsed = JSON.parse(row.inspectionJson || '{}');
    inspection = { ...inspection, ...parsed };
  } catch {}
  try {
    items = JSON.parse(row.itemsJson || '[]');
  } catch {}

  const { inspectionJson, itemsJson, ...rest } = row;
  return {
    ...rest,
    inspection,
    items,
  };
}

function getAllState() {
  const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
  const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY licensePlate ASC').all();
  const mechanics = db.prepare('SELECT * FROM mechanics ORDER BY name ASC').all();
  const inventory = db.prepare('SELECT * FROM inventory ORDER BY category ASC, name ASC').all();
  const workOrdersRaw = db.prepare('SELECT * FROM work_orders ORDER BY createdAt DESC').all();
  const workOrders = workOrdersRaw.map(serializeWorkOrder);
  const appointments = db.prepare('SELECT * FROM appointments ORDER BY date ASC, startTime ASC').all();
  const tireSets = db.prepare('SELECT * FROM tire_sets ORDER BY storageCode ASC').all();
  const serviceBookRaw = db
    .prepare('SELECT * FROM service_book_entries ORDER BY date DESC, mileageKm DESC')
    .all();
  const serviceBookEntries = serviceBookRaw.map((r) => ({
    ...r,
    oilChanged: Boolean(r.oilChanged),
    airFilterChanged: Boolean(r.airFilterChanged),
    pollenFilterChanged: Boolean(r.pollenFilterChanged),
    fuelFilterChanged: Boolean(r.fuelFilterChanged),
    sparkPlugsChanged: Boolean(r.sparkPlugsChanged),
    brakeFluidChanged: Boolean(r.brakeFluidChanged),
    transmissionOilChanged: Boolean(r.transmissionOilChanged),
    timingBeltChanged: Boolean(r.timingBeltChanged),
    brakesServiced: Boolean(r.brakesServiced),
    bodyInspectionOk: Boolean(r.bodyInspectionOk),
  }));

  return {
    customers,
    vehicles,
    mechanics,
    inventory,
    workOrders,
    appointments,
    tireSets,
    serviceBookEntries,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/bootstrap', (_req, res) => {
    try {
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.post('/api/reset-demo', (_req, res) => {
    try {
      seedDatabase();
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // CUSTOMERS
  app.post('/api/customers', (req, res) => {
    try {
      const { name, type = 'personal', taxNumber = '', phone, email = '', address = '', discountPercent = 0, notes = '' } = req.body;
      const id = 'cust-' + Date.now();
      const createdAt = new Date().toISOString().slice(0, 10);
      db.prepare(`
        INSERT INTO customers (id, name, type, taxNumber, phone, email, address, discountPercent, notes, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, type, taxNumber, phone, email, address, Number(discountPercent) || 0, notes, createdAt);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.put('/api/customers/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, taxNumber, phone, email, address, discountPercent, notes } = req.body;
      db.prepare(`
        UPDATE customers
        SET name = ?, type = ?, taxNumber = ?, phone = ?, email = ?, address = ?, discountPercent = ?, notes = ?
        WHERE id = ?
      `).run(name, type, taxNumber || '', phone, email || '', address || '', Number(discountPercent) || 0, notes || '', id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.delete('/api/customers/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM tire_sets WHERE customerId = ?').run(id);
      db.prepare('DELETE FROM appointments WHERE customerId = ?').run(id);
      db.prepare('DELETE FROM work_orders WHERE customerId = ?').run(id);
      db.prepare('DELETE FROM vehicles WHERE customerId = ?').run(id);
      db.prepare('DELETE FROM customers WHERE id = ?').run(id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // VEHICLES
  app.post('/api/vehicles', (req, res) => {
    try {
      const {
        customerId, licensePlate, vin, make, model, year,
        engineCode = '', fuelType = 'Benzin', displacementCc = 0, powerKw = 0,
        mileageKm = 0, motExpiry, color = '', notes = ''
      } = req.body;
      const id = 'veh-' + Date.now();
      db.prepare(`
        INSERT INTO vehicles (id, customerId, licensePlate, vin, make, model, year, engineCode, fuelType, displacementCc, powerKw, mileageKm, motExpiry, color, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, customerId, String(licensePlate).toUpperCase(), String(vin).toUpperCase(),
        make, model, Number(year) || 2020, engineCode, fuelType,
        Number(displacementCc) || 0, Number(powerKw) || 0, Number(mileageKm) || 0,
        motExpiry || '2027-01-01', color, notes
      );
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.put('/api/vehicles/:id', (req, res) => {
    try {
      const { id } = req.params;
      const {
        customerId, licensePlate, vin, make, model, year,
        engineCode = '', fuelType = 'Benzin', displacementCc = 0, powerKw = 0,
        mileageKm = 0, motExpiry, color = '', notes = ''
      } = req.body;
      db.prepare(`
        UPDATE vehicles
        SET customerId = ?, licensePlate = ?, vin = ?, make = ?, model = ?, year = ?,
            engineCode = ?, fuelType = ?, displacementCc = ?, powerKw = ?, mileageKm = ?, motExpiry = ?, color = ?, notes = ?
        WHERE id = ?
      `).run(
        customerId, String(licensePlate).toUpperCase(), String(vin).toUpperCase(),
        make, model, Number(year) || 2020, engineCode, fuelType,
        Number(displacementCc) || 0, Number(powerKw) || 0, Number(mileageKm) || 0,
        motExpiry, color, notes, id
      );
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.delete('/api/vehicles/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM tire_sets WHERE vehicleId = ?').run(id);
      db.prepare('DELETE FROM appointments WHERE vehicleId = ?').run(id);
      db.prepare('DELETE FROM work_orders WHERE vehicleId = ?').run(id);
      db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // MECHANICS
  app.post('/api/mechanics', (req, res) => {
    try {
      const { name, role, specialty, hourlyRate = 16000, bay, phone = '', status = 'available', avatarColor = 'amber' } = req.body;
      const id = 'mech-' + Date.now();
      db.prepare(`
        INSERT INTO mechanics (id, name, role, specialty, hourlyRate, bay, phone, status, avatarColor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, role, specialty, Number(hourlyRate) || 16000, bay, phone, status, avatarColor);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // INVENTORY
  app.post('/api/inventory', (req, res) => {
    try {
      const {
        sku, name, category, brand, supplier,
        buyPriceNet, sellPriceNet, vatRate = 27, stock = 0, minStock = 3, unit = 'db', location = ''
      } = req.body;
      const id = 'inv-' + Date.now();
      db.prepare(`
        INSERT INTO inventory (id, sku, name, category, brand, supplier, buyPriceNet, sellPriceNet, vatRate, stock, minStock, unit, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, String(sku).toUpperCase(), name, category, brand, supplier,
        Number(buyPriceNet) || 0, Number(sellPriceNet) || 0, Number(vatRate) || 27,
        Number(stock) || 0, Number(minStock) || 2, unit, location
      );
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.post('/api/inventory/:id/restock', (req, res) => {
    try {
      const { id } = req.params;
      const { delta = 1 } = req.body;
      db.prepare('UPDATE inventory SET stock = MAX(0, stock + ?) WHERE id = ?').run(Number(delta) || 0, id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.delete('/api/inventory/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // WORK ORDERS
  app.post('/api/work-orders', (req, res) => {
    try {
      const {
        customerId, vehicleId, mechanicId, bay, status = 'received', priority = 'normal',
        estimatedCompletion, mileageIn, fuelLevel = 50,
        customerComplaint, diagnosis = '', inspection, items = [],
        discountPercent = 0, paymentMethod = 'Bankkártya', deductInventory = true
      } = req.body;

      const id = 'wo-' + Date.now();
      const countRow = db.prepare('SELECT COUNT(*) as c FROM work_orders').get();
      const orderNumber = `ML-2026-${String(101 + countRow.c).padStart(4, '0')}`;
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');

      const defaultInspection = inspection || {
        brakes: 'ok',
        suspension: 'ok',
        engineOil: 'ok',
        tires: 'ok',
        battery: 'ok',
        lights: 'ok',
        bodyNotes: '',
        damageMarkers: [],
        wheelMeasurements: {
          fl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
          fr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
          rl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
          rr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
        },
        quoteApproved: false,
        quoteApprovedAt: '',
        quoteApprovedBy: '',
      };

      db.prepare(`
        INSERT INTO work_orders (
          id, orderNumber, customerId, vehicleId, mechanicId, bay, status, priority,
          createdAt, estimatedCompletion, completedAt, mileageIn, fuelLevel,
          customerComplaint, diagnosis, inspectionJson, itemsJson,
          discountPercent, invoiceNumber, paymentStatus, paymentMethod
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, orderNumber, customerId, vehicleId, mechanicId, bay, status, priority,
        nowStr, estimatedCompletion || nowStr, '', Number(mileageIn) || 0, Number(fuelLevel) || 50,
        customerComplaint, diagnosis, JSON.stringify(defaultInspection), JSON.stringify(items),
        Number(discountPercent) || 0, '', 'unbilled', paymentMethod
      );

      if (mileageIn) {
        db.prepare('UPDATE vehicles SET mileageKm = MAX(mileageKm, ?) WHERE id = ?').run(Number(mileageIn), vehicleId);
      }

      if (deductInventory && Array.isArray(items)) {
        for (const item of items) {
          if (item.type === 'part' && item.sku) {
            db.prepare('UPDATE inventory SET stock = MAX(0, stock - ?) WHERE sku = ?').run(Number(item.quantity) || 1, item.sku);
          }
        }
      }

      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.put('/api/work-orders/:id', (req, res) => {
    try {
      const { id } = req.params;
      const existingRaw = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id);
      const existing = serializeWorkOrder(existingRaw);

      const {
        customerId, vehicleId, mechanicId, bay, status, priority,
        estimatedCompletion, mileageIn, fuelLevel,
        customerComplaint, diagnosis, inspection, items,
        discountPercent, invoiceNumber, paymentStatus, paymentMethod
      } = req.body;

      if (existing && Array.isArray(items)) {
        const oldPartsMap = new Map();
        for (const it of existing.items || []) {
          if (it.type === 'part' && it.sku) {
            oldPartsMap.set(it.sku, (oldPartsMap.get(it.sku) || 0) + Number(it.quantity || 0));
          }
        }
        const newPartsMap = new Map();
        for (const it of items) {
          if (it.type === 'part' && it.sku) {
            newPartsMap.set(it.sku, (newPartsMap.get(it.sku) || 0) + Number(it.quantity || 0));
          }
        }
        const allSkus = new Set([...oldPartsMap.keys(), ...newPartsMap.keys()]);
        for (const sku of allSkus) {
          const diff = (newPartsMap.get(sku) || 0) - (oldPartsMap.get(sku) || 0);
          if (diff !== 0) {
            db.prepare('UPDATE inventory SET stock = MAX(0, stock - ?) WHERE sku = ?').run(diff, sku);
          }
        }
      }

      const completedAt = (status === 'ready' || status === 'completed') && !existingRaw?.completedAt
        ? new Date().toISOString().slice(0, 16).replace('T', ' ')
        : (existingRaw?.completedAt || '');

      db.prepare(`
        UPDATE work_orders
        SET customerId = ?, vehicleId = ?, mechanicId = ?, bay = ?, status = ?, priority = ?,
            estimatedCompletion = ?, completedAt = ?, mileageIn = ?, fuelLevel = ?,
            customerComplaint = ?, diagnosis = ?, inspectionJson = ?, itemsJson = ?,
            discountPercent = ?, invoiceNumber = ?, paymentStatus = ?, paymentMethod = ?
        WHERE id = ?
      `).run(
        customerId, vehicleId, mechanicId, bay, status, priority,
        estimatedCompletion, completedAt, Number(mileageIn) || 0, Number(fuelLevel) || 50,
        customerComplaint, diagnosis || '', JSON.stringify(inspection || {}), JSON.stringify(items || []),
        Number(discountPercent) || 0, invoiceNumber ?? existingRaw?.invoiceNumber ?? '',
        paymentStatus ?? existingRaw?.paymentStatus ?? 'unbilled',
        paymentMethod ?? existingRaw?.paymentMethod ?? 'Bankkártya',
        id
      );

      if (mileageIn) {
        db.prepare('UPDATE vehicles SET mileageKm = MAX(mileageKm, ?) WHERE id = ?').run(Number(mileageIn), vehicleId);
      }

      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.patch('/api/work-orders/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const existing = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id);
      const completedAt = (status === 'ready' || status === 'completed') && !existing?.completedAt
        ? new Date().toISOString().slice(0, 16).replace('T', ' ')
        : (existing?.completedAt || '');
      db.prepare('UPDATE work_orders SET status = ?, completedAt = ? WHERE id = ?').run(status, completedAt, id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // Customer Portal Online Quote Approval
  app.post('/api/work-orders/:id/approve-quote', (req, res) => {
    try {
      const { id } = req.params;
      const { approvedBy = 'Ügyfél (Online jóváhagyás)' } = req.body;
      const existingRaw = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id);
      const existing = serializeWorkOrder(existingRaw);
      if (!existing) return res.status(404).json({ error: 'Munkalap nem található' });

      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const updatedInspection = {
        ...existing.inspection,
        quoteApproved: true,
        quoteApprovedAt: nowStr,
        quoteApprovedBy: approvedBy,
      };
      const nextStatus =
        existing.status === 'received' || existing.status === 'quoting'
          ? 'in_progress'
          : existing.status;

      db.prepare(`
        UPDATE work_orders
        SET inspectionJson = ?, status = ?
        WHERE id = ?
      `).run(JSON.stringify(updatedInspection), nextStatus, id);

      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.post('/api/work-orders/:id/invoice', (req, res) => {
    try {
      const { id } = req.params;
      const { paymentStatus = 'invoiced', paymentMethod = 'Bankkártya' } = req.body;
      const existing = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id);
      let invoiceNumber = existing?.invoiceNumber || '';
      if (!invoiceNumber && (paymentStatus === 'invoiced' || paymentStatus === 'paid')) {
        const invCount = db.prepare("SELECT COUNT(*) as c FROM work_orders WHERE invoiceNumber != ''").get();
        invoiceNumber = `SZ-2026-${String(890 + invCount.c + 1).padStart(4, '0')}`;
      }
      const nextStatus = paymentStatus === 'paid' ? 'completed' : existing?.status;
      db.prepare(`
        UPDATE work_orders
        SET invoiceNumber = ?, paymentStatus = ?, paymentMethod = ?, status = ?
        WHERE id = ?
      `).run(invoiceNumber, paymentStatus, paymentMethod, nextStatus, id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.delete('/api/work-orders/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM work_orders WHERE id = ?').run(id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // APPOINTMENTS
  app.post('/api/appointments', (req, res) => {
    try {
      const {
        customerId, vehicleId, mechanicId, bay, date, startTime, endTime,
        serviceType, notes = '', status = 'scheduled'
      } = req.body;
      const id = 'apt-' + Date.now();
      db.prepare(`
        INSERT INTO appointments (id, customerId, vehicleId, mechanicId, bay, date, startTime, endTime, serviceType, notes, status, workOrderId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')
      `).run(id, customerId, vehicleId, mechanicId, bay, date, startTime, endTime, serviceType, notes, status);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.post('/api/appointments/:id/convert', (req, res) => {
    try {
      const { id } = req.params;
      const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
      if (!apt) return res.status(404).json({ error: 'Időpont nem található' });

      const veh = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(apt.vehicleId);
      const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(apt.customerId);
      const mech = db.prepare('SELECT * FROM mechanics WHERE id = ?').get(apt.mechanicId);

      const woId = 'wo-' + Date.now();
      const countRow = db.prepare('SELECT COUNT(*) as c FROM work_orders').get();
      const orderNumber = `ML-2026-${String(101 + countRow.c).padStart(4, '0')}`;
      const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const estStr = `${apt.date} ${apt.endTime}`;

      const defaultInspection = {
        brakes: 'ok',
        suspension: 'ok',
        engineOil: 'ok',
        tires: 'ok',
        battery: 'ok',
        lights: 'ok',
        bodyNotes: '',
        damageMarkers: [],
        wheelMeasurements: {
          fl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
          fr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
          rl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
          rr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.4 },
        },
        quoteApproved: false,
        quoteApprovedAt: '',
        quoteApprovedBy: '',
      };

      const defaultItems = [
        {
          id: 'item-' + Date.now(),
          type: 'labor',
          sku: 'LAB-CHECK',
          name: `${apt.serviceType} – munkadíj`,
          quantity: 1.5,
          unit: 'óra',
          unitPriceNet: mech?.hourlyRate || 16000,
          vatRate: 27
        }
      ];

      db.prepare(`
        INSERT INTO work_orders (
          id, orderNumber, customerId, vehicleId, mechanicId, bay, status, priority,
          createdAt, estimatedCompletion, completedAt, mileageIn, fuelLevel,
          customerComplaint, diagnosis, inspectionJson, itemsJson,
          discountPercent, invoiceNumber, paymentStatus, paymentMethod
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        woId, orderNumber, apt.customerId, apt.vehicleId, apt.mechanicId, apt.bay, 'received', 'normal',
        nowStr, estStr, '', veh?.mileageKm || 100000, 50,
        `${apt.serviceType}${apt.notes ? ' – ' + apt.notes : ''}`,
        'Előjegyzés alapján beérkezett, átvizsgálás folyamatban.',
        JSON.stringify(defaultInspection),
        JSON.stringify(defaultItems),
        cust?.discountPercent || 0, '', 'unbilled', 'Bankkártya'
      );

      db.prepare('UPDATE appointments SET status = ?, workOrderId = ? WHERE id = ?').run('converted', woId, id);
      res.json({ ...getAllState(), createdWorkOrderId: woId });
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.delete('/api/appointments/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // TIRE HOTEL (Gumiabroncs-hotel)
  app.post('/api/tire-sets', (req, res) => {
    try {
      const {
        customerId, vehicleId, season = 'winter', brand, model, size, dot,
        rimType = 'alloy', treadFL = 7.0, treadFR = 7.0, treadRL = 7.0, treadRR = 7.0,
        location, status = 'stored', notes = ''
      } = req.body;
      const id = 'tire-' + Date.now();
      const countRow = db.prepare('SELECT COUNT(*) as c FROM tire_sets').get();
      const storageCode = `GH-2026-${String(countRow.c + 1).padStart(3, '0')}`;
      const storedAt = new Date().toISOString().slice(0, 10);

      db.prepare(`
        INSERT INTO tire_sets (
          id, storageCode, customerId, vehicleId, season, brand, model, size, dot,
          rimType, treadFL, treadFR, treadRL, treadRR, location, status, storedAt, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, storageCode, customerId, vehicleId, season, brand, model, size, dot,
        rimType, Number(treadFL) || 6.5, Number(treadFR) || 6.5, Number(treadRL) || 6.5, Number(treadRR) || 6.5,
        location || 'GH-A1-01', status, storedAt, notes
      );
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.patch('/api/tire-sets/:id/toggle-status', (req, res) => {
    try {
      const { id } = req.params;
      const existing = db.prepare('SELECT * FROM tire_sets WHERE id = ?').get(id);
      if (!existing) return res.status(404).json({ error: 'Garnitúra nem található' });
      const nextStatus = existing.status === 'stored' ? 'mounted' : 'stored';
      const nextDate = new Date().toISOString().slice(0, 10);
      db.prepare('UPDATE tire_sets SET status = ?, storedAt = ? WHERE id = ?').run(nextStatus, nextDate, id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.delete('/api/tire-sets/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM tire_sets WHERE id = ?').run(id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  // DIGITAL SERVICE BOOK (Digitális Szervizkönyv)
  app.post('/api/service-book', (req, res) => {
    try {
      const {
        vehicleId,
        date,
        mileageKm,
        workshopName = 'AutoTech Pro Szerviz Kft.',
        mechanicName = 'Farkas Péter',
        serviceType,
        oilChanged = false,
        airFilterChanged = false,
        pollenFilterChanged = false,
        fuelFilterChanged = false,
        sparkPlugsChanged = false,
        brakeFluidChanged = false,
        transmissionOilChanged = false,
        timingBeltChanged = false,
        brakesServiced = false,
        bodyInspectionOk = true,
        summary = '',
        nextServiceKm = 0,
        nextServiceDate = '',
        workOrderId = '',
      } = req.body;

      const id = 'sb-' + Date.now();
      const countRow = db.prepare('SELECT COUNT(*) as c FROM service_book_entries').get();
      const certificateCode = `DSB-2026-${String(1000 + countRow.c + 1)}`;
      const entryDate = date || new Date().toISOString().slice(0, 10);
      const km = Number(mileageKm) || 0;

      db.prepare(`
        INSERT INTO service_book_entries (
          id, certificateCode, vehicleId, date, mileageKm, workshopName, mechanicName,
          serviceType, oilChanged, airFilterChanged, pollenFilterChanged, fuelFilterChanged,
          sparkPlugsChanged, brakeFluidChanged, transmissionOilChanged, timingBeltChanged,
          brakesServiced, bodyInspectionOk, summary, nextServiceKm, nextServiceDate, workOrderId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        certificateCode,
        vehicleId,
        entryDate,
        km,
        workshopName,
        mechanicName,
        serviceType || 'Időszakos karbantartás',
        oilChanged ? 1 : 0,
        airFilterChanged ? 1 : 0,
        pollenFilterChanged ? 1 : 0,
        fuelFilterChanged ? 1 : 0,
        sparkPlugsChanged ? 1 : 0,
        brakeFluidChanged ? 1 : 0,
        transmissionOilChanged ? 1 : 0,
        timingBeltChanged ? 1 : 0,
        brakesServiced ? 1 : 0,
        bodyInspectionOk ? 1 : 0,
        summary,
        Number(nextServiceKm) || km + 15000,
        nextServiceDate || '',
        workOrderId || ''
      );

      if (km > 0) {
        db.prepare('UPDATE vehicles SET mileageKm = MAX(mileageKm, ?) WHERE id = ?').run(km, vehicleId);
      }

      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  app.delete('/api/service-book/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM service_book_entries WHERE id = ?').run(id);
      res.json(getAllState());
    } catch (err) {
      res.status(500).json({ error: String(err.message || err) });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`AutoTech Pro DMS server running at http://localhost:${PORT}`);
  });
}

startServer();

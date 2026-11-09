import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'carservice.db');
export const db = new DatabaseSync(dbPath);

export function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'personal',
      taxNumber TEXT DEFAULT '',
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      discountPercent REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      licensePlate TEXT NOT NULL,
      vin TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      engineCode TEXT DEFAULT '',
      fuelType TEXT NOT NULL,
      displacementCc INTEGER DEFAULT 0,
      powerKw INTEGER DEFAULT 0,
      mileageKm INTEGER NOT NULL DEFAULT 0,
      motExpiry TEXT NOT NULL,
      color TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mechanics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      specialty TEXT NOT NULL,
      hourlyRate INTEGER NOT NULL DEFAULT 14000,
      bay TEXT NOT NULL,
      phone TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'available',
      avatarColor TEXT DEFAULT 'amber'
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      supplier TEXT NOT NULL,
      buyPriceNet INTEGER NOT NULL,
      sellPriceNet INTEGER NOT NULL,
      vatRate INTEGER NOT NULL DEFAULT 27,
      stock INTEGER NOT NULL DEFAULT 0,
      minStock INTEGER NOT NULL DEFAULT 3,
      unit TEXT NOT NULL DEFAULT 'db',
      location TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      orderNumber TEXT NOT NULL UNIQUE,
      customerId TEXT NOT NULL,
      vehicleId TEXT NOT NULL,
      mechanicId TEXT NOT NULL,
      bay TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      createdAt TEXT NOT NULL,
      estimatedCompletion TEXT NOT NULL,
      completedAt TEXT DEFAULT '',
      mileageIn INTEGER NOT NULL,
      fuelLevel INTEGER NOT NULL DEFAULT 50,
      customerComplaint TEXT NOT NULL,
      diagnosis TEXT DEFAULT '',
      inspectionJson TEXT NOT NULL,
      itemsJson TEXT NOT NULL,
      discountPercent REAL DEFAULT 0,
      invoiceNumber TEXT DEFAULT '',
      paymentStatus TEXT NOT NULL DEFAULT 'unbilled',
      paymentMethod TEXT DEFAULT 'Bankkártya',
      FOREIGN KEY (customerId) REFERENCES customers(id),
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      vehicleId TEXT NOT NULL,
      mechanicId TEXT NOT NULL,
      bay TEXT NOT NULL,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      serviceType TEXT NOT NULL,
      notes TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'scheduled',
      workOrderId TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tire_sets (
      id TEXT PRIMARY KEY,
      storageCode TEXT NOT NULL UNIQUE,
      customerId TEXT NOT NULL,
      vehicleId TEXT NOT NULL,
      season TEXT NOT NULL, -- 'winter' | 'summer' | 'allseason'
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      size TEXT NOT NULL, -- e.g. '215/55 R17'
      dot TEXT NOT NULL, -- e.g. '3623'
      rimType TEXT NOT NULL, -- 'alloy' | 'steel' | 'tire_only'
      treadFL REAL NOT NULL DEFAULT 6.5,
      treadFR REAL NOT NULL DEFAULT 6.5,
      treadRL REAL NOT NULL DEFAULT 7.0,
      treadRR REAL NOT NULL DEFAULT 7.0,
      location TEXT NOT NULL, -- e.g. 'H-A12'
      status TEXT NOT NULL DEFAULT 'stored', -- 'stored' | 'mounted'
      storedAt TEXT NOT NULL,
      notes TEXT DEFAULT '',
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_book_entries (
      id TEXT PRIMARY KEY,
      certificateCode TEXT NOT NULL UNIQUE,
      vehicleId TEXT NOT NULL,
      date TEXT NOT NULL,
      mileageKm INTEGER NOT NULL,
      workshopName TEXT NOT NULL,
      mechanicName TEXT NOT NULL,
      serviceType TEXT NOT NULL,
      oilChanged INTEGER NOT NULL DEFAULT 0,
      airFilterChanged INTEGER NOT NULL DEFAULT 0,
      pollenFilterChanged INTEGER NOT NULL DEFAULT 0,
      fuelFilterChanged INTEGER NOT NULL DEFAULT 0,
      sparkPlugsChanged INTEGER NOT NULL DEFAULT 0,
      brakeFluidChanged INTEGER NOT NULL DEFAULT 0,
      transmissionOilChanged INTEGER NOT NULL DEFAULT 0,
      timingBeltChanged INTEGER NOT NULL DEFAULT 0,
      brakesServiced INTEGER NOT NULL DEFAULT 0,
      bodyInspectionOk INTEGER NOT NULL DEFAULT 1,
      summary TEXT NOT NULL,
      nextServiceKm INTEGER NOT NULL DEFAULT 0,
      nextServiceDate TEXT NOT NULL DEFAULT '',
      workOrderId TEXT DEFAULT '',
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);

  const countRow = db.prepare('SELECT COUNT(*) as count FROM customers').get();
  if (countRow.count === 0) {
    seedDatabase();
  } else {
    const tireCountRow = db.prepare('SELECT COUNT(*) as count FROM tire_sets').get();
    if (tireCountRow.count === 0) {
      seedTireSetsOnly();
    }
    const sbCountRow = db.prepare('SELECT COUNT(*) as count FROM service_book_entries').get();
    if (sbCountRow.count === 0) {
      seedServiceBookOnly();
    }
  }
}

function seedServiceBookOnly() {
  const insertEntry = db.prepare(`
    INSERT INTO service_book_entries (
      id, certificateCode, vehicleId, date, mileageKm, workshopName, mechanicName,
      serviceType, oilChanged, airFilterChanged, pollenFilterChanged, fuelFilterChanged,
      sparkPlugsChanged, brakeFluidChanged, transmissionOilChanged, timingBeltChanged,
      brakesServiced, bodyInspectionOk, summary, nextServiceKm, nextServiceDate, workOrderId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const entries = [
    // veh-1: VW Passat B8 2.0 TDI (current: 148,200 km)
    ['sb-1', 'DSB-2022-0418', 'veh-1', '2022-05-14', 29850, 'Porsche Buda Márkaszerviz', 'Kovács Tibor', '30.000 km-es gyári inspekció + LongLife olajcsere', 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 'Gyári előírás szerinti első inspekciós szerviz, aktívszén pollenszűrő és 0W-30 LongLife motorolaj csere.', 60000, '2023-05-14', ''],
    ['sb-2', 'DSB-2023-0912', 'veh-1', '2023-06-02', 61200, 'Porsche Buda Márkaszerviz', 'Kovács Tibor', '60.000 km-es inspekció + DSG váltóolaj + fékfolyadék', 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 'Motorolaj + összes szűrő cseréje, 6-fokozatú DSG sebességváltó olaj és szűrő csere, DOT4 LV fékfolyadék csere.', 90000, '2024-06-02', ''],
    ['sb-3', 'DSB-2024-1540', 'veh-1', '2024-07-19', 94500, 'AutoTech Pro Szerviz Kft.', 'Farkas Péter', '90.000 km-es szerviz + Hátsó fékbetét csere', 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 'Időszakos olajcsere, levegő- és pollenszűrő csere, hátsó tengelyen ATE fékbetét garnitúra beépítése.', 120000, '2025-07-19', ''],
    ['sb-4', 'DSB-2025-2104', 'veh-1', '2025-08-11', 121400, 'AutoTech Pro Szerviz Kft.', 'Farkas Péter', '120.000 km-es nagyszerviz + DSG váltóolaj csere', 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, '120e km-es gyári nagyszerviz: DSG váltóolaj csere, üzemanyagszűrő légtelenítés, fékfolyadék csere, teljes diagnosztika.', 148000, '2026-11-01', ''],

    // veh-2: Renault Master 2.3 dCi (current: 284,500 km)
    ['sb-5', 'DSB-2025-1890', 'veh-2', '2025-11-20', 240100, 'AutoTech Pro Szerviz Kft.', 'Farkas Péter', '240.000 km-es flottaszerviz + első/hátsó fékek', 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 'Flotta nagyszerviz, komplett első féktárcsa és betét csere, üzemanyagszűrő és fékfolyadék csere.', 265000, '2026-06-20', ''],
    ['sb-6', 'DSB-2026-0412', 'veh-2', '2026-05-15', 264800, 'AutoTech Pro Szerviz Kft.', 'Varga Dániel', '265.000 km-es olajcsere + klíma karbantartás', 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 'Motorolaj + szűrők cseréje, klímarendszer ózonos tisztítása és nyomáspróbája.', 285000, '2026-11-15', ''],

    // veh-3: Skoda Octavia III 1.6 TDI (current: 212,400 km)
    ['sb-7', 'DSB-2025-1102', 'veh-3', '2025-09-14', 182300, 'AutoTech Pro Szerviz Kft.', 'Farkas Péter', '180.000 km-es Vezérlés csere (ContiTech) + Vízpumpa', 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 'Komplett vezérműszíj készlet és elektromos kapcsolású vízpumpa csere, G12evo hűtőfolyadék feltöltés, olajcsere.', 197300, '2026-05-14', ''],
    ['sb-8', 'DSB-2026-0890', 'veh-3', '2026-11-06', 212400, 'AutoTech Pro Szerviz Kft.', 'Varga Dániel', '210.000 km-es olajcsere + 3D futómű beállítás', 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 'Castrol EDGE 5W-30 LL motorolaj és MANN szűrők cseréje, 3D lézeres futómű-geometria korrekció.', 227400, '2027-11-06', 'wo-5'],

    // veh-4: Toyota Yaris 1.5 Hybrid (current: 46,800 km)
    ['sb-9', 'DSB-2025-1990', 'veh-4', '2025-10-28', 31200, 'Toyota Mayer Márkaszerviz', 'Horváth Zsolt', '30.000 km-es Hybrid szerviz + Akkumulátor teszt', 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, '0W-16 gyári motorolaj csere, fékfolyadék csere, hibrid nagyfeszültségű akkumulátor állapotfelmérés: MEGFELELT.', 46200, '2026-10-28', ''],

    // veh-5: Ford Transit Custom 2.0 EcoBlue (current: 239,100 km)
    ['sb-10', 'DSB-2025-1420', 'veh-5', '2025-07-04', 218500, 'AutoTech Pro Szerviz Kft.', 'Farkas Péter', 'Időszakos olajcsere + Üzemanyagszűrő', 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 'Ford WSS-M2C950-A 0W-30 motorolaj csere. Figyelem: 240.000 km-nél olajban futó vezérműszíj cseréje kötelező!', 238500, '2026-07-04', ''],

    // veh-6: BMW 530d xDrive G30 (current: 119,600 km)
    ['sb-11', 'DSB-2025-2310', 'veh-6', '2025-11-12', 94200, 'AutoTech Pro Szerviz Kft.', 'Molnár Gergely', 'BMW CBS Inspekció + ZF 8HP váltóolaj és osztóműolaj csere', 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 'Gyári BMW LL-04 olajcsere, ZF 8HP automata váltó karter+szűrő+olaj csere, xDrive osztómű olajcsere és kalibráció.', 119200, '2026-11-12', ''],

    // veh-7: Opel Astra K 1.4 Turbo (current: 134,900 km)
    ['sb-12', 'DSB-2025-1780', 'veh-7', '2025-10-19', 119400, 'AutoTech Pro Szerviz Kft.', 'Varga Dániel', '120.000 km-es szerviz + NGK Iridium gyújtógyertya szett', 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 'Dexos1 Gen3 5W-30 motorolaj csere, 4 db NGK Laser Iridium gyújtógyertya csere, DOT4 fékfolyadék csere.', 134400, '2026-10-19', ''],
  ];

  for (const e of entries) insertEntry.run(...e);
}

function seedTireSetsOnly() {
  const insertTireSet = db.prepare(`
    INSERT INTO tire_sets (
      id, storageCode, customerId, vehicleId, season, brand, model, size, dot,
      rimType, treadFL, treadFR, treadRL, treadRR, location, status, storedAt, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sets = [
    ['tire-1', 'GH-2026-001', 'cust-1', 'veh-1', 'winter', 'Continental', 'WinterContact TS 870P', '215/55 R17', '3824', 'alloy', 7.2, 7.1, 7.6, 7.5, 'GH-A1-04', 'stored', '2026-04-12', 'Gyári VW 17" alufelnin, TPMS szenzorokkal, lemosva betárolva.'],
    ['tire-2', 'GH-2026-002', 'cust-5', 'veh-6', 'winter', 'Michelin', 'Pilot Alpin 5 SUV *', '245/45 R19', '4124', 'alloy', 6.8, 6.8, 6.4, 6.5, 'GH-A1-09', 'stored', '2026-04-08', 'BMW M-Sport 19" kerékszett, holnap (11.10) felszerelésre előkészítve.'],
    ['tire-3', 'GH-2026-003', 'cust-2', 'veh-3', 'winter', 'Bridgestone', 'Blizzak LM005', '205/55 R16', '2923', 'steel', 5.4, 5.3, 6.1, 6.0, 'GH-B2-14', 'stored', '2026-04-19', 'Lemezfelnin + gyári Škoda dísztárcsák mellékelve.'],
    ['tire-4', 'GH-2026-004', 'cust-3', 'veh-4', 'summer', 'Goodyear', 'EfficientGrip Performance 2', '195/55 R16', '1424', 'tire_only', 6.9, 6.9, 7.2, 7.2, 'GH-C1-02', 'stored', '2026-10-28', 'Téli gumira átszerelve, nyári abroncsok betárolva.'],
    ['tire-5', 'GH-2026-005', 'cust-4', 'veh-5', 'summer', 'Continental', 'VanContact Eco 109/107T', '215/65 R16C', '1123', 'steel', 4.2, 4.1, 5.0, 5.0, 'GH-B3-07', 'mounted', '2026-04-05', 'Jelenleg az autón van, következő szezonra 2 db első csere javasolt.'],
  ];

  for (const s of sets) insertTireSet.run(...s);
}

export function seedDatabase() {
  db.exec(`
    DELETE FROM service_book_entries;
    DELETE FROM tire_sets;
    DELETE FROM appointments;
    DELETE FROM work_orders;
    DELETE FROM inventory;
    DELETE FROM mechanics;
    DELETE FROM vehicles;
    DELETE FROM customers;
  `);

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, type, taxNumber, phone, email, address, discountPercent, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const customers = [
    ['cust-1', 'Kovács Gábor', 'personal', '', '+36 30 452 8819', 'kovacs.gabor@gmail.com', '1138 Budapest, Váci út 112.', 5, 'Törzsügyfél, mindig gyári vagy prémium alkatrészt kér.', '2025-03-14'],
    ['cust-2', 'Pannon Trans Logisztika Kft.', 'company', '14892301-2-41', '+36 20 911 3340', 'flotta@pannontrans.hu', '2040 Budaörs, Gyár utca 8.', 12, 'Flottaszerződéses partner (8 napos átutalás).', '2024-11-02'],
    ['cust-3', 'Szabó Eszter', 'personal', '', '+36 70 618 2204', 'szabo.eszter88@icloud.com', '1117 Budapest, Fehérvári út 45.', 0, 'Délelőtti órákban telefonon nehezen elérhető.', '2025-08-21'],
    ['cust-4', 'Tóth László EV.', 'company', '68412095-2-13', '+36 30 778 9012', 'toth.laszlo.ev@t-online.hu', '2120 Dunakeszi, Fő út 79.', 5, 'Munkásautó, gyors javítás mindig elsődleges.', '2025-05-10'],
    ['cust-5', 'Dr. Varga Kornél', 'personal', '', '+36 30 209 5511', 'dr.varga.kornel@medmail.hu', '1026 Budapest, Pasaréti út 34.', 5, 'Csereautót szokott igényelni hosszabb javításnál.', '2025-01-19'],
    ['cust-6', 'Horváth Bence', 'personal', '', '+36 20 334 7811', 'horvath.bence@outlook.com', '1149 Budapest, Egressy út 62.', 0, 'Műszaki vizsga előtt teljes átvizsgálást kér.', '2026-02-11'],
  ];

  for (const c of customers) insertCustomer.run(...c);

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (id, customerId, licensePlate, vin, make, model, year, engineCode, fuelType, displacementCc, powerKw, mileageKm, motExpiry, color, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const vehicles = [
    ['veh-1', 'cust-1', 'AA-BC-412', 'WVWZZZ3CZNE048192', 'Volkswagen', 'Passat B8 2.0 TDI', 2021, 'DFGA', 'Dízel', 1968, 110, 148200, '2027-05-18', 'Gránitszürke metál', 'DSG váltóolaj csere 120.000 km-nél megtörtént.'],
    ['veh-2', 'cust-2', 'TKP-884', 'VF1MA000664819203', 'Renault', 'Master 2.3 dCi L3H2', 2020, 'M9T', 'Dízel', 2299, 120, 284500, '2026-11-24', 'Fehér', 'Céges furgon #4, sok autópályás futás.'],
    ['veh-3', 'cust-2', 'SMD-219', 'TMBEJ6NJ4KZ091234', 'Škoda', 'Octavia III Combi 1.6 TDI', 2019, 'DGTE', 'Dízel', 1598, 85, 212400, '2027-03-10', 'Ezüst metál', 'Üzletkötői autó.'],
    ['veh-4', 'cust-3', 'AE-KL-905', 'JTDKB3FU903519284', 'Toyota', 'Yaris 1.5 Hybrid', 2022, 'M15A-FXE', 'Hibrid', 1490, 85, 46800, '2028-04-22', 'Gyöngyház fehér', 'Éves hibrid rendszer ellenőrzés esedékes.'],
    ['veh-5', 'cust-4', 'RND-510', 'WF0FXXWPFFJA82341', 'Ford', 'Transit Custom 2.0 EcoBlue', 2018, 'YMFS', 'Dízel', 1995, 96, 239100, '2026-11-15', 'Kék', 'Nedves vezérműszíj (olajban futó) ellenőrzése szükséges!'],
    ['veh-6', 'cust-5', 'AI-PR-108', 'WBA51AJ090CM92811', 'BMW', '530d xDrive (G30)', 2021, 'B57D30A', 'Dízel', 2993, 210, 119600, '2027-09-30', 'Mélyfekete metál', 'Légrugós hátsó futómű.'],
    ['veh-7', 'cust-6', 'PHT-603', 'ZFA35600006J19284', 'Opel', 'Astra K 1.4 Turbo', 2017, 'B14XFT', 'Benzin', 1399, 110, 134900, '2026-11-18', 'Piros', 'Műszaki vizsga hamarosan lejár!'],
  ];

  for (const v of vehicles) insertVehicle.run(...v);

  const insertMechanic = db.prepare(`
    INSERT INTO mechanics (id, name, role, specialty, hourlyRate, bay, phone, status, avatarColor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const mechanics = [
    ['mech-1', 'Molnár Zsolt', 'Vezető autószerelő mester', 'Motor, Vezérlés, Sebességváltó', 18000, '1. Csápos emelő', '+36 30 511 0011', 'busy', 'amber'],
    ['mech-2', 'Farkas Dávid', 'Autóvillamossági & Diagnosztikai szakértő', 'Diagnosztika, Hibrid/EV, Klíma', 19500, '4. Diagnosztika & Klíma', '+36 30 511 0012', 'busy', 'sky'],
    ['mech-3', 'Kiss Tamás', 'Futómű- és fékspecialista', 'Fékrendszer, Futómű 3D, Gumiszerviz', 16000, '3. Négyoszlopos / Futóműpad', '+36 30 511 0013', 'available', 'emerald'],
    ['mech-4', 'Balogh Péter', 'Autószerelő technikus', 'Időszakos szerviz, Kisteherautók, Vizsgafelkészítés', 15500, '2. Csápos emelő', '+36 30 511 0014', 'busy', 'violet'],
  ];

  for (const m of mechanics) insertMechanic.run(...m);

  const insertInventory = db.prepare(`
    INSERT INTO inventory (id, sku, name, category, brand, supplier, buyPriceNet, sellPriceNet, vatRate, stock, minStock, unit, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const inventoryItems = [
    ['inv-1', 'OIL-5W30-5L', 'Castrol EDGE 5W-30 LL Motorolaj (5L)', 'Olajok és folyadékok', 'Castrol', 'Bárdi Autó', 14200, 21900, 27, 18, 6, 'kanna', 'A1-01'],
    ['inv-2', 'OIL-0W20-1L', 'Motul Hybrid 0W-20 Motorolaj (1L)', 'Olajok és folyadékok', 'Motul', 'Unix Autó', 3400, 5200, 27, 14, 5, 'liter', 'A1-03'],
    ['inv-3', 'FLT-MANN-HU7020', 'Olajszűrő betét 2.0 TDI (VW/Audi/Škoda)', 'Szűrők', 'MANN-FILTER', 'Bárdi Autó', 2900, 4800, 27, 9, 4, 'db', 'B2-11'],
    ['inv-4', 'FLT-MANN-C30005', 'Levegőszűrő VAG MQB 1.6/2.0 TDI', 'Szűrők', 'MANN-FILTER', 'Bárdi Autó', 4600, 7400, 27, 6, 3, 'db', 'B2-14'],
    ['inv-5', 'FLT-POLLEN-FP26', 'Aktívszenes pollenszűrő FreciousPlus', 'Szűrők', 'MANN-FILTER', 'Unix Autó', 6200, 9800, 27, 2, 4, 'db', 'B2-19'],
    ['inv-6', 'BRK-ZIM-VW312', 'Első féktárcsa szett 312mm (2 db) Coat Z', 'Fékrendszer', 'Zimmermann', 'Inter Cars', 31000, 46900, 27, 4, 2, 'szett', 'C1-04'],
    ['inv-7', 'BRK-ATE-130460', 'Első fékbetét garnitúra kopásjelzővel', 'Fékrendszer', 'ATE', 'Inter Cars', 15800, 24500, 27, 5, 3, 'garnitúra', 'C1-08'],
    ['inv-8', 'BRK-TRW-MASTER', 'Erősített hátsó fékbetét szett (Renault Master)', 'Fékrendszer', 'TRW', 'Unix Autó', 14500, 22900, 27, 1, 3, 'garnitúra', 'C1-15'],
    ['inv-9', 'TIM-CONT-CT1168', 'Vezérműszíj készlet vízpumpával 2.0 TDI', 'Motor és vezérlés', 'Continental', 'Bárdi Autó', 68000, 98500, 27, 2, 2, 'készlet', 'D3-02'],
    ['inv-10', 'SUS-LEM-37612', 'Első stabilizátor inga / pálca HD', 'Futómű és kormányzás', 'Lemförder', 'Inter Cars', 6400, 10500, 27, 8, 4, 'db', 'E1-07'],
    ['inv-11', 'BAT-VARTA-AGM70', 'Varta Silver Dynamic AGM 70Ah 760A Start-Stop', 'Elektromosság', 'Varta', 'Bárdi Autó', 52000, 74900, 27, 1, 2, 'db', 'F1-01'],
    ['inv-12', 'AC-R134A-100G', 'Klímagáz R134a + UV kontrasztanyag (100g egység)', 'Klíma és hűtés', 'Valeo', 'Unix Autó', 1800, 3500, 27, 35, 10, 'egység', 'G2-01'],
    ['inv-13', 'BRK-DOT4-1L', 'ATE SL.6 DOT4 ESP Fékfolyadék (1L)', 'Olajok és folyadékok', 'ATE', 'Inter Cars', 3200, 5400, 27, 11, 4, 'liter', 'A2-05'],
  ];

  for (const item of inventoryItems) insertInventory.run(...item);

  const insertWorkOrder = db.prepare(`
    INSERT INTO work_orders (
      id, orderNumber, customerId, vehicleId, mechanicId, bay, status, priority,
      createdAt, estimatedCompletion, completedAt, mileageIn, fuelLevel,
      customerComplaint, diagnosis, inspectionJson, itemsJson,
      discountPercent, invoiceNumber, paymentStatus, paymentMethod
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const workOrders = [
    [
      'wo-1',
      'ML-2026-0101',
      'cust-1',
      'veh-1',
      'mech-1',
      '1. Csápos emelő',
      'in_progress',
      'high',
      '2026-11-09 07:45',
      '2026-11-09 16:30',
      '',
      148200,
      75,
      '150.000 km-es nagyszerviz + fékezéskor enyhe rázás érezhető a kormányon.',
      'Első féktárcsák vállasak, minimális ütés mérhető (0.09 mm). Vezérlés csere + időszakos olajcsere és első fék szett csere javasolt, ügyfél jóváhagyta.',
      JSON.stringify({
        brakes: 'bad',
        suspension: 'ok',
        engineOil: 'warn',
        tires: 'ok',
        battery: 'ok',
        lights: 'ok',
        bodyNotes: 'Hátsó lökhárító jobb sarkán 3 cm-es meglévő fényezési karc.',
        damageMarkers: [
          { id: 'dm-1', x: 86, y: 76, type: 'scratch', note: 'Jobb hátsó lökhárító íven 3 cm fényezési karc' },
          { id: 'dm-2', x: 22, y: 50, type: 'chip', note: 'Szélvédő jobb szélén apró kőfelverődés' }
        ],
        wheelMeasurements: {
          fl: { treadMm: 6.2, brakePct: 25, pressureBar: 2.4 },
          fr: { treadMm: 6.1, brakePct: 25, pressureBar: 2.4 },
          rl: { treadMm: 6.8, brakePct: 65, pressureBar: 2.5 },
          rr: { treadMm: 6.8, brakePct: 65, pressureBar: 2.5 }
        },
        quoteApproved: true,
        quoteApprovedAt: '2026-11-09 08:30',
        quoteApprovedBy: 'Kovács Gábor (Online ügyfélportál)'
      }),
      JSON.stringify([
        { id: 'item-1', type: 'part', sku: 'TIM-CONT-CT1168', name: 'Continental Vezérműszíj készlet vízpumpával 2.0 TDI', quantity: 1, unit: 'készlet', unitPriceNet: 98500, vatRate: 27 },
        { id: 'item-2', type: 'part', sku: 'OIL-5W30-5L', name: 'Castrol EDGE 5W-30 LL Motorolaj (5L)', quantity: 1, unit: 'kanna', unitPriceNet: 21900, vatRate: 27 },
        { id: 'item-3', type: 'part', sku: 'FLT-MANN-HU7020', name: 'MANN Olajszűrő betét 2.0 TDI', quantity: 1, unit: 'db', unitPriceNet: 4800, vatRate: 27 },
        { id: 'item-4', type: 'part', sku: 'BRK-ZIM-VW312', name: 'Zimmermann Első féktárcsa szett 312mm (2 db)', quantity: 1, unit: 'szett', unitPriceNet: 46900, vatRate: 27 },
        { id: 'item-5', type: 'part', sku: 'BRK-ATE-130460', name: 'ATE Első fékbetét garnitúra kopásjelzővel', quantity: 1, unit: 'garnitúra', unitPriceNet: 24500, vatRate: 27 },
        { id: 'item-6', type: 'labor', sku: 'LAB-TIMING', name: 'Vezérműszíj és vízpumpa csere munkadíj (4.5 normaóra)', quantity: 4.5, unit: 'óra', unitPriceNet: 18000, vatRate: 27 },
        { id: 'item-7', type: 'labor', sku: 'LAB-BRAKE-F', name: 'Első féktárcsa és fékbetét csere + kerékagy tisztítás', quantity: 1.5, unit: 'óra', unitPriceNet: 18000, vatRate: 27 },
      ]),
      5,
      '',
      'unbilled',
      'Bankkártya'
    ],
    [
      'wo-2',
      'ML-2026-0102',
      'cust-2',
      'veh-2',
      'mech-4',
      '2. Csápos emelő',
      'waiting_parts',
      'urgent',
      '2026-11-09 08:00',
      '2026-11-10 12:00',
      '',
      284500,
      40,
      'Hátsó fék fémes hangot ad, jobb első futómű kopog kátyúnál, közelgő műszaki vizsgára felkészítés.',
      'Hátsó fékbetét kopáshatáron, jobb és bal első stabilizátor pálca gömbfej lóg. Hátsó féknyereg csúszka tisztítás szükséges.',
      JSON.stringify({
        brakes: 'bad',
        suspension: 'warn',
        engineOil: 'ok',
        tires: 'ok',
        battery: 'warn',
        lights: 'ok',
        bodyNotes: 'Raktér ajtó horpadt (flotta jegyzőkönyvezve).',
        damageMarkers: [
          { id: 'dm-21', x: 90, y: 50, type: 'dent', note: 'Hátsó raktérajtó alsó részén 8 cm-es horpadás' },
          { id: 'dm-22', x: 55, y: 82, type: 'scratch', note: 'Jobb oldali tolóajtó sín alatt horzsolás' }
        ],
        wheelMeasurements: {
          fl: { treadMm: 5.5, brakePct: 60, pressureBar: 3.2 },
          fr: { treadMm: 5.4, brakePct: 60, pressureBar: 3.2 },
          rl: { treadMm: 6.0, brakePct: 15, pressureBar: 3.5 },
          rr: { treadMm: 6.0, brakePct: 15, pressureBar: 3.5 }
        },
        quoteApproved: false,
        quoteApprovedAt: '',
        quoteApprovedBy: ''
      }),
      JSON.stringify([
        { id: 'item-21', type: 'part', sku: 'BRK-TRW-MASTER', name: 'TRW Erősített hátsó fékbetét szett (Renault Master)', quantity: 1, unit: 'garnitúra', unitPriceNet: 22900, vatRate: 27 },
        { id: 'item-22', type: 'part', sku: 'SUS-LEM-37612', name: 'Lemförder Első stabilizátor inga / pálca HD', quantity: 2, unit: 'db', unitPriceNet: 10500, vatRate: 27 },
        { id: 'item-23', type: 'part', sku: 'BRK-DOT4-1L', name: 'ATE SL.6 DOT4 ESP Fékfolyadék (1L)', quantity: 1, unit: 'liter', unitPriceNet: 5400, vatRate: 27 },
        { id: 'item-24', type: 'labor', sku: 'LAB-MAST-SRV', name: 'Hátsó fék javítás + stabilizátor pálca csere + műszaki elővizsgálat', quantity: 3.0, unit: 'óra', unitPriceNet: 15500, vatRate: 27 },
      ]),
      12,
      '',
      'quoted',
      'Átutalás'
    ],
    [
      'wo-3',
      'ML-2026-0103',
      'cust-5',
      'veh-6',
      'mech-2',
      '4. Diagnosztika & Klíma',
      'testing',
      'normal',
      '2026-11-08 14:15',
      '2026-11-09 11:30',
      '',
      119600,
      90,
      'Start-Stop rendszer nem működik, hidegindításkor "Akkumulátor erősen lemerült" üzenet a kijelzőn.',
      'ISTA diagnosztika: gyári AGM akkumulátor belső ellenállása magas (SOH 38%). Új Varta 70Ah/95Ah AGM akkumulátor beépítése és BMS regisztráció/tanítás elvégezve, tesztelés alatt.',
      JSON.stringify({
        brakes: 'ok',
        suspension: 'ok',
        engineOil: 'ok',
        tires: 'ok',
        battery: 'bad',
        lights: 'ok',
        bodyNotes: 'Sérülésmentes.',
        damageMarkers: [],
        wheelMeasurements: {
          fl: { treadMm: 6.5, brakePct: 75, pressureBar: 2.5 },
          fr: { treadMm: 6.5, brakePct: 75, pressureBar: 2.5 },
          rl: { treadMm: 6.0, brakePct: 70, pressureBar: 2.7 },
          rr: { treadMm: 6.0, brakePct: 70, pressureBar: 2.7 }
        },
        quoteApproved: true,
        quoteApprovedAt: '2026-11-08 15:10',
        quoteApprovedBy: 'Dr. Varga Kornél'
      }),
      JSON.stringify([
        { id: 'item-31', type: 'part', sku: 'BAT-VARTA-AGM70', name: 'Varta Silver Dynamic AGM Start-Stop akkumulátor', quantity: 1, unit: 'db', unitPriceNet: 74900, vatRate: 27 },
        { id: 'item-32', type: 'labor', sku: 'LAB-DIAG-BMS', name: 'Komplett fedélzeti diagnosztika + akkumulátor csere és BMS illesztés', quantity: 1.5, unit: 'óra', unitPriceNet: 19500, vatRate: 27 },
      ]),
      5,
      '',
      'unbilled',
      'Bankkártya'
    ],
    [
      'wo-4',
      'ML-2026-0100',
      'cust-3',
      'veh-4',
      'mech-2',
      '4. Diagnosztika & Klíma',
      'ready',
      'normal',
      '2026-11-08 09:00',
      '2026-11-08 15:00',
      '2026-11-08 14:40',
      46800,
      60,
      '45.000 km-es éves kötelező hibrid szerviz + utastér fertőtlenítés.',
      'Hibrid akkumulátor cellafeszültségek kiválóak, hűtőventilátor szűrő tisztítva. 0W-20 olaj + szűrők cserélve.',
      JSON.stringify({
        brakes: 'ok',
        suspension: 'ok',
        engineOil: 'ok',
        tires: 'ok',
        battery: 'ok',
        lights: 'ok',
        bodyNotes: 'Makulátlan állapot.',
        damageMarkers: [],
        wheelMeasurements: {
          fl: { treadMm: 7.0, brakePct: 85, pressureBar: 2.3 },
          fr: { treadMm: 7.0, brakePct: 85, pressureBar: 2.3 },
          rl: { treadMm: 7.4, brakePct: 90, pressureBar: 2.3 },
          rr: { treadMm: 7.4, brakePct: 90, pressureBar: 2.3 }
        },
        quoteApproved: true,
        quoteApprovedAt: '2026-11-08 09:30',
        quoteApprovedBy: 'Szabó Eszter'
      }),
      JSON.stringify([
        { id: 'item-41', type: 'part', sku: 'OIL-0W20-1L', name: 'Motul Hybrid 0W-20 Motorolaj (1L)', quantity: 4, unit: 'liter', unitPriceNet: 5200, vatRate: 27 },
        { id: 'item-42', type: 'part', sku: 'FLT-POLLEN-FP26', name: 'MANN Aktívszenes pollenszűrő FreciousPlus', quantity: 1, unit: 'db', unitPriceNet: 9800, vatRate: 27 },
        { id: 'item-43', type: 'labor', sku: 'LAB-HYB-SRV', name: 'Éves hibrid átvizsgálás, olajcsere és ózonos klímafertőtlenítés', quantity: 2.0, unit: 'óra', unitPriceNet: 19500, vatRate: 27 },
      ]),
      0,
      'SZ-2026-0891',
      'invoiced',
      'Bankkártya'
    ],
    [
      'wo-5',
      'ML-2026-0099',
      'cust-2',
      'veh-3',
      'mech-3',
      '3. Négyoszlopos / Futóműpad',
      'completed',
      'normal',
      '2026-11-06 08:30',
      '2026-11-06 13:00',
      '2026-11-06 12:30',
      212400,
      80,
      '3D futómű beállítás és időszakos olajcsere + levegőszűrő csere.',
      'Jobb első összetartás korrigálva, futómű geometria gyári értékre állítva.',
      JSON.stringify({
        brakes: 'ok',
        suspension: 'ok',
        engineOil: 'ok',
        tires: 'ok',
        battery: 'ok',
        lights: 'ok',
        bodyNotes: 'Használatból eredő apró kavicsfelverődések a motorháztetőn.',
        damageMarkers: [
          { id: 'dm-51', x: 16, y: 45, type: 'chip', note: 'Motorháztető első élén kavicsfelverődések' }
        ],
        wheelMeasurements: {
          fl: { treadMm: 5.8, brakePct: 70, pressureBar: 2.4 },
          fr: { treadMm: 5.8, brakePct: 70, pressureBar: 2.4 },
          rl: { treadMm: 6.3, brakePct: 75, pressureBar: 2.4 },
          rr: { treadMm: 6.3, brakePct: 75, pressureBar: 2.4 }
        },
        quoteApproved: true,
        quoteApprovedAt: '2026-11-06 09:00',
        quoteApprovedBy: 'Pannon Trans Flottakezelő'
      }),
      JSON.stringify([
        { id: 'item-51', type: 'part', sku: 'OIL-5W30-5L', name: 'Castrol EDGE 5W-30 LL Motorolaj (5L)', quantity: 1, unit: 'kanna', unitPriceNet: 21900, vatRate: 27 },
        { id: 'item-52', type: 'part', sku: 'FLT-MANN-HU7020', name: 'MANN Olajszűrő betét', quantity: 1, unit: 'db', unitPriceNet: 4800, vatRate: 27 },
        { id: 'item-53', type: 'part', sku: 'FLT-MANN-C30005', name: 'MANN Levegőszűrő', quantity: 1, unit: 'db', unitPriceNet: 7400, vatRate: 27 },
        { id: 'item-54', type: 'labor', sku: 'LAB-ALIGN-3D', name: '3D Lézeres futómű geometria mérés és beállítás + olajcsere', quantity: 2.0, unit: 'óra', unitPriceNet: 16000, vatRate: 27 },
      ]),
      12,
      'SZ-2026-0890',
      'paid',
      'Átutalás'
    ],
    [
      'wo-6',
      'ML-2026-0104',
      'cust-6',
      'veh-7',
      'mech-3',
      '3. Négyoszlopos / Futóműpad',
      'received',
      'high',
      '2026-11-09 08:20',
      '2026-11-09 17:00',
      '',
      134900,
      50,
      'Műszaki vizsga előtti teljes átvizsgálás, fékhatás mérés és fényszóró beállítás.',
      'Állapotfelmérés elvégezve, árajánlat ügyfél jóváhagyására vár.',
      JSON.stringify({
        brakes: 'warn',
        suspension: 'ok',
        engineOil: 'ok',
        tires: 'warn',
        battery: 'ok',
        lights: 'warn',
        bodyNotes: 'Bal első ajtókilincs körül apró karcok.',
        damageMarkers: [
          { id: 'dm-61', x: 46, y: 18, type: 'scratch', note: 'Bal első ajtón kilincs mellett körömkarcok' }
        ],
        wheelMeasurements: {
          fl: { treadMm: 3.8, brakePct: 45, pressureBar: 2.2 },
          fr: { treadMm: 3.9, brakePct: 45, pressureBar: 2.2 },
          rl: { treadMm: 4.8, brakePct: 60, pressureBar: 2.2 },
          rr: { treadMm: 4.8, brakePct: 60, pressureBar: 2.2 }
        },
        quoteApproved: false,
        quoteApprovedAt: '',
        quoteApprovedBy: ''
      }),
      JSON.stringify([
        { id: 'item-61', type: 'labor', sku: 'LAB-MOT-PREP', name: 'Műszaki vizsga előtti teljes műszeres átvizsgálás (fékpad, lengéscsillapító, CO, fényszóró)', quantity: 1.5, unit: 'óra', unitPriceNet: 16000, vatRate: 27 },
      ]),
      0,
      '',
      'quoted',
      'Készpénz'
    ]
  ];

  for (const wo of workOrders) insertWorkOrder.run(...wo);

  const insertAppointment = db.prepare(`
    INSERT INTO appointments (id, customerId, vehicleId, mechanicId, bay, date, startTime, endTime, serviceType, notes, status, workOrderId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const appointments = [
    ['apt-1', 'cust-4', 'veh-5', 'mech-1', '1. Csápos emelő', '2026-11-09', '10:30', '14:30', 'Vezérlés átvizsgálás + Olajcsere', 'Ford Transit 2.0 EcoBlue – műszaki vizsga is lejár 11.15-én!', 'scheduled', ''],
    ['apt-2', 'cust-6', 'veh-7', 'mech-3', '3. Négyoszlopos / Futóműpad', '2026-11-09', '08:15', '10:30', 'Műszaki vizsga felkészítés & fékpad', 'Megérkezett, munkalap megnyitva (ML-2026-0104).', 'converted', 'wo-6'],
    ['apt-3', 'cust-1', 'veh-1', 'mech-1', '1. Csápos emelő', '2026-11-09', '07:45', '16:00', '150e km nagyszerviz + első fékek', 'Munkalap folyamatban (ML-2026-0101).', 'converted', 'wo-1'],
    ['apt-4', 'cust-2', 'veh-3', 'mech-2', '4. Diagnosztika & Klíma', '2026-11-10', '09:00', '11:00', 'Klímatöltés & nyomáspróba', 'Flotta autó, gyors átfutást kértek.', 'scheduled', ''],
    ['apt-5', 'cust-5', 'veh-6', 'mech-3', '3. Négyoszlopos / Futóműpad', '2026-11-10', '13:00', '14:30', 'Téli kerékgarnitúra felszerelés + centrírozás', 'TPMS szenzorok ellenőrzése.', 'scheduled', ''],
  ];

  for (const apt of appointments) insertAppointment.run(...apt);

  seedTireSetsOnly();
  seedServiceBookOnly();
}

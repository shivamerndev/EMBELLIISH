/**
 * Hits every endpoint the web client calls, against a running server, and checks
 * each answers with the expected envelope. Catches route/permission wiring
 * mistakes that a unit test on the services would never see.
 *
 * Start the server first, then:  node scripts/smoke_api.js
 */
const BASE = process.env.API_BASE || 'http://localhost:5000/api/v1';

let token = '';
let passed = 0;
let failed = 0;

const call = async (method, path, body) => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
};

const check = async (label, method, path, { expect = 200, body } = {}) => {
  const { status, payload } = await call(method, path, body);
  // A deliberately expected 4xx answers with success:false — that is the pass.
  const ok = status === expect && (expect >= 400 || payload.success !== false);

  if (ok) {
    passed += 1;
    console.log(`  [PASS] ${label.padEnd(30)} ${method} ${path}`);
  } else {
    failed += 1;
    console.log(`  [FAIL] ${label.padEnd(30)} ${method} ${path} → ${status} ${payload.message || ''}`);
  }
  return payload.data;
};

/** A PDF route answers with bytes, not JSON, so it is checked by file signature. */
const checkPdf = async (label, path) => {
  const response = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const buffer = Buffer.from(await response.arrayBuffer());
  const ok = response.ok && buffer.subarray(0, 5).toString() === '%PDF-' && buffer.length > 1000;

  if (ok) {
    passed += 1;
    console.log(`  [PASS] ${label.padEnd(30)} GET ${path} (${buffer.length} bytes)`);
  } else {
    failed += 1;
    console.log(`  [FAIL] ${label.padEnd(30)} GET ${path} → ${response.status} ${buffer.subarray(0, 80)}`);
  }
};

const section = (title) => console.log(`\n${title}`);

const run = async () => {
  console.log('\nSmoke-testing every endpoint the client calls\n');

  section('Auth');
  const auth = await check('login', 'POST', '/auth/login', {
    body: { email: 'admin@embellish.com', password: 'Embellish@2026' },
  });
  token = auth?.token;
  if (!token) {
    console.log('\nCould not sign in — is the server running and seeded?\n');
    process.exit(1);
  }
  await check('profile', 'GET', '/auth/profile');
  await check('meta', 'GET', '/meta');

  section('Dashboard & reports');
  await check('dashboard', 'GET', '/reports/dashboard');
  await check('sales', 'GET', '/reports/sales-performance');

  section('CRM');
  await check('leads', 'GET', '/crm/leads?limit=10');
  await check('lead pipeline', 'GET', '/crm/leads/pipeline');
  const clients = await check('clients', 'GET', '/crm/clients?limit=10');
  await check('architects', 'GET', '/crm/architects?limit=10');
  await check('followups', 'GET', '/crm/followups?limit=10');
  await check('due followups', 'GET', '/crm/followups/due');
  if (clients?.items?.[0]) {
    await check('client projects', 'GET', `/crm/clients/${clients.items[0].id}/projects`);
  }

  section('Projects');
  const projects = await check('projects', 'GET', '/project/projects?limit=10');
  const project = projects?.items?.[0];
  if (!project) {
    console.log('\nNo seeded project found — run `npm run seed` first.\n');
    process.exit(1);
  }
  const id = project.id;

  await check('workspace', 'GET', `/project/projects/${id}/workspace`);
  await check('stage status', 'GET', `/project/projects/${id}/stage-status`);
  await check('rooms', 'GET', `/project/rooms/project/${id}`);
  await check('measurements', 'GET', `/project/measurements/project/${id}`);
  await check('site visits', 'GET', `/project/site-visits?project=${id}`);
  await check('current BOQ', 'GET', `/project/boqs/project/${id}/current`);
  await check('BOQ preview', 'POST', `/project/boqs/project/${id}/preview`, { body: {} });
  await check('designs', 'GET', `/project/designs?project=${id}`);
  await check('drawings', 'GET', `/project/drawings?project=${id}`);
  await check('installations', 'GET', `/project/installations?project=${id}`);
  await check('installation summary', 'GET', `/project/installations/project/${id}/summary`);
  await check('snags', 'GET', `/project/snags?project=${id}`);
  await check('snag summary', 'GET', `/project/snags/project/${id}/summary`);

  section('Ready size (Step 4)');
  const readySheet = await check('ready size sheet', 'GET', `/project/measurements/project/${id}/ready-size`);
  const window = readySheet?.lines?.[0];
  if (window) {
    await check('set ready size', 'POST', `/project/measurements/${window.id}/ready-size`, {
      body: { dropAllowanceInch: 6, note: 'Floor touch', confirm: true },
    });
    await check('withdraw sign-off', 'POST', `/project/measurements/${window.id}/ready-size`, {
      body: { confirm: false },
    });
  }
  await check('confirm all ready sizes', 'POST', `/project/measurements/project/${id}/ready-size/confirm-all`, {
    body: { note: 'Smoke test' },
  });

  section('Live window calculation');
  await check('calculate window', 'POST', '/project/measurements/calculate', {
    body: { particular: 'MAIN_CURTAIN', o2o: { width: 236.2, height: 121.9 }, fabricWidthInch: 49 },
  });

  section('Quotation & accounts');
  await check('quotations', 'GET', `/crm/quotations?project=${id}`);
  await check('invoices', 'GET', '/accounts/invoices?limit=10');
  await check('payments', 'GET', '/accounts/payments?limit=10');
  await check('payment summary', 'GET', `/accounts/payments/project/${id}/summary`);
  await check('transactions', 'GET', '/accounts/transactions?limit=10');
  await check('project ledger', 'GET', `/accounts/transactions/project/${id}/ledger`);

  section('Inventory');
  await check('fabrics', 'GET', '/inventory/fabrics?limit=10');
  await check('motors', 'GET', '/inventory/motors?limit=10');
  await check('accessories', 'GET', '/inventory/accessories?limit=10');
  await check('vendors', 'GET', '/inventory/vendors?limit=10');
  await check('stock', 'GET', '/inventory/stocks?limit=10');
  await check('low stock', 'GET', '/inventory/stocks/low-stock');
  await check('stock ledger', 'GET', '/inventory/stocks/movements?limit=10');
  await check('availability', 'GET', `/inventory/stocks/project/${id}/availability`);
  await check('purchase orders', 'GET', '/inventory/purchase-orders?limit=10');

  section('Production');
  await check('work orders', 'GET', '/production/orders?limit=10');
  await check('production board', 'GET', `/production/orders/project/${id}/board`);
  await check('stitching queue', 'GET', '/production/stitching/queue');
  await check('qc checks', 'GET', '/production/qc?limit=10');
  await check('qc summary', 'GET', `/production/qc/project/${id}/summary`);
  await check('packing list', 'GET', `/production/packing/project/${id}/list`);
  await check('dispatches', 'GET', '/production/dispatches?limit=10');

  section('Settings, pricing & notifications');
  await check('settings', 'GET', '/settings');
  await check('update settings', 'PUT', '/settings', {
    body: { company: { name: 'Embelliish' }, discount: { approvalThresholdPercent: 10 } },
  });
  await check('price list', 'GET', '/pricing?limit=10');
  await check('current price list', 'GET', '/pricing/current');
  await check('price list coverage', 'GET', '/pricing/coverage');
  await check('resolved rate card', 'GET', '/pricing/rate-card');
  const published = await check('publish a rate', 'POST', '/pricing', {
    expect: 201,
    body: { key: 'MOTOR', particular: 'Motor & remote', category: 'HARDWARE', unit: 'pcs', rate: 41000 },
  });
  if (published?.id) await check('retire a rate', 'POST', `/pricing/${published.id}/retire`);
  await check('notifications', 'GET', '/notifications');
  await check('unread count', 'GET', '/notifications/unread-count');
  await check('mark all read', 'POST', '/notifications/read-all');

  section('Discount approval (Step 7)');
  // 12% is past the 10% house limit, so this must stall until the founder signs.
  const overDiscount = await check('quote at 12% discount', 'POST', `/crm/quotations/project/${id}/generate`, {
    expect: 201,
    body: { discountPercent: 12 },
  });
  if (overDiscount?.id) {
    await check('sending is blocked', 'POST', `/crm/quotations/${overDiscount.id}/send`, { expect: 422 });
    await check('founder approves', 'POST', `/crm/quotations/${overDiscount.id}/discount/approve`, {
      body: { note: 'Repeat client' },
    });
    await check('now it sends', 'POST', `/crm/quotations/${overDiscount.id}/send`);

    // A DCM must not be able to clear their own concession.
    const adminToken = token;
    const dcmLogin = await call('POST', '/auth/login', {
      email: 'rahul@embellish.com',
      password: 'Embellish@2026',
    });
    token = dcmLogin.payload.data.token;
    const dcmQuote = await call('POST', `/crm/quotations/project/${id}/generate`, { discountPercent: 15 });
    await check('DCM cannot self-approve', 'POST', `/crm/quotations/${dcmQuote.payload.data.id}/discount/approve`, {
      expect: 403,
    });
    token = adminToken;
  }

  section('Documents (Steps 6 & 7)');
  await checkPdf('proposal PDF', `/documents/project/${id}/proposal`);
  await checkPdf('quotation PDF', `/documents/project/${id}/quotation`);
  const invoiceList = await check('invoices for PDF', 'GET', `/accounts/invoices?project=${id}&limit=1`);
  if (invoiceList?.items?.[0]) await checkPdf('invoice PDF', `/documents/invoice/${invoiceList.items[0].id}`);

  section('Team');
  await check('users', 'GET', '/users?limit=10');
  await check('users by role', 'GET', '/users/by-role/DCM');

  section('Permissions are actually enforced');
  const installerLogin = await call('POST', '/auth/login', {
    email: 'installer@embellish.com',
    password: 'Embellish@2026',
  });
  const adminToken = token;
  token = installerLogin.payload.data.token;

  // An installer has no accounts permission; this must be refused.
  await check('installer blocked from accounts', 'GET', '/accounts/invoices', { expect: 403 });
  await check('installer can see installations', 'GET', '/project/installations');
  token = adminToken;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60) + '\n');

  process.exit(failed === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error('\nSmoke test crashed:', error.message);
  process.exit(1);
});

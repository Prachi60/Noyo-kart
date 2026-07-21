import '../loadEnv.js';
import serviceDb from '../app/modules/serviceProvider/config/db.js';
import { generateAccessToken } from '../app/modules/serviceProvider/utils/tokenService.js';
import { SP_USER_ROLES } from '../app/modules/serviceProvider/constants.js';
import SpVendor from '../app/modules/serviceProvider/models/SpVendor.js';
import SpWorker from '../app/modules/serviceProvider/models/SpWorker.js';
import SpBooking from '../app/modules/serviceProvider/models/SpBooking.js';

await serviceDb.asPromise();

const vendor = await SpVendor.findById('69468946c25bf132d7dfc428').lean();
const worker = await SpWorker.findById('69492edf27564777c999e8bb').lean();
const bookings = await SpBooking.find({ vendorId: vendor._id })
  .sort({ createdAt: -1 })
  .limit(10)
  .select('status workerId')
  .lean();

console.log('bookings', bookings.map((b) => ({ id: b._id.toString(), status: b.status })));

const vendorTok = generateAccessToken({
  userId: vendor._id.toString(),
  role: SP_USER_ROLES.VENDOR,
  loginSessionId: vendor.loginSessionId
});
const workerTok = generateAccessToken({
  userId: worker._id.toString(),
  role: SP_USER_ROLES.WORKER,
  loginSessionId: worker.loginSessionId
});

const base = 'http://localhost:7000/api/sp';
async function hit(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const pendingStatuses = new Set(['pending', 'requested', 'Pending', 'new', 'awaiting_acceptance']);
const candidate =
  bookings.find((b) => pendingStatuses.has(b.status)) || bookings[0];

if (!candidate) {
  console.log('No bookings for vendor');
  process.exit(0);
}

console.log('candidate', candidate._id.toString(), candidate.status);

const accept = await hit(
  'POST',
  `/vendors/bookings/${candidate._id}/accept`,
  vendorTok,
  {}
);
console.log('accept', accept.status, accept.data.message || accept.data.success, accept.data.error || '');

const assign = await hit(
  'POST',
  `/vendors/bookings/${candidate._id}/assign-worker`,
  vendorTok,
  { workerId: worker._id.toString() }
);
console.log('assign', assign.status, assign.data.message || assign.data.success, assign.data.error || '');

const jobs = await hit('GET', '/workers/jobs', workerTok);
const count = Array.isArray(jobs.data?.data)
  ? jobs.data.data.length
  : Array.isArray(jobs.data?.jobs)
    ? jobs.data.jobs.length
    : 'n/a';
console.log('jobs', jobs.status, jobs.data.message || jobs.data.success, `count=${count}`);

process.exit(0);

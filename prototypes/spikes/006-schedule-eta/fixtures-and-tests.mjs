import { calculateEta, hhmmToMinutes } from './calculate-eta.mjs';

const stops = [
  { id: 'stop-1', scheduledTime: '10:00' },
  { id: 'stop-2', scheduledTime: '10:15' },
  { id: 'stop-3', scheduledTime: '10:30' },
  { id: 'stop-4', scheduledTime: '10:45' },
];

const cases = [
  {
    name: 'no prior stop log uses schedule-only ETA',
    input: { stops, targetStopId: 'stop-3', nowMinutes: hhmmToMinutes('10:10') },
    expect: { status: 'schedule_only', etaMinutes: 20 },
  },
  {
    name: 'late bus applies positive observed delay',
    input: {
      stops,
      targetStopId: 'stop-3',
      nowMinutes: hhmmToMinutes('10:20'),
      latestConfirmedStopId: 'stop-2',
      latestConfirmedAtMinutes: hhmmToMinutes('10:22'), // +7 late vs 10:15
    },
    expect: { status: 'predicted', etaMinutes: 17, observedDelayMinutes: 7 },
  },
  {
    name: 'early bus applies negative observed delay',
    input: {
      stops,
      targetStopId: 'stop-3',
      nowMinutes: hhmmToMinutes('10:20'),
      latestConfirmedStopId: 'stop-2',
      latestConfirmedAtMinutes: hhmmToMinutes('10:12'), // -3 early
    },
    expect: { status: 'predicted', etaMinutes: 7, observedDelayMinutes: -3 },
  },
  {
    name: 'final stop ETA clamps at zero if predicted time already passed',
    input: {
      stops,
      targetStopId: 'stop-4',
      nowMinutes: hhmmToMinutes('11:10'),
      latestConfirmedStopId: 'stop-3',
      latestConfirmedAtMinutes: hhmmToMinutes('10:50'), // +20
    },
    expect: { status: 'predicted', etaMinutes: 0, observedDelayMinutes: 20 },
  },
  {
    name: 'loop rollover schedule-only behaves forward in time',
    input: { stops, targetStopId: 'stop-1', nowMinutes: hhmmToMinutes('23:55') },
    expect: { status: 'schedule_only', etaMinutes: 605 },
  },
  {
    name: 'missing latest confirmed stop id falls back safely',
    input: {
      stops,
      targetStopId: 'stop-2',
      nowMinutes: hhmmToMinutes('10:05'),
      latestConfirmedStopId: 'missing-stop',
      latestConfirmedAtMinutes: hhmmToMinutes('10:00'),
    },
    expect: { status: 'schedule_only', etaMinutes: 10 },
  },
  {
    name: 'multiple buses downgrades confidence',
    input: {
      stops,
      targetStopId: 'stop-3',
      nowMinutes: hhmmToMinutes('10:20'),
      latestConfirmedStopId: 'stop-2',
      latestConfirmedAtMinutes: hhmmToMinutes('10:22'),
      activeBusCount: 2,
    },
    expect: { status: 'predicted_low_confidence', etaMinutes: 17 },
  },
  {
    name: 'service ended returns no ETA',
    input: {
      stops,
      targetStopId: 'stop-2',
      nowMinutes: hhmmToMinutes('11:00'),
      serviceEnded: true,
    },
    expect: { status: 'service_ended', etaMinutes: null },
  },
];

let pass = 0;
for (const tc of cases) {
  const out = calculateEta(tc.input);
  const ok = Object.entries(tc.expect).every(([k, v]) => out[k] === v);
  if (!ok) {
    console.error(`FAIL: ${tc.name}`);
    console.error(' expected:', tc.expect);
    console.error(' actual  :', out);
    process.exitCode = 1;
  } else {
    pass += 1;
    console.log(`PASS: ${tc.name}`);
  }
}

console.log(`\n${pass}/${cases.length} passed`);

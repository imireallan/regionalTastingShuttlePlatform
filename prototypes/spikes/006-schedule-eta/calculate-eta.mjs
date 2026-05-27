export function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHhmm(total) {
  const normalized = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60).toString().padStart(2, '0');
  const m = (normalized % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function forwardDeltaMinutes(from, to) {
  const d = to - from;
  return d >= 0 ? d : d + 1440;
}

export function calculateEta({
  stops,
  targetStopId,
  nowMinutes,
  latestConfirmedStopId,
  latestConfirmedAtMinutes,
  activeBusCount = 1,
  serviceEnded = false,
}) {
  if (serviceEnded) {
    return { status: 'service_ended', etaMinutes: null, etaClock: null, reason: 'service-ended' };
  }

  const target = stops.find((s) => s.id === targetStopId);
  if (!target) {
    return { status: 'unavailable', etaMinutes: null, etaClock: null, reason: 'target-stop-not-found' };
  }

  const targetSched = hhmmToMinutes(target.scheduledTime);

  // No confirmed logs yet -> schedule-only
  if (!latestConfirmedStopId || latestConfirmedAtMinutes == null) {
    const eta = forwardDeltaMinutes(nowMinutes, targetSched);
    return { status: 'schedule_only', etaMinutes: eta, etaClock: minutesToHhmm(nowMinutes + eta), reason: 'no-confirmed-log' };
  }

  const latest = stops.find((s) => s.id === latestConfirmedStopId);
  if (!latest) {
    const eta = forwardDeltaMinutes(nowMinutes, targetSched);
    return { status: 'schedule_only', etaMinutes: eta, etaClock: minutesToHhmm(nowMinutes + eta), reason: 'latest-stop-not-found' };
  }

  const latestSched = hhmmToMinutes(latest.scheduledTime);
  const observedDelay = latestConfirmedAtMinutes - latestSched; // can be negative (early)

  // V1 model: apply a single route delay offset to schedule.
  const predictedTargetAt = targetSched + observedDelay;
  const eta = Math.max(0, predictedTargetAt - nowMinutes);

  // simple confidence downgrade rules
  let status = 'predicted';
  if (activeBusCount > 1) status = 'predicted_low_confidence';

  return {
    status,
    etaMinutes: eta,
    etaClock: minutesToHhmm(nowMinutes + eta),
    reason: 'schedule-plus-observed-delay',
    observedDelayMinutes: observedDelay,
  };
}

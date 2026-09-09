// Attendance State Machine — pure functions, no side effects.
// States: OUT, IN, BREAK, PENDING_REVIEW, LOCKED
// Actions: CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END

const STATES = Object.freeze({
  OUT: 'OUT',
  IN: 'IN',
  BREAK: 'BREAK',
  PENDING_REVIEW: 'PENDING_REVIEW',
  LOCKED: 'LOCKED',
});

const ACTIONS = Object.freeze({
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
  BREAK_START: 'BREAK_START',
  BREAK_END: 'BREAK_END',
});

const TRANSITIONS = Object.freeze({
  OUT:            { CHECK_IN:    'IN' },
  IN:             { CHECK_OUT:   'OUT', BREAK_START: 'BREAK' },
  BREAK:          { BREAK_END:   'IN' },
  // A pending-review event (e.g. an unclosed previous day) must not block today's
  // clock-in — otherwise anomalies pile up while the user waits for admin review.
  // The open anomaly stays flagged (see attendance-v2.js has_open_anomalies) until
  // an admin resolves it; only the ability to keep working is unblocked here.
  PENDING_REVIEW: { CHECK_IN:    'IN' },
});

const ANOMALY_TYPES = Object.freeze({
  OUT_OF_SHIFT: 'OUT_OF_SHIFT',
  MISSING_ENTRY: 'MISSING_ENTRY',
  DOUBLE_TRANSITION: 'DOUBLE_TRANSITION',
  DAY_NEVER_CLOSED: 'DAY_NEVER_CLOSED',
});

/**
 * Apply a transition: given currentState and intent, return the new state.
 * Returns null if the transition is invalid.
 */
function applyTransition(currentState, intent) {
  const stateTransitions = TRANSITIONS[currentState];
  if (!stateTransitions) return null;
  return stateTransitions[intent] || null;
}

/**
 * When the action is unambiguous (only one possible transition from current state),
 * return that action. Otherwise return null (UI must disambiguate, e.g., IN → CHECK_OUT or BREAK_START).
 */
function autoDetermineAction(currentState) {
  const stateTransitions = TRANSITIONS[currentState];
  if (!stateTransitions) return null;
  const keys = Object.keys(stateTransitions);
  return keys.length === 1 ? keys[0] : null;
}

/**
 * Check if an intent is a valid transition for a given state.
 */
function isValidTransition(currentState, intent) {
  return applyTransition(currentState, intent) !== null;
}

/**
 * List the valid intents for a given state.
 */
function validIntentsFor(currentState) {
  return Object.keys(TRANSITIONS[currentState] || {});
}

/**
 * Convert "HH:MM" or "HH:MM:SS" to decimal hours (e.g., "08:30" → 8.5).
 */
function timeToDecimal(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h + (m || 0) / 60;
}

/**
 * Check if a Date falls within the company's work shift hours (morning OR afternoon slot).
 * Returns true if within shift, false if outside.
 */
function isWithinWorkShift(date, workShifts) {
  if (!workShifts) return true; // no shift configured → always valid
  const time = date.getHours() + date.getMinutes() / 60;

  const morningStart = timeToDecimal(workShifts.morning_start);
  const morningEnd = timeToDecimal(workShifts.morning_end);
  const afternoonStart = timeToDecimal(workShifts.afternoon_start);
  const afternoonEnd = timeToDecimal(workShifts.afternoon_end);

  const inMorning = morningStart != null && morningEnd != null && time >= morningStart && time <= morningEnd;
  const inAfternoon = afternoonStart != null && afternoonEnd != null && time >= afternoonStart && time <= afternoonEnd;

  return inMorning || inAfternoon;
}

/**
 * Detect anomalies in a sorted (by occurred_at ASC) list of events for a single day.
 * Returns the anomaly_type to flag, or null if none.
 *
 * Currently used to validate a NEW event before insertion, given the previous events of the day.
 * For DOUBLE_TRANSITION: if the previous event has the same detected_action, flag it.
 */
function detectAnomalyForNewEvent({ previousEvents, newAction, newOccurredAt, workShifts }) {
  // OUT_OF_SHIFT: scan outside configured work hours
  if (workShifts && !isWithinWorkShift(newOccurredAt, workShifts)) {
    return ANOMALY_TYPES.OUT_OF_SHIFT;
  }

  // DOUBLE_TRANSITION: previous valid event has same detected_action
  const lastValidEvent = previousEvents.filter((e) => e.status === 'valid').pop();
  if (lastValidEvent && lastValidEvent.detected_action === newAction) {
    return ANOMALY_TYPES.DOUBLE_TRANSITION;
  }

  return null;
}

/**
 * Build a human-readable Italian message for a transition outcome.
 * Used by API responses to mobile/web.
 */
function buildTransitionMessage(action, occurredAt) {
  const time = occurredAt instanceof Date
    ? occurredAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
    : '';
  switch (action) {
    case ACTIONS.CHECK_IN:    return `Entrata registrata alle ${time}`;
    case ACTIONS.CHECK_OUT:   return `Uscita registrata alle ${time}`;
    case ACTIONS.BREAK_START: return `Inizio pausa alle ${time}`;
    case ACTIONS.BREAK_END:   return `Fine pausa alle ${time}`;
    default: return 'Timbratura registrata';
  }
}

/**
 * Build an Italian error message for an invalid transition attempt.
 */
function buildInvalidTransitionError(currentState, intent) {
  const stateLabel = {
    OUT: 'fuori sede',
    IN: 'dentro la sede',
    BREAK: 'in pausa',
    PENDING_REVIEW: 'in stato di revisione',
    LOCKED: 'in stato bloccato',
  }[currentState] || currentState;

  const intentLabel = {
    CHECK_IN: 'entrare',
    CHECK_OUT: 'uscire',
    BREAK_START: 'iniziare la pausa',
    BREAK_END: 'terminare la pausa',
  }[intent] || intent;

  return `Impossibile ${intentLabel}: risulti già ${stateLabel}.`;
}

module.exports = {
  STATES,
  ACTIONS,
  TRANSITIONS,
  ANOMALY_TYPES,
  applyTransition,
  autoDetermineAction,
  isValidTransition,
  validIntentsFor,
  isWithinWorkShift,
  detectAnomalyForNewEvent,
  buildTransitionMessage,
  buildInvalidTransitionError,
};

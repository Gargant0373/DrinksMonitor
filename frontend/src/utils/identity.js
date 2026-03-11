/* Participant identity persisted in localStorage */

const KEY_PREFIX = "dg_participant_";

export function getParticipantId(sessionId) {
  return localStorage.getItem(`${KEY_PREFIX}${sessionId}`) ?? null;
}

export function setParticipantId(sessionId, participantId) {
  localStorage.setItem(`${KEY_PREFIX}${sessionId}`, participantId);
}

export function getLastLogId(sessionId) {
  return localStorage.getItem(`${KEY_PREFIX}${sessionId}_lastlog`) ?? null;
}

export function setLastLogId(sessionId, logId) {
  if (logId) {
    localStorage.setItem(`${KEY_PREFIX}${sessionId}_lastlog`, logId);
  } else {
    localStorage.removeItem(`${KEY_PREFIX}${sessionId}_lastlog`);
  }
}

export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
export const fail = (status, code, message, details) => { throw new ApiError(status,code,message,details); };
export function text(value, field, { min = 1, max = 2000, fallback } = {}) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(400,'VALIDATION_ERROR',`${field} must be a string of ${min}–${max} characters.`,{ field });
  return value.trim();
}
export function integer(value, field, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < min || number > max) fail(400,'VALIDATION_ERROR',`${field} must be an integer between ${min} and ${max}.`,{field});
  return number;
}
export function enumeration(value, field, allowed, fallback) {
  if (value === undefined && fallback !== undefined) return fallback;
  if (!allowed.includes(value)) fail(400,'VALIDATION_ERROR',`${field} must be one of: ${allowed.join(', ')}.`,{field});
  return value;
}
export function boolean(value, field) { if (typeof value !== 'boolean') fail(400,'VALIDATION_ERROR',`${field} must be a boolean.`,{field}); return value; }
export function list(value, field, max = 5000) { if (!Array.isArray(value) || value.length > max) fail(400,'VALIDATION_ERROR',`${field} must be an array of at most ${max} items.`,{field}); return value; }
export function pagination(query) { return { limit: integer(query.get('limit') ?? 20,'limit',{max:100}), offset: integer(query.get('offset') ?? 0,'offset',{min:0,max:1000000}) }; }
export function isoDate(value, field) { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) fail(400,'VALIDATION_ERROR',`${field} must be an ISO date.`); return new Date(value).toISOString(); }
export const normalize = value => value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' ').replace(/[.!?。！？]+$/u,'');

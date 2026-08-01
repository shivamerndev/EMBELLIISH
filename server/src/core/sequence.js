import mongoose from 'mongoose';

/**
 * Atomic document numbering. Every business document the client ever sees —
 * lead, project, quotation, PO, invoice — needs a stable human-readable code,
 * and two coordinators saving at once must not collide.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/**
 * @param {string} prefix e.g. 'PRJ'
 * @param {object} options
 * @param {boolean} [options.yearly=true] restart numbering each calendar year
 * @param {number}  [options.pad=4]
 */
const nextCode = async (prefix, { yearly = true, pad = 4 } = {}) => {
  const year = new Date().getFullYear();
  const scope = yearly ? `${prefix}-${year}` : prefix;

  const counter = await Counter.findByIdAndUpdate(
    scope,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const serial = String(counter.seq).padStart(pad, '0');
  return yearly ? `${prefix}-${year}-${serial}` : `${prefix}-${serial}`;
};

export default nextCode;
export { Counter, nextCode };

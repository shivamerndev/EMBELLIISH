import mongoose from 'mongoose';

/** Reusable sub-schema for an uploaded photo / video / drawing. */
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    filename: String,
    mimetype: String,
    size: Number,
    caption: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/** Reusable sub-schema for "who did what, when" trails on workflow documents. */
const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    from: String,
    to: String,
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
  },
  { _id: false }
);

/**
 * Normalises every document's JSON shape: `id` instead of `_id`, no `__v`.
 * Applied globally so the client never has to care about mongoose internals.
 */
const applyJsonTransform = (schema) => {
  const transform = (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  };
  schema.set('toJSON', { virtuals: true, transform });
  schema.set('toObject', { virtuals: true, transform });
  return schema;
};

export { attachmentSchema, auditEntrySchema, addressSchema, applyJsonTransform };

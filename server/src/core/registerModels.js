/**
 * Imports every model so mongoose knows about all of them.
 *
 * `populate` resolves a ref by model *name*, which only exists once that model's
 * module has been imported. The HTTP server gets this for free because the route
 * index pulls in everything, but a script that imports one service would hit
 * "Schema hasn't been registered for model X" the moment a populate crossed a
 * module boundary. Registering centrally at connection time removes the trap.
 */
import '../modules/user/user.model.js';
import '../modules/crm/architect/architect.model.js';
import '../modules/crm/lead/lead.model.js';
import '../modules/inventory/fabric/fabric.model.js';
import '../modules/notification/notification.model.js';
import '../modules/pricing/pricing.model.js';
import '../modules/settings/settings.model.js';
import '../core/sequence.js';

export default function registerModels() {
  // The imports above are the whole job; this exists so callers can be explicit.
}

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
import '../modules/crm/client/client.model.js';
import '../modules/crm/lead/lead.model.js';
import '../modules/crm/followup/followup.model.js';
import '../modules/crm/quotation/quotation.model.js';
import '../modules/project/project/project.model.js';
import '../modules/project/room/room.model.js';
import '../modules/project/measurement/measurement.model.js';
import '../modules/project/sitevisit/sitevisit.model.js';
import '../modules/project/boq/boq.model.js';
import '../modules/project/design/design.model.js';
import '../modules/project/drawing/drawing.model.js';
import '../modules/project/installation/installation.model.js';
import '../modules/project/snag/snag.model.js';
import '../modules/inventory/vendor/vendor.model.js';
import '../modules/inventory/fabric/fabric.model.js';
import '../modules/inventory/motor/motor.model.js';
import '../modules/inventory/accessory/accessory.model.js';
import '../modules/inventory/stock/stock.model.js';
import '../modules/inventory/stock/stockMovement.model.js';
import '../modules/inventory/purchase/purchase.model.js';
import '../modules/production/production/production.model.js';
import '../modules/production/qc/qc.model.js';
import '../modules/production/packing/packing.model.js';
import '../modules/production/dispatch/dispatch.model.js';
import '../modules/accounts/invoice/invoice.model.js';
import '../modules/accounts/payment/payment.model.js';
import '../modules/accounts/transaction/transaction.model.js';
import '../modules/notification/notification.model.js';
import '../modules/pricing/pricing.model.js';
import '../modules/settings/settings.model.js';
import '../core/sequence.js';

export default function registerModels() {
  // The imports above are the whole job; this exists so callers can be explicit.
}

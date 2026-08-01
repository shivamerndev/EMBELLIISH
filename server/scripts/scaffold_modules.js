/**
 * RETIRED — do not run.
 *
 * This script generated the original placeholder modules: eight near-identical
 * files per module, each a name/code/status CRUD stub with no domain logic.
 * Those modules have since been replaced with the real implementation, and
 * re-running the generator would overwrite working code with stubs.
 *
 * The architecture it produced no longer applies either. Modules now share
 * behaviour through `src/core/`:
 *
 *   BaseRepository   data access, filtering, pagination
 *   BaseService      read/write with not-found handling
 *   BaseController   the standard REST surface
 *   crudRouter       routing with permission guards and zod validation
 *   defineModule     wires all four for modules that really are plain CRUD
 *
 * To add a module:
 *   1. write `<name>.model.js` — the schema, with the domain fields it needs
 *   2. write `<name>.routes.js` — call `defineModule({ model, label, … })`
 *   3. register it in `src/routes/index.js`
 *   4. import the model in `src/core/registerModels.js` so populate can find it
 *
 * If the module has business rules (a state machine, gates, generated documents),
 * give it explicit `.service.js` and `.controller.js` files instead — see
 * `modules/project/project` or `modules/project/boq` for the shape.
 */

console.error(
  [
    'scaffold_modules.js is retired and will not run.',
    '',
    'It generated the placeholder modules that have since been replaced with the',
    'real implementation. Running it would overwrite working code with stubs.',
    '',
    'To add a module, see the notes at the top of this file.',
  ].join('\n')
);

process.exit(1);

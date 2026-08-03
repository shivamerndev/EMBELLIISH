import React, { useEffect, useState } from 'react';
import { Settings2, IndianRupee, Percent, Ruler, Save, Plus, Archive } from 'lucide-react';
import { settingsApi, pricingApi } from '../../api';
import { useAsync, useAction } from '../../hooks/useAsync';
import { currency, date } from '../../utils/format';
import {
  Panel, PanelHeader, PageHeader, Tabs, Table, Button, Badge, Field, Input, Textarea, Select, Modal,
  Loading, ErrorState, EmptyState,
} from '../../components/ui';

/**
 * Modules 7 and 20 — the Pricing Master and the house rules.
 *
 * Everything on this page used to live in someone's head or a constant in the
 * code: what counts as a big discount, what the payment split is, what a running
 * foot of stitching costs. Putting it here is what lets the founder change the
 * rules without a deploy.
 */

const TABS = [
  { key: 'company', label: 'Company' },
  { key: 'rules', label: 'Business rules' },
  { key: 'calculation', label: 'Calculation defaults' },
  { key: 'pricing', label: 'Pricing master' },
];

const RATE_CARD_HINTS = {
  FABRIC: 'Curtain fabric, per metre',
  BLACKOUT: 'Blackout lining, per metre',
  CURTAIN_STITCHING: 'Curtain stitching, per running foot',
  LEAD_BAND: 'Lead band, per running foot',
  ROMAN_STITCHING: 'Roman stitching, per sq ft',
  TRACK: 'Track & brackets, per running foot',
  MOTOR: 'Motor & remote, per piece',
  INSTALLATION: 'Installation, per running foot',
};

/* ------------------------------------------------------------- settings */

const Section = ({ title, hint, children }) => (
  <div className="px-5 py-4 border-b border-slate-800 last:border-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
    {hint && <p className="text-[11px] text-slate-600 mt-0.5 mb-3">{hint}</p>}
    <div className={hint ? '' : 'mt-3'}>{children}</div>
  </div>
);

const CompanyTab = ({ settings, save, saving }) => {
  const [form, setForm] = useState(settings.company || {});
  useEffect(() => setForm(settings.company || {}), [settings]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setAddress = (key) => (e) =>
    setForm((p) => ({ ...p, address: { ...(p.address || {}), [key]: e.target.value } }));

  return (
    <Panel>
      <PanelHeader
        title="Company details"
        subtitle="Printed on every proposal, quotation and invoice"
        icon={Settings2}
        actions={
          <Button size="sm" icon={Save} loading={saving} onClick={() => save({ company: form })}>
            Save
          </Button>
        }
      />

      <Section title="Identity">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Trading name"><Input value={form.name || ''} onChange={set('name')} placeholder="Embelliish" /></Field>
          <Field label="Legal name"><Input value={form.legalName || ''} onChange={set('legalName')} /></Field>
          <Field label="GSTIN"><Input value={form.gstin || ''} onChange={set('gstin')} /></Field>
          <Field label="PAN"><Input value={form.pan || ''} onChange={set('pan')} /></Field>
          <Field label="Phone"><Input value={form.phone || ''} onChange={set('phone')} /></Field>
          <Field label="Email"><Input value={form.email || ''} onChange={set('email')} /></Field>
          <Field label="Website"><Input value={form.website || ''} onChange={set('website')} /></Field>
        </div>
      </Section>

      <Section title="Registered address">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Line 1"><Input value={form.address?.line1 || ''} onChange={setAddress('line1')} /></Field>
          <Field label="Line 2"><Input value={form.address?.line2 || ''} onChange={setAddress('line2')} /></Field>
          <Field label="City"><Input value={form.address?.city || ''} onChange={setAddress('city')} /></Field>
          <Field label="State"><Input value={form.address?.state || ''} onChange={setAddress('state')} /></Field>
          <Field label="Pincode"><Input value={form.address?.pincode || ''} onChange={setAddress('pincode')} /></Field>
        </div>
      </Section>

      <Section title="Bank details" hint="Shown on invoices so the client knows where to pay">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Bank"><Input value={form.bankName || ''} onChange={set('bankName')} /></Field>
          <Field label="Account number"><Input value={form.bankAccount || ''} onChange={set('bankAccount')} /></Field>
          <Field label="IFSC"><Input value={form.bankIfsc || ''} onChange={set('bankIfsc')} /></Field>
        </div>
      </Section>

      <Section title="Standard terms" hint="Appears at the foot of every quotation that does not carry its own">
        <Textarea rows={4} value={form.termsAndConditions || ''} onChange={set('termsAndConditions')} />
      </Section>
    </Panel>
  );
};

const RulesTab = ({ settings, save, saving, error }) => {
  const [form, setForm] = useState({
    discount: settings.discount || {},
    payment: settings.payment || {},
    tax: settings.tax || {},
    notifications: settings.notifications || {},
  });

  useEffect(() => {
    setForm({
      discount: settings.discount || {},
      payment: settings.payment || {},
      tax: settings.tax || {},
      notifications: settings.notifications || {},
    });
  }, [settings]);

  const setIn = (section, key) => (e) =>
    setForm((p) => ({ ...p, [section]: { ...p[section], [key]: Number(e.target.value) } }));

  const toggle = (key) => (e) =>
    setForm((p) => ({ ...p, notifications: { ...p.notifications, [key]: e.target.checked } }));

  const split =
    (Number(form.payment.tokenPercent) || 0) +
    (Number(form.payment.advancePercent) || 0) +
    (Number(form.payment.balancePercent) || 0);

  return (
    <Panel>
      <PanelHeader
        title="Business rules"
        subtitle="The thresholds the workflow enforces"
        icon={Percent}
        actions={
          <Button size="sm" icon={Save} loading={saving} onClick={() => save(form)}>
            Save
          </Button>
        }
      />

      {error && <p className="px-5 pt-3 text-xs text-rose-400">{error.message}</p>}

      <Section
        title="Discount approval"
        hint='Step 7 — "Agar DCM 10% se jyada discount dega, to Founder approval lagega."'
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Founder approval above (%)" hint="A DCM may discount up to this without asking">
            <Input
              type="number"
              step="0.5"
              value={form.discount.approvalThresholdPercent ?? 10}
              onChange={setIn('discount', 'approvalThresholdPercent')}
            />
          </Field>
          <Field label="Absolute ceiling (%)" hint="Nobody can approve past this. 100 = no ceiling">
            <Input
              type="number"
              step="0.5"
              value={form.discount.maximumPercent ?? 100}
              onChange={setIn('discount', 'maximumPercent')}
            />
          </Field>
        </div>
      </Section>

      <Section title="Payment schedule" hint="Steps 9, 10 and 18 — what new projects inherit">
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Token (%)">
            <Input type="number" value={form.payment.tokenPercent ?? 10} onChange={setIn('payment', 'tokenPercent')} />
          </Field>
          <Field label="Advance (%)">
            <Input type="number" value={form.payment.advancePercent ?? 60} onChange={setIn('payment', 'advancePercent')} />
          </Field>
          <Field label="Balance (%)">
            <Input type="number" value={form.payment.balancePercent ?? 30} onChange={setIn('payment', 'balancePercent')} />
          </Field>
          <Field label="Invoice due (days)">
            <Input type="number" value={form.payment.invoiceDueDays ?? 7} onChange={setIn('payment', 'invoiceDueDays')} />
          </Field>
        </div>
        <p className={`text-[11px] mt-2 ${split === 100 ? 'text-slate-500' : 'text-rose-400'}`}>
          Adds up to {split}% {split === 100 ? '' : '— must be exactly 100% before this will save'}
        </p>
      </Section>

      <Section title="Tax">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Default GST (%)">
            <Input type="number" step="0.5" value={form.tax.gstPercent ?? 18} onChange={setIn('tax', 'gstPercent')} />
          </Field>
        </div>
      </Section>

      <Section title="Notifications" hint='Module 19 — "WhatsApp nahi. ERP me."'>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {[
            ['emailEnabled', 'Also send by email'],
            ['notifyOnStageAdvance', 'When a project moves a stage'],
            ['notifyOnPayment', 'When a payment clears'],
            ['notifyOnQcFailure', 'When a piece fails QC'],
            ['notifyOnSnag', 'When a snag is raised on site'],
            ['notifyOnLowStock', 'When stock falls below reorder level'],
          ].map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.notifications[key])}
                onChange={toggle(key)}
                className="w-4 h-4 rounded border-[#3d3026] bg-[#120f0d] text-brand-500 focus:ring-brand-500/40 focus:ring-2 accent-brand-500"
              />
              <span className="text-sm text-stone-300">{label}</span>
            </label>
          ))}
        </div>
      </Section>
    </Panel>
  );
};

const CalculationTab = ({ settings, save, saving }) => {
  const [form, setForm] = useState(settings.consumptionDefaults || {});
  useEffect(() => setForm(settings.consumptionDefaults || {}), [settings]);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: Number(e.target.value) }));

  const group = (title, hint, fields) => (
    <Section title={title} hint={hint}>
      <div className="grid sm:grid-cols-3 gap-4">
        {fields.map(([key, label, step = '0.1']) => (
          <Field key={key} label={label}>
            <Input type="number" step={step} value={form[key] ?? ''} onChange={set(key)} />
          </Field>
        ))}
      </div>
    </Section>
  );

  return (
    <Panel>
      <PanelHeader
        title="Calculation defaults"
        subtitle="What the consumption engine assumes when a project says nothing"
        icon={Ruler}
        actions={
          <Button size="sm" icon={Save} loading={saving} onClick={() => save({ consumptionDefaults: form })}>
            Save
          </Button>
        }
      />

      {group(
        'Ready size allowances',
        'Step 4 — added to the measured opening to get the finished size. Zero means the surveyor already records finished drops.',
        [
          ['readyWidthAllowanceInch', 'Drape width (in)'],
          ['readyDropAllowanceInch', 'Drape drop (in)'],
          ['romanReadyWidthAllowanceInch', 'Blind width (in)'],
          ['romanReadyDropAllowanceInch', 'Blind drop (in)'],
        ]
      )}

      {group('Fullness', 'The gather ratio — 2.5x is the house standard for main drapes', [
        ['fullness', 'Main drape'],
        ['sheerFullness', 'Sheer'],
        ['romanFullness', 'Roman blind'],
      ])}

      {group('Fabric bolt', 'Usable width after selvedge and side hems', [
        ['fabricWidthInch', 'Drape bolt (in)'],
        ['romanFabricWidthInch', 'Roman bolt (in)'],
      ])}

      {group('Cutting allowances', 'Added to the finished drop for bottom hem and heading tape', [
        ['heightAllowanceInch', 'Drape hem + heading (in)'],
        ['romanHeightAllowanceInch', 'Roman hem (in)'],
        ['patternRepeatAllowanceM', 'Pattern repeat (m)', '0.01'],
        ['wastagePercent', 'Wastage (%)', '0.5'],
      ])}
    </Panel>
  );
};

/* -------------------------------------------------------------- pricing */

const PublishRateModal = ({ open, onClose, onDone }) => {
  const [form, setForm] = useState({ key: 'FABRIC', particular: '', category: 'MATERIAL', unit: 'mtr', rate: '', costRate: '' });

  const { execute, pending, error } = useAction((payload) => pricingApi.create(payload), {
    onSuccess: () => { onDone(); onClose(); },
  });

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publish a rate"
      subtitle="The rate in force from today. The one it replaces is closed off, not overwritten."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              execute({
                ...form,
                particular: form.particular || RATE_CARD_HINTS[form.key] || form.key,
                rate: Number(form.rate),
                costRate: form.costRate ? Number(form.costRate) : undefined,
              })
            }
          >
            Publish
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-xs text-rose-400">{error.message}</p>}

        <Field label="Rate-card key" required hint={RATE_CARD_HINTS[form.key]}>
          <Select
            value={form.key}
            onChange={set('key')}
            options={Object.keys(RATE_CARD_HINTS).map((key) => ({ value: key, label: key.replace(/_/g, ' ') }))}
          />
        </Field>
        <Field label="Particular" hint="Blank uses the standard wording">
          <Input value={form.particular} onChange={set('particular')} placeholder={RATE_CARD_HINTS[form.key]} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <Select
              value={form.category}
              onChange={set('category')}
              options={['MATERIAL', 'LABOUR', 'HARDWARE', 'SERVICE', 'OTHER'].map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label="Unit">
            <Select
              value={form.unit}
              onChange={set('unit')}
              options={['mtr', 'rnft', 'sqft', 'pcs', 'set'].map((v) => ({ value: v, label: v }))}
            />
          </Field>
          <Field label="Selling rate" required>
            <Input type="number" value={form.rate} onChange={set('rate')} placeholder="1350" />
          </Field>
          <Field label="Cost rate" hint="For the margin report">
            <Input type="number" value={form.costRate} onChange={set('costRate')} />
          </Field>
        </div>
      </div>
    </Modal>
  );
};

const PricingTab = () => {
  const [publishing, setPublishing] = useState(false);

  const { data: items, loading, error, reload } = useAsync(
    () => pricingApi.list({ limit: 100 }).then((r) => r.data.items),
    []
  );
  const { data: coverage, reload: reloadCoverage } = useAsync(() => pricingApi.coverage().then((r) => r.data), []);

  const refresh = () => { reload(); reloadCoverage(); };
  const retire = useAction((id) => pricingApi.retire(id), { onSuccess: refresh });

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const missing = (coverage || []).filter((row) => !row.published);

  const columns = [
    { key: 'key', header: 'Key', render: (r) => <span className="font-mono text-xs">{r.key}</span> },
    { key: 'particular', header: 'Particular' },
    { key: 'category', header: 'Category', render: (r) => <Badge tone="slate">{r.category}</Badge> },
    { key: 'unit', header: 'Unit', render: (r) => <span className="text-slate-500 text-xs">{r.unit}</span> },
    { key: 'rate', header: 'Rate', align: 'right', render: (r) => currency(r.rate) },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      render: (r) => (r.costRate ? currency(r.costRate) : <span className="text-slate-600">—</span>),
    },
    { key: 'from', header: 'In force from', render: (r) => date(r.effectiveFrom) },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        !r.isActive || r.effectiveTo ? <Badge tone="slate">Superseded</Badge> : <Badge tone="green">Live</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) =>
        r.isActive && !r.effectiveTo ? (
          <button
            type="button"
            onClick={() => retire.execute(r.id)}
            className="p-1.5 text-slate-600 hover:text-amber-400 rounded transition"
            title="Retire this rate"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <p className="text-xs font-semibold text-amber-300">
            {missing.length} chargeable line(s) have no published rate
          </p>
          <p className="text-[11px] text-amber-200/80 mt-1">
            {missing.map((row) => row.key).join(', ')} — these fall back to the calculation defaults, and a
            line priced at zero is dropped from the quotation entirely.
          </p>
        </div>
      )}

      <Panel>
        <PanelHeader
          title="Pricing master"
          subtitle="Module 7 — the rates a quotation is built from. Rates are versioned by date, never edited in place."
          icon={IndianRupee}
          actions={
            <Button size="sm" icon={Plus} onClick={() => setPublishing(true)}>
              Publish a rate
            </Button>
          }
        />
        <Table
          columns={columns}
          rows={items}
          empty={
            <EmptyState
              title="No rates published yet"
              hint="Until a rate is published here, the consumption sheet prices from the calculation defaults."
              icon={IndianRupee}
            />
          }
        />
      </Panel>

      <PublishRateModal open={publishing} onClose={() => setPublishing(false)} onDone={refresh} />
    </div>
  );
};

/* ------------------------------------------------------------------ page */

export const SettingsPage = () => {
  const [tab, setTab] = useState('company');

  const { data: settings, loading, error, reload } = useAsync(() => settingsApi.get().then((r) => r.data), []);
  const save = useAction((patch) => settingsApi.update(patch), { onSuccess: reload });

  if (loading) return <Loading label="Loading settings…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const props = { settings, save: save.execute, saving: save.pending, error: save.error };

  return (
    <div>
      <PageHeader
        title="Settings & Masters"
        subtitle="Modules 7 and 20 — the house rules, the pricing master, and what the calculation engine assumes"
      />

      <div className="mb-4">
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      {tab === 'company' && <CompanyTab {...props} />}
      {tab === 'rules' && <RulesTab {...props} />}
      {tab === 'calculation' && <CalculationTab {...props} />}
      {tab === 'pricing' && <PricingTab />}
    </div>
  );
};

export default SettingsPage;

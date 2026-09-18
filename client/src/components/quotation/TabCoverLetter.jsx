import { Field, Input, Textarea, Button } from '../ui';
import { User, MapPin } from 'lucide-react';
import { DEFAULT_COVER_LETTER } from './quotationDefaults';

export const TabCoverLetter = ({ data, onChange }) => {
  const set = (key) => (e) => {
    onChange({ ...data, [key]: e.target.value });
  };


  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">


        {/* Left Column: Reference & Recipient */}
        <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
            <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Document Reference & Client
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quotation No.">
              <Input
                value={data.quotationNo || ''}
              className={`p-2 rounded-md text-xs`} 
                onChange={set('quotationNo')}
                placeholder="e.g. EMBRAG 520-A / 2025 -26"
              />
            </Field>

            <Field label="Estimate Date">
              <Input
              className={`p-2 rounded-md text-xs`} 
                value={data.date || ''}
                onChange={set('date')}
                placeholder="DD/MM/YYYY"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-1">
              <Field label="Salutation">
                <Input
                  value={data.clientSalutation || 'To,'}
              className={`p-2 rounded-md text-xs`} 
                  onChange={set('clientSalutation')}
                  placeholder="To,"
                />
              </Field>
            </div>
            <div className="col-span-1">
              <Field label="Client Name">
                <Input
              className={`p-2 rounded-md text-xs`} 
                  value={data.clientName || ''}
                  onChange={set('clientName')}
                  placeholder="Mr. Client Name"
                />
              </Field>
            </div>
          </div>

          <Field label="Document Subject">
            <Input
              value={data.subject || 'PROFORMA INVOICE'}
              className={`p-2 rounded-md text-xs`} 
              onChange={set('subject')}
              placeholder="e.g. PROFORMA INVOICE"
            />
          </Field>

          <Field label="Salutation Greeting">
            <Input
              className={`p-2 rounded-md text-xs`} 
              value={data.greeting || 'Respected Sir,'}
              onChange={set('greeting')}
              placeholder="Respected Sir,"
            />
          </Field>
        </div>


        {/* Letter Body & Statements */}
        <div className="p-3 rounded-xl col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Cover Letter Statement
          </span>

          <Textarea
            rows={13}
            value={data.bodyText || ''}
            onChange={set('bodyText')}
            placeholder="Please find enclosed estimate for Curtain.&#10;&#10;Should you have any queries, please feel free to contact us.&#10;&#10;We look forward to working with you."
          />

        </div>


        {/* Right Column: Embellish Address & Branding */}
        <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
            <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Embellish Registered Address
            </span>
          </div>

          <Field label="Company Address Block (Printed on Right Header)">
            <Textarea
              rows={8}
              value={data.companyAddress || ''}
              onChange={set('companyAddress')}
              className="text-xs tracking-wider"
              placeholder="Registered Embellish address and contact email"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Signatory Name">
              <Input
                value={data.signatoryName || ''}
                onChange={set('signatoryName')}
                placeholder="Mr. Hitesh Bhanushali"
              />
            </Field>
            <Field label="Company Name">
              <Input
                value={data.signatoryCompany || ''}
                onChange={set('signatoryCompany')}
                placeholder="Embellish"
              />
            </Field>
          </div>
        </div>



      </div>

    </div>
  );
};

export default TabCoverLetter;

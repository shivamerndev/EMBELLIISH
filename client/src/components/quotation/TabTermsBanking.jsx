import React from 'react';
import { Field, Input, Textarea, Button } from '../ui';
import { Landmark, ShieldCheck, RotateCcw, CreditCard, Scale } from 'lucide-react';
import { DEFAULT_TERMS_BANKING } from './quotationDefaults';

export const TabTermsBanking = ({ data, onChange }) => {
  const set = (key) => (e) => {
    onChange({ ...data, [key]: e.target.value });
  };

  const handleResetDefaults = () => {
    onChange({ ...DEFAULT_TERMS_BANKING });
  };

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Payment Milestones */}
        <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
            <CreditCard className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Payment Milestones & Inspection Policy
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Advance Milestone">
              <Input
                value={data.advancePercent || ''}
                onChange={set('advancePercent')}
                placeholder="70% Advance"
              />
            </Field>
            <Field label="Pre-Delivery Milestone">
              <Input
                value={data.deliveryPercent || ''}
                onChange={set('deliveryPercent')}
                placeholder="30% before delivery"
              />
            </Field>
          </div>

          <Field label="Inspection & Workshop Release Note">
            <Textarea
              rows={3}
              value={data.paymentInspectionNote || ''}
              onChange={set('paymentInspectionNote')}
              placeholder="(All payments must be released before installation...)"
            />
          </Field>
        </div>

        {/* Section 2: Banking Details */}
        <div className="space-y-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
            <Landmark className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Company Bank Account & Tax Registration
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="In Favour Of (Payee)">
              <Input
                value={data.favourOf || 'Embellish'}
                onChange={set('favourOf')}
                placeholder="Embellish"
              />
            </Field>
            <Field label="Bank Name">
              <Input
                value={data.bankName || 'KOTAK MAHINDRA BANK'}
                onChange={set('bankName')}
                placeholder="KOTAK MAHINDRA BANK"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Account Number">
              <Input
                value={data.accountNo || ''}
                onChange={set('accountNo')}
                placeholder="7648054150"
                className="font-mono font-bold"
              />
            </Field>
            <Field label="IFS Code">
              <Input
                value={data.ifscCode || ''}
                onChange={set('ifscCode')}
                placeholder="KKBK0000642"
                className="font-mono font-bold"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="MICR No.">
              <Input
                value={data.micrNo || ''}
                onChange={set('micrNo')}
                placeholder="400485006"
                className="font-mono"
              />
            </Field>
            <Field label="Branch">
              <Input
                value={data.branch || 'Mulund West'}
                onChange={set('branch')}
                placeholder="Mulund West"
              />
            </Field>
          </div>

          <Field label="Company GSTIN">
            <Input
              value={data.gstNo || ''}
              onChange={set('gstNo')}
              placeholder="27AIFPB1400Q1ZH"
              className="font-mono font-bold text-slate-900 dark:text-slate-100"
            />
          </Field>
        </div>
      </div>

      {/* Section 3: Terms and Conditions Clauses */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
          <Scale className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Terms & Conditions Clauses
          </span>
        </div>

        <Field label="Order Acceptance & Cancellation Policy">
          <Textarea
            rows={3}
            value={data.cancellationPolicy || ''}
            onChange={set('cancellationPolicy')}
            placeholder="Once an order has been accepted, no cancellation of that order is valid..."
          />
        </Field>

        <Field label="Prices Validity & Tax Policy">
          <Textarea
            rows={3}
            value={data.pricesValidity || ''}
            onChange={set('pricesValidity')}
            placeholder="All prices mentioned in the estimate are valid for one month..."
          />
        </Field>

        <Field label="Transportation & Onsite Work Policy">
          <Textarea
            rows={4}
            value={data.transportationPolicy || ''}
            onChange={set('transportationPolicy')}
            placeholder="All prices mentioned in the estimate are Ex-Mumbai..."
          />
        </Field>
      </div>
    </div>
  );
};

export default TabTermsBanking;

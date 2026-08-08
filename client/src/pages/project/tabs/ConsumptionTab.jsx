import { useState } from 'react';
import { Calculator, RefreshCw, FileSpreadsheet, CheckCircle2, Eye } from 'lucide-react';
import { boqApi } from '../../../api';
import { useAsync, useAction } from '../../../hooks/useAsync';
import { currency, number, date } from '../../../utils/format';
import { Panel, PanelHeader, Button, Badge, StatusBadge, Loading, ErrorState, StatTile } from '../../../components/ui';
import PreviewModal from '../components/PreviewModal';

export const ConsumptionTab = ({ projectId, project, onChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const { data: boq, loading, error, reload } = useAsync(
    () => boqApi.current(projectId).then((r) => r.data).catch(() => null),
    [projectId]
  );

  const { data: preview, reload: loadPreview } = useAsync(
    () => (previewing ? boqApi.preview(projectId, {}).then((r) => r.data) : Promise.resolve(null)),
    [projectId, previewing]
  );

  const generate = useAction(() => boqApi.generate(projectId, {}), {
    onSuccess: () => { reload(); onChange?.(); setPreviewing(false); },
  });

  const approve = useAction(() => boqApi.approve(boq.id ?? boq._id), { onSuccess: () => { reload(); onChange?.(); } });

  const handleOpenPreview = () => {
    setShowModal(true);
    if (!boq) {
      setPreviewing(true);
      loadPreview();
    }
  };

  const handleClosePreview = () => {
    setShowModal(false);
  };

  if (loading) return <Loading label="Loading consumption sheet…" />;

  const sheet = previewing && preview ? preview : boq;
  const rawRooms = previewing && preview ? preview.rooms : boq?.roomTotals
    ? boq.roomTotals.map((room) => ({
      ...room,
      lines: boq.lines ? boq.lines.filter((line) => String(line.room) === String(room.room)) : [],
    }))
    : [];

  const totals = sheet?.totals || {};
  const costing = previewing && preview ? preview.costing : boq
    ? { lines: boq.costLines, subtotal: boq.subtotal, gstPercent: boq.gstPercent, gstAmount: boq.gstAmount, grandTotal: boq.grandTotal }
    : null;

  // Group rooms and lines by Floor matching the paper sheet
  let globalSr = 1;
  const floorGroups = [];
  const floorMap = new Map();

  rawRooms.forEach((room) => {
    const floorName = room.floor || 'Main';
    if (!floorMap.has(floorName)) {
      const group = { floor: floorName, rooms: [] };
      floorMap.set(floorName, group);
      floorGroups.push(group);
    }
    const currentFloor = floorMap.get(floorName);
    currentFloor.rooms.push({
      ...room,
      lines: (room.lines || []).map((line) => ({
        ...line,
        sr: line.sr || globalSr++,
      })),
    });
  });

  const floorsList = floorGroups.map(g => g.floor).filter(Boolean);
  const floorsSummaryText = floorsList.length > 0
    ? (floorsList.length === 1 ? `${floorsList[0]} Floor` : `${floorsList.join(' and ')} Floor`)
    : 'Second and Third Floor';

  return (
    <div className="space-y-4">
      {/* Top Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatTile label="Running feet" value={number(totals.rnft)} sub="stitching & track" />
        <StatTile label="Curtain fabric" value={`${number(totals.fabricMeters)} m`} tone="violet" />
        <StatTile label="Blackout" value={`${number(totals.blackoutMeters)} m`} tone="violet" />
        <StatTile label="Roman" value={`${number(totals.romanSqft)} ft²`} tone="violet" />
        <StatTile label="Panels" value={number(totals.parts, 0)} sub="fabric drops" />
        <StatTile label="Estimated Cost" value={costing?.grandTotal ? currency(costing.grandTotal, { compact: true }) : '—'} tone="amber" />
      </div>

      {/* Main Action Banner Panel */}
      <Panel>
        <PanelHeader
          title={boq ? `Consumption Sheet (${boq.code || 'Current'})` : 'Consumption Sheet'}
          subtitle={
            boq
              ? `Revision ${boq.revision ?? 1} · Generated ${date(boq.createdAt)}`
              : 'Calculate material, stitching, and fabric requirements from room measurements'
          }
          icon={Calculator}
          actions={
            <div className="flex items-center gap-2">
              {boq ? (
                <StatusBadge status={boq.status} />
              ) : previewing ? (
                <Badge tone="amber">Unsaved Live Preview</Badge>
              ) : (
                <Badge tone="slate">Not Generated</Badge>
              )}

              {boq && boq.status !== 'APPROVED' && !previewing && (
                <Button size="sm" variant="secondary" icon={CheckCircle2} loading={approve.pending} onClick={() => approve.execute()}>
                  Approve
                </Button>
              )}

              <Button size="sm" icon={RefreshCw} loading={generate.pending} onClick={() => generate.execute()}>
                {boq ? 'Regenerate Sheet' : 'Generate Sheet'}
              </Button>
            </div>
          }
        />

        <div className="p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
              Original Client Consumption Sheet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Click the button to open a popup preview of the official paper-formatted consumption sheet with O2O/F2F window dimensions, pelmet sizes, wire status, curtain fabric requirements, and fixed cost calculations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              size="md"
              variant="primary"
              icon={Eye}
              onClick={handleOpenPreview}
              className="shadow-md"
            >
              Preview Consumption Sheet
            </Button>
          </div>
        </div>

        {generate.error && <p className="px-5 pb-3 text-xs text-rose-400">{generate.error.message}</p>}
      </Panel>

      {showModal && (
        <PreviewModal
          boq={boq}
          project={project}
          preview={preview}
          previewing={previewing}
          onClose={handleClosePreview}
        />
      )}

      {error && <ErrorState error={error} onRetry={reload} />}
    </div>
  );
};

export default ConsumptionTab;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, Briefcase, PauseCircle } from 'lucide-react';
import { projectsApi } from '../../api';
import { useAsync } from '../../hooks/useAsync';
import { currency, date } from '../../utils/format';
import {
  PageHeader, Panel, Table, Input, Select, StatusBadge, Badge, Progress,
  Loading, ErrorState, EmptyState, Pagination, ViewSwitcher,
} from '../../components/ui';
import useViewMode from '../../hooks/useViewMode';
import CardGridView from '../../components/common/CardGridView';
import ProjectCard from '../../components/cards/ProjectCard';

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useViewMode('table');
  const stages = useSelector((state) => state.meta.stages);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, loading, error, reload } = useAsync(
    () => projectsApi.list({ ...(search && { search }), ...(stage && { stage }), limit: 100 }).then((r) => r.data),
    [search, stage]
  );

  React.useEffect(() => {
    setPage(1);
  }, [search, stage]);

  const projectItems = data?.items || [];
  const paginatedProjects = projectItems.slice((page - 1) * pageSize, page * pageSize);

  const stageLabel = (key) => stages.find((s) => s.stage === key)?.label || String(key).replace(/_/g, ' ');
  const stageIndex = (key) => stages.findIndex((s) => s.stage === key);
  const progressOf = (key) => (stages.length > 1 ? (stageIndex(key) / (stages.length - 1)) * 100 : 0);

  const columns = [
    {
      key: 'project',
      header: 'Project',
      render: (project) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 dark:text-slate-200 truncate">{project.name}</p>
            {project.isOnHold && (
              <Badge tone="amber">
                <PauseCircle className="w-3 h-3 mr-1" /> On hold
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-500">{project.code}</p>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (project) => (
        <div>
          <p className="text-slate-800 dark:text-slate-300">{project.client?.name || '—'}</p>
          {project.architect && <p className="text-[11px] text-slate-600 dark:text-slate-500">{project.architect.name}</p>}
        </div>
      ),
    },
    { key: 'dcm', header: 'DCM', render: (p) => p.assignedDCM?.name || <span className="text-slate-600">—</span> },
    {
      key: 'stage',
      header: 'Stage',
      render: (project) => (
        <div className="min-w-[9rem]">
          <StatusBadge status={project.stage} label={stageLabel(project.stage)} />
          <Progress
            value={progressOf(project.stage)}
            tone={project.stage === 'CLOSED' ? 'green' : 'blue'}
            className="mt-2"
          />
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (project) => (
        <div>
          <p className="text-slate-900 dark:text-slate-200">{currency(project.contractValue || project.estimatedValue, { compact: true })}</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-500">{project.contractValue ? 'contracted' : 'estimated'}</p>
        </div>
      ),
    },
    { key: 'delivery', header: 'Delivery', render: (p) => date(p.expectedDeliveryDate) },
  ];

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Every live project and where it sits on the spine"
      />

      <Panel className="mb-4 p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:max-w-sm flex-1">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project name or code"
            className="pl-9"
          />
        </div>
        {stages.length > 0 && (
          <Select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            placeholder="All stages"
            options={stages.map((s) => ({ value: s.stage, label: s.label }))}
            className="w-full sm:w-48 text-xs"
          />
        )}
        <ViewSwitcher view={viewMode} onViewChange={setViewMode} />
      </Panel>

      <Panel>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="p-4">
                <CardGridView
                  items={paginatedProjects}
                  renderCard={(project) => (
                    <ProjectCard
                      project={project}
                      stages={stages}
                      onClick={(p) => navigate(`/projects/${p.id || p._id}`)}
                    />
                  )}
                  empty={
                    <EmptyState
                      title="No projects yet"
                      hint="Convert a qualified lead in CRM to open the first one."
                      icon={Briefcase}
                    />
                  }
                />
              </div>
            ) : (
              <Table
                columns={columns}
                rows={paginatedProjects}
                onRowClick={(project) => navigate(`/projects/${project.id}`)}
                empty={
                  <EmptyState
                    title="No projects yet"
                    hint="Convert a qualified lead in CRM to open the first one."
                    icon={Briefcase}
                  />
                }
              />
            )}
            <Pagination
              currentPage={page}
              totalItems={projectItems.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </>
        )}
      </Panel>
    </div>
  );
};

export default ProjectsPage;

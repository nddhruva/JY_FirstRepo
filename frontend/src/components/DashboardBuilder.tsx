import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { getDashboard, getDashboardAnalytics, saveDashboard } from '../api'
import type { DashboardWidget } from '../types'

interface DashboardBuilderProps {
  token: string
  tenantId: string
}

const widgetLibrary: Array<{ type: string; title: string }> = [
  { type: 'progress', title: 'Progress Ring' },
  { type: 'work-queue', title: 'Work Queue' },
  { type: 'approvals', title: 'Approvals Snapshot' },
  { type: 'errors', title: 'Error Hotspots' },
  { type: 'risk', title: 'Risk Overview' },
  { type: 'reports', title: 'Recent Reports' },
]

function SortableWidgetItem({
  widget,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  widget: DashboardWidget
  index: number
  total: number
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li ref={setNodeRef} style={style} className="widget-item">
      <div className="widget-drag-handle" {...attributes} {...listeners}>
        ⠿
      </div>
      <div>
        <strong>{widget.title}</strong>
        <p className="widget-meta">{widget.type}</p>
      </div>
      <div className="widget-actions">
        <button
          type="button"
          onClick={() => onMoveUp(widget.id)}
          disabled={index === 0}
          aria-label={`Move ${widget.title} up`}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(widget.id)}
          disabled={index === total - 1}
          aria-label={`Move ${widget.title} down`}
        >
          ↓
        </button>
        <button onClick={() => onRemove(widget.id)} aria-label={`Remove ${widget.title}`}>
          Remove
        </button>
      </div>
    </li>
  )
}

export function DashboardBuilder({ token, tenantId }: DashboardBuilderProps) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', tenantId],
    queryFn: () => getDashboard(token, tenantId),
    enabled: Boolean(token && tenantId),
  })

  const analyticsQuery = useQuery({
    queryKey: ['dashboard-analytics', tenantId],
    queryFn: () => getDashboardAnalytics(token, tenantId),
    enabled: Boolean(token && tenantId),
  })

  const saveMutation = useMutation({
    mutationFn: (widgets: DashboardWidget[]) =>
      saveDashboard(token, {
        tenantId,
        name: dashboardQuery.data?.name ?? 'My Dashboard',
        layout: { columns: 3 },
        widgets,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['dashboard', tenantId], data)
      setMessage('Dashboard configuration saved.')
    },
  })

  const widgets = useMemo(
    () => dashboardQuery.data?.widgets ?? [],
    [dashboardQuery.data?.widgets],
  )

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const oldIndex = widgets.findIndex((item) => item.id === event.active.id)
    const newIndex = widgets.findIndex((item) => item.id === event.over?.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(widgets, oldIndex, newIndex)
    queryClient.setQueryData(['dashboard', tenantId], {
      ...(dashboardQuery.data ?? {}),
      widgets: reordered,
    })
  }

  function addWidget(type: string, title: string) {
    const updated = [...widgets, { id: crypto.randomUUID(), type, title }]
    queryClient.setQueryData(['dashboard', tenantId], {
      ...(dashboardQuery.data ?? { widgets: [] }),
      userId: dashboardQuery.data?.userId ?? 'me',
      tenantId,
      name: dashboardQuery.data?.name ?? 'My Dashboard',
      isDefault: true,
      layout: { columns: 3 },
      widgets: updated,
    })
  }

  function removeWidget(id: string) {
    const updated = widgets.filter((item) => item.id !== id)
    queryClient.setQueryData(['dashboard', tenantId], {
      ...(dashboardQuery.data ?? {}),
      widgets: updated,
    })
  }

  function moveWidgetByOffset(id: string, offset: -1 | 1) {
    const index = widgets.findIndex((item) => item.id === id)
    if (index < 0) return
    const targetIndex = index + offset
    if (targetIndex < 0 || targetIndex >= widgets.length) return
    const updated = arrayMove(widgets, index, targetIndex)
    queryClient.setQueryData(['dashboard', tenantId], {
      ...(dashboardQuery.data ?? {}),
      widgets: updated,
    })
  }

  const progressData = analyticsQuery.data
    ? [
        { name: 'Complete', value: analyticsQuery.data.completions },
        { name: 'Remaining', value: Math.max(0, 100 - analyticsQuery.data.completions) },
      ]
    : []

  const exceptionData = analyticsQuery.data
    ? [
        { metric: 'Denials', value: analyticsQuery.data.denials },
        { metric: 'Errors', value: analyticsQuery.data.errors },
      ]
    : []

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Dashboard Builder</h2>
        <button
          onClick={() => saveMutation.mutate(widgets)}
          disabled={saveMutation.isPending || !widgets.length}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Dashboard'}
        </button>
      </div>
      <p className="helper-text">
        Drag and drop widgets to create a role-specific, quick-glance dashboard optimized for your
        responsibilities.
      </p>

      <div className="widget-library">
        {widgetLibrary.map((widget) => (
          <button key={widget.type} onClick={() => addWidget(widget.type, widget.title)}>
            + {widget.title}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="widget-list">
            {widgets.map((widget, index) => (
              <SortableWidgetItem
                key={widget.id}
                widget={widget}
                index={index}
                total={widgets.length}
                onMoveUp={(id) => moveWidgetByOffset(id, -1)}
                onMoveDown={(id) => moveWidgetByOffset(id, 1)}
                onRemove={removeWidget}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="analytics-grid">
        <div className="chart-card">
          <h3>Progress</h3>
          <p className="chart-subtitle">
            Current progress: <strong>{analyticsQuery.data?.progress ?? 0}%</strong>
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={progressData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                <Cell fill="#3b82f6" />
                <Cell fill="#d1d5db" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Exceptions</h3>
          <p className="chart-subtitle">Denials and errors that require focus</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={exceptionData}>
              <XAxis dataKey="metric" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="focus-list">
        <h3>Focus Items</h3>
        {analyticsQuery.data?.focusItems?.length ? (
          <ul>
            {analyticsQuery.data.focusItems.map((item, index) => (
              <li key={`${item.type}-${index}`}>
                <strong>{item.priority.toUpperCase()}</strong>: {item.message} ({item.count})
              </li>
            ))}
          </ul>
        ) : (
          <p className="helper-text">No urgent focus items right now.</p>
        )}
      </div>

      {dashboardQuery.isLoading ? <p className="helper-text">Loading dashboard...</p> : null}
      {dashboardQuery.error ? (
        <p className="error">{(dashboardQuery.error as Error).message}</p>
      ) : null}
      {analyticsQuery.error ? (
        <p className="error">{(analyticsQuery.error as Error).message}</p>
      ) : null}
      {saveMutation.error ? <p className="error">{(saveMutation.error as Error).message}</p> : null}
      {message ? <p className="success">{message}</p> : null}
    </section>
  )
}

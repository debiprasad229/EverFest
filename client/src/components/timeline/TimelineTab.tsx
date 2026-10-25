import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  RotateCcw,
  Clock, 
  Plus, 
  Trash2, 
  Edit3,
  Calendar, 
  MapPin, 
  User, 
  Flag,
  ListTodo,
  Filter,
  AlertTriangle,
  Sparkles,
  FileText,
  Check
} from 'lucide-react';
import { EventWithDetails, Task, RunOfShowItem, TaskPriority, TaskStatus } from '../../types/index.js';
import { PriorityBadge } from '../common/Badge.js';
import { ProgressBar } from '../common/ProgressBar.js';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { TextInput, Textarea, Select } from '../common/Input.js';
import { EmptyState } from '../common/EmptyState.js';
import { useToast } from '../common/ToastContext.js';
import { api } from '../../services/api.js';
import { formatDate, cn } from '../../utils/cn.js';
import { 
  calculateTaskMetrics, 
  isTaskOverdue, 
  isTaskDueToday, 
  getDaysDifference,
  generateStarterChecklist,
  TaskFormSchema
} from '../../utils/taskCalculations.js';

interface TimelineTabProps {
  event: EventWithDetails;
  onRefresh: () => void;
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ event, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'roadmap' | 'runofshow'>('roadmap');
  const [filterMode, setFilterMode] = useState<'ALL' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED' | 'MILESTONES'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');

  // Task Add/Edit Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('TODO');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskCategory, setTaskCategory] = useState('Planning');
  const [isMilestone, setIsMilestone] = useState(false);

  // Run of Show Modal state
  const [isRosModalOpen, setIsRosModalOpen] = useState(false);
  const [editingRos, setEditingRos] = useState<RunOfShowItem | null>(null);
  const [rosStartTime, setRosStartTime] = useState('16:00');
  const [rosEndTime, setRosEndTime] = useState('16:45');
  const [rosTitle, setRosTitle] = useState('');
  const [rosDescription, setRosDescription] = useState('');
  const [rosLocation, setRosLocation] = useState('');
  const [rosPicName, setRosPicName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  const { tasks = [], runOfShowItems = [] } = event;

  // Derive task metrics dynamically from source tasks
  const taskMetrics = useMemo(() => {
    return calculateTaskMetrics(tasks);
  }, [tasks]);

  // Filter tasks based on active view mode and priority
  const displayTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
        return false;
      }

      // View mode filter
      if (filterMode === 'OVERDUE') {
        return isTaskOverdue(task);
      }
      if (filterMode === 'UPCOMING') {
        return task.status !== 'COMPLETED' && !isTaskOverdue(task);
      }
      if (filterMode === 'COMPLETED') {
        return task.status === 'COMPLETED';
      }
      if (filterMode === 'MILESTONES') {
        return task.isMilestone;
      }
      return true;
    });
  }, [tasks, filterMode, priorityFilter]);

  // Open modal for Adding new task
  const handleOpenAddTaskModal = () => {
    setEditingTask(null);
    setTaskTitle('');
    // Default to event date or a week ahead
    setTaskDueDate(event.date || '');
    setTaskPriority('MEDIUM');
    setTaskStatus('TODO');
    setTaskAssignee('');
    setTaskNotes('');
    setTaskCategory('Planning');
    setIsMilestone(false);
    setIsTaskModalOpen(true);
  };

  // Open modal for Editing an existing task
  const handleOpenEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDueDate(task.dueDate || '');
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskAssignee(task.assignee || '');
    setTaskNotes(task.notes || task.description || '');
    setTaskCategory(task.category || 'Planning');
    setIsMilestone(task.isMilestone || false);
    setIsTaskModalOpen(true);
  };

  // Complete task
  const handleCompleteTask = async (task: Task) => {
    try {
      await api.updateTask(task.id, { status: 'COMPLETED' });
      success('Task Completed', `"${task.title}" marked as completed.`);
      onRefresh();
    } catch (err: any) {
      error('Failed to complete task', err.message);
    }
  };

  // Reopen task
  const handleReopenTask = async (task: Task) => {
    try {
      await api.updateTask(task.id, { status: 'TODO' });
      success('Task Reopened', `"${task.title}" reopened to active planning.`);
      onRefresh();
    } catch (err: any) {
      error('Failed to reopen task', err.message);
    }
  };

  // Delete task
  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      success('Task Deleted', `"${task.title}" removed.`);
      onRefresh();
    } catch (err: any) {
      error('Delete failed', err.message);
    }
  };

  // Save Task (Add or Edit) with Zod validation
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = TaskFormSchema.safeParse({
      title: taskTitle,
      dueDate: taskDueDate,
      priority: taskPriority,
      status: taskStatus,
      assignee: taskAssignee,
      notes: taskNotes,
      category: taskCategory,
      isMilestone,
    });

    if (!validation.success) {
      const msg = validation.error.issues[0]?.message || 'Please check task inputs';
      error('Validation Error', msg);
      return;
    }

    const { data } = validation;
    setIsSubmitting(true);

    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, {
          title: data.title,
          dueDate: data.dueDate,
          priority: data.priority,
          status: data.status,
          assignee: data.assignee || undefined,
          notes: data.notes || undefined,
          description: data.notes || undefined,
          category: data.category || undefined,
          isMilestone: data.isMilestone,
        });
        success('Task Updated', `"${data.title}" updated.`);
      } else {
        await api.addTask(event.id, {
          title: data.title,
          dueDate: data.dueDate,
          priority: data.priority,
          status: data.status,
          assignee: data.assignee || undefined,
          notes: data.notes || undefined,
          description: data.notes || undefined,
          category: data.category || undefined,
          isMilestone: data.isMilestone,
        });
        success('Task Created', `"${data.title}" added to tasks.`);
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
      onRefresh();
    } catch (err: any) {
      error('Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate starter checklist on demand
  const handleGenerateStarterChecklist = async () => {
    try {
      setIsSubmitting(true);
      await api.generateStarterTasks(event.id);
      success(
        'Checklist Generated',
        `Sensible starter roadmap created for your ${event.eventType.toLowerCase()} celebration.`
      );
      onRefresh();
    } catch (err: any) {
      error('Generation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run of Show actions
  const handleOpenEditRos = (item: RunOfShowItem) => {
    setEditingRos(item);
    setRosStartTime(item.startTime || '16:00');
    setRosEndTime(item.endTime || '');
    setRosTitle(item.title);
    setRosDescription(item.description || '');
    setRosLocation(item.location || '');
    setRosPicName(item.picName || '');
    setIsRosModalOpen(true);
  };

  const handleCreateRosItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosTitle.trim() || !rosStartTime.trim()) {
      error('Validation Error', 'Schedule block title and start time are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingRos) {
        await api.updateRunOfShowItem(editingRos.id, {
          startTime: rosStartTime,
          endTime: rosEndTime || undefined,
          title: rosTitle.trim(),
          description: rosDescription.trim() || undefined,
          location: rosLocation.trim() || undefined,
          picName: rosPicName.trim() || undefined,
        });
        success('Schedule Block Updated', `"${rosTitle}" updated.`);
      } else {
        await api.addRunOfShowItem(event.id, {
          startTime: rosStartTime,
          endTime: rosEndTime || undefined,
          title: rosTitle.trim(),
          description: rosDescription.trim() || undefined,
          location: rosLocation.trim() || undefined,
          picName: rosPicName.trim() || undefined,
        });
        success('Schedule Block Added', `"${rosTitle}" added to day-of timeline.`);
      }
      setIsRosModalOpen(false);
      setEditingRos(null);
      setRosTitle('');
      setRosDescription('');
      setRosLocation('');
      setRosPicName('');
      onRefresh();
    } catch (err: any) {
      error(editingRos ? 'Update failed' : 'Failed to add schedule block', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRosItem = async (item: RunOfShowItem) => {
    if (!confirm(`Remove "${item.title}" from timeline?`)) return;
    try {
      await api.deleteRunOfShowItem(item.id);
      success('Schedule Block Removed', `"${item.title}" removed.`);
      onRefresh();
    } catch (err: any) {
      error('Delete failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-tab Navigation and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-ivory-200/90 shadow-soft">
        
        {/* Toggle Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-ivory-100/90 rounded-2xl border border-ivory-200">
          <button
            onClick={() => setActiveSubTab('roadmap')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
              activeSubTab === 'roadmap'
                ? 'bg-white text-plum-950 shadow-soft'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <ListTodo className="w-4 h-4 text-plum-800" />
            <span>Tasks & Milestones ({taskMetrics.totalTasks})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('runofshow')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
              activeSubTab === 'runofshow'
                ? 'bg-white text-plum-950 shadow-soft'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Clock className="w-4 h-4 text-gold-600" />
            <span>Day-Of Run-of-Show ({runOfShowItems.length})</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeSubTab === 'roadmap' ? (
            <>
              {taskMetrics.totalTasks === 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateStarterChecklist}
                  isLoading={isSubmitting}
                  leftIcon={<Sparkles className="w-4 h-4 text-gold-600" />}
                >
                  Generate Starter Checklist
                </Button>
              )}
              <Button
                variant="plum"
                size="sm"
                onClick={handleOpenAddTaskModal}
                leftIcon={<Plus className="w-4 h-4 text-gold-400" />}
              >
                Add Task
              </Button>
            </>
          ) : (
            <Button
              variant="plum"
              size="sm"
              onClick={() => setIsRosModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4 text-gold-400" />}
            >
              Add Schedule Block
            </Button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: TASKS & MILESTONES ROADMAP */}
      {activeSubTab === 'roadmap' && (
        <div className="space-y-6">
          
          {/* Progress Overview Card */}
          <div className="p-6 bg-white rounded-3xl border border-ivory-200/90 shadow-soft">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Celebration Task Completion
                  </span>
                  <span className="text-sm font-mono font-bold text-plum-950">
                    {taskMetrics.progressPercent}% Completed
                  </span>
                </div>
                <ProgressBar value={taskMetrics.progressPercent} colorVariant="auto" />
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-4 self-start md:self-center border-t md:border-t-0 md:border-l border-ivory-200 pt-3 md:pt-0 md:pl-5">
                
                <div className="text-center">
                  <span className="block text-lg font-bold font-mono text-slate-900">
                    {taskMetrics.completedTasks}/{taskMetrics.totalTasks}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Done</span>
                </div>

                <div className="h-8 w-px bg-ivory-200" />

                <div className="text-center">
                  <span className="block text-lg font-bold font-mono text-emerald-700">
                    {taskMetrics.upcomingTasks}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Upcoming</span>
                </div>

                <div className="h-8 w-px bg-ivory-200" />

                <div className="text-center">
                  <span className={cn(
                    'block text-lg font-bold font-mono',
                    taskMetrics.overdueTasks > 0 ? 'text-rose-600' : 'text-slate-400'
                  )}>
                    {taskMetrics.overdueTasks}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Overdue</span>
                </div>

              </div>

            </div>
          </div>

          {/* Overdue Task Alert Banner (if any) */}
          {taskMetrics.overdueTasks > 0 && (
            <div 
              role="alert"
              className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 shadow-soft flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs text-rose-900">
                <strong className="block font-bold text-sm text-rose-950">
                  {taskMetrics.overdueTasks} Task{taskMetrics.overdueTasks === 1 ? '' : 's'} Past Milestone Due Date
                </strong>
                <p className="mt-0.5 text-rose-800">
                  These tasks are past their scheduled target dates. Complete them or revise due dates to keep preparations on track.
                </p>
              </div>
              <Button
                variant="danger"
                size="xs"
                onClick={() => setFilterMode('OVERDUE')}
              >
                View Overdue
              </Button>
            </div>
          )}

          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* View Mode Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> View:
              </span>

              {(['ALL', 'OVERDUE', 'UPCOMING', 'COMPLETED', 'MILESTONES'] as const).map((mode) => {
                const count = 
                  mode === 'ALL' ? taskMetrics.totalTasks :
                  mode === 'OVERDUE' ? taskMetrics.overdueTasks :
                  mode === 'UPCOMING' ? taskMetrics.upcomingTasks :
                  mode === 'COMPLETED' ? taskMetrics.completedTasks :
                  tasks.filter(t => t.isMilestone).length;

                const isSelected = filterMode === mode;
                const isOverdueTab = mode === 'OVERDUE' && taskMetrics.overdueTasks > 0;

                return (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5',
                      isSelected
                        ? 'bg-plum-900 text-ivory-50 shadow-soft'
                        : isOverdueTab
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-slate-600 border border-ivory-200 hover:bg-ivory-100'
                    )}
                  >
                    <span>
                      {mode === 'ALL' ? 'All Tasks' :
                       mode === 'OVERDUE' ? 'Overdue' :
                       mode === 'UPCOMING' ? 'Upcoming' :
                       mode === 'COMPLETED' ? 'Completed' : 'Milestones'}
                    </span>
                    <span className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                      isSelected ? 'bg-plum-800 text-white' : 'bg-ivory-200 text-slate-700'
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Priority Filter Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="text-xs py-1 px-2.5 rounded-lg border border-ivory-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent Only</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>

          </div>

          {/* Tasks List Table / Cards */}
          <div className="bg-white rounded-3xl border border-ivory-200/90 shadow-soft overflow-hidden">
            {displayTasks.length === 0 ? (
              <EmptyState
                icon={<ListTodo className="w-8 h-8" />}
                title={
                  tasks.length === 0 
                    ? 'No milestone tasks defined yet' 
                    : `No tasks match the "${filterMode.toLowerCase()}" filter`
                }
                description={
                  tasks.length === 0 
                    ? 'Build your preparation roadmap or generate an intelligent starter checklist tailored to your date.' 
                    : 'Try changing or clearing your active filters.'
                }
                actionLabel={tasks.length === 0 ? 'Add First Task' : 'Show All Tasks'}
                onAction={tasks.length === 0 ? handleOpenAddTaskModal : () => { setFilterMode('ALL'); setPriorityFilter('ALL'); }}
                className="my-6"
              />
            ) : (
              <div className="divide-y divide-ivory-100">
                {displayTasks.map((task) => {
                  const isDone = task.status === 'COMPLETED';
                  const isOverdue = isTaskOverdue(task);
                  const isDueToday = isTaskDueToday(task);
                  const daysDiff = task.dueDate ? getDaysDifference(task.dueDate) : 0;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-ivory-50/70 transition-colors group',
                        isDone && 'bg-ivory-50/40 opacity-75',
                        isOverdue && 'bg-rose-50/20'
                      )}
                    >
                      {/* Checkbox button: complete or reopen */}
                      <div className="flex items-start gap-3.5 flex-1">
                        <button
                          type="button"
                          onClick={() => isDone ? handleReopenTask(task) : handleCompleteTask(task)}
                          aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
                          className="mt-0.5 text-slate-400 hover:text-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-full flex-shrink-0"
                          title={isDone ? 'Click to reopen task' : 'Click to mark completed'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400 hover:text-emerald-600 hover:scale-110 transition-all" />
                          )}
                        </button>

                        <div className="space-y-1.5 flex-1">
                          
                          {/* Title and Badge row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                              'text-sm font-bold text-slate-900',
                              isDone && 'line-through text-slate-400 font-medium'
                            )}>
                              {task.title}
                            </span>
                            
                            {task.isMilestone && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-50 text-gold-900 border border-gold-300">
                                <Flag className="w-2.5 h-2.5 text-gold-600" />
                                Milestone
                              </span>
                            )}
                            
                            <PriorityBadge priority={task.priority} />

                            {/* Overdue Badge */}
                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                Overdue by {Math.abs(daysDiff)} day{Math.abs(daysDiff) === 1 ? '' : 's'}
                              </span>
                            )}

                            {/* Due Today Badge */}
                            {!isDone && isDueToday && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                Due Today
                              </span>
                            )}

                            {/* Status Pill */}
                            {task.status === 'IN_PROGRESS' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                In Progress
                              </span>
                            )}
                          </div>

                          {/* Notes / Description */}
                          {(task.notes || task.description) && (
                            <p className={cn(
                              'text-xs text-slate-600 leading-relaxed',
                              isDone && 'text-slate-400'
                            )}>
                              {task.notes || task.description}
                            </p>
                          )}

                          {/* Metadata row: Category, Due Date, Assignee */}
                          <div className="flex flex-wrap items-center gap-3.5 text-[11px] text-slate-500 pt-1">
                            
                            {task.category && (
                              <span className="font-medium text-slate-600">
                                Category: <strong className="font-semibold text-slate-800">{task.category}</strong>
                              </span>
                            )}

                            {task.dueDate && (
                              <span className={cn(
                                'flex items-center gap-1 font-medium',
                                isOverdue ? 'text-rose-700 font-bold' : isDueToday ? 'text-amber-800 font-bold' : 'text-slate-600'
                              )}>
                                <Calendar className="w-3 h-3 text-plum-700" />
                                Due: {formatDate(task.dueDate)}
                              </span>
                            )}

                            {task.assignee && (
                              <span className="flex items-center gap-1 font-medium text-plum-900 bg-plum-50/80 px-2 py-0.5 rounded-md border border-plum-100">
                                <User className="w-3 h-3 text-plum-700" />
                                Lead: <strong>{task.assignee}</strong>
                              </span>
                            )}

                          </div>

                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isDone ? (
                          <button
                            type="button"
                            onClick={() => handleReopenTask(task)}
                            aria-label={`Reopen task ${task.title}`}
                            className="p-1.5 text-slate-400 hover:text-plum-800 hover:bg-plum-50 rounded-lg transition-colors"
                            title="Reopen task"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCompleteTask(task)}
                            aria-label={`Complete task ${task.title}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Complete task"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditTaskModal(task)}
                          aria-label={`Edit task ${task.title}`}
                          className="p-1.5 text-slate-400 hover:text-plum-800 hover:bg-plum-50 rounded-lg transition-colors"
                          title="Edit task details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          aria-label={`Delete task ${task.title}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: RUN-OF-SHOW SCHEDULE */}
      {activeSubTab === 'runofshow' && (
        <div className="space-y-6">
          <div className="p-4 bg-gold-50/80 border border-gold-300/80 rounded-2xl flex items-center justify-between text-xs text-gold-950 shadow-soft">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-700 flex-shrink-0" />
              <span>
                <strong>Day-of Run-of-Show:</strong> Sequence of events, staging zones, and designated lead persons for execution.
              </span>
            </div>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-ivory-300">
            {runOfShowItems.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-8 h-8" />}
                title="No day-of schedule blocks added"
                description="Coordinate your event timeline by adding schedule intervals with start times, zones, and designated leaders."
                actionLabel="Add Schedule Block"
                onAction={() => setIsRosModalOpen(true)}
                className="my-4"
              />
            ) : (
              runOfShowItems.map((item) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Gold Dot */}
                  <div className="absolute -left-6 sm:-left-8 top-3.5 w-4 h-4 rounded-full bg-white border-2 border-gold-500 shadow-soft" />

                  {/* Schedule Card */}
                  <div className="p-4 sm:p-5 bg-white rounded-2xl border border-ivory-200/90 shadow-soft hover:shadow-hover transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-plum-950 bg-plum-50 px-2.5 py-1 rounded-lg border border-plum-100">
                          {item.startTime} {item.endTime ? `– ${item.endTime}` : ''}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 font-serif">
                          {item.title}
                        </h4>
                      </div>

                      {item.description && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        {item.location && (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-plum-700" />
                            {item.location}
                          </span>
                        )}
                        {item.picName && (
                          <span className="flex items-center gap-1 font-semibold text-plum-900">
                            <User className="w-3.5 h-3.5 text-plum-700" />
                            Lead: {item.picName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity self-end sm:self-center">
                      <button
                        onClick={() => handleOpenEditRos(item)}
                        aria-label={`Edit ${item.title}`}
                        className="p-1.5 text-slate-400 hover:text-plum-900 hover:bg-plum-50 rounded-lg transition-colors"
                        title="Edit schedule interval"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteRosItem(item)}
                        aria-label={`Remove ${item.title}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove schedule interval"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        title={editingTask ? 'Edit Milestone Task' : 'Add Milestone Task'}
        subtitle={
          editingTask
            ? `Update schedule details, priority, or assigned lead for "${editingTask.title}".`
            : 'Track preparation roadmap items leading up to event day.'
        }
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <TextInput
            label="Task Title"
            placeholder="e.g. Confirm Menu Tasting with Caterer"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Target Due Date"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              required
            />

            <Select
              label="Priority"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
            >
              <option value="TODO">To Do (Pending)</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </Select>

            <TextInput
              label="Assigned Lead (Optional)"
              placeholder="e.g. Maid of Honor / Caterer / Alex"
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
            />
          </div>

          <TextInput
            label="Category"
            placeholder="e.g. Venue, Catering, Stationery, Music, Coordination"
            value={taskCategory}
            onChange={(e) => setTaskCategory(e.target.value)}
          />

          <Textarea
            label="Notes & Special Instructions (Optional)"
            placeholder="Checklist items, attendee numbers, or contract clauses..."
            value={taskNotes}
            onChange={(e) => setTaskNotes(e.target.value)}
            rows={2}
          />

          <div className="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="isMilestoneCheckbox"
              checked={isMilestone}
              onChange={(e) => setIsMilestone(e.target.checked)}
              className="w-4 h-4 text-plum-800 rounded border-ivory-300 focus:ring-gold-500"
            />
            <label htmlFor="isMilestoneCheckbox" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
              Highlight as Major Milestone
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-ivory-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsTaskModalOpen(false);
                setEditingTask(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="plum"
              size="sm"
              isLoading={isSubmitting}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Run of Show Item Modal */}
      <Modal
        isOpen={isRosModalOpen}
        onClose={() => {
          setIsRosModalOpen(false);
          setEditingRos(null);
        }}
        title={editingRos ? 'Edit Schedule Interval' : 'Add Schedule Interval'}
        subtitle="Sequence day-of activities with precise times and leads."
      >
        <form onSubmit={handleCreateRosItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Start Time"
              type="time"
              value={rosStartTime}
              onChange={(e) => setRosStartTime(e.target.value)}
              required
            />
            <TextInput
              label="End Time"
              type="time"
              value={rosEndTime}
              onChange={(e) => setRosEndTime(e.target.value)}
            />
          </div>

          <TextInput
            label="Activity Title"
            placeholder="e.g. Golden Hour Cocktails & Canapes"
            value={rosTitle}
            onChange={(e) => setRosTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Location / Staging Zone"
              placeholder="e.g. Pergola Terrace"
              value={rosLocation}
              onChange={(e) => setRosLocation(e.target.value)}
            />
            <TextInput
              label="Person in Charge (Lead)"
              placeholder="e.g. Banquet Lead / Best Man"
              value={rosPicName}
              onChange={(e) => setRosPicName(e.target.value)}
            />
          </div>

          <Textarea
            label="Activity Instructions"
            placeholder="Special cues for DJ, photographer, or coordinator..."
            value={rosDescription}
            onChange={(e) => setRosDescription(e.target.value)}
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-ivory-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsRosModalOpen(false);
                setEditingRos(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="plum"
              size="sm"
              isLoading={isSubmitting}
            >
              {editingRos ? 'Save Changes' : 'Add Schedule Interval'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

import { date } from './format';

/**
 * Calculates the Day Delay / Overdue indication status based on due date and completion status.
 *
 * Rules:
 * - If status is Completed or isCompleted === true: returns null (no delay flag)
 * - If due_date is missing / invalid: returns null
 * - If due_date > today: UPCOMING -> "X Days Remaining" (🟢 tone: 'green')
 * - If due_date == today: DUE_TODAY -> "Due Today" (🟡 tone: 'amber')
 * - If due_date < today: OVERDUE -> "X Day(s) Delayed" (🔴 tone: 'rose')
 *
 * @param {string | Date} dueDateValue
 * @param {boolean} isCompleted
 * @returns {object | null} { type, days, label, tone, icon, tooltip, formattedDueDate }
 */
export const getDelayStatus = (dueDateValue, isCompleted = false) => {
  if (!dueDateValue || isCompleted) return null;

  const due = new Date(dueDateValue);
  if (isNaN(due.getTime())) return null;

  // Normalize both dates to midnight local time to avoid off-by-one errors from time components
  const today = new Date();
  const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueReset = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffMs = dueReset.getTime() - todayReset.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const formattedDueDate = date(dueReset);

  if (diffDays > 0) {
    const daysStr = diffDays === 1 ? '1 Day' : `${diffDays} Days`;
    return {
      type: 'UPCOMING',
      days: diffDays,
      label: `${daysStr} Remaining`,
      tone: 'green',
      icon: '🟢',
      tooltip: `Due Date: ${formattedDueDate}\n${daysStr} Remaining`,
      formattedDueDate,
    };
  }

  if (diffDays === 0) {
    return {
      type: 'DUE_TODAY',
      days: 0,
      label: 'Due Today',
      tone: 'amber',
      icon: '🟡',
      tooltip: `Due Date: ${formattedDueDate}\nDue Today`,
      formattedDueDate,
    };
  }

  const delayedDays = Math.abs(diffDays);
  const dayWord = delayedDays === 1 ? 'Day' : 'Days';
  return {
    type: 'OVERDUE',
    days: delayedDays,
    label: `${delayedDays} ${dayWord} Delayed`,
    tone: 'rose',
    icon: '🔴',
    tooltip: `Overdue since ${formattedDueDate}\nDue Date: ${formattedDueDate}\nDelayed By: ${delayedDays} ${dayWord}`,
    formattedDueDate,
  };
};

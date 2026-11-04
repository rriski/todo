package main

import (
	"cmp"
	"slices"
	"strconv"
	"testing"
	"time"

	"pgregory.net/rapid"
)

func TestSortTasksKeepsEveryTaskAndPutsOverdueFirst(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	date := rapid.Custom(func(t *rapid.T) string {
		return start.AddDate(0, 0, rapid.IntRange(0, 30).Draw(t, "days")).Format(dateLayout)
	})

	rapid.Check(t, func(t *rapid.T) {
		today := date.Draw(t, "today")
		var tasks []Task
		for i := range rapid.IntRange(0, 20).Draw(t, "count") {
			tasks = append(tasks, Task{
				ID:        strconv.Itoa(i),
				Completed: rapid.Bool().Draw(t, "completed"),
				DueDate:   rapid.OneOf(rapid.Just(""), date).Draw(t, "dueDate"),
			})
		}
		sorted := slices.Clone(tasks)

		sortTasks(sorted, today)

		byID := func(a, b Task) int { return cmp.Compare(a.ID, b.ID) }
		if !slices.Equal(slices.SortedFunc(slices.Values(sorted), byID), slices.SortedFunc(slices.Values(tasks), byID)) {
			t.Fatalf("sorting %v gave %v, a different set of tasks", tasks, sorted)
		}
		firstNotOverdue := slices.IndexFunc(sorted, func(task Task) bool { return !isOverdue(task, today) })
		if firstNotOverdue >= 0 && slices.ContainsFunc(sorted[firstNotOverdue:], func(task Task) bool { return isOverdue(task, today) }) {
			t.Fatalf("an overdue task follows a task that is not overdue: %v", sorted)
		}
	})
}

package main

import (
	"cmp"
	"slices"
	"time"
)

const dateLayout = "2006-01-02"

func isCalendarDate(value string) bool {
	_, err := time.Parse(dateLayout, value)
	return err == nil
}

func localToday() string {
	return time.Now().Format(dateLayout)
}

func isOverdue(task Task, today string) bool {
	return !task.Completed && task.DueDate != "" && task.DueDate < today
}

// due-dates.API.8
func sortTasks(tasks []Task, today string) {
	group := func(task Task) int {
		switch {
		case isOverdue(task, today):
			return 0
		case task.DueDate != "":
			return 1
		default:
			return 2
		}
	}
	slices.SortStableFunc(tasks, func(a, b Task) int {
		return cmp.Or(cmp.Compare(group(a), group(b)), cmp.Compare(a.DueDate, b.DueDate))
	})
}

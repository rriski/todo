package main

import (
	"slices"
	"strconv"
	"sync"
)

type Task struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
	DueDate   string `json:"dueDate,omitempty"`
}

const maxTasks = 50

type Store interface {
	List() []Task
	Add(title, dueDate string) (Task, bool)
	SetCompleted(id string, completed bool) (Task, bool)
	Delete(id string) bool
}

type memoryStore struct {
	mu     sync.Mutex
	tasks  []Task
	nextID int
}

func newMemoryStore() *memoryStore {
	return &memoryStore{tasks: []Task{}, nextID: 1}
}

func (s *memoryStore) List() []Task {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(s.tasks)
}

func (s *memoryStore) Add(title, dueDate string) (Task, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.tasks) >= maxTasks {
		return Task{}, false
	}
	task := Task{ID: strconv.Itoa(s.nextID), Title: title, DueDate: dueDate}
	s.nextID++
	s.tasks = append(s.tasks, task)
	return task, true
}

func (s *memoryStore) SetCompleted(id string, completed bool) (Task, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	i := s.indexOf(id)
	if i < 0 {
		return Task{}, false
	}
	s.tasks[i].Completed = completed
	return s.tasks[i], true
}

func (s *memoryStore) Delete(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	i := s.indexOf(id)
	if i < 0 {
		return false
	}
	s.tasks = slices.Delete(s.tasks, i, i+1)
	return true
}

func (s *memoryStore) indexOf(id string) int {
	return slices.IndexFunc(s.tasks, func(task Task) bool { return task.ID == id })
}

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
}

type Store interface {
	List() []Task
	Add(title string) Task
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

func (s *memoryStore) Add(title string) Task {
	s.mu.Lock()
	defer s.mu.Unlock()
	task := Task{ID: strconv.Itoa(s.nextID), Title: title}
	s.nextID++
	s.tasks = append(s.tasks, task)
	return task
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

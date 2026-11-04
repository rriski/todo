package main

import (
	"testing"

	"pgregory.net/rapid"
)

func TestStoreIDsStayUnique(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		store := newMemoryStore()
		t.Repeat(map[string]func(*rapid.T){
			"add": func(t *rapid.T) {
				store.Add(rapid.String().Draw(t, "title"))
			},
			"delete": func(t *rapid.T) {
				if tasks := store.List(); len(tasks) > 0 {
					store.Delete(rapid.SampledFrom(tasks).Draw(t, "task").ID)
				}
			},
			"": func(t *rapid.T) {
				seen := map[string]bool{}
				for _, task := range store.List() {
					if seen[task.ID] {
						t.Fatalf("two tasks share the id %s", task.ID)
					}
					seen[task.ID] = true
				}
			},
		})
	})
}

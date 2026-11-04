package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

func newHandler(store Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /api/tasks", func(w http.ResponseWriter, r *http.Request) {
		today := localToday()
		if query := r.URL.Query(); query.Has("today") {
			today = query.Get("today")
		}
		if !isCalendarDate(today) {
			http.Error(w, "today must be a date written YYYY-MM-DD", http.StatusBadRequest)
			return
		}
		tasks := store.List()
		sortTasks(tasks, today)
		writeJSON(w, http.StatusOK, tasks)
	})

	mux.HandleFunc("POST /api/tasks", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Title   string  `json:"title"`
			DueDate *string `json:"dueDate"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		title := strings.TrimSuffix(strings.TrimPrefix(body.Title, " "), " ")
		if title == "" {
			http.Error(w, "title is required", http.StatusBadRequest)
			return
		}
		var dueDate string
		if body.DueDate != nil {
			dueDate = *body.DueDate
			if !isCalendarDate(dueDate) {
				http.Error(w, "dueDate must be a date written YYYY-MM-DD", http.StatusBadRequest)
				return
			}
		}
		writeJSON(w, http.StatusCreated, store.Add(title, dueDate))
	})

	mux.HandleFunc("PATCH /api/tasks/{id}", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Completed bool `json:"completed"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		task, found := store.SetCompleted(r.PathValue("id"), body.Completed)
		if !found {
			http.NotFound(w, r)
			return
		}
		writeJSON(w, http.StatusOK, task)
	})

	mux.HandleFunc("DELETE /api/tasks/{id}", func(w http.ResponseWriter, r *http.Request) {
		if !store.Delete(r.PathValue("id")) {
			http.NotFound(w, r)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	return mux
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value) //nolint:errcheck // the status is already sent
}

package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"
)

const (
	maxTitleLength = 200
	maxBodyBytes   = 4096
)

func newHandler(store Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", healthz)

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
		if !decodeBody(w, r, &body) {
			return
		}
		title := strings.TrimSpace(body.Title)
		if title == "" {
			http.Error(w, "title is required", http.StatusBadRequest)
			return
		}
		if utf8.RuneCountInString(title) > maxTitleLength {
			http.Error(w, fmt.Sprintf("title must be at most %d characters", maxTitleLength), http.StatusBadRequest)
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
		task, added := store.Add(title, dueDate)
		if !added {
			http.Error(w, fmt.Sprintf("a list holds at most %d tasks", maxTasks), http.StatusConflict)
			return
		}
		writeJSON(w, http.StatusCreated, task)
	})

	mux.HandleFunc("PATCH /api/tasks/{id}", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Completed bool `json:"completed"`
		}
		if !decodeBody(w, r, &body) {
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

func healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func decodeBody(w http.ResponseWriter, r *http.Request, body any) bool {
	err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes)).Decode(body)
	var tooLarge *http.MaxBytesError
	switch {
	case errors.As(err, &tooLarge):
		http.Error(w, fmt.Sprintf("the body must be at most %d bytes", maxBodyBytes), http.StatusRequestEntityTooLarge)
	case err != nil:
		http.Error(w, err.Error(), http.StatusBadRequest)
	}
	return err == nil
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(value) //nolint:errcheck // the status is already sent
}

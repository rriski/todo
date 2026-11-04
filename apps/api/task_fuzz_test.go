package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func FuzzDecodeTask(f *testing.F) {
	f.Add(`{"title":"Buy milk"}`)
	f.Add(`{"title":"  "}`)
	f.Add(`{"title":1}`)
	f.Add(`{`)
	f.Add(`{"title":"Buy milk","dueDate":"2026-11-04"}`)
	f.Add(`{"title":"Buy milk","dueDate":"2026-02-30"}`)
	f.Add(`{"title":"Buy milk","dueDate":""}`)
	f.Add(`{"title":"Buy milk","dueDate":null}`)
	f.Add(`{"title":"Buy milk","dueDate":"2028-02-29"}`)
	f.Add(`{"title":"Buy milk","dueDate":"0000-01-01"}`)
	f.Add(`{"title":"Buy milk","dueDate":"2026-1-5"}`)
	f.Add(`{"title":"Buy milk","dueDate":" 2026-11-04"}`)
	f.Add(`{"title":"Buy milk","dueDate":"2026-11-04T00:00:00Z"}`)

	f.Fuzz(func(t *testing.T, body string) {
		request := httptest.NewRequest(http.MethodPost, "/api/tasks", strings.NewReader(body))
		response := httptest.NewRecorder()

		newHandler(newMemoryStore()).ServeHTTP(response, request)

		switch response.Code {
		case http.StatusBadRequest:
		case http.StatusCreated:
			var task Task
			if err := json.Unmarshal(response.Body.Bytes(), &task); err != nil {
				t.Fatalf("the API returned invalid JSON: %v", err)
			}
			if task.Title == "" || task.Title != strings.TrimSpace(task.Title) {
				t.Errorf("stored title %q is blank or untrimmed", task.Title)
			}
			if parsed, err := time.Parse(dateLayout, task.DueDate); task.DueDate != "" && (err != nil || parsed.Format(dateLayout) != task.DueDate) {
				t.Errorf("stored due date %q does not format back to itself", task.DueDate)
			}
		default:
			t.Errorf("status = %d, want 201 or 400", response.Code)
		}
	})
}

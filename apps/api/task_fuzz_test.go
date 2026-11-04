package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func FuzzDecodeTask(f *testing.F) {
	f.Add(`{"title":"Buy milk"}`)
	f.Add(`{"title":"  "}`)
	f.Add(`{"title":1}`)
	f.Add(`{`)

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
		default:
			t.Errorf("status = %d, want 201 or 400", response.Code)
		}
	})
}

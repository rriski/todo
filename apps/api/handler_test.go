package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandler(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		wantStatus int
		wantBody   string
	}{
		{"health", "GET", "/healthz", "", 200, `{"status":"ok"}`},
		{"list", "GET", "/api/tasks", "", 200, `[{"id":"1","title":"Buy milk","completed":false}]`},
		{"add", "POST", "/api/tasks", `{"title":"Call Sam"}`, 201, `{"id":"2","title":"Call Sam","completed":false}`},
		{"add trims the title", "POST", "/api/tasks", `{"title":" Call Sam "}`, 201, `{"id":"2","title":"Call Sam","completed":false}`},
		{"add without a title", "POST", "/api/tasks", `{"title":"  "}`, 400, "title is required"},
		{"add malformed", "POST", "/api/tasks", `{`, 400, "unexpected EOF"},
		{"complete", "PATCH", "/api/tasks/1", `{"completed":true}`, 200, `{"id":"1","title":"Buy milk","completed":true}`},
		{"complete unknown", "PATCH", "/api/tasks/9", `{"completed":true}`, 404, "404 page not found"},
		{"delete", "DELETE", "/api/tasks/1", "", 204, ""},
		{"delete unknown", "DELETE", "/api/tasks/9", "", 404, "404 page not found"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newMemoryStore()
			store.Add("Buy milk")
			request := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			response := httptest.NewRecorder()

			newHandler(store).ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", response.Code, tt.wantStatus)
			}
			if got := strings.TrimSpace(response.Body.String()); got != tt.wantBody {
				t.Errorf("body = %s, want %s", got, tt.wantBody)
			}
		})
	}
}

func TestListWithoutTasks(t *testing.T) {
	response := httptest.NewRecorder()

	newHandler(newMemoryStore()).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/tasks", nil))

	if got := strings.TrimSpace(response.Body.String()); got != "[]" {
		t.Errorf("body = %s, want []", got)
	}
}

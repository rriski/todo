package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"
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
		{"list with today", "GET", "/api/tasks?today=2026-11-04", "", 200, `[{"id":"1","title":"Buy milk","completed":false}]`},
		{"list with an impossible today", "GET", "/api/tasks?today=2026-02-30", "", 400, "today must be a date written YYYY-MM-DD"},
		{"list with an empty today", "GET", "/api/tasks?today=", "", 400, "today must be a date written YYYY-MM-DD"},
		{"list with a today in another format", "GET", "/api/tasks?today=11/04/2026", "", 400, "today must be a date written YYYY-MM-DD"},
		{"add", "POST", "/api/tasks", `{"title":"Call Sam"}`, 201, `{"id":"2","title":"Call Sam","completed":false}`},
		{"add trims the title", "POST", "/api/tasks", `{"title":" Call Sam "}`, 201, `{"id":"2","title":"Call Sam","completed":false}`},
		{"add trims every space at each end", "POST", "/api/tasks", `{"title":"  Call Sam  "}`, 201, `{"id":"2","title":"Call Sam","completed":false}`},
		{"add trims tabs and line breaks", "POST", "/api/tasks", `{"title":"\tCall Sam\r\n"}`, 201, `{"id":"2","title":"Call Sam","completed":false}`},
		{"add without a title", "POST", "/api/tasks", `{"title":"  "}`, 400, "title is required"},
		{"add with a whitespace title", "POST", "/api/tasks", `{"title":"\r"}`, 400, "title is required"},
		{"add malformed", "POST", "/api/tasks", `{`, 400, "unexpected EOF"},
		{"add with a due date", "POST", "/api/tasks", `{"title":"Call Sam","dueDate":"2026-11-04"}`, 201, `{"id":"2","title":"Call Sam","completed":false,"dueDate":"2026-11-04"}`},
		{"add with a past due date", "POST", "/api/tasks", `{"title":"Call Sam","dueDate":"1999-12-31"}`, 201, `{"id":"2","title":"Call Sam","completed":false,"dueDate":"1999-12-31"}`},
		{"add with a leap day", "POST", "/api/tasks", `{"title":"Call Sam","dueDate":"2028-02-29"}`, 201, `{"id":"2","title":"Call Sam","completed":false,"dueDate":"2028-02-29"}`},
		{"add with a null due date", "POST", "/api/tasks", `{"title":"Call Sam","dueDate":null}`, 201, `{"id":"2","title":"Call Sam","completed":false}`},
		{"add with a due date of the wrong type", "POST", "/api/tasks", `{"title":"Call Sam","dueDate":20261104}`, 400, "json: cannot unmarshal number into Go struct field .dueDate of type string"},
		{"complete", "PATCH", "/api/tasks/1", `{"completed":true}`, 200, `{"id":"1","title":"Buy milk","completed":true}`},
		{"complete unknown", "PATCH", "/api/tasks/9", `{"completed":true}`, 404, "404 page not found"},
		{"delete", "DELETE", "/api/tasks/1", "", 204, ""},
		{"delete unknown", "DELETE", "/api/tasks/9", "", 404, "404 page not found"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newMemoryStore()
			store.Add("Buy milk", "")
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

func TestAddWithAnInvalidDueDateStoresNothing(t *testing.T) {
	for _, dueDate := range []string{`""`, `"2026-02-30"`, `"2026-13-01"`, `"2026-1-5"`, `"11/04/2026"`, `"2026-11-04T00:00:00Z"`, `" 2026-11-04"`} {
		t.Run(dueDate, func(t *testing.T) {
			store := newMemoryStore()
			body := strings.NewReader(`{"title":"Call Sam","dueDate":` + dueDate + `}`)
			response := httptest.NewRecorder()

			newHandler(store).ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/api/tasks", body))

			if response.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want 400", response.Code)
			}
			if got := strings.TrimSpace(response.Body.String()); got != "dueDate must be a date written YYYY-MM-DD" {
				t.Errorf("body = %s", got)
			}
			if tasks := store.List(); len(tasks) != 0 {
				t.Errorf("stored %v, want nothing", tasks)
			}
		})
	}
}

func TestCompleteKeepsTheDueDate(t *testing.T) {
	store := newMemoryStore()
	store.Add("Buy milk", "2026-11-04")
	body := strings.NewReader(`{"completed":true,"dueDate":"2030-01-01"}`)
	response := httptest.NewRecorder()

	newHandler(store).ServeHTTP(response, httptest.NewRequest(http.MethodPatch, "/api/tasks/1", body))

	want := `{"id":"1","title":"Buy milk","completed":true,"dueDate":"2026-11-04"}`
	if got := strings.TrimSpace(response.Body.String()); got != want {
		t.Errorf("body = %s, want %s", got, want)
	}
}

func TestListOrdersOverdueThenDatedThenUndated(t *testing.T) {
	store := newMemoryStore()
	store.Add("undated first", "")
	store.Add("dated later", "2026-12-01")
	store.Add("overdue newer", "2026-11-02")
	store.Add("due today", "2026-11-04")
	store.Add("undated second", "")
	store.Add("overdue older", "2026-10-01")
	store.Add("dated later tie", "2026-12-01")
	store.SetCompleted(store.Add("completed past due", "2026-01-01").ID, true)
	store.Add("overdue newer tie", "2026-11-02")
	response := httptest.NewRecorder()

	newHandler(store).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/tasks?today=2026-11-04", nil))

	want := []string{
		"overdue older", "overdue newer", "overdue newer tie",
		"completed past due", "due today", "dated later", "dated later tie",
		"undated first", "undated second",
	}
	if got := titles(t, response); !slices.Equal(got, want) {
		t.Errorf("order = %q, want %q", got, want)
	}
}

func TestListFallsBackToTheLocalDate(t *testing.T) {
	store := newMemoryStore()
	store.SetCompleted(store.Add("completed long ago", "2000-01-01").ID, true)
	store.Add("due yesterday", time.Now().AddDate(0, 0, -1).Format(dateLayout))
	store.Add("due tomorrow", time.Now().AddDate(0, 0, 1).Format(dateLayout))
	response := httptest.NewRecorder()

	newHandler(store).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/tasks", nil))

	want := []string{"due yesterday", "completed long ago", "due tomorrow"}
	if got := titles(t, response); !slices.Equal(got, want) {
		t.Errorf("order = %q, want %q", got, want)
	}
}

func titles(t *testing.T, response *httptest.ResponseRecorder) []string {
	t.Helper()
	var tasks []Task
	if err := json.Unmarshal(response.Body.Bytes(), &tasks); err != nil {
		t.Fatal(err)
	}
	var titles []string
	for _, task := range tasks {
		titles = append(titles, task.Title)
	}
	return titles
}

package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func visit(t *testing.T, app http.Handler, cookie *http.Cookie, method, path, body string) (*httptest.ResponseRecorder, *http.Cookie) {
	t.Helper()
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	if cookie != nil {
		request.AddCookie(cookie)
	}
	response := httptest.NewRecorder()
	app.ServeHTTP(response, request)
	for _, set := range response.Result().Cookies() {
		if set.Name == listCookie {
			return response, set
		}
	}
	return response, nil
}

func TestVisitorsSeeOnlyTheirOwnTasks(t *testing.T) {
	app := newApp("")
	_, ann := visit(t, app, nil, http.MethodPost, "/api/tasks", `{"title":"Ann's task"}`)
	_, ben := visit(t, app, nil, http.MethodGet, "/api/tasks", "")

	annList, annSet := visit(t, app, ann, http.MethodGet, "/api/tasks", "")
	benList, benSet := visit(t, app, ben, http.MethodGet, "/api/tasks", "")

	if got := strings.TrimSpace(annList.Body.String()); got != `[{"id":"1","title":"Ann's task","completed":false}]` {
		t.Errorf("Ann's list = %s", got)
	}
	if got := strings.TrimSpace(benList.Body.String()); got != "[]" {
		t.Errorf("Ben's list = %s, want []", got)
	}
	if annSet != nil || benSet != nil {
		t.Error("a known visitor was given a new cookie")
	}
}

func TestListCookieAttributes(t *testing.T) {
	_, cookie := visit(t, newApp(""), nil, http.MethodGet, "/api/tasks", "")

	if cookie == nil {
		t.Fatal("no cookie set")
	}
	if !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteLaxMode || cookie.Path != "/" {
		t.Errorf("cookie = %+v, want HttpOnly, Secure, SameSite=Lax and Path=/", cookie)
	}
	if len(cookie.Value) < 26 {
		t.Errorf("id %q is shorter than 128 random bits", cookie.Value)
	}
}

func TestAnUnknownCookieIsReplaced(t *testing.T) {
	chosen := &http.Cookie{Name: listCookie, Value: "chosen-by-the-client"}

	_, cookie := visit(t, newApp(""), chosen, http.MethodGet, "/api/tasks", "")

	if cookie == nil || cookie.Value == chosen.Value {
		t.Errorf("cookie = %+v, want a new server-chosen id", cookie)
	}
}

func TestTheLeastRecentlyUsedListIsEvicted(t *testing.T) {
	lists := &visitorLists{lists: map[string]*visitorList{}}
	_, used := visit(t, lists, nil, http.MethodPost, "/api/tasks", `{"title":"Used"}`)
	_, unused := visit(t, lists, nil, http.MethodPost, "/api/tasks", `{"title":"Unused"}`)
	for range maxLists - 2 {
		visit(t, lists, nil, http.MethodGet, "/api/tasks", "")
	}
	visit(t, lists, used, http.MethodGet, "/api/tasks", "")

	_, newest := visit(t, lists, nil, http.MethodGet, "/api/tasks", "")

	if got := len(lists.lists); got != maxLists {
		t.Errorf("holds %d lists, want %d", got, maxLists)
	}
	if _, replaced := visit(t, lists, newest, http.MethodGet, "/api/tasks", ""); replaced != nil {
		t.Error("the newest list was evicted")
	}
	list, replaced := visit(t, lists, used, http.MethodGet, "/api/tasks", "")
	if replaced != nil || !strings.Contains(list.Body.String(), "Used") {
		t.Errorf("a recently used list was evicted: %s", list.Body.String())
	}
	list, replaced = visit(t, lists, unused, http.MethodGet, "/api/tasks", "")
	if replaced == nil || strings.TrimSpace(list.Body.String()) != "[]" {
		t.Errorf("the least recently used list survived: %s", list.Body.String())
	}
}

func TestHealthCheckAndPageCreateNoList(t *testing.T) {
	webDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(webDir, "index.html"), []byte("<h1>Tasks</h1>"), 0o600); err != nil {
		t.Fatal(err)
	}
	app := newApp(webDir)

	health, healthCookie := visit(t, app, nil, http.MethodGet, "/healthz", "")
	page, pageCookie := visit(t, app, nil, http.MethodGet, "/", "")

	if got := strings.TrimSpace(health.Body.String()); health.Code != http.StatusOK || got != `{"status":"ok"}` {
		t.Errorf("health = %d %s", health.Code, got)
	}
	if page.Code != http.StatusOK || !strings.Contains(page.Body.String(), "Tasks") {
		t.Errorf("page = %d %s", page.Code, page.Body.String())
	}
	if healthCookie != nil || pageCookie != nil {
		t.Error("a request outside /api/ set a list cookie")
	}
}

func TestWithoutAWebDirThePageIsNotServed(t *testing.T) {
	response, _ := visit(t, newApp(""), nil, http.MethodGet, "/main.go", "")

	if response.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", response.Code)
	}
}

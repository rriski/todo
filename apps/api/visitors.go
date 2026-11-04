package main

import (
	"crypto/rand"
	"maps"
	"net/http"
	"slices"
	"sync"
	"time"
)

const (
	listCookie = "todo_list"
	maxLists   = 1000
)

type visitorList struct {
	handler  http.Handler
	lastUsed time.Time
}

// visitorLists gives each visitor a task list of their own, selected by a cookie.
type visitorLists struct {
	mu    sync.Mutex
	lists map[string]*visitorList
}

func (v *visitorLists) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	v.handlerFor(w, r).ServeHTTP(w, r)
}

func (v *visitorLists) handlerFor(w http.ResponseWriter, r *http.Request) http.Handler {
	v.mu.Lock()
	defer v.mu.Unlock()

	if cookie, err := r.Cookie(listCookie); err == nil {
		if list, found := v.lists[cookie.Value]; found {
			list.lastUsed = time.Now()
			return list.handler
		}
	}

	if len(v.lists) >= maxLists {
		delete(v.lists, v.oldest())
	}
	id := rand.Text()
	list := &visitorList{handler: newHandler(newMemoryStore()), lastUsed: time.Now()}
	v.lists[id] = list
	http.SetCookie(w, &http.Cookie{
		Name:     listCookie,
		Value:    id,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
	return list.handler
}

func (v *visitorLists) oldest() string {
	return slices.MinFunc(slices.Collect(maps.Keys(v.lists)), func(a, b string) int {
		return v.lists[a].lastUsed.Compare(v.lists[b].lastUsed)
	})
}

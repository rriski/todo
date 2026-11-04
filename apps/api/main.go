package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	log.Fatal(http.ListenAndServe(":8080", newApp(os.Getenv("WEB_DIR"))))
}

// newApp serves the API, and the built page when webDir is set.
func newApp(webDir string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", healthz)
	mux.Handle("/api/", &visitorLists{lists: map[string]*visitorList{}})
	if webDir != "" {
		mux.Handle("/", http.FileServer(http.Dir(webDir)))
	}
	return mux
}

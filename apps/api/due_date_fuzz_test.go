package main

import (
	"testing"
	"time"
)

func FuzzIsCalendarDate(f *testing.F) {
	for _, seed := range []string{
		"2026-11-04", "2028-02-29", "2026-02-29", "2026-02-30", "2026-13-01", "0000-01-01", "9999-12-31",
		"", "2026-1-5", "2026-11-4", "11/04/2026", " 2026-11-04", "2026-11-04 ", "2026-11-04T00:00:00Z", "+2026-11-04", "-001-01-01",
	} {
		f.Add(seed)
	}

	f.Fuzz(func(t *testing.T, value string) {
		if !isCalendarDate(value) {
			return
		}
		parsed, err := time.Parse(dateLayout, value)
		if err != nil {
			t.Fatalf("isCalendarDate accepts %q, which does not parse: %v", value, err)
		}
		if got := parsed.Format(dateLayout); got != value {
			t.Errorf("isCalendarDate accepts %q, which formats back as %q", value, got)
		}
	})
}

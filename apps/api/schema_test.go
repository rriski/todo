//go:build !mutation

// Gremlins tests a copy of this module, where the relative schema path is missing.

package main

import (
	"encoding/json"
	"os"
	"testing"
)

func TestTaskMatchesSchema(t *testing.T) {
	raw, err := os.ReadFile("../../packages/todo-model/task.schema.json")
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties map[string]struct {
			Type string `json:"type"`
		} `json:"properties"`
		Required []string `json:"required"`
	}
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatal(err)
	}

	full := encode(t, Task{ID: "1", Title: "Buy milk", DueDate: "2026-11-04"})
	if len(full) != len(schema.Properties) {
		t.Errorf("task has %d fields, schema has %d", len(full), len(schema.Properties))
	}
	for name, property := range schema.Properties {
		if got := jsonType(full[name]); got != property.Type {
			t.Errorf("%s has type %q, schema says %q", name, got, property.Type)
		}
	}

	bare := encode(t, Task{ID: "1", Title: "Buy milk"})
	if len(bare) != len(schema.Required) {
		t.Errorf("task without optional fields has %d fields, schema requires %d", len(bare), len(schema.Required))
	}
	for _, name := range schema.Required {
		if _, ok := bare[name]; !ok {
			t.Errorf("task without optional fields omits the required %s", name)
		}
	}
}

func encode(t *testing.T, task Task) map[string]any {
	t.Helper()
	encoded, err := json.Marshal(task)
	if err != nil {
		t.Fatal(err)
	}
	var fields map[string]any
	if err := json.Unmarshal(encoded, &fields); err != nil {
		t.Fatal(err)
	}
	return fields
}

func jsonType(value any) string {
	switch value.(type) {
	case string:
		return "string"
	case bool:
		return "boolean"
	default:
		return "unknown"
	}
}

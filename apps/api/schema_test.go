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
	}
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatal(err)
	}

	encoded, err := json.Marshal(Task{ID: "1", Title: "Buy milk"})
	if err != nil {
		t.Fatal(err)
	}
	var task map[string]any
	if err := json.Unmarshal(encoded, &task); err != nil {
		t.Fatal(err)
	}

	if len(task) != len(schema.Properties) {
		t.Errorf("task has %d fields, schema has %d", len(task), len(schema.Properties))
	}
	for name, property := range schema.Properties {
		if got := jsonType(task[name]); got != property.Type {
			t.Errorf("%s has type %q, schema says %q", name, got, property.Type)
		}
	}
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

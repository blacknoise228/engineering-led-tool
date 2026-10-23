package main

import (
	"encoding/json"
	"os"
	"testing"
)

func TestAppLanguage(t *testing.T) {
	app := NewApp()

	// Default should be valid ("ru" or "en")
	sysLang := app.GetSystemLanguage()
	if sysLang != "ru" && sysLang != "en" {
		t.Errorf("GetSystemLanguage() = %q; expected 'ru' or 'en'", sysLang)
	}

	app.SetLanguage("en")
	if !app.isEnglish() {
		t.Errorf("expected isEnglish() to be true after SetLanguage('en')")
	}

	app.SetLanguage("ru")
	if app.isEnglish() {
		t.Errorf("expected isEnglish() to be false after SetLanguage('ru')")
	}
}

func TestAppConfigLoadSave(t *testing.T) {
	app := NewApp()

	cfgData := map[string]interface{}{
		"language": "en",
		"logo": map[string]interface{}{
			"customLogoDataUrl":  "data:image/png;base64,abc",
			"customLogoFileName": "my-logo.png",
			"scale":              1.5,
			"offsetX":            10,
			"offsetY":            -5,
		},
		"futureSetting": true,
	}

	bytes, err := json.MarshalIndent(cfgData, "", "  ")
	if err != nil {
		t.Fatalf("failed to marshal config: %v", err)
	}

	savedPath, err := app.SaveAppConfig(string(bytes))
	if err != nil {
		t.Fatalf("SaveAppConfig failed: %v", err)
	}
	defer os.Remove(savedPath)

	res, err := app.LoadAppConfig()
	if err != nil {
		t.Fatalf("LoadAppConfig failed: %v", err)
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(res.Content), &parsed); err != nil {
		t.Fatalf("failed to unmarshal test config: %v", err)
	}

	if parsed["language"] != "en" {
		t.Errorf("expected language 'en', got %v", parsed["language"])
	}

	if !app.isEnglish() {
		t.Errorf("expected isEnglish() to be true after loading config with language 'en'")
	}

	logo, ok := parsed["logo"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected logo object, got %T", parsed["logo"])
	}
	if logo["customLogoFileName"] != "my-logo.png" {
		t.Errorf("expected logo file name 'my-logo.png', got %v", logo["customLogoFileName"])
	}
	if parsed["futureSetting"] != true {
		t.Errorf("expected futureSetting = true, got %v", parsed["futureSetting"])
	}
}
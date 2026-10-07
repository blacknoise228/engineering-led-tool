package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	// Perform your setup here
	a.ctx = ctx
}

// domReady is called after front-end resources have been loaded
func (a App) domReady(ctx context.Context) {
	// Add your action here
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue, false will continue shutdown as normal.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here
}

type OpenProjectResult struct {
	FilePath string `json:"filePath"`
	Content  string `json:"content"`
}

// OpenProjectDialog opens a native file dialog to select a project file (.ss, .json)
// and returns the file path and content. If user cancels, FilePath is empty.
func (a *App) OpenProjectDialog() (*OpenProjectResult, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Загрузить проект",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Файлы проекта (*.ss, *.json)",
				Pattern:     "*.ss;*.json",
			},
			{
				DisplayName: "Все файлы (*.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return nil, err
	}
	if filePath == "" {
		return &OpenProjectResult{FilePath: "", Content: ""}, nil
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения файла: %w", err)
	}

	return &OpenProjectResult{
		FilePath: filePath,
		Content:  string(data),
	}, nil
}

// SaveProject saves the project content.
// If targetPath is provided and not empty, it writes directly to targetPath.
// If targetPath is empty, it opens a native SaveFileDialog using defaultName.
// Returns the saved file path, or empty string if user cancelled.
func (a *App) SaveProject(targetPath string, defaultName string, content string) (string, error) {
	if targetPath == "" {
		if defaultName == "" {
			defaultName = "project.ss"
		}
		if !strings.HasSuffix(strings.ToLower(defaultName), ".ss") && !strings.HasSuffix(strings.ToLower(defaultName), ".json") {
			defaultName += ".ss"
		}

		chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
			Title:           "Сохранить проект",
			DefaultFilename: defaultName,
			Filters: []runtime.FileFilter{
				{
					DisplayName: "Файлы проекта (*.ss)",
					Pattern:     "*.ss",
				},
				{
					DisplayName: "Файлы JSON (*.json)",
					Pattern:     "*.json",
				},
				{
					DisplayName: "Все файлы (*.*)",
					Pattern:     "*.*",
				},
			},
		})
		if err != nil {
			return "", err
		}
		if chosen == "" {
			return "", nil // Cancelled by user
		}
		targetPath = chosen
	}

	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога: %w", err)
	}

	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка записи файла: %w", err)
	}

	return targetPath, nil
}

// SavePNG prompts the user for a destination file path and writes base64-encoded PNG data to disk.
// Returns the saved file path, or empty string if user cancelled.
func (a *App) SavePNG(defaultFilename string, base64Data string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = "export.png"
	}
	if !strings.HasSuffix(strings.ToLower(defaultFilename), ".png") {
		defaultFilename += ".png"
	}

	chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Сохранить PNG",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Изображение PNG (*.png)",
				Pattern:     "*.png",
			},
			{
				DisplayName: "Все файлы (*.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if chosen == "" {
		return "", nil // Cancelled by user
	}

	cleanBase64 := base64Data
	commaIdx := strings.Index(cleanBase64, ",")
	if commaIdx != -1 {
		cleanBase64 = cleanBase64[commaIdx+1:]
	}
	cleanBase64 = strings.TrimSpace(cleanBase64)

	data, err := base64.StdEncoding.DecodeString(cleanBase64)
	if err != nil {
		return "", fmt.Errorf("ошибка декодирования PNG: %w", err)
	}

	dir := filepath.Dir(chosen)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога: %w", err)
	}

	if err := os.WriteFile(chosen, data, 0644); err != nil {
		return "", fmt.Errorf("ошибка записи PNG: %w", err)
	}

	return chosen, nil
}

// SaveZIP prompts user for destination file path and writes base64-encoded ZIP data to disk.
func (a *App) SaveZIP(defaultFilename string, base64Data string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = "export.zip"
	}
	if !strings.HasSuffix(strings.ToLower(defaultFilename), ".zip") {
		defaultFilename += ".zip"
	}

	chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Сохранить ZIP архив",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "ZIP архив (*.zip)",
				Pattern:     "*.zip",
			},
			{
				DisplayName: "Все файлы (*.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if chosen == "" {
		return "", nil
	}

	cleanBase64 := base64Data
	commaIdx := strings.Index(cleanBase64, ",")
	if commaIdx != -1 {
		cleanBase64 = cleanBase64[commaIdx+1:]
	}
	cleanBase64 = strings.TrimSpace(cleanBase64)

	data, err := base64.StdEncoding.DecodeString(cleanBase64)
	if err != nil {
		return "", fmt.Errorf("ошибка декодирования ZIP: %w", err)
	}

	dir := filepath.Dir(chosen)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога: %w", err)
	}

	if err := os.WriteFile(chosen, data, 0644); err != nil {
		return "", fmt.Errorf("ошибка записи ZIP: %w", err)
	}

	return chosen, nil
}

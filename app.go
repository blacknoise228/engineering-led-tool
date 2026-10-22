package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx             context.Context
	initialFilePath string
}

func findProjectArg(args []string) string {
	for _, arg := range args {
		if strings.HasPrefix(arg, "-") {
			continue
		}
		clean := strings.Trim(arg, "\"'")
		if clean == "" {
			continue
		}
		lower := strings.ToLower(clean)
		if strings.HasSuffix(lower, ".ss") || strings.HasSuffix(lower, ".json") {
			if abs, err := filepath.Abs(clean); err == nil {
				if _, err := os.Stat(abs); err == nil {
					return abs
				}
			}
			if _, err := os.Stat(clean); err == nil {
				return clean
			}
		}
	}
	return ""
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{}
	if len(os.Args) > 1 {
		app.initialFilePath = findProjectArg(os.Args[1:])
	}
	return app
}

// startup is called at application startup
func (a *App) startup(ctx context.Context) {
	// Perform your setup here
	a.ctx = ctx
}

// onSecondInstanceLaunch is called when a second instance of the application is launched
func (a *App) onSecondInstanceLaunch(secondInstanceData options.SecondInstanceData) {
	if a.ctx != nil {
		runtime.WindowUnminimise(a.ctx)
		runtime.Show(a.ctx)
	}

	targetFile := findProjectArg(secondInstanceData.Args)
	if targetFile == "" && len(secondInstanceData.Args) > 0 {
		for _, arg := range secondInstanceData.Args {
			if strings.HasPrefix(arg, "-") {
				continue
			}
			clean := strings.Trim(arg, "\"'")
			if clean == "" {
				continue
			}
			full := filepath.Join(secondInstanceData.WorkingDirectory, clean)
			if _, err := os.Stat(full); err == nil {
				targetFile = full
				break
			}
		}
	}

	if targetFile != "" && a.ctx != nil {
		res, err := a.ReadProjectFile(targetFile)
		if err == nil && res != nil {
			runtime.EventsEmit(a.ctx, "open-project", res)
		}
	}
}

// onFileOpen is called on macOS when a file is opened with the application
func (a *App) onFileOpen(filePath string) {
	if a.ctx == nil {
		a.initialFilePath = filePath
		return
	}
	res, err := a.ReadProjectFile(filePath)
	if err == nil && res != nil {
		runtime.EventsEmit(a.ctx, "open-project", res)
	}
}

// domReady is called after front-end resources have been loaded
func (a *App) domReady(ctx context.Context) {
	runtime.WindowMaximise(ctx)
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

// ReadProjectFile reads a project file by path and returns its content.
func (a *App) ReadProjectFile(filePath string) (*OpenProjectResult, error) {
	clean := strings.Trim(filePath, "\"'")
	data, err := os.ReadFile(clean)
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения файла: %w", err)
	}

	absPath, err := filepath.Abs(clean)
	if err != nil {
		absPath = clean
	}

	return &OpenProjectResult{
		FilePath: absPath,
		Content:  string(data),
	}, nil
}

// GetInitialProject returns the project file passed as CLI argument on startup.
// Once returned, initialFilePath is cleared.
func (a *App) GetInitialProject() (*OpenProjectResult, error) {
	if a.initialFilePath == "" {
		return nil, nil
	}
	path := a.initialFilePath
	a.initialFilePath = ""
	return a.ReadProjectFile(path)
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

	return a.ReadProjectFile(filePath)
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

type PanelsConfigResult struct {
	FilePath string `json:"filePath"`
	Content  string `json:"content"`
}

// GetPanelsConfigPath returns the absolute path to panels.json next to the executable.
func (a *App) GetPanelsConfigPath() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return filepath.Abs("panels.json")
	}
	realExe, err := filepath.EvalSymlinks(exe)
	if err == nil {
		exe = realExe
	}
	dir := filepath.Dir(exe)
	return filepath.Join(dir, "panels.json"), nil
}

const defaultInitialPanelsJSON = `[
  {
    "id": "dicolor-0p5m-4p8",
    "name": "Dicolor-C 0.5m (500×500) 4.8",
    "w": 500,
    "h": 500,
    "pitch_mm": 4.8,
    "special": false,
    "resW": 104,
    "resH": 104,
    "power": 161
  },
  {
    "id": "dicolor-1m-4p8",
    "name": "Dicolor-C 1m (500×1000) 4.8",
    "w": 500,
    "h": 1000,
    "pitch_mm": 4.8,
    "special": false,
    "resW": 104,
    "resH": 208,
    "power": 322
  }
]`

// LoadPanelPresets reads panels.json.
// It checks next to the binary, and falls back to the working directory if not found.
// If the file exists, it returns its content and the path.
// If it doesn't exist, it creates panels.json with 2 default Dicolor panels (0.5m & 1m) and returns it.
func (a *App) LoadPanelPresets() (*PanelsConfigResult, error) {
	targetPath, err := a.GetPanelsConfigPath()
	if err != nil {
		targetPath = "panels.json"
	}

	// 1. Try next to binary
	if data, err := os.ReadFile(targetPath); err == nil && len(data) > 0 {
		return &PanelsConfigResult{
			FilePath: targetPath,
			Content:  string(data),
		}, nil
	}

	// 2. Fallback to current working directory if different
	cwdFile := "panels.json"
	if absCwd, err := filepath.Abs(cwdFile); err == nil && absCwd != targetPath {
		if data, err := os.ReadFile(absCwd); err == nil && len(data) > 0 {
			return &PanelsConfigResult{
				FilePath: absCwd,
				Content:  string(data),
			}, nil
		}
	}

	// 3. File not found yet: create default panels.json next to binary
	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err == nil {
		_ = os.WriteFile(targetPath, []byte(defaultInitialPanelsJSON), 0644)
	}

	return &PanelsConfigResult{
		FilePath: targetPath,
		Content:  defaultInitialPanelsJSON,
	}, nil
}

// SavePanelPresets saves content string into panels.json located next to the binary.
func (a *App) SavePanelPresets(content string) (string, error) {
	targetPath, err := a.GetPanelsConfigPath()
	if err != nil {
		targetPath = "panels.json"
	}

	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога для panels.json: %w", err)
	}

	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка записи panels.json: %w", err)
	}

	return targetPath, nil
}

// OpenPanelsFileDialog opens a native file dialog to choose a panels json file and returns its path and content.
func (a *App) OpenPanelsFileDialog() (*PanelsConfigResult, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Выбрать файл пресетов панелей",
		Filters: []runtime.FileFilter{
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
		return nil, err
	}
	if filePath == "" {
		return nil, nil // User cancelled
	}

	clean := strings.Trim(filePath, "\"'")
	data, err := os.ReadFile(clean)
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения файла: %w", err)
	}

	absPath, err := filepath.Abs(clean)
	if err != nil {
		absPath = clean
	}

	return &PanelsConfigResult{
		FilePath: absPath,
		Content:  string(data),
	}, nil
}

// SavePanelsFileDialog opens a native save file dialog to export panels presets to a chosen json file.
func (a *App) SavePanelsFileDialog(defaultFilename string, content string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = "panels.json"
	}
	if !strings.HasSuffix(strings.ToLower(defaultFilename), ".json") {
		defaultFilename += ".json"
	}

	chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Экспорт пресетов панелей",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
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

	dir := filepath.Dir(chosen)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога: %w", err)
	}

	if err := os.WriteFile(chosen, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка записи файла: %w", err)
	}

	return chosen, nil
}


// ============================================================================
// CARDS & PROCESSORS PRESETS CONFIGURATION
// ============================================================================

const defaultInitialCardsJSON = `[
  {
    "id": "mctrl300",
    "name": "NovaStar MCTRL300",
    "category": "sending",
    "maxInput": "1920×1200 @60Hz",
    "outputPorts": 2
  },
  {
    "id": "mctrl660",
    "name": "NovaStar MCTRL660",
    "category": "sending",
    "maxInput": "3840×600 @60Hz",
    "outputPorts": 4
  },
  {
    "id": "mctrl660pro",
    "name": "NovaStar MCTRL660 PRO",
    "category": "sending",
    "maxInput": "3840×600 @60Hz",
    "outputPorts": 6
  },
  {
    "id": "mctrl4k",
    "name": "NovaStar MCTRL4K",
    "category": "sending",
    "maxInput": "7680×1080 @60Hz",
    "outputPorts": 16
  },
  {
    "id": "vx1000",
    "name": "NovaStar VX1000",
    "category": "processor",
    "maxInput": "3840×1080 @60Hz",
    "outputPorts": 10
  },
  {
    "id": "novapro-jr",
    "name": "NovaPro Junior",
    "category": "processor",
    "maxInput": "7680×1080 @60Hz",
    "outputPorts": 16
  },
  {
    "id": "h2",
    "name": "NovaStar H2",
    "category": "processor",
    "maxInput": "7680×1080 @60Hz",
    "outputPorts": 16
  },
  {
    "id": "h5",
    "name": "NovaStar H5",
    "category": "processor",
    "maxInput": "7680×1080 @60Hz",
    "outputPorts": 16
  },
  {
    "id": "h5_e",
    "name": "NovaStar H5 Enhanced",
    "category": "processor",
    "maxInput": "7680×2160 @60Hz",
    "outputPorts": 40
  },
  {
    "id": "h9",
    "name": "NovaStar H9",
    "category": "processor",
    "maxInput": "7680×1080 @60Hz",
    "outputPorts": 16
  },
  {
    "id": "h9_e",
    "name": "NovaStar H9 Enhanced",
    "category": "processor",
    "maxInput": "7680×1080 @60Hz",
    "outputPorts": 16
  }
]`

// GetCardsConfigPath returns the absolute path to cards.json next to the executable.
func (a *App) GetCardsConfigPath() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return filepath.Abs("cards.json")
	}
	realExe, err := filepath.EvalSymlinks(exe)
	if err == nil {
		exe = realExe
	}
	dir := filepath.Dir(exe)
	return filepath.Join(dir, "cards.json"), nil
}

// LoadCardPresets reads cards.json.
func (a *App) LoadCardPresets() (*PanelsConfigResult, error) {
	targetPath, err := a.GetCardsConfigPath()
	if err != nil {
		targetPath = "cards.json"
	}

	if data, err := os.ReadFile(targetPath); err == nil && len(data) > 0 {
		return &PanelsConfigResult{
			FilePath: targetPath,
			Content:  string(data),
		}, nil
	}

	cwdFile := "cards.json"
	if absCwd, err := filepath.Abs(cwdFile); err == nil && absCwd != targetPath {
		if data, err := os.ReadFile(absCwd); err == nil && len(data) > 0 {
			return &PanelsConfigResult{
				FilePath: absCwd,
				Content:  string(data),
			}, nil
		}
	}

	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err == nil {
		_ = os.WriteFile(targetPath, []byte(defaultInitialCardsJSON), 0644)
	}

	return &PanelsConfigResult{
		FilePath: targetPath,
		Content:  defaultInitialCardsJSON,
	}, nil
}

// SaveCardPresets saves content string into cards.json next to the binary.
func (a *App) SaveCardPresets(content string) (string, error) {
	targetPath, err := a.GetCardsConfigPath()
	if err != nil {
		targetPath = "cards.json"
	}

	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога для cards.json: %w", err)
	}

	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка записи cards.json: %w", err)
	}

	return targetPath, nil
}

// OpenCardsFileDialog opens a native file dialog to choose a cards json file.
func (a *App) OpenCardsFileDialog() (*PanelsConfigResult, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Выбрать файл пресетов карт",
		Filters: []runtime.FileFilter{
			{ DisplayName: "Файлы JSON (*.json)", Pattern: "*.json" },
			{ DisplayName: "Все файлы (*.*)", Pattern: "*.*" },
		},
	})
	if err != nil || filePath == "" {
		return nil, err
	}

	clean := strings.Trim(filePath, "\"'")
	data, err := os.ReadFile(clean)
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения файла: %w", err)
	}

	absPath, err := filepath.Abs(clean)
	if err != nil {
		absPath = clean
	}

	return &PanelsConfigResult{
		FilePath: absPath,
		Content:  string(data),
	}, nil
}

// SaveCardsFileDialog opens a native save file dialog to export cards presets.
func (a *App) SaveCardsFileDialog(defaultFilename string, content string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = "cards.json"
	}
	if !strings.HasSuffix(strings.ToLower(defaultFilename), ".json") {
		defaultFilename += ".json"
	}

	chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Экспорт пресетов карт",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{ DisplayName: "Файлы JSON (*.json)", Pattern: "*.json" },
			{ DisplayName: "Все файлы (*.*)", Pattern: "*.*" },
		},
	})
	if err != nil || chosen == "" {
		return "", err
	}

	dir := filepath.Dir(chosen)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога: %w", err)
	}

	if err := os.WriteFile(chosen, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка записи файла: %w", err)
	}

	return chosen, nil
}


// ============================================================================
// SERVERS PRESETS CONFIGURATION
// ============================================================================

const defaultInitialServersJSON = `[
  {
    "id": "hp-z2",
    "name": "HP Z2"
  },
  {
    "id": "hp-z4",
    "name": "HP Z4"
  },
  {
    "id": "ss-z20",
    "name": "SS Z20"
  },
  {
    "id": "ss-c34",
    "name": "SS C34"
  },
  {
    "id": "acer-predator-new",
    "name": "Acer Predator (new)"
  },
  {
    "id": "acer-predator-old",
    "name": "Acer Predator (old)"
  },
  {
    "id": "lenovo-legion",
    "name": "Lenovo Legion"
  },
  {
    "id": "intel-nuc",
    "name": "Intel NUC"
  },
  {
    "id": "mf-ms02",
    "name": "Minisforum MS-02"
  }
]`

// GetServersConfigPath returns the absolute path to servers.json next to the executable.
func (a *App) GetServersConfigPath() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return filepath.Abs("servers.json")
	}
	realExe, err := filepath.EvalSymlinks(exe)
	if err == nil {
		exe = realExe
	}
	dir := filepath.Dir(exe)
	return filepath.Join(dir, "servers.json"), nil
}

// LoadServerPresets reads servers.json.
func (a *App) LoadServerPresets() (*PanelsConfigResult, error) {
	targetPath, err := a.GetServersConfigPath()
	if err != nil {
		targetPath = "servers.json"
	}

	if data, err := os.ReadFile(targetPath); err == nil && len(data) > 0 {
		return &PanelsConfigResult{
			FilePath: targetPath,
			Content:  string(data),
		}, nil
	}

	cwdFile := "servers.json"
	if absCwd, err := filepath.Abs(cwdFile); err == nil && absCwd != targetPath {
		if data, err := os.ReadFile(absCwd); err == nil && len(data) > 0 {
			return &PanelsConfigResult{
				FilePath: absCwd,
				Content:  string(data),
			}, nil
		}
	}

	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err == nil {
		_ = os.WriteFile(targetPath, []byte(defaultInitialServersJSON), 0644)
	}

	return &PanelsConfigResult{
		FilePath: targetPath,
		Content:  defaultInitialServersJSON,
	}, nil
}

// SaveServerPresets saves content string into servers.json next to the binary.
func (a *App) SaveServerPresets(content string) (string, error) {
	targetPath, err := a.GetServersConfigPath()
	if err != nil {
		targetPath = "servers.json"
	}

	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога для servers.json: %w", err)
	}

	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка записи servers.json: %w", err)
	}

	return targetPath, nil
}

// OpenServersFileDialog opens a native file dialog to choose a servers json file.
func (a *App) OpenServersFileDialog() (*PanelsConfigResult, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Выбрать файл пресетов серверов",
		Filters: []runtime.FileFilter{
			{ DisplayName: "Файлы JSON (*.json)", Pattern: "*.json" },
			{ DisplayName: "Все файлы (*.*)", Pattern: "*.*" },
		},
	})
	if err != nil || filePath == "" {
		return nil, err
	}

	clean := strings.Trim(filePath, "\"'")
	data, err := os.ReadFile(clean)
	if err != nil {
		return nil, fmt.Errorf("ошибка чтения файла: %w", err)
	}

	absPath, err := filepath.Abs(clean)
	if err != nil {
		absPath = clean
	}

	return &PanelsConfigResult{
		FilePath: absPath,
		Content:  string(data),
	}, nil
}

// SaveServersFileDialog opens a native save file dialog to export servers presets.
func (a *App) SaveServersFileDialog(defaultFilename string, content string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = "servers.json"
	}
	if !strings.HasSuffix(strings.ToLower(defaultFilename), ".json") {
		defaultFilename += ".json"
	}

	chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Экспорт пресетов серверов",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{ DisplayName: "Файлы JSON (*.json)", Pattern: "*.json" },
			{ DisplayName: "Все файлы (*.*)", Pattern: "*.*" },
		},
	})
	if err != nil || chosen == "" {
		return "", err
	}

	dir := filepath.Dir(chosen)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога: %w", err)
	}

	if err := os.WriteFile(chosen, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка записи файла: %w", err)
	}

	return chosen, nil
}

// GetMaskLogoConfigPath returns the absolute path to mask_logo.json next to the executable.
func (a *App) GetMaskLogoConfigPath() (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return filepath.Abs("mask_logo.json")
	}
	realExe, err := filepath.EvalSymlinks(exe)
	if err == nil {
		exe = realExe
	}
	dir := filepath.Dir(exe)
	return filepath.Join(dir, "mask_logo.json"), nil
}

// LoadMaskLogoConfig reads mask_logo.json if present.
func (a *App) LoadMaskLogoConfig() (*PanelsConfigResult, error) {
	targetPath, err := a.GetMaskLogoConfigPath()
	if err != nil {
		targetPath = "mask_logo.json"
	}

	if data, err := os.ReadFile(targetPath); err == nil && len(data) > 0 {
		return &PanelsConfigResult{
			FilePath: targetPath,
			Content:  string(data),
		}, nil
	}

	cwdFile := "mask_logo.json"
	if absCwd, err := filepath.Abs(cwdFile); err == nil && absCwd != targetPath {
		if data, err := os.ReadFile(absCwd); err == nil && len(data) > 0 {
			return &PanelsConfigResult{
				FilePath: absCwd,
				Content:  string(data),
			}, nil
		}
	}

	return &PanelsConfigResult{
		FilePath: targetPath,
		Content:  "",
	}, nil
}

// SaveMaskLogoConfig saves content string into mask_logo.json next to the binary.
func (a *App) SaveMaskLogoConfig(content string) (string, error) {
	targetPath, err := a.GetMaskLogoConfigPath()
	if err != nil {
		targetPath = "mask_logo.json"
	}

	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога для mask_logo.json: %w", err)
	}

	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("ошибка записи mask_logo.json: %w", err)
	}

	return targetPath, nil
}



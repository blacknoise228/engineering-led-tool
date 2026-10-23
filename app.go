package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	sysRuntime "runtime"
	"strings"
	"syscall"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx             context.Context
	initialFilePath string
	updateMgr       UpdateManager
	currentLanguage string
}

type OpenProjectResult struct {
	FilePath string `json:"filePath"`
	Content  string `json:"content"`
}

type PanelsConfigResult struct {
	FilePath string `json:"filePath"`
	Content  string `json:"content"`
}

const AppConfigFileName = "config.json"

func detectSystemLanguage() string {
	if sysRuntime.GOOS == "windows" {
		k32 := syscall.NewLazyDLL("kernel32.dll")
		proc := k32.NewProc("GetUserDefaultLocaleName")
		if proc.Find() == nil {
			b := make([]uint16, 128)
			r, _, _ := proc.Call(uintptr(unsafe.Pointer(&b[0])), uintptr(len(b)))
			if r != 0 {
				loc := strings.ToLower(syscall.UTF16ToString(b))
				if strings.HasPrefix(loc, "ru") {
					return "ru"
				}
				return "en"
			}
		}
	}

	for _, env := range []string{"LC_ALL", "LC_MESSAGES", "LANG"} {
		if val := strings.ToLower(os.Getenv(env)); val != "" {
			if strings.HasPrefix(val, "ru") {
				return "ru"
			}
			return "en"
		}
	}
	return "en"
}

func (a *App) GetSystemLanguage() string {
	return detectSystemLanguage()
}

func (a *App) SetLanguage(lang string) {
	lang = strings.ToLower(strings.TrimSpace(lang))
	if lang == "ru" || lang == "en" {
		a.currentLanguage = lang
	}
}

func (a *App) isEnglish() bool {
	if a.currentLanguage == "en" {
		return true
	}
	if a.currentLanguage == "ru" {
		return false
	}
	return detectSystemLanguage() == "en"
}

func (a *App) getJsonFilters() []runtime.FileFilter {
	if a.isEnglish() {
		return []runtime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		}
	}
	return []runtime.FileFilter{
		{DisplayName: "Файлы JSON (*.json)", Pattern: "*.json"},
		{DisplayName: "Все файлы (*.*)", Pattern: "*.*"},
	}
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

func NewApp() *App {
	app := &App{}
	app.updateMgr.app = app
	if len(os.Args) > 1 {
		app.initialFilePath = findProjectArg(os.Args[1:])
	}
	return app
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

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

func (a *App) domReady(ctx context.Context) {
	runtime.WindowMaximise(ctx)
}

func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

func (a *App) shutdown(ctx context.Context) {}

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

func (a *App) GetInitialProject() (*OpenProjectResult, error) {
	if a.initialFilePath == "" {
		return nil, nil
	}
	path := a.initialFilePath
	a.initialFilePath = ""
	return a.ReadProjectFile(path)
}

func (a *App) OpenProjectDialog() (*OpenProjectResult, error) {
	title := "Загрузить проект"
	filters := []runtime.FileFilter{
		{DisplayName: "Файлы проекта (*.ss, *.json)", Pattern: "*.ss;*.json"},
		{DisplayName: "Все файлы (*.*)", Pattern: "*.*"},
	}
	if a.isEnglish() {
		title = "Open Project"
		filters = []runtime.FileFilter{
			{DisplayName: "Project files (*.ss, *.json)", Pattern: "*.ss;*.json"},
			{DisplayName: "All files (*.*)", Pattern: "*.*"},
		}
	}
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   title,
		Filters: filters,
	})
	if err != nil {
		return nil, err
	}
	if filePath == "" {
		return &OpenProjectResult{FilePath: "", Content: ""}, nil
	}
	return a.ReadProjectFile(filePath)
}

func (a *App) SaveProject(targetPath string, defaultName string, content string) (string, error) {
	if targetPath == "" {
		if defaultName == "" {
			defaultName = "project.ss"
		}
		if !strings.HasSuffix(strings.ToLower(defaultName), ".ss") && !strings.HasSuffix(strings.ToLower(defaultName), ".json") {
			defaultName += ".ss"
		}

		title := "Сохранить проект"
		filters := []runtime.FileFilter{
			{DisplayName: "Файлы проекта (*.ss)", Pattern: "*.ss"},
			{DisplayName: "Файлы JSON (*.json)", Pattern: "*.json"},
			{DisplayName: "Все файлы (*.*)", Pattern: "*.*"},
		}
		if a.isEnglish() {
			title = "Save Project"
			filters = []runtime.FileFilter{
				{DisplayName: "Project files (*.ss)", Pattern: "*.ss"},
				{DisplayName: "JSON files (*.json)", Pattern: "*.json"},
				{DisplayName: "All files (*.*)", Pattern: "*.*"},
			}
		}

		chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
			Title:           title,
			DefaultFilename: defaultName,
			Filters:         filters,
		})
		if err != nil || chosen == "" {
			return "", err
		}
		targetPath = chosen
	}

	if err := writeTextFile(targetPath, content); err != nil {
		return "", err
	}
	return targetPath, nil
}

func (a *App) SavePNG(defaultFilename string, base64Data string) (string, error) {
	title := "Сохранить PNG"
	filterName := "Изображение PNG (*.png)"
	if a.isEnglish() {
		title = "Save PNG"
		filterName = "PNG Image (*.png)"
	}
	return a.saveBase64Dialog(title, defaultFilename, "export.png", ".png", filterName, "*.png", base64Data)
}

func (a *App) SaveZIP(defaultFilename string, base64Data string) (string, error) {
	title := "Сохранить ZIP архив"
	filterName := "ZIP архив (*.zip)"
	if a.isEnglish() {
		title = "Save ZIP Archive"
		filterName = "ZIP Archive (*.zip)"
	}
	return a.saveBase64Dialog(title, defaultFilename, "export.zip", ".zip", filterName, "*.zip", base64Data)
}

func writeTextFile(targetPath string, content string) error {
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return fmt.Errorf("ошибка создания каталога: %w", err)
	}
	if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("ошибка записи файла: %w", err)
	}
	return nil
}

func (a *App) saveBase64Dialog(title, defaultFilename, fallbackName, ext, filterName, filterPattern, base64Data string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = fallbackName
	}
	if !strings.HasSuffix(strings.ToLower(defaultFilename), ext) {
		defaultFilename += ext
	}

	chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: filterName, Pattern: filterPattern},
			{DisplayName: "Все файлы (*.*)", Pattern: "*.*"},
		},
	})
	if err != nil || chosen == "" {
		return "", err
	}

	cleanBase64 := base64Data
	if commaIdx := strings.Index(cleanBase64, ","); commaIdx != -1 {
		cleanBase64 = cleanBase64[commaIdx+1:]
	}
	cleanBase64 = strings.TrimSpace(cleanBase64)

	data, err := base64.StdEncoding.DecodeString(cleanBase64)
	if err != nil {
		return "", fmt.Errorf("ошибка декодирования файла: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(chosen), 0755); err != nil {
		return "", fmt.Errorf("ошибка создания каталога: %w", err)
	}
	if err := os.WriteFile(chosen, data, 0644); err != nil {
		return "", fmt.Errorf("ошибка записи файла: %w", err)
	}
	return chosen, nil
}

func getExeRelativePath(filename string) (string, error) {
	exe, err := os.Executable()
	if err != nil {
		return filepath.Abs(filename)
	}
	if realExe, err := filepath.EvalSymlinks(exe); err == nil {
		exe = realExe
	}
	return filepath.Join(filepath.Dir(exe), filename), nil
}

func loadConfigFileWithDefault(filename string, defaultContent string) (*PanelsConfigResult, error) {
	targetPath, err := getExeRelativePath(filename)
	if err != nil {
		targetPath = filename
	}

	if data, err := os.ReadFile(targetPath); err == nil && len(data) > 0 {
		return &PanelsConfigResult{FilePath: targetPath, Content: string(data)}, nil
	}

	if absCwd, err := filepath.Abs(filename); err == nil && absCwd != targetPath {
		if data, err := os.ReadFile(absCwd); err == nil && len(data) > 0 {
			return &PanelsConfigResult{FilePath: absCwd, Content: string(data)}, nil
		}
	}

	if defaultContent != "" {
		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err == nil {
			_ = os.WriteFile(targetPath, []byte(defaultContent), 0644)
		}
	}

	return &PanelsConfigResult{FilePath: targetPath, Content: defaultContent}, nil
}

func saveConfigFile(filename string, content string) (string, error) {
	targetPath, err := getExeRelativePath(filename)
	if err != nil {
		targetPath = filename
	}
	if err := writeTextFile(targetPath, content); err != nil {
		return "", err
	}
	return targetPath, nil
}

func (a *App) openJSONConfigDialog(title string) (*PanelsConfigResult, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   title,
		Filters: a.getJsonFilters(),
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

	return &PanelsConfigResult{FilePath: absPath, Content: string(data)}, nil
}

func (a *App) saveJSONConfigDialog(title string, defaultFilename string, fallbackName string, content string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = fallbackName
	}
	if !strings.HasSuffix(strings.ToLower(defaultFilename), ".json") {
		defaultFilename += ".json"
	}

	chosen, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           title,
		DefaultFilename: defaultFilename,
		Filters:         a.getJsonFilters(),
	})
	if err != nil || chosen == "" {
		return "", err
	}

	if err := writeTextFile(chosen, content); err != nil {
		return "", err
	}
	return chosen, nil
}

func (a *App) GetPanelsConfigPath() (string, error) {
	return getExeRelativePath("panels.json")
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
    "power": 161,
    "weight": 7.5
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
    "power": 322,
    "weight": 13.5
  }
]`

func (a *App) LoadPanelPresets() (*PanelsConfigResult, error) {
	return loadConfigFileWithDefault("panels.json", defaultInitialPanelsJSON)
}

func (a *App) SavePanelPresets(content string) (string, error) {
	return saveConfigFile("panels.json", content)
}

func (a *App) OpenPanelsFileDialog() (*PanelsConfigResult, error) {
	title := "Выбрать файл пресетов панелей"
	if a.isEnglish() {
		title = "Select Panel Presets File"
	}
	return a.openJSONConfigDialog(title)
}

func (a *App) SavePanelsFileDialog(defaultFilename string, content string) (string, error) {
	title := "Экспорт пресетов панелей"
	if a.isEnglish() {
		title = "Export Panel Presets"
	}
	return a.saveJSONConfigDialog(title, defaultFilename, "panels.json", content)
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

func (a *App) GetCardsConfigPath() (string, error) {
	return getExeRelativePath("cards.json")
}

func (a *App) LoadCardPresets() (*PanelsConfigResult, error) {
	return loadConfigFileWithDefault("cards.json", defaultInitialCardsJSON)
}

func (a *App) SaveCardPresets(content string) (string, error) {
	return saveConfigFile("cards.json", content)
}

func (a *App) OpenCardsFileDialog() (*PanelsConfigResult, error) {
	title := "Выбрать файл пресетов карт"
	if a.isEnglish() {
		title = "Select Card Presets File"
	}
	return a.openJSONConfigDialog(title)
}

func (a *App) SaveCardsFileDialog(defaultFilename string, content string) (string, error) {
	title := "Экспорт пресетов карт"
	if a.isEnglish() {
		title = "Export Card Presets"
	}
	return a.saveJSONConfigDialog(title, defaultFilename, "cards.json", content)
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

func (a *App) GetServersConfigPath() (string, error) {
	return getExeRelativePath("servers.json")
}

func (a *App) LoadServerPresets() (*PanelsConfigResult, error) {
	return loadConfigFileWithDefault("servers.json", defaultInitialServersJSON)
}

func (a *App) SaveServerPresets(content string) (string, error) {
	return saveConfigFile("servers.json", content)
}

func (a *App) OpenServersFileDialog() (*PanelsConfigResult, error) {
	title := "Выбрать файл пресетов серверов"
	if a.isEnglish() {
		title = "Select Server Presets File"
	}
	return a.openJSONConfigDialog(title)
}

func (a *App) SaveServersFileDialog(defaultFilename string, content string) (string, error) {
	title := "Экспорт пресетов серверов"
	if a.isEnglish() {
		title = "Export Server Presets"
	}
	return a.saveJSONConfigDialog(title, defaultFilename, "servers.json", content)
}

// ============================================================================
// FIBER CONVERTERS PRESETS CONFIGURATION
// ============================================================================

const defaultInitialFibersJSON = `[
  {
    "id": "cvt10",
    "name": "NovaStar CVT10",
    "pairedWith": [
      "vx1000",
      "h5_e",
      "h9_e"
    ],
    "notes": "Пара к VX1000 (10 Ethernet-выходов)."
  },
  {
    "id": "cvt4k-s",
    "name": "NovaStar CVT4K-S",
    "pairedWith": [
      "mctrl4k",
      "novapro-jr",
      "h5",
      "h9"
    ],
    "notes": "Пара к MCTRL4K / NovaProJR / H5 / H9."
  }
]`

func (a *App) GetFibersConfigPath() (string, error) {
	return getExeRelativePath("fibers.json")
}

func (a *App) LoadFiberPresets() (*PanelsConfigResult, error) {
	return loadConfigFileWithDefault("fibers.json", defaultInitialFibersJSON)
}

func (a *App) SaveFiberPresets(content string) (string, error) {
	return saveConfigFile("fibers.json", content)
}

func (a *App) OpenFibersFileDialog() (*PanelsConfigResult, error) {
	title := "Выбрать файл пресетов оптических конвертеров"
	if a.isEnglish() {
		title = "Select Fiber Presets File"
	}
	return a.openJSONConfigDialog(title)
}

func (a *App) SaveFibersFileDialog(defaultFilename string, content string) (string, error) {
	title := "Экспорт пресетов оптических конвертеров"
	if a.isEnglish() {
		title = "Export Fiber Presets"
	}
	return a.saveJSONConfigDialog(title, defaultFilename, "fibers.json", content)
}

// ============================================================================
// APPLICATION UNIFIED CONFIG (config.json) & MASK LOGO
// ============================================================================

func (a *App) GetAppConfigPath() (string, error) {
	return getExeRelativePath(AppConfigFileName)
}

func (a *App) LoadAppConfig() (*PanelsConfigResult, error) {
	targetPath, err := getExeRelativePath(AppConfigFileName)
	if err != nil {
		targetPath = AppConfigFileName
	}

	var data []byte
	var readPath string
	if d, err := os.ReadFile(targetPath); err == nil && len(d) > 0 {
		data = d
		readPath = targetPath
	} else if absCwd, err := filepath.Abs(AppConfigFileName); err == nil && absCwd != targetPath {
		if d, err := os.ReadFile(absCwd); err == nil && len(d) > 0 {
			data = d
			readPath = absCwd
		}
	}

	if len(data) > 0 {
		var parsed map[string]interface{}
		if err := json.Unmarshal(data, &parsed); err == nil {
			if lang, ok := parsed["language"].(string); ok && lang != "" {
				a.SetLanguage(lang)
			}
		}
		return &PanelsConfigResult{FilePath: readPath, Content: string(data)}, nil
	}

	// config.json does not exist yet. Initialize default values.
	defaultLang := a.GetSystemLanguage()
	a.SetLanguage(defaultLang)

	initialMap := map[string]interface{}{
		"language": defaultLang,
	}

	// Check if legacy mask_logo.json exists to migrate logo
	if logoRes, err := loadConfigFileWithDefault("mask_logo.json", ""); err == nil && logoRes != nil && strings.TrimSpace(logoRes.Content) != "" {
		var logoVal interface{}
		if err := json.Unmarshal([]byte(logoRes.Content), &logoVal); err == nil {
			initialMap["logo"] = logoVal
		}
	} else {
		initialMap["logo"] = map[string]interface{}{
			"customLogoDataUrl":  "",
			"customLogoFileName": "",
			"scale":              1,
			"offsetX":            0,
			"offsetY":            0,
		}
	}

	contentBytes, _ := json.MarshalIndent(initialMap, "", "  ")
	defaultContent := string(contentBytes)

	_ = os.MkdirAll(filepath.Dir(targetPath), 0755)
	_ = os.WriteFile(targetPath, []byte(defaultContent), 0644)

	return &PanelsConfigResult{FilePath: targetPath, Content: defaultContent}, nil
}

func (a *App) SaveAppConfig(content string) (string, error) {
	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(content), &parsed); err == nil {
		if lang, ok := parsed["language"].(string); ok && lang != "" {
			a.SetLanguage(lang)
		}
		if logo, ok := parsed["logo"]; ok {
			if logoBytes, err := json.MarshalIndent(logo, "", "  "); err == nil {
				_, _ = saveConfigFile("mask_logo.json", string(logoBytes))
			}
		}
	}
	return saveConfigFile(AppConfigFileName, content)
}

func (a *App) GetMaskLogoConfigPath() (string, error) {
	return getExeRelativePath(AppConfigFileName)
}

func (a *App) LoadMaskLogoConfig() (*PanelsConfigResult, error) {
	cfgRes, err := a.LoadAppConfig()
	if err == nil && cfgRes != nil && cfgRes.Content != "" {
		var parsed map[string]interface{}
		if err := json.Unmarshal([]byte(cfgRes.Content), &parsed); err == nil {
			if logo, ok := parsed["logo"]; ok {
				if logoBytes, err := json.MarshalIndent(logo, "", "  "); err == nil {
					return &PanelsConfigResult{FilePath: cfgRes.FilePath, Content: string(logoBytes)}, nil
				}
			}
		}
	}
	return loadConfigFileWithDefault("mask_logo.json", "")
}

func (a *App) SaveMaskLogoConfig(content string) (string, error) {
	cfgRes, err := a.LoadAppConfig()
	var fullCfg map[string]interface{}
	if err == nil && cfgRes != nil && cfgRes.Content != "" {
		_ = json.Unmarshal([]byte(cfgRes.Content), &fullCfg)
	}
	if fullCfg == nil {
		fullCfg = make(map[string]interface{})
	}
	if fullCfg["language"] == nil || fullCfg["language"] == "" {
		fullCfg["language"] = a.GetSystemLanguage()
	}
	var logoParsed interface{}
	if err := json.Unmarshal([]byte(content), &logoParsed); err == nil {
		fullCfg["logo"] = logoParsed
	} else {
		fullCfg["logo"] = content
	}

	if cfgBytes, err := json.MarshalIndent(fullCfg, "", "  "); err == nil {
		_, _ = saveConfigFile(AppConfigFileName, string(cfgBytes))
	}
	return saveConfigFile("mask_logo.json", content)
}



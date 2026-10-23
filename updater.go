package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	CurrentAppVersion = "0.0.9"
	GitHubRepoOwner   = "blacknoise228"
	GitHubRepoName    = "engineering-led-tool"
	FallbackRepoName  = "ss-engineering-desktop"
)

type GitHubAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
	ContentType        string `json:"content_type"`
}

type GitHubRelease struct {
	TagName     string        `json:"tag_name"`
	Name        string        `json:"name"`
	Body        string        `json:"body"`
	Draft       bool          `json:"draft"`
	Prerelease  bool          `json:"prerelease"`
	PublishedAt string        `json:"published_at"`
	HTMLURL     string        `json:"html_url"`
	Assets      []GitHubAsset `json:"assets"`
}

type UpdateInfo struct {
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	HasUpdate      bool   `json:"hasUpdate"`
	ReleaseName    string `json:"releaseName"`
	ReleaseNotes   string `json:"releaseNotes"`
	ReleaseDate    string `json:"releaseDate"`
	DownloadURL    string `json:"downloadURL"`
	FileName       string `json:"fileName"`
	FileSize       int64  `json:"fileSize"`
	HTMLURL        string `json:"htmlURL"`
	ErrorMessage   string `json:"errorMessage,omitempty"`
}

type DownloadProgress struct {
	BytesDownloaded int64   `json:"bytesDownloaded"`
	TotalBytes      int64   `json:"totalBytes"`
	Percentage      float64 `json:"percentage"`
	Speed           int64   `json:"speed"`
	Status          string  `json:"status"` // "downloading", "completed", "error", "cancelled"
	FilePath        string  `json:"filePath"`
	Error           string  `json:"error,omitempty"`
}

type UpdateManager struct {
	app                *App
	mu                 sync.Mutex
	cancelFunc         context.CancelFunc
	downloading        bool
	lastDownloadedPath string
}

type semver struct {
	major      int
	minor      int
	patch      int
	prerelease string
}

func parseSemver(v string) semver {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "v")
	v = strings.TrimPrefix(v, "V")

	if idx := strings.Index(v, "+"); idx != -1 {
		v = v[:idx]
	}

	var prerelease string
	if idx := strings.Index(v, "-"); idx != -1 {
		prerelease = v[idx+1:]
		v = v[:idx]
	}

	parts := strings.Split(v, ".")
	var s semver
	s.prerelease = prerelease

	if len(parts) > 0 {
		s.major, _ = strconv.Atoi(parts[0])
	}
	if len(parts) > 1 {
		s.minor, _ = strconv.Atoi(parts[1])
	}
	if len(parts) > 2 {
		s.patch, _ = strconv.Atoi(parts[2])
	}
	return s
}

func compareSemver(v1, v2 string) int {
	s1 := parseSemver(v1)
	s2 := parseSemver(v2)

	if s1.major != s2.major {
		if s1.major > s2.major {
			return 1
		}
		return -1
	}
	if s1.minor != s2.minor {
		if s1.minor > s2.minor {
			return 1
		}
		return -1
	}
	if s1.patch != s2.patch {
		if s1.patch > s2.patch {
			return 1
		}
		return -1
	}

	if s1.prerelease == "" && s2.prerelease != "" {
		return 1
	}
	if s1.prerelease != "" && s2.prerelease == "" {
		return -1
	}
	if s1.prerelease != "" && s2.prerelease != "" {
		if s1.prerelease > s2.prerelease {
			return 1
		} else if s1.prerelease < s2.prerelease {
			return -1
		}
	}

	return 0
}

func selectBestAsset(assets []GitHubAsset, targetOS, targetArch string) *GitHubAsset {
	var bestAsset *GitHubAsset
	highestScore := -1

	for i := range assets {
		asset := &assets[i]
		lowerName := strings.ToLower(asset.Name)
		score := 0

		switch targetOS {
		case "windows":
			if strings.HasSuffix(lowerName, ".exe") {
				score += 50
				if strings.Contains(lowerName, "installer") || strings.Contains(lowerName, "setup") {
					score += 30
				}
				if targetArch == "amd64" && (strings.Contains(lowerName, "amd64") || strings.Contains(lowerName, "x64") || strings.Contains(lowerName, "win64")) {
					score += 20
				}
				if targetArch == "arm64" && strings.Contains(lowerName, "arm64") {
					score += 20
				}
			} else if strings.HasSuffix(lowerName, ".msi") {
				score += 45
			} else if strings.HasSuffix(lowerName, ".zip") {
				if strings.Contains(lowerName, "win") || strings.Contains(lowerName, "windows") {
					score += 20
				}
			}

		case "darwin":
			if strings.HasSuffix(lowerName, ".dmg") {
				score += 50
			} else if strings.HasSuffix(lowerName, ".pkg") {
				score += 45
			} else if strings.HasSuffix(lowerName, ".zip") && (strings.Contains(lowerName, "mac") || strings.Contains(lowerName, "darwin") || strings.Contains(lowerName, "apple")) {
				score += 30
			}
			if targetArch == "arm64" && (strings.Contains(lowerName, "arm64") || strings.Contains(lowerName, "m1") || strings.Contains(lowerName, "apple-silicon")) {
				score += 20
			}
			if targetArch == "amd64" && (strings.Contains(lowerName, "amd64") || strings.Contains(lowerName, "x64") || strings.Contains(lowerName, "intel")) {
				score += 20
			}

		case "linux":
			if strings.HasSuffix(lowerName, ".appimage") {
				score += 50
			} else if strings.HasSuffix(lowerName, ".deb") {
				score += 40
			} else if strings.HasSuffix(lowerName, ".tar.gz") {
				score += 20
			}
			if strings.Contains(lowerName, targetArch) {
				score += 15
			}
		}

		if score > highestScore {
			highestScore = score
			bestAsset = asset
		}
	}

	if highestScore <= 0 && len(assets) > 0 {
		return &assets[0]
	}

	return bestAsset
}

func fetchLatestRelease(repoOwner, repoName string) (*GitHubRelease, error) {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", repoOwner, repoName)
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Engineering-LED-Tool-Updater")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, errors.New("releases_not_found")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github api returned status: %s", resp.Status)
	}

	var rel GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return nil, fmt.Errorf("error decoding release JSON: %w", err)
	}
	return &rel, nil
}

func (a *App) GetAppVersion() string {
	return CurrentAppVersion
}

func (a *App) CheckForUpdates() (*UpdateInfo, error) {
	rel, err := fetchLatestRelease(GitHubRepoOwner, GitHubRepoName)
	if err != nil && err.Error() == "releases_not_found" && FallbackRepoName != "" {
		rel, err = fetchLatestRelease(GitHubRepoOwner, FallbackRepoName)
	}

	if err != nil {
		if err.Error() == "releases_not_found" {
			return &UpdateInfo{
				CurrentVersion: CurrentAppVersion,
				LatestVersion:  CurrentAppVersion,
				HasUpdate:      false,
				ReleaseName:    "Релизов пока нет",
				ReleaseNotes:   "Новых версий не найдено на GitHub.",
			}, nil
		}
		return nil, fmt.Errorf("не удалось проверить обновления: %w", err)
	}

	latestVer := strings.TrimPrefix(rel.TagName, "v")
	hasUpdate := compareSemver(latestVer, CurrentAppVersion) > 0

	info := &UpdateInfo{
		CurrentVersion: CurrentAppVersion,
		LatestVersion:  rel.TagName,
		HasUpdate:      hasUpdate,
		ReleaseName:    rel.Name,
		ReleaseNotes:   rel.Body,
		ReleaseDate:    rel.PublishedAt,
		HTMLURL:        rel.HTMLURL,
	}

	bestAsset := selectBestAsset(rel.Assets, runtime.GOOS, runtime.GOARCH)
	if bestAsset != nil {
		info.DownloadURL = bestAsset.BrowserDownloadURL
		info.FileName = bestAsset.Name
		info.FileSize = bestAsset.Size
	} else if rel.HTMLURL != "" {
		info.DownloadURL = rel.HTMLURL
	}

	return info, nil
}

func (a *App) StartUpdateDownload(downloadURL string, fileName string) error {
	a.updateMgr.mu.Lock()
	if a.updateMgr.downloading {
		a.updateMgr.mu.Unlock()
		return errors.New("загрузка уже выполняется")
	}

	ctx, cancel := context.WithCancel(context.Background())
	a.updateMgr.cancelFunc = cancel
	a.updateMgr.downloading = true
	a.updateMgr.mu.Unlock()

	go a.performDownload(ctx, downloadURL, fileName)
	return nil
}

func (a *App) performDownload(ctx context.Context, downloadURL string, fileName string) {
	defer func() {
		a.updateMgr.mu.Lock()
		a.updateMgr.downloading = false
		a.updateMgr.cancelFunc = nil
		a.updateMgr.mu.Unlock()
	}()

	emitProgress := func(dp DownloadProgress) {
		if a.ctx != nil {
			wailsRuntime.EventsEmit(a.ctx, "update-download-progress", dp)
		}
	}

	if fileName == "" {
		fileName = filepath.Base(downloadURL)
	}
	if fileName == "" || fileName == "/" || fileName == "." {
		fileName = "engineering-led-tool-update.exe"
	}

	destDir := filepath.Join(os.TempDir(), "engineering-led-tool-updates")
	if err := os.MkdirAll(destDir, 0755); err != nil {
		emitProgress(DownloadProgress{Status: "error", Error: fmt.Sprintf("ошибка создания каталога: %v", err)})
		return
	}

	destPath := filepath.Join(destDir, fileName)
	partPath := destPath + ".part"

	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		emitProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return
	}
	req.Header.Set("User-Agent", "Engineering-LED-Tool-Updater")

	client := &http.Client{Timeout: 0}
	resp, err := client.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			emitProgress(DownloadProgress{Status: "cancelled"})
			_ = os.Remove(partPath)
			return
		}
		emitProgress(DownloadProgress{Status: "error", Error: err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		emitProgress(DownloadProgress{Status: "error", Error: fmt.Sprintf("сервер вернул статус %s", resp.Status)})
		return
	}

	out, err := os.Create(partPath)
	if err != nil {
		emitProgress(DownloadProgress{Status: "error", Error: fmt.Sprintf("ошибка создания файла: %v", err)})
		return
	}

	totalBytes := resp.ContentLength
	var downloadedBytes int64
	buf := make([]byte, 64*1024)

	lastEmit := time.Now()
	lastBytes := int64(0)
	var speed int64 = 0

	emitProgress(DownloadProgress{
		Status:          "downloading",
		TotalBytes:      totalBytes,
		BytesDownloaded: 0,
		Percentage:      0,
		FilePath:        destPath,
	})

	for {
		select {
		case <-ctx.Done():
			out.Close()
			_ = os.Remove(partPath)
			emitProgress(DownloadProgress{Status: "cancelled"})
			return
		default:
		}

		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			_, writeErr := out.Write(buf[:n])
			if writeErr != nil {
				out.Close()
				_ = os.Remove(partPath)
				emitProgress(DownloadProgress{Status: "error", Error: fmt.Sprintf("ошибка записи: %v", writeErr)})
				return
			}
			downloadedBytes += int64(n)

			now := time.Now()
			elapsed := now.Sub(lastEmit)
			if elapsed >= 200*time.Millisecond {
				if elapsed.Seconds() > 0 {
					speed = int64(float64(downloadedBytes-lastBytes) / elapsed.Seconds())
				}
				lastBytes = downloadedBytes
				lastEmit = now

				var pct float64
				if totalBytes > 0 {
					pct = float64(downloadedBytes) / float64(totalBytes) * 100.0
					if pct > 100.0 {
						pct = 100.0
					}
				}

				emitProgress(DownloadProgress{
					Status:          "downloading",
					BytesDownloaded: downloadedBytes,
					TotalBytes:      totalBytes,
					Percentage:      pct,
					Speed:           speed,
					FilePath:        destPath,
				})
			}
		}

		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			if ctx.Err() != nil {
				out.Close()
				_ = os.Remove(partPath)
				emitProgress(DownloadProgress{Status: "cancelled"})
				return
			}
			out.Close()
			_ = os.Remove(partPath)
			emitProgress(DownloadProgress{Status: "error", Error: fmt.Sprintf("ошибка скачивания: %v", readErr)})
			return
		}
	}

	out.Close()

	_ = os.Remove(destPath)
	if err := os.Rename(partPath, destPath); err != nil {
		emitProgress(DownloadProgress{Status: "error", Error: fmt.Sprintf("ошибка сохранения файла: %v", err)})
		return
	}

	a.updateMgr.mu.Lock()
	a.updateMgr.lastDownloadedPath = destPath
	a.updateMgr.mu.Unlock()

	emitProgress(DownloadProgress{
		Status:          "completed",
		BytesDownloaded: downloadedBytes,
		TotalBytes:      downloadedBytes,
		Percentage:      100.0,
		Speed:           0,
		FilePath:        destPath,
	})
}

func (a *App) GetDownloadedUpdatePath() string {
	a.updateMgr.mu.Lock()
	defer a.updateMgr.mu.Unlock()
	return a.updateMgr.lastDownloadedPath
}

func (a *App) CancelUpdateDownload() error {
	a.updateMgr.mu.Lock()
	defer a.updateMgr.mu.Unlock()

	if a.updateMgr.cancelFunc != nil {
		a.updateMgr.cancelFunc()
		a.updateMgr.cancelFunc = nil
		a.updateMgr.downloading = false
	}
	return nil
}

func (a *App) InstallUpdate(filePath string) error {
	if strings.TrimSpace(filePath) == "" {
		a.updateMgr.mu.Lock()
		filePath = a.updateMgr.lastDownloadedPath
		a.updateMgr.mu.Unlock()
	}

	cleanPath := filepath.Clean(filePath)

	// If path is empty, doesn't exist or is a directory, check default updates directory
	if fi, err := os.Stat(cleanPath); err != nil || fi.IsDir() {
		destDir := filepath.Join(os.TempDir(), "engineering-led-tool-updates")
		if entries, readErr := os.ReadDir(destDir); readErr == nil {
			for _, e := range entries {
				if !e.IsDir() && strings.HasSuffix(strings.ToLower(e.Name()), ".exe") && !strings.HasSuffix(e.Name(), ".part") {
					cleanPath = filepath.Join(destDir, e.Name())
					break
				}
			}
		}
	}

	fi, err := os.Stat(cleanPath)
	if err != nil || fi.IsDir() {
		return fmt.Errorf("файл обновления не найден: %s", cleanPath)
	}

	switch runtime.GOOS {
	case "windows":
		// On Windows, NSIS installers require admin elevation.
		// Using cmd /c start "" "<path>" triggers Windows ShellExecute with UAC elevation support
		cmd := exec.Command("cmd", "/c", "start", "", cleanPath)
		if err := cmd.Start(); err != nil {
			psCmd := exec.Command("powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", fmt.Sprintf("Start-Process -FilePath '%s'", cleanPath))
			if psErr := psCmd.Start(); psErr != nil {
				return fmt.Errorf("ошибка запуска установщика: %v (ps: %v)", err, psErr)
			}
		}
		go func() {
			time.Sleep(1000 * time.Millisecond)
			if a.ctx != nil {
				wailsRuntime.Quit(a.ctx)
			}
		}()
	case "darwin":
		cmd := exec.Command("open", cleanPath)
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("ошибка открытия файла обновления: %w", err)
		}
	default:
		cmd := exec.Command("xdg-open", cleanPath)
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("ошибка открытия файла обновления: %w", err)
		}
	}
	return nil
}

func (a *App) ShowFileInFolder(filePath string) error {
	if strings.TrimSpace(filePath) == "" {
		a.updateMgr.mu.Lock()
		filePath = a.updateMgr.lastDownloadedPath
		a.updateMgr.mu.Unlock()
	}

	cleanPath := filepath.Clean(filePath)
	if fi, err := os.Stat(cleanPath); err != nil || fi.IsDir() {
		destDir := filepath.Join(os.TempDir(), "engineering-led-tool-updates")
		if entries, readErr := os.ReadDir(destDir); readErr == nil {
			for _, e := range entries {
				if !e.IsDir() && !strings.HasSuffix(e.Name(), ".part") {
					cleanPath = filepath.Join(destDir, e.Name())
					break
				}
			}
		}
	}

	switch runtime.GOOS {
	case "windows":
		return exec.Command("explorer.exe", "/select,", cleanPath).Start()
	case "darwin":
		return exec.Command("open", "-R", cleanPath).Start()
	default:
		return exec.Command("xdg-open", filepath.Dir(cleanPath)).Start()
	}
}

func (a *App) OpenURLInBrowser(url string) error {
	if a.ctx != nil {
		wailsRuntime.BrowserOpenURL(a.ctx, url)
		return nil
	}
	return nil
}

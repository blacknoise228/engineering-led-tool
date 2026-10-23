package main

import (
	"testing"
)

func TestCompareSemver(t *testing.T) {
	tests := []struct {
		v1       string
		v2       string
		expected int
	}{
		{"0.1.0", "0.1.0", 0},
		{"v0.1.0", "0.1.0", 0},
		{"0.2.0", "0.1.0", 1},
		{"0.1.0", "0.2.0", -1},
		{"1.0.0", "0.9.9", 1},
		{"0.1.1", "0.1.0", 1},
		{"0.1.0", "0.1.1", -1},
		{"v1.0.0", "v1.0.0-rc1", 1},
		{"v1.0.0-beta", "v1.0.0", -1},
		{"v1.2.3", "v1.2.3+build123", 0},
	}

	for _, tt := range tests {
		res := compareSemver(tt.v1, tt.v2)
		if res != tt.expected {
			t.Errorf("compareSemver(%q, %q) = %d; want %d", tt.v1, tt.v2, res, tt.expected)
		}
	}
}

func TestSelectBestAsset(t *testing.T) {
	assets := []GitHubAsset{
		{Name: "engineering-led-tool-0.2.0.zip", BrowserDownloadURL: "https://example.com/zip", Size: 100},
		{Name: "engineering-led-tool.exe", BrowserDownloadURL: "https://example.com/portable", Size: 200},
		{Name: "engineering-led-tool-amd64-installer.exe", BrowserDownloadURL: "https://example.com/installer", Size: 300},
		{Name: "engineering-led-tool-arm64.dmg", BrowserDownloadURL: "https://example.com/mac-arm", Size: 400},
	}

	winAsset := selectBestAsset(assets, "windows", "amd64")
	if winAsset == nil || winAsset.Name != "engineering-led-tool-amd64-installer.exe" {
		t.Fatalf("expected windows installer exe, got %v", winAsset)
	}

	macAsset := selectBestAsset(assets, "darwin", "arm64")
	if macAsset == nil || macAsset.Name != "engineering-led-tool-arm64.dmg" {
		t.Fatalf("expected mac arm64 dmg, got %v", macAsset)
	}
}

"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  WindowMinimise,
  WindowToggleMaximise,
  WindowIsMaximised,
  Quit,
} from "../../wailsjs/wailsjs/runtime";
import { useUpdater } from "@/lib/useUpdater";

export default function NavBar() {
  const [isMaximised, setIsMaximised] = useState(false);
  const { currentVersion, updateInfo, checking, setIsModalOpen, checkForUpdatesManual } = useUpdater();

  async function checkMaximised() {
    const maximised = await WindowIsMaximised();
    setIsMaximised(maximised);
  }

  function handleMinimize() {
    WindowMinimise();
  }

  async function handleToggleMaximize() {
    WindowToggleMaximise();
    setTimeout(checkMaximised, 80);
  }

  function handleClose() {
    Quit();
  }

  function onNavbarDblClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    // Класс 'eng-no-drag' заменен на явную проверку узлов или кастомного атрибута.
    // Если клик по кнопке, инпуту или ссылке - игнорируем.
    if (target.closest("button, input, a, [data-no-drag]")) return;
    handleToggleMaximize();
  }

  useEffect(() => {
    checkMaximised();
    window.addEventListener("resize", checkMaximised);
    return () => {
      window.removeEventListener("resize", checkMaximised);
    };
  }, []);

  return (
<header
  className="w-full h-[32px] shrink-0 bg-[#16181d] border-b border-[#2a2d36] flex items-center justify-between pl-4 select-none z-50"
  style={{ "--wails-draggable": "drag" } as React.CSSProperties}
  onDoubleClick={onNavbarDblClick}
>
        {/* LOGO AND TITLE */}
        <div
          className="flex items-center gap-2.5"
          style={{ "--wails-draggable": "drag" } as React.CSSProperties}
        >
          <Image
            src="/logo.png"
            alt="Logo"
            className="w-6 h-6 object-contain select-none pointer-events-none [-webkit-user-drag:none]"
            style={{ "--wails-draggable": "drag" } as React.CSSProperties}
            width={32}
            height={32}
          />
          <span className="text-[14px] tracking-[2px] text-[#7a828e] font-semibold">
            Engineering LED Tool
          </span>
          <span className="text-[10px] text-[#525866] font-mono tracking-normal select-none">
            v{currentVersion}
          </span>
        </div>

        {/* DRAG REGION */}
        <div
          className="flex-1 h-full"
          style={{ "--wails-draggable": "drag" } as React.CSSProperties}
        ></div>

        {/* RIGHT SECTION: ACTIONS AND WINDOW CONTROLS */}
        <div
          className="flex items-center h-full gap-2.5"
          data-no-drag
          style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}
        >
          {/* UPDATE BUTTON / BADGE */}
          {updateInfo?.hasUpdate ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition shadow-sm animate-pulse cursor-pointer"
              title={`Доступно обновление ${updateInfo.latestVersion}! Нажмите для загрузки`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Обновление {updateInfo.latestVersion}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setIsModalOpen(true);
                if (!updateInfo) checkForUpdatesManual();
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-[#7a828e] hover:text-[#e6edf3] hover:bg-white/10 transition cursor-pointer"
              title="Проверить обновления"
            >
              <svg
                className={`w-3.5 h-3.5 ${checking ? "animate-spin text-cyan-400" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          {/* WINDOW CONTROLS (MINIMIZE, MAXIMIZE/RESTORE, CLOSE) */}
          <div
            className="flex items-stretch h-full"
            data-no-drag
            style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}
          >
            <button
              className="inline-flex items-center justify-center w-[46px] h-full bg-transparent text-[#8b949e] transition-colors duration-[120ms] outline-none hover:bg-white/10 hover:text-[#e6edf3] active:bg-white/[0.14]"
              onClick={handleMinimize}
              title="Minimize"
              aria-label="Minimize"
            >
              <svg width="10" height="2" viewBox="0 0 10 2">
                <line
                  x1="0"
                  y1="1"
                  x2="10"
                  y2="1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </button>

            <button
              className="inline-flex items-center justify-center w-[46px] h-full bg-transparent text-[#8b949e] transition-colors duration-[120ms] outline-none hover:bg-white/10 hover:text-[#e6edf3] active:bg-white/[0.14]"
              onClick={handleToggleMaximize}
              title={isMaximised ? "Restore" : "Maximize"}
              aria-label={isMaximised ? "Restore" : "Maximize"}
            >
              {isMaximised ? (
                /* Restore icon */
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect
                    x="2.5"
                    y="0.5"
                    width="7"
                    height="7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <polyline
                    points="0.5,2.5 0.5,9.5 7.5,9.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              ) : (
                /* Maximize icon */
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect
                    x="0.5"
                    y="0.5"
                    width="9"
                    height="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              )}
            </button>

            <button
              className="inline-flex items-center justify-center w-[46px] h-full bg-transparent text-[#8b949e] transition-colors duration-[120ms] outline-none hover:bg-[#e81123] hover:text-white active:bg-[#bf0f1d] active:text-white"
              onClick={handleClose}
              title="Close"
              aria-label="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line
                  x1="1"
                  y1="1"
                  x2="9"
                  y2="9"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <line
                  x1="9"
                  y1="1"
                  x2="1"
                  y2="9"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>
  );
}

import React, { useState, useCallback, useEffect } from "react";
import Header from "./components/Header";
import TabBar from "./components/TabBar";
import SearchTab from "./components/SearchTab";
import SettingsScreen from "./components/SettingsScreen";

let nextTabId = 1;
function createTab() {
  return { id: nextTabId++, label: `Search ${nextTabId - 1}` };
}

export default function App() {
  const [tabs, setTabs] = useState(() => [createTab()]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  const addTab = useCallback(() => {
    const tab = createTab();
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const closeTab = useCallback(
    (id) => {
      setTabs((prev) => {
        if (prev.length === 1) return prev;
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (id === activeTabId) {
          const newIdx = Math.min(idx, next.length - 1);
          setActiveTabId(next[newIdx].id);
        }
        return next;
      });
    },
    [activeTabId]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === "t") {
        e.preventDefault();
        addTab();
      } else if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        closeTab(activeTabId);
      } else if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        setTabs((prev) => {
          const idx = prev.findIndex((t) => t.id === activeTabId);
          const next = e.shiftKey
            ? (idx - 1 + prev.length) % prev.length
            : (idx + 1) % prev.length;
          setActiveTabId(prev[next].id);
          return prev;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTabId, addTab, closeTab]);

  return (
    <div className="app-shell">
      <Header onOpenSettings={() => setShowSettings(true)} />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onClose={closeTab}
        onAdd={addTab}
      />
      <div className="tab-content">
        {showSettings ? (
          <SettingsScreen onClose={() => setShowSettings(false)} />
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              className="tab-pane"
              style={{ display: tab.id === activeTabId ? "flex" : "none" }}
            >
              <SearchTab tabId={tab.id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

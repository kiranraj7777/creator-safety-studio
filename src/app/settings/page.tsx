"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import { Save, Trash2, Shield, RefreshCw, Link2, Unlink, Book, Plus, X } from "lucide-react";

interface Platform {
  id: string;
  platform: string;
  accountId: string;
  accountName: string | null;
  status: string;
  lastSyncAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const [threshold, setThreshold] = useState([50]);
  const [retentionDays, setRetentionDays] = useState([30]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [channelIdInput, setChannelIdInput] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [editingYoutube, setEditingYoutube] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");

  useEffect(() => {
    fetch("/api/platforms/connect")
      .then((r) => r.json())
      .then((d) => setPlatforms(d.platforms || []))
      .catch(() => {});
  }, []);

  const youtubePlatform = platforms.find((p) => p.platform === "youtube");

  async function connectYoutube() {
    if (!channelIdInput.trim()) return;
    if (youtubePlatform) {
      await fetch("/api/platforms/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId: youtubePlatform.id }),
      });
    }
    await fetch("/api/platforms/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "youtube",
        accountId: channelIdInput.trim(),
        accountName: channelIdInput.trim(),
      }),
    });
    setChannelIdInput("");
    setShowYoutubeInput(false);
    setEditingYoutube(false);
    const r = await fetch("/api/platforms/connect");
    const d = await r.json();
    setPlatforms(d.platforms || []);
  }

  async function syncYoutube() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/cron/sync-youtube", { method: "POST" });
      const data = await res.json();
      setSyncResult(data.commentsSynced !== undefined ? `Synced ${data.commentsSynced} comments` : "Sync completed");
    } catch {
      setSyncResult("Sync failed");
    }
    setSyncing(false);
  }

  async function disconnectPlatform(id: string) {
    await fetch("/api/platforms/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformId: id }),
    });
    const r = await fetch("/api/platforms/connect");
    const d = await r.json();
    setPlatforms(d.platforms || []);
  }

  async function saveSettings() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagThreshold: threshold[0], retentionDays: retentionDays[0] }),
    });
  }

  async function exportData() {
    const res = await fetch(`/api/export?format=${exportFormat}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function eraseData() {
    if (!confirm("Are you sure? This will permanently delete all your data.")) return;
    if (!confirm("This cannot be undone. Proceed?")) return;
    await fetch("/api/delete-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorHandleHash: "all" }),
    });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage moderation thresholds, retention, and connected platforms.
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Moderation Threshold
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Flagging Threshold</label>
                <span className="text-sm text-muted-foreground">
                  {threshold[0]}% toxicity
                </span>
              </div>
              <Slider
                value={threshold}
                onValueChange={setThreshold}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                Comments scoring above this will be flagged. Lower values catch more
                potential abuse; higher values reduce false positives.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Data Retention Window</label>
                <span className="text-sm text-muted-foreground">
                  {retentionDays[0]} days
                </span>
              </div>
              <Slider
                value={retentionDays}
                onValueChange={setRetentionDays}
                min={7}
                max={90}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Raw comment text is automatically deleted after this period. Only
                hashed IDs and scores are kept for long-term analytics.
              </p>
            </div>

            <Button className="w-full sm:w-auto" onClick={saveSettings}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <p className="font-medium">YouTube</p>
                  {youtubePlatform ? (
                    <>
                      <p className="text-sm text-green-600">Connected: {youtubePlatform.accountName}</p>
                      <p className="text-xs text-muted-foreground">
                        Last sync: {youtubePlatform.lastSyncAt ? new Date(youtubePlatform.lastSyncAt).toLocaleString() : "Never"}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {youtubePlatform ? (
                    editingYoutube ? (
                      <div className="flex gap-2">
                        <input
                          className="w-48 rounded-md border px-2 py-1 text-sm"
                          placeholder="Channel ID (UC...)"
                          value={channelIdInput}
                          onChange={(e) => setChannelIdInput(e.target.value)}
                        />
                        <Button variant="default" size="sm" onClick={async () => { await connectYoutube(); setEditingYoutube(false); }}>
                          <Link2 className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => { setEditingYoutube(true); setChannelIdInput(youtubePlatform.accountId); }}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={syncYoutube} disabled={syncing}>
                          <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                          Sync
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => disconnectPlatform(youtubePlatform.id)}>
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </>
                    )
                  ) : showYoutubeInput ? (
                    <div className="flex gap-2">
                      <input
                        className="w-48 rounded-md border px-2 py-1 text-sm"
                        placeholder="Channel ID (UC...)"
                        value={channelIdInput}
                        onChange={(e) => setChannelIdInput(e.target.value)}
                      />
                      <Button variant="default" size="sm" onClick={connectYoutube}>
                        <Link2 className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setShowYoutubeInput(true)}>
                      <Link2 className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
              {syncResult && (
                <p className="text-sm text-muted-foreground text-center">{syncResult}</p>
              )}
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <p className="font-medium">Instagram</p>
                  <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Connect
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Dictionary — Add Toxic Words
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Add words or phrases the moderation engine should flag. Supports English, Tamil, and Tanglish.
            </p>
          </CardHeader>
          <CardContent>
            <DictionarySection />
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">Export All Data</p>
                <p className="text-sm text-muted-foreground">
                  Download a JSON or CSV export of your data.
                </p>
              </div>
              <select
                className="h-9 rounded-md border px-2 text-sm bg-background"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as "json" | "csv")}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <Button variant="outline" size="sm" onClick={exportData}>
                Export
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">
                  Erase Account Data
                </p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all stored comments and profiles.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={eraseData}>
                <Trash2 className="h-4 w-4 mr-2" />
                Erase
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DictionarySection() {
  const [terms, setTerms] = useState<Array<{ id: string; term: string; language: string; category: string; severity: number }>>([]);
  const [newTerm, setNewTerm] = useState("");
  const [newLang, setNewLang] = useState("en");
  const [newCat, setNewCat] = useState("harassment");
  const [newSev, setNewSev] = useState(0.5);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/dictionary")
      .then((r) => r.json())
      .then((d) => { setTerms(d.terms || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addWord = async () => {
    if (!newTerm.trim()) return;
    setAdding(true);
    setMsg("");
    const res = await fetch("/api/admin/dictionary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: newTerm.trim(), language: newLang, category: newCat, severity: newSev }),
    });
    if (res.ok) {
      const d = await res.json();
      setTerms((prev) => [d.term, ...prev]);
      setNewTerm("");
      setMsg("Word added successfully!");
    } else {
      const err = await res.json();
      setMsg(`Error: ${err.error || "Failed to add word"}`);
    }
    setAdding(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const removeWord = async (term: string, language: string) => {
    await fetch(`/api/admin/dictionary?term=${encodeURIComponent(term)}&language=${encodeURIComponent(language)}`, { method: "DELETE" });
    setTerms((prev) => prev.filter((t) => !(t.term === term && t.language === language)));
  };

  const languages: Record<string, string> = { en: "English", ta: "Tamil", tanglish: "Tanglish" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs text-muted-foreground mb-1 block">Word or phrase</label>
          <input className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" placeholder="e.g. scammer" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} />
        </div>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={newLang} onChange={(e) => setNewLang(e.target.value)}>
          <option value="en">English</option>
          <option value="ta">Tamil</option>
          <option value="tanglish">Tanglish</option>
        </select>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
          <option value="harassment">Harassment</option>
          <option value="spam">Spam</option>
          <option value="fraud">Fraud</option>
          <option value="insult">Insult</option>
          <option value="hate_speech">Hate Speech</option>
        </select>
        <div className="w-16">
          <label className="text-xs text-muted-foreground mb-1 block">Severity</label>
          <input className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" type="number" step="0.1" min="0" max="1" value={newSev} onChange={(e) => setNewSev(parseFloat(e.target.value))} />
        </div>
        <Button size="sm" onClick={addWord} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading dictionary...</p>
      ) : terms.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No words in dictionary. Add words above.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {terms.slice(0, 20).map((t) => (
            <div key={t.id} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-sm">
              <span className="font-mono text-xs">{t.term}</span>
              <span className="text-[10px] text-muted-foreground">{languages[t.language] || t.language}</span>
              <button onClick={() => removeWord(t.term, t.language)} className="text-muted-foreground hover:text-destructive ml-1">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {terms.length > 20 && <span className="text-xs text-muted-foreground self-center">+{terms.length - 20} more</span>}
        </div>
      )}
    </div>
  );
}

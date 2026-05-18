"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save } from "lucide-react";

interface DictionaryTerm {
  id: string;
  term: string;
  language: string;
  category: string;
  severity: number;
  isRegex: boolean;
  active: boolean;
}

export default function DictionaryAdminPage() {
  const [terms, setTerms] = useState<DictionaryTerm[]>([]);
  const [newTerm, setNewTerm] = useState({ term: "", language: "en", category: "harassment", severity: 0.5 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dictionary")
      .then((r) => r.json())
      .then((data) => { setTerms(data.terms || []); setLoading(false); });
  }, []);

  const addTerm = async () => {
    const res = await fetch("/api/admin/dictionary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTerm),
    });
    if (res.ok) {
      const data = await res.json();
      setTerms((prev) => [...prev, data.term]);
      setNewTerm({ term: "", language: "en", category: "harassment", severity: 0.5 });
    }
  };

  const deactivateTerm = async (term: string, language: string) => {
    await fetch(`/api/admin/dictionary?term=${encodeURIComponent(term)}&language=${encodeURIComponent(language)}`, { method: "DELETE" });
    setTerms((prev) => prev.filter((t) => !(t.term === term && t.language === language)));
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading dictionary...</div>;

  const languages: Record<string, string> = { en: "English", ta: "Tamil", tanglish: "Tanglish" };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dictionary Editor</h1>
          <p className="text-muted-foreground">Manage abuse detection terms for the moderation engine.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Add New Term</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <input className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Term or pattern" value={newTerm.term} onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })} />
            <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={newTerm.language} onChange={(e) => setNewTerm({ ...newTerm, language: e.target.value })}>
              <option value="en">English</option><option value="ta">Tamil</option><option value="tanglish">Tanglish</option>
            </select>
            <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" value={newTerm.category} onChange={(e) => setNewTerm({ ...newTerm, category: e.target.value })}>
              <option value="harassment">Harassment</option><option value="spam">Spam</option><option value="fraud">Fraud</option><option value="insult">Insult</option><option value="hate_speech">Hate Speech</option>
            </select>
            <input className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-20" type="number" step="0.1" min="0" max="1" value={newTerm.severity} onChange={(e) => setNewTerm({ ...newTerm, severity: parseFloat(e.target.value) })} />
            <Button onClick={addTerm}><Plus className="h-4 w-4 mr-2" />Add Term</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Active Terms ({terms.length})</CardTitle></CardHeader>
        <CardContent>
          {terms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No dictionary terms configured. Add terms above.</p>
          ) : (
            <div className="space-y-2">
              {terms.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{t.term}</code>
                    <Badge variant="outline">{languages[t.language] || t.language}</Badge>
                    <Badge variant="secondary">{t.category}</Badge>
                    <span className="text-xs text-muted-foreground">{Math.round(t.severity * 100)}%</span>
                    {t.isRegex && <Badge>regex</Badge>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deactivateTerm(t.term, t.language)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

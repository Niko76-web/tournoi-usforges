'use client';

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// === PARAMÈTRES TOURNOI ===

// Equipes
const teamsU11 = ["Forges 1", "Forges 2", "Foucarmont 1", "Foucarmont 2"];
const teamsU13 = ["Forges 1", "Forges 2", "Gournay 1", "Gournay 2"];

// Equipes après-midi
const teamsU11Aprem = ["Forges", "Foucarmont"];
const teamsU13Aprem = ["Forges", "Gournay"];

// Fonction pour logo
function getLogoSrc(teamName: string) {
  const base = teamName.toLowerCase().replace(/ .*/, "");
  return `/logos/${base}.png`;
}

// ---- GÉNÉRATION DES MATCHS ----

// Matches matin poule 4 équipes sur 2 terrains
function generateMorningMatches(teams: string[], categorie: string) {
  // Round robin entre 4 équipes (6 matchs)
  const matchs: any[] = [];
  let horaire = new Date();
  horaire.setHours(10, 0, 0, 0); // 10h00

  let terrain = 1;
  let matchNumber = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const h = horaire.getHours().toString().padStart(2, "0");
      const m = horaire.getMinutes().toString().padStart(2, "0");
      matchs.push({
        categorie,
        equipe1: teams[i],
        equipe2: teams[j],
        phase: "matin",
        terrain,
        heure: `${h}h${m}`,
        score1: null,
        score2: null,
      });

      // Avance horaire et alterne terrain
      matchNumber++;
      terrain = terrain === 1 ? 2 : 1;
      if (matchNumber % 2 === 0) {
        horaire.setMinutes(horaire.getMinutes() + 10); // 6 min match + 4 min pause
      }
    }
  }
  return matchs;
}

// Matchs après-midi
function getAfternoonMatches() {
  return [
    // U11 - 2 mi-temps de 12 min
    {
      categorie: "U11",
      equipe1: "Forges",
      equipe2: "Foucarmont",
      phase: "apresmidi",
      heure: "14h00",
      miTemps1: null,
      miTemps2: null,
      score1: null,
      score2: null,
    },
    // U13 - 2 mi-temps de 15 min
    {
      categorie: "U13",
      equipe1: "Forges",
      equipe2: "Gournay",
      phase: "apresmidi",
      heure: "15h00",
      miTemps1: null,
      miTemps2: null,
      score1: null,
      score2: null,
    },
  ];
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"matin" | "apresmidi">("matin");
  const [scoresMatin, setScoresMatin] = useState<any[]>([]);
  const [scoresAprem, setScoresAprem] = useState<any[]>([]);

  // Récupère les matchs depuis la BDD (triés par phase)
  const fetchData = async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) return;
      const data = await res.json();
      setScoresMatin(data.filter((m: any) => m.phase === "matin"));
      setScoresAprem(data.filter((m: any) => m.phase === "apresmidi"));
    } catch (error) {
      console.error("Erreur chargement:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Génère tous les matchs
  const generateAllMatches = async () => {
    if (!confirm("Cette action va écraser les matchs existants ! Continuer ?")) return;
    // Vide la base
    await fetch("/api/scores", { method: "DELETE" });

    // Génère matin U11 + U13
    const matchs = [
      ...generateMorningMatches(teamsU11, "U11"),
      ...generateMorningMatches(teamsU13, "U13"),
      ...getAfternoonMatches(),
    ];
    for (const match of matchs) {
      await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(match),
      });
    }
    alert("Matchs générés !");
    await fetchData();
  };

  // Mise à jour score matin
  const updateScoreMatin = async (matchId: number, team: "score1" | "score2", value: string) => {
    const match = scoresMatin.find((m) => m.id === matchId);
    if (!match) return;
    match[team] = parseInt(value, 10);
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
    await fetchData();
  };

  // Mise à jour score aprem (mi-temps et total)
  const updateScoreAprem = async (matchId: number, field: "miTemps1" | "miTemps2", value: string) => {
    const match = scoresAprem.find((m) => m.id === matchId);
    if (!match) return;
    match[field] = parseInt(value, 10);
    // Calcul du total
    match.score1 = match.miTemps1 ?? 0 + match.miTemps2 ?? 0;
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
    await fetchData();
  };

  // Bouton déconnexion (si besoin)
  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    window.location.href = "/login";
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${activeTab === "matin" ? "bg-blue-100" : "bg-green-100"}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tournoi - Admin</h1>
            <p className="mt-2 text-lg">
              {activeTab === "matin"
                ? "Matin : Hand à 4 (2 terrains, chaque équipe divisée en 2)"
                : "Après-midi : Grand terrain, 1 match U11 puis 1 match U13"}
            </p>
          </div>
          <Button onClick={handleLogout} className="bg-gray-400 hover:bg-gray-500">🔒 Déconnexion</Button>
        </div>
        <div className="flex gap-4 mb-4">
          <Button onClick={generateAllMatches}>🆕 Générer les matchs</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={async () => {
            if (confirm("Vider tous les scores ?")) {
              await fetch("/api/scores", { method: "DELETE" });
              await fetchData();
            }
          }}>
            🗑️ Vider la base de données
          </Button>
        </div>

        {/* Onglets matin/après-midi */}
        <Tabs defaultValue="matin" className="w-full" onValueChange={(v) => setActiveTab(v as "matin" | "apresmidi")}>
          <TabsList>
            <TabsTrigger value="matin">Matin</TabsTrigger>
            <TabsTrigger value="apresmidi">Après-midi</TabsTrigger>
          </TabsList>

          {/* MATIN */}
          <TabsContent value="matin">
            <div className="grid gap-4">
              {scoresMatin.map((match, idx) => (
                <Card key={match.id || idx}>
                  <CardContent className="flex items-center justify-between p-4 gap-4">
                    {/* Heure & Terrain */}
                    <span className="w-20 text-xs text-gray-500">{match.heure} | Terrain {match.terrain}</span>
                    {/* Logo + Equipe 1 */}
                    <div className="flex items-center gap-2 w-1/4">
                      <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-8 h-8 object-contain" />
                      <span>{match.equipe1}</span>
                    </div>
                    {/* Score */}
                    <Input
                      type="number"
                      className="w-16"
                      value={match.score1 ?? ""}
                      onChange={(e) => updateScoreMatin(match.id, "score1", e.target.value)}
                    />
                    <span>vs</span>
                    <Input
                      type="number"
                      className="w-16"
                      value={match.score2 ?? ""}
                      onChange={(e) => updateScoreMatin(match.id, "score2", e.target.value)}
                    />
                    {/* Logo + Equipe 2 */}
                    <div className="flex items-center gap-2 w-1/4 justify-end">
                      <span>{match.equipe2}</span>
                      <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-8 h-8 object-contain" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* APRES-MIDI */}
          <TabsContent value="apresmidi">
            <div className="grid gap-4">
              {scoresAprem.map((match, idx) => (
                <Card key={match.id || idx}>
                  <CardContent className="flex items-center justify-between p-4 gap-4">
                    {/* Heure */}
                    <span className="w-20 text-xs text-gray-500">{match.heure}</span>
                    {/* Logo + Equipe 1 */}
                    <div className="flex items-center gap-2 w-1/4">
                      <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-8 h-8 object-contain" />
                      <span>{match.equipe1}</span>
                    </div>
                    {/* Scores mi-temps + total */}
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="MT1"
                      value={match.miTemps1 ?? ""}
                      onChange={(e) => updateScoreAprem(match.id, "miTemps1", e.target.value)}
                    />
                    <span className="font-bold">/</span>
                    <Input
                      type="number"
                      className="w-16"
                      placeholder="MT2"
                      value={match.miTemps2 ?? ""}
                      onChange={(e) => updateScoreAprem(match.id, "miTemps2", e.target.value)}
                    />
                    <span>=</span>
                    <span className="w-12 font-bold text-lg">
                      {(match.miTemps1 ?? 0) + (match.miTemps2 ?? 0)}
                    </span>
                    {/* Logo + Equipe 2 */}
                    <div className="flex items-center gap-2 w-1/4 justify-end">
                      <span>{match.equipe2}</span>
                      <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-8 h-8 object-contain" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


const teams = {
  U11: ["U11 Forges", "U11 Aumale", "U11 Foucarmont"],
  U13: ["U13 Forges", "U13 Aumale", "U13 Gournay"],
};

type Category = keyof typeof teams;

type Match = {
  equipe1: string;
  equipe2: string;
  score1: number | null;
  score2: number | null;
  categorie: Category;
};

function getLogoSrc(teamName: string) {
  const parts = teamName.split(" ");
  const clubName = parts.slice(1).join("-").toLowerCase();
  return `/logos/${clubName}.png`;
}

function generateMatchSchedule(totalMatches: number): string[] {
  const horaires: string[] = [];
  const start = new Date();
  start.setHours(9, 30, 0, 0); // 9h30

  for (let i = 0; i < totalMatches; i++) {
    const h = start.getHours().toString().padStart(2, "0");
    const m = start.getMinutes().toString().padStart(2, "0");
    horaires.push(`${h}h${m}`);

    // 10 minutes de match + 5 minutes de pause
    start.setMinutes(start.getMinutes() + 15);
  }

  return horaires;
}

export default function TournamentApp() {
  const [activeTab, setActiveTab] = useState<Category>("U11");
  const router = useRouter();
  const [scores, setScores] = useState<{ [key in Category]: Match[] }>({ U11: [], U13: [] });

    useEffect(() => {
        if (typeof window !== "undefined" && localStorage.getItem("isAdmin") !== "true") {
          router.push("/login");
        }
      }, []);

  const handleLogout = () => {
  localStorage.removeItem("isAdmin");
  window.location.href = "/login";
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) return;
      const data: Match[] = await res.json();
      const scoresByCat: { [key in Category]: Match[] } = { U11: [], U13: [] };
      data.forEach((match) => {
        scoresByCat[match.categorie].push(match);
      });
      setScores(scoresByCat);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateScore = async (category: Category, index: number, team: "score1" | "score2", value: string) => {
    const updated = [...scores[category]];
    updated[index][team] = parseInt(value, 10);
    setScores({ ...scores, [category]: updated });

    const match = updated[index];
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(match),
    });
  };

  const generateMatches = async () => {
    for (const category of Object.keys(teams) as Category[]) {
      const list = teams[category];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          try {
            const response = await fetch("/api/scores", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                categorie: category,
                equipe1: list[i],
                equipe2: list[j],
                score1: null,
                score2: null,
              }),
            });

            if (!response.ok) {
              const err = await response.text();
              console.error("Erreur de réponse API:", err);
            }
          } catch (error) {
            console.error("Erreur de requête fetch:", error);
          }
        }
      }
    }
    alert("Les matchs ont été générés avec succès !");
    await fetchData();
  };

  const totalMatches = scores.U11.length + scores.U13.length;
  const fullSchedule = generateMatchSchedule(totalMatches);

  const horairesU11: string[] = [];
  const horairesU13: string[] = [];

  let iU11 = 0;
  let iU13 = 0;

  for (let i = 0; i < totalMatches; i++) {
    const slot = fullSchedule[i];
    if (i % 2 === 0 && iU11 < scores.U11.length) {
      horairesU11.push(slot);
      iU11++;
    } else if (iU13 < scores.U13.length) {
      horairesU13.push(slot);
      iU13++;
    }
  }

  const clearDatabase = async () => {
    const confirmation = confirm("Voulez-vous vraiment supprimer tous les matchs ? Cette action est irréversible.");
    if (!confirmation) return;

    await fetch("/api/scores", {
      method: "DELETE",
    });
    alert("La base de données a été vidée.");
    await fetchData();
  };

  const calculateRanking = (matches: Match[], category: Category) => {
    const points: { [team: string]: { pts: number; played: number; goalsDiff: number } } = {};
    teams[category].forEach((team) => {
      points[team] = { pts: 0, played: 0, goalsDiff: 0 };
    });

    matches.forEach((match) => {
      if (match.score1 == null || match.score2 == null) return;
      const { equipe1, equipe2, score1, score2 } = match;
      points[equipe1].played++;
      points[equipe2].played++;
      points[equipe1].goalsDiff += score1 - score2;
      points[equipe2].goalsDiff += score2 - score1;

      if (score1 > score2) {
        points[equipe1].pts += 3;
        points[equipe2].pts += 1;
      } else if (score1 < score2) {
        points[equipe1].pts += 1;
        points[equipe2].pts += 3;
      } else {
        points[equipe1].pts += 2;
        points[equipe2].pts += 2;
      }
    });

    return Object.entries(points).sort((a, b) => {
      if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
      return b[1].goalsDiff - a[1].goalsDiff;
    });
  };

  return (
  <div className={`min-h-screen p-4 transition-colors duration-500 ${activeTab === "U11" ? "bg-blue-100" : "bg-green-100"}`}>
    <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Tournoi de l'US Dorges les eaux</h1>
        <p className="mb-6 text-lg">Interface de saisie des scores</p>

      <div className="flex gap-4 mb-4">
        <Button onClick={generateMatches}>🆕 Générer les matchs</Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={clearDatabase}>🗑️ Vider la base de données</Button>
      </div>

      <div className="flex justify-end mb-4">
        <Button className="bg-gray-400 hover:bg-gray-500" onClick={handleLogout}>🔒 Déconnexion</Button>
      </div>

      <Tabs defaultValue="U11" className="w-full" onValueChange={(val) => setActiveTab(val as Category)}>
        <TabsList>
          <TabsTrigger value="U11">Catégorie U11</TabsTrigger>
          <TabsTrigger value="U13">Catégorie U13</TabsTrigger>
        </TabsList>

        {(Object.keys(teams) as Category[]).map((category) => (
          <TabsContent key={category} value={category}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Classement</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Équipe</th>
                    <th>Pts</th>
                    <th>J</th>
                    <th>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {calculateRanking(scores[category], category).map(([team, stats]) => (
                    <tr key={team} className="border-t">
                      <td className="flex items-center gap-2">
                        <img src={getLogoSrc(team)} alt={team} className="w-6 h-6 object-contain" />
                        <span>{team}</span>
                      </td>
                      <td className="text-center">{stats.pts}</td>
                      <td className="text-center">{stats.played}</td>
                      <td className="text-center">{stats.goalsDiff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4">
                {scores[category].map((match, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-center justify-between p-4 gap-4">
                      <p className="text-sm text-gray-500">
                        🕒 {category === "U11" ? horairesU11[index] : horairesU13[index]}
                      </p>
                      <div className="flex items-center gap-2">
                        <img src={getLogoSrc(match.equipe1)} alt={match.equipe1} className="w-8 h-8 object-contain" />
                        <span>{match.equipe1}</span>
                      </div>

                      <Input
                        type="number"
                        className="w-16"
                        value={match.score1 ?? ""}
                        onChange={(e) => updateScore(category, index, "score1", e.target.value)}
                      />

                      <span>vs</span>

                      <Input
                        type="number"
                        className="w-16"
                        value={match.score2 ?? ""}
                        onChange={(e) => updateScore(category, index, "score2", e.target.value)}
                      />

                      <div className="flex items-center gap-2">
                        <span>{match.equipe2}</span>
                        <img src={getLogoSrc(match.equipe2)} alt={match.equipe2} className="w-8 h-8 object-contain" />
                      </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </div>
);
}


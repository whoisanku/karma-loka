import React from "react";

interface LeaderboardPageProps {
  handleButtonClick: () => void;
}

const dummyData = [
  { rank: 1, name: "Arjun", wins: 15 },
  { rank: 2, name: "Maya", wins: 12 },
  { rank: 3, name: "Rohan", wins: 10 },
  { rank: 4, name: "Luna", wins: 8 },
  { rank: 5, name: "Kai", wins: 6 },
];

export default function LeaderboardPage({
  handleButtonClick,
}: LeaderboardPageProps) {
  return (
    <div className="mx-auto max-w-lg w-full text-center space-y-6 pb-10">
      <h2 className="text-[#ffd700] text-3xl flex items-center justify-center gap-2"></h2>

      <table className="w-full text-[#ffd700] border-collapse">
        <thead>
          <tr className="border-b border-[#ffd700] text-left">
            <th className="py-2 px-3">Rank</th>
            <th className="py-2 px-3">Player</th>
            <th className="py-2 px-3">Wins</th>
          </tr>
        </thead>
        <tbody>
          {dummyData.map((row) => (
            <tr
              key={row.rank}
              className=" border-[#ffd700]/30 hover:bg-[#ffd700]/5 transition-colors"
              onClick={handleButtonClick}
            >
              <td className="py-2 px-3">{row.rank}</td>
              <td className="py-2 px-3">{row.name}</td>
              <td className="py-2 px-3">{row.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Real Football & Sports Team Logos Map
 */
export const TEAM_LOGO_MAP: { [key: string]: string } = {
  simba: "https://upload.wikimedia.org/wikipedia/en/2/2c/Simba_SC_logo.png",
  "simba sc": "https://upload.wikimedia.org/wikipedia/en/2/2c/Simba_SC_logo.png",
  yanga: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Young_Africans_S.C._logo.png",
  "yanga sc": "https://upload.wikimedia.org/wikipedia/commons/b/bc/Young_Africans_S.C._logo.png",
  "young africans":
    "https://upload.wikimedia.org/wikipedia/commons/b/bc/Young_Africans_S.C._logo.png",
  azam: "https://upload.wikimedia.org/wikipedia/en/e/ec/Azam_FC_logo.png",
  "azam fc": "https://upload.wikimedia.org/wikipedia/en/e/ec/Azam_FC_logo.png",
  liverpool: "https://crests.football-data.org/64.png",
  "man city": "https://crests.football-data.org/65.png",
  "manchester city": "https://crests.football-data.org/65.png",
  arsenal: "https://crests.football-data.org/57.png",
  chelsea: "https://crests.football-data.org/61.png",
  "man united": "https://crests.football-data.org/66.png",
  "manchester united": "https://crests.football-data.org/66.png",
  tottenham: "https://crests.football-data.org/73.png",
  realmadrid: "https://crests.football-data.org/86.png",
  "real madrid": "https://crests.football-data.org/86.png",
  barcelona: "https://crests.football-data.org/81.png",
  fcbarcelona: "https://crests.football-data.org/81.png",
  bayern: "https://crests.football-data.org/5.png",
  "bayern munich": "https://crests.football-data.org/5.png",
  psg: "https://crests.football-data.org/524.png",
  "paris saint-germain": "https://crests.football-data.org/524.png",
  juventus: "https://crests.football-data.org/109.png",
  inter: "https://crests.football-data.org/108.png",
  "inter milan": "https://crests.football-data.org/108.png",
  acmilan: "https://crests.football-data.org/98.png",
  "ac milan": "https://crests.football-data.org/98.png",
  dortmund: "https://crests.football-data.org/4.png",
  atlético: "https://crests.football-data.org/78.png",
  "atletico madrid": "https://crests.football-data.org/78.png",
};

export const getTeamLogoUrl = (teamName: string): string | null => {
  if (!teamName) return null;
  const nameLower = teamName.toLowerCase().trim();
  if (TEAM_LOGO_MAP[nameLower]) {
    return TEAM_LOGO_MAP[nameLower];
  }
  for (const key in TEAM_LOGO_MAP) {
    if (nameLower.includes(key) || key.includes(nameLower)) {
      return TEAM_LOGO_MAP[key];
    }
  }
  return null;
};

import { onRequest as loadMatches } from "./fixtures";
import { buildGamesHandler } from "../_games";
export const onRequest = buildGamesHandler(loadMatches, "tennis");

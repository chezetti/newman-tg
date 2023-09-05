export interface IGame {
  board: string[][];
  players: { [id: string]: string };
  turn: string;
}

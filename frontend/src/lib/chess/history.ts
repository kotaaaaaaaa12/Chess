import type { MoveRecord } from "./types";

export class History {
  private _lastStep: MoveRecord[] = [];
  private _history: MoveRecord[][] = [];

  add(step: MoveRecord): void {
    this._lastStep.push(step);
  }

  save(): void {
    this._history.push(this._lastStep);
    this._lastStep = [];
  }

  pop(): MoveRecord[] | undefined {
    return this._history.pop();
  }

  getAll(): MoveRecord[][] {
    return [...this._history];
  }

  getMoveCount(): number {
    return this._history.length;
  }

  loadSteps(steps: MoveRecord[][]): void {
    this._history = steps.map((step) => step.map((s) => ({ ...s, piece: { ...s.piece } })));
    this._lastStep = [];
  }
}

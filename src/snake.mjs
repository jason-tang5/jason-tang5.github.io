export const columns = 24;
export const rows = 18;
export const directions = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

export function placeFood(body, random = Math.random) {
  const occupied = new Set(body.map(p => p.y * columns + p.x));
  const empty = Array.from({ length: columns * rows }, (_, i) => i).filter(i => !occupied.has(i));
  if (!empty.length) return null;
  const cell = empty[Math.floor(random() * empty.length)];
  return { x: cell % columns, y: Math.floor(cell / columns) };
}

export function newSnake() {
  const body = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }];
  return { body, direction: 'right', food: placeFood(body), score: 0, over: false, won: false };
}

export function stepSnake(state, requested = state.direction) {
  if (state.over) return state;
  const current = directions[state.direction];
  const next = directions[requested] || current;
  const reversed = next.x === -current.x && next.y === -current.y;
  const direction = reversed || !directions[requested] ? state.direction : requested;
  const velocity = directions[direction];
  const head = { x: state.body[0].x + velocity.x, y: state.body[0].y + velocity.y };
  const eating = head.x === state.food?.x && head.y === state.food?.y;
  // The tail vacates its cell on a normal move, so moving into it is legal.
  const solid = eating ? state.body : state.body.slice(0, -1);
  if (head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows ||
      solid.some(p => p.x === head.x && p.y === head.y)) {
    return { ...state, direction, over: true };
  }
  const body = [head, ...state.body];
  if (!eating) body.pop();
  const food = eating ? placeFood(body) : state.food;
  return { body, direction, food, score: state.score + Number(eating), over: !food, won: !food };
}

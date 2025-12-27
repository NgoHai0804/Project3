# bot_move_service.py
# Service chuyên xử lý tính toán nước đi cho bot (phiên bản cải thiện v6)
# Dịch từ JavaScript sang Python
# Giả sử checkWinner được import từ utils/check_winner

from typing import List, Dict, Tuple, Optional, Any
import random
import copy
import math

# Zobrist hashing (tương đương Map trong JS)
ZOBRIST_TABLE = {}
def init_zobrist(board_size: int):
    global ZOBRIST_TABLE
    if ZOBRIST_TABLE:
        return
    for x in range(board_size):
        for y in range(board_size):
            ZOBRIST_TABLE[f"{x},{y}_X"] = random.randint(0, 0xFFFFFFFF)
            ZOBRIST_TABLE[f"{x},{y}_O"] = random.randint(0, 0xFFFFFFFF)

def board_hash(board: List[List[str]]) -> int:
    h = 0
    for x in range(len(board)):
        for y in range(len(board[x])):
            key = f"{x},{y}_{board[x][y] or 'null'}"
            h ^= ZOBRIST_TABLE.get(key, 0)
    return h

def get_border_moves(board: List[List[str]]) -> List[Dict[str, int]]:
    board_size = len(board)
    candidates = set()
    for x in range(board_size):
        for y in range(board_size):
            if board[x][y] is not None:
                for dx in range(-1, 2):
                    for dy in range(-1, 2):
                        if dx == 0 and dy == 0:
                            continue
                        nx = x + dx
                        ny = y + dy
                        if 0 <= nx < board_size and 0 <= ny < board_size and board[nx][ny] is None:
                            candidates.add(f"{nx},{ny}")
    if not candidates:
        center = board_size // 2
        candidates.add(f"{center},{center}")
    return [{"x": int(pos.split(",")[0]), "y": int(pos.split(",")[1])} for pos in candidates]

def check_patterns_in_line(line: List[Any], mark: str) -> int:
    pattern = "".join("X" if c == mark else "_" if c is None else "O" for c in line)
    prio = 0
    if "XXXX" in pattern:
        prio += 10000
    if "_XXX_" in pattern:
        prio += 5000
    if "XX_X" in pattern:
        prio += 3000
    if "XXX_X" in pattern:
        prio += 8000
    if "_XXXX" in pattern:
        prio += 10000
    if "XXXX_" in pattern:
        prio += 10000
    return prio

def calculate_attack_score(board: List[List[str]], move: Dict[str, int], bot_mark: str) -> int:
    x, y = move["x"], move["y"]
    opponent_mark = "O" if bot_mark == "X" else "X"
    attack_score = 0
    dirs = [(1, 0), (0, 1), (1, 1), (1, -1)]

    board[x][y] = bot_mark

    for dx, dy in dirs:
        line = []
        pos = -5
        while pos <= 5:
            nx = x + dx * pos
            ny = y + dy * pos
            if not (0 <= nx < len(board) and 0 <= ny < len(board[0])):
                break
            line.append(board[nx][ny])
            pos += 1
        attack_score += check_patterns_in_line(line, bot_mark)

    threat_dirs = 0
    for dx, dy in dirs:
        line = []
        pos = -5
        while pos <= 5:
            nx = x + dx * pos
            ny = y + dy * pos
            if not (0 <= nx < len(board) and 0 <= ny < len(board[0])):
                break
            line.append(board[nx][ny])
            pos += 1
        if check_patterns_in_line(line, bot_mark) > 1000:
            threat_dirs += 1
    if threat_dirs >= 2:
        attack_score += 2000
    if threat_dirs >= 3:
        attack_score += 5000

    board[x][y] = None
    return attack_score

def calculate_defense_score(board: List[List[str]], move: Dict[str, int], opponent_mark: str) -> int:
    x, y = move["x"], move["y"]
    defense_score = 0
    dirs = [(1, 0), (0, 1), (1, 1), (1, -1)]

    board[x][y] = opponent_mark

    for dx, dy in dirs:
        line = []
        pos = -5
        while pos <= 5:
            nx = x + dx * pos
            ny = y + dy * pos
            if not (0 <= nx < len(board) and 0 <= ny < len(board[0])):
                break
            line.append(board[nx][ny])
            pos += 1
        defense_score += check_patterns_in_line(line, opponent_mark)

    board[x][y] = None
    return defense_score

def score_move(board: List[List[str]], move: Dict[str, int], bot_mark: str) -> int:
    opponent_mark = "O" if bot_mark == "X" else "X"
    attack = calculate_attack_score(board, move, bot_mark)
    defense = calculate_defense_score(board, move, opponent_mark)
    return attack + defense * 1.5

def get_best_heuristic_move(board: List[List[str]], bot_mark: str) -> Dict[str, int]:
    moves = get_border_moves(board)
    if not moves:
        center = len(board) // 2
        return {"x": center, "y": center}

    scored_moves = [{"x": m["x"], "y": m["y"], "score": score_move(board, m, bot_mark)} for m in moves]

    max_score = max(m["score"] for m in scored_moves)
    top_moves = [m for m in scored_moves if m["score"] == max_score]

    best_move = random.choice(top_moves)
    return {"x": best_move["x"], "y": best_move["y"]}

def calculate_move_priority(board: List[List[str]], x: int, y: int, bot_mark: str) -> int:
    return score_move(board, {"x": x, "y": y}, bot_mark)

from utils.check_winner import check_winner  # Giả sử import

def find_winning_move(board: List[List[str]], mark: str) -> Optional[Dict[str, int]]:
    moves = get_border_moves(board)
    for move in moves:
        x, y = move["x"], move["y"]
        if board[x][y] is None:
            board[x][y] = mark
            if check_winner(board, x, y):
                board[x][y] = None
                return {"x": x, "y": y}
            board[x][y] = None
    return None

def find_blocking_move(board: List[List[str]], opponent_mark: str) -> Optional[Dict[str, int]]:
    return find_winning_move(board, opponent_mark)

def find_dangerous_patterns(board: List[List[str]], opponent_mark: str) -> List[Dict[str, Any]]:
    board_size = len(board)
    dirs = [(1, 0), (0, 1), (1, 1), (1, -1)]
    patterns = []

    for x in range(board_size):
        for y in range(board_size):
            if board[x][y] != opponent_mark:
                continue

            for dx, dy in dirs:
                line = []
                positions = []
                line.append(board[x][y])
                positions.append((x, y))
                pos = 1
                while pos < 10:
                    nx = x + dx * pos
                    ny = y + dy * pos
                    if not (0 <= nx < board_size and 0 <= ny < board_size):
                        break
                    line.append(board[nx][ny])
                    positions.append((nx, ny))
                    pos += 1
                pos = 1
                while pos < 10:
                    nx = x - dx * pos
                    ny = y - dy * pos
                    if not (0 <= nx < board_size and 0 <= ny < board_size):
                        break
                    line.insert(0, board[nx][ny])
                    positions.insert(0, (nx, ny))
                    pos += 1

                for i in range(len(line) - 3):
                    seg_len = len(line) - i
                    if seg_len >= 5:
                        seg = line[i:i+5]
                        pattern_str = "".join("X" if c == opponent_mark else "_" if c is None else "O" for c in seg)
                        prio = 0
                        block_pos = None
                        if pattern_str == "_XXX_":
                            prio = 800
                            block_pos = [1, 4]
                        elif pattern_str == "XX_X_":
                            prio = 600
                            block_pos = 2
                        elif pattern_str == "_XXXX":
                            prio = 1000
                            block_pos = 0
                        elif pattern_str == "XXXX_":
                            prio = 1000
                            block_pos = 4
                        elif pattern_str == "XXX_X":
                            prio = 900
                            block_pos = 3
                    elif seg_len >= 4:
                        seg = line[i:i+4]
                        pattern_str = "".join("X" if c == opponent_mark else "_" if c is None else "O" for c in seg)
                        prio = 0
                        block_pos = None
                        if pattern_str == "_XXX":
                            prio = 400
                            block_pos = 0
                        elif pattern_str == "XXX_":
                            prio = 400
                            block_pos = 3
                        elif pattern_str == "XXXX":
                            prio = 1200
                            # Block ends if open, but handled elsewhere

                    if prio > 0 and block_pos is not None:
                        if isinstance(block_pos, list):
                            for bp in block_pos:
                                line_idx = i + bp
                                if 0 <= line_idx < len(line) and line[line_idx] is None:
                                    bx, by = positions[line_idx]
                                    patterns.append({"move": {"x": bx, "y": by}, "priority": prio})
                        else:
                            line_idx = i + block_pos
                            if 0 <= line_idx < len(line) and line[line_idx] is None:
                                bx, by = positions[line_idx]
                                patterns.append({"move": {"x": bx, "y": by}, "priority": prio})

    patterns.sort(key=lambda p: p["priority"], reverse=True)
    unique = []
    seen = set()
    for p in patterns:
        key = f"{p['move']['x']},{p['move']['y']}"
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique[:5]

def evaluate_line(board: List[List[str]], x: int, y: int, dx: int, dy: int, mark: str, opponent_mark: str) -> int:
    board_size = len(board)
    max_consecutive = 0
    open_ends = 0
    consecutive = 0

    # Forward
    consecutive = 0
    for i in range(6):
        nx = x + dx * i
        ny = y + dy * i
        if not (0 <= nx < board_size and 0 <= ny < board_size):
            break
        if board[nx][ny] == mark:
            consecutive += 1
            max_consecutive = max(max_consecutive, consecutive)
        elif board[nx][ny] == opponent_mark:
            break
        else:
            consecutive = 0

    # Backward
    consecutive = 0
    for i in range(1, 6):
        nx = x - dx * i
        ny = y - dy * i
        if not (0 <= nx < board_size and 0 <= ny < board_size):
            break
        if board[nx][ny] == mark:
            consecutive += 1
            max_consecutive = max(max_consecutive, consecutive)
        elif board[nx][ny] == opponent_mark:
            break
        else:
            consecutive = 0

    # Open ends
    prev_x = x - dx
    prev_y = y - dy
    if 0 <= prev_x < board_size and 0 <= prev_y < board_size and board[prev_x][prev_y] is None:
        open_ends += 1
    next_x = x + dx
    next_y = y + dy
    if 0 <= next_x < board_size and 0 <= next_y < board_size and board[next_x][next_y] is None:
        open_ends += 1

    if max_consecutive >= 5:
        return 1000000
    if max_consecutive == 4 and open_ends >= 2:
        return 50000
    if max_consecutive == 4 and open_ends == 1:
        return 10000
    if max_consecutive == 4 and open_ends == 0:
        return 1000
    if max_consecutive == 3 and open_ends >= 2:
        return 5000
    if max_consecutive == 3 and open_ends == 1:
        return 500
    if max_consecutive == 3 and open_ends == 0:
        return 50
    if max_consecutive == 2 and open_ends >= 2:
        return 100
    if max_consecutive == 2 and open_ends == 1:
        return 10
    if max_consecutive == 2 and open_ends == 0:
        return 2
    if max_consecutive == 1 and open_ends >= 2:
        return 5
    return 1

def evaluate_board(board: List[List[str]], mark: str) -> int:
    opponent_mark = "O" if mark == "X" else "X"
    score = 0
    board_size = len(board)
    dirs = [(1, 0), (0, 1), (1, 1), (1, -1)]
    for x in range(board_size):
        for y in range(board_size):
            if board[x][y] == mark:
                for dx, dy in dirs:
                    score += evaluate_line(board, x, y, dx, dy, mark, opponent_mark) / 4
    return score

def negamax(board: List[List[str]], depth: int, alpha: int, beta: int, mark: str, color: int, transposition: Dict[int, Dict[str, Any]], last_move: Dict[str, int], bot_mark: str) -> int:
    opponent_mark = "O" if mark == "X" else "X"

    if last_move and check_winner(board, last_move["x"], last_move["y"]):
        return color * -100000
    is_full = all(all(cell is not None for cell in row) for row in board)
    if is_full:
        return 0
    if depth == 0:
        bot_score = evaluate_board(board, bot_mark)
        opp_score = evaluate_board(board, opponent_mark)
        return bot_score - opp_score

    h = board_hash(board)
    if h in transposition and transposition[h]["depth"] >= depth:
        value = transposition[h]["value"]
        if value <= alpha:
            return alpha
        if value >= beta:
            return beta

    moves = get_border_moves(board)
    max_moves = 12 if depth > 3 else len(moves)
    limited_moves = sorted(moves[:max_moves], key=lambda m: calculate_move_priority(board, m["x"], m["y"], mark), reverse=True)

    max_eval = float("-inf")
    for move in limited_moves:
        x, y = move["x"], move["y"]
        board[x][y] = mark
        eval_val = -negamax(board, depth - 1, -beta, -alpha, opponent_mark, -color, transposition, move, bot_mark)
        board[x][y] = None
        max_eval = max(max_eval, eval_val)
        alpha = max(alpha, eval_val)
        if alpha >= beta:
            break

    transposition[h] = {"value": max_eval, "depth": depth}
    return max_eval

def get_best_move_with_negamax(board: List[List[str]], bot_mark: str, player_mark: str, depth: int) -> Dict[str, int]:
    try:
        init_zobrist(len(board))
        moves = get_border_moves(board)
        if not moves:
            center = len(board) // 2
            return {"x": center, "y": center}

        moves.sort(key=lambda m: score_move(board, m, bot_mark), reverse=True)

        transposition = {}
        best_move = moves[0]
        best_eval = float("-inf")
        max_moves = 12 if depth >= 4 else 8
        for move in moves[:max_moves]:
            x, y = move["x"], move["y"]
            board[x][y] = bot_mark
            eval_val = negamax(board, depth - 1, float("-inf"), float("inf"), player_mark, -1, transposition, move, bot_mark)
            board[x][y] = None
            if eval_val > best_eval:
                best_eval = eval_val
                best_move = move
            if best_eval >= 100000:
                break
        return best_move
    except Exception as e:
        print(f"Error in get_best_move_with_negamax: {e}")
        center = len(board) // 2
        return {"x": center, "y": center}

def calculate_bot_move(board: List[List[str]], bot_mark: str, difficulty: str = "medium", last_move: Optional[Dict[str, int]] = None) -> Dict[str, int]:
    default_move = lambda: {"x": (len(board) // 2 if board else 10), "y": (len(board) // 2 if board else 10)}

    move = None
    try:
        if not board or not isinstance(board, list) or not board:
            return default_move()
        if not bot_mark or bot_mark not in ["X", "O"]:
            return default_move()
        player_mark = "O" if bot_mark == "X" else "X"
        board_copy = [row[:] for row in board]

        winning_move = find_winning_move(board_copy, bot_mark)
        if winning_move:
            return winning_move

        blocking_move = find_blocking_move(board_copy, player_mark)
        if blocking_move:
            return blocking_move

        dangerous_blocks = find_dangerous_patterns(board_copy, player_mark)
        if dangerous_blocks:
            return dangerous_blocks[0]["move"]

        if difficulty == "easy":
            moves = get_border_moves(board_copy)[:3]
            if not moves:
                return default_move()
            scored_moves = sorted([{"x": m["x"], "y": m["y"], "score": score_move(board_copy, m, bot_mark)} for m in moves], key=lambda m: m["score"], reverse=True)
            move = random.choice(scored_moves)
            return {"x": move["x"], "y": move["y"]}
        elif difficulty == "medium":
            move = get_best_heuristic_move(board_copy, bot_mark)
        elif difficulty == "hard":
            move = get_best_move_with_negamax(board_copy, bot_mark, player_mark, 5)
        else:
            move = get_best_heuristic_move(board_copy, bot_mark)
    except Exception as error:
        print(f"Lỗi trong calculate_bot_move: {error}")
        return default_move()

    if not move or "x" not in move or "y" not in move or move["x"] < 0 or move["y"] < 0:
        print("Invalid move generated, fallback to center")
        return default_move()

    return move

# Export tương đương (trong Python, có thể import trực tiếp)
__all__ = [
    "calculate_bot_move",
    "find_winning_move",
    "find_blocking_move",
    "evaluate_board",
    "get_border_moves",
    "score_move",
]
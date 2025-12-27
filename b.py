# ================== CONFIG ==================

SCORES = {
    "4": [
        {"pattern": "_XXXX", "score": 100000},
        {"pattern": "X_XXX", "score": 100000},
        {"pattern": "XX_XX", "score": 100000}
    ],
    "3": [
        {"pattern": "__XXX", "score": 10000},
        {"pattern": "_X_XX", "score": 10000},
        {"pattern": "_XX_X", "score": 10000},
        {"pattern": "_XXX_", "score": 10000},
        {"pattern": "X__XX", "score": 10000},
        {"pattern": "X_X_X", "score": 10000}
    ],
    "2": [
        {"pattern": "___XX", "score": 500},
        {"pattern": "__X_X", "score": 500},
        {"pattern": "__XX_", "score": 500},
        {"pattern": "_X__X", "score": 500},
        {"pattern": "_X_X_", "score": 500},
        {"pattern": "X___X", "score": 500}
    ],
    "1": [
        {"pattern": "X____", "score": 50},
        {"pattern": "_X___", "score": 50},
        {"pattern": "__X__", "score": 50}
    ]
}

DIRECTIONS = [
    (1, 0),    # ngang
    (0, 1),    # dọc
    (1, 1),    # chéo chính
    (1, -1)    # chéo phụ
]

# ================== UTILS ==================

def expand_scores(scores):
    """Thêm pattern đảo ngược"""
    out = {}
    for k, arr in scores.items():
        tmp = []
        for e in arr:
            tmp.append(e)
            rev = e["pattern"][::-1]
            if rev != e["pattern"]:
                tmp.append({"pattern": rev, "score": e["score"]})
        out[k] = tmp
    return out

SCORES_EXPANDED = expand_scores(SCORES)


def normalize_board(board, mark):
    """Đổi board về góc nhìn của mark"""
    opp = "O" if mark == "X" else "X"
    n = len(board)
    new = [[None]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if board[i][j] == mark:
                new[i][j] = "X"
            elif board[i][j] == opp:
                new[i][j] = "O"
            else:
                new[i][j] = None
    return new


def get_line_pattern(board, x, y, dx, dy):
    """Lấy 9 ô liên tiếp"""
    n = len(board)
    s = ""
    for i in range(-4, 5):
        nx, ny = x + dx*i, y + dy*i
        if 0 <= nx < n and 0 <= ny < n:
            s += board[nx][ny] if board[nx][ny] else "_"
        else:
            s += "_"
    return s


def print_board(board):
    """In bàn cờ ra console"""
    n = len(board)

    # Header cột
    print("   ", end="")
    for j in range(n):
        print(f"{j:2}", end=" ")
    print()

    for i in range(n):
        print(f"{i:2} ", end="")
        for j in range(n):
            cell = board[i][j]
            if cell is None:
                print(" . ", end="")
            else:
                print(f" {cell} ", end="")
        print()
    print()


# ================== CORE ==================

def evaluate_cell(board, x, y, multiplier=1.0):
    score = 0
    patterns = []

    for dx, dy in DIRECTIONS:
        line = get_line_pattern(board, x, y, dx, dy)
        for group in ["4", "3", "2", "1"]:
            for e in SCORES_EXPANDED[group]:
                if e["pattern"] in line:
                    score += e["score"] * multiplier
                    patterns.append(e["pattern"])

    return score, patterns


def get_border_cells(board):
    n = len(board)
    s = set()
    for i in range(n):
        for j in range(n):
            if board[i][j]:
                for dx in [-1, 0, 1]:
                    for dy in [-1, 0, 1]:
                        ni, nj = i + dx, j + dy
                        if 0 <= ni < n and 0 <= nj < n:
                            if board[ni][nj] is None:
                                s.add((ni, nj))
    return list(s)


def evaluate_board(board, current_mark):
    """Đánh giá bàn cờ cho lượt current_mark"""
    opp = "O" if current_mark == "X" else "X"
    border = get_border_cells(board)

    board_bot = normalize_board(board, current_mark)
    board_opp = normalize_board(board, opp)

    result = {}
    for x, y in border:
        atk, p_atk = evaluate_cell(board_bot, x, y, 1.5)
        defn, p_def = evaluate_cell(board_opp, x, y, 1.0)

        result[(x, y)] = {
            "score": atk + defn,
            "attack": atk,
            "defense": defn,
            "patterns_bot": p_atk,
            "patterns_opp": p_def
        }
    return result


def best_move(board, current_mark):
    scores = evaluate_board(board, current_mark)
    return max(scores.items(), key=lambda x: x[1]["score"])


# ================== DEMO ==================

if __name__ == "__main__":
    N = 15
    board = [[None]*N for _ in range(N)]

    # Setup test
    board[7][7] = "X"

    print("=== INITIAL BOARD ===")
    print_board(board)

    current = "X"

    for turn in range(1, 150):   # chạy 10 lượt
        print(f"===== TURN {turn} | {current} =====")

        scores = evaluate_board(board, current)
        if not scores:
            print("No possible moves!")
            break

        (x, y), info = max(scores.items(), key=lambda x: x[1]["score"])

        print(f"Move: {current} -> ({x},{y})")
        print(f"Score: {info['score']}")
        print(f"Attack: {info['patterns_bot']}")
        print(f"Defense: {info['patterns_opp']}")

        board[x][y] = current
        print_board(board)

        # đổi lượt
        current = "O" if current == "X" else "X"


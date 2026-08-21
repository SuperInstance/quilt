"""
qgit.py — Quilt-Git: a git-native Quilt protocol.

A cell is a git commit.
A room is a git branch.
An agent is a git hook.
The 8 primitives map to git operations.

Usage:
    python qgit.py init                  # init a quilt repo
    python qgit.py cell add <id> <kind>  # add a cell
    python qgit.py cell tick <id>        # tick a cell (commit)
    python qgit.py cell gc               # run 3-phase GC
    python qgit.py room create <name>    # create a room (branch)
    python qgit.py room enter <name>     # enter a room
    python qgit.py gossip <topic>        # push/pull murmur
    python qgit.py checkpoint <id>       # tag a cell state
    python qgit.py status                # show status

The protocol is below the app. The cell is the system.
"""
import os
import sys
import json
import subprocess
import time
from pathlib import Path


def git(*args, repo='.'):
    """Run a git command. Returns (returncode, stdout, stderr)."""
    result = subprocess.run(
        ['git'] + list(args),
        cwd=repo,
        capture_output=True,
        text=True
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def git_or_die(*args, repo='.'):
    """Run git and exit on error."""
    rc, out, err = git(*args, repo=repo)
    if rc != 0:
        print(f"git {' '.join(args)} failed: {err}", file=sys.stderr)
        sys.exit(1)
    return out


# ==================== INIT ====================
def cmd_init(path='.'):
    """Initialize a Quilt-Git repo. The cell is born."""
    repo = os.path.abspath(path)
    os.makedirs(repo, exist_ok=True)
    os.chdir(repo)
    if os.path.exists('.git'):
        print(f"Already a git repo at {repo}")
    else:
        git_or_die('init', '-b', 'main')
    os.makedirs('cells', exist_ok=True)
    os.makedirs('rooms', exist_ok=True)
    git_or_die('config', 'user.email', 'quilt@superinstance.dev')
    git_or_die('config', 'user.name', 'Quilt-Git')
    config = {
        'protocol': 'qgit/0.6.0',
        'cell_primitive': 'Z_in|Z_out|JEPA|DoubleEntry|Vibe|GC|Murmur|Graph',
        'room_convention': 'room/<name>',
        'cell_convention': 'cells/<id>/state.json',
        'commit_format': 'cell: <id> | <primitive> | <value>',
    }
    with open('.qgit.json', 'w') as f:
        json.dump(config, f, indent=2)
    git_or_die('add', '.qgit.json', 'cells/', 'rooms/')
    git_or_die('commit', '-m', 'qgit: init | Graph | {cells: 0, edges: 0}')
    print(f"Quilt-Git repo initialized at {repo}")


# ==================== CELL ====================
def cmd_cell_add(cell_id, kind, repo='.'):
    """Add a cell. Creates cells/<id>/state.json with 8 primitives."""
    os.chdir(repo)
    cell_dir = f'cells/{cell_id}'
    os.makedirs(cell_dir, exist_ok=True)
    state = {
        'id': cell_id,
        'kind': kind,
        'tick': 0,
        'z_in': {},
        'z_out': {},
        'jepa_surprise': 0.0,
        'double_entry': {'gamma': 0.5, 'eta': 0.5},
        'vibe': {'position': 0.0, 'velocity': 0.0, 'acceleration': 0.0},
        'gc': {'phase': 'ready', 'cycles': 0},
        'murmur': {'subscriptions': [], 'gossip_count': 0},
        'graph': {'parents': [], 'children': []},
    }
    with open(f'{cell_dir}/state.json', 'w') as f:
        json.dump(state, f, indent=2)
    git_or_die('add', cell_dir)
    git_or_die('commit', '-m', f'cell: {cell_id} | Z_in | spawn:{kind}')
    print(f"Cell {cell_id} ({kind}) added.")


def cmd_cell_tick(cell_id, repo='.'):
    """Tick a cell. Updates state.json and commits."""
    os.chdir(repo)
    cell_dir = f'cells/{cell_id}'
    if not os.path.exists(f'{cell_dir}/state.json'):
        print(f"Cell {cell_id} not found.", file=sys.stderr)
        sys.exit(1)
    with open(f'{cell_dir}/state.json') as f:
        state = json.load(f)
    state['tick'] += 1
    state['vibe']['velocity'] += state['vibe']['acceleration']
    state['vibe']['position'] += state['vibe']['velocity']
    state['vibe']['velocity'] *= 0.99
    state['murmur']['gossip_count'] += 1
    with open(f'{cell_dir}/state.json', 'w') as f:
        json.dump(state, f, indent=2)
    git_or_die('add', cell_dir)
    git_or_die('commit', '-m', f'cell: {cell_id} | Vibe | tick:{state["tick"]}')
    print(f"Cell {cell_id} ticked. Now at tick {state['tick']}.")


def cmd_cell_gc(repo='.'):
    """3-phase GC: merge similar → decay old → prune weak."""
    os.chdir(repo)
    cells_dir = Path('cells')
    if not cells_dir.exists():
        print("No cells directory.", file=sys.stderr)
        return
    phases = {'merged': 0, 'decayed': 0, 'pruned': 0}
    by_kind = {}
    for cell_dir in cells_dir.iterdir():
        if not cell_dir.is_dir():
            continue
        state_file = cell_dir / 'state.json'
        if not state_file.exists():
            continue
        state = json.loads(state_file.read_text())
        kind = state.get('kind', '?')
        by_kind.setdefault(kind, []).append((cell_dir, state))
    for kind, cells in by_kind.items():
        if len(cells) > 1:
            for cell_dir, state in cells[1:]:
                phases['merged'] += 1
                main_state_file = cells[0][0] / 'state.json'
                main_state = json.loads(main_state_file.read_text())
                main_state['tick'] += state['tick']
                main_state_file.write_text(json.dumps(main_state, indent=2))
                import shutil
                shutil.rmtree(cell_dir)
    for cell_dir in cells_dir.iterdir():
        if not cell_dir.is_dir():
            continue
        state_file = cell_dir / 'state.json'
        state = json.loads(state_file.read_text())
        state['tick'] = int(state['tick'] * 0.95)
        state_file.write_text(json.dumps(state, indent=2))
        phases['decayed'] += 1
    for cell_dir in list(cells_dir.iterdir()):
        if not cell_dir.is_dir():
            continue
        state_file = cell_dir / 'state.json'
        state = json.loads(state_file.read_text())
        if state['tick'] < 1:
            import shutil
            shutil.rmtree(cell_dir)
            phases['pruned'] += 1
    git_or_die('add', 'cells/')
    git_or_die('commit', '-m', f'cell: ALL | GC | {phases}')
    print(f"GC complete: {phases}")


def cmd_cell_list(repo='.'):
    """List all cells."""
    os.chdir(repo)
    cells_dir = Path('cells')
    if not cells_dir.exists():
        print("No cells.")
        return
    for cell_dir in sorted(cells_dir.iterdir()):
        if not cell_dir.is_dir():
            continue
        state_file = cell_dir / 'state.json'
        if not state_file.exists():
            continue
        state = json.loads(state_file.read_text())
        print(f"  {cell_dir.name:30} {state.get('kind', '?'):12} tick={state.get('tick', 0)}")


# ==================== ROOM ====================
def cmd_room_create(name, repo='.'):
    """Create a room (git branch)."""
    os.chdir(repo)
    branch = f'room/{name}'
    rc, _, _ = git('checkout', '-b', branch)
    if rc != 0:
        print(f"Failed to create room {name}", file=sys.stderr)
        sys.exit(1)
    os.makedirs('rooms', exist_ok=True)
    with open(f'rooms/{name}.json', 'w') as f:
        json.dump({
            'name': name,
            'created': time.time(),
            'cells': [],
            'beta_1': 0,
        }, f, indent=2)
    git_or_die('add', f'rooms/{name}.json')
    git_or_die('commit', '-m', f'room: {name} | spawn | empty')
    print(f"Room {name} created on branch {branch}.")


def cmd_room_enter(name, repo='.'):
    """Enter a room (git checkout branch)."""
    os.chdir(repo)
    branch = f'room/{name}'
    rc, _, err = git('checkout', branch)
    if rc != 0:
        print(f"Failed to enter room {name}: {err}", file=sys.stderr)
        sys.exit(1)
    print(f"Entered room {name}.")


def cmd_room_list(repo='.'):
    """List all rooms (branches)."""
    os.chdir(repo)
    _, out, _ = git('branch', '-a')
    for line in out.split('\n'):
        if line.startswith('room/'):
            print(f"  {line.strip()}")


# ==================== GOSSIP ====================
def cmd_gossip(topic, message, repo='.'):
    """Send a gossip message. The murmur protocol over git."""
    os.chdir(repo)
    os.makedirs('murmur', exist_ok=True)
    log_file = Path('murmur/gossip.log')
    if not log_file.exists():
        log_file.write_text('')
    with open(log_file, 'a') as f:
        f.write(f"{time.time()}|{topic}|{message}\n")
    git_or_die('add', 'murmur/')
    git_or_die('commit', '-m', f'cell: ALL | Murmur | {topic}:{message}')
    print(f"Gossip: [{topic}] {message}")


def cmd_gossip_list(repo='.'):
    """List recent gossip."""
    os.chdir(repo)
    log_file = Path('murmur/gossip.log')
    if not log_file.exists():
        print("No gossip yet.")
        return
    for line in log_file.read_text().split('\n')[-20:]:
        if line:
            print(f"  {line}")


# ==================== CHECKPOINT ====================
def cmd_checkpoint(cell_id, repo='.'):
    """Checkpoint a cell state. Creates a tag."""
    os.chdir(repo)
    tag = f'checkpoint/{cell_id}-{int(time.time())}'
    git_or_die('tag', tag)
    print(f"Checkpointed {cell_id} as {tag}.")


# ==================== STATUS ====================
def cmd_status(repo='.'):
    """Show the Quilt-Git status."""
    os.chdir(repo)
    config_file = Path('.qgit.json')
    if not config_file.exists():
        print("Not a Quilt-Git repo. Run `qgit init` first.")
        return
    config = json.loads(config_file.read_text())
    print(f"Quilt-Git {config['protocol']}")
    print(f"  cell: {config['cell_convention']}")
    print(f"  room: {config['room_convention']}")
    print()
    cells_dir = Path('cells')
    if cells_dir.exists():
        n = len([d for d in cells_dir.iterdir() if d.is_dir()])
        print(f"  cells: {n}")
    _, branches, _ = git('branch', '-a')
    rooms = [b.strip().replace('* ', '') for b in branches.split('\n') if 'room/' in b]
    print(f"  rooms: {len(rooms)}")
    _, log, _ = git('log', '--oneline', '-10')
    print()
    print("  recent:")
    for line in log.split('\n')[:10]:
        if line:
            print(f"    {line}")


# ==================== MAIN ====================
def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    args = sys.argv[2:]
    if cmd == 'init':
        cmd_init(args[0] if args else '.')
    elif cmd == 'cell':
        subcmd = args[0] if args else 'list'
        if subcmd == 'add':
            cmd_cell_add(args[1], args[2] if len(args) > 2 else 'cell')
        elif subcmd == 'tick':
            cmd_cell_tick(args[1])
        elif subcmd == 'gc':
            cmd_cell_gc()
        elif subcmd == 'list':
            cmd_cell_list()
    elif cmd == 'room':
        subcmd = args[0] if args else 'list'
        if subcmd == 'create':
            cmd_room_create(args[1])
        elif subcmd == 'enter':
            cmd_room_enter(args[1])
        elif subcmd == 'list':
            cmd_room_list()
    elif cmd == 'gossip':
        if args and args[0] == 'list':
            cmd_gossip_list()
        else:
            cmd_gossip(args[0], args[1] if len(args) > 1 else '')
    elif cmd == 'checkpoint':
        cmd_checkpoint(args[0])
    elif cmd == 'status':
        cmd_status()
    elif cmd == 'help' or cmd == '--help' or cmd == '-h':
        print(__doc__)
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)


if __name__ == '__main__':
    main()

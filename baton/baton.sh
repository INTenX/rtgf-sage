#!/usr/bin/env bash
# baton — BATON inter-session coordination CLI
#
# Usage:
#   baton drop "Subject" [--to session] [--type task|handoff|alert] [--priority high|normal|low] [--body "..."] [--ref session-id]
#   baton list [--all]
#   baton claim <id-prefix>
#   baton complete <id-prefix> [--result "..."]
#   baton show <id-prefix>
#   baton abandon <id-prefix>
#
# Shared store: /mnt/c/Temp/wsl-shared/baton/

set -uo pipefail

STORE="/mnt/c/Temp/wsl-shared/baton"
export BATON_STORE="$STORE"
export BATON_PENDING="${STORE}/pending"
export BATON_CLAIMED="${STORE}/claimed"
export BATON_COMPLETED="${STORE}/completed"

# Identify caller session name (best-effort)
export BATON_CALLER
BATON_CALLER="${BATON_SESSION:-}"
if [[ -z "$BATON_CALLER" ]]; then
  BATON_CALLER="$(python3 -c "
import json, glob, os, re
home = os.path.expanduser('~')
cwd  = os.getcwd()
for f in sorted(glob.glob(os.path.join(home, '.claude', 'projects', '*', '*.jsonl')),
                key=os.path.getmtime, reverse=True)[:10]:
    with open(f, encoding='utf-8', errors='ignore') as fp:
        for line in fp:
            m = re.search(r'\"cwd\":\"([^\"]+)\"', line)
            if m:
                try:
                    if os.path.normcase(json.loads('\"' + m.group(1) + '\"')) == os.path.normcase(cwd):
                        sid = os.path.basename(f).replace('.jsonl','')
                        for idx in glob.glob(os.path.join(home, '.claude', 'projects', '*', 'sessions-index.json')):
                            try:
                                with open(idx) as fi:
                                    data = json.load(fi)
                                for e in data.get('entries',[]):
                                    if e.get('sessionId','').startswith(sid[:8]):
                                        name = e.get('summary','')
                                        if name and '(archive' not in name.lower():
                                            print(name)
                                            exit(0)
                            except Exception:
                                pass
                        print(sid[:8])
                        exit(0)
                except Exception:
                    pass
print('unknown')
" 2>/dev/null || echo "unknown")"
fi

usage() {
  cat <<'EOF'
Usage:
  baton drop "Subject" [--to SESSION] [--type task|handoff|alert] [--priority high|normal|low] [--body "..."] [--ref SESSION-ID]
  baton list [--all]
  baton claim <id-prefix>
  baton complete <id-prefix> [--result "..."]
  baton show <id-prefix>
  baton abandon <id-prefix>
EOF
  exit 1
}

[[ $# -eq 0 ]] && usage

CMD="$1"; shift

case "$CMD" in

  drop)
    [[ $# -eq 0 ]] && { echo "baton drop: subject required" >&2; exit 1; }
    export DROP_SUBJECT="$1"; shift
    export DROP_TO="any"
    export DROP_TYPE="task"
    export DROP_PRIORITY="normal"
    export DROP_BODY=""
    export DROP_REF=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --to)       DROP_TO="$2";       shift 2 ;;
        --type)     DROP_TYPE="$2";     shift 2 ;;
        --priority) DROP_PRIORITY="$2"; shift 2 ;;
        --body)     DROP_BODY="$2";     shift 2 ;;
        --ref)      DROP_REF="$2";      shift 2 ;;
        *) echo "Unknown flag: $1" >&2; exit 1 ;;
      esac
    done
    mkdir -p "$BATON_PENDING"
    python3 << 'PYEOF'
import json, os, uuid
from datetime import datetime, timezone

pending  = os.environ['BATON_PENDING']
caller   = os.environ['BATON_CALLER']
subject  = os.environ['DROP_SUBJECT']
to       = os.environ['DROP_TO']
typ      = os.environ['DROP_TYPE']
priority = os.environ['DROP_PRIORITY']
body     = os.environ['DROP_BODY']
ref      = os.environ['DROP_REF']

baton_id = str(uuid.uuid4())
now      = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
refs     = [ref] if ref else []

packet = {
    'id':          baton_id,
    'created':     now,
    'from':        caller,
    'to':          to,
    'type':        typ,
    'priority':    priority,
    'subject':     subject,
    'body':        body,
    'context':     {'chronicle_refs': refs, 'inline': ''},
    'status':      'pending',
    'claimed_at':  None,
    'claimed_by':  None,
    'completed_at':None,
    'result':      None,
}

path = os.path.join(pending, baton_id + '.json')
with open(path, 'w') as f:
    json.dump(packet, f, indent=2)

print(f"Baton dropped: {baton_id[:8]}  [{priority}]  {subject}")
print(f"  to: {to}  type: {typ}")
PYEOF
    ;;

  list)
    export LIST_ALL="false"
    [[ "${1:-}" == "--all" ]] && LIST_ALL="true"
    python3 << 'PYEOF'
import json, glob, os, sys

store    = os.environ['BATON_STORE']
show_all = os.environ['LIST_ALL'] == 'true'

dirs = {'pending': os.path.join(store, 'pending')}
if show_all:
    dirs['claimed']   = os.path.join(store, 'claimed')
    dirs['completed'] = os.path.join(store, 'completed')

rows = []
for status, d in dirs.items():
    if not os.path.isdir(d):
        continue
    for f in sorted(glob.glob(os.path.join(d, '*.json')), key=os.path.getmtime, reverse=True):
        try:
            with open(f) as fh:
                p = json.load(fh)
            rows.append(p)
        except Exception:
            pass

if not rows:
    print('No batons' + (' found.' if show_all else ' pending.'))
    sys.exit(0)

priority_order = {'high': 0, 'normal': 1, 'low': 2}
rows.sort(key=lambda r: priority_order.get(r.get('priority', 'normal'), 1))

print(f"{'ID':8}  {'PRI':4}  {'STATUS':9}  {'FROM':15}  {'TO':15}  SUBJECT")
print('-' * 80)
for p in rows:
    pid = p.get('id',    '')[:8]
    pri = p.get('priority','normal')[:4]
    st  = p.get('status', '?')[:9]
    frm = p.get('from',   '?')[:15]
    to  = p.get('to',     '?')[:15]
    sub = p.get('subject','')[:40]
    print(f"{pid:8}  {pri:4}  {st:9}  {frm:15}  {to:15}  {sub}")
PYEOF
    ;;

  claim)
    [[ $# -eq 0 ]] && { echo "baton claim: id-prefix required" >&2; exit 1; }
    export CLAIM_PREFIX="$1"
    python3 << 'PYEOF'
import json, glob, os, sys
from datetime import datetime, timezone

pending = os.environ['BATON_PENDING']
claimed = os.environ['BATON_CLAIMED']
prefix  = os.environ['CLAIM_PREFIX']
caller  = os.environ['BATON_CALLER']

matches = [f for f in glob.glob(os.path.join(pending, '*.json'))
           if os.path.basename(f).startswith(prefix)]

if not matches:
    print(f'No pending baton matching: {prefix}', file=sys.stderr)
    sys.exit(1)
if len(matches) > 1:
    print('Ambiguous prefix — multiple matches:', file=sys.stderr)
    for m in matches:
        print(f'  {os.path.basename(m)[:8]}', file=sys.stderr)
    sys.exit(1)

src = matches[0]
with open(src) as f:
    p = json.load(f)

p['status']     = 'claimed'
p['claimed_at'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
p['claimed_by'] = caller

os.makedirs(claimed, exist_ok=True)
dst = os.path.join(claimed, os.path.basename(src))
with open(dst, 'w') as f:
    json.dump(p, f, indent=2)
os.remove(src)

print(f"Claimed: {p['id'][:8]}  {p['subject']}")
print(f"  by: {caller}")
PYEOF
    ;;

  complete)
    [[ $# -eq 0 ]] && { echo "baton complete: id-prefix required" >&2; exit 1; }
    export COMPLETE_PREFIX="$1"; shift
    export COMPLETE_RESULT=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --result) COMPLETE_RESULT="$2"; shift 2 ;;
        *) echo "Unknown flag: $1" >&2; exit 1 ;;
      esac
    done
    python3 << 'PYEOF'
import json, glob, os, sys
from datetime import datetime, timezone

claimed   = os.environ['BATON_CLAIMED']
completed = os.environ['BATON_COMPLETED']
prefix    = os.environ['COMPLETE_PREFIX']
result    = os.environ['COMPLETE_RESULT']

matches = [f for f in glob.glob(os.path.join(claimed, '*.json'))
           if os.path.basename(f).startswith(prefix)]

if not matches:
    print(f'No claimed baton matching: {prefix}', file=sys.stderr)
    sys.exit(1)
if len(matches) > 1:
    print('Ambiguous prefix', file=sys.stderr)
    sys.exit(1)

src = matches[0]
with open(src) as f:
    p = json.load(f)

p['status']       = 'completed'
p['completed_at'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
p['result']       = result

os.makedirs(completed, exist_ok=True)
dst = os.path.join(completed, os.path.basename(src))
with open(dst, 'w') as f:
    json.dump(p, f, indent=2)
os.remove(src)

print(f"Completed: {p['id'][:8]}  {p['subject']}")
if result:
    print(f"  result: {result[:100]}")
PYEOF
    ;;

  show)
    [[ $# -eq 0 ]] && { echo "baton show: id-prefix required" >&2; exit 1; }
    export SHOW_PREFIX="$1"
    python3 << 'PYEOF'
import json, glob, os, sys

store  = os.environ['BATON_STORE']
prefix = os.environ['SHOW_PREFIX']

for subdir in ('pending', 'claimed', 'completed'):
    d = os.path.join(store, subdir)
    if not os.path.isdir(d):
        continue
    for f in glob.glob(os.path.join(d, '*.json')):
        if os.path.basename(f).startswith(prefix):
            with open(f) as fh:
                p = json.load(fh)
            print(json.dumps(p, indent=2))
            sys.exit(0)

print(f'Baton not found: {prefix}', file=sys.stderr)
sys.exit(1)
PYEOF
    ;;

  abandon)
    [[ $# -eq 0 ]] && { echo "baton abandon: id-prefix required" >&2; exit 1; }
    export ABANDON_PREFIX="$1"
    python3 << 'PYEOF'
import json, glob, os, sys
from datetime import datetime, timezone

store  = os.environ['BATON_STORE']
prefix = os.environ['ABANDON_PREFIX']

for subdir in ('pending', 'claimed'):
    d = os.path.join(store, subdir)
    if not os.path.isdir(d):
        continue
    for f in glob.glob(os.path.join(d, '*.json')):
        if os.path.basename(f).startswith(prefix):
            with open(f) as fh:
                p = json.load(fh)
            p['status']       = 'abandoned'
            p['completed_at'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
            completed = os.path.join(store, 'completed')
            os.makedirs(completed, exist_ok=True)
            dst = os.path.join(completed, os.path.basename(f))
            with open(dst, 'w') as fh:
                json.dump(p, fh, indent=2)
            os.remove(f)
            print(f"Abandoned: {p['id'][:8]}  {p['subject']}")
            sys.exit(0)

print(f'Baton not found: {prefix}', file=sys.stderr)
sys.exit(1)
PYEOF
    ;;

  *) usage ;;
esac

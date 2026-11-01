#!/bin/sh
# Builds, runs the rule self-tests, replays every scripted run in runs/expected.txt (checking its final RESULT
# line and diffing the whole transcript against runs/expected-output/), then runs the web adapter self-test.
# Prints ALL CHECKS PASSED or exits non-zero.
set -e
cd "$(dirname "$0")"

echo "== build"
./build.sh

echo "== rule self-tests"
rm -rf out-test && mkdir -p out-test
javac --release 17 -Xlint:all -d out-test $(find src/main/java src/test/java -name '*.java')
java -ea -cp out-test rush.RulesSelfTest

echo "== scripted runs"
mkdir -p runs/logs
failures=0
while read -r script seed expected; do
    case "$script" in ''|'#'*) continue ;; esac
    log="runs/logs/${script%.txt}.log"
    ./run.sh --seed "$seed" < "runs/$script" > "$log" 2>&1 || true
    result=$(grep '^RESULT:' "$log" | tail -n 1)
    if ! echo "$result" | grep -q "$expected"; then
        echo "  FAIL $script (seed $seed): expected $expected, got '${result:-no RESULT line}'"
        failures=$((failures + 1))
    elif ! cmp -s "$log" "runs/expected-output/${script%.txt}.log"; then
        echo "  FAIL $script (seed $seed): transcript differs from runs/expected-output/${script%.txt}.log"
        failures=$((failures + 1))
    else
        echo "  ok   $script (seed $seed): $result, transcript identical to expected output"
    fi
done < runs/expected.txt

echo "== web adapter self-test"
java -ea -cp out-test rush.web.WebAdapterSelfTest .

if [ "$failures" -ne 0 ]; then
    echo "$failures scripted run(s) failed"
    exit 1
fi
echo "ALL CHECKS PASSED"

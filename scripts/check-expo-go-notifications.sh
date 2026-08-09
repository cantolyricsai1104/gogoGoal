#!/bin/sh
set -eu

for command_name in npx find strings grep; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: required command is unavailable: $command_name" >&2
    exit 2
  fi
done

rm -rf /private/tmp/go-go-goal-expo-go-check
npx expo export --platform android --output-dir /private/tmp/go-go-goal-expo-go-check >/private/tmp/go-go-goal-expo-go-check.log 2>&1

bundle=$(find /private/tmp/go-go-goal-expo-go-check -type f -name '*.hbc' -print -quit)
if [ -z "$bundle" ] || [ ! -f "$bundle" ]; then
  echo 'ERROR: Android bundle was not produced; notification check did not run' >&2
  exit 2
fi

if strings "$bundle" | grep -q 'Android Push notifications.*removed from Expo Go'; then
  echo 'RED: Expo Go remote-push crash path is bundled'
  exit 1
fi

echo 'GREEN: Expo Go remote-push crash path is absent'

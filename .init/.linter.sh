#!/bin/bash
cd /home/kavia/workspace/code-generation/secure-iot-monitoring-platform-245956-245972/iot_security_backend
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi


#!/bin/bash
set -e
echo "📦 Installing dependencies for {{TICKET_ID}}..."

# Run the manager command
{{INSTALL_CMD}}

clear
echo "Ready 🟢"
# Self destruct
rm .dev-init.sh

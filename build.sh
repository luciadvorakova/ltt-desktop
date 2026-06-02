#!/bin/bash
set -a
source .env
set +a
npm run electron:build

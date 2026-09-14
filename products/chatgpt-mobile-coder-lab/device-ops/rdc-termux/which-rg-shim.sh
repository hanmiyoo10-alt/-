#!/bin/sh
# mcl-rdc-termux-which-rg:v1
set -eu

[ "$#" -eq 1 ] && [ "$1" = "rg" ] || exit 1
command -v rg

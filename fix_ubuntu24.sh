#!/usr/bin/env bash

sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0

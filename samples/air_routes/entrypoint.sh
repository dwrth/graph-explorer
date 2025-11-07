#!/bin/bash
set -e

# Copy config file to a writable location in the container
# This prevents permission issues without modifying host filesystem
if [ -f /opt/gremlin-server/sample/conf/gremlin-server-air-routes.yaml ]; then
    mkdir -p /opt/gremlin-server/conf
    cp /opt/gremlin-server/sample/conf/gremlin-server-air-routes.yaml /opt/gremlin-server/conf/gremlin-server-air-routes.yaml
fi

# Call the original gremlin-server entrypoint with the config file path
# The image's default entrypoint handles sed modifications and starts the server
exec /bin/sh -c 'if [ -f "$1" ]; then sed -i "s|host:.*|host: 0.0.0.0|" "$1"; fi && /opt/gremlin-server/bin/gremlin-server.sh "$1"' _ "$@"
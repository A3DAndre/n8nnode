FROM n8nio/n8n:latest

USER root

# Copy the custom nodes folder
COPY ./custom_nodes /home/node/.n8n/custom/node_modules/custom_nodes

# Switch back to the node user
USER node

# Set the working directory
WORKDIR /home/node

# Use the default entrypoint and CMD from the base image
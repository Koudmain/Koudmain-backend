##
## Base configuration
##

# Use the official Node.js image as the base image
FROM node:24-alpine AS base

# Set environment variables
ARG LOCAL_IP
ENV LOCAL_IP=${LOCAL_IP}

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

##
## Development configuration
##

FROM base AS development

# Install the application dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Command to run the application in development
CMD ["npm", "run", "start:dev"]

##
## Build configuration
##

FROM development AS build

# Build the NestJS application
RUN npm run build

##
## Production configuration
##

FROM node:24-alpine AS production

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/package.json ./

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]

# Stage 1: Build the Vite app
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the source
COPY . .

# Vite env vars must be available at BUILD time, not just runtime,
# since Vite bakes them into the static output.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_GEMINI_API_KEY
ARG VITE_HUNTER_API_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_HUNTER_API_KEY=$VITE_HUNTER_API_KEY

RUN npm run build

# Stage 2: Serve the built static files with nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# React/Vite apps need all routes to fall back to index.html for client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
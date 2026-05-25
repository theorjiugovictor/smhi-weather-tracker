# --- Build Stage ---
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies (use npm install so newly-added deps without a lockfile entry still install)
COPY package*.json ./
RUN npm install

# Copy code and compile Vite bundle
COPY . .
RUN npm run build

# --- Production Stage ---
FROM nginx:1.25-alpine

# Copy custom Nginx routing rules
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

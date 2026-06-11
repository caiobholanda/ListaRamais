FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN node build.js && npm prune --omit=dev
EXPOSE 3000
CMD ["node", "server.js"]

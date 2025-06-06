# stage 1: build
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --only=production

# stage 2: runner
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .
EXPOSE 80
CMD ["node", "app.js"]

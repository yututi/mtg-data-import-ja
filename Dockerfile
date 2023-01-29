FROM node:16-bullseye

WORKDIR /app
COPY . .

RUN npm ci
RUN npm run pg

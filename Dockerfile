FROM node:16-bullseye

WORKDIR /usr/app
COPY ./ /usr/app

RUN npm install
RUN npm run pg

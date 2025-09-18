# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

FROM base AS development
CMD ["npm", "run", "dev"]

FROM base AS build
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]

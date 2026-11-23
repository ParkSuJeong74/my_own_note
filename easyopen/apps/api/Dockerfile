FROM node:22.23.5-alpine AS build
WORKDIR /app
ARG EASYOPEN_BACKEND_ORIGIN=http://easyopen-server:3001
ENV EASYOPEN_BACKEND_ORIGIN=$EASYOPEN_BACKEND_ORIGIN
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.23.5-alpine
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
